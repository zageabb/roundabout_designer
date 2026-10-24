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
