import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

export const repoRoot = resolve(here, "../../..");
export const dataDir = resolve(repoRoot, "data");
export const privateDir = resolve(dataDir, "private");

/** Public graph: rebuilt from data/*.json, safe to share. */
export const publicDbPath = resolve(dataDir, "public.db");
/** Private targeting layer: rebuilt from data/private/*.json, never shared. */
export const privateDbPath = resolve(privateDir, "private.db");
