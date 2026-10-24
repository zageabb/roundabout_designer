// Exercise route choice, parallel merging and end-to-end circular exits.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
function section(a,b){const i=html.indexOf(a),j=html.indexOf(b,i);assert(i>=0&&j>i,'Missing '+a);return html.slice(i,j)}
const funcs=[
 section('function routeDestination(origin,movement){','function deriveConnections('),
 section('function allowedExitArms(v,config){','function normalizeVehicles(){'),
 section('function entryGapClear(id){','function playbackTick(time){'),
 section('function roadSurfaceGeometry(config,outer,end){','function draw(){')
].join('\n');
const state={circulating:3,width:4,displayScale:9.5,diameter:38,minGap:8,drivingMode:'safe',
 arms:{
 North:{in:3,out:2,moves:['LS','S','R']},
 East:{in:3,out:2,moves:['LS','S','SR']},
 South:{in:4,out:2,moves:['L','LS','S','R']},
 West:{in:3,out:2,moves:['LS','S','R']}
 },vehicles:{}};
const context=vm.createContext({state,entryAngles:{North:0,East:90,South:180,West:270},
 renderVehicles(){},draw(){},$:id=>id==='vehicles'?{querySelectorAll(){return []}}:{value:20},
 safeAdvance:()=>({A:2,B:2})});
const api=vm.runInContext(funcs+'\n;({allowedExitArms,mergingPathsConflict,entryGapClear,advanceEntries,exitSweep,exitGeometry,circularExitStart,advanceVehicles});',context);
function v(lane,targetLane){return {arm:'East',entryLane:lane,side:'entry',lane,targetLane,progress:1,mergeProgress:0,waiting:false,speed:20,exitArm:'West',exitLane:2,angle:90}}
const exits=(lane)=>Array.from(api.allowedExitArms(v(lane,lane),state));
assert.deepEqual(exits(1),['South','West']);
assert.deepEqual(exits(2),['West']);
assert.deepEqual(exits(3),['West','North']);
state.vehicles={A:v(1,1),B:v(2,2)};
api.advanceEntries(1);
assert.equal(state.vehicles.A.side,'merging','East lane 1 should merge');
assert.equal(state.vehicles.B.side,'merging','East lane 2 should merge independently');
assert.equal(api.mergingPathsConflict(state.vehicles.A,state.vehicles.B),false);
state.vehicles={A:v(1,1),B:v(2,1)};
api.advanceEntries(1);
assert.equal(state.vehicles.B.side,'entry','Conflicting same-target entries must wait');
assert.equal(state.vehicles.B.waiting,true);
// A has already joined matching lane 1; B can still merge into lane 2.
state.vehicles={A:{...v(1,1),side:'circulating',angle:117,lane:1},B:v(2,2)};
assert.equal(api.entryGapClear('B'),true);
api.advanceEntries(1);
assert.equal(state.vehicles.B.side,'merging');
// Exit starts where a circular vehicle already is and finishes on the outbound road.
for(const destination of ['North','East','South','West']){
 for(const lane of [1,2,3]){
  const vehicle={...v(2,2),side:'circulating',lane,exitArm:destination,exitLane:2};
  const start=api.exitGeometry(vehicle,0,state),finish=api.exitGeometry(vehicle,1,state);
  const radius=state.diameter*3.1+(state.circulating-lane+.5)*state.width*state.displayScale;
  assert(Math.abs(Math.hypot(start.x,start.y)-radius)<1e-6);
  assert(Math.abs(start.heading-(-90-api.exitSweep(destination,state)*180/Math.PI))<1e-4);
  assert(Math.abs(finish.heading-180)<1e-4,'Must face away from junction on exit');
  assert(Math.abs(finish.x-1.5*state.width*state.displayScale)<1e-6);
 }
}
state.vehicles={A:{...v(2,2),side:'circulating',angle:api.circularExitStart('West',state)-1,exitArm:'West'},B:{...v(1,1),side:'exit',speed:0}};
api.advanceVehicles(2);
assert.equal(state.vehicles.A.side,'exiting','Car should start exit turn at requested mouth');
api.advanceVehicles(60);
assert.equal(state.vehicles.A.side,'exit','Car must complete exit smoothly');
assert.equal(state.vehicles.A.arm,'West');
assert.equal(state.vehicles.A.lane,2);
assert.equal(state.vehicles.A.exitArm,'none');
assert(html.indexOf('class="vehicle-config"')>html.indexOf('id="view"'),'Car settings belong below road diagram');
assert.equal((html.match(/id="vehicles"/g)||[]).length,1);
console.log('Route choices, parallel East lane merges, crossing conflicts and 4-arm exits validated.');
