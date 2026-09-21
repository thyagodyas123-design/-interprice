import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { FreehandPath } from "../types";

export function DrawingOverlay({ active, paths, onChange }: {
  active: boolean; paths: FreehandPath[]; onChange: (p: FreehandPath[]) => void;
}) {
  const [draft, setDraft] = useState<FreehandPath | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const toLocal = (e: ReactPointerEvent) => {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  return (
    <svg ref={svgRef}
      onPointerDown={(e) => {
        if (!active) return;
        setDraft({ id: crypto.randomUUID(), color: "#fff", points: [toLocal(e)] });
      }}
      onPointerMove={(e) => {
        if (!active || !draft) return;
        setDraft({ ...draft, points: [...draft.points, toLocal(e)] });
      }}
      onPointerUp={() => {
        if (draft) { onChange([...paths, draft]); setDraft(null); }
      }}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: active ? "auto" : "none", zIndex: 5 }}
    >
      {paths.map((p) => (
        <polyline key={p.id} points={p.points.map((pt) => `${pt.x},${pt.y}`).join(" ")}
          fill="none" stroke={p.color} strokeWidth={2} />
      ))}
      {draft && <polyline points={draft.points.map((pt) => `${pt.x},${pt.y}`).join(" ")}
        fill="none" stroke={draft.color} strokeWidth={2} />}
    </svg>
  );
}
