import { sendSocket } from "../ws/socket";

export function EdgeHandoff({ sourceId, targetId }: { sourceId: string; targetId: string }) {
  return (
    <button
      onClick={() => sendSocket({ type: "handoff", sourceId, targetId, trigger: "manual" })}
      style={{ position: "fixed", bottom: 16, right: 16, zIndex: 10 }}
    >
      send handoff
    </button>
  );
}
