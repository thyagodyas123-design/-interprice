import { useStore } from "../../state/store";

export function NoteNode({ id, data }: any) {
  const setNodes = useStore((s) => s.setNodes);
  const nodes = useStore((s) => s.nodes);
  return (
    <div style={{ width: 180, minHeight: 120, background: "#ffe58f", borderRadius: 6, padding: 8 }}>
      <textarea
        value={data.text}
        onChange={(e) =>
          setNodes(nodes.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, text: e.target.value } } : n))
        }
        style={{ width: "100%", height: 100, background: "transparent", border: "none", resize: "none" }}
      />
    </div>
  );
}
