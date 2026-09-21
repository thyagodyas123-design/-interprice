import { Handle, Position } from "@xyflow/react";
import { useTerminal } from "../../terminal/useTerminal";

export function TerminalNode({ id, data }: any) {
  const [ref, disconnected] = useTerminal(id, data.cwd);
  return (
    <div style={{ width: 420, background: "#111", borderRadius: 8, overflow: "hidden" }}>
      <div style={{ padding: "4px 8px", color: "#aaa", fontSize: 12 }}>
        {data.label}
      </div>
      <div style={{ position: "relative", width: "100%", height: 260 }}>
        <div ref={ref} style={{ width: "100%", height: "100%" }} />
        {disconnected && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)", color: "#f66", fontSize: 12 }}>
            disconnected
          </div>
        )}
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
