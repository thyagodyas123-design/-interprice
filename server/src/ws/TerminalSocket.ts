import type { WebSocket } from "@fastify/websocket";
import { PtyManager } from "../pty/PtyManager.js";
import { buildCommand, type Role } from "../pty/AgentSpawn.js";

function findRole(_id: string | null): Role | null {
  return null;
}

export function registerTerminalSocket(socket: WebSocket) {
  const manager = new PtyManager(
    (nodeId, data) => send(socket, { type: "terminal:output", nodeId, data }),
    (nodeId, code) => send(socket, { type: "terminal:exit", nodeId, code }),
  );

  socket.on("message", (raw: any) => {
    let msg: any;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    switch (msg.type) {
      case "terminal:spawn": {
        const role = msg.roleId ? findRole(msg.roleId) : null;
        const { cmd, args } = buildCommand({
          mode: msg.mode ?? "persistent",
          role,
          cwd: msg.cwd ?? process.env.HOME!,
          model: msg.model ?? null,
        });
        manager.spawn({
          nodeId: msg.nodeId,
          command: cmd,
          args,
          cwd: msg.cwd ?? process.env.HOME!,
          cols: msg.cols ?? 80,
          rows: msg.rows ?? 24,
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
        break;
    }
  });

  socket.on("close", () => manager.killAll());
}

function send(socket: WebSocket, payload: unknown) {
  if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(payload));
}
