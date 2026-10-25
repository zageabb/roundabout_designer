// Schematic marked-spiral exit routing: only declared lane connectors
// are traversable. No claim that real paint/geometry has been surveyed.
const assert=require('node:assert/strict');
const rule=require('../src/exit-lane-rules.js');
const net=require('../src/lane-network.js');
const transitions=require('../src/lane-changes.js');
const cfg={circulating:3,width:4,displayScale:9.5,diameter:38,
 arms:{North:{in:3,out:2,moves:['LS','S','R']},
 East:{in:3,out:2,moves:['LS','S','SR']},
 South:{in:4,out:2,moves:['L','LS','S','R']},
 West:{in:3,out:2,moves:['LS','S','R']}},
 exitLaneModes:{North:'spiral-dual',East:'conventional',South:'conventional',West:'conventional'}};
assert.equal(rule.mode(cfg,'North'),'spiral-dual');
assert.deepEqual(rule.connectors(cfg,'North').map(x=>[x.fromLane,x.exitLane]),[[1,1],[2,2]]);
const vehicle=(lane,exitArm='North')=>({side:'circulating',arm:'East',entryLane:3,exitArm,lane,targetLane:lane,exitLane:1,angle:290,autoLaneChange:true});
const outer=rule.resolve(cfg,vehicle(1));
assert.equal(outer.allowed,true);assert.equal(outer.exitLane,1);
const inner=rule.resolve(cfg,vehicle(2));
assert.equal(inner.allowed,true);assert.equal(inner.exitLane,2,'Marked inner-to-exit link uses exit lane 2');
assert.equal(inner.needsOutwardMove,false);
const unmapped=rule.resolve(cfg,vehicle(3));
assert.equal(unmapped.allowed,false);
assert.equal(unmapped.reason,'no-marked-connector');
assert.equal(unmapped.exitLane,null,'Must not invent a path from ring 3 to exit 2');
assert.equal(transitions.exitPlan(cfg,vehicle(3),329).steps,0,'No automatic crossing across marked lanes');
assert.equal(transitions.shouldAttempt(cfg,vehicle(3),329),false);
assert.equal(rule.resolve(cfg,{...vehicle(2),laneChange:{fromLane:2,toLane:1,progress:.5}}).allowed,false);

const graph=net.build(cfg);
const north=graph.connectors.filter(c=>c.type==='diverge'&&c.nodeId==='node:North:exit');
assert.deepEqual(north.map(c=>[c.id,c.marking]).sort(),[
 ['leave:North:1:1','marked-spiral-continuation'],['leave:North:2:2','marked-spiral-continuation']
]);
const south=graph.connectors.filter(c=>c.type==='diverge'&&c.nodeId==='node:South:exit');
assert(south.every(c=>c.from.endsWith(':1')),'Conventional exits require outer ring lane');
assert.equal(south.length,2);
assert.equal(rule.resolve(cfg,vehicle(2,'South')).reason,'requires-outside-lane');
assert.equal(transitions.exitPlan(cfg,vehicle(3,'South'),329).steps,0,'Straight turn remains unaffected');
const old={...cfg,exitLaneModes:undefined};
assert.equal(rule.mode(old,'North'),'conventional','Legacy JSON defaults to conventional');
assert.deepEqual(rule.connectors(old,'North').map(x=>[x.fromLane,x.exitLane]),[[1,1],[1,2]]);
assert.equal(rule.resolve(old,vehicle(2)).allowed,false);
const unsupported={...cfg,arms:{...cfg.arms,North:{...cfg.arms.North,out:1}}};
assert.equal(rule.selected(unsupported,'North'),'spiral-dual');
assert.equal(rule.supported(unsupported,'North'),false);
assert.equal(rule.mode(unsupported,'North'),'conventional','Invalid dual lane is safely downgraded');
assert.equal(rule.connectors(unsupported,'North').length,1);
assert.throws(()=>rule.connectors({...cfg,circulating:0},'North'),/Invalid/);
assert.throws(()=>rule.selected(cfg,'Atlantis'),/Unknown/);
console.log('Exit markings: convention, explicit spiral links, unsupported lane and legacy fallback passed.');
