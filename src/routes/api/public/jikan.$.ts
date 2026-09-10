import { createFileRoute } from "@tanstack/react-router";

/**
 * Cached read-only proxy for the public Jikan metadata API.
 *
 * Jikan aggressively sheds bursty traffic (429s and edge 504s). Routing every
 * browser through one server-side queue + short-lived cache means repeat
 * visitors are served instantly and upstream sees a tiny fraction of requests.
 */

const UPSTREAM = "https://api.jikan.moe/v4";
const TTL_MS = 10 * 60 * 1000;
const MAX_ENTRIES = 300;

type Entry = { body: string; expires: number };
const cache = new Map<string, Entry>();
const inflight = new Map<string, Promise<{ status: number; body: string }>>();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const result = await job();
    await sleep(1200);
    return result;
  });
  queue = run.catch(() => undefined);
  return run as Promise<T>;
}

async function fetchUpstream(target: string): Promise<{ status: number; body: string }> {
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const res = await enqueue(() =>
        fetch(target, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(12000),
        }),
      );
      if (res.status === 429 || res.status >= 500) {
        await sleep(900 * (attempt + 1) + Math.random() * 400);
        continue;
      }
      return { status: res.status, body: await res.text() };
    } catch {
      await sleep(700 * (attempt + 1));
    }
  }
  return {
    status: 503,
    body: JSON.stringify({ error: "The anime database is unavailable right now." }),
  };
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
          cache.set(key, { body, expires: Date.now() + TTL_MS });
        }
        return new Response(body, {
          status,
          headers: { "Content-Type": "application/json", "X-Cache": "MISS" },
        });
      },
    },
  },
});
