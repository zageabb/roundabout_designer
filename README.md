# Roundabout Designer

A browser-based UK left-hand-traffic roundabout schematic builder.

## Start

Open `index.html` in any modern browser. No installation, build tooling, API key or server is required.

For server deployment, serve the repository root using any static web server (including a path-prefixed reverse proxy). Example: `python3 -m http.server 8080`.

## Current capabilities (v0.1)

- Configurable **circulating lanes (1–5)**, island diameter and nominal lane width.
- Independently configurable entry and exit lane counts for North, East, South and West.
- Entry lane movement rules, ordered from driver's left to right.
- Default UK traffic orientation with clockwise circulation.
- Responsive schematic layout with labelled movements and lane numbers.
- Download SVG/PNG and save/load configurations as JSON.
- No user data sent to a remote service.

## Preloaded scenario

| Arm | In | Out | Lane 1 → last |
| --- | ---: | ---: | --- |
| North | 3 | 2 | Left+straight, straight, right |
| East | 3 | 2 | Left, left+straight, straight+right |
| South | 4 | 2 | Left, left+straight, straight, right |
| West | 3 | 2 | Left+straight, straight, right |

Circulating lanes start at **3** as an editable placeholder; the actual number has not been confirmed.

## Scope and limitations

This is an **initial functional schematic**, not a surveyed or DMRB-compliant highway engineering plan. Geometric shapes are deliberately simplified. Road arrows are labels, lane-boundaries and markings are schematic, and movements are not mapped to lane-by-lane trajectories on the circulating carriageway. Individual segment lane drops, spiral lane lines, entry flare geometry, pedestrian crossing details, swept-path checks, signalised arms and traffic capacity modelling are **not implemented**.

## Roadmap

1. Precise path-based entry/exit transitions and tangency to the circulating annulus.
2. Segment-specific circulating lane counts (between consecutive arms).
3. Spiral lane designation and lane continuity mapping across exits.
4. Editable arm bearings, eccentric islands and one-way/slip bypass roads.
5. Traffic counts and movement matrices, exportable labelled plans.
6. Geometric validity tests and visual snapshot regression tests.
