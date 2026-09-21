import { mkdirSync, readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { partituraSchema, type Partitura } from "./schema.js";

export class PartituraStore {
  constructor(private dir: string) { mkdirSync(dir, { recursive: true }); }
  private file(name: string) {
    if (!/^[\w-]+$/.test(name)) throw new Error("invalid partitura name");
    return path.join(this.dir, `${name}.json`);
  }

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
