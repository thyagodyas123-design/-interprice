import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

export function useTerminal(nodeId: string, cwd: string) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const term = new Terminal({ convertEol: true, fontSize: 13 });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(el);
    fit.fit();

    const ws = new WebSocket(`ws://${location.host}/ws`);
    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: "terminal:spawn",
        nodeId, cwd, cols: term.cols, rows: term.rows,
      }));
    };
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.type === "terminal:output" && m.nodeId === nodeId) term.write(m.data);
    };
    term.onData((d) => ws.send(JSON.stringify({ type: "terminal:input", nodeId, data: d })));
    term.onResize(({ cols, rows }) =>
      ws.send(JSON.stringify({ type: "terminal:resize", nodeId, cols, rows })));

    return () => {
      ws.send(JSON.stringify({ type: "terminal:kill", nodeId }));
      ws.close();
      term.dispose();
    };
  }, [nodeId, cwd]);

  return ref;
}
