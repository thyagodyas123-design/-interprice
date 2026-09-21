import { create } from "zustand";
import type { Partitura, PartituraNode, PartituraEdge, Role } from "../types";

export const DEFAULT_ROLE: Role = {
  id: "coder", name: "Coder",
  instructions: "You are a senior engineer. Write clean, tested TypeScript. Ask before large changes.",
};

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
  nodes: [], edges: [], roles: [DEFAULT_ROLE],
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  addNode: (n) => set((s) => ({ nodes: [...s.nodes, n] })),
  addEdge: (e) => set((s) => ({ edges: [...s.edges, e] })),
}));
