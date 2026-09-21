import { describe, it, expect } from "vitest";
import { appendNote } from "../src/obsidian/ObsidianBridge.js";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

describe("appendNote", () => {
  it("appends a line with timestamp", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "obs-"));
    const file = path.join(dir, "note.md");
    appendNote(file, "decision made");
    const content = readFileSync(file, "utf8");
    expect(content).toContain("decision made");
    expect(content).toContain("- ");
  });
});
