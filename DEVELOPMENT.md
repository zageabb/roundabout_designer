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

## Simulation-oriented design decision (24 Oct 2026)
The long-term purpose is vehicle-volume simulation with optional AI analysis. Keep geometry, lane connectivity, demand, simulation, rendering and AI interface as separate modules. See `SIMULATION_ARCHITECTURE.md`. Ubuntu UDA deployment preparation is in `deploy/README.md`, but live server configuration remains unverified.

## V1.4 visual readability update (24 Oct 2026)
- Independent `displayScale` control changes pixels per metre in the SVG without altering physical lane width.
- Dynamic canvas fits wider lane counts and island diameters instead of clipping arm labels.
- Show/hide lane numbers; persisted in JSON.
- Circulating flow arrows centred within the circulating annulus.
- Existing UK approach counts and movements unchanged.
- Static source checks updated, but rendered browser and GitHub CI success should be verified after UDA deployment.

## V1.5 permitted-turn topology (24 Oct 2026)
- Model can now derive a destination arm for every allowed lane movement. The provided default has 18 lane/movement combinations across 13 inbound lanes.
- North/East/South/West all use left-hand clockwise ordering for left, straight and right exits.
- A configuration panel lists the resulting lane-to-destination options and refreshes when lane permissions change.
- Optional dashed cyan overview links are explicitly schematic only; no swept paths, lane assignments inside the roundabout or weaving analysis yet.
- JSON maintains the route overlay selection. Regression checks cover canonical route relationships.
- Next: persistent explicit lane-to-circulating-lane and circulating-to-exit-lane mappings, with engineering geometry and vehicle-safe paths.

## V1.6 provisional lane mapping
- Each permitted movement now receives a deterministic entry → circulating lane → exit lane suggestion, shown on the approach connectivity panel.
- Circulating lanes are indexed outer-to-inner. Left turns prefer outer, right turns inner, straight turns a middle lane (all clamped to the circulating count). Exit-lane assignment is provisional and must not be used as vehicle trajectory truth.
- Added network validation for lane counts and movement codes, including during JSON import.
- Actual spiral transitions, mandatory lane changes, conflict points and geometric continuity remain to be implemented before running vehicle flow simulation.

## V1.7 two-vehicle positioning
- Added separate A and B vehicle settings: North/East/South/West, entry/exit, and lane index.
- Vehicle positions follow SVG arm geometry and are clamped when a configured lane disappears.
- A/B positions are persisted in JSON and reset with defaults.
- These are static positioning markers; no vehicle motion, interaction or collision logic yet.
