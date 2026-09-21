# interprice

Canvas de orquestração de agentes [OpenCode](https://opencode.ai) no navegador. Monte um canvas infinito com terminais OpenCode ao vivo, handoff entre agentes, roles reutilizáveis, sticky notes, desenho livre e partituras JSON (com espelhamento opcional para uma nota do Obsidian).

## Features

- **Canvas infinito** (React Flow): pan, zoom, drag de nós, minimap.
- **Terminais OpenCode ao vivo**: cada nó `terminal` roda um processo `opencode` (persistente ou one-shot) via `node-pty`, renderizado com xterm.js.
- **Handoff entre agentes**: conecte nós com arestas; handoff manual (clique na aresta) ou automático (heurística de idle de 8s) envia o último output de um nó como prompt para o outro.
- **Roles reutilizáveis**: registre papéis com instruções e injete-os como prompt inicial (`--prompt`) ao spawnar um agente.
- **Sticky notes** e **desenho livre** (SVG freehand) persistidos no canvas.
- **Partituras JSON**: salve/abre o estado do canvas (nós, arestas, roles, viewport) em `~/.interprice/partituras/*.json`, validado com zod.
- **Obsidian bridge**: append de decisões/progresso em uma nota do vault via `POST /api/obsidian/note`.

## Requisitos

- **Node.js 22+** (testado em Node 26).
- **OpenCode CLI** instalado e no `PATH` (`opencode --version`).
- macOS/Linux (o backend usa `node-pty`).

## Setup

```bash
npm install
npm run dev
```

- Backend (Fastify + WebSocket + node-pty): `http://localhost:4310`
- Frontend (Vite + React): `http://localhost:5173` (proxy de `/api` e `/ws` para o backend)

### Scripts

| comando | descrição |
|---------|-----------|
| `npm run dev` | sobe backend + frontend (concurrently) |
| `npm run build` | build do server (`tsc`) e do web (`vite build`) |
| `npm test` | roda a suíte Vitest do server |

## Variáveis de ambiente

| variável | padrão | descrição |
|----------|--------|-----------|
| `INTERPRICE_PORT` | `4310` | porta do backend |
| `INTERPRICE_DATA_DIR` | `~/.interprice` | diretório de dados |
| `OBSIDIAN_NOTE_PATH` | *(não definido)* | caminho da nota `.md` do vault para o Obsidian bridge (`POST /api/obsidian/note` retorna 500 se não definido) |

## Arquitetura

```
┌─────────────────────────────┐        WS (terminal I/O + handoff)         ┌──────────────────────────────┐
│            web              │ ──────────────────────────────────────────▶ │            server             │
│  React + Vite + React Flow  │                                            │  Fastify + @fastify/websocket │
│  xterm.js  ─┐               │ ◀────────────────────────────────────────── │  node-pty ─▶ opencode (PTY)  │
│  zustand    │               │        REST (partituras CRUD + obsidian)    │  HandoffEngine (idle)        │
│  DrawingOverlay (SVG)       │ ──────────────────────────────────────────▶ │  RoleRegistry                │
└─────────────────────────────┘                                            │  PartituraStore (zod)        │
                                                                           │  ObsidianBridge (append)     │
                                                                           └──────────────────────────────┘
                                                                                          │
                                                                                          ▼
                                                                           ~/.interprice/partituras/*.json
                                                                           OBSIDIAN_NOTE_PATH (vault .md)
```

### Fluxo de um terminal

1. O web abre um WebSocket único compartilhado para `/ws`.
2. Ao montar um nó `terminal`, envia `{ type: "terminal:spawn", nodeId, cwd, mode, roleId, model, cols, rows }`.
3. O server resolve a role (`RoleRegistry`) e monta o comando via `buildCommand` (`opencode <cwd> [--prompt <instructions>] [--model <model>]`).
4. `node-pty` spawna o processo; output flui de volta como `{ type: "terminal:output", nodeId, data }`.
5. Handoff (`manual` ou `auto` por idle) escreve `[Handoff de <source>]` no PTY do nó alvo.

### Protocolo WebSocket (resumo)

Client → server: `terminal:spawn`, `terminal:input`, `terminal:resize`, `terminal:kill`, `handoff`, `roles:set`, `edges:set`.

Server → client: `terminal:output`, `terminal:exit`, `terminal:error`.
