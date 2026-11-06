/* GS IT Site Survey service worker.
 *
 * Goal: after one online visit the whole app (shell + JS) opens with no signal.
 * Survey DATA is not handled here; it lives in IndexedDB and syncs from the page.
 *
 *  - /_next/static/*  hashed and immutable      -> cache-first
 *  - page navigations                            -> network-first, fall back to cache (ignoring ?id=)
 *  - /api/*                                      -> never cached (always network)
 *  - WARM message from the page                  -> cache the app pages and their JS/CSS ahead of time
 */
const VERSION = "v6";
const STATIC = `gs-static-${VERSION}`;
const PAGES = `gs-pages-${VERSION}`;
const PAGE_URLS = ["/", "/surveys", "/account", "/survey", "/report", "/departments", "/department", "/member", "/forms", "/form-builder"];

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([STATIC, PAGES]);
      for (const k of await caches.keys()) if (k.startsWith("gs-") && !keep.has(k)) await caches.delete(k);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(req));
    return;
  }
  if (req.mode === "navigate") {
    event.respondWith(networkFirstPage(req, url));
  }
});

async function cacheFirst(req) {
  const cache = await caches.open(STATIC);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

// The page shells are static, so one cached copy of /survey serves every ?id=.
async function networkFirstPage(req, url) {
  const cache = await caches.open(PAGES);
  try {
    const res = await fetch(req);
    // Cache real pages only: not login redirects, not errors.
    if (res.ok && !res.redirected && PAGE_URLS.includes(url.pathname)) cache.put(url.pathname, res.clone());
    return res;
  } catch {
    const hit = (await cache.match(url.pathname)) || (await cache.match("/"));
    if (hit) return hit;
    return new Response(
      "<!doctype html><meta name=viewport content='width=device-width,initial-scale=1'><title>Offline</title>" +
        "<body style='font-family:system-ui;background:#04070e;color:#e8edf5;padding:2rem'>" +
        "<h1>You’re offline</h1><p>Open the app once while online so it can be saved for offline use.</p>",
      { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }
}

// Called by the signed-in page: fetch each app page, then every JS/CSS file it references.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "WARM") event.waitUntil(warm());
});

async function warm() {
  const pages = await caches.open(PAGES);
  const statics = await caches.open(STATIC);
  for (const path of PAGE_URLS) {
    try {
      const res = await fetch(path, { credentials: "same-origin" });
      // A redirect means we're signed out; don't cache the login page under an app URL.
      if (!res.ok || res.redirected) continue;
      await pages.put(path, res.clone());
      const html = await res.text();
      const assets = new Set(html.match(/\/_next\/static\/[^"'\\\s)]+\.(?:js|css)/g) || []);
      await Promise.all(
        [...assets].map(async (a) => {
          if (await statics.match(a)) return;
          try {
            const r = await fetch(a);
            if (r.ok) await statics.put(a, r);
          } catch {
            /* will be cached on first use instead */
          }
        }),
      );
    } catch {
      /* offline: nothing to warm */
    }
  }
}
