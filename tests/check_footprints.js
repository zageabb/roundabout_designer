// Regression tests for metre-scale oriented-rectangle body interaction.
// A candidate indicates projected physical proximity, not an actual accident.
const assert=require('node:assert/strict');
const {assessFootprints,footprint,polygonDistance}=require('../src/conflict-engine.js');
const straight=(track,heading,phase='circulating')=>track.map(([t,x,y])=>({t,x,y,heading,phase}));
const crossingA=straight([[0,-10,0],[5,0,0],[10,10,0]],90);
const crossingB=straight([[0,0,-10],[5,0,0],[10,0,10]],180);
const simultaneous=assessFootprints(crossingA,crossingB);
assert.equal(simultaneous.model,'sampled-oriented-rectangles');
assert.equal(simultaneous.type,'possible_overlap');
assert.equal(simultaneous.interactionKind,'crossing');
assert.equal(simultaneous.closestSimultaneousMetres,0);
assert(Math.abs(simultaneous.timeSeconds-5)<=1);

const delayed=straight([[0,0,-30],[5,0,-20],[10,0,-10],[15,0,0],[20,0,10]],180);
const offTime=assessFootprints(crossingA,delayed);
assert.equal(offTime.type,'paths_intersect_different_times');
assert.equal(offTime.interactionKind,'crossing');
assert.equal(offTime.simultaneousCandidate,false);
assert(offTime.arrivalGapSeconds>=5);

// Cars separated by a full 4m lane must remain separate with 1.8m bodies.
const parallel=straight([[0,-10,4],[5,0,4],[10,10,4]],90);
const independent=assessFootprints(crossingA,parallel);
assert.equal(independent.type,'separate_paths');
assert(independent.closestSpatialMetres>2);
assert.equal(independent.point,null);

// Enlarging widths alone turns close parallel passing into a body interaction.
const near=straight([[0,-10,2],[5,0,2],[10,10,2]],90);
const narrow=assessFootprints(crossingA,near);
assert.equal(narrow.type,'separate_paths','Regular cars leave a 20cm margin here');
const wide=assessFootprints(crossingA,near,{widthA:2.4,widthB:2.4});
assert.equal(wide.type,'possible_overlap');
assert.equal(wide.interactionKind,'following');

// A longer car can overlap a leader where two shorter cars maintain clearance.
const follower=straight([[0,0,0],[1,0,0],[2,0,0]],90);
const leader=straight([[0,5,0],[1,5,0],[2,5,0]],90);
assert.equal(assessFootprints(follower,leader,{lengthA:4.4,lengthB:4.4,marginMetres:0.15}).type,'separate_paths');
const long=assessFootprints(follower,leader,{lengthA:6,lengthB:6});
assert.equal(long.type,'possible_overlap');
assert.equal(long.interactionKind,'following');

// Heading changes which footprint dimension occupies a particular direction.
const horizontal=footprint({x:0,y:0,heading:90},6,1.8);
const vertical=footprint({x:0,y:3.1,heading:0},6,1.8);
assert.equal(polygonDistance(horizontal,vertical),0);
const separated=footprint({x:0,y:5,heading:90},6,1.8);
assert(Math.abs(polygonDistance(horizontal,separated)-3.2)<1e-8);

// Merge/exit descriptions come from phases, not an illegal-turn checkbox.
const mergeA=straight([[0,-2,0],[1,0,0],[2,2,0]],90,'merging');
assert.equal(assessFootprints(mergeA,straight([[0,0,0],[1,0,0],[2,0,0]],90)).interactionKind,'merge');
const exitA=straight([[0,-2,0],[1,0,0],[2,2,0]],90,'exiting');
assert.equal(assessFootprints(exitA,straight([[0,0,0],[1,0,0],[2,0,0]],90)).interactionKind,'diverge');

// Overlapping forecast window is required for simultaneous occupancy.
const later=straight([[20,-2,0],[21,0,0],[22,2,0]],90);
const noSharedClock=assessFootprints(mergeA,later);
assert.equal(noSharedClock.simultaneousCandidate,false);
assert.equal(noSharedClock.closestSimultaneousMetres,null);
assert.throws(()=>assessFootprints(crossingA,crossingB,{widthA:0}),/Invalid/);
assert.throws(()=>assessFootprints(crossingA,crossingB,{stepSeconds:-1}),/Invalid/);
assert.throws(()=>footprint({x:0,y:0,heading:0},-2,2),/Invalid/);
console.log('Footprint interactions: crossing, delayed crossing, parallel lanes, length/width and merge/following classifications passed.');
