# Junction-independent simulation and deployment plan

**Status:** Approved design direction, not yet implemented. Keep the current V1.26 Roundabout Designer functioning throughout the migration. This plan extends both `DEVELOPMENT.md` and `SIMULATION_ARCHITECTURE.md`.

## Architectural decision

A roundabout can be assembled from curved, clockwise **one-way road sections**, **priority-controlled entry merges**, and **exit diverges**. A T-junction reuses those same primitives but must also support opposing traffic and crossing/turn conflicts. Therefore an entry to a roundabout behaves like the joining branch of a one-way priority T-junction, but the full two-way T-junction has additional conflict types.

Design a **junction-independent lane graph** and **deterministic vehicle/path engine**. Junction types assemble graph objects; they must not each implement separate car motion, telemetry, replay, collision checks or export logic.

**Keep the user interface in the browser.** A large HTML source file is a maintainability issue, **not** an intrinsic reason to move the simulator to a server. Extract source modules first. Introduce a browser Worker for CPU-heavy simulation so the interface does not freeze. Add an optional Ubuntu backend only when measured workload, persistence, sharing or long-running/batch jobs justify it.

## Proposed modular repository structure

```text
src/
  app/             # bootstrap, user preferences, scenario controller
  ui/              # editor panels, vehicle cards, playback, reports
  render/          # SVG geometry, overlays and car animation only
  model/           # junction graph, schemas, validations, adapters
  geometry/        # curves, lane centreline, tangents and swept envelopes
  junctions/
    roundabout/    # graph factory, current drawing adapter
    t-junction/    # future graph factory using same primitives
    crossroads/    # future
  simulation/
    routes/        # resolve permitted and deliberate off-rule paths
    conflicts/     # conflict zones, time windows and priority decisions
    dynamics/      # deterministic stepping, speeds, spacing, yielding
    telemetry/     # timestamps, waits, traces, structured outcomes
  workers/         # optional browser Worker entry for numerical engine
  shared/          # scenario/result contracts usable in browser and API
tests/
server/            # optional, not required by static/offline release
dist/              # deployable static bundle for Ubuntu UDA
```

Use modular JavaScript/TypeScript with an ordinary static bundler when the refactor starts; decide whether to adopt TypeScript based on the existing Application-Standard conventions. Do not rewrite the working app wholesale. Preserve a static `index.html` entry and offline use. Existing data and deployment compatibility take priority over a fashionable framework.

## Domain model and junction primitives

| Primitive | Core data and purpose |
| --- | --- |
| `RoadSegment` | Direction, curve/polyline centreline, lane IDs, start/end nodes, speed assumptions; one-way and two-way assembled from directed pieces |
| `Lane` | Stable identity, parent segment, order, direction, width, permitted movement set |
| `LaneConnector` | Explicit source lane → target lane, movement intent and distance-parametrised trajectory; optionally marked rule-breaking |
| `JunctionNode` | `merge`, `diverge`, `crossing`, or `continuation` with incoming/outgoing connectors |
| `TrafficControl` | `give-way`, `stop`, `signal`, or `none`; priority encoded separately from road shape |
| `ConflictZone` | Geographic area/path intervals where vehicle envelopes may overlap and time windows matter |
| `RoutePath` | Ordered lane connectors; `position(s)` and `heading(s)` from the same centreline used by the renderer |
| `VehicleState` | Route, distance along path, speed, size, intent, rule compliance and active state |
| `Scenario` | Junction snapshot, seed, vehicles/arrival demand, behaviour controls and model version |
| `SimulationResult` | Deterministic events, trajectories, waits, warnings, assumptions and provenance |

**Path ownership:** Rendered car coordinates, expected lane positions and conflict calculations must all derive from the same route geometry. The current `mergeGeometry`, `exitGeometry`, `roadSurfaceGeometry`, and circular angle-based movement become migration adapters and are retired only after parity tests.

## Improved vehicle-conflict-analysis plan

1. **Baseline paths and evidence:** sample A/B vehicle centreline trajectories, timestamps, headings, speeds and vehicle dimensions; give each route a stable ID. Keep existing near-gap warnings as preliminary, explicitly labelled indicators.
2. **Geometry conflicts:** detect connector merges, crossovers, crossings, exit divergences and following along the same lane. Calculate path intersections and swept-envelope overlap candidates, not merely lane numbers or an illegal-turn checkbox.
3. **Temporal conflicts:** for each candidate, compare future occupancy windows using a bounded simulation horizon. Report possible path conflict, simultaneous conflict-zone occupancy or constrained spacing **with assumptions**. Distinguish spatial crossing at different times from actual overlap.
4. **Priority and behaviour:** apply junction/node rules, gap acceptance and signal state separately. In safe mode attempt to yield or slow; in unrestricted mode allow violations. The driver's lane-rule override changes the available intended route but **does not itself prove a collision**.
5. **Event classification:** `route_violation`, `yielding`, `near_conflict`, `possible_overlap`, and `unresolved`. Do not report a real-world crash or legal fault from the schematic. Preserve diagnostics and configurable tolerances.
6. **Regression scenarios:** East lane 1 straight vs East lane 2 straight, East lane 2 prohibited left to South crossing a permitted trajectory, following/catch-up in the same circulating lane, separate lane parallel merges, mismatched target-lane crossovers, vehicles passing the same crossing at different times, and full T-junction priority/crossing tests.

Keep numerical results repeatable given the same initial scenario, seed, time step and engine version. Replay and event CSV remain common components across junction types.

## Deployment and computing split

**Stage A: modular static client — now.**
- Single deployable browser application from separate maintainable source modules; no server needed to load or simulate current two cars.
- Run small traffic scenarios locally; unit tests for model/geometry/engine without DOM.
- Build/check in CI, then serve deployable static assets through existing Ubuntu UDA/reverse-proxy layout. Avoid root-absolute asset paths.
- The static/offline build remains a supported release target.

**Stage B: browser-side computation — when complexity rises.**
- Move fixed-step deterministic simulation into a Web Worker (or multiple workers if benchmarks warrant it).
- The main thread only handles controls and SVG/Canvas rendering. Communicate through versioned structured messages, not DOM calls.
- Limit displayed cars/trail sampling independently of numerical car count. Use Canvas/WebGL only if SVG performance is actually a bottleneck.
- Measure simulation steps per second, UI responsiveness, memory use and number of simultaneous vehicles before deciding on a different backend.

**Stage C: optional Ubuntu server — only for measured or collaborative workloads.**
- Reasons: long/batch simulations, many simultaneous scenarios, large traffic models, scheduled reports, centrally stored/shared scenarios, multi-user access or an API for other applications.
- Provide an optional authenticated `/api/v1` service: `POST /simulations`, `GET /simulations/{id}`, `GET /simulations/{id}/events`, and `GET /health`, subject to later schema review.
- Submit immutable scenario snapshots and model/engine version plus seed. Server returns a job/result reference; never couple browser rendering to server frame timing.
- Shared numerical engine should ideally run in the same language in Worker and Ubuntu Node runtime to avoid inconsistent physics. An alternative Python service needs parity tests and an explicit reason.
- For persistence, start with SQLite for a small single-instance Ubuntu deployment; choose PostgreSQL only when concurrency, external integrations or scale require it.
- Respect reverse-proxy path prefixes; document authentication, rate limits, job quotas, retained-data limits and cleanup. No exposed unauthenticated arbitrary-execution endpoints.
- If backend is unavailable, browser-only editing, basic simulation, exports and replay continue working. Do not require AI or cloud services.

## Migration sequence and acceptance gates

| Order | Deliverable | Acceptance criteria |
| --- | --- | --- |
| 0 | Protect the current V1.26 baseline | Existing East lane rules, working merges/exits, manual override, safe/risky modes, replay, events CSV and SVG/PNG/JSON exports pass CI |
| 1 | Extract `model/`, `geometry/`, `simulation/`, `render/` and UI | Same initial road SVG and A/B trajectories to agreed tolerance; no server required; UDA static deployment still works |
| 2 | Path/connector abstraction | Car drawing and motion reference one canonical path source; joining/exit headings continuous; no wrong-way East lane 1 turn |
| 3 | Shared merge/diverge and priority rules | Roundabout entries/exits operate via generic nodes with existing behaviour preserved |
| 4 | Prototype conflict-zone engine | Intersection candidates + time windows, classified warnings; false positives tested for parallel independent merges |
| 5 | Compose a priority T-junction | Reuse same nodes, path player, override and conflict reporting; crossing opposing traffic also modelled |
| 6 | Multiple-vehicle fixed-step deterministic simulation | Seeded replay, headways, queue counts and repeatable reports; performance benchmarks |
| 7 | Web Worker execution | Large simulations no longer block editing/playback; consistent output with non-worker engine |
| 8 | Optional server/API evaluation | Decide using benchmark and multi-user requirements; no backend requirement before evidence justifies it |

**No big-bang rewrite.** Introduce pure modules and tests behind the existing UI, migrate a single behaviour at a time, and preserve old save files. Use feature flags/adapters for partially migrated route engines. Define schema versioning and migration for scenarios before changing persistence formats. Each milestone needs clean CI, unchanged manual East-entry demo and deployment confirmation; GitHub green CI alone does not prove the live Ubuntu page was deployed.

## Explicit non-goals for the current release

No validated accident reconstruction, assignment of legal fault, collision attribution, microscopic traffic-capacity forecast or certified highway design. The priority is a demonstrable and testable architecture for believable scenarios, not unsupported claims of safety or causal certainty.

## Future map-network, rule-editing and optimisation extension

The shared `RoadSegment`, `LaneConnector`, `TrafficControl`, `RoutePath`, `ConflictZone` and experiment contracts must support **editable junction-wide rules** and **geographic network import** without needing separate rendering or simulation engines. Driver-specific prohibited-turn overrides remain a different feature from modifying permitted lane movements for all vehicles.

After protecting the current V1.26 application and delivering shared path/priority/conflict primitives, add immutable baseline/variant comparisons, fixed-demand traffic-volume experiments, and rule-only optimisation before considering geometric construction proposals. Compare network-wide outcomes using equivalent traffic conditions and repeatable seeds; optimise throughput, delay, queues and measured safety proxies under explicit legal, physical and access constraints. An AI adapter may generate and explain candidate edits, but only the deterministic simulator evaluates performance and all changes require human approval. Preserve browser-only use; reserve the optional Ubuntu backend for large search batches or storage.

For complete feature scope, acceptance cases, data contracts, objectives, map import, and staged AI rollout see **[TRAFFIC_OPTIMISATION_PLAN.md](TRAFFIC_OPTIMISATION_PLAN.md)**. This is roadmap scope; no rule-network editor, map importer or optimisation engine is implemented yet.

## V1.27 modularisation progress and next gate

**Completed initial extraction:** `index.html` is a small static document loading `src/styles.css`, `src/state.js`, `src/simulation.js`, `src/controls.js`, `src/geometry.js`, `src/render.js`, and `src/bootstrap.js` in fixed order. No build or backend is required. Automated tests now verify relative assets, complete browser initialization, playback/replay, road geometry and lane rules. This is a deliberate compatibility migration: classic scripts still share browser globals and several stateful functions remain interdependent.

**Next safe increments:** (1) introduce a pure validated lane-graph/connector model behind current roundabout controls; (2) move geometry/path functions into explicit interface-based modules and keep vehicle drawing and numerical motion on shared geometry; (3) migrate scenario state and time-stepping to an engine independent of DOM; (4) add conflict-zone detection with occupancy time windows; (5) compose a priority T-junction. Preserve exact entry/exit visuals and regression fixtures as an acceptance gate at each step. Map import, rule-wide optimisation and optional AI remain downstream per `TRAFFIC_OPTIMISATION_PLAN.md`.

**Deployment gate:** UDA must serve the newly required `src/*.js` and `src/styles.css` alongside `index.html`, using the same path prefix. A repo-only/static-file uploader that previously deployed only `index.html` must be adjusted before the update can work live. GitHub CI cannot verify the server's publication or cache refresh.
