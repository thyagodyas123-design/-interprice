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
