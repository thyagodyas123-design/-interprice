import {
  ReactFlow, Background, Controls, MiniMap,
  addEdge, applyNodeChanges, applyEdgeChanges,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useStore } from "../state/store";
import { TerminalNode } from "./nodes/TerminalNode";
import { NoteNode } from "./nodes/NoteNode";

const nodeTypes = { terminal: TerminalNode, note: NoteNode };

export function Canvas() {
  const nodes = useStore((s) => s.nodes);
  const edges = useStore((s) => s.edges);
  const setNodes = useStore((s) => s.setNodes);
  const setEdges = useStore((s) => s.setEdges);
  const addNode = useStore((s) => s.addNode);

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
        onEdgesChange={(changes) => setEdges(applyEdgeChanges(changes, edges as any) as any)}
        onConnect={(c) => setEdges(addEdge({ ...c, type: "smoothstep" } as any, edges as any) as any)}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
