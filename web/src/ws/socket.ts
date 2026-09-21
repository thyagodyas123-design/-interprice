export type ConnState = "connecting" | "open" | "closed";

type MessageHandler = (msg: any) => void;
type LifecycleHandler = () => void;

const openHandlers = new Set<LifecycleHandler>();
const closeHandlers = new Set<LifecycleHandler>();
const messageHandlers = new Set<MessageHandler>();

const BACKOFF = [500, 1000, 2000, 5000];
const pending: string[] = [];

let socket: WebSocket | null = null;
let state: ConnState = "closed";
let backoffIndex = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

function createSocket() {
  const s = new WebSocket(`ws://${location.host}/ws`);
  socket = s;
  state = "connecting";

  s.onopen = () => {
    state = "open";
    backoffIndex = 0;
    for (const p of pending.splice(0)) s.send(p);
    for (const h of [...openHandlers]) h();
  };
  s.onmessage = (e) => {
    let m: any;
    try { m = JSON.parse(e.data); } catch { return; }
    for (const h of [...messageHandlers]) h(m);
  };
  s.onclose = () => {
    if (socket === s) { socket = null; state = "closed"; }
    for (const h of [...closeHandlers]) h();
    scheduleReconnect();
  };
  s.onerror = () => { try { s.close(); } catch { /* noop */ } };
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  const delay = BACKOFF[Math.min(backoffIndex, BACKOFF.length - 1)];
  backoffIndex++;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (!socket) createSocket();
  }, delay);
}

function ensureSocket() {
  if (socket || reconnectTimer) return;
  createSocket();
}

export function getConnectionState(): ConnState {
  return state;
}

export function onSocketOpen(handler: LifecycleHandler): () => void {
  openHandlers.add(handler);
  return () => openHandlers.delete(handler);
}

export function onSocketClose(handler: LifecycleHandler): () => void {
  closeHandlers.add(handler);
  return () => closeHandlers.delete(handler);
}

export function onSocketMessage(handler: MessageHandler): () => void {
  messageHandlers.add(handler);
  return () => messageHandlers.delete(handler);
}

export function sendSocket(payload: unknown) {
  const data = JSON.stringify(payload);
  if (state === "open" && socket) {
    socket.send(data);
  } else {
    pending.push(data);
    ensureSocket();
  }
}

export function syncEdges(edges: unknown[]) {
  sendSocket({ type: "edges:set", edges });
}
