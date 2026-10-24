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
