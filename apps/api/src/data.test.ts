import { describe, expect, it } from "vitest";
import { neighborhood, type Graph } from "@pel/core";
import organizations from "../../../data/organizations.json";
import relationships from "../../../data/relationships.json";
import verticals from "../../../data/verticals.json";

const graph = { organizations, relationships } as Graph;

describe("seed data", () => {
  it("has no edges pointing at unknown organizations", () => {
    const ids = new Set(organizations.map((o) => o.id));
    const dangling = relationships.filter((r) => !ids.has(r.from) || !ids.has(r.to));
    expect(dangling.map((r) => r.id)).toEqual([]);
  });

  it("only tags organizations with known verticals", () => {
    const known = new Set(verticals.map((v) => v.id));
    const unknown = organizations.flatMap((o) => (o.verticals ?? []).filter((v) => !known.has(v)));
    expect(unknown).toEqual([]);
  });

  it("cites a source on every approved edge", () => {
    const missing = relationships.filter((r) => r.status === "approved" && !r.sourceUrl);
    expect(missing.map((r) => r.id)).toEqual([]);
  });

  it("reveals more of the graph as degrees increase", () => {
    const size = (depth: number) =>
      Object.keys(neighborhood(graph, { root: "warren-equity-partners", depth }).distance).length;
    expect(size(2)).toBeGreaterThan(size(1));
  });
});
