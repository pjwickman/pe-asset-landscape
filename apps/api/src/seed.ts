/**
 * Rebuilds the SQLite databases from the JSON files in data/.
 * JSON is the source of truth (reviewable in git); SQLite is a disposable cache.
 */
import { existsSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import Database from "better-sqlite3";
import type { Organization, Relationship, Vertical } from "@pel/core";
import { PRIVATE_SCHEMA, openPublic } from "./db.js";
import { dataDir, privateDbPath, privateDir, publicDbPath } from "./paths.js";

const readJson = <T>(file: string): T => JSON.parse(readFileSync(file, "utf8")) as T;

function seedPublic() {
  rmSync(publicDbPath, { force: true });
  const db = openPublic();
  const verticals = readJson<Vertical[]>(resolve(dataDir, "verticals.json"));
  const orgs = readJson<Organization[]>(resolve(dataDir, "organizations.json"));
  const rels = readJson<Relationship[]>(resolve(dataDir, "relationships.json"));

  const tx = db.transaction(() => {
    const vStmt = db.prepare("INSERT INTO verticals (id, name, parent) VALUES (?, ?, ?)");
    // parents first so the foreign key holds
    for (const v of [...verticals].sort((a, b) => Number(!!a.parent) - Number(!!b.parent))) {
      vStmt.run(v.id, v.name, v.parent ?? null);
    }
    const oStmt = db.prepare(
      "INSERT INTO organizations (id, name, kind, website, hq_country) VALUES (?, ?, ?, ?, ?)",
    );
    const aStmt = db.prepare("INSERT INTO org_aliases (org_id, alias) VALUES (?, ?)");
    const ovStmt = db.prepare("INSERT INTO org_verticals (org_id, vertical_id) VALUES (?, ?)");
    for (const o of orgs) {
      oStmt.run(o.id, o.name, o.kind, o.website ?? null, o.hqCountry ?? null);
      for (const a of o.aliases ?? []) aStmt.run(o.id, a);
      for (const v of o.verticals ?? []) ovStmt.run(o.id, v);
    }
    const rStmt = db.prepare(
      `INSERT INTO relationships (id, from_org, to_org, type, start_date, end_date, source_url, status, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const r of rels) {
      rStmt.run(
        r.id, r.from, r.to, r.type, r.startDate ?? null, r.endDate ?? null,
        r.sourceUrl ?? null, r.status, r.note ?? null,
      );
    }
  });
  tx();
  db.close();
  console.log(`public.db: ${verticals.length} verticals, ${orgs.length} orgs, ${rels.length} relationships`);
}

function seedPrivate() {
  const file = resolve(privateDir, "targets.json");
  if (!existsSync(file)) {
    console.log("private layer: no data/private/targets.json, skipping");
    return;
  }
  rmSync(privateDbPath, { force: true });
  const db = new Database(privateDbPath);
  db.exec(PRIVATE_SCHEMA);
  const targets = readJson<{ orgId: string; priority?: number; status?: string; notes?: string }[]>(file);
  const stmt = db.prepare("INSERT INTO targets (org_id, priority, status, notes) VALUES (?, ?, ?, ?)");
  db.transaction(() => {
    for (const t of targets) stmt.run(t.orgId, t.priority ?? null, t.status ?? "researching", t.notes ?? null);
  })();
  db.close();
  console.log(`private.db: ${targets.length} targets`);
}

seedPublic();
seedPrivate();
