export type NodeType = "terminal" | "note" | "drawing";

export interface Position { x: number; y: number; }

export interface TerminalData {
  label: string;
  roleId: string | null;      // null = no role
  cwd: string;                // absolute working dir
  mode: "persistent" | "oneshot";
  model: string | null;       // e.g. "openai/gpt-5" or null = default
}

export interface NoteData { text: string; }

export interface DrawingData { paths: FreehandPath[]; }

export interface FreehandPath {
  id: string;
  color: string;
  points: { x: number; y: number }[];  // canvas coords
}

export type NodeData = TerminalData | NoteData | DrawingData;

export interface PartituraNode {
  id: string;
  type: NodeType;
  position: Position;         // ignored for drawing (drawing spans canvas)
  data: NodeData;
}

export interface PartituraEdge {
  id: string;
  source: string;             // node id
  target: string;             // node id
  trigger: "manual" | "auto";
  label: string;
}

export interface Role { id: string; name: string; instructions: string; }

export interface Partitura {
  version: 1;
  name: string;
  viewport: { x: number; y: number; zoom: number };
  nodes: PartituraNode[];
  edges: PartituraEdge[];
  roles: Role[];
}
