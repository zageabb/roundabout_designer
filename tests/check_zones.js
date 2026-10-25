// Geometric zone occupancy tests. Times describe a provisional fixed zone,
// not a verified accident, priority decision or continuously swept-body collision.
const assert=require('node:assert/strict');
const zones=require('../src/conflict-zones.js');
const pose=(t,x,y,heading=90,phase='circulating')=>({t,x,y,heading,phase});
const a=[pose(0,-10,0),pose(5,0,0),pose(10,10,0)];
const b=[pose(0,0,-10,180),pose(5,0,0,180),pose(10,0,10,180)];
const same=zones.assess(a,b);
assert.equal(same.type,'possible_overlap');
assert.equal(same.occupancy.status,'overlapping_windows');
assert.equal(same.occupancy.A.length,1);
assert.equal(same.occupancy.B.length,1);
assert(same.occupancy.nearest.overlapSeconds>1,'Both cars occupy crossing zone for a meaningful time window');
assert.equal(same.occupancy.nearest.gapSeconds,0);
assert(Number.isFinite(same.zone.x)&&Number.isFinite(same.zone.y));
assert.equal(same.zone.radiusMetres,0.9);
assert(same.occupancy.nearest.A.enterSeconds<5);
assert(same.occupancy.nearest.A.exitSeconds>5);

const delayed=[pose(0,0,-30,180),pose(5,0,-20,180),pose(10,0,-10,180),pose(15,0,0,180),pose(20,0,10,180)];
const separated=zones.assess(a,delayed);
assert.equal(separated.type,'paths_intersect_different_times');
assert.equal(separated.occupancy.status,'separate_windows');
assert(separated.occupancy.nearest.gapSeconds>5);
assert.equal(separated.occupancy.nearest.overlapSeconds,0);
assert(separated.occupancy.nearest.A.exitSeconds<separated.occupancy.nearest.B.enterSeconds);

const parallel=[pose(0,-10,4),pose(5,0,4),pose(10,10,4)];
const noZone=zones.assess(a,parallel);
assert.equal(noZone.type,'separate_paths');
assert.equal(noZone.zone,null);
assert.deepEqual(noZone.occupancy.A,[]);
assert.deepEqual(noZone.occupancy.B,[]);
assert.equal(noZone.occupancy.status,'no_shared_zone');

// A thin fixed zone is entered when the vehicle nose reaches it, rather
// than when its centre crosses; exit is after the rear end has cleared.
const crossing=zones.occupancyIntervals(a,{x:0,y:0},4,2,0.5,0.1);
assert.equal(crossing.length,1);
assert(Math.abs(crossing[0].enterSeconds-3.75)<0.03);
assert(Math.abs(crossing[0].exitSeconds-6.25)<0.03);

// A vehicle may use the same zone more than once; don't merge intervals
// separated by a real gap.
const repeat=[pose(0,-10,0),pose(5,0,0),pose(10,10,0),pose(15,0,0),pose(20,-10,0)];
const repeated=zones.occupancyIntervals(repeat,{x:0,y:0},4,2,0.5,0.1);
assert.equal(repeated.length,2);
assert(repeated[0].exitSeconds<repeated[1].enterSeconds);
const fixed=[pose(0,0,0),pose(10,0,0)];
const stable=zones.occupancyIntervals(fixed,{x:0,y:0},4,2,.5,.1);
assert.equal(stable.length,1);
assert(Math.abs(stable[0].enterSeconds)<1e-8&&Math.abs(stable[0].exitSeconds-10)<1e-8);
const absent=zones.occupancyIntervals(fixed,{x:100,y:0},4,2,1,.1);
assert.deepEqual(absent,[]);

// Time window ordering and overlap assessment are junction-independent.
const closest=zones.closestWindows(
 [{enterSeconds:1,exitSeconds:2},{enterSeconds:8,exitSeconds:10}],
 [{enterSeconds:4,exitSeconds:6},{enterSeconds:9,exitSeconds:11}]
);
assert(closest.simultaneous);
assert.equal(closest.overlapSeconds,1);
assert.equal(closest.overlapStartSeconds,9);
assert.equal(closest.gapSeconds,0);
const noPair=zones.closestWindows([],[]);
assert.equal(noPair,null);
assert.throws(()=>zones.assess(a,b,{zoneRadiusMetres:0}),/Invalid/);
assert.throws(()=>zones.assess(a,b,{zoneStepSeconds:0}),/Invalid/);
assert.throws(()=>zones.occupancyIntervals(a,{x:0,y:0},4,2,0,-1),/Invalid/);
console.log('Zone occupancy: simultaneous, sequential, independent, repeating and stationary intervals validated.');
