import { create } from "zustand";
import type { Partitura, PartituraNode, PartituraEdge, Role } from "../types";

interface State {
  nodes: PartituraNode[];
  edges: PartituraEdge[];
  roles: Role[];
  setNodes: (n: PartituraNode[]) => void;
  setEdges: (e: PartituraEdge[]) => void;
  addNode: (n: PartituraNode) => void;
  addEdge: (e: PartituraEdge) => void;
}

export const useStore = create<State>((set) => ({
  nodes: [], edges: [], roles: [],
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  addNode: (n) => set((s) => ({ nodes: [...s.nodes, n] })),
  addEdge: (e) => set((s) => ({ edges: [...s.edges, e] })),
}));
