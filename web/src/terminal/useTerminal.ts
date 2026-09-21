import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { getConnectionState, onSocketClose, onSocketMessage, onSocketOpen, sendSocket } from "../ws/socket";
import { useStore } from "../state/store";

export function useTerminal(nodeId: string, cwd: string) {
  const ref = useRef<HTMLDivElement>(null);
  const [disconnected, setDisconnected] = useState(false);
  const loadSeq = useStore((s) => s.loadSeq);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const term = new Terminal({ convertEol: true, fontSize: 13 });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(el);
    fit.fit();

    const spawn = () =>
      sendSocket({ type: "terminal:spawn", nodeId, cwd, cols: term.cols, rows: term.rows });

    const offMsg = onSocketMessage((m) => {
      if (m.type === "terminal:output" && m.nodeId === nodeId) term.write(m.data);
    });
    const offClose = onSocketClose(() => setDisconnected(true));
    const offOpen = onSocketOpen(() => {
      setDisconnected(false);
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
  }, [nodeId, cwd, loadSeq]);

  return [ref, disconnected] as const;
}
