import { useEffect, useState } from "react";
import {
  ReactFlow, Background, Controls, MiniMap,
  addEdge, applyNodeChanges, applyEdgeChanges,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useStore } from "../state/store";
import { syncEdges } from "../ws/socket";
import { TerminalNode } from "./nodes/TerminalNode";
import { NoteNode } from "./nodes/NoteNode";
import { EdgeHandoff } from "./EdgeHandoff";

const nodeTypes = { terminal: TerminalNode, note: NoteNode };

export function Canvas() {
  const nodes = useStore((s) => s.nodes);
  const edges = useStore((s) => s.edges);
  const setNodes = useStore((s) => s.setNodes);
  const setEdges = useStore((s) => s.setEdges);
  const addNode = useStore((s) => s.addNode);
  const [selectedEdge, setSelectedEdge] = useState<any>(null);

  useEffect(() => {
    syncEdges(useStore.getState().edges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <button
        onClick={() => addNode({ id: crypto.randomUUID(), type: "note", position: { x: 100, y: 100 }, data: { text: "" } })}
        style={{ position: "fixed", top: 16, left: 16, zIndex: 10 }}
      >
        ＋ note
      </button>
      <ReactFlow
        nodes={nodes as any}
        edges={edges as any}
        nodeTypes={nodeTypes}
        onNodesChange={(changes) => setNodes(applyNodeChanges(changes, nodes as any) as any)}
        onEdgesChange={(changes) => {
          const next = applyEdgeChanges(changes, edges as any) as any;
          setEdges(next);
          if (changes.some((c) => (c.type as string) !== "select" && (c.type as string) !== "dimensions")) {
            syncEdges(next);
          }
        }}
        onConnect={(c) => {
          const edge = { ...c, type: "smoothstep", trigger: "manual", label: "" };
          const next = addEdge(edge as any, edges as any) as any;
          setEdges(next);
          syncEdges(next);
        }}
        onEdgeClick={(_, edge) => setSelectedEdge(edge)}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
      {selectedEdge && <EdgeHandoff edge={selectedEdge} />}
    </div>
  );
}
