import type { Role } from "../pty/AgentSpawn.js";

export class RoleRegistry {
  private roles = new Map<string, Role>();
  set(role: Role) { this.roles.set(role.id, role); }
  get(id: string | null): Role | null {
    return id ? (this.roles.get(id) ?? null) : null;
  }
  all(): Role[] { return [...this.roles.values()]; }
}
export const roleRegistry = new RoleRegistry();
