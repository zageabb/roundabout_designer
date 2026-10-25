# Development

## Status
V1.26: working two-vehicle roundabout simulator with continuous road outline, independently selectable/overridden exits, replay, SVG/PNG/JSON exports, event CSV, and executable CI. The next agreed development milestones concern junction-independent graph, conflict analysis, and modular code extraction.

## Design architecture
- `index.html`: responsive vanilla JS UI, immutable defaults, state, SVG renderer and client-side exports.
- No backend/database/authentication.
- Settings serialisable to JSON.
- Next iteration: incrementally extract geometry, validation, lane graph, deterministic vehicle engine, collision-candidate analysis, rendering and UI from the single HTML file into tested JavaScript/TypeScript modules. Keep a static browser distribution; introduce a Web Worker for measured heavy CPU work, with an optional Ubuntu API only when needed. See `INTERSECTION_CORE_PLAN.md`.

## Acceptance criteria
- UK/left driving: inward road half is the left side in the travel direction.
- Clockwise circulation.
- North 3 in/2 out; East 3 in/2 out; South 4 in/2 out; West 3 in/2 out.
- All 13 entry lane movements match user's instructions.
- Circulating count adjustable 1 to 5 independently of entry/exit.
- SVG export remains valid and offline.
- JSON load rejects malformed data; strengthen detailed per-field validation in next iteration.

## Known limitations
The current app is a working visual simulator, not a surveyed/validated engineering model. Geometric lane continuity, meaningful swept vehicle envelopes, richer conflict detection, priority control, and scalable traffic volume simulation remain incomplete. Browser-based graphical verification is still needed; CI already checks geometry, trajectories, routes, replay and JavaScript syntax.

## Existing CI and next verification
GitHub Actions currently checks layout, shared road geometry, entry-merge trajectories, exits, legal/overridden routes, scenario replay and JavaScript syntax. Extend with junction-graph consistency, deterministic fixed-step results, conflict-zone tests, scenario format migration, UI/browser visual tests, and performance budgets.

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

## V1.8 static circulating vehicle placement
- Vehicles A/B now support `circulating` in addition to entry and exit placement.
- Circulating position uses an outer-to-inner lane index (1 is outermost) and angle clockwise from North (0–359 degrees).
- SVG positions and vehicle headings follow circular geometry and clockwise movement; no actual vehicle motion/priority logic yet.
- The arm dropdown is disabled when placing a vehicle in the circular carriageway. Vehicle positions persist in JSON.

## V1.10 circulating vehicle playback
- Vehicles A/B can be started, paused, and stepped forward by 5 degrees when placed on the circular carriageway.
- Playback uses requestAnimationFrame with elapsed-time scaling, bounded frame deltas and a user-adjustable 1–90 degrees/second rotation rate.
- Entry and exit vehicles remain static. Manual editing, JSON load and reset stop playback.
- This is animation only: no gap acceptance, speed dynamics, priorities, collisions or lane changing. Playback speed is a UI control, not km/h.
- Verify live UDA browser display and CI status after publishing.

## V1.11 independent vehicle playback and proximity indicator
- Vehicles A and B now each have a configurable circulating angular speed from 0 to 90 degrees per second. Their individual speed is multiplied by the global playback-speed setting divided by its default 20 degrees/sec.
- Approximate same-lane separation is displayed in metres from the angular gap and lane-centre radius. Warning threshold is 8 m.
- This is a geometric proximity indicator only. No collision prediction, vehicle length, relative closing velocity, merge conflicts, yielding or gap acceptance is simulated.
- Updated static checks; validate live UDA display and Actions separately.

## V1.13 relative vehicle movement assessment
- For A and B in the same circulating lane, compare their clockwise forward headways and individual angular speeds.
- Report approximate nearest spacing and a constant-speed catch-up time for the faster following car.
- Explicitly label this as a geometric estimate; it does not account for braking, merges, vehicle lengths, changes in acceleration or collision prediction.
- No automatic vehicle stopping or control decisions.

## V1.14 optional driving behaviour (24 Oct 2026)
- New driving-mode selector: safe following (default) vs unrestricted/risky playback.
- Safe-following clamps the faster same-lane vehicle's angular advancement based on a user-set minimum gap (default 8 m, range 2–30 m), without changing configured target speed.
- Unrestricted mode retains original playback without intervening, supporting future deliberate hazardous-driving experiments.
- Behaviour preference and minimum gap persist in JSON; both reset to safe defaults.
- This is not validated car-following physics and does not model vehicle body lengths, acceleration, priority, incidents or actual crashes. It currently affects only the two circulating cars.
- Future incident simulation should be separately toggleable, with seeded scenarios and incident records rather than treating overlapping vehicle graphics as a confirmed crash.

## V1.15 entry movement and prototype give-way
- During playback, vehicles placed on an entry approach move toward their give-way line using a normalized entry progress field (0 to 1).
- At the line, safe mode checks whether the other vehicle is circulating immediately upstream of that arm. When occupied it waits; when clear it joins outer circulating lane 1.
- Unrestricted/risky mode bypasses that preliminary give-way check. JSON exports preserve progress and driving mode.
- This is a two-vehicle, schematic demonstrator rather than junction-engineering-valid yielding: no acceleration profiles, route-based lane selection, swept-path geometry, queueing multiple entry vehicles, or calibrated time gaps.

- Entry-to-circulatory heading correction: join angles are North 45°, East 135°, South 225°, West 315°, used consistently for give-way proximity and initial circulating position. This removes radial-axis snapping (East 90°). A true lane-centreline interpolation/turn arc remains future work; these positions are an approximation.

## V1.17 continuous multi-lane entry merges
- The entry-to-circulating transition now uses a cubic Bézier curve instead of teleporting from give-way to the circular lane.
- Entry vehicles have an independently selectable target circulating lane (1 to configured maximum), saved in JSON.
- Curved merge endpoints and tangents align with the selected circulating lane and compass bearing.
- Safe mode checks approaching/nearby traffic on the target and all crossed outer lanes before starting; unrestricted mode can bypass this preliminary rule for future unsafe-driving scenarios.
- The prototype still lacks continuous swept-path collision checks, merging conflicts between different entries, realistic lane changes, and physical acceleration; don't treat safe mode as a guarantee of no collisions.

## V1.23 road-outline-derived merge paths
- Merge geometry now uses the exact entry mouth generated by `roadSurfaceGeometry` for the finished single-piece roadway outline.
- Cubic Bézier handles are constrained to move leftward/inward monotonically in the canonical South-entry frame, preventing the lane-1 rightward S-turn observed when testing the East approach.
- The circulating handoff angle is calculated from the actual merge endpoint rather than a fixed 30-degree assumption. Vehicle heading remains tangent to clockwise circulation.
- CI runs `tests/check_merge.js` to exercise all standard entry lanes on all four arms, lane-radius continuity, heading continuity, and an explicit East lane-1 to lane-2 override.
- The path is still schematic; it does not model individual vehicle swept areas, conflict-free crossing of intermediate circulating lanes, or realistic speed/steering limits.

## V1.24 vehicle exit planning and independent parallel merges
- Vehicle configuration now appears below the main road drawing, with A/B cards side by side when screen width permits. Play/Pause remain above the drawing.
- Entry vehicles offer a selectable exit destination derived from their own permitted turn arrows: East lane 1 -> South or West, East lane 2 -> West only, East lane 3 -> West or North.
- Drivers can opt to Keep circulating, or select an available destination and exit lane. Destination and exit lane persist within vehicle JSON.
- Vehicle motion includes a new curved `exiting` state, triggered when the circulating vehicle reaches its chosen road mouth. Its starting bearing and curvature use the same outer-road-mouth geometry as the final SVG road surface. The car then becomes stationary on the chosen outbound lane.
- A same-arm merge no longer automatically blocks a second vehicle. In safe mode, simultaneous merges to distinct lanes with consistent lane order can proceed; conflicting targets, identical starts and crossover movements remain serialized.
- The provisional aligned-lane allowance also permits a following vehicle to enter its separate circulating lane when a same-arm car has already entered its own matching lane. These rules are not full swept-path conflict detection.
- CI runs `tests/check_routes.js` to test permitted East exits, simultaneous lane 1+2 merges, blocked same-target merges, roundabout-to-exit continuity and completion on all four exits.
- **Limitations:** fixed-speed visual routes, no continuous multi-lane merge conflict simulation, no physical turning-radius validation, gap acceptance calibration, or mandatory exit approach lane-changes. Unsafe driving remains optional.

## V1.25 optional lane-turn-rule override
- Each vehicle now has an independent `Override lane turn rules` checkbox in its card below the road diagram.
- Default (unchecked) destination options are derived from the origin entry lane's `moves` values; lane 2 East is straight-only and therefore normally exits West.
- When checked, all four exit arms (including a return to the entry road) are available. An explicit example is East entry lane 2 taking the South (left) exit despite straight-only markings.
- When an off-rule route is selected, the vehicle card shows a distinct `Rule-breaking route` warning. The flag and destination are serialized to JSON and restored on import.
- Turning the override off restores a legal route if the selected destination was not permitted; automatic safe following and vehicle spacing remain unchanged by this flag. The flag models a deliberate route/marking violation, **not** a confirmed collision or a suspension of all give-way rules.
- CI includes executable coverage confirming legal defaults, allowed override selection, forbidden-route labelling, disabling/resetting the override, and JSON round-trip preservation.

## V1.26 scenario replay and telemetry
- Added a **Replay scenario** control beside Play/Pause/Step: captures the vehicles' starting configuration at the first Play/Step, then resets their positions, route choices, overrides and waiting states to replay the same experiment without changing the road layout.
- Changing a vehicle, permitted movement, lane count, roundabout geometry or safe-driving setting invalidates the previous replay snapshot and per-run activity. Pausing retains it. Changing path visibility does not change the scenario.
- Optional **Show travelled paths** draws colour-coded A/B trajectory polylines on the shared SVG road surface, sampled at 3 px minimum spacing and capped at 360 points per car to avoid unbounded growth.
- The **Scenario activity** monitor tracks playback-equivalent seconds, approximate give-way waiting time per car, and event transitions (start, intentional rule override, give-way wait/release, entry merge, circulation, exit turn, exit completion).
- **Export events CSV** produces a quoted CSV with event timestamps, car identifiers and descriptions; live telemetry is not part of saved JSON configurations.
- Added executable `tests/check_scenario.js`, exercising trail points, status changes, wait accounting, replay determinism and off-rule exit persistence. This test is included in CI.
- **Limitations:** two-vehicle demonstrator, no calibrated physical vehicle speed or waiting-time prediction, path-trail rendering is only a visual aid, and observed visual proximity is not an accident determination. A larger deterministic traffic-flow/queue engine remains future development.

## Next agreed roadmap: common intersection core + improved vehicle conflict analysis
- **Architectural decision:** roundabout = directed curved road segments + four entry merges + four exit diverges. Reuse these primitives for priority T-junctions; add opposing traffic and crossing conflicts where appropriate. Avoid separate engines for every junction shape.
- **Extract before expanding:** move the current single-file HTML/CSS/JS implementation incrementally into a static, maintainable module structure while preserving all V1.26 behaviours, CI and UDA deployment. Frontend modularisation does not require server-side rendering or simulation.
- **Shared lane graph:** introduce stable road/lane/connector/node IDs, continuous vehicle trajectories as distance-parametrised paths, and independent give-way/stop/signal rules. The rendered SVG and collision tests must use the same path source.
- **Conflict analysis:** begin with spatial intersecting/swept-path candidates, then compare occupancy *times*, speeds, sizes, priority and gap decisions. Distinguish permitted merges, rule violations, near conflicts and possible occupancy overlap; never infer a confirmed collision or legal fault solely from a lane violation.
- **Validation case:** after roundabout entry/exit behaviour is refactored into reusable merge/diverge rules, build a basic priority T-junction using the same engine and test its additional crossing conflicts.
- **Scaling decision:** small simulations run client-side; use Web Workers when UI responsiveness/vehicle counts justify it. Consider an optional Ubuntu Node service/API for batch/large simulations, shared scenarios and persistence only when benchmarks or requirements warrant it. Keep offline/static mode usable and make AI optional.
- **Acceptance gates:** unchanged East lane 1 left/straight + lane 2 straight behaviour, lane 1/2 simultaneous noncrossing merges, unsafe East lane 2→South override, route replay/trails/events, scenario import/export, stable numerical results, and green CI at every incremental refactor.
- **Detailed order, proposed schemas, frontend/worker/server split, and tests:** [INTERSECTION_CORE_PLAN.md](INTERSECTION_CORE_PLAN.md). Do not implement a monolithic rewrite or deploy an unauthenticated API.

## Additional future roadmap: editable junction-wide rules, traffic flow and optimisation
- After modularisation and common lane-graph/conflict analysis, support changing **road rules** for a whole lane, junction or network: permitted turns, give-way/stop, signals, one-way direction, lane allocation and time-dependent restrictions. This is **not** the existing driver-specific illegal-turn override.
- Add baseline/variant snapshots and fixed-demand reproducible A/B-style experiments covering multiple vehicles, route reassignments, queues, waiting, throughput, travel times and spillback to nearby junctions.
- Allow manually drawn or verified map-derived networks to be edited in the same road graph, with unknown map lane details flagged for review before simulation.
- Provide an initial **rules-only optimisation** search with explicit legal/access/signal/safety constraints; later test physical changes such as an extra lane, turn pocket or alternative junction type with land/cost/engineering feasibility checks.
- Introduce AI as an **optional** proposal/explanation layer over validated candidate simulation results, not as the numerical traffic engine. Human review/approval and documented uncertainty are mandatory.
- Show network-level trade-offs, not only the flow at one junction. Run candidates with the same measured or declared synthetic demand, matched seeds and calibrated assumptions; do not describe uncalibrated simulation output as a verified capacity gain.
- Detailed dependency order, map-data validation, schemas, constraint handling and acceptance tests: **[TRAFFIC_OPTIMISATION_PLAN.md](TRAFFIC_OPTIMISATION_PLAN.md)**. Current V1.26 features remain unchanged by this roadmap update.

## V1.27 — initial modular static frontend extraction (implemented)
- **No big-bang rewrite:** the previous inline CSS and JavaScript were extracted without changing their source statements into `src/styles.css`, `src/state.js`, `src/simulation.js`, `src/controls.js`, `src/geometry.js`, `src/render.js`, and `src/bootstrap.js`. The HTML is now approximately 5 KB rather than ~48 KB.
- Existing browser globals and declaration order are preserved through six ordered **classic script** tags. This is an **intermediate maintainability step**, not yet strict ES modules or fully decoupled core algorithms; new features should migrate shared logic behind explicit interfaces incrementally.
- Assets are referenced relatively (`./src/...`) to preserve static/offline use and Ubuntu's reverse-proxy path prefixes. No Node server, database, NPM build or AI integration was introduced to operate the app.
- Replaced source-location assumptions in existing tests with a shared `tests/read_app.js` loader. The CI suite still covers lane defaults, geometry, per-lane merges, permitted and illegal exits, replay, telemetry and syntax.
- Added `tests/check_modules.js` for relative asset paths and source ordering and `tests/check_runtime.js` for complete-script startup, SVG rendering, playback and replay under a minimal test DOM.
- **Next milestone:** migrate the roundabout's lane routing and path/connector functions from shared classic global scope to explicitly imported pure modules, with tests and an adapter retaining the current UI/JSON format. Then implement spatial/temporal conflict zones. Do not infer deployment success solely from CI: verify that UDA publishes the `src/` directory alongside `index.html` and can serve its CSS/JS under the application prefix.

## V1.28 common lane network and shared vehicle-pose bridge (implemented)
- Added `src/lane-network.js`, a **pure, DOM-free** directed lane-network foundation with stable identifiers for approach lanes, clockwise circulating segments, entry merge / exit diverge nodes and provisional lane connectors. It runs in a classic browser script or through CommonJS for Node tests and future Worker/Node use.
- Current default graph represents **8 nodes, 16 road sections, 45 directed lanes and 18 legal movement options**. Entry and exit connection shapes remain *provisional*; this is a topology/intent graph, not yet a geometrically verified lane-routing engine.
- Legal exit options, schematic connectivity and each car's selected entry → circulating → exit lane path now derive from the shared network model. A forbidden movement selected with `overrideExitRules` is flagged as a route violation **without** rewriting junction-wide permissions.
- The renderer and scenario trail recorder both use `LaneNetwork.sampleVehiclePose`; the API samples the existing cubic merge/exit functions and circular lane positions. This removes duplicated coordinate-transform logic and protects display/telemetry agreement.
- Preliminary parallel-versus-shared/crossing merge relationships are now classified centrally in `LaneNetwork.mergeRelationship`; this does **not** yet calculate vehicle swept areas, collision outcomes or timing.
- Fixed stale entry-lane identity when a user reduces an approach's lane count. Existing lane routes remain normalised against the new configuration.
- Added `tests/check_network.js` and expanded browser startup regression coverage. GitHub CI continues checking existing geometry, routes, rule overrides and replay.
- **Next step:** compute path-centreline geometry and conflict-zone candidates from canonical connectors, then add occupancy time windows and priority rules. Use the roundabout and a basic one-way T-junction as the first two fixtures before attempting demand or AI optimisation.

## V1.29 projected vehicle-path conflict inspection (implemented)
- Added `src/conflict-engine.js`: **pure**, junction-independent sampled 2D trajectory analysis. It considers the closest spatial approach between path segments and then separately checks cars' positions at matching forecast timestamps. A close spatial intersection at different times is not labelled simultaneous.
- Added `src/conflict-projection.js`: a small roundabout-only adapter that forecasts existing entry, merge, circulating and exit phases, using the same position/heading and cubic curve callbacks as vehicle rendering. No second, hard-coded SVG path model was introduced.
- A/B settings now include a **Projected route interaction** readout and **Show projected conflict location** checkbox. A subtle blue ring identifies crossing/close paths at *different projected times*; amber identifies potential simultaneous centreline proximity. The toggle is kept in scenario JSON and resets to on by default.
- The forecast uses a rolling eight-second look-ahead and constant configured vehicle speeds, sampled every 0.25 seconds, with a 2.4-metre centreline proximity threshold and finer common-time comparison. Output distinguishes `separate_paths`, `paths_intersect_different_times` and `possible_overlap`. This reports a centreline **candidate**, NOT calibrated swept-body collision, near-miss, legal fault or accident reconstruction.
- **Deliberate isolation:** predictions ignore give-way waiting, braking and safe-following adjustments and do **not** influence vehicle movement decisions. Conservative warnings may occur for cars that would actually yield; more advanced occupancy, priority and vehicle-footprint logic is still scheduled.
- Added `tests/check_conflicts.js` and runtime UI assertions: test simultaneous crossing, delayed crossing, parallel independent paths, same-target merging, invalid path/time inputs and visible/hidden markers. All prior CI tests remain in force.
- **Next:** replace point-clearance candidates with path-segment-specific conflict-zone occupancy windows and vehicle footprint/size, classify merge vs crossing vs following, integrate actual yield/safe mode model and vehicle event records, then demonstrate reuse at a priority T-junction. Keep forecasts bounded and benchmark their cost as vehicle counts grow.

## V1.30 sized vehicle footprint screening (implemented)
- Each A/B vehicle now has editable **length** (3–12 m; default 4.4 m) and **width** (1.2–3.2 m; default 1.8 m). These values persist in ordinary scenario JSON, are normalised on load/reset, and resize the drawn SVG vehicle bodies at the configured display scale.
- Replaced the projection screen's old centreline-only 2.4 m distance rule with a pure oriented-rectangle body calculation in `ConflictEngine.assessFootprints`. It compares spatially close body rectangles across route samples, then separately measures body-edge clearance at matching simulated times (including original sample timestamps).
- Preliminary categories distinguish **merge**, **exit/diverge**, **following** and **crossing** by projected phase and heading. Blue indicates an area shared at different times; amber marks possible **simultaneous** body proximity within a 0.15 m margin. Neither result indicates an established crash or legal responsibility.
- New `tests/check_footprints.js` verifies right-angle intersections, staggered crossings, independent parallel lanes, changes in width/length, stationary same-lane following, temporal non-overlap, and malformed inputs. Browser runtime tests check body sizing and JSON persistence; legacy safe/risky and trajectory suites remain green.
- **Limitations:** centreline trajectories remain schematic; rectangles are only sampled every 0.25 seconds with an additional time check at roughly 0.15-second intervals and no *continuous swept body* between samples. Heading/acceleration may not match real driving. Braking, give-way, lane-change feasibility, vehicle class restrictions, impact severity and fault are not modelled; the results must remain a tentative visual screening.
- **Next:** separate reusable geometric conflict zones from the roundabout projection adapter, calculate occupancy-entry/exit time windows for body envelopes, test safe/yield-aware forecast alternatives, add informative event records with de-duplication, and use a T-junction fixture. Profile/limit repeated projections before scaling to many vehicles or optimising a road network.

## V1.31 shared conflict-zone occupancy windows (implemented)
- Introduced **`src/conflict-zones.js`**, a pure geometry/time adapter for every junction type. It builds an approximate **0.9 m radius shared zone** centred on the closest projected car-body interaction and estimates when each oriented rectangular vehicle body enters and leaves that zone.
- Vehicle arrival/departure windows are calculated from the existing path/heading samples using bounded **0.1-second interpolation** and binary refinement of entry/exit edges. The analyser supports separate repeat visits, stationary occupation, differing forecast start times and gaps between visits; it returns `overlapping_windows`, `separate_windows`, `no_shared_zone`, or `not_resolved` without confusing shared space with shared time.
- The existing eight-second roundabout projection now includes these windows. **Projected route interaction → Zone timing** displays car A/B arrival and exit ranges and the estimated shared-zone overlap duration or gap. The road marker optionally includes a translucent to-scale zone circle, retaining the familiar amber/blue interaction colours.
- Expanded executable checks: **`tests/check_zones.js`** covers simultaneous arrivals, staggered arrivals, independent parallel paths, entry and exit while a vehicle's centre lies outside the zone, repeat visits, stationary vehicles and invalid inputs. `tests/check_conflicts.js` and `tests/check_runtime.js` verify the full projection/UI integration. Existing merging, lane override, replay, SVG and JSON tests remain active in CI.
- **Critical limitations:** the zone is a circular local approximation selected from **sampled** body positions, not a surveyed/physically validated conflict polygon. Entry/exit times derive from interpolated poses between fixed-speed samples, not continuous swept-envelope physics. A zone window overlap does **not** prove the actual vehicle bodies collide, and off-time zone sharing does **not** validate the legality or safety of either driver. Braking, give-way rules, speed calibration and pedestrian/cyclist conflicts remain outside this estimate.
- **Next:** allow specific merge/crossing/same-lane connector conflict zones, link occupancy windows to priority and gap acceptance, compare safe/unrestricted predicted outcomes without mutating the initial scenario, and then validate the shared kernel using a priority-controlled T-junction. Benchmark forecast sampling before multi-vehicle demand or AI traffic optimisation.
