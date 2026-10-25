# Development rules

- The UK driving convention is non-negotiable unless the user explicitly switches country: **keep left on each approach, circulate clockwise**, and give way to the right.
- Always distinguish entry lanes, exit lanes and circulating lanes.
- Never silently infer lane counts from illustrative images.
- Default arm configuration is documented in README.md and must remain under regression tests.
- Number entry lanes from the approaching driver's left to right, not from the image's left to right.
- SVG is the deterministic geometry/rendering source; image generation must never create lane semantics.
- For future code changes, document reverse-proxy-specific workarounds with explicit comments and keep URL handling relative.
- Treat the output as a planning schematic until geometry is verified against engineering requirements.
- Future development should follow the user's Application-Standard repository patterns where practical.

## Junction-independent development and execution rules
- **Keep the V1.26 roundabout working.** Never perform a big-bang rewrite; incrementally extract pure tested modules, preserve current East lane defaults, safe/risky modes, entry/exit geometry, overrides, replay, SVG/PNG/JSON/CSV and the static UDA deployment. See `INTERSECTION_CORE_PLAN.md`.
- The goal is **one** lane-graph/path simulator for roundabouts, T-junctions and later crossings. Represent a roundabout as one-way segments + merges + diverges; two-way T-junctions also need opposing/crossing conflicts.
- Separate vehicle physics/conflict priority/trajectory geometry from UI and SVG. Car drawing and conflict checking must sample the same canonical route geometry.
- Identify potentially intersecting paths then assess temporal overlap; an illegal move or route intersection is not by itself a collision or legal fault. Keep assumptions explicit.
- Split the single HTML into maintainable modules before scaling. Modular frontend development **does not imply server-side rendering or a mandatory backend**. Start with static build, use a browser Worker for measured CPU load, and add an optional authenticated Ubuntu API only for measured heavy runs, multi-user scenarios or persistent/scheduled workloads.
- Maintain browser-only/offline operation and optional AI. Document schema versions, relative reverse-proxy paths, interoperability/engine-parity tests, and CI checks on every migration step.

## Future scenario and AI optimisation rules
- Distinguish individual vehicle noncompliance (`overrideExitRules`) from an official lane/junction-wide edit to the legal `RuleSet`. Route eligibility and user-facing warnings must reflect that difference.
- Scenario comparisons require immutable baselines, consistent origin-destination demand, matched seeds/engine version and network-wide metrics. Never rank a design from fabricated traffic counts or from a single uncalibrated visual run.
- Road/mapping import must preserve provenance and mark unknown lane markings, controls and turning counts for confirmation; an imported route graph must use the same core data model as manually drawn roads.
- Optimisation must use independently testable numerical simulation and constraint validation. AI is an optional candidate proposer/explainer only; no silent scenario mutation, unsupported claim of capacity gain, or execution of unapproved roadway changes. Physical modifications require separate feasibility/cost/land/safety considerations.
- Follow `TRAFFIC_OPTIMISATION_PLAN.md` only after base `INTERSECTION_CORE_PLAN.md` dependencies are met; preserve legacy roundabout user experience and offline operation.

## V1.27 static asset and testing contract
- The current `index.html` loads six ordered classic scripts from `src/` and one stylesheet. Preserve this order and relative URLs unless migrating both browser delivery and tests intentionally. Never re-inline the entire application simply to avoid updating a test.
- When moving functions between scripts, maintain correct initialisation order and verify `tests/read_app.js`, `tests/check_modules.js`, `tests/check_runtime.js`, plus all other existing regression suites. Shared-global classic scripts are transitional; do not assume they are isolated ES modules.
- UDA/static publishing must include `src/` assets at the application's relative prefix. Document and verify any reverse-proxy-specific change without hard-coded server-root asset paths.

## V1.28 network-model invariants
- `src/lane-network.js` is pure, browser-classic-script and CommonJS compatible, and must not import `document`, hard-code deployed routes or depend on mutable browser state.
- Keep lane IDs and merge/diverge node identifiers stable across redraws, initial scenarios, exports and simulation events. Permitted-turn intent is **separate** from the individual car's violation/override flag.
- `LaneNetwork.sampleVehiclePose` must remain the common source for rendered A/B positions and recorded trails. Curve callbacks may temporarily come from the legacy roundabout; replace only when tested for position and heading continuity.
- Provisional merge/exit lane connectors are **not** evidence of geometric feasibility or safety. Conflict analysis requires actual path intersections, vehicle envelopes, occupancy windows, give-way rules and reliable timings before labelling a possible interaction.
- Run `tests/check_network.js`, `tests/check_runtime.js` and all existing CI tests when changing lane indexing, entry counts, route selection or pose calculations.

## V1.30 vehicle-body projection safety
- Vehicle dimensions are `lengthMetres` / `widthMetres` in the scenario, defaulting to 4.4 / 1.8 for legacy saves. Use identical metres in `ConflictEngine.assessFootprints` and SVG body dimensions multiplied by `displayScale`.
- Preserve the existing safe/unrestricted motion choices. Body predictions must remain a non-invasive advisory overlay until a deterministic yielding/braking integration has explicit behavioural acceptance tests.
- Spatial body proximity at different projected times must not be relabelled a simultaneous overlap; projection screening is not an accident/fault assessment. Keep sampled/constant-speed limitations conspicuous.
- Include `tests/check_footprints.js`, `tests/check_conflicts.js` and `tests/check_runtime.js` in CI for changes affecting pose, dimensions, classifications or route physics.

## V1.31 conflict-zone implementation rules
- `ConflictZones.assess` must remain a standalone pure module: distances/dimensions in **metres**, times in **seconds**, interpolated heading consistent with `ConflictEngine.interpolatePose`. Never introduce browser state, SVG, or hard-coded roundabout bearings into this module.
- Do not equate an **overlapping shared-zone window** with body collision or legal fault. The approximated circular zone may include cars whose actual rectangles are mutually clear. Maintain independent body-overlap, zone-window and priority/rule classifications.
- Respect the distinction between spatial overlap at **different times** and temporal interval overlap. Keep multiple visits as separate windows and leave empty occupancy explicitly unresolved rather than inventing arrival times.
- Run `tests/check_zones.js`, `tests/check_footprints.js`, `tests/check_conflicts.js` and `tests/check_runtime.js` when changing timing, geometry, forecast adapters, or marker drawing. Keep browser-only/offline operation and existing safe/risky behaviour unchanged until accepted priority-control logic exists.

## UK roundabout lane-change constraints
- Follow [ROUNDABOUT_LANE_CHANGE_RULES.md](ROUNDABOUT_LANE_CHANGE_RULES.md) before implementing any automatic inward-to-outward transition. Rule 186 means remain inside **until needing to change lanes to exit**, not continuously drift outward while circulating. Respect roundabout-specific lane arrows and spiral exits.
- Model each lane connector, actual swept body, time-dependent safe gap, turn indicator and exit movement separately. A driver signalling left does not gain lane-change priority. Preserve a safe blocked-lane/missed-exit outcome and intentional rule-break override behaviour.
- **These movement features are planned, not currently implemented.** Never misdescribe them as passing CI or live on Ubuntu until actual implementation/tests exist.

## V1.33 opt-in outward manoeuvre contract
- `LaneChanges` is a pure shared geometry/gap module; `LaneNetwork.sampleVehiclePose` must use its curved pose during an active `laneChange`. Avoid a sudden lateral jump on completion.
- Only a vehicle with `autoLaneChange===true` on a right-turn route participates. Preserve **off by default**, legacy exit handling, East entry lane overrides, and JSON round trips.
- In safe mode, use target-lane body clearance before starting **each** outward step; a blocked move must not be bypassed by forced exit. When the exit is passed without prior completion, log `missed exit` and keep circulating. Unrestricted mode may deliberately violate gap checks.
- One lane per transition; no unvalidated multi-lane teleportation. A spiral/painted lane must eventually use a dedicated connector, not this default lateral movement.
- Keep `tests/check_lane_changes.js`, `tests/check_runtime.js`, old merge and trajectory tests in CI. Do not market the fixed 22° path/gap screen as validated highway geometry or continuous swept-body collision prevention.
