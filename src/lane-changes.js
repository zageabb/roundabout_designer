/* One-lane-at-a-time roundabout transition, behind vehicle opt-in.
 * Geometry, advisory gap check and timing are standalone pure operations.
 * Assumes unmarked conventional roundabout, not mandatory for spiral lanes.
 */
const LaneChanges=(()=>{
 'use strict';
 const ARMS=['North','East','South','West'],SPAN=22,EXIT_BUFFER=12;
 const mod=x=>(x%360+360)%360;
 function isRightTurn(origin,exit){
  return ARMS.includes(origin)&&exit===ARMS[(ARMS.indexOf(origin)+3)%4];
 }
 function exitPlan(config,v,exitAngle){
  const enabled=v.autoLaneChange===true&&isRightTurn(v.arm,v.exitArm)&&v.exitArm!=='none';
  const steps=Math.max(0,Math.min(config.circulating-1,v.lane-1));
  const remaining=mod(exitAngle-v.angle);
  return {enabled,steps,remainingDegrees:remaining,spanDegrees:SPAN,
   startWhenRemainingDegrees:steps*SPAN+EXIT_BUFFER,exitBufferDegrees:EXIT_BUFFER,
   requiresOuterLane:enabled&&steps>0};
 }
 function shouldAttempt(config,v,exitAngle){
  const p=exitPlan(config,v,exitAngle);
  // Refuse a new move when there is no distance left to finish every
  // required single-lane transition before the exit. Continue circulating.
  return p.requiresOuterLane&&!v.laneChange&&p.remainingDegrees<=p.startWhenRemainingDegrees
    &&p.remainingDegrees>=p.steps*p.spanDegrees+3;
 }
 function ringPose(config,v){
  const width=config.width*config.displayScale,inner=config.diameter*3.1;
  const movement=v.laneChange,progress=movement?Math.max(0,Math.min(1,movement.progress)):0;
  const eased=progress*progress*(3-2*progress);
  const radius=inner+(config.circulating-v.lane+.5)*width+(movement?(movement.fromLane-movement.toLane)*width*eased:0);
  const angle=mod(v.angle)*Math.PI/180;
  const dr=movement?(movement.fromLane-movement.toLane)*width*6*progress*(1-progress)/(movement.spanDegrees*Math.PI/180):0;
  const dx=radius*Math.cos(angle)+dr*Math.sin(angle),dy=radius*Math.sin(angle)-dr*Math.cos(angle);
  return {x:radius*Math.sin(angle),y:-radius*Math.cos(angle),
   heading:Math.atan2(dx,-dy)*180/Math.PI,phase:movement?'changing':'circulating'};
 }
 function gapClear(config,v,other,playbackSpeed=20,minGapMetres=8){
  if(!other||!['circulating','merging'].includes(other.side))return true;
  const target=v.lane-1;
  if(other.side==='merging')return other.targetLane!==target;
  if(other.lane!==target &&
     (!other.laneChange||other.laneChange.toLane!==target&&other.laneChange.fromLane!==target))return true;
  if(!Number.isFinite(playbackSpeed)||playbackSpeed<=0||
     !Number.isFinite(minGapMetres)||minGapMetres<0)throw Error('Invalid lane-change timing or gap');
  const speed=playbackSpeed*Math.max(0,v.speed)/20;
  if(speed<=0)return false;
  const otherSpeed=playbackSpeed*Math.max(0,other.speed)/20;
  const duration=SPAN/speed;
  // Check the whole lateral manoeuvre and an extra 0.5s of following clearance.
  const n=Math.ceil((duration+.5)/.15);
  const core=typeof ConflictEngine!=='undefined'?ConflictEngine:require('./conflict-engine.js');
  for(let i=0;i<=n;i++){
   const t=(duration+.5)*i/n;
   const moving={...v,angle:mod(v.angle+speed*t)};
   if(t<duration)moving.laneChange={fromLane:v.lane,toLane:target,spanDegrees:SPAN,progress:t/duration};
   else {moving.lane=target;moving.laneChange=null}
   const otherAt={...other,angle:mod(other.angle+otherSpeed*t)};
   if(other.laneChange){
    const initial=Math.max(0,Math.min(1,other.laneChange.progress||0));
    const advancement=t*otherSpeed/Math.max(1,other.laneChange.spanDegrees);
    const progress=initial+advancement;
    if(progress<1)otherAt.laneChange={...other.laneChange,progress};
    else {otherAt.lane=other.laneChange.toLane;otherAt.laneChange=null}
   }
   const pa=ringPose(config,moving),pb=ringPose(config,otherAt);
   const a=core.footprint({x:pa.x/config.displayScale,y:pa.y/config.displayScale,heading:pa.heading},
      Number(v.lengthMetres)||4.4,Number(v.widthMetres)||1.8);
   const b=core.footprint({x:pb.x/config.displayScale,y:pb.y/config.displayScale,heading:pb.heading},
      Number(other.lengthMetres)||4.4,Number(other.widthMetres)||1.8);
   if(core.polygonDistance(a,b)<minGapMetres)return false;
  }
  return true;
 }
 function begin(v){
  if(v.lane<=1||v.laneChange)throw Error('Outward change needs an inner source lane');
  return {fromLane:v.lane,toLane:v.lane-1,spanDegrees:SPAN,progress:0};
 }
 function advance(v,stepDegrees){
  if(!v.laneChange)return false;
  const change=v.laneChange;
  change.progress=Math.min(1,change.progress+stepDegrees/change.spanDegrees);
  if(change.progress<1)return false;
  v.lane=change.toLane;v.laneChange=null;
  return true;
 }
 return Object.freeze({isRightTurn,exitPlan,shouldAttempt,ringPose,gapClear,begin,advance,SPAN});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=LaneChanges;
