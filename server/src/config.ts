import os from "node:os";
import path from "node:path";

export const PORT = Number(process.env.INTERPRICE_PORT ?? 4310);
export const DATA_DIR =
  process.env.INTERPRICE_DATA_DIR ?? path.join(os.homedir(), ".interprice");
export const PARTITURA_DIR = path.join(DATA_DIR, "partituras");
