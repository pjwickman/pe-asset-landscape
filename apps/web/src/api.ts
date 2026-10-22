import type { NeighborhoodResult, Organization, Vertical } from "@pel/core";

export interface Target {
  orgId: string;
  priority: number | null;
  status: string;
  notes: string | null;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.json() as Promise<T>;
}

export const api = {
  verticals: () => get<Vertical[]>("/api/verticals"),
  orgs: (q = "") => get<Organization[]>(`/api/orgs?q=${encodeURIComponent(q)}`),
  neighborhood: (p: { root: string; depth: number; verticals: string[]; history: boolean }) => {
    const qs = new URLSearchParams({ root: p.root, depth: String(p.depth) });
    if (p.verticals.length) qs.set("verticals", p.verticals.join(","));
    if (p.history) qs.set("history", "1");
    return get<NeighborhoodResult>(`/api/graph/neighborhood?${qs}`);
  },
  /** Resolves to [] when the private layer is off (public/demo mode). */
  targets: () => get<Target[]>("/api/private/targets").catch(() => [] as Target[]),
};
