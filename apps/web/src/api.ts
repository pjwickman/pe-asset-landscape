import { neighborhood, type Graph, type NeighborhoodResult, type Organization, type Vertical } from "@pel/core";

export interface Target {
  orgId: string;
  priority: number | null;
  status: string;
  notes: string | null;
}

export interface NeighborhoodParams {
  root: string;
  depth: number;
  verticals: string[];
  history: boolean;
}

interface DataSource {
  verticals(): Promise<Vertical[]>;
  orgs(q?: string): Promise<Organization[]>;
  neighborhood(p: NeighborhoodParams): Promise<NeighborhoodResult>;
  targets(): Promise<Target[]>;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.json() as Promise<T>;
}

/** Talks to the API. Used in local development and any hosted deployment. */
const http: DataSource = {
  verticals: () => get<Vertical[]>("/api/verticals"),
  orgs: (q = "") => get<Organization[]>(`/api/orgs?q=${encodeURIComponent(q)}`),
  neighborhood: (p) => {
    const qs = new URLSearchParams({ root: p.root, depth: String(p.depth) });
    if (p.verticals.length) qs.set("verticals", p.verticals.join(","));
    if (p.history) qs.set("history", "1");
    return get<NeighborhoodResult>(`/api/graph/neighborhood?${qs}`);
  },
  /** Resolves to [] when the private layer is off (public/demo mode). */
  targets: () => get<Target[]>("/api/private/targets").catch(() => [] as Target[]),
};

/**
 * Static demo: public data is bundled into the page and queried in the browser
 * with the same @pel/core function the API uses. No private targets, ever.
 */
async function staticSource(): Promise<DataSource> {
  const [orgs, rels, verts] = await Promise.all([
    import("../../../data/organizations.json"),
    import("../../../data/relationships.json"),
    import("../../../data/verticals.json"),
  ]);
  const graph = { organizations: orgs.default, relationships: rels.default } as Graph;
  const verticals = verts.default as Vertical[];
  return {
    verticals: async () => [...verticals].sort((a, b) => a.name.localeCompare(b.name)),
    orgs: async () => [...graph.organizations].sort((a, b) => a.name.localeCompare(b.name)),
    neighborhood: async (p) =>
      neighborhood(graph, {
        root: p.root,
        depth: p.depth,
        verticals: p.verticals.length ? p.verticals : undefined,
        includeEnded: p.history,
      }),
    targets: async () => [],
  };
}

export const isStaticDemo = import.meta.env.VITE_STATIC === "1";

let source: Promise<DataSource> | null = null;
const ds = () => (source ??= isStaticDemo ? staticSource() : Promise.resolve(http));

export const api: DataSource = {
  verticals: () => ds().then((s) => s.verticals()),
  orgs: (q) => ds().then((s) => s.orgs(q)),
  neighborhood: (p) => ds().then((s) => s.neighborhood(p)),
  targets: () => ds().then((s) => s.targets()),
};
