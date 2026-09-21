import { describe, it, expect } from "vitest";
import { PartituraStore } from "../src/store/PartituraStore.js";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const dir = mkdtempSync(path.join(tmpdir(), "interprice-test-"));

describe("PartituraStore", () => {
  const store = new PartituraStore(dir);
  const p = {
    version: 1 as const, name: "t", viewport: { x: 0, y: 0, zoom: 1 },
    nodes: [], edges: [], roles: [],
  };

  it("save then load round-trips", () => {
    store.save(p);
    expect(store.load("t")).toEqual(p);
  });

  it("list returns saved names", () => {
    expect(store.list()).toContain("t");
  });

  it("rejects invalid JSON", () => {
    expect(() => store.load("missing")).toThrow();
  });

  it("rejects path traversal in name", () => {
    expect(() => store.load("../../etc/passwd")).toThrow();
    expect(() => store.load("a/b")).toThrow();
  });
});
