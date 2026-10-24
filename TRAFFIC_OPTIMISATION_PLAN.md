# Traffic rules, map-derived networks and optimisation roadmap

**Status:** Agreed future direction, specification only. Not implemented in the current V1.26 two-vehicle demo. This document extends [INTERSECTION_CORE_PLAN.md](INTERSECTION_CORE_PLAN.md) and [SIMULATION_ARCHITECTURE.md](SIMULATION_ARCHITECTURE.md).

## Product goal

Start with either a manually designed junction or a **real map-derived connected road network**, correct lane topology and priority details in an editor, define expected traffic demand, and **compare a baseline against rule-only and physical-layout alternatives**. Later an optional AI assistant proposes experiments and explains simulation results; numerical simulation and optimisation remain independently testable without AI.

A typical workflow:

1. **Select:** draw an area on a map, enter coordinates/place or import a road-network file. Keep manual junction construction as a first-class option.
2. **Build:** derive directed road segments, junction nodes, lanes and connections. Preserve source identifiers and geographic coordinates; calculate a project-local metric geometry for path and collision calculations.
3. **Verify:** display provenance/confidence and request confirmation where mapping lacks reliable lane counts, turn restrictions, signals, give-way controls, speed limits or road geometry. Never silently invent lane-level detail.
4. **Define traffic:** input turning counts / origin-destination flows by time period, demand scenarios, vehicle mix and signal timings. Distinguish **measured**, **derived** and **assumed** values.
5. **Baseline:** validate the connected network; simulate a reproducible, fixed-step baseline with consistent routing, warm-up, seed and boundary demand.
6. **Edit rules:** save an immutable variant, add or remove lane movement permissions, change priority, one-way directions, turn bans, merge/yield settings, signal phases and coordination, approach speeds, lane dedication or restricted times. Check network connectivity and user-defined legal/safety constraints.
7. **Edit layout (optional):** add/remove/reallocate approach or circulating lanes, alter taper lengths, lane connectors, storage/turn pockets, roundabout geometry or junction type. Separate changes needing physical construction from purely operational changes.
8. **Compare:** run baseline and alternatives using equivalent demand and matched seeds; show queues, throughput, travel time, waiting, conflicts, bottlenecks, throughput under saturation and impacts on neighbouring junctions, including uncertainty.
9. **Optimise:** search candidate rule sets first, then constrained physical designs if allowed; present a ranked **Pareto trade-off** of capacity/delay/safety/cost/space rather than claiming one universal best result.
10. **Review and export:** show map overlays, side-by-side results and differences, constraints, assumptions, data provenance and a reproducible scenario package. Human approval is required to apply or publish any candidate.

## Editable rules and restrictions (road network data, not UI-only flags)

| Level | Examples | Minimum model |
| --- | --- | --- |
| Lane | L/S/R restrictions, bus-only, dedicated left-turn, lane continuity, turning pocket | Stable lane ID; allowed connector IDs; vehicle-class/time restrictions |
| Connector | Entry -> circulating lane -> exit lane, prohibited movements, merging order | Directed canonical trajectory and priority references |
| Junction | Give way, stop, yield to circulating lane, signal control, conflict zones | Junction node + control policy + permitted phase/priority |
| Road segment | One-way/two-way, direction, speed, access class, reversible operation | Directed segment and time-dependent rule set |
| Signal | Green splits, cycle time, offsets, protected turns, pedestrian phases | Signal program + temporal stage + intergreen constraints |
| Area | Restricted turns, diversion, closures, heavy-vehicle routing | Network-wide route constraints and demand assignment |

The existing **per-driver 'Override lane turn rules'** deliberately breaks a rule and must remain separate from **editing the junction's legal rules**. A scenario where one driver ignores straight-only markings is not equivalent to changing the road markings to permit a left turn for everyone.

## Data model additions

- `SourceNetwork`: map dataset/version, licences/attribution, geometry, source IDs, survey status and timestamps.
- `NetworkValidationIssue`: missing lane, nonconnected route, contradictory control, unknown right-of-way, invalid signal stage or geometry.
- `TrafficDemand`: temporal origin-destination matrix, turning counts, traffic classes, measured/inferred flag and uncertainty.
- `RuleSet`: stable IDs and per-lane, connector, junction and time-dependent restrictions with validity periods.
- `LayoutVariant`: geometry and topology differences from an immutable baseline, construction assumptions, estimated costs and affected areas.
- `Experiment`: baseline snapshot, candidate variant, objective weights, constraints, shared demand horizon, warm-up, fixed step, seeds, engine and data versions.
- `ExperimentResult`: metrics by junction, approach and lane; network totals; queue and delay distributions; event diagnostics, route performance and sensitivity.
- `OptimisationProposal`: machine-readable patch, provenance, expected benefit/range, drawbacks, violations and approval status.

Ensure JSON schema versioning, units, coordinate reference systems, validation, migration and deterministic round-trip tests. Map-derived roads must be normalised into the **same lane graph** that manually drawn roads use, not a second simulation engine.

## Measuring actual effects

For each scenario report:
- Vehicles entering, processed, remaining in network and unserved demand.
- Mean and 95th-percentile travel times / delays and queue lengths by approach.
- Average and peak throughput; bottleneck utilisation; spillback and downstream queue displacement.
- Approximate conflict-zone occupancy, near-conflict metrics and rule violations, **not** unvalidated accident predictions.
- Comparison to **identical** baseline inputs and matched random seeds, with repetitions and variance bands for stochastic arrivals.
- Sensitivity to demand growth, traffic class mix and uncertain lane/turn-count inputs; note that a change helping one junction might worsen another.

Do not produce authoritative volume/capacity claims when only map topology or synthetic demand exists. Mark every statistic as observed, calibrated estimate or scenario-modelled result and display assumptions.

## Optimisation architecture

**Deterministic simulation engine** is the numerical source of truth; **candidate search** is a separate pure module. AI is **optional and advisory**, never the simulation physics.

### Stage 1 — rule-only search
Use enumeration / heuristic search where candidate counts are manageable, then black-box search for larger constrained spaces. Explore legal connector mappings, lane dedication, permitted movements, priority or signal programmes without changing land footprint. Reject variants failing network validation, vehicle-access constraints, safety checks or protected phases. Store every candidate and result.

### Stage 2 — physical modifications
Expand proposals to add lanes, change taper geometry, allocate turn pockets, change intersection type or convert a priority junction to signals. Model feasibility constraints: available right-of-way, turning radii, pedestrian/cycle access, bus movement, construction cost/disruption, safety, legal/engineering constraints and land ownership where known. Return `requires survey` when impossible to verify.

### Stage 3 — optional AI assistant
Accept a bounded question such as *'Reduce morning-peak delay while keeping the existing road footprint'*; the assistant turns it into explicit candidate edits/objectives and can review result sets and generate human-readable explanations. It cannot silently change geometry/rules, fabricate counts or claim simulation improvements before the engine has tested them. Expose a **human-review/approve** step for recommendations, plus a traceable explanation of each proposed patch.

### Comparison UX
- Map canvas: baseline and candidate with affected lanes/junctions highlighted, route and delay heatmaps.
- Side-by-side results and deltas with time-of-day demand selector.
- Change history: `Existing layout`, `Rules only`, `Geometry change`, `AI suggested` with feasibility status and trade-offs.
- What-if presets: adding a left-turn lane, prohibiting a right turn, signal re-timing, demand +10%, junction conversion.
- Re-run, share and export a reproducible package (network source, edits, demand, engine version, seed, results).

## Map ingestion stages

1. Start with manually edited junction graph and import a **small** selected OpenStreetMap road network to preview connectivity; keep raw dataset provenance and attribution.
2. Build an editor for ambiguous lane/turn details. OSM may omit per-lane restrictions and accurate physical widths. Optional appropriately licensed aerial imagery may help user correction, but image recognition results must be reviewed.
3. Compose several connected junctions with a consistent lane graph; support sources/sinks at area boundaries.
4. Introduce larger-area traffic demand, path assignment and multi-vehicle simulation only after consistent connectivity and performance benchmarks.
5. Later accept surveyed lane marking, traffic signal and count datasets where licensed; integrate with external traffic microsimulation tools only if useful and validated.

## Dependency-based delivery sequence

1. Protect V1.26 and modularise its static application according to INTERSECTION_CORE_PLAN.
2. Build canonical lane graph, path-based vehicle engine, priority and shared conflict-zone analysis; test roundabout and a T-junction.
3. Create editable, validated **network RuleSet** distinct from the individual driver's unsafe-rule override; implement immutable what-if variants and scenario diffs.
4. Multi-vehicle reproducible engine and demand matrix; provide real metrics and baseline-to-variant comparisons.
5. Initial geographic map importer + missing-data review for a small area; compare map import vs manual model of the same junction.
6. Extend traffic assignment to connected junctions and network effects; add throughput/queue visualisations.
7. Deterministic rule-only candidate search (non-AI), constraint checking and repeatable ranking.
8. Optional geometry modifications with engineering/land/cost feasibility and explicit uncertainty.
9. Optional AI proposer/explainer over the established deterministic engine and comparison API; require approval and complete audit trail.
10. Scale with Web Worker first; introduce secured Ubuntu backend for large batch optimisations, persistence or multi-user work only when supported by benchmarks.

## Acceptance/regression scenarios

- **Rule edit vs driver violation:** East lane 2 left turn should remain illegal when only an individual car overrides it; a legal lane-rule edit affects all vehicles using that lane and updates connectors/validation.
- **Right-of-way:** allowed straight flows, independent parallel merges, crossings and illegal turn conflicts produce sensible warnings without claiming real-world crashes.
- **T-junction reuse:** import/create one-way joining branch and a conventional two-way T-junction with correct crossing conflicts using the same engine.
- **Baseline fairness:** unmodified variant reproduces identical aggregate metrics and events under same seed, timestep and demand. Improvement/degradation is calculated from actual paired simulation results.
- **Network effects:** local turn ban reroutes demand and may shift queue to another approach; network totals conserve vehicles.
- **Map data:** missing turn-lane details are flagged for manual validation; topology is not silently declared accurate.
- **Optimisation:** rejected variants never win, objectives and constraints are inspectable, and no untested AI recommendation is labelled a proven benefit.
- **Offline:** everything except optional remote data retrieval / heavy server jobs still works without Ubuntu backend or AI credentials.

**Safety and accuracy:** the app is for planning and comparative modelling, not an approved highway layout design, accident reconstruction, proof of legal fault or authoritative capacity forecast without field calibration.
