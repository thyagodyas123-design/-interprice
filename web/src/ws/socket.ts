let socket: WebSocket | null = null;

export function getSocket(): WebSocket {
  if (!socket || socket.readyState === WebSocket.CLOSED || socket.readyState === WebSocket.CLOSING) {
    socket = new WebSocket(`ws://${location.host}/ws`);
  }
  return socket;
}

export function sendSocket(payload: unknown) {
  const s = getSocket();
  const data = JSON.stringify(payload);
  if (s.readyState === WebSocket.OPEN) s.send(data);
  else s.addEventListener("open", () => s.send(data), { once: true });
}
