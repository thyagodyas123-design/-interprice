import type { WebSocket } from "@fastify/websocket";
import { PtyManager } from "../pty/PtyManager.js";
import { buildCommand } from "../pty/AgentSpawn.js";
import { roleRegistry } from "../roles/RoleRegistry.js";
import { buildHandoffPrompt, deliver, IdleDetector, type HandoffTarget } from "../handoff/HandoffEngine.js";

const MAX_LAST_OUTPUT = 32000;
const AUTO_IDLE_MS = 8000;

export function registerTerminalSocket(socket: WebSocket) {
  const lastOutput = new Map<string, string>();
  const targets = new Map<string, HandoffTarget>();
  const autoWatchers = new Map<string, { targetId: string; idle: IdleDetector }>();

  function deliverHandoff(sourceId: string, targetId: string, content?: string) {
    const prompt = buildHandoffPrompt(sourceId, content ?? lastOutput.get(sourceId) ?? "");
    const target = targets.get(targetId);
    if (target) deliver(target, prompt);
    else manager.write(targetId, prompt + "\n");
  }

  const manager = new PtyManager(
    (nodeId, data) => {
      lastOutput.set(nodeId, ((lastOutput.get(nodeId) ?? "") + data).slice(-MAX_LAST_OUTPUT));
      send(socket, { type: "terminal:output", nodeId, data });
      const w = autoWatchers.get(nodeId);
      if (w) w.idle.reset(AUTO_IDLE_MS, () => deliverHandoff(nodeId, w.targetId));
    },
    (nodeId, code) => send(socket, { type: "terminal:exit", nodeId, code }),
  );

  function cleanupNode(nodeId: string) {
    lastOutput.delete(nodeId);
    targets.delete(nodeId);
  }

  function registerAutoEdges(edges: any[]) {
    for (const w of autoWatchers.values()) w.idle.clear();
    autoWatchers.clear();
    for (const e of edges ?? []) {
      if (e.trigger === "auto") {
        autoWatchers.set(e.source, { targetId: e.target, idle: new IdleDetector() });
      }
    }
  }

  socket.on("message", (raw: any) => {
    let msg: any;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    switch (msg.type) {
      case "terminal:spawn": {
        const mode = msg.mode ?? "persistent";
        const cwd = msg.cwd ?? process.env.HOME!;
        const cols = msg.cols ?? 80;
        const rows = msg.rows ?? 24;
        const model = msg.model ?? null;
        const role = roleRegistry.get(msg.roleId ?? null);
        try {
          const { cmd, args } = buildCommand({ mode, role, cwd, model });
          manager.spawn({ nodeId: msg.nodeId, command: cmd, args, cwd, cols, rows });
        } catch (e) {
          send(socket, { type: "terminal:error", nodeId: msg.nodeId, message: String(e) });
          break;
        }
        targets.set(msg.nodeId, {
          kind: mode,
          write: (s) => manager.write(msg.nodeId, s),
          runOneshot: (prompt) => {
            const one = ["run", "--dir", cwd];
            if (model) one.push("-m", model);
            one.push(prompt);
            try {
              manager.spawn({ nodeId: msg.nodeId, command: "opencode", args: one, cwd, cols, rows });
            } catch (e) {
              send(socket, { type: "terminal:error", nodeId: msg.nodeId, message: String(e) });
            }
          },
        });
        break;
      }
      case "terminal:input":
        manager.write(msg.nodeId, msg.data);
        break;
      case "terminal:resize":
        manager.resize(msg.nodeId, msg.cols, msg.rows);
        break;
      case "terminal:kill":
        manager.kill(msg.nodeId);
        cleanupNode(msg.nodeId);
        break;
      case "roles:set":
        for (const r of msg.roles ?? []) roleRegistry.set(r);
        break;
      case "edges:set":
        registerAutoEdges(msg.edges);
        break;
      case "handoff":
        deliverHandoff(msg.sourceId, msg.targetId, msg.content);
        break;
    }
  });

  socket.on("close", () => manager.killAll());
}

function send(socket: WebSocket, payload: unknown) {
  if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(payload));
}
