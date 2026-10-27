import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { scanTree } from "../../scripts/scan-offline.mjs";

describe("offline content", () => {
  it("has no network calls or http(s) URLs in src outside sw.js", () => {
    expect(scanTree("src")).toEqual([]);
  });

  it("has no network calls or http(s) URLs in the built bundle outside sw.js", () => {
    if (!existsSync("dist/index.html")) return;
    expect(scanTree("dist")).toEqual([]);
  });
});
