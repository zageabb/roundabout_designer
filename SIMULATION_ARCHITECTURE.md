# Traffic simulation and AI integration — architecture direction

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
