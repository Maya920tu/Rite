const CACHE = "rite-app-v3";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

async function putResponse(request, response) {
  if (!response) return response;
  if (response.ok || response.type === "opaque") {
    const cache = await caches.open(CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

async function cacheUrls(urls) {
  const cache = await caches.open(CACHE);
  await Promise.all(
    urls.map(async (url) => {
      try {
        const request = new Request(url, { credentials: "same-origin" });
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response);
      } catch {
        /* skip one bad URL */
      }
    }),
  );
}

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "CACHE_URLS" || !Array.isArray(data.urls)) return;
  event.waitUntil(cacheUrls(data.urls.filter((url) => typeof url === "string" && url.length > 0)));
});

function isShellAsset(url) {
  return (
    url.pathname.startsWith("/assets/") ||
    /\.(?:js|css|png|svg|jpg|jpeg|webp|woff2|webmanifest|ico)$/.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const local = url.origin === self.location.origin;
  if (!local) return;

  if (isShellAsset(url)) {
    event.respondWith(
      (async () => {
        const hit = await caches.match(request);
        const fetching = fetch(request)
          .then((fresh) => putResponse(request, fresh))
          .catch(() => hit);
        return hit || fetching || new Response("", { status: 504 });
      })(),
    );
    return;
  }

  event.respondWith(
    (async () => {
      try {
        const fresh = await fetch(request);
        await putResponse(request, fresh);
        return fresh;
      } catch {
        const hit = await caches.match(request);
        if (hit) return hit;
        if (request.mode === "navigate") {
          const shell = await caches.match("/");
          if (shell) return shell;
        }
        return new Response("Rite is offline.", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) return client.focus();
      }
      return self.clients.openWindow("/");
    }),
  );
});
