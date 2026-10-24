// Pure space/time collision-candidate tests, followed by existing roundabout
// path projection integration. No real-world crash or priority inference.
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const engine=require('../src/conflict-engine.js');
const proj=require('../src/conflict-projection.js');
const lane=require('../src/lane-network.js');
function path(points){return points.map(([t,x,y])=>({t,x,y}))}
const A=path([[0,-10,0],[5,0,0],[10,10,0]]);
const B=path([[0,0,-10],[5,0,0],[10,0,10]]);
let r=engine.assess(A,B);
assert.equal(r.type,'possible_overlap','Two cars reaching crossing at the same time are candidates');
assert.equal(r.spatialCandidate,true);
assert.equal(r.simultaneousCandidate,true);
assert(Math.abs(r.point.x)<.001&&Math.abs(r.point.y)<.001);
assert(Math.abs(r.timeSeconds-5)<.2);
const delayed=path([[0,0,-30],[5,0,-20],[10,0,-10],[15,0,0],[20,0,10]]);
r=engine.assess(A,delayed);
assert.equal(r.type,'paths_intersect_different_times','Spatial crossing at different times is not an overlap');
assert.equal(r.spatialCandidate,true);
assert.equal(r.simultaneousCandidate,false);
assert(r.arrivalGapSeconds>=4.9);
const parallel=path([[0,-10,4],[5,0,4],[10,10,4]]);
r=engine.assess(A,parallel);
assert.equal(r.type,'separate_paths','Independent lanes 4 m apart must not be falsely flagged');
assert.equal(r.spatialCandidate,false);
const sequentialA=path([[0,0,0],[2,2,0],[4,4,0]]);
const sequentialB=path([[0,-4,0],[2,-2,0],[4,0,0]]);
r=engine.assess(sequentialA,sequentialB,{clearanceMetres:1});
assert.equal(r.type,'paths_intersect_different_times','Following on same route with a 4m gap should not be a simultaneous overlap');
assert.throws(()=>engine.assess(A,A,{clearanceMetres:-1}),/Invalid/);
assert.throws(()=>engine.assess(path([[0,0,0],[0,1,0]]),A),/Invalid/);

// Supply the real road and vehicle merge/exit curves as injectable callbacks.
// This verifies the new forecasts stay compatible with the existing geometry.
const html=require('./read_app').readAppSource();
function extract(start,end){const i=html.indexOf(start),j=html.indexOf(end,i);assert(i>=0&&j>i,'Missing '+start);return html.slice(i,j)}
const functions=[
 extract('function roadSurfaceGeometry(config,outer,end){','function draw(){'),
 extract('function mergeGeometry(v,progress,config){','function entryGapClear('),
 extract('function exitGeometry(v,progress,config){','function advanceVehicles('),
 extract('function exitSweep(destination,config){','function crossesClockwiseAngle(')
].join('\n');
const {roadSurfaceGeometry,mergeGeometry,exitGeometry,circularExitStart}=vm.runInNewContext(functions+'\n;({roadSurfaceGeometry,mergeGeometry,exitGeometry,circularExitStart});',{entryAngles:{North:0,East:90,South:180,West:270}});
const geometry={roadSurfaceGeometry,mergeGeometry,exitGeometry,circularExitStart,sampleVehiclePose:lane.sampleVehiclePose};
const cfg={width:4,displayScale:9.5,diameter:38,circulating:3,arms:{
 North:{in:3,out:2,moves:['LS','S','R']},
 East:{in:3,out:2,moves:['LS','S','SR']},
 South:{in:4,out:2,moves:['L','LS','S','R']},
 West:{in:3,out:2,moves:['LS','S','R']}
}};
const car=(entry,target)=>({arm:'East',entryLane:entry,side:'merging',lane:entry,targetLane:target,
 mergeProgress:0,angle:90,exitArm:'West',exitLane:1,progress:1,speed:20});
const trajectory=proj.forecast(cfg,car(1,1),geometry,{horizonSeconds:8,stepSeconds:.25});
assert.equal(trajectory[0].t,0);
assert.equal(trajectory.at(-1).t,8);
assert.equal(trajectory[0].phase,'merging');
assert(trajectory.some(p=>p.phase==='circulating'));
assert(trajectory.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
r=proj.assessVehicles(cfg,{A:car(1,1),B:car(2,2)},geometry);
assert.equal(r.type,'separate_paths','Parallel distinct-lane East merges must not be flagged');
assert.equal(r.point,null);
const overlapping=proj.assessVehicles(cfg,{A:car(1,1),B:car(2,1)},geometry);
assert.equal(overlapping.spatialCandidate,true,'Same-target merges share a lane trajectory');
assert.equal(overlapping.simultaneousCandidate,true,'Identical-speed trajectories converging on same lane may overlap');
assert(overlapping.point&&Number.isFinite(overlapping.point.x));
const mixed=proj.assessVehicles(cfg,{A:car(1,1),B:car(2,2)},geometry,{horizonSeconds:4});
assert.equal(mixed.horizonSeconds,4);
assert.throws(()=>proj.forecast(cfg,car(1,1),geometry,{horizonSeconds:0}),/Invalid/);
console.log('Interaction engine: independent lanes, temporal crossings and shared-lane projected overlap validated.');
