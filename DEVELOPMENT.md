# Development

## Status
Version 0.1: single-file static proof of concept committed to main.

## Design architecture
- `index.html`: responsive vanilla JS UI, immutable defaults, state, SVG renderer and client-side exports.
- No backend/database/authentication.
- Settings serialisable to JSON.
- Next iteration: split rendering, geometry, validation and UI into independent TypeScript modules with automated tests.

## Acceptance criteria
- UK/left driving: inward road half is the left side in the travel direction.
- Clockwise circulation.
- North 3 in/2 out; East 3 in/2 out; South 4 in/2 out; West 3 in/2 out.
- All 13 entry lane movements match user's instructions.
- Circulating count adjustable 1 to 5 independently of entry/exit.
- SVG export remains valid and offline.
- JSON load rejects malformed data; strengthen detailed per-field validation in next iteration.

## Known limitations
This first milestone is a functional diagram editor, not a finished true-to-life CAD road layout. Curvature transitions, spiral lines, realistic splitter shaping and lane continuity are next milestones. Browser tests and CI have not yet been configured or executed.

## Planned CI
Add tests for left-side orientation, clockwise flow, all arm lane movements, min/max circulating settings, JSON round trip and snapshot SVG generation.
