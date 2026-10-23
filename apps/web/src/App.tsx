import { useEffect, useMemo, useState } from "react";
import type { NeighborhoodResult, Organization, Vertical } from "@pel/core";
import { api, isStaticDemo, type Target } from "./api";
import { GraphView } from "./GraphView";

const DEFAULT_ROOT = "warren-equity-partners";

export function App() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [verticals, setVerticals] = useState<Vertical[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);

  const [root, setRoot] = useState(DEFAULT_ROOT);
  const [depth, setDepth] = useState(2);
  const [selectedVerticals, setSelectedVerticals] = useState<string[]>([]);
  const [history, setHistory] = useState(false);
  const [data, setData] = useState<NeighborhoodResult | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.orgs(), api.verticals(), api.targets()])
      .then(([o, v, t]) => {
        setOrgs(o);
        setVerticals(v);
        setTargets(t);
      })
      .catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    api
      .neighborhood({ root, depth, verticals: selectedVerticals, history })
      .then(setData)
      .catch((e) => setError(String(e)));
  }, [root, depth, selectedVerticals, history]);

  const targetIds = useMemo(() => new Set(targets.map((t) => t.orgId)), [targets]);
  const byId = useMemo(() => new Map(orgs.map((o) => [o.id, o])), [orgs]);
  const selectedOrg = selected ? byId.get(selected) : undefined;
  const selectedTarget = targets.find((t) => t.orgId === selected);
  const reach = data ? Math.max(0, ...Object.values(data.distance)) : 0;
  const nameOf = (id: string) => byId.get(id)?.name ?? id;
  const selectedLinks = selected && data ? data.relationships.filter((r) => r.from === selected || r.to === selected) : [];

  const toggleVertical = (id: string) =>
    setSelectedVerticals((cur) => (cur.includes(id) ? cur.filter((v) => v !== id) : [...cur, id]));

  return (
    <div className="app">
      <header className="toolbar">
        <div className="brand">
          <h1>PE Landscape</h1>
          {isStaticDemo && <span className="demo-badge">Demo · public sources, partial</span>}
        </div>
        <label className="field">
          <span>Center on</span>
          <select id="center-on" value={root} onChange={(e) => setRoot(e.target.value)}>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>
            Degrees: {depth}
            {data && reach < depth && <em className="reach"> · nothing beyond {reach}</em>}
          </span>
          <input id="depth" type="range" min={1} max={3} value={depth} onChange={(e) => setDepth(Number(e.target.value))} />
        </label>
        <label className="toggle">
          <input id="history" type="checkbox" checked={history} onChange={(e) => setHistory(e.target.checked)} />
          <span>Show past ownership</span>
        </label>
      </header>

      <nav className="chips" aria-label="Filter by vertical">
        {verticals.map((v) => (
          <button
            key={v.id}
            className={selectedVerticals.includes(v.id) ? "chip on" : "chip"}
            onClick={() => toggleVertical(v.id)}
          >
            {v.name}
          </button>
        ))}
      </nav>

      {error && <p className="error">Couldn't reach the API: {error}</p>}

      <main className="stage">
        <GraphView
          data={data}
          root={root}
          targetIds={targetIds}
          onSelect={setSelected}
          onExpand={(id) => {
            setRoot(id);
            setSelected(id);
          }}
        />
        {data && data.organizations.length <= 1 && (
          <p className="empty">No connections match these filters yet.</p>
        )}
      </main>

      {selectedOrg && (
        <aside className="detail">
          <div className="detail-head">
            <strong>{selectedOrg.name}</strong>
            <button className="link" onClick={() => setSelected(null)} aria-label="Close">
              ✕
            </button>
          </div>
          <p className="muted">
            {selectedOrg.kind} · {data?.distance[selectedOrg.id] ?? "–"} degree(s) from center
          </p>
          {selectedOrg.verticals?.length ? <p>{selectedOrg.verticals.join(", ")}</p> : null}
          {selectedTarget && (
            <p className="target-note">
              Target · priority {selectedTarget.priority ?? "–"} · {selectedTarget.status}
              {selectedTarget.notes ? ` — ${selectedTarget.notes}` : ""}
            </p>
          )}
          {selectedLinks.length > 0 && (
            <ul className="links">
              {selectedLinks.map((r) => (
                <li key={r.id}>
                  <span>
                    {nameOf(r.from)} <span className="muted">{r.type.replace("_", " ")}</span> {nameOf(r.to)}
                    {(r.startDate || r.endDate) && (
                      <span className="muted"> · {r.startDate ?? "?"}{r.endDate ? `–${r.endDate}` : ""}</span>
                    )}
                  </span>
                  {r.sourceUrl && (
                    <a href={r.sourceUrl} target="_blank" rel="noreferrer">
                      Source
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
          <button className="primary" onClick={() => setRoot(selectedOrg.id)}>
            Center graph here
          </button>
        </aside>
      )}

      <footer className="legend">
        <span><i className="sw sponsor" /> Sponsor</span>
        <span><i className="sw company" /> Company</span>
        {!isStaticDemo && <span><i className="sw target" /> Your target</span>}
        <span className="muted">Double-tap a node to re-center</span>
      </footer>
    </div>
  );
}
