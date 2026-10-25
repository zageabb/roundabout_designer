/* Smooth, tangent-continuous pre-exit centreline for DECLARED marked links.
 * The departure prelude is calculated from actual current circulating pose.
 * This is model geometry, not imported lane paint, and is not independently
 * validated for vehicle swept paths or engineered weaving distances.
 */
const MarkedExitGeometry=(()=>{
 'use strict';
 const ARMS=['North','East','South','West'],SPAN_DEGREES=34,SHIFT_FRACTION=.25;
 const mod=x=>(x%360+360)%360;
 function enabled(config,v){
  if(!v?.autoLaneChange||!ARMS.includes(v.arm)||!ARMS.includes(v.exitArm)
     ||v.exitArm!==ARMS[(ARMS.indexOf(v.arm)+3)%4])return false;
  const rules=typeof ExitLaneRules!=='undefined'?ExitLaneRules:require('./exit-lane-rules.js');
  return rules.mode(config,v.exitArm)!=='conventional'&&
    rules.resolve(config,{...v,laneChange:null}).allowed&&v.lane>1;
 }
 function radialShift(config,v){
  return enabled(config,v)?config.width*config.displayScale*SHIFT_FRACTION:0;
 }
 function sample(config,v,exitAngle){
  const w=config.width*config.displayScale,inner=config.diameter*3.1;
  const base=inner+(config.circulating-v.lane+.5)*w;
  const remaining=mod(exitAngle-v.angle);
  const active=enabled(config,v)&&remaining<=SPAN_DEGREES;
  const progress=active?Math.max(0,Math.min(1,1-remaining/SPAN_DEGREES)):0;
  const ease=progress*progress*(3-2*progress);
  const offset=radialShift(config,v),r=base+offset*ease;
  const dr=active?offset*6*progress*(1-progress)/(SPAN_DEGREES*Math.PI/180):0;
  const a=mod(v.angle)*Math.PI/180;
  const dx=r*Math.cos(a)+dr*Math.sin(a),dy=r*Math.sin(a)-dr*Math.cos(a);
  return {x:r*Math.sin(a),y:-r*Math.cos(a),
   heading:Math.atan2(dx,-dy)*180/Math.PI,phase:active?'marked-spiral':'circulating',
   offset:offset*ease,progress};
 }
 return Object.freeze({enabled,radialShift,sample,SPAN_DEGREES,SHIFT_FRACTION});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=MarkedExitGeometry;
