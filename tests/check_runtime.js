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
const app=vm.runInContext(getJavaScript()+'\n;({state,draw,advanceVehicles,renderControls,normalizeVehicles,stopPlayback});',context);
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
assert.match(elements.view.innerHTML,/Projected interaction location/);
app.state.showConflictZones=false;
app.draw();
assert.doesNotMatch(elements.view.innerHTML,/Projected interaction location/);
assert.match(elements.projectedConflict.textContent,/Possible simultaneous path occupancy/);
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
console.log('Browser startup, SVG render, controls, playback and replay smoke-test passed.');
