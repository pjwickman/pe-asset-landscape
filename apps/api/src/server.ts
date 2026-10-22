import Fastify from "fastify";
import cors from "@fastify/cors";
import { neighborhood } from "@pel/core";
import { loadGraph, loadVerticals, openPrivate, openPublic } from "./db.js";

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });

const pub = openPublic();
// Set PUBLIC_ONLY=1 for a shareable/demo deployment: the private layer is never opened.
const priv = process.env.PUBLIC_ONLY === "1" ? null : openPrivate();

app.get("/api/health", async () => ({ ok: true, privateLayer: priv !== null }));

app.get("/api/verticals", async () => loadVerticals(pub));

app.get<{ Querystring: { q?: string } }>("/api/orgs", async (req) => {
  const q = (req.query.q ?? "").trim().toLowerCase();
  const { organizations } = loadGraph(pub);
  const hits = q
    ? organizations.filter(
        (o) => o.name.toLowerCase().includes(q) || o.aliases?.some((a) => a.toLowerCase().includes(q)),
      )
    : organizations;
  return hits.sort((a, b) => a.name.localeCompare(b.name));
});

app.get<{
  Querystring: { root: string; depth?: string; verticals?: string; history?: string; asOf?: string };
}>("/api/graph/neighborhood", async (req, reply) => {
  const { root, depth, verticals, history, asOf } = req.query;
  if (!root) return reply.code(400).send({ error: "root is required" });
  return neighborhood(loadGraph(pub), {
    root,
    depth: Math.min(Math.max(Number(depth ?? 2), 1), 3),
    verticals: verticals ? verticals.split(",").filter(Boolean) : undefined,
    includeEnded: history === "1",
    asOf: asOf || undefined,
  });
});

app.get("/api/private/targets", async (_req, reply) => {
  if (!priv) return reply.code(404).send({ error: "private layer not available" });
  return priv.prepare("SELECT org_id AS orgId, priority, status, notes FROM targets").all();
});

const port = Number(process.env.API_PORT ?? 8787);
await app.listen({ port, host: "0.0.0.0" });
