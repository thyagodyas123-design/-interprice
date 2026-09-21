import { describe, it, expect } from "vitest";
import { buildCommand } from "../src/pty/AgentSpawn.js";

describe("buildCommand", () => {
  const role = { id: "r1", name: "Coder", instructions: "You write clean TS." };

  it("persistent TUI with role", () => {
    const c = buildCommand({
      mode: "persistent", role, cwd: "/proj", model: "anthropic/claude-sonnet-4",
    });
    expect(c.cmd).toBe("opencode");
    expect(c.args).toEqual(["/proj", "--prompt", "You write clean TS.", "--model", "anthropic/claude-sonnet-4"]);
  });

  it("oneshot run with role", () => {
    const c = buildCommand({ mode: "oneshot", role, cwd: "/proj", model: null });
    expect(c.cmd).toBe("opencode");
    expect(c.args[0]).toBe("run");
    expect(c.args).toContain("--dir");
    expect(c.args).toContain("/proj");
  });

  it("no model omits --model", () => {
    const c = buildCommand({ mode: "persistent", role: null, cwd: "/p", model: null });
    expect(c.args).not.toContain("--model");
  });
});
