import { sendSocket, syncEdges } from "../ws/socket";
import { useStore } from "../state/store";

export function EdgeHandoff({ edge }: { edge: any }) {
  const edges = useStore((s) => s.edges);
  const setEdges = useStore((s) => s.setEdges);

  const toggleTrigger = () => {
    const next = edges.map((e) =>
      e.id === edge.id ? { ...e, trigger: e.trigger === "auto" ? "manual" : "auto" } : e
    );
    setEdges(next as any);
    syncEdges(next as any);
  };

  return (
    <div style={{ position: "fixed", bottom: 16, right: 16, zIndex: 10, display: "flex", gap: 8 }}>
      <button onClick={() => sendSocket({ type: "handoff", sourceId: edge.source, targetId: edge.target, trigger: "manual" })}>
        send handoff
      </button>
      <button onClick={toggleTrigger}>
        {edge.trigger === "auto" ? "auto → manual" : "manual → auto"}
      </button>
    </div>
  );
}
