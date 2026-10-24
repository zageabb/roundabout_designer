// End-to-end unit checks for replay snapshots, traces and scenario telemetry.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=require('./read_app').readAppSource();
function section(a,b){const i=html.indexOf(a),j=html.indexOf(b,i);assert(i>=0&&j>i,'Missing '+a);return html.slice(i,j)}
const ui={runSummary:{textContent:''},runEvents:{textContent:'',innerHTML:''},playSpeed:{value:20}};
const state={circulating:3,diameter:38,width:4,displayScale:9.5,showTrails:true,arms:{
 North:{in:3,out:2,moves:['LS','S','R']},East:{in:3,out:2,moves:['LS','S','SR']},
 South:{in:4,out:2,moves:['L','LS','S','R']},West:{in:3,out:2,moves:['LS','S','R']}
}};
const ctx=vm.createContext({state,structuredClone,entryAngles:{North:0,East:90,South:180,West:270},
 $:id=>ui[id]||(ui[id]={textContent:'',innerHTML:''}),
 renderVehicles(){},draw(){},stopPlayback(){},updateStatus(){}});
const src=[
 section('function routeDestination(origin,movement){','function deriveConnections('),
 section('const defaultVehicles=()=>','function stopPlayback(){'),
 section('function mergeGeometry(v,progress,config){','function entryGapClear('),
 section('function exitGeometry(v,progress,config){','function advanceVehicles('),
 section('function roadSurfaceGeometry(config,outer,end){','function draw(){')
].join('\n');
const api=vm.runInContext(src+'\n;({normalizeVehicles,startScenario,replayScenario,clearScenario,trackScenarioTick,addScenarioTrace,renderScenarioActivity,vehicleWorldPosition,details:()=>({runState,scenarioBaseline})});',ctx);
state.vehicles={
 A:{arm:'East',entryLane:2,side:'entry',lane:2,targetLane:2,exitArm:'South',exitLane:1,overrideExitRules:true,speed:20,progress:0},
 B:{arm:'East',entryLane:1,side:'entry',lane:1,targetLane:1,exitArm:'West',exitLane:1,overrideExitRules:false,speed:20,progress:0}
};
api.normalizeVehicles();
api.startScenario();
let run=api.details().runState;
assert.equal(run.seconds,0);
assert.equal(run.events.filter(e=>e.event==='start').length,2);
assert.equal(run.events.filter(e=>e.event==='override').length,1,'Log explicitly prohibited turn');
assert.equal(run.trails.A.length,1);
assert.equal(run.trails.B.length,1);
assert(ui.runSummary.textContent.includes('Elapsed 0.0 s'));
const initialA=api.vehicleWorldPosition(state.vehicles.A,state);
assert(initialA.every(Number.isFinite));
const before={A:{side:'entry',waiting:false},B:{side:'entry',waiting:false}};
state.vehicles.A.progress=.75;
state.vehicles.A.waiting=true;
state.vehicles.B.side='merging';
state.vehicles.B.mergeProgress=.5;
api.trackScenarioTick(10,before);
run=api.details().runState;
assert(Math.abs(run.seconds-.5)<1e-10);
assert(Math.abs(run.waitSeconds.A-.5)<1e-10);
assert.equal(run.events.some(e=>e.event==='waiting'&&e.vehicle==='A'),true);
assert.equal(run.events.some(e=>e.event==='merge started'&&e.vehicle==='B'),true);
assert(run.trails.A.length>1&&run.trails.B.length>1);
assert(ui.runSummary.textContent.includes('A 0.5 s'));
api.replayScenario();
run=api.details().runState;
assert.equal(run.seconds,0);
assert.equal(state.vehicles.A.arm,'East');
assert.equal(state.vehicles.A.lane,2);
assert.equal(state.vehicles.A.progress,0);
assert.equal(state.vehicles.A.waiting,false);
assert.equal(state.vehicles.A.overrideExitRules,true);
assert.equal(state.vehicles.A.exitArm,'South');
assert.equal(state.vehicles.B.side,'entry');
assert.equal(run.trails.A.length,1);
assert.equal(run.events.filter(e=>e.event==='start').length,2);
assert.equal(run.events.filter(e=>e.event==='override').length,1);
api.clearScenario();
assert.equal(api.details().runState,null);
assert.equal(api.details().scenarioBaseline,null);
assert.equal(ui.runEvents.textContent,'No events recorded.');
assert(html.includes('id="showTrails"')&&html.includes('id="replayCars"')&&html.includes('id="exportEvents"'));
assert(html.includes('state.showTrails='));
console.log('Scenario replay, telemetry, wait times, trail sampling and override persistence validated.');
