import { describe, expect, it } from "vitest";
import { neighborhood } from "./neighborhood.js";
import type { Graph } from "./types.js";

const graph: Graph = {
  organizations: [
    { id: "s1", name: "Sponsor One", kind: "sponsor" },
    { id: "s2", name: "Sponsor Two", kind: "sponsor" },
    { id: "p1", name: "Platform", kind: "company", verticals: ["gis"] },
    { id: "a1", name: "Add-on", kind: "company", verticals: ["gis"] },
    { id: "x1", name: "Other Co", kind: "company", verticals: ["dental"] },
  ],
  relationships: [
    { id: "r1", from: "s1", to: "p1", type: "owns", status: "approved", startDate: "2021" },
    { id: "r2", from: "p1", to: "a1", type: "acquired", status: "approved", startDate: "2023" },
    { id: "r3", from: "s2", to: "p1", type: "owns", status: "approved", startDate: "2015", endDate: "2021" },
    { id: "r4", from: "s1", to: "x1", type: "owns", status: "approved" },
    { id: "r5", from: "s2", to: "a1", type: "owns", status: "proposed" },
  ],
};

describe("neighborhood", () => {
  it("returns hop distances from the root", () => {
    const res = neighborhood(graph, { root: "s1", depth: 2 });
    expect(res.distance).toEqual({ s1: 0, p1: 1, x1: 1, a1: 2 });
  });

  it("respects depth", () => {
    const res = neighborhood(graph, { root: "s1", depth: 1 });
    expect(Object.keys(res.distance).sort()).toEqual(["p1", "s1", "x1"]);
  });

  it("filters companies by vertical but keeps sponsors", () => {
    const res = neighborhood(graph, { root: "s1", depth: 2, verticals: ["gis"] });
    expect(res.distance).not.toHaveProperty("x1");
    expect(res.distance).toHaveProperty("a1");
  });

  it("hides ended ownership unless history is requested", () => {
    expect(neighborhood(graph, { root: "p1", depth: 1 }).distance).not.toHaveProperty("s2");
    expect(
      neighborhood(graph, { root: "p1", depth: 1, includeEnded: true }).distance,
    ).toHaveProperty("s2");
  });

  it("supports as-of-date snapshots", () => {
    const res = neighborhood(graph, { root: "p1", depth: 1, asOf: "2018-06-01" });
    expect(res.distance).toHaveProperty("s2");
    expect(res.distance).not.toHaveProperty("s1");
  });

  it("never traverses proposed edges", () => {
    const res = neighborhood(graph, { root: "s2", depth: 1, includeEnded: true });
    expect(res.relationships.map((r) => r.id)).toEqual(["r3"]);
  });
});
