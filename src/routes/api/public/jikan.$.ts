import { createFileRoute } from "@tanstack/react-router";

/**
 * Cached read-only proxy for the public Jikan metadata API.
 *
 * Jikan aggressively sheds bursty traffic (429s and edge 504s). Routing every
 * browser through one server-side queue + short-lived cache means repeat
 * visitors are served instantly and upstream sees a tiny fraction of requests.
 */

const UPSTREAM = "https://api.jikan.moe/v4";
const LIST_TTL_MS = 30 * 60 * 1000;
const DETAIL_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 300;
const UPSTREAM_COOLDOWN_MS = 15_000;
const MIN_REQUEST_GAP_MS = 400;

type Entry = { body: string; expires: number; status: number };
type UpstreamResult = { status: number; body: string };
const cache = new Map<string, Entry>();
const inflight = new Map<string, Promise<UpstreamResult>>();
let upstreamCooldownUntil = 0;
let lastUpstreamFailure: UpstreamResult | undefined;
let nextUpstreamStartAt = 0;
const upstreamStartTimes: number[] = [];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function enqueue<T>(job: () => Promise<T>): Promise<T> {
  // Reserve evenly spaced start slots and honor Jikan's rolling per-minute
  // quota, without serializing response waiting between independent sections.
  let now = Date.now();
  while (true) {
    const oldestStart = upstreamStartTimes[0];
    if (oldestStart === undefined || oldestStart > now - 60_000) break;
    upstreamStartTimes.shift();
  }
  const firstStartInWindow = upstreamStartTimes[0] ?? now;
  const minuteWindowStart = upstreamStartTimes.length >= 60 ? firstStartInWindow + 60_000 : now;
  const startAt = Math.max(now, nextUpstreamStartAt, minuteWindowStart);
  nextUpstreamStartAt = startAt + MIN_REQUEST_GAP_MS;
  upstreamStartTimes.push(startAt);
  const wait = startAt - now;
  if (wait > 0) await sleep(wait);
  return job();
}

function responseMessage(body: string) {
  try {
    const parsed = JSON.parse(body) as { message?: unknown; error?: unknown };
    const message = parsed.message ?? parsed.error;
    return typeof message === "string" ? message : body.slice(0, 300);
  } catch {
    return body.slice(0, 300);
  }
}

function logUpstreamFailure(target: string, status: number, body: string) {
  if (import.meta.env.DEV) {
    console.warn("[jikan] upstream request failed", {
      endpoint: target,
      status,
      responseMessage: responseMessage(body),
      timestamp: new Date().toISOString(),
    });
  }
}

async function fetchUpstream(target: string): Promise<UpstreamResult> {
  if (Date.now() < upstreamCooldownUntil) {
    return (
      lastUpstreamFailure ?? {
        status: 503,
        body: JSON.stringify({ error: "The anime database is temporarily unavailable." }),
      }
    );
  }

  let lastResult: UpstreamResult = {
    status: 503,
    body: JSON.stringify({ error: "The anime database is temporarily unavailable." }),
  };
  let recoveringThisRequest = false;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await enqueue(async () => {
        if (Date.now() < upstreamCooldownUntil && !recoveringThisRequest) return null;
        return await fetch(target, {
          headers: {
            Accept: "application/json",
            "User-Agent": "AnimeHub/1.0 (+metadata client)",
            // Jikan's edge caches per Accept-Encoding variant; its compressed
            // variants intermittently serve 504s. An empty value opts out of
            // compression and reliably reaches the healthy cached copy.
            "Accept-Encoding": "",
          },
          signal: AbortSignal.timeout(12000),
        });
      });
      if (!res) return lastUpstreamFailure ?? lastResult;

      const body = await res.text();
      lastResult = { status: res.status, body };
      if (res.status === 429 || res.status >= 500) {
        recoveringThisRequest = true;
        lastUpstreamFailure = lastResult;
        upstreamCooldownUntil = Date.now() + UPSTREAM_COOLDOWN_MS;
        if (attempt < 2) {
          const retryAfter = Number(res.headers.get("Retry-After"));
          const delay =
            Number.isFinite(retryAfter) && retryAfter > 0
              ? Math.min(retryAfter * 1000, 10_000)
              : 1000 * 2 ** attempt + Math.random() * 300;
          await sleep(delay);
        }
        continue;
      }
      if (res.ok) {
        upstreamCooldownUntil = 0;
        lastUpstreamFailure = undefined;
      }
      return lastResult;
    } catch (error) {
      lastResult = {
        status: 503,
        body: JSON.stringify({
          error: error instanceof Error ? error.message : "Temporary network failure",
        }),
      };
      recoveringThisRequest = true;
      lastUpstreamFailure = lastResult;
      upstreamCooldownUntil = Date.now() + UPSTREAM_COOLDOWN_MS;
      if (attempt < 2) await sleep(1000 * 2 ** attempt + Math.random() * 300);
    }
  }

  logUpstreamFailure(target, lastResult.status, lastResult.body);
  lastUpstreamFailure = lastResult;
  upstreamCooldownUntil = Date.now() + UPSTREAM_COOLDOWN_MS;
  return lastResult;
}

function cacheTtl(path: string) {
  if (/^anime\/\d+\/full$/.test(path) || path === "genres/anime") return DETAIL_TTL_MS;
  return LIST_TTL_MS;
}

export const Route = createFileRoute("/api/public/jikan/$")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const path = (params as { _splat?: string })._splat ?? "";
        if (!path || path.includes("..")) {
          return new Response(JSON.stringify({ error: "Invalid path" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        const search = new URL(request.url).search;
        const key = `${path}${search}`;

        const hit = cache.get(key);
        if (hit && hit.expires > Date.now()) {
          return new Response(hit.body, {
            headers: { "Content-Type": "application/json", "X-Cache": "HIT" },
          });
        }

        let pending = inflight.get(key);
        if (!pending) {
          pending = fetchUpstream(`${UPSTREAM}/${path}${search}`).finally(() =>
            inflight.delete(key),
          );
          inflight.set(key, pending);
        }
        const { status, body } = await pending;

        if (status === 200) {
          if (cache.size >= MAX_ENTRIES) cache.clear();
          cache.set(key, { body, expires: Date.now() + cacheTtl(path), status });
        } else if (hit) {
          // Upstream is unhappy but we have an older good copy — stale data
          // beats an error screen.
          return new Response(hit.body, {
            status: hit.status,
            headers: { "Content-Type": "application/json", "X-Cache": "STALE" },
          });
        }

        if (status >= 500 || status === 429) {
          // A third-party outage is expected degradation, not an unhandled app
          // failure. Return a successful transport response with an explicit
          // marker so the service layer can use its backup catalogue.
          return Response.json(
            {
              error: "The anime database is unavailable right now.",
              upstreamMessage: responseMessage(body),
              upstreamStatus: status,
              degraded: true,
            },
            {
              headers: {
                "Cache-Control": "no-store",
                "X-Cache": "MISS",
                "X-Upstream-Status": String(status),
              },
            },
          );
        }
        return new Response(body, {
          status,
          headers: { "Content-Type": "application/json", "X-Cache": "MISS" },
        });
      },
    },
  },
});
