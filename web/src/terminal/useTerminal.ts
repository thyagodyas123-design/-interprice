import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { getConnectionState, onSocketClose, onSocketMessage, onSocketOpen, sendSocket } from "../ws/socket";
import { useStore } from "../state/store";

export function useTerminal(nodeId: string, data: any) {
  const ref = useRef<HTMLDivElement>(null);
  const [disconnected, setDisconnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadSeq = useStore((s) => s.loadSeq);
  const { cwd, roleId, mode, model } = data;

  useEffect(() => {
    setError(null);
    const el = ref.current;
    if (!el) return;
    const term = new Terminal({ convertEol: true, fontSize: 13 });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(el);
    fit.fit();

    const spawn = () => {
      const role = useStore.getState().roles.find((r) => r.id === roleId) ?? null;
      sendSocket({
        type: "terminal:spawn", nodeId,
        cwd, role, mode: mode ?? "persistent", model: model ?? null,
        cols: term.cols, rows: term.rows,
      });
    };

    const offMsg = onSocketMessage((m) => {
      if (m.nodeId !== nodeId) return;
      if (m.type === "terminal:output") term.write(m.data);
      else if (m.type === "terminal:error") setError(m.message);
    });
    const offClose = onSocketClose(() => setDisconnected(true));
    const offOpen = onSocketOpen(() => {
      setDisconnected(false);
      setError(null);
      spawn();
    });

    if (getConnectionState() === "open") spawn();

    term.onData((d) => sendSocket({ type: "terminal:input", nodeId, data: d }));
    term.onResize(({ cols, rows }) =>
      sendSocket({ type: "terminal:resize", nodeId, cols, rows }));

    return () => {
      sendSocket({ type: "terminal:kill", nodeId });
      offMsg();
      offClose();
      offOpen();
      term.dispose();
    };
  }, [nodeId, cwd, roleId, mode, model, loadSeq]);

  return [ref, disconnected, error] as const;
}
