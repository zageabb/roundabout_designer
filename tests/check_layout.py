#!/usr/bin/env python3
"""Static regression checks for the first UK roundabout configuration."""
from pathlib import Path
import re

html = Path("index.html").read_text() + "\n" + "\n".join(Path("src", name).read_text() for name in ("state.js", "lane-network.js", "conflict-engine.js", "conflict-zones.js", "conflict-projection.js", "simulation.js", "controls.js", "geometry.js", "render.js", "bootstrap.js"))
assert "['South',0],['West',90],['North',180],['East',270]" in html
for name, inbound, outbound, moves in (
    ("North", 3, 2, "LS','S','R"),
    ("East", 3, 2, "LS','S','SR"),
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
assert "const w=state.width*state.displayScale" in html, "Visual lane spacing must be independently configurable"
assert "const extent=end+76, canvas=extent*2" in html, "Canvas must fit expanded geometry"
assert "state.laneNumbers" in html, "Lane-number overlay setting must be retained"
assert "r=inner+state.circulating*w/2" in html, "Circulating arrows should be centered within the annulus"
assert "width:4" in html, "Default road lane width must be 4 m"
assert "function routeDestination(origin,movement)" in html
assert "function deriveConnections(config)" in html
assert "function renderConnectivity()" in html
assert "state.showRoutes" in html
directions = ["North", "East", "South", "West"]
offset = {"L": 1, "S": 2, "R": 3}
presets = {
 "North": ["LS", "S", "R"],
 "East": ["LS", "S", "SR"],
 "South": ["L", "LS", "S", "R"],
 "West": ["LS", "S", "R"],
}
paths = [
 (origin, lane+1, movement, directions[(directions.index(origin)+offset[movement]) % 4])
 for origin, lanes in presets.items()
 for lane, allowed in enumerate(lanes)
 for movement in allowed
]
assert len(paths) == 18
assert ("East", 1, "L", "South") in paths
assert ("East", 1, "S", "West") in paths
assert ("East", 2, "S", "West") in paths
assert ("East", 2, "L", "South") not in paths
assert ("North", 3, "R", "West") in paths
assert ("South", 4, "R", "East") in paths
assert "function provisionalLaneMapping(config)" in html
assert "function validateNetwork(config)" in html
assert "return LaneNetwork.build(config).turns" in html # was: circulatingLane:entry,exitLane:exit,status:'provisional'" in html
assert "Provisional mapping only" in html
assert "function normalizeVehicles()" in html
assert "function renderVehicles()" in html
assert "defaultVehicles()" in html
assert "vehicles:obj.vehicles||defaultVehicles()" in html
assert "v.side==='exit'?'out':'in'" in html
assert "v.side==='circulating'?state.circulating" in html
assert "Angle clockwise from North" in html
assert "radius=inner+(config.circulating-v.lane+.5)*width" in html
assert "heading:v.angle+90" in html
assert "v.angle=45" in html
assert "el.oninput=()" in html
assert 'max="355" step="5"' in html
assert 'data-nudge="-1"' in html and 'data-nudge="1"' in html
assert "function advanceVehicles(delta)" in html
assert "function playbackTick(time)" in html
assert "requestAnimationFrame(playbackTick)" in html
assert "if(v.side==='circulating')" in html
assert 'id="playCars"' in html and 'id="pauseCars"' in html and 'id="stepCars"' in html
assert "function proximityWarning()" in html
assert "v.speed/20" in html
assert 'data-field="speed"' in html
assert "function vehicleConflictAssessment(config)" in html
assert "nearestDegrees*metresPerDegree<8" in html
assert "headway/c.closing" in html
assert "Vehicle '+id+' speed (°/s)" in html
assert "data-field=\"speed\"" in html
assert "function safeAdvance(delta)" in html
assert "state.drivingMode!=='safe'" in html
assert "gapDegrees=state.minGap" in html
assert 'id="drivingMode"' in html
assert 'id="minGap"' in html
assert "function advanceEntries(delta)" in html
assert "const entryAngles={North:0,East:90,South:180,West:270}" in html
# Entry bearings correspond to the compass arms; the smooth curve ends 30 degrees clockwise.
assert "target=entryAngles[v.arm]" in html
assert "const behind=(target-other.angle+360)%360" in html
assert "if(state.drivingMode==='safe'&&!entryGapClear(id))" in html
assert "v.side='circulating';v.lane=v.targetLane" in html
assert 'class="simulation-toolbar"' in html
assert html.index('class="simulation-toolbar"') < html.index('id="view"')
assert html.count('id="playCars"') == 1
assert html.count('id="pauseCars"') == 1
assert "function mergeGeometry(v,progress,config)" in html
assert "const radius=outer-(targetLane-.5)*w" in html
assert "mouths[name]={entry,exit}" in html
assert "terminal.arrivalAngle" in html
assert "Circulating destination lane" in html
assert "Number(v.targetLane??v.lane)" in html
assert "v.targetLane=Math.min(state.circulating,Number(el.value))" in html
assert "function roadSurfaceGeometry(config,outer,end)" in html
assert "const road=roadSurfaceGeometry(state,outer,end)" in html
assert "surface.push('A '+outer+" in html
assert "const dx=Math.max(0,Math.min((lip-width)*.72,56))" in html
assert 'road.surface' in html and 'road.kerbs' in html
assert "const armJoinProfile" not in html
assert "outer*Math.sin(sweep)" not in html
print("Continuous road boundary and simulation controls checked.")
