import { createFileRoute } from "@tanstack/react-router";

/**
 * Read-only proxy for the public Kitsu catalogue API (metadata only).
 * Used as a fallback when MyAnimeList's search endpoint is unavailable.
 * Browsers are blocked by Kitsu's bot protection, so the request is made
 * server-side. Only GET requests to whitelisted paths are forwarded.
 */

const UPSTREAM = "https://kitsu.app/api/edge";
const ALLOWED = /^[a-z0-9/-]+$/i;
const TTL_MS = 15 * 60 * 1000;
const cache = new Map<string, { at: number; body: string }>();

export const Route = createFileRoute("/api/public/kitsu/$")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const path = (params as { _splat?: string })._splat ?? "";
        if (!path || !ALLOWED.test(path)) {
          return new Response(JSON.stringify({ error: "Invalid path" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        const search = new URL(request.url).search;
        const key = `${path}${search}`;

        const hit = cache.get(key);
        if (hit && Date.now() - hit.at < TTL_MS) {
          return new Response(hit.body, {
            headers: { "Content-Type": "application/json", "X-Cache": "HIT" },
          });
        }

        try {
          const upstream = await fetch(`${UPSTREAM}/${path}${search}`, {
            headers: { Accept: "application/vnd.api+json" },
            signal: AbortSignal.timeout(12000),
          });
          const body = await upstream.text();
          if (!upstream.ok) {
            if (hit) {
              return new Response(hit.body, {
                headers: { "Content-Type": "application/json", "X-Cache": "STALE" },
              });
            }
            return new Response(body || JSON.stringify({ error: "Upstream error" }), {
              status: upstream.status,
              headers: { "Content-Type": "application/json" },
            });
          }
          if (cache.size > 300) cache.clear();
          cache.set(key, { at: Date.now(), body });
          return new Response(body, {
            headers: { "Content-Type": "application/json", "X-Cache": "MISS" },
          });
        } catch (error) {
          if (hit) {
            return new Response(hit.body, {
              headers: { "Content-Type": "application/json", "X-Cache": "STALE" },
            });
          }
          console.error("Kitsu proxy failed", error);
          return new Response(JSON.stringify({ error: "Catalogue unavailable" }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
