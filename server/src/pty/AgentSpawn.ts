export interface Role { id: string; name: string; instructions: string; }
export interface SpawnSpec {
  mode: "persistent" | "oneshot";
  role: Role | null;
  cwd: string;
  model: string | null;
}

export function buildCommand(spec: SpawnSpec): { cmd: string; args: string[] } {
  const rolePrompt = spec.role ? spec.role.instructions : null;
  if (spec.mode === "oneshot") {
    const args = ["run", "--dir", spec.cwd];
    if (spec.model) args.push("-m", spec.model);
    args.push(rolePrompt ?? "");
    return { cmd: "opencode", args };
  }
  const args = [spec.cwd];
  if (rolePrompt) args.push("--prompt", rolePrompt);
  if (spec.model) args.push("--model", spec.model);
  return { cmd: "opencode", args };
}
