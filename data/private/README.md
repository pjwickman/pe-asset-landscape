# Private targeting layer

Everything in this folder except this README is gitignored.

Put your own targeting data in `targets.json` here: which organizations you're
pursuing, priority, status and notes. It is loaded into a separate database
(`private.db`) and merged into the graph only in your local, private view.
The public graph never reads from this folder.

Format (organizations only, never people):

```json
[
  { "orgId": "warren-equity-partners", "priority": 1, "status": "researching", "notes": "" }
]
```

`status` is one of: `researching`, `approached`, `in-conversation`, `client`, `parked`.
