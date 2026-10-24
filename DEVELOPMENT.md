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
