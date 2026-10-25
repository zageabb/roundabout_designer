# Roundabout lane choice and safe outward transitions — UK Highway Code

**Status:** V1.33 includes opt-in conventional outward lane-change motion; V1.34 includes user-declared dual-exit connector permissions. Surveyed physical spiral-lane geometry remains planned. Apply to the common junction-independent routing/path engine. Last verified against the UK Highway Code on 25 October 2026.

**Official authority:** [GOV.UK — Highway Code, Using the road: Rules 184–187](https://www.gov.uk/guidance/the-highway-code/using-the-road-159-to-203#roundabouts-rules-184-to-190).

## Correct interpretation

- **Rule 184:** choose the exit and appropriate lane early; obey road markings, signs, lights and traffic conditions. Use Mirrors–Signal–Manoeuvre at each stage.
- **Rule 185:** normally yield to traffic from the right on entering unless signs, markings or signals specify otherwise; check vehicles already circulating, even if their signals are absent or misleading.
- **Rule 186, first exit:** normally approach left, signal left, keep to the left through exit, unless local signs/markings specify otherwise.
- **Rule 186, right exit or full circle:** normally approach on the right and signal right; stay towards the right of the circulating carriageway **until the appropriate time to change lanes to leave**; signal left after passing the exit preceding the intended one. This is **not** an instruction to drift progressively left throughout the circle.
- **Rule 186, intermediate exit:** choose an appropriate lane, generally do not indicate on approach, maintain the lane until a change is needed to exit, signal left after passing the prior exit.
- **Rules 186–187:** protect cyclists, horse riders, pedestrians and vehicles (especially large ones) that may occupy the outer lane while travelling further around; an approaching exit or left indicator does **not** create an automatic right to change lanes across existing traffic.
- At lane-marked or spiral roundabouts, **local signs and road markings take precedence** over simplified defaults. An allowed exit can originate from an inner lane **directly into the appropriate exit lane** if the actual lane geometry/markings explicitly permit that connection; do not force an artificial outer-lane hop.
- If the needed lane change cannot be completed safely, **do not cut across traffic**. Simulate delaying the outward move while maintaining a safe path, potentially continuing around for another opportunity when supported, rather than teleporting across lanes or forcing an exit. Do not generalise to every special/signalised roundabout.

## Vehicle route phases and transitions

The current two-car engine uses `entry → merging → circulating → exiting → exit`, with a single `lane` value while circulating. Preserve the existing regression baseline and **introduce**:

1. `EntryLaneSelection`: derive approach lane from local movement arrows and destination; exceptions require explicit driver override, with separate rule-violation telemetry.
2. `CirculatingLanePlan`: select the correct inner/outer circulating path from entrance geometry, signs, arrow rules and intended exit. A right turn commonly enters an inside lane, but not always.
3. `ExitPreparation`: after sufficient travel, identify the previous exit and the forthcoming allowable lane connector. The legal left indicator should begin **after passing the preceding exit**; it does not establish movement priority.
4. `LaneChangeIntent`: directed source lane → target lane connector, required lateral distance, physical sweep, duration and allowed movement markings. In an ordinary unmarked case, right-turning traffic may shift outwards by one lane at a time when safe. In spiral markings, follow the lane itself as it spirals rather than executing a discretionary change.
5. `GapAcceptance`: compute time-overlap of swept body envelopes with the target lane's vehicles and merge/crossing zones; check beside/behind as well as ahead, cyclist and long-vehicle assumptions once those models exist. Safe mode yields/holds; unrestricted mode may deliberately violate.
6. `ExitConnector`: use only an actual permitted geometry connection to the requested exit lane. Failure to complete a needed lane change **must not** snap from an inner ring lane across intervening traffic to the exit.
7. `Replay/telemetry`: log indicator state, lane-change requested, waiting for target-lane gap, move started/completed, missed exit / continued circling, explicit overridden rule and estimated conflict-zone occupancy.

**Lane numbering in the current app:** `1` = outside/left circulating lane; increasing indexes move towards the centre. A typical two-lane right turn may follow `approach right → circulating lane 2 → safe connector 2→1 when necessary → exit`. This is an example, not a universal enforced path. For three or more circulating lanes allow a sequence of marked or individually checked connectors, not a single jump to lane 1.

## Safety and geometry invariants

- Right-turn intention does **not** imply an automatic/continuous outward lane drift. Determine the exit's required lane **from local arrows/geometry** before scheduling any lane change.
- Never move straight from `lane N` to `lane 1` when intermediate lanes are occupied without a valid safe path; each lateral transition needs testable temporal clearance and vehicle dimensions.
- A left signal after the preceding exit is the usual advice but should **not be simulated as proof a car is leaving** or as granting right-of-way.
- Preserve `overrideExitRules` as an individual-car behavioural choice, separate from modifying a junction's `RuleSet`. Keep change-of-lane indicators separate from route intention.
- Centreline crossings, sampled zone overlap and right-turn movements are **not** actual accident/fault determinations; use only evidence-backed conflict descriptors.
- A default roundabout procedure does not supersede painted lane spirals, destination markings, traffic signals or special movement restrictions.

## Rollout and regression acceptance

1. Add declarative `LaneChangeConnector` and exit-lane mapping to shared graph; no drawing changes until verified against existing East/South vehicle paths.
2. Add deterministic geometric trajectories for a full lane-change phase, with heading continuity and sampled vehicle bodies.
3. Add safe-target-lane gap screening using existing `ConflictZones` windows; preserve independent parallel movement on nonintersecting connectors.
4. Introduce planned lane change and `blocked` state; show which lane a car is trying to enter. If blocked, delay, replan or continue circulating instead of forcing the exit.
5. Add vehicle indicator state and previous-exit timing while allowing local marking exceptions.
6. Test two-lane right turn entering inner and exiting after safe outward move; blocked outer lane; a following vehicle in target lane; car undertaking to next exit; spiral exit directly from inside lane; three-lane sequential crossing; cyclist using outer lane to continue; prohibited left from straight-only entry lane; safe versus unrestricted mode; replay and JSON compatibility.
7. Verify in the browser on Ubuntu after green CI, and keep map-derived/imported lane markings editable/explicitly uncertain.

**Never describe these lane-change behaviours as existing features until implemented and verified.**

## V1.33 implementation note
The first **opt-in** outward-transition prototype is now implemented for a conventional right-turn route in `src/lane-changes.js`, `src/simulation.js`, and the shared pose/forecast adapters. Vehicles transition one circulating lane at a time when a simple target-body gap screen passes (safe mode), or deliberately skip that check in unrestricted mode. If the outside lane is not reached, the vehicle continues around and logs a missed exit instead of crossing multiple lanes instantaneously. The experiment is **off by default** to preserve V1.32 scenarios. Marked/spiral-lane semantics, signals/indicators, heavy vehicles, cyclists and continuous swept-envelope safety still need separate development; no real-world compliance or safety certification is claimed.

## V1.34 exit-lane marking policy implemented
A simple per-exit lane marking rule now exists in the running simulator. `conventional` requires entering the exit from the outside circulating lane, whereas an *illustrative* `spiral-dual` rule declares circulating lane 1→exit lane 1 and circulating lane 2→exit lane 2. The opt-in right-turn planner honours those explicit links and refuses to jump from lane 3 into an undeclared lane-2 connector. This provides a testable representation of lane **permissions**, not a physically surveyed spiral geometry. The actual markings, transition path through the arc, give-way and downstream interaction rules remain future work.

The initial specification's opening status must be read as historical planning scope: **V1.33 implemented opt-in conventional outward changes, and V1.34 implements declared dual-exit connector permissions; validated continuous spiral-lane geometry has not yet been implemented.**
