import Fastify from "fastify";
import websocket from "@fastify/websocket";
import { PORT } from "./config.js";
import { registerTerminalSocket } from "./ws/TerminalSocket.js";

const app = Fastify({ logger: true });
await app.register(websocket);

app.get("/health", () => ({ ok: true }));
app.register(async (scope) => {
  scope.get("/ws", { websocket: true }, (socket) => {
    registerTerminalSocket(socket);
  });
});

await app.listen({ port: PORT, host: "127.0.0.1" });
console.log(`interprice server on :${PORT}`);
