/** Snapshot the installed precache, then block the network.
 *
 * Playwright's context.route runs before the service worker for subresources.
 * Those requests are answered with the bytes the service worker stored at
 * install. Anything that was not precached is aborted. Combined with
 * context.setOffline, no request is allowed to reach a network.
 */

export async function readPrecache(page) {
  await page.waitForFunction(async () => {
    const registration = await navigator.serviceWorker.ready;
    if (!registration.active) return false;
    const keys = await caches.keys();
    const name = keys.find((key) => key.startsWith("fatwood-"));
    if (!name) return false;
    const cache = await caches.open(name);
    return (await cache.keys()).length > 10;
  });
  return page.evaluate(async () => {
    const keys = await caches.keys();
    const name = keys.find((key) => key.startsWith("fatwood-"));
    const cache = await caches.open(name);
    const entries = [];
    const toBase64 = (buffer) => {
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      }
      return btoa(binary);
    };
    for (const request of await cache.keys()) {
      const response = await cache.match(request);
      if (!response) continue;
      entries.push({
        url: request.url,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: toBase64(await response.arrayBuffer()),
      });
    }
    return entries;
  });
}

export async function blockNetworkWithPrecache(context, snapshot) {
  const byUrl = new Map(snapshot.map((entry) => [entry.url, entry]));
  const leaked = [];
  await context.route("**/*", (route) => {
    const hit = byUrl.get(route.request().url());
    if (!hit) {
      leaked.push(route.request().url());
      return route.abort();
    }
    return route.fulfill({
      status: hit.status,
      headers: hit.headers,
      body: Buffer.from(hit.body, "base64"),
    });
  });
  await context.setOffline(true);
  return leaked;
}
