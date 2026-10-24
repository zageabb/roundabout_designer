# Traffic simulation and AI integration — architecture direction

## Foundational decision: AI is optional

The application MUST be fully usable offline and without any model provider. Road construction, lane connections, traffic demand configuration, numerical simulation, vehicle animation, metrics, experiment comparison, import/export and reports are all non-AI features. An AI adapter may only propose scenarios and interpret already-computed results. Disabling or removing that adapter must not change simulation results or break any other feature. No AI API calls from the base application.

## Principle

Road geometry, lane connectivity, traffic demand and vehicle dynamics MUST be distinct from SVG rendering. AI may generate scenarios and interpret outputs; it must not be the numerical engine for traffic flow.

## Planned domain model

- Junction: handedness (UK left), island diameter, circulating lanes, lane widths.
- Approach: compass name/bearing, inbound/outbound lane counts, alignment, approach speed.
- Lane: unique lane ID, permitted movements, geometry and links to downstream lanes.
- LaneConnection: inbound lane -> circulating lane(s) -> exit lane(s), with turn type, conflict points, priority.
- Segment: portion of the circulating carriageway between adjacent arms, with independent lane count, lane drops and merges.
- Demand: arrivals in vehicles/hour by approach and destination (origin-destination matrix), vehicle mix, time of day and optional demand distributions.
- SimulationScenario: duration, warm-up, random seed, vehicle behaviour parameters and control strategy.
- SimulationResult: per-approach throughput, queues, delays, density, saturation, waiting time and total journey time, with reproducibility metadata.

## Data boundaries

1. User edits geometry and permissions.
2. Geometry validator verifies UK direction, allowed paths and lane continuity.
3. User supplies demand or loads an OD/turning-movement CSV.
4. Engine simulates priorities, gap acceptance, movements, queue formation and exits.
5. Dashboard displays vehicle movement, bottlenecks and quantitative KPIs.
6. Optional AI layer uses structured inputs/results to propose scenarios, flag anomalies and explain outcomes. AI suggestions must be accepted by the user before modifying the model.

## Simulation implementation phases

1. **Geometry and lane connectivity**: true path geometry, merging/diverging and conflicts, segment-specific circulating lanes.
2. **Demand inputs**: turning counts per entry and time period; derive OD flows where justified.
3. **Deterministic baseline**: traffic flow model, fixed time step, repeatable seed and documented gap-acceptance assumptions.
4. **Visual playback**: individual vehicles follow paths; show queue growth and congestion hot spots.
5. **Calibration**: compare predicted queue length and delay against observed counts / timings.
6. **AI integration**: use structured tool access (schema validated), scenario generation, comparisons and bottleneck explanations.

## User-facing future questions

- How many vehicles can each approach process per hour?
- Which entry is the bottleneck at peak hour?
- What happens if southbound demand rises 20%?
- Would adding a circulating or inbound lane reduce average delay?
- How do queues change with different turning proportions?
- Which lane layout yields the best throughput without invalid movements?

## Accuracy and safety

Not a traffic engineering certification tool. Any predictive output should show model assumptions, simulation seed, calibration data, demand coverage and limitations. Do not label guessed traffic counts as observations.

## Approved cross-junction and hybrid-compute architecture (24 October 2026)

The roundabout is composed of four **one-way curved segments**, four priority entry **merge** nodes, and four exit **diverge** nodes. Its entry behaves like the joining branch of a one-way T-junction. A normal T-junction must also model opposing traffic, through movements, turn-across-traffic **crossings** and different priority decisions. All junction templates must reuse the same directed lane graph, lane connectors, path motion, conflict-zone engine, telemetry, replay and scenario contracts.

**Shared traffic primitives:** `RoadSegment`, `Lane`, `LaneConnector`, `JunctionNode` (merge/diverge/crossing/continuation), `TrafficControl` (give way/stop/signal), `RoutePath`, `ConflictZone`, `VehicleState`, `Scenario` and `SimulationResult`. Do not hard-code a roundabout angle or cardinal road arm in the shared simulation engine. Rendering must sample the same paths as vehicle motion and conflict analysis.

**Improved conflict analysis:** first identify geometric trajectory intersections and potentially overlapping swept vehicle envelopes; then determine whether occupancy **times** overlap. Add priority/rule compliance and safe-vs-unrestricted decisions as separate layers. Allow independent parallel merges, test illegal-turn crossovers, log interpretable possible conflicts and wait/near-conflict events without asserting an actual collision or responsibility for an accident. Protect against false positives when cars pass the same place at different times.

**Where the code should run:**
1. Keep editor/UI, drawing and animation on the browser main thread with separated source modules and a static deployable build. Removing the large inline JavaScript does **not** require a backend.
2. When traffic demand makes numerical stepping expensive, move the deterministic engine into a browser Web Worker; exchange versioned scenario snapshots and result/telemetry messages. Continue to support fully offline operation.
3. Optionally deploy a secured, resource-limited Ubuntu service for large or batch runs, scheduled jobs, saved/shared scenarios, and multi-user access. Prefer reusing the same JS/TS engine in the server runtime to avoid divergent physics. Keep the static-client engine as a fallback; no hard backend or AI dependency. Document relative reverse-proxy prefixes and authentication before deployment.

**Milestone order:** (1) protect V1.26 regression suite; (2) incrementally extract pure geometry/model/simulation/render/UI modules; (3) unify vehicle paths; (4) generic priority merge and exit diverge; (5) temporal vehicle conflict zones; (6) validate reuse with a priority T-junction; (7) multiple-vehicle deterministic runs; (8) browser Worker/performance benchmarks; (9) evaluate optional server/API only against actual scale or collaboration needs.

Full development contract: [INTERSECTION_CORE_PLAN.md](INTERSECTION_CORE_PLAN.md).
