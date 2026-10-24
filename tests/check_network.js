// Tests for the reusable roundabout lane graph and pure path/pose API.
// No DOM, canvas, SVG, server, or external packages are needed.
const assert=require('node:assert/strict');
const network=require('../src/lane-network.js');
const config={circulating:3,width:4,displayScale:9.5,diameter:38,arms:{
 North:{in:3,out:2,moves:['LS','S','R']},
 East:{in:3,out:2,moves:['LS','S','SR']},
 South:{in:4,out:2,moves:['L','LS','S','R']},
 West:{in:3,out:2,moves:['LS','S','R']}
}};
const g=network.build(config);
assert.equal(g.version,1);
assert.equal(g.type,'roundabout');
assert.equal(g.handedness,'left');
assert.equal(g.direction,'clockwise');
assert.equal(g.nodes.length,8);
assert.equal(g.segments.length,16);
assert.equal(g.lanes.length,13+8+4*2*config.circulating);
assert.equal(g.turns.length,18);
const ids=new Set(g.lanes.map(l=>l.id));
const nodeIds=new Set(g.nodes.map(n=>n.id));
assert.equal(ids.size,g.lanes.length,'Lane IDs must be unique');
assert.equal(nodeIds.size,g.nodes.length,'Junction nodes must be unique');
assert.equal(new Set(g.segments.map(x=>x.id)).size,g.segments.length);
assert.equal(new Set(g.connectors.map(x=>x.id)).size,g.connectors.length);
for(const c of g.connectors){
 assert(ids.has(c.from),'Missing connector source '+c.from);
 assert(ids.has(c.to),'Missing connector target '+c.to);
 assert(nodeIds.has(c.nodeId),'Missing connector node '+c.nodeId);
}
for(const c of g.turns){
 assert(ids.has(c.entryLaneId),'Unknown entry lane '+c.id);
 assert(ids.has(c.exitLaneId),'Unknown exit lane '+c.id);
 assert(c.circulatingLane>=1&&c.circulatingLane<=config.circulating);
 assert(c.exitLane>=1&&c.exitLane<=config.arms[c.destination].out);
 assert.equal(c.destination,network.destination(c.origin,c.movement));
 assert.equal(c.legal,true);
}
assert.deepEqual(network.permittedExits(config,'East',1),['South','West']);
assert.deepEqual(network.permittedExits(config,'East',2),['West']);
assert.deepEqual(network.permittedExits(config,'East',3),['West','North']);
assert.throws(()=>network.destination('East','Z'),/Invalid/);
assert.throws(()=>network.permittedExits(config,'East',7),/Invalid/);
const allowed=network.routeForVehicle(config,{arm:'East',entryLane:2,lane:2,targetLane:2,exitArm:'West',exitLane:2});
assert.equal(allowed.legal,true);
assert.deepEqual(allowed.laneIds,['in:East:2','ring:East:merge-to-next-exit:2','ring:South:exit-to-merge:2','ring:South:merge-to-next-exit:2','out:West:2']);
for(const lane of allowed.laneIds)assert(ids.has(lane),'Route references non-existent lane '+lane);
const violation=network.routeForVehicle(config,{arm:'East',entryLane:2,lane:2,targetLane:2,exitArm:'South',exitLane:1,overrideExitRules:true});
assert.equal(violation.legal,false);
assert.equal(violation.violation,true);
assert.equal(violation.overrideEnabled,true);
assert.deepEqual(violation.laneIds,['in:East:2','ring:East:merge-to-next-exit:2','out:South:1']);
const uturn=network.routeForVehicle(config,{arm:'East',entryLane:2,lane:2,targetLane:2,exitArm:'East',exitLane:1,overrideExitRules:true});
assert.equal(uturn.legal,false);
assert(uturn.laneIds.length>=9,'U-turn must make full clockwise loop');
assert.equal(uturn.laneIds.at(-1),'out:East:1');
for(const lane of uturn.laneIds)assert(ids.has(lane));
const circulate=network.routeForVehicle(config,{arm:'East',entryLane:2,lane:2,targetLane:2,exitArm:'none'});
assert.equal(circulate.legal,true);
assert.equal(circulate.kind,'circulate');
assert.equal(circulate.laneIds.length,2);
assert.deepEqual(network.mergeRelationship({arm:'East',lane:1,targetLane:1},{arm:'East',lane:2,targetLane:2}),{type:'parallel-independent',conflicts:false});
assert.equal(network.mergeRelationship({arm:'East',lane:1,targetLane:2},{arm:'East',lane:2,targetLane:1}).type,'crossing-lane-paths');
assert.equal(network.mergeRelationship({arm:'East',lane:1,targetLane:1},{arm:'East',lane:2,targetLane:1}).type,'shared-target-lane');
assert.equal(network.mergeRelationship({arm:'East',lane:1,targetLane:1},{arm:'North',lane:1,targetLane:1}).conflicts,false);

// Poses are generated from the same cubic callbacks as the working SVG/trace.
// A rotated entry path, a circular car and a turning exit must all be finite.
const curves={
 mergeGeometry:(_v,t)=>({x:-100+25*t,y:210-70*t,heading:-30*t}),
 exitGeometry:(_v,t)=>({x:80-40*t,y:140+90*t,heading:-110-70*t})
};
for(const arm of network.ARMS){
 for(const lane of [1,2,3]){
  for(const side of ['entry','merging','circulating','exiting','exit']){
   const v={side,arm,exitArm:arm,lane,targetLane:lane,exitLane:1,angle:90,progress:.5,mergeProgress:.5,exitProgress:.5};
   const pose=network.sampleVehiclePose(config,v,curves);
   assert(Number.isFinite(pose.x)&&Number.isFinite(pose.y)&&Number.isFinite(pose.heading),arm+' '+side+' invalid pose');
   assert.equal(pose.phase,side);
  }
 }
}
const north=network.sampleVehiclePose(config,{side:'circulating',lane:1,angle:0});
assert(Math.abs(north.x)<1e-8 && north.y<0 && north.heading===90);
assert.throws(()=>network.build({...config,circulating:0}),/Invalid/);
assert.throws(()=>network.build({...config,arms:{...config.arms,East:{in:3,out:2,moves:['X','S','SR']}}}),/Invalid/);
console.log('Common network: 8 nodes, 16 segments, 45 lanes, 18 turns, route and pose contracts passed.');
