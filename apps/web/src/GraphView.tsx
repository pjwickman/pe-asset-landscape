import { useEffect, useRef } from "react";
import cytoscape, { type Core } from "cytoscape";
import type { NeighborhoodResult } from "@pel/core";

interface Props {
  data: NeighborhoodResult | null;
  root: string;
  targetIds: Set<string>;
  onSelect: (orgId: string) => void;
  onExpand: (orgId: string) => void;
}

function readToken(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * Concentric layout: the root sits in the middle and each ring is one degree
 * of separation, like 1st/2nd/3rd-degree connections.
 * Tap selects a node; double-tap re-centers the graph on it.
 */
export function GraphView({ data, root, targetIds, onSelect, onExpand }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const cy = useRef<Core | null>(null);

  useEffect(() => {
    if (!el.current || !data) return;
    const maxDist = Math.max(0, ...Object.values(data.distance));

    cy.current?.destroy();
    cy.current = cytoscape({
      container: el.current,
      elements: [
        ...data.organizations.map((o) => ({
          data: {
            id: o.id,
            label: o.name,
            kind: o.kind,
            dist: data.distance[o.id] ?? 0,
            target: targetIds.has(o.id) ? 1 : 0,
            root: o.id === root ? 1 : 0,
          },
        })),
        ...data.relationships.map((r) => ({
          data: { id: r.id, source: r.from, target: r.to, type: r.type, ended: r.endDate ? 1 : 0 },
        })),
      ],
      style: [
        {
          selector: "node",
          style: {
            label: "data(label)",
            color: readToken("--text"),
            "font-size": 11,
            "text-valign": "bottom",
            "text-margin-y": 6,
            "text-wrap": "wrap",
            "text-max-width": "110px",
            width: 22,
            height: 22,
            "background-color": readToken("--node-company"),
            "border-width": 0,
          },
        },
        { selector: "node[kind = 'sponsor'], node[kind = 'fund']", style: { shape: "round-rectangle", "background-color": readToken("--node-sponsor"), width: 30, height: 30 } },
        { selector: "node[kind = 'strategic']", style: { shape: "diamond", "background-color": readToken("--node-strategic") } },
        { selector: "node[target = 1]", style: { "border-width": 3, "border-color": readToken("--target") } },
        { selector: "node[root = 1]", style: { width: 40, height: 40, "font-weight": "bold" } },
        { selector: "node:selected", style: { "overlay-color": readToken("--accent"), "overlay-opacity": 0.25, "overlay-padding": 6 } },
        {
          selector: "edge",
          style: {
            width: 2,
            "line-color": readToken("--edge"),
            "target-arrow-color": readToken("--edge"),
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            "arrow-scale": 0.8,
          },
        },
        { selector: "edge[type = 'acquired'], edge[type = 'merged_into']", style: { "line-style": "solid", "line-color": readToken("--node-company") } },
        { selector: "edge[ended = 1]", style: { "line-style": "dashed", opacity: 0.55 } },
      ],
      // Radial tree from the root: each ring is one degree, and every node sits
      // next to the node that connects it to the center.
      layout: {
        name: "breadthfirst",
        roots: [root],
        circle: true,
        directed: false,
        spacingFactor: maxDist > 1 ? 1.1 : 1.4,
        avoidOverlap: true,
        animate: false,
      } as any,
      minZoom: 0.3,
      maxZoom: 3,
    });

    // Small graphs would otherwise be zoomed in to fill the screen.
    if (cy.current.zoom() > 1.1) {
      cy.current.zoom(1.1);
      cy.current.center();
    }

    cy.current.on("tap", "node", (e) => onSelect(e.target.id()));
    cy.current.on("dbltap", "node", (e) => onExpand(e.target.id()));
    return () => {
      cy.current?.destroy();
      cy.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, root, targetIds]);

  return <div ref={el} className="graph" aria-label="Relationship graph" />;
}
