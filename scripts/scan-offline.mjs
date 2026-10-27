import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const TEXT = /\.(html|js|mjs|cjs|css|svg|json|webmanifest|txt|map|ts|tsx)$/;
const CALLS = /\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|\bEventSource\b/;
const URLS = /https?:\/\/[^\s"'`)<>]+/g;
const NAMESPACE = new Set([
  "http://www.w3.org/2000/svg",
  "http://www.w3.org/1999/xlink",
  "http://www.w3.org/1998/Math/MathML",
  "http://www.w3.org/XML/1998/namespace",
]);

/** @param {string} dir @returns {string[]} */
function walk(dir) {
  if (!existsSync(dir)) return [];
  /** @type {string[]} */
  const out = [];
  /** @type {string[]} */
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    if (!current) continue;
    for (const name of readdirSync(current)) {
      const path = join(current, name);
      if (statSync(path).isDirectory()) stack.push(path);
      else out.push(path);
    }
  }
  return out;
}

/** @param {string} path */
export function isServiceWorker(path) {
  return path.endsWith("/sw.js") || path.endsWith("\\sw.js");
}

/** Network calls and http(s) URLs. SVG namespace URIs are not requests. @param {string} path @returns {string[]} */
export function scanFile(path) {
  if (isServiceWorker(path) || !TEXT.test(path)) return [];
  const text = readFileSync(path, "utf8");
  /** @type {string[]} */
  const hits = [];
  if (CALLS.test(text)) hits.push(`${path}: network call`);
  for (const match of text.matchAll(URLS)) {
    const url = match[0].replace(/[.,;]+$/, "");
    if (NAMESPACE.has(url)) continue;
    hits.push(`${path}: ${url}`);
  }
  return hits;
}

/** @param {string} dir @returns {string[]} */
export function scanTree(dir) {
  return walk(dir).flatMap((path) => scanFile(path));
}

const target = process.argv[2];
if (target) {
  const hits = scanTree(target);
  if (hits.length) {
    console.error(hits.join("\n"));
    process.exit(1);
  }
  console.log(`offline scan clean: ${target}`);
}
