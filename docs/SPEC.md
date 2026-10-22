# PE Landscape — Product Spec (v0.1)

## Problem

Ownership in lower-middle-market software (GIS, AEC, field services, utilities,
telecom and adjacent markets) is opaque and changes constantly. Sponsors buy
platforms, bolt on add-ons, merge product lines and exit every 3–7 years. The
information is public but scattered across press releases, portfolio pages and
filings, and it lives in spreadsheets with indented columns that hide the shape
of the market.

## What it is

An interactive graph of **organizations** (sponsors, funds, operating companies
and strategic acquirers) and the **relationships** between them (ownership,
add-on acquisitions, mergers, exits), filterable by vertical and explorable by
degrees of separation, like 1st/2nd/3rd-degree connections on LinkedIn, applied
to the PE universe.

## Who it's for

1. **Me, first:** understanding who owns what, finding targets, and preparing for
   conversations with sponsors and their portfolio companies.
2. **Later, a marketing tool:** a shareable public view (e.g. one sponsor's
   universe in my markets) to hand someone after a conversation.

## Principles

- **Organizations only, never people.** No partners, executives or board members.
  It keeps the public graph free of personal data.
- **Public sources only.** Every edge should carry a `sourceUrl`. No licensed
  databases (PitchBook, etc.) whose terms forbid reuse.
- **Public/private split.** The ownership graph is shareable. My targeting layer
  (priorities, status, notes) is stored separately and never committed or published.
- **Human in the loop.** Automated ingestion proposes edges; I approve them.
- **Any vertical.** The taxonomy is data, not code. I seed my markets; anyone can
  define theirs.
- **Web first, mobile ready.** Responsive PWA now. All graph logic lives in
  `@pel/core` behind an API, so a native wrapper (Capacitor) or a native client
  can reuse it later.

## Data model

| Entity | Key fields |
|---|---|
| Organization | id, name, kind (`sponsor` / `fund` / `company` / `strategic`), aliases, website, HQ country, verticals |
| Relationship | from, to, type (`owns`, `minority_investment`, `acquired`, `merged_into`, `sold_to`, `fund_of`), start/end date, sourceUrl, status (`approved` / `proposed` / `rejected`) |
| Vertical | id, name, optional parent (simple taxonomy tree) |
| Target *(private)* | orgId, priority, status, notes |

Degrees of separation are hop counts over approved relationships, treated as
undirected for reachability:

- **1st:** a sponsor's current portfolio companies
- **2nd:** their add-ons, plus co-investors on the same companies
- **3rd:** prior owners, exit buyers, and those buyers' other holdings

Time is first class: ended relationships keep their dates, so the graph can show
current ownership, full history, or an as-of-date snapshot.

## Architecture

```
data/*.json  ──seed──▶  public.db (SQLite)  ─┐
data/private/*.json ─▶  private.db          ─┼─▶  API (Fastify)  ─▶  Web (React + Cytoscape.js, PWA)
                                             │        uses
                                     @pel/core (types + graph queries, shared)
```

- JSON in `data/` is the source of truth: diffable and reviewable in git.
- SQLite is a rebuildable cache, moving to Postgres if the dataset grows.
- `PUBLIC_ONLY=1` runs the API without the private layer, for demos and sharing.

## Phases

**Phase 0 — Skeleton (done).** Monorepo, data model, seed data, neighborhood
query with tests, API, web graph with degree slider, vertical filter, history
toggle and target highlighting.

**Phase 1 — Useful to me.**
- Grow the seed to 50–100 organizations in my markets, each edge with a source
- Add / edit organizations and relationships from the UI (writes back to JSON)
- Search box with alias matching; tap-to-expand instead of full redraw
- Private target management in the UI
- Offline snapshot via service worker (works at a conference with bad Wi-Fi)

**Phase 2 — Ingestion.**
- Press-release ingester: fetch wire stories and sponsor portfolio pages,
  extract candidate deals, resolve entities against names and aliases, and queue
  `proposed` edges for approval
- GLEIF LEI parent/child records as a second structured source
- Optional LLM-assisted vertical tagging (API key in `.env` only)

**Phase 3 — Share.**
- Public read-only deployment
- Share links that open a saved view (root, depth, verticals)
- Timeline scrubber for as-of-date snapshots
- Native app wrapper if the PWA isn't enough

## Out of scope

People and contact data, licensed data sources, deal valuations or financials,
and anything client-confidential.

## Success measures

- I can answer "who owns what within two hops of sponsor X in my verticals" in
  under 30 seconds, on my phone.
- Every approved edge has a public source.
- A shareable view I'm comfortable handing to a sponsor.
