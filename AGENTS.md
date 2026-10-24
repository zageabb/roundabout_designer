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
