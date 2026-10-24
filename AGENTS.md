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
