# Interprice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local web app that orchestrates OpenCode agents on an infinite canvas (React Flow), with live terminals, agent-to-agent handoff, reusable roles, sticky notes, and JSON partituras that optionally mirror to an Obsidian note.

**Architecture:** React + Vite + TypeScript frontend talks to a Node.js backend over WebSocket (terminal I/O) and REST (partitura CRUD). The backend uses node-pty to spawn a live `opencode` process per terminal node, a HandoffEngine for structured prompt→prompt handoff, and a PartituraStore that persists canvas state as JSON. An ObsidianBridge appends progress/decisions to a vault note.

**Tech Stack:** Node.js 26 (present), TypeScript, Fastify + @fastify/websocket, node-pty, zod, Vitest; Vite + React 18 + TypeScript, @xyflow/react (React Flow), @xterm/xterm + @xterm/addon-fit, zustand.

---

## Conventions

- **Repo:** monorepo npm workspaces: `server/` (backend) and `web/` (frontend). Root scripts orchestrate both.
- **Run:** `npm run dev` (root) starts backend (port 4310) + web (Vite port 5173, proxies `/api` and `/ws` to backend).
- **Test:** `npm test` (root) runs `server` Vitest suite.
- **TDD:** pure logic (command building, handoff prompt, partitura schema, obsidian append) is written test-first. PTY/WS/UI are verified by manual smoke + integration notes (not unit-tested).
- **Commits:** one commit per task, conventional commits (`feat:`, `fix:`, `docs:`).
- **Data dir:** `~/.interprice/partituras/*.json`.

---

## Shared contract (JSON schema, v1)

This is the source of truth for partitura files and the WS protocol. Server validates with zod (Task 4.2); web mirrors these TS types.

```ts
type NodeType = "terminal" | "note" | "drawing";

interface Position { x: number; y: number; }

interface TerminalData {
  label: string;
  roleId: string | null;      // null = no role
  cwd: string;                // absolute working dir
  mode: "persistent" | "oneshot";
  model: string | null;       // e.g. "openai/gpt-5" or null = default
}

interface NoteData { text: string; }

interface DrawingData { paths: FreehandPath[]; }

interface FreehandPath {
  id: string;
  color: string;
  points: { x: number; y: number }[];  // canvas coords
}

type NodeData = TerminalData | NoteData | DrawingData;

interface PartituraNode {
  id: string;
  type: NodeType;
  position: Position;         // ignored for drawing (drawing spans canvas)
  data: NodeData;
}

interface PartituraEdge {
  id: string;
  source: string;             // node id
  target: string;             // node id
  trigger: "manual" | "auto";
  label: string;
}

interface Role { id: string; name: string; instructions: string; }

interface Partitura {
  version: 1;
  name: string;
  viewport: { x: number; y: number; zoom: number };
  nodes: PartituraNode[];
  edges: PartituraEdge[];
  roles: Role[];
}
```

### WS protocol

Client → server:
- `{ type: "terminal:spawn", nodeId, mode, roleId, cwd, model, cols, rows }`
- `{ type: "terminal:input", nodeId, data }`
- `{ type: "terminal:resize", nodeId, cols, rows }`
- `{ type: "terminal:kill", nodeId }`
- `{ type: "handoff", sourceId, targetId, content, trigger }`  // trigger: "manual" | "auto"

Server → client:
- `{ type: "terminal:output", nodeId, data }`
- `{ type: "terminal:exit", nodeId, code }`
- `{ type: "terminal:error", nodeId, message }`

REST:
- `GET  /api/partituras` → `{ names: string[] }`
- `GET  /api/partituras/:name` → `Partitura` (404 if missing)
- `PUT  /api/partituras/:name` → saves body (validated), returns 200
- `POST /api/obsidian/note` → `{ text }` appends to configured vault note, returns 200

---

## Milestone M0 — Skeleton: terminal renders a shell

### Task 0.1: Workspace scaffolding

**Files:**
- Create: `package.json` (root, workspaces)
- Create: `tsconfig.base.json`
- Create: `server/package.json`, `server/tsconfig.json`
- Create: `web/package.json`, `web/tsconfig.json`, `web/vite.config.ts`, `web/index.html`
- Create: `.gitignore`

- [ ] **Step 1: Root package.json**

```json
{
  "name": "interprice",
  "private": true,
  "workspaces": ["server", "web"],
  "scripts": {
    "dev": "concurrently -n server,web -c blue,green \"npm:dev -w server\" \"npm:dev -w web\"",
    "test": "npm test -w server",
    "build": "npm run build -w server && npm run build -w web"
  },
  "devDependencies": { "concurrently": "^9.0.0" }
}
```

- [ ] **Step 2: .gitignore**

```
node_modules/
dist/
.env
~/.interprice/
*.log
```

- [ ] **Step 3: server/package.json**

```json
{
  "name": "server",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "test": "vitest run"
  },
  "dependencies": {
    "@fastify/websocket": "^11.0.0",
    "fastify": "^5.0.0",
    "node-pty": "^1.1.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 4: web/package.json**

```json
{
  "name": "web",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build"
  },
  "dependencies": {
    "@xterm/addon-fit": "^0.10.0",
    "@xterm/xterm": "^5.5.0",
    "@xyflow/react": "^12.3.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.5.0",
    "vite": "^5.4.0"
  }
}
```

- [ ] **Step 5: web/vite.config.ts**

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:4310",
      "/ws": { target: "ws://localhost:4310", ws: true },
    },
  },
});
```

- [ ] **Step 6: Install + verify**

Run: `npm install`
Expected: install completes, `node_modules/` created in root, `server`, `web`.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "chore: workspace scaffold (server + web)"
```

### Task 0.2: Backend spawns a shell over WS

**Files:**
- Create: `server/src/config.ts`
- Create: `server/src/pty/PtyManager.ts`
- Create: `server/src/ws/TerminalSocket.ts`
- Create: `server/src/index.ts`

- [ ] **Step 1: config.ts**

```ts
import os from "node:os";
import path from "node:path";

export const PORT = Number(process.env.INTERPRICE_PORT ?? 4310);
export const DATA_DIR =
  process.env.INTERPRICE_DATA_DIR ?? path.join(os.homedir(), ".interprice");
export const PARTITURA_DIR = path.join(DATA_DIR, "partituras");
```

- [ ] **Step 2: PtyManager.ts**

```ts
import * as pty from "node-pty";

type OnData = (nodeId: string, data: string) => void;
type OnExit = (nodeId: string, code: number) => void;

export class PtyManager {
  private procs = new Map<string, pty.IPty>();

  constructor(private onData: OnData, private onExit: OnExit) {}

  spawn(opts: {
    nodeId: string;
    command: string;
    args: string[];
    cwd: string;
    cols: number;
    rows: number;
  }) {
    this.kill(opts.nodeId);
    const proc = pty.spawn(opts.command, opts.args, {
      name: "xterm-256color",
      cols: opts.cols,
      rows: opts.rows,
      cwd: opts.cwd,
      env: process.env as Record<string, string>,
    });
    this.procs.set(opts.nodeId, proc);
    proc.onData((d) => this.onData(opts.nodeId, d));
    proc.onExit(({ exitCode }) => {
      this.procs.delete(opts.nodeId);
      this.onExit(opts.nodeId, exitCode);
    });
    return proc;
  }

  write(nodeId: string, data: string) {
    this.procs.get(nodeId)?.write(data);
  }

  resize(nodeId: string, cols: number, rows: number) {
    this.procs.get(nodeId)?.resize(cols, rows);
  }

  kill(nodeId: string) {
    const p = this.procs.get(nodeId);
    if (p) {
      this.procs.delete(nodeId);
      p.kill();
    }
  }

  killAll() {
    for (const id of [...this.procs.keys()]) this.kill(id);
  }
}
```

- [ ] **Step 3: TerminalSocket.ts (WS ↔ PTY bridge)**

```ts
import type { WebSocket } from "@fastify/websocket";
import { PtyManager } from "../pty/PtyManager.js";

export function registerTerminalSocket(socket: WebSocket) {
  const manager = new PtyManager(
    (nodeId, data) => send(socket, { type: "terminal:output", nodeId, data }),
    (nodeId, code) => send(socket, { type: "terminal:exit", nodeId, code }),
  );

  socket.on("message", (raw) => {
    let msg: any;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    switch (msg.type) {
      case "terminal:spawn":
        manager.spawn({
          nodeId: msg.nodeId,
          command: "zsh",
          args: [],
          cwd: msg.cwd ?? process.env.HOME!,
          cols: msg.cols ?? 80,
          rows: msg.rows ?? 24,
        });
        break;
      case "terminal:input":
        manager.write(msg.nodeId, msg.data);
        break;
      case "terminal:resize":
        manager.resize(msg.nodeId, msg.cols, msg.rows);
        break;
      case "terminal:kill":
        manager.kill(msg.nodeId);
        break;
    }
  });

  socket.on("close", () => manager.killAll());
}

function send(socket: WebSocket, payload: unknown) {
  if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(payload));
}
```

- [ ] **Step 4: index.ts**

```ts
import Fastify from "fastify";
import websocket from "@fastify/websocket";
import { PORT } from "./config.js";
import { registerTerminalSocket } from "./ws/TerminalSocket.js";

const app = Fastify({ logger: true });
await app.register(websocket);

app.get("/health", () => ({ ok: true }));
app.register(async (scope) => {
  scope.get("/ws", { websocket: true }, (socket) => {
    registerTerminalSocket(socket);
  });
});

await app.listen({ port: PORT, host: "127.0.0.1" });
console.log(`interprice server on :${PORT}`);
```

- [ ] **Step 5: Manual smoke**

Run: `npm run dev -w server`
Expected: `interprice server on :4310`. Then `curl localhost:4310/health` → `{"ok":true}`.

- [ ] **Step 6: Commit**

```bash
git add server && git commit -m "feat(server): WS + node-pty shell spawn"
```

### Task 0.3: Web renders the shell over WS

**Files:**
- Create: `web/src/main.tsx`, `web/src/App.tsx`
- Create: `web/src/terminal/useTerminal.ts`

- [ ] **Step 1: useTerminal.ts**

```ts
import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

export function useTerminal(nodeId: string, cwd: string) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const term = new Terminal({ convertEol: true, fontSize: 13 });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(el);
    fit.fit();

    const ws = new WebSocket(`ws://${location.host}/ws`);
    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: "terminal:spawn",
        nodeId, cwd, cols: term.cols, rows: term.rows,
      }));
    };
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.type === "terminal:output" && m.nodeId === nodeId) term.write(m.data);
    };
    term.onData((d) => ws.send(JSON.stringify({ type: "terminal:input", nodeId, data: d })));
    term.onResize(({ cols, rows }) =>
      ws.send(JSON.stringify({ type: "terminal:resize", nodeId, cols, rows })));

    return () => {
      ws.send(JSON.stringify({ type: "terminal:kill", nodeId }));
      ws.close();
      term.dispose();
    };
  }, [nodeId, cwd]);

  return ref;
}
```

- [ ] **Step 2: main.tsx + App.tsx**

```tsx
// main.tsx
import { createRoot } from "react-dom/client";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(<App />);
```

```tsx
// App.tsx
import { useTerminal } from "./terminal/useTerminal";

export function App() {
  const ref = useTerminal("t1", import.meta.env.VITE_CWD ?? "/");
  return <div style={{ height: "100vh", padding: 16 }}>
    <div ref={ref} style={{ width: "100%", height: "100%" }} />
  </div>;
}
```

- [ ] **Step 3: index.html**

```html
<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8" /><title>interprice</title></head>
  <body style="margin:0"><div id="root" style="height:100vh"></div>
  <script type="module" src="/src/main.tsx"></script></body>
</html>
```

- [ ] **Step 4: Smoke**

Run: `npm run dev` (root). Open `http://localhost:5173`.
Expected: a working shell (zsh) renders; you can type `ls`, `echo hi`.

- [ ] **Step 5: Commit**

```bash
git add web && git commit -m "feat(web): xterm renders shell over WS"
```

---

## Milestone M1 — Canvas + live OpenCode node

### Task 1.1: AgentSpawn command builder (TDD)

**Files:**
- Create: `server/src/pty/AgentSpawn.ts`
- Test: `server/test/agentSpawn.test.ts`

- [ ] **Step 1: failing test**

```ts
import { describe, it, expect } from "vitest";
import { buildCommand } from "../src/pty/AgentSpawn.js";

describe("buildCommand", () => {
  const role = { id: "r1", name: "Coder", instructions: "You write clean TS." };

  it("persistent TUI with role", () => {
    const c = buildCommand({
      mode: "persistent", role, cwd: "/proj", model: "anthropic/claude-sonnet-4",
    });
    expect(c.cmd).toBe("opencode");
    expect(c.args).toEqual(["/proj", "--prompt", "You write clean TS.", "--model", "anthropic/claude-sonnet-4"]);
  });

  it("oneshot run with role", () => {
    const c = buildCommand({ mode: "oneshot", role, cwd: "/proj", model: null });
    expect(c.cmd).toBe("opencode");
    expect(c.args[0]).toBe("run");
    expect(c.args).toContain("--dir");
    expect(c.args).toContain("/proj");
  });

  it("no model omits --model", () => {
    const c = buildCommand({ mode: "persistent", role: null, cwd: "/p", model: null });
    expect(c.args).not.toContain("--model");
  });
});
```

- [ ] **Step 2: run, expect FAIL**

Run: `npm test -w server`
Expected: FAIL — module not found.

- [ ] **Step 3: AgentSpawn.ts**

```ts
export interface Role { id: string; name: string; instructions: string; }
export interface SpawnSpec {
  mode: "persistent" | "oneshot";
  role: Role | null;
  cwd: string;
  model: string | null;
}

export function buildCommand(spec: SpawnSpec): { cmd: string; args: string[] } {
  const rolePrompt = spec.role ? spec.role.instructions : null;
  if (spec.mode === "oneshot") {
    const args = ["run", "--dir", spec.cwd];
    if (spec.model) args.push("-m", spec.model);
    args.push(rolePrompt ?? "");
    return { cmd: "opencode", args };
  }
  const args = [spec.cwd];
  if (rolePrompt) args.push("--prompt", rolePrompt);
  if (spec.model) args.push("--model", spec.model);
  return { cmd: "opencode", args };
}
```

- [ ] **Step 4: run, expect PASS**

Run: `npm test -w server`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add server && git commit -m "feat(server): agent spawn command builder"
```

### Task 1.2: Canvas with React Flow

**Files:**
- Create: `web/src/state/store.ts`
- Create: `web/src/types.ts`
- Create: `web/src/canvas/Canvas.tsx`
- Modify: `web/src/App.tsx`

- [ ] **Step 1: types.ts** — mirror the shared contract exactly (copy the TS types from "Shared contract" above into this file).

- [ ] **Step 2: store.ts (zustand)**

```ts
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
```

- [ ] **Step 3: Canvas.tsx**

```tsx
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

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
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
```

- [ ] **Step 4: App.tsx uses Canvas**

```tsx
import { Canvas } from "./canvas/Canvas";

export function App() {
  return <Canvas />;
}
```

- [ ] **Step 5: Manual smoke**

Run: `npm run dev`. Open app.
Expected: empty canvas with grid, zoom/pan controls, minimap.

- [ ] **Step 6: Commit**

```bash
git add web && git commit -m "feat(web): React Flow canvas with zoom/pan"
```

### Task 1.3: TerminalNode = live OpenCode (persistent)

**Files:**
- Create: `web/src/canvas/nodes/TerminalNode.tsx`
- Modify: `server/src/ws/TerminalSocket.ts` (spawn via AgentSpawn, roleId→role lookup)

- [ ] **Step 1: TerminalNode.tsx**

```tsx
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
```

- [ ] **Step 2: TerminalSocket spawns opencode**

In `TerminalSocket.ts`, replace the `terminal:spawn` handler to resolve role and use `buildCommand`:

```ts
case "terminal:spawn": {
  const role = msg.roleId ? findRole(msg.roleId) : null;
  const { cmd, args } = buildCommand({
    mode: msg.mode ?? "persistent",
    role, cwd: msg.cwd ?? process.env.HOME!,
    model: msg.model ?? null,
  });
  manager.spawn({ nodeId: msg.nodeId, command: cmd, args, cwd: msg.cwd ?? process.env.HOME!, cols: msg.cols ?? 80, rows: msg.rows ?? 24 });
  break;
}
```

Add `findRole` returning `Role | null` (v1: reads from an in-memory role registry seeded empty; populated in Task 2.1). For now `findRole = () => null`.

- [ ] **Step 3: Manual smoke**

Run: `npm run dev`. Click/emit a spawn message for a persistent node with `cwd` = a project dir.
Expected: OpenCode TUI boots inside the node; you can type a prompt and get a response.

- [ ] **Step 4: Commit**

```bash
git add server web && git commit -m "feat: live OpenCode terminal node"
```

---

## Milestone M2 — Roles + sticky notes

### Task 2.1: Roles model + injection

**Files:**
- Create: `server/src/roles/RoleRegistry.ts`
- Modify: `server/src/ws/TerminalSocket.ts` (use registry)
- Modify: `web/src/state/store.ts` (seed a default role)

- [ ] **Step 1: RoleRegistry.ts**

```ts
import type { Role } from "../pty/AgentSpawn.js";

export class RoleRegistry {
  private roles = new Map<string, Role>();
  set(role: Role) { this.roles.set(role.id, role); }
  get(id: string | null): Role | null {
    return id ? (this.roles.get(id) ?? null) : null;
  }
  all(): Role[] { return [...this.roles.values()]; }
}
export const roleRegistry = new RoleRegistry();
```

- [ ] **Step 2: wire into TerminalSocket** — replace the placeholder `findRole` with `roleRegistry.get(msg.roleId)`. Add a WS message `{ type: "roles:set", roles: Role[] }` that loads roles into the registry (called when a partitura loads).

- [ ] **Step 3: web store seeds a default role**

```ts
export const DEFAULT_ROLE: Role = {
  id: "coder", name: "Coder",
  instructions: "You are a senior engineer. Write clean, tested TypeScript. Ask before large changes.",
};
```

Seed `roles: [DEFAULT_ROLE]` in the store initial state.

- [ ] **Step 4: smoke**

Run: `npm run dev`. Spawn a node with `roleId: "coder"`.
Expected: OpenCode starts seeded with the role instructions as the initial prompt.

- [ ] **Step 5: Commit**

```bash
git add server web && git commit -m "feat: role registry + role injection"
```

### Task 2.2: NoteNode (sticky note)

**Files:**
- Create: `web/src/canvas/nodes/NoteNode.tsx`
- Modify: `web/src/canvas/Canvas.tsx` (nodeTypes already includes note; add a toolbar button to add a note)

- [ ] **Step 1: NoteNode.tsx**

```tsx
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
```

- [ ] **Step 2: toolbar button** — in `Canvas.tsx`, add a fixed-position button "＋ note" that calls `addNode({ id: crypto.randomUUID(), type: "note", position: { x: 100, y: 100 }, data: { text: "" } })`.

- [ ] **Step 3: smoke** — click the button, edit text.

- [ ] **Step 4: Commit**

```bash
git add web && git commit -m "feat: sticky note nodes"
```

---

## Milestone M3 — Connections + Handoff Engine

### Task 3.1: HandoffEngine (TDD)

**Files:**
- Create: `server/src/handoff/HandoffEngine.ts`
- Test: `server/test/handoff.test.ts`

- [ ] **Step 1: failing test**

```ts
import { describe, it, expect } from "vitest";
import { buildHandoffPrompt } from "../src/handoff/HandoffEngine.js";

describe("buildHandoffPrompt", () => {
  it("wraps content with structured marker", () => {
    const p = buildHandoffPrompt("Coder", "Please review the diff.");
    expect(p).toContain("[Handoff de Coder]");
    expect(p).toContain("Please review the diff.");
  });
});
```

- [ ] **Step 2: run, expect FAIL**

- [ ] **Step 3: HandoffEngine.ts**

```ts
export function buildHandoffPrompt(sourceLabel: string, content: string): string {
  return `\n\n[Handoff de ${sourceLabel}]\n${content}\n`;
}

export interface HandoffTarget {
  kind: "persistent" | "oneshot";
  write: (s: string) => void;          // persistent: write to PTY stdin
  runOneshot: (prompt: string) => void; // oneshot: spawn opencode run
}

export function deliver(target: HandoffTarget, prompt: string) {
  if (target.kind === "persistent") target.write(prompt + "\n");
  else target.runOneshot(prompt);
}
```

- [ ] **Step 4: run, expect PASS**

- [ ] **Step 5: Commit**

```bash
git add server && git commit -m "feat(server): handoff engine"
```

### Task 3.2: Manual handoff over connections

**Files:**
- Modify: `server/src/ws/TerminalSocket.ts` (handle `handoff` message)
- Modify: `web/src/canvas/Canvas.tsx` (edge click → send handoff with source's last output)
- Create: `web/src/canvas/EdgeHandoff.tsx` (edge context/button)

- [ ] **Step 1: server `handoff` handler**

In `TerminalSocket.ts`, track each node's last output buffer in a `Map<string,string>` (append `terminal:output` data, cap at 32k chars). Handle:

```ts
case "handoff": {
  const sourceLabel = msg.sourceId; // v1: use id as label
  const content = msg.content ?? lastOutput.get(msg.sourceId) ?? "";
  const prompt = buildHandoffPrompt(sourceLabel, content);
  const target = targets.get(msg.targetId);
  if (msg.targetMode === "oneshot") target?.runOneshot(prompt);
  else manager.write(msg.targetId, prompt);
  break;
}
```

- [ ] **Step 2: web — clicking an edge opens a "send handoff" button** that emits `{ type: "handoff", sourceId, targetId, trigger: "manual" }` (content omitted → server uses last output).

- [ ] **Step 3: smoke** — two persistent nodes; type a prompt in A, let it respond, click edge A→B; B receives `[Handoff de A] ...`.

- [ ] **Step 4: Commit**

```bash
git add server web && git commit -m "feat: manual handoff over connections"
```

### Task 3.3: Auto handoff (idle heuristic)

**Files:**
- Modify: `server/src/handoff/HandoffEngine.ts` (add idle detector)
- Modify: `server/src/ws/TerminalSocket.ts` (auto edges trigger on idle)

- [ ] **Step 1: idle detector**

```ts
export class IdleDetector {
  private timer?: NodeJS.Timeout;
  reset(ms: number, fn: () => void) {
    clearTimeout(this.timer);
    this.timer = setTimeout(fn, ms);
  }
  clear() { clearTimeout(this.timer); }
}
```

- [ ] **Step 2: wire** — for edges marked `auto`, on each `terminal:output` from the source node, reset an idle timer (default 8000 ms). On fire, deliver the last output to the target once (and don't refire until new output arrives). Document as best-effort (no reliable "task complete" signal in TUI).

- [ ] **Step 3: smoke** — edge with `trigger:"auto"`; A finishes responding → B auto-receives handoff.

- [ ] **Step 4: Commit**

```bash
git add server && git commit -m "feat: auto handoff via idle heuristic"
```

---

## Milestone M4 — Drawing, partitura save/load, Obsidian bridge

### Task 4.1: DrawingOverlay (SVG freehand)

**Files:**
- Create: `web/src/canvas/DrawingOverlay.tsx`
- Modify: `web/src/canvas/Canvas.tsx` (toggle draw mode)

- [ ] **Step 1: DrawingOverlay.tsx** — an absolutely-positioned SVG over the canvas (pointer-events only when draw mode is on). On pointerdown/move/up, append points to the current `FreehandPath`; store paths in a `drawing` node's `data.paths`.

```tsx
import { useRef, useState } from "react";
import type { FreehandPath } from "../types";

export function DrawingOverlay({ active, paths, onChange }: {
  active: boolean; paths: FreehandPath[]; onChange: (p: FreehandPath[]) => void;
}) {
  const [draft, setDraft] = useState<FreehandPath | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const toLocal = (e: React.PointerEvent) => {
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
```

- [ ] **Step 2: toggle** — a "✏️ draw" toolbar button toggles `active` and persists to a single `drawing` node (`type:"drawing"`) in the store.

- [ ] **Step 3: smoke** — toggle draw, scribble on canvas, strokes persist.

- [ ] **Step 4: Commit**

```bash
git add web && git commit -m "feat: freehand drawing overlay"
```

### Task 4.2: PartituraStore + zod schema (TDD)

**Files:**
- Create: `server/src/store/schema.ts` (zod)
- Create: `server/src/store/PartituraStore.ts`
- Test: `server/test/partitura.test.ts`

- [ ] **Step 1: failing test**

```ts
import { describe, it, expect } from "vitest";
import { PartituraStore } from "../src/store/PartituraStore.js";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const dir = mkdtempSync(path.join(tmpdir(), "interprice-test-"));

describe("PartituraStore", () => {
  const store = new PartituraStore(dir);
  const p = {
    version: 1 as const, name: "t", viewport: { x: 0, y: 0, zoom: 1 },
    nodes: [], edges: [], roles: [],
  };

  it("save then load round-trips", () => {
    store.save(p);
    expect(store.load("t")).toEqual(p);
  });

  it("list returns saved names", () => {
    expect(store.list()).toContain("t");
  });

  it("rejects invalid JSON", () => {
    expect(() => store.load("missing")).toThrow();
  });
});
```

- [ ] **Step 2: run, expect FAIL**

- [ ] **Step 3: schema.ts**

```ts
import { z } from "zod";

const position = z.object({ x: z.number(), y: z.number() });
const terminalData = z.object({
  label: z.string(), roleId: z.string().nullable(), cwd: z.string(),
  mode: z.enum(["persistent", "oneshot"]), model: z.string().nullable(),
});
const noteData = z.object({ text: z.string() });
const point = z.object({ x: z.number(), y: z.number() });
const drawingData = z.object({
  paths: z.array(z.object({ id: z.string(), color: z.string(), points: z.array(point) })),
});
const node = z.object({
  id: z.string(), type: z.enum(["terminal", "note", "drawing"]),
  position, data: z.union([terminalData, noteData, drawingData]),
});
const edge = z.object({
  id: z.string(), source: z.string(), target: z.string(),
  trigger: z.enum(["manual", "auto"]), label: z.string(),
});
const role = z.object({ id: z.string(), name: z.string(), instructions: z.string() });

export const partituraSchema = z.object({
  version: z.literal(1), name: z.string(),
  viewport: z.object({ x: z.number(), y: z.number(), zoom: z.number() }),
  nodes: z.array(node), edges: z.array(edge), roles: z.array(role),
});
export type Partitura = z.infer<typeof partituraSchema>;
```

- [ ] **Step 4: PartituraStore.ts**

```ts
import { mkdirSync, readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { partituraSchema, type Partitura } from "./schema.js";

export class PartituraStore {
  constructor(private dir: string) { mkdirSync(dir, { recursive: true }); }
  private file(name: string) { return path.join(this.dir, `${name}.json`); }

  save(p: Partitura) {
    const parsed = partituraSchema.parse(p);
    writeFileSync(this.file(p.name), JSON.stringify(parsed, null, 2));
  }

  load(name: string): Partitura {
    const raw = readFileSync(this.file(name), "utf8");
    return partituraSchema.parse(JSON.parse(raw));
  }

  list(): string[] {
    if (!existsSync(this.dir)) return [];
    return readdirSync(this.dir).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""));
  }
}
```

- [ ] **Step 5: run, expect PASS**

- [ ] **Step 6: Commit**

```bash
git add server && git commit -m "feat(server): partitura store + zod validation"
```

### Task 4.3: Save/load UI + respawn

**Files:**
- Create: `web/src/api/client.ts`
- Modify: `server/src/index.ts` (REST routes for partituras)
- Modify: `web/src/canvas/Canvas.tsx` (save/load buttons)

- [ ] **Step 1: client.ts**

```ts
export async function listPartituras(): Promise<string[]> {
  return (await fetch("/api/partituras")).json();
}
export async function loadPartitura(name: string) {
  return (await fetch(`/api/partituras/${name}`)).json();
}
export async function savePartitura(name: string, body: unknown) {
  await fetch(`/api/partituras/${name}`, {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
}
```

- [ ] **Step 2: server routes**

```ts
app.get("/api/partituras", () => ({ names: store.list() }));
app.get("/api/partituras/:name", (req, reply) => {
  try { return store.load((req.params as any).name); }
  catch { return reply.code(404).send({ error: "not found" }); }
});
app.put("/api/partituras/:name", (req, reply) => {
  try { store.save(req.body as any); return { ok: true }; }
  catch (e) { return reply.code(400).send({ error: String(e) }); }
});
```

- [ ] **Step 3: UI** — "💾 save" prompts for a name and `savePartitura(name, snapshot)`; "📂 open" lists and loads into the store (respawn terminal nodes by remounting). Snapshot is built from the zustand store (nodes/edges/roles/viewport).

- [ ] **Step 4: smoke** — create nodes, save, reload page, open → canvas restored, terminals respawn.

- [ ] **Step 5: Commit**

```bash
git add server web && git commit -m "feat: partitura save/load"
```

### Task 4.4: ObsidianBridge (TDD)

**Files:**
- Create: `server/src/obsidian/ObsidianBridge.ts`
- Test: `server/test/obsidian.test.ts`
- Modify: `server/src/index.ts` (POST /api/obsidian/note)

- [ ] **Step 1: failing test** (append to temp file)

```ts
import { describe, it, expect } from "vitest";
import { appendNote } from "../src/obsidian/ObsidianBridge.js";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

describe("appendNote", () => {
  it("appends a line with timestamp", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "obs-"));
    const file = path.join(dir, "note.md");
    appendNote(file, "decision made");
    const content = readFileSync(file, "utf8");
    expect(content).toContain("decision made");
    expect(content).toContain("- ");
  });
});
```

- [ ] **Step 2: run, expect FAIL**

- [ ] **Step 3: ObsidianBridge.ts**

```ts
import { appendFileSync } from "node:fs";

export function appendNote(file: string, text: string) {
  const line = `- ${new Date().toISOString().slice(0, 10)}: ${text}\n`;
  appendFileSync(file, line, "utf8");
}
```

- [ ] **Step 4: run, expect PASS**

- [ ] **Step 5: wire route** — `POST /api/obsidian/note` reads `{ text }`, appends to `process.env.OBSIDIAN_NOTE_PATH` (a markdown file in the user's vault); 500 if unset.

- [ ] **Step 6: Commit**

```bash
git add server && git commit -m "feat: obsidian note bridge"
```

---

## Milestone M5 — Error handling, polish, docs

### Task 5.1: Hardening

**Files:**
- Modify: `server/src/ws/TerminalSocket.ts` (spawn failure → `terminal:error`, no crash)
- Modify: `web/src/terminal/useTerminal.ts` (WS auto-reconnect + buffer, error banner)
- Create: `README.md` (setup, run, env vars, architecture)

- [ ] **Step 1: spawn failure** — wrap `manager.spawn` in try/catch; on error send `{ type:"terminal:error", nodeId, message }`.

- [ ] **Step 2: reconnect** — in `useTerminal`, on WS `close`, retry with backoff (500ms, 1s, 2s, cap 5s); render "reconnecting…" overlay.

- [ ] **Step 3: README** — how to install, run (`npm install`, `npm run dev`), env vars (`INTERPRICE_PORT`, `INTERPRICE_DATA_DIR`, `OBSIDIAN_NOTE_PATH`), and architecture diagram.

- [ ] **Step 4: full smoke** — create 2 terminals + role + note + edge + drawing, save, reload, open, handoff, obsidian note.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: error handling, reconnect, README"
```

---

## Verification (whole-app)

- [ ] `npm test -w server` → all tests green.
- [ ] `npm run build` → both server and web compile.
- [ ] Manual: M0–M5 smoke passes on a fresh clone.
