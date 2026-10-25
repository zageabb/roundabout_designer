// Custom lane connector rules plus exit-curve join continuity, all pure tests.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const rules=require('../src/exit-lane-rules.js');
const net=require('../src/lane-network.js');
const spiral=require('../src/marked-exit-geometry.js');
const changes=require('../src/lane-changes.js');
const cfg={width:4,displayScale:9.5,diameter:38,circulating:3,
 arms:{North:{in:3,out:3,moves:['LS','S','R']},East:{in:3,out:2,moves:['LS','S','SR']},
 South:{in:4,out:2,moves:['L','LS','S','R']},West:{in:3,out:2,moves:['LS','S','R']}},
 exitLaneModes:{North:'custom'},exitLaneConnectors:{North:[{fromLane:1,exitLane:1},{fromLane:3,exitLane:3}]}};
assert.equal(rules.mode(cfg,'North'),'custom');
assert.deepEqual(rules.connectors(cfg,'North').map(x=>[x.fromLane,x.exitLane]),[[1,1],[3,3]]);
const graph=net.build(cfg);
const links=graph.connectors.filter(c=>c.type==='diverge'&&c.nodeId==='node:North:exit');
assert.deepEqual(links.map(l=>l.id).sort(),['leave:North:1:1','leave:North:3:3']);
assert(links.every(l=>l.marking==='custom-marked-continuation'));
const desired=graph.turns.find(t=>t.origin==='East'&&t.lane===3&&t.destination==='North');
assert.equal(desired.circulatingLane,3);assert.equal(desired.exitLane,3);
const vehicle=(lane,overrides={})=>({arm:'East',side:'circulating',lane,
 entryLane:3,targetLane:lane,angle:0,exitArm:'North',exitLane:1,
 autoLaneChange:true,lengthMetres:4.4,widthMetres:1.8,...overrides});
assert.equal(rules.resolve(cfg,vehicle(3)).exitLane,3);
assert(!rules.resolve(cfg,vehicle(2)).allowed);
assert.equal(rules.resolve(cfg,vehicle(2)).reason,'no-marked-connector');
assert.equal(changes.exitPlan(cfg,vehicle(3),330).steps,0,'Custom marked exit cannot force a discretionary outward change');
const mappedRoute=net.routeForVehicle(cfg,{...vehicle(3),entryLane:3,exitLane:1});
assert.equal(mappedRoute.exitLane,3);
assert.equal(mappedRoute.connectorAvailable,true);
assert.equal(mappedRoute.laneIds.at(-1),'out:North:3');
const missingRoute=net.routeForVehicle(cfg,{...vehicle(2),entryLane:3,exitLane:1});
assert.equal(missingRoute.kind,'unconnected-exit');
assert.equal(missingRoute.connectorAvailable,false);
assert.equal(missingRoute.exitLane,null);
assert(!missingRoute.laneIds.some(x=>x.startsWith('out:North:')));
function invalid(links){
 const test={...cfg,exitLaneConnectors:{North:links}};
 assert.equal(rules.supported(test,'North'),false);
 assert.equal(rules.mode(test,'North'),'conventional');
 assert(rules.customIssues(test,'North').length>0);
}
invalid([]);
invalid([{fromLane:2,exitLane:1},{fromLane:1,exitLane:2}]);
invalid([{fromLane:1,exitLane:2},{fromLane:2,exitLane:1}]);
invalid([{fromLane:1,exitLane:1},{fromLane:2,exitLane:1}]);
invalid([{fromLane:4,exitLane:3}]);
invalid([{fromLane:1,exitLane:4}]);
assert.equal(rules.mode({...cfg,exitLaneModes:{}},'North'),'conventional');
assert.deepEqual(rules.initialCustom({...cfg,exitLaneModes:{}},'North'),[{fromLane:1,exitLane:1}]);
assert.deepEqual(rules.initialCustom(cfg,'North'),cfg.exitLaneConnectors.North);

// Isolate real geometry functions and confirm the marked spiral samples and
// actual leaving-car Bézier use an identical, tangent-continuous join point.
const geometrySource=fs.readFileSync('src/geometry.js','utf8');
const simSource=fs.readFileSync('src/simulation.js','utf8');
function section(start,end){
 const i=simSource.indexOf(start),j=simSource.indexOf(end,i);
 assert(i>=0&&j>i,'Missing function '+start);
 return simSource.slice(i,j);
}
const source=geometrySource+'\n'+
 section('function exitSweep(destination,config){','function crossesClockwiseAngle(')+'\n'+
 section('function exitGeometry(v,progress,config){','function advanceVehicles(')+
 '\n;({circularExitStart,exitGeometry});';
const geometry=vm.runInNewContext(source,{
 entryAngles:{North:0,East:90,South:180,West:270},
 MarkedExitGeometry:spiral,ExitLaneRules:rules,LaneChanges:changes
});
const exitAngle=geometry.circularExitStart('North',cfg);
const base=vehicle(3,{angle:exitAngle});
const curves={...geometry};
const end=net.sampleVehiclePose(cfg,base,curves);
const startExit=net.sampleVehiclePose(cfg,{...base,side:'exiting',exitProgress:0,exitLane:3},curves);
assert(Math.hypot(end.x-startExit.x,end.y-startExit.y)<1e-6,'Marking curve and exit Bézier must join exactly');
const headingGap=((end.heading-startExit.heading+540)%360)-180;
assert(Math.abs(headingGap)<1e-5,'Heading must not jump at ring/exit boundary');
const early=net.sampleVehiclePose(cfg,{...base,angle:(exitAngle-spiral.SPAN_DEGREES+360)%360},curves);
const midpoint=net.sampleVehiclePose(cfg,{...base,angle:(exitAngle-spiral.SPAN_DEGREES/2+360)%360},curves);
assert.equal(early.phase,'marked-spiral');
const radius=p=>Math.hypot(p.x,p.y);
assert(radius(early)<radius(midpoint)&&radius(midpoint)<radius(end),'Pre-exit centreline should gently move outwards');
assert.equal(spiral.radialShift(cfg,base),cfg.width*cfg.displayScale*spiral.SHIFT_FRACTION);
assert(Number.isFinite(midpoint.heading));
const late=net.sampleVehiclePose(cfg,{...base,angle:(exitAngle-0.01+360)%360},curves);
assert(Math.abs(late.heading-end.heading)<.1,'Smoothstep ends tangentially');
const legacy={...base,autoLaneChange:false};
assert.equal(spiral.radialShift(cfg,legacy),0);
assert.equal(net.sampleVehiclePose(cfg,legacy,curves).phase,'circulating');
console.log('Custom exit connectors validated, with finite smooth marked ring/exit pose continuity.');
