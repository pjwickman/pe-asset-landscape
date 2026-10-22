import Database from "better-sqlite3";
import { existsSync } from "node:fs";
import type { Graph, Organization, Relationship, Vertical } from "@pel/core";
import { privateDbPath, publicDbPath } from "./paths.js";

export const PUBLIC_SCHEMA = `
CREATE TABLE IF NOT EXISTS verticals (
  id     TEXT PRIMARY KEY,
  name   TEXT NOT NULL,
  parent TEXT REFERENCES verticals(id)
);

CREATE TABLE IF NOT EXISTS organizations (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  kind       TEXT NOT NULL CHECK (kind IN ('sponsor','fund','company','strategic')),
  website    TEXT,
  hq_country TEXT
);

CREATE TABLE IF NOT EXISTS org_aliases (
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  alias  TEXT NOT NULL,
  PRIMARY KEY (org_id, alias)
);

CREATE TABLE IF NOT EXISTS org_verticals (
  org_id      TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  vertical_id TEXT NOT NULL REFERENCES verticals(id),
  PRIMARY KEY (org_id, vertical_id)
);

CREATE TABLE IF NOT EXISTS relationships (
  id         TEXT PRIMARY KEY,
  from_org   TEXT NOT NULL REFERENCES organizations(id),
  to_org     TEXT NOT NULL REFERENCES organizations(id),
  type       TEXT NOT NULL,
  start_date TEXT,
  end_date   TEXT,
  source_url TEXT,
  status     TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('approved','proposed','rejected')),
  note       TEXT
);
CREATE INDEX IF NOT EXISTS idx_rel_from ON relationships(from_org);
CREATE INDEX IF NOT EXISTS idx_rel_to   ON relationships(to_org);
`;

export const PRIVATE_SCHEMA = `
CREATE TABLE IF NOT EXISTS targets (
  org_id   TEXT PRIMARY KEY,
  priority INTEGER,
  status   TEXT NOT NULL DEFAULT 'researching',
  notes    TEXT
);
`;

export function openPublic(): Database.Database {
  const db = new Database(publicDbPath);
  db.pragma("foreign_keys = ON");
  db.exec(PUBLIC_SCHEMA);
  return db;
}

/** Returns null when no private layer exists (e.g. a public/demo deployment). */
export function openPrivate(): Database.Database | null {
  if (!existsSync(privateDbPath)) return null;
  const db = new Database(privateDbPath);
  db.exec(PRIVATE_SCHEMA);
  return db;
}

export function loadVerticals(db: Database.Database): Vertical[] {
  return db
    .prepare("SELECT id, name, parent FROM verticals ORDER BY name")
    .all()
    .map((r: any) => ({ id: r.id, name: r.name, ...(r.parent ? { parent: r.parent } : {}) }));
}

export function loadGraph(db: Database.Database): Graph {
  const aliases = new Map<string, string[]>();
  for (const r of db.prepare("SELECT org_id, alias FROM org_aliases").all() as any[]) {
    aliases.set(r.org_id, [...(aliases.get(r.org_id) ?? []), r.alias]);
  }
  const verticals = new Map<string, string[]>();
  for (const r of db.prepare("SELECT org_id, vertical_id FROM org_verticals").all() as any[]) {
    verticals.set(r.org_id, [...(verticals.get(r.org_id) ?? []), r.vertical_id]);
  }

  const organizations: Organization[] = (
    db.prepare("SELECT id, name, kind, website, hq_country FROM organizations").all() as any[]
  ).map((r) => ({
    id: r.id,
    name: r.name,
    kind: r.kind,
    ...(r.website ? { website: r.website } : {}),
    ...(r.hq_country ? { hqCountry: r.hq_country } : {}),
    aliases: aliases.get(r.id) ?? [],
    verticals: verticals.get(r.id) ?? [],
  }));

  const relationships: Relationship[] = (
    db.prepare("SELECT * FROM relationships").all() as any[]
  ).map((r) => ({
    id: r.id,
    from: r.from_org,
    to: r.to_org,
    type: r.type,
    status: r.status,
    ...(r.start_date ? { startDate: r.start_date } : {}),
    ...(r.end_date ? { endDate: r.end_date } : {}),
    ...(r.source_url ? { sourceUrl: r.source_url } : {}),
    ...(r.note ? { note: r.note } : {}),
  }));

  return { organizations, relationships };
}
