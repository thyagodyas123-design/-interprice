import { useEffect, useState } from "react";
import {
  ReactFlow, Background, Controls, MiniMap,
  addEdge, applyNodeChanges, applyEdgeChanges,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useStore } from "../state/store";
import { syncEdges, sendSocket } from "../ws/socket";
import { listPartituras, loadPartitura, savePartitura } from "../api/client";
import type { FreehandPath } from "../types";
import { TerminalNode } from "./nodes/TerminalNode";
import { NoteNode } from "./nodes/NoteNode";
import { EdgeHandoff } from "./EdgeHandoff";
import { DrawingOverlay } from "./DrawingOverlay";

const nodeTypes = { terminal: TerminalNode, note: NoteNode, drawing: () => <></> };

export function Canvas() {
  const nodes = useStore((s) => s.nodes);
  const edges = useStore((s) => s.edges);
  const setNodes = useStore((s) => s.setNodes);
  const setEdges = useStore((s) => s.setEdges);
  const addNode = useStore((s) => s.addNode);
  const [selectedEdge, setSelectedEdge] = useState<any>(null);
  const [drawMode, setDrawMode] = useState(false);

  const drawingNode = nodes.find((n) => n.type === "drawing") as any;
  const drawingPaths: FreehandPath[] = drawingNode?.data?.paths ?? [];

  const handleDrawChange = (paths: FreehandPath[]) => {
    if (drawingNode) {
      setNodes(nodes.map((n) =>
        n.id === drawingNode.id ? { ...n, data: { ...(n.data as any), paths } } : n) as any);
    } else {
      addNode({ id: crypto.randomUUID(), type: "drawing", position: { x: 0, y: 0 }, data: { paths } } as any);
    }
  };

  const save = async () => {
    const name = prompt("partitura name");
    if (!name) return;
    try {
      const { nodes: n, edges: e, roles: r } = useStore.getState();
      await savePartitura(name, { version: 1, name, viewport: { x: 0, y: 0, zoom: 1 }, nodes: n, edges: e, roles: r });
    } catch (err) {
      alert("save failed: " + String(err));
    }
  };

  const open = async () => {
    try {
      const names = await listPartituras();
      const name = prompt("open partitura: " + names.join(", "));
      if (!name) return;
      const p = await loadPartitura(name);
      if (!p?.nodes) return;
      setNodes(p.nodes);
      setEdges(p.edges);
      useStore.setState({ roles: p.roles });
      sendSocket({ type: "roles:set", roles: p.roles });
      syncEdges(p.edges);
      useStore.setState((s) => ({ loadSeq: s.loadSeq + 1 }));
    } catch (err) {
      alert("open failed: " + String(err));
    }
  };

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
      <button
        onClick={() => setDrawMode((m) => !m)}
        style={{ position: "fixed", top: 16, left: 110, zIndex: 10 }}
      >
        ✏️ draw
      </button>
      <button
        onClick={save}
        style={{ position: "fixed", top: 16, left: 200, zIndex: 10 }}
      >
        💾 save
      </button>
      <button
        onClick={open}
        style={{ position: "fixed", top: 16, left: 280, zIndex: 10 }}
      >
        📂 open
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
      <DrawingOverlay active={drawMode} paths={drawingPaths} onChange={handleDrawChange} />
    </div>
  );
}
