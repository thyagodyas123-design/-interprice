import Fastify from "fastify";
import websocket from "@fastify/websocket";
import { PORT, PARTITURA_DIR } from "./config.js";
import { registerTerminalSocket } from "./ws/TerminalSocket.js";
import { PartituraStore } from "./store/PartituraStore.js";

const app = Fastify({ logger: true });
await app.register(websocket);

const store = new PartituraStore(PARTITURA_DIR);

app.get("/health", () => ({ ok: true }));
app.register(async (scope) => {
  scope.get("/ws", { websocket: true }, (socket) => {
    registerTerminalSocket(socket);
  });
});

app.get("/api/partituras", () => ({ names: store.list() }));
app.get("/api/partituras/:name", (req, reply) => {
  try { return store.load((req.params as any).name); }
  catch { return reply.code(404).send({ error: "not found" }); }
});
app.put("/api/partituras/:name", (req, reply) => {
  try { store.save(req.body as any); return { ok: true }; }
  catch (e) { return reply.code(400).send({ error: String(e) }); }
});

await app.listen({ port: PORT, host: "127.0.0.1" });
console.log(`interprice server on :${PORT}`);
