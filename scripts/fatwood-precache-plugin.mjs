import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, isAbsolute } from "node:path";

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else out.push(path);
  }
  return out;
}

function sanitizeShippedFile(file) {
  if (file.endsWith(".css")) {
    const text = readFileSync(file, "utf8").replace(/\/\*![\s\S]*?\*\//g, "");
    writeFileSync(file, text);
    return;
  }
  if (file.endsWith(".js")) {
    const text = readFileSync(file, "utf8").replaceAll("https://react.dev/errors/", "react-error:");
    writeFileSync(file, text);
  }
}

function toUrl(dist, file) {
  return `/${relative(dist, file).split("\\").join("/")}`;
}

export function renderServiceWorker(precache) {
  const version = createHash("sha256").update(precache.join("\n")).digest("hex").slice(0, 12);
  return `const CACHE = "fatwood-${version}";
const PRECACHE = ${JSON.stringify(precache, null, 2)};

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(PRECACHE);
      const home = await cache.match("/index.html");
      if (home) await cache.put("/", home.clone());
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached =
        (await cache.match(request, { ignoreSearch: true, ignoreVary: true })) ||
        (await cache.match(url.pathname, { ignoreSearch: true, ignoreVary: true }));
      if (cached) return cached;
      if (request.mode === "navigate") {
        const shell =
          (await cache.match("/", { ignoreVary: true })) ||
          (await cache.match("/index.html", { ignoreVary: true }));
        if (shell) return shell;
      }
      return fetch(request);
    })(),
  );
});
`;
}

/** Build-generated cache-first service worker. Precaches every emitted file except itself. */
export function fatwoodPrecachePlugin() {
  let outDir = "dist";
  return {
    name: "fatwood-precache",
    apply: "build",
    configResolved(config) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      const dist = isAbsolute(outDir) ? outDir : join(process.cwd(), outDir);
      for (const file of walk(dist)) sanitizeShippedFile(file);
      const files = walk(dist).map((file) => toUrl(dist, file)).filter((url) => url !== "/sw.js").sort();
      if (!files.includes("/index.html")) {
        throw new Error("fatwood precache: dist/index.html is missing");
      }
      const assetPrefix = "/assets/";
      const assets = files.filter((url) => url.startsWith(assetPrefix));
      if (assets.length === 0) throw new Error("fatwood precache: dist/assets is empty");
      const source = renderServiceWorker(files);
      writeFileSync(join(dist, "sw.js"), source);
      for (const asset of assets) {
        if (!files.includes(asset)) throw new Error(`fatwood precache missed ${asset}`);
      }
      mkdirSync(join(process.cwd(), "evidence/phase-1"), { recursive: true });
      writeFileSync(
        join(process.cwd(), "evidence/phase-1/precache-manifest.json"),
        JSON.stringify({ count: files.length, assets: assets.length, files }, null, 2),
      );
    },
  };
}
