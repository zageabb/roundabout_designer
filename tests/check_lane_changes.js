// Independent lane-change planning, gap screening and true shared-body poses.
const assert=require('node:assert/strict');
const transitions=require('../src/lane-changes.js');
const network=require('../src/lane-network.js');
const config={circulating:3,diameter:38,width:4,displayScale:9.5,arms:{
 North:{in:3,out:2,moves:['LS','S','R']},East:{in:3,out:2,moves:['LS','S','SR']},
 South:{in:4,out:2,moves:['L','LS','S','R']},West:{in:3,out:2,moves:['LS','S','R']}
}};
const car=(lane,angle=270,exitArm='North')=>({
 side:'circulating',arm:'East',lane,angle,exitArm,entryLane:3,
 targetLane:lane,exitLane:1,speed:20,lengthMetres:4.4,widthMetres:1.8,
 autoLaneChange:true
});
assert(transitions.isRightTurn('East','North'));
assert(!transitions.isRightTurn('East','West'));
assert(!transitions.isRightTurn('East','South'));
let vehicle=car(3,273),plan=transitions.exitPlan(config,vehicle,329);
assert(plan.enabled&&plan.requiresOuterLane);
assert.equal(plan.steps,2);
assert.equal(plan.startWhenRemainingDegrees,56);
assert(transitions.shouldAttempt(config,vehicle,329));
assert(!transitions.shouldAttempt(config,car(3,315),329),'Too close to exit to begin an outward crossing');
assert(!transitions.shouldAttempt(config,car(1,273),329),'Already in outside lane');
assert(!transitions.shouldAttempt(config,{...vehicle,autoLaneChange:false},329),'Opt-in needed');
assert(!transitions.shouldAttempt(config,{...vehicle,exitArm:'West'},329),'Straight traffic is unchanged');
assert.deepEqual([transitions.begin(vehicle).fromLane,transitions.begin(vehicle).toLane],[3,2]);
vehicle.laneChange=transitions.begin(vehicle);
const original=network.sampleVehiclePose(config,{...vehicle,laneChange:null});
const start=network.sampleVehiclePose(config,vehicle);
assert(Math.hypot(original.x-start.x,original.y-start.y)<.00001);
assert(!transitions.advance(vehicle,11));
vehicle.angle+=11;
const midway=network.sampleVehiclePose(config,vehicle);
const outer=network.sampleVehiclePose(config,{...vehicle,laneChange:null,lane:2});
assert(Math.hypot(midway.x,midway.y)>Math.hypot(original.x,original.y));
assert(Math.hypot(midway.x,midway.y)<Math.hypot(outer.x,outer.y));
assert(Number.isFinite(midway.heading));
assert(transitions.advance(vehicle,11));
vehicle.angle+=11;
assert.equal(vehicle.lane,2);
assert.equal(vehicle.laneChange,null);
const finish=network.sampleVehiclePose(config,vehicle);
assert(Math.abs(Math.hypot(finish.x,finish.y)-Math.hypot(outer.x,outer.y))<1e-7);
assert(transitions.shouldAttempt(config,vehicle,329),'Second outward change can be scheduled');

// Adjacent target lane occupancy and approach from behind are both checked.
const before=car(3,270);
assert(!transitions.gapClear(config,before,car(2,270),20,8),'Alongside vehicle blocks crossing');
assert(!transitions.gapClear(config,before,car(2,262),20,8),'Vehicle behind in target lane blocks crossing');
assert(transitions.gapClear(config,before,car(2,90),20,8),'Distant vehicle leaves a usable gap');
assert(transitions.gapClear(config,before,{side:'exit',lane:2,angle:270},20,8));
assert(!transitions.gapClear(config,before,{side:'merging',targetLane:2},20,8));
assert(transitions.gapClear(config,before,{side:'merging',targetLane:1},20,8));
assert.throws(()=>transitions.begin(car(1)),/Outward/);
assert.throws(()=>transitions.gapClear(config,before,car(2),20,-1),/Invalid/);
console.log('Planned right turns: staged outward geometry and safe target-lane gap checks passed.');
