# PE Landscape

An interactive graph of private equity sponsors, their portfolio companies,
add-on acquisitions and exits, filterable by vertical and explorable by degrees
of separation.

Built for lower-middle-market software (GIS, AEC, field services, utilities,
telecom), but the vertical taxonomy is data, so it works for any market.

See [`docs/SPEC.md`](docs/SPEC.md) for the product spec and roadmap.

## Quick start

Requires Node 22.13 or later (Node 24 or 26 work too). No native build tools needed.

```bash
npm install
npm run dev
```

On npm 12, install scripts are blocked unless approved. The project already
approves `esbuild` (used by Vite and tsx) and declines `fsevents` (macOS file
watching, which ships a prebuilt binary) in `package.json` under `allowScripts`,
so `npm install` should run without install-script warnings.

This seeds the databases from `data/` and starts:

- API on http://localhost:8787
- Web app on http://localhost:5173 (also reachable from your phone on the same network)

## Repo layout

```
packages/core   Shared types and graph queries (used by API and any future mobile client)
apps/api        Fastify + SQLite API
apps/web        React + Cytoscape.js web app (installable PWA)
data/           Public graph as JSON: the source of truth
data/private/   Your private targeting layer (gitignored)
docs/SPEC.md    Product spec and phases
```

## Data

- `data/organizations.json`: sponsors, funds, companies, strategic acquirers
- `data/relationships.json`: ownership, acquisitions, mergers, exits, with dates and sources
- `data/verticals.json`: the vertical taxonomy

Edit the JSON and run `npm run db:seed` to rebuild. Organizations only, no
people, and every relationship should cite a public `sourceUrl`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Seed, then run API and web app with reload |
| `npm run db:seed` | Rebuild `public.db` and `private.db` from JSON |
| `npm test` | Run unit tests |
| `npm run typecheck` | Type-check all packages |
| `npm run build` | Production build of the web app |

Run the API with `PUBLIC_ONLY=1` to hide the private layer, for demos.

## License

MIT, see [LICENSE](LICENSE).
