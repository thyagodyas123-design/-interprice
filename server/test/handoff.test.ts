import { describe, it, expect } from "vitest";
import { buildHandoffPrompt } from "../src/handoff/HandoffEngine.js";

describe("buildHandoffPrompt", () => {
  it("wraps content with structured marker", () => {
    const p = buildHandoffPrompt("Coder", "Please review the diff.");
    expect(p).toContain("[Handoff de Coder]");
    expect(p).toContain("Please review the diff.");
  });
});
