# Roundabout Designer

A browser-based, offline-capable **UK left-hand-traffic roundabout schematic and two-vehicle scenario simulator**. Vehicles circulate clockwise, with independently configured entry, circulating and exit lanes.

## Start

Open `index.html` in any modern browser. There is no build step, database, API key or server requirement. To serve the app from Ubuntu or behind a path-prefixed reverse proxy, serve the repository root as static files, e.g. `python3 -m http.server 8080`.

## Road configuration

- Circulating lanes (1–5), lane width, island diameter and drawing spacing.
- Independent entry and exit lane counts for North, East, South and West.
- Movement arrows per entry lane, provisional lane mappings and a continuous SVG road outline.
- Show/hide lane numbers, schematic route connectivity and travelled vehicle paths.
- Export SVG/PNG and import/export scenario JSON.

### Current starting layout

| Approach | In | Out | Permitted movements, driver's leftmost lane first |
| --- | ---: | ---: | --- |
| North | 3 | 2 | Left+straight; straight; right |
| East | 3 | 2 | **Left+straight; straight; straight+right** |
| South | 4 | 2 | Left; left+straight; straight; right |
| West | 3 | 2 | Left+straight; straight; right |

## Two-vehicle playback

1. Configure vehicles A and B **below the road diagram**: approach, lane, target circulating lane, destination exit, exit lane and speed.
2. By default, exit destinations respect that entry lane's permitted arrows. Tick **Override lane turn rules** on a vehicle to make all four exits selectable for a deliberate rule-breaking scenario. The vehicle card shows a warning if its selected exit is prohibited.
3. Choose **Safe following** or **Unrestricted / risky**, adjust playback speed and press **Play**, **Pause** or **Step +5°** above the diagram.
4. Toggle **Show travelled paths** to follow A and B; the **Scenario activity** panel records simulated elapsed time, approximate give-way waiting time and events such as merging and exiting.
5. **Replay scenario** returns the vehicles to their positions at the first Play/Step of this run while retaining their selected routes and overrides. Editing a vehicle or road configuration starts a new scenario snapshot. **Export events CSV** saves the current event history.
6. **Reset defaults** resets the whole road configuration; **Save JSON** preserves the current editable configuration, while telemetry/event history remains a per-run temporary record.

Example: choose East lane 2 for A (straight-only) and enable **Override lane turn rules** to send A to **South** instead of the normal **West** exit. Set B in East lane 1 targeting circulating lane 1. Separate, noncrossing lane merges may proceed together.

## CI

GitHub Actions runs source checks, JavaScript syntax validation and executable tests of the perimeter geometry, merge trajectories, outbound routes, parallel merges, rule-breaking route overrides and scenario replay/activity metrics.

## Limitations and future development

This is a **visual prototype, not a verified traffic-engineering model**. Give-way checks, safe following and lane-conflict rules are simplified. Trails and approximate wait times do not establish a real-world crash, priority fault, safe distance or traffic capacity. Vehicle speeds are angular playback rates rather than calibrated km/h; exit trajectories do not yet simulate mandatory weaving/lane changing.

The planned next stages are better route geometry and conflict modelling, segment-specific circulating lanes, demand inputs, reproducible traffic flow and statistics, and optional AI analysis that does not alter the deterministic simulator. See `DEVELOPMENT.md` and `SIMULATION_ARCHITECTURE.md`.

## Planned multi-junction architecture

The next development stage will extract the existing single-file application into **maintainable frontend modules**, using a common directed lane graph, road segments, entry merges, exit diverges, priority rules and path-based vehicle conflict analysis. The current roundabout remains the regression baseline; a basic priority T-junction will be the first proof that the same engine can drive another junction type.

The app will **remain a static/offline browser application initially**. Browser Web Workers are preferred for heavy numerical simulations that would block the interface. An authenticated Ubuntu computation API and persistent storage are optional later capabilities for large batches, shared scenarios or scheduled work, not requirements for clean code organisation. Details and implementation acceptance tests are specified in [INTERSECTION_CORE_PLAN.md](INTERSECTION_CORE_PLAN.md) and [SIMULATION_ARCHITECTURE.md](SIMULATION_ARCHITECTURE.md).

## Longer-term map-based traffic experiments and optimisation

The planned common engine will eventually allow users to import an area from verified geographic road-network data, correct lane/priority details, edit legal lane or junction rules, and compare **baseline versus alternative** multi-vehicle simulations for throughput, waiting, queues and neighbouring junction impacts. Rule-only alternatives will be investigated before potential physical alterations such as extra lanes or changed junction layouts. An optional AI assistant may propose and explain candidate designs, but a separate deterministic simulator will evaluate each under consistent demand, constraints and documented uncertainty. **These future features are not yet part of the V1.26 application.** See [TRAFFIC_OPTIMISATION_PLAN.md](TRAFFIC_OPTIMISATION_PLAN.md).

## V1.27 static modular source layout

The app still runs by opening `index.html` or serving the repository root; there is no build/install requirement. The UI is now a small HTML page loading relative assets:

- `src/styles.css` — layout and presentation.
- `src/state.js` — initial UK lane configuration and scenario state.
- `src/simulation.js` — A/B motion, replay, route overrides, events and preliminary safe-driving checks.
- `src/controls.js` — vehicle cards, editor controls and user interaction.
- `src/geometry.js` — road shapes and road/path helpers.
- `src/render.js` — SVG road and vehicle drawing.
- `src/bootstrap.js` — export/import and initialisation.

Classic scripts currently share scope for backwards compatibility; pure ES modules and DOM-independent simulation APIs are the **next** refactor, not yet completed. **Ubuntu/UDA deployment must publish the entire `src/` directory** along with `index.html`; copying only the HTML file will no longer start the app. Paths are relative to support `/apps/roundabout-designer/` deployments. CI also includes static-module and full-script-startup smoke tests.

## V1.28 directed-lane network foundation

- `src/lane-network.js` — **pure** lane graph, stable lane and junction-node IDs, legal turn options, provisional route plans, preliminary parallel/crossing merge relationship classification, and the vehicle-pose sampler used by both drawing and travel trails.
- The default roundabout contains **8 junction nodes, 16 directional segments, 45 directed lanes and 18 permitted turn options**. The network remains a schematic topology model; physical lane-transition geometry and time-based conflict analysis come next.
- The A/B vehicle cards now show a **Lane path** summary. East lane 2 is straight-only by default; an intentional East lane 2 → South left-turn override remains available and visibly labelled.
- Existing exports, animations, trajectory curves and lane settings are retained. UDA must deploy the new `src/lane-network.js` together with the rest of the static asset directory.

## V1.29 projected route interaction
- The A/B settings now show a **Projected route interaction** readout for the next 8 seconds, checking where the two projected car centreline paths are close together and whether their predicted arrival times coincide.
- **Show projected conflict location** draws a blue ring for paths intersecting at different forecast times and an amber ring for possible simultaneous proximity. The toggle is included in saved JSON.
- This is a non-invasive visual warning; **Safe following**, **Unrestricted / risky**, playback and legal/override exit selection all still behave as before. It does not determine a crash or driving responsibility.
- The numerical kernel lives in `src/conflict-engine.js` and can be reused for future junction types. `src/conflict-projection.js` currently adapts roundabout movement and intentionally assumes constant speed with no yielding/braking. The model's 2.4 m centreline proximity threshold is a visual screening convention, **not** a calibrated clearance standard.

## V1.30 adjustable vehicle dimensions and body conflicts

Vehicle A and B cards now allow **Length (m)** and **Width (m)** to be edited independently (default **4.4 × 1.8 m**). The roundabout drawing scales each car to these dimensions and the values are preserved in exported/imported JSON. This lets you compare a compact car with a long vehicle on the same scenario.

The **Projected route interaction** preview compares sampled **oriented car bodies**, not just centre points. It reports preliminary crossing/merge/diverge/following interactions and indicates whether predicted proximity occurs at the same time (amber) or only when considering the paths at different times (blue). The current body-edge screening margin is **0.15 m**; it is a user-interface threshold, not an engineering safety standard.

Predictions still assume constant configured angular speeds and do not simulate yielding, braking, real-world vehicle swept paths between samples, legal fault, or a confirmed collision. The existing safe and unrestricted playback modes remain unchanged. Regression tests cover car dimensions, projected interactions, route overrides and UI rendering.

## V1.31 shared-zone occupancy timing
The **Projected route interaction** panel now includes a separate **Zone timing** readout: approximate seconds when A and B enter and leave the same predicted vehicle-body interaction area, plus the estimated **overlap duration** or **time gap**. An optional translucent area appears around the interaction marker, representing a provisional **0.9 m radius** shared zone.

This is a more informative interpretation of the existing body-size-aware forecast, **not** a verified collision detector. Predicted windows are based on constant-speed sampled/interpolated movement over the next eight seconds; a shared zone occupied at overlapping times need not mean the cars actually collide. The zone radius is an inspection convention, not a mandated safe separation. Vehicle braking, priority decisions and continuous vehicle sweeps are still future work.

The reusable implementation is `src/conflict-zones.js`, loaded with the other static browser scripts. The expanded automated suite includes `tests/check_zones.js` for time-window and repeated-visit handling.

## V1.33 optional right-turn lane preparation
For a conventional UK right turn, set a vehicle's entry lane, **Circulating destination lane** (e.g. lane 3, inner), **Exit destination** (e.g. North when entering from East), and tick **Plan safe outward lane changes before right-turn exit**. The simulated car then plans a staged **3→2→1** path, with an animated lane transition for each move. In **Safe following** mode it screens the target lane for the other car. When blocked or too close to its exit, it continues around rather than cutting across. Unrestricted mode bypasses the initial gap check for deliberate risky simulations.

The checkbox is **off by default**, so existing scenarios work as before. The event monitor/CSV records lane-change starts/completions, blockages and missed exits; the state is JSON-saveable. This is a schematic *conventional-roundabout* experiment, **not** a general rule that drivers must drift continuously outwards. UK Highway Code Rule 186 advises remaining towards the right until needing to change lanes to exit, subject to signs and road markings; special spiral exits are **not** handled yet. Existing two-car safety limitations remain.

## V1.34 exit lane marking editor
Each arm tab now also configures the **exit on that arm**. Set **Exit lane markings** to **Conventional** (the outside circulating lane prepares for the exit) or **Marked dual exit** (a deliberately simple, declared 1→1 and 2→2 continuation). The lane recommendations and vehicle cards show which circulating and exit lane are connected. The dual-exit option requires at least two circulating and two outgoing lanes; otherwise conventional rules safely apply.

To experiment with a right turn from **East to North**, set North's exit to **Marked dual exit**, choose East entry lane 3 with circulating target lane **2**, select North as the exit, and tick the per-vehicle **Use declared right-turn exit routing** checkbox. That opted-in car may continue from circulating lane 2 into North exit lane 2 without an artificial transition into circulating lane 1. A car in circulating lane 3 has no declared link, so it keeps circulating and records a missed exit. The opt-in remains **off by default** for existing scenarios.

The marker on the road is a schematic annotation, **not** mapped paint, real spiral geometry or a safety guarantee. This version does not validate the changing physical lane centreline or all body interactions with outer-lane traffic; do not use it for accident attribution or certified traffic engineering. Mode choices persist in JSON and older files default to conventional.

## V1.35 editable marked exit connectors and shared route centreline
In **Approach configuration**, choose an arm and open **Exit lane markings → Custom marked lane connections**. Each circulating lane can either have **No exit** or connect to a specified outgoing lane. For example, with three circulating and three North outbound lanes you may define **1→1 and 3→3**, leaving circulating lane 2 without a direct North exit. The editor prevents duplicate outbound lanes, backwards/crossing lane mappings and invalid ranges; an invalid JSON connector configuration is rejected.
  
For the movement simulation, enable **Use declared right-turn exit routing** on an East→North vehicle. A car in circulating lane 3 follows the declared **3→3** exit; one in unconnected lane 2 continues around. The route preview states the actual mapped outgoing lane. Turn on **Show route connections** while viewing North to see the same sampled marked guide that supplies vehicle movement, telemetry and projected interaction positions. Marked inside-lane routes ease outwards before the exit and join its curved path without a heading jump.

All new mappings are saved in JSON; existing `conventional` and `spiral-dual` presets remain, as does legacy behaviour with the vehicle option off. **This is still a schematic simulation**, not a survey-derived spiral marking, a verified safe lane-change design or evidence of fault.
