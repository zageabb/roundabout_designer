// Smoke-test the complete ordered browser application without a live server.
// Uses a minimal DOM test double to verify initialization, playback and replay
// after extracting CSS and JavaScript into independent static assets.
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {getJavaScript}=require('./read_app');
const elements={};
function element(id){
 if(!elements[id]){
  elements[id]={
   id,innerHTML:'',textContent:'',value:'20',checked:true,style:{},
   addEventListener(){},querySelectorAll(){return []},
   click(){},getAttribute(){return null}
  };
 }
 return elements[id];
}
const context=vm.createContext({
 document:{getElementById:element},
 structuredClone,Math,Number,Array,Object,Date,Set,JSON,
 requestAnimationFrame:()=>123,cancelAnimationFrame:()=>{},
 console,
});
const app=vm.runInContext(getJavaScript()+'\n;({state,draw,advanceVehicles,renderControls,normalizeVehicles,stopPlayback,circularExitStart,clearScenario,getActivity:()=>runState});',context);
assert.match(elements.view.innerHTML,/<svg id="diagram"/);
assert.match(elements.view.innerHTML,/A<\/text>/);
assert.match(elements.view.innerHTML,/B<\/text>/);
assert.match(elements.vehicles.innerHTML,/Override lane turn rules/);
assert.match(elements.vehicles.innerHTML,/Exit destination/);
assert(elements.replayCars.onclick && elements.playCars.onclick && elements.pauseCars.onclick);
assert(elements.showTrails.onchange && elements.exportEvents.onclick);
assert.equal(app.state.arms.East.moves[0],'LS');
assert.equal(app.state.arms.East.moves[1],'S');
const first=JSON.stringify(app.state.vehicles);
app.advanceVehicles(5);
assert.match(elements.runSummary.textContent,/Elapsed/);
assert.match(elements.view.innerHTML,/<svg id="diagram"/);
assert.notEqual(JSON.stringify(app.state.vehicles),first,'Playback moves an entering vehicle');
elements.replayCars.onclick();
assert.equal(JSON.stringify(app.state.vehicles),first,'Replay restores original positions');
assert(elements.runSummary.textContent.includes('Elapsed 0.0 s'));
// A road edit that removes an approach lane must not leave a stale lane ID
// in the route preview or crash the scenario controls.
app.state.vehicles.A={arm:'East',side:'entry',lane:3,targetLane:3,speed:20,exitArm:'West',entryLane:3,progress:0};
app.state.arms.East.in=1;app.state.arms.East.moves=['S'];
app.normalizeVehicles();
assert.equal(app.state.vehicles.A.lane,1);
assert.equal(app.state.vehicles.A.entryLane,1);
app.renderControls();
assert.match(elements.vehicles.innerHTML,/Lane path: East entry 1/);
// The full UI should expose a geometric warning and (when enabled) the
// corresponding marker, without interfering with legacy safe following.
app.state.arms.East.in=3;app.state.arms.East.moves=['LS','S','SR'];
app.state.vehicles.A={arm:'East',entryLane:1,side:'merging',lane:1,targetLane:1,mergeProgress:0,speed:20,exitArm:'South',exitLane:1,angle:90};
app.state.vehicles.B={arm:'East',entryLane:2,side:'merging',lane:2,targetLane:1,mergeProgress:0,speed:20,exitArm:'West',exitLane:1,angle:90};
app.state.showConflictZones=true;
app.draw();
assert.match(elements.projectedConflict.textContent,/Possible simultaneous path occupancy/);
assert.match(elements.zoneTiming.textContent,/Zone timing — A: /);
assert.match(elements.zoneTiming.textContent,/B: /);
assert.match(elements.zoneTiming.textContent,/shared-zone occupancy overlaps/);
assert.match(elements.view.innerHTML,/Projected interaction location/);
assert.match(elements.view.innerHTML,/class="projected-conflict-zone"/);
app.state.showConflictZones=false;
app.draw();
assert.doesNotMatch(elements.view.innerHTML,/Projected interaction location/);
assert.match(elements.projectedConflict.textContent,/Possible simultaneous path occupancy/);
assert.match(elements.zoneTiming.textContent,/shared-zone occupancy overlaps/);
// Vehicle size inputs must update both the configuration and the visible
// body graphics; JSON serialization carries the chosen footprint unchanged.
app.state.vehicles.A.lengthMetres=8;
app.state.vehicles.A.widthMetres=2.6;
app.renderControls();app.draw();
assert.match(elements.vehicles.innerHTML,/data-field="lengthMetres" value="8"/);
assert.match(elements.vehicles.innerHTML,/data-field="widthMetres" value="2.6"/);
assert.match(elements.view.innerHTML,/width="24\.7" height="76" rx="6"/);
const exportedVehicle=JSON.parse(JSON.stringify(app.state.vehicles.A));
assert.equal(exportedVehicle.lengthMetres,8);
assert.equal(exportedVehicle.widthMetres,2.6);
app.state.vehicles.A.lengthMetres=99;
app.state.vehicles.A.widthMetres=0;
app.normalizeVehicles();
assert.equal(app.state.vehicles.A.lengthMetres,12);
assert.equal(app.state.vehicles.A.widthMetres,1.8);
// Full right-turn scenario: start inner, enter outside lane in two discrete
// completed manoeuvres, then exit. The existing unchecked behaviour is intact.
const exitStart=app.circularExitStart('North',app.state);
function preparedCar(){return {arm:'East',side:'circulating',lane:3,targetLane:3,
 entryLane:3,angle:(exitStart-55+360)%360,exitArm:'North',exitLane:1,
 speed:20,autoLaneChange:true,lengthMetres:4.4,widthMetres:1.8};}
function spareCar(){return {arm:'South',side:'exit',lane:1,speed:0,exitArm:'none'};}
app.clearScenario();
app.state.drivingMode='safe';
app.state.vehicles={A:preparedCar(),B:spareCar()};
app.normalizeVehicles();
for(let i=0;i<19;i++)app.advanceVehicles(5);
assert(['exiting','exit'].includes(app.state.vehicles.A.side),'A should exit after reaching outer lane');
assert.equal(app.state.vehicles.A.lane,1);
assert.equal(app.getActivity().events.filter(e=>e.event==='lane change completed').length,2);
assert.equal(app.getActivity().events.filter(e=>e.event==='missed exit').length,0);

// Another car in the adjacent lane prevents the first outward movement;
// if the turn cannot be finished, car A must continue past its chosen exit.
app.clearScenario();
app.state.drivingMode='safe';
app.state.vehicles={A:preparedCar(),B:{...preparedCar(),lane:2,targetLane:2,autoLaneChange:false,exitArm:'none'}};
app.normalizeVehicles();
for(let i=0;i<18;i++)app.advanceVehicles(5);
assert.equal(app.state.vehicles.A.side,'circulating');
assert.equal(app.state.vehicles.A.lane,3);
assert.equal(app.state.vehicles.A.autoLaneChange,true);
assert(app.getActivity().events.some(e=>e.event==='lane change blocked'));
assert(app.getActivity().events.some(e=>e.event==='missed exit'));
assert(!app.getActivity().events.some(e=>e.event==='lane change completed'));

// Unrestricted mode intentionally allows a conflicting outward manoeuvre,
// but it is still drawn and tracked as a real gradual lane transition.
app.clearScenario();
app.state.drivingMode='unrestricted';
app.state.vehicles={A:preparedCar(),B:{...preparedCar(),lane:2,targetLane:2,autoLaneChange:false,exitArm:'none'}};
app.normalizeVehicles();
app.advanceVehicles(5);
assert(app.state.vehicles.A.laneChange,'Unrestricted mode should start manoeuvre');
assert.equal(app.state.vehicles.A.laneChange.toLane,2);
assert(app.getActivity().events.some(e=>e.event==='lane change started'));
app.state.drivingMode='safe';
// User-declared dual-spiral exit: ring 2 connects directly to outbound lane
// 2; ring 3 has NO declared exit path, so it must not cut across ring 2.
app.clearScenario();
elements.exitLaneMode.value='spiral-dual';
elements.exitLaneMode.onchange();
assert.equal(app.state.exitLaneModes.North,'spiral-dual');
assert.match(elements.exitLaneNotice.textContent,/circulating 2/);
assert.match(elements.view.innerHTML,/1→1 · 2→2/);
app.state.vehicles={A:{...preparedCar(),lane:2,targetLane:2,
 angle:(exitStart-1+360)%360,exitLane:1,autoLaneChange:true},B:spareCar()};
app.normalizeVehicles();
app.advanceVehicles(5);
assert.equal(app.state.vehicles.A.side,'exiting','Declared ring 2 exit should be reachable');
assert.equal(app.state.vehicles.A.exitLane,2,'Declared lane connection selects outbound 2');
assert(app.getActivity().events.some(e=>e.event==='marked exit'));
app.clearScenario();
app.state.vehicles={A:{...preparedCar(),lane:3,targetLane:3,
 angle:(exitStart-1+360)%360,autoLaneChange:true},B:spareCar()};
app.normalizeVehicles();
app.advanceVehicles(5);
assert.equal(app.state.vehicles.A.side,'circulating','Unmapped inner lane cannot exit');
assert.equal(app.state.vehicles.A.lane,3);
assert(app.getActivity().events.some(e=>e.event==='missed exit'));
assert(!app.getActivity().events.some(e=>e.event==='marked exit'));

// An unopted, previously saved vehicle still uses its original exit behaviour.
app.clearScenario();
app.state.vehicles={A:{...preparedCar(),lane:3,targetLane:3,
 angle:(exitStart-1+360)%360,autoLaneChange:false},B:spareCar()};
app.normalizeVehicles();
app.advanceVehicles(5);
assert.equal(app.state.vehicles.A.side,'exiting','Legacy opted-out scenarios are unchanged');
app.state.exitLaneModes.North='conventional';
// A custom surveyed-by-user (not auto-inferred) lane 3 → outbound 3 link
// should appear in the editor, graph preview and the actual moving-car route.
app.clearScenario();
app.state.circulating=3;
app.state.arms.North.out=3;
app.state.exitLaneModes.North='custom';
app.state.exitLaneConnectors.North=[
 {fromLane:1,exitLane:1},{fromLane:3,exitLane:3}
];
app.state.showRoutes=true;
app.renderControls();app.draw();
assert.match(elements.exitConnectorEditor.innerHTML,/data-custom-exit-source="3"/);
assert.match(elements.exitLaneNotice.textContent,/circulating 3 → exit 3/);
assert.match(elements.view.innerHTML,/Marked exit centreline 3 to 3/);
assert.match(elements.view.innerHTML,/1→1 · 3→3/);
const encoded=JSON.parse(JSON.stringify(app.state));
assert.deepEqual(encoded.exitLaneConnectors.North,app.state.exitLaneConnectors.North);
app.state.vehicles={A:{...preparedCar(),lane:3,targetLane:3,
 angle:(app.circularExitStart('North',app.state)-1+360)%360,autoLaneChange:true},
 B:spareCar()};
app.normalizeVehicles();
app.advanceVehicles(5);
assert.equal(app.state.vehicles.A.side,'exiting');
assert.equal(app.state.vehicles.A.exitLane,3);
assert.equal(app.state.vehicles.A.lane,3,'Custom marked connector should not jump into outer lane');
app.clearScenario();
app.state.vehicles={A:{...preparedCar(),lane:2,targetLane:2,
 angle:(app.circularExitStart('North',app.state)-1+360)%360,autoLaneChange:true},
 B:spareCar()};
app.normalizeVehicles();
app.advanceVehicles(5);
assert.equal(app.state.vehicles.A.side,'circulating');
assert(app.getActivity().events.some(e=>e.event==='missed exit'));
app.state.showRoutes=false;
app.state.exitLaneModes.North='conventional';
console.log('Browser startup, SVG render, controls, playback and replay smoke-test passed.');
