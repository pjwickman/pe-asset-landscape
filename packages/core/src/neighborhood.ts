import type {
  Graph,
  NeighborhoodQuery,
  NeighborhoodResult,
  Organization,
  Relationship,
} from "./types.js";

function isActive(rel: Relationship, q: NeighborhoodQuery): boolean {
  if (rel.status !== "approved") return false;
  if (q.asOf) {
    if (rel.startDate && rel.startDate > q.asOf) return false;
    if (rel.endDate && rel.endDate <= q.asOf) return false;
    return true;
  }
  return q.includeEnded ? true : !rel.endDate;
}

/**
 * Vertical filter: sponsors, funds and strategics always pass (they are the
 * connective tissue); companies pass if they carry any requested vertical.
 */
function passesVertical(org: Organization, verticals?: string[]): boolean {
  if (!verticals || verticals.length === 0) return true;
  if (org.kind !== "company") return true;
  return (org.verticals ?? []).some((v) => verticals.includes(v));
}

/**
 * Breadth-first walk out from `root`, treating edges as undirected for
 * reachability (an add-on is "near" its sponsor even though the edges point
 * sponsor -> platform -> add-on). Returns the induced subgraph.
 */
export function neighborhood(graph: Graph, q: NeighborhoodQuery): NeighborhoodResult {
  const orgs = new Map(graph.organizations.map((o) => [o.id, o]));
  const rootOrg = orgs.get(q.root);
  if (!rootOrg) return { organizations: [], relationships: [], distance: {} };

  const active = graph.relationships.filter((r) => isActive(r, q));
  const adjacency = new Map<string, Relationship[]>();
  for (const r of active) {
    for (const end of [r.from, r.to]) {
      const list = adjacency.get(end) ?? [];
      list.push(r);
      adjacency.set(end, list);
    }
  }

  const distance: Record<string, number> = { [q.root]: 0 };
  let frontier = [q.root];
  for (let hop = 1; hop <= q.depth && frontier.length > 0; hop++) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const r of adjacency.get(id) ?? []) {
        const other = r.from === id ? r.to : r.from;
        if (other in distance) continue;
        const org = orgs.get(other);
        if (!org || !passesVertical(org, q.verticals)) continue;
        distance[other] = hop;
        next.push(other);
      }
    }
    frontier = next;
  }

  const ids = new Set(Object.keys(distance));
  return {
    organizations: graph.organizations.filter((o) => ids.has(o.id)),
    relationships: active.filter((r) => ids.has(r.from) && ids.has(r.to)),
    distance,
  };
}
