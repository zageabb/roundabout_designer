#!/usr/bin/env python3
"""Static regression checks for the first UK roundabout configuration."""
from pathlib import Path
import re

html = Path("index.html").read_text()
assert "['South',0],['West',90],['North',180],['East',270]" in html
for name, inbound, outbound, moves in (
    ("North", 3, 2, "LS','S','R"),
    ("East", 3, 2, "L','LS','SR"),
    ("South", 4, 2, "L','LS','S','R"),
    ("West", 3, 2, "LS','S','R"),
):
    expected = f"{name}:{{in:{inbound},out:{outbound},moves:['{moves}']}}"
    assert expected in html, f"Changed initial layout: {name}"
assert "function movementArrow(" in html
assert "for(const [name,x,y]" in html, "Cardinal labels must be outside rotated approach group"
assert "state.circulating" in html
assert "function draw()" in html
assert "rotate(\'+(deg-90)+\')" in html, "Clockwise arrow tangents have changed"
assert "const w=state.width*9.5" in html, "Wider visual lane scaling was removed"
assert "width:4" in html, "Default road lane width must be 4 m"
print("UK lane presets, bearings, detached labels and renderer checks passed.")
