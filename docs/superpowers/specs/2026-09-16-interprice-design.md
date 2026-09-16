# Interprice — Canvas de Orquestração de Agentes (Spec)

Data: 2026-09-16
Status: aprovado (design)

## 1. Objetivo

Ferramenta **interna** para orquestrar agentes OpenCode num canvas visual. O usuário
(thyagodias) posiciona terminais vivos num canvas infinito, conecta agentes entre si,
define papéis (roles), e salva/carrega o setup inteiro (partitura). Integra com o
ecossistema "Fábrica de Gênios" (Obsidian como cérebro).

Inspiração: [Maestri](https://www.themaestri.app/en) — mas com escopo reduzido a uma
ferramenta pessoal, não um produto comercial.

## 2. Escopo

### Na v1 (obrigatório)
- Canvas infinito: pan/zoom/drag, arrastar nós espacialmente.
- Terminais rodando agentes OpenCode reais (sessão persistente + modo one-shot).
- Conectar agentes (handoff estruturado prompt→prompt).
- Roles reutilizáveis (instruções por agente).
- Sticky notes (agentes escrevem notas).
- Salvar/carregar setup (partitura) em JSON.
- Desenhar/diagramar no canvas (overlay leve).

### Fora da v1 (YAGNI)
- Portais (browser/emulador embutidos), Floors (clone APFS), Ombro (assistente on-device).
- Multi-agente além de OpenCode (Gemini CLI, shell, Antigravity ficam p/ depois).
- Conta/login, telemetria, multi-usuário, deploy remoto.

## 3. Decisões de arquitetura

| Tema | Decisão |
|------|---------|
| Plataforma | Web app local: React + xterm.js no browser; backend Node.js + node-pty |
| Motor do canvas | @xyflow/react (React Flow) + overlay SVG de desenho livre |
| Conexão entre agentes | Handoff estruturado (prompt→prompt), não PTY→PTY |
| Agente | OpenCode (v1) |
| Sessão do agente | Misto: persistente (default) + one-shot opcional |
| Gatilho do handoff | Misto: manual (default) + auto por conexão |
| Persistência | JSON local (~/.interprice/partituras) + espelho em nota Obsidian |
| Runtime | Node.js (v22 LTS recomendado; v26.7 presente no ambiente). Bun como fallback. |

## 4. Arquitetura

```
Browser (React 18 + TS + Vite)
  ├─ Canvas  → @xyflow/react (nós/arestas/pan/zoom/drag)
  ├─ Nós     → terminal (xterm.js), note, role, drawing
  ├─ Overlay → desenho livre SVG (polylines/setas, persistidas no JSON)
  └─ WS client (terminal I/O) + REST (setup CRUD)

Backend (Node.js, Fastify + ws + node-pty)
  ├─ PTY Manager   → spawna `opencode` por nó (persistente ou one-shot)
  ├─ Handoff Engine→ prompt→prompt estruturado (manual + auto)
  ├─ Partitura Store→ JSON files (load/save canvas)
  └─ Obsidian Bridge→ espelha progresso/decisões em nota do vault

Disco
  ├─ ~/.interprice/partituras/*.json
  └─ vault Obsidian (nota de progresso)
```

## 5. Data model (partitura JSON)

```json
{
  "version": 1,
  "name": "setup-1",
  "viewport": { "x": 0, "y": 0, "zoom": 1 },
  "nodes": [
    { "id": "n1", "type": "terminal", "position": { "x": 0, "y": 0 },
      "data": { "label": "Coder", "roleId": "r1", "cwd": "/proj",
                "mode": "persistent" } },
    { "id": "n2", "type": "note", "position": { "x": 300, "y": 0 },
      "data": { "text": "..." } },
    { "id": "n3", "type": "drawing", "data": { "paths": [] } }
  ],
  "edges": [
    { "id": "e1", "source": "n1", "target": "n2",
      "trigger": "manual", "label": "revisar" }
  ],
  "roles": [ { "id": "r1", "name": "Coder", "instructions": "..." } ]
}
```

Tipos de nó: `terminal`, `note`, `role`, `drawing`.

## 6. Fluxos-chave

### Terminal I/O
xterm.js ↔ WebSocket ↔ node-pty ↔ processo `opencode` vivo. Keystrokes descem, output
sobe. Sessão persistente = TUI do opencode aberto (usuário digita follow-ups). One-shot
= `opencode run "<prompt>"` e captura output.

### Handoff (manual)
Usuário clica na conexão A→B → backend lê último output de A → grava prompt formatado no
PTY de B (persistente) ou roda `opencode run` (one-shot B).

### Handoff (auto)
Conexão marcada `auto` → dispara por heurística de "A terminou" (idle N segundos ou clique
de "done"). Best-effort na v1; sem detecção perfeita de término em TUI.

### Role
Instruções injetadas no spawn do opencode (flags `--instructions`/`--model` ou AGENTS.md
no cwd do nó). *Flags exatas → verificar com @librarian na implementação.*

### Partitura
Salvar lê estado do React Flow + overlay → JSON. Carregar reconstrói nós/conexões e
respawna terminais.

### Obsidian
Sticky note atualizada ou tarefa concluída → append na nota do vault via
`~/.local/bin/obsidian.sh` (ou escrita direta no arquivo markdown).

## 7. Tratamento de erro

- `opencode` não instalado → nó mostra erro inline, não crasha o app.
- node-pty falha build → instrução de `npm rebuild` + flag no M0 (Node 26 pode não ter
  prebuild; build via node-gyp/CLT arm64).
- WS desconecta → reconexão automática + buffer.
- JSON de partitura inválido → não carrega, reporta linha do erro.
- Spawn falha / role faltando → toast + nó marcado inativo.

## 8. Ordem de build (milestones)

| M | Entrega |
|---|---------|
| M0 | Skeleton: Vite+React + backend + WS + node-pty spawna shell, xterm renderiza |
| M1 | Canvas React Flow (drag/pan/zoom) + nó terminal = opencode vivo |
| M2 | Roles + sticky notes |
| M3 | Conexões + Handoff Engine (manual + auto) |
| M4 | Overlay de desenho + partitura save/load + Obsidian bridge |
| M5 | Erros, polish, docs |

## 9. Pendências de verificação (não bloqueiam spec)

- Flags exatas do opencode para role (M1/M2).
- Prebuild do node-pty no Node 26 (M0).

## 10. Fora de escopo / não-objetivos

- Não é produto comercial; sem multi-usuário, auth, billing, telemetria.
- Não replica portais/floors/Ombro do Maestri.
- Não migra dados do GeniusFlow nem de outros projetos existentes.
