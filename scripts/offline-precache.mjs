/** Wait until the service worker has precached the shell and the assets. */
export async function waitForPrecache(page) {
  await page.waitForFunction(async () => {
    const registration = await navigator.serviceWorker.ready;
    if (!registration.active) return false;
    const keys = await caches.keys();
    const name = keys.find((key) => key.startsWith("fatwood-"));
    if (!name) return false;
    const cache = await caches.open(name);
    const urls = (await cache.keys()).map((request) => new URL(request.url).pathname);
    return urls.includes("/index.html") && urls.some((url) => url.startsWith("/assets/"));
  });
}

/** Offline, and abort every request Playwright actually routes.
 * Requests the service worker answers never reach this handler.
 */
export async function abortRoutedRequests(context) {
  const routed = [];
  await context.setOffline(true);
  await context.route("**/*", (route) => {
    routed.push(route.request().url());
    return route.abort();
  });
  return routed;
}
