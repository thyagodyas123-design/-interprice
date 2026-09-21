type CloseHandler = () => void;
const closeHandlers = new Set<CloseHandler>();
let socket: WebSocket | null = null;

function connect(): WebSocket {
  const s = new WebSocket(`ws://${location.host}/ws`);
  s.onclose = () => { for (const h of [...closeHandlers]) h(); };
  s.onerror = () => { for (const h of [...closeHandlers]) h(); };
  socket = s;
  return s;
}

export function getSocket(): WebSocket {
  if (!socket || socket.readyState === WebSocket.CLOSED || socket.readyState === WebSocket.CLOSING) {
    return connect();
  }
  return socket;
}

export function onSocketClose(handler: CloseHandler): () => void {
  closeHandlers.add(handler);
  return () => closeHandlers.delete(handler);
}

export function sendSocket(payload: unknown) {
  const s = getSocket();
  const data = JSON.stringify(payload);
  if (s.readyState === WebSocket.OPEN) s.send(data);
  else s.addEventListener("open", () => s.send(data), { once: true });
}

export function syncEdges(edges: unknown[]) {
  sendSocket({ type: "edges:set", edges });
}
