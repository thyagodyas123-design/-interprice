import { appendFileSync } from "node:fs";

export function appendNote(file: string, text: string) {
  const line = `- ${new Date().toISOString().slice(0, 10)}: ${text}\n`;
  appendFileSync(file, line, "utf8");
}
