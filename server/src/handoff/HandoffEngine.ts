export function buildHandoffPrompt(sourceLabel: string, content: string): string {
  return `\n\n[Handoff de ${sourceLabel}]\n${content}\n`;
}

export interface HandoffTarget {
  kind: "persistent" | "oneshot";
  write: (s: string) => void;          // persistent: write to PTY stdin
  runOneshot: (prompt: string) => void; // oneshot: spawn opencode run
}

export function deliver(target: HandoffTarget, prompt: string) {
  if (target.kind === "persistent") target.write(prompt + "\n");
  else target.runOneshot(prompt);
}
