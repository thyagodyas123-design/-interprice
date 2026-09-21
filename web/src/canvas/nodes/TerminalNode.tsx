import { Handle, Position } from "@xyflow/react";
import { useTerminal } from "../../terminal/useTerminal";

export function TerminalNode({ id, data }: any) {
  const ref = useTerminal(id, data.cwd);
  return (
    <div style={{ width: 420, background: "#111", borderRadius: 8, overflow: "hidden" }}>
      <div style={{ padding: "4px 8px", color: "#aaa", fontSize: 12 }}>
        {data.label}
      </div>
      <div ref={ref} style={{ width: "100%", height: 260 }} />
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
