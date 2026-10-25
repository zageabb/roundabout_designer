/* Provisional junction-independent conflict-zone occupancy timing.
 * A zone is a small circle around a pair's closest spatial footprint approach.
 * Results are sampled/interpolated forecasts, not swept-body crash determinations.
 * Coordinates, vehicle dimensions and radius are all in metres.
 */
const ConflictZones=(()=>{
 'use strict';
 const core=typeof ConflictEngine!=='undefined'?ConflictEngine:require('./conflict-engine.js');
 function pointToFootprintDistance(point,rect){
  // Project onto the two orthogonal axes of the oriented car body.
  const dx=point.x-rect.centre[0],dy=point.y-rect.centre[1];
  const forward=Math.abs(dx*rect.axes[0][0]+dy*rect.axes[0][1]);
  const lateral=Math.abs(dx*rect.axes[1][0]+dy*rect.axes[1][1]);
  const halfLength=Math.hypot(rect.corners[0][0]-rect.corners[3][0],rect.corners[0][1]-rect.corners[3][1])/2;
  const halfWidth=Math.hypot(rect.corners[0][0]-rect.corners[1][0],rect.corners[0][1]-rect.corners[1][1])/2;
  return Math.hypot(Math.max(0,forward-halfLength),Math.max(0,lateral-halfWidth));
 }
 function occupancyIntervals(samples,point,length,width,radius,stepSeconds=0.1){
  if(!Number.isFinite(radius)||radius<=0||!Number.isFinite(stepSeconds)||stepSeconds<=0)
   throw Error('Invalid zone sampling');
  if(samples.length<2||!samples.every(s=>Number.isFinite(s.t)&&Number.isFinite(s.heading)))
   throw Error('Invalid pose samples for zone');
  const start=samples[0].t,end=samples.at(-1).t,count=Math.ceil((end-start)/stepSeconds);
  if(count>1500)throw Error('Zone time range too large');
  const times=new Set([start,end]);
  for(let i=1;i<count;i++)times.add(start+i*(end-start)/count);
  for(const s of samples)if(s.t>=start&&s.t<=end)times.add(s.t);
  const sorted=[...times].sort((a,b)=>a-b);
  const inside=t=>{
   const p=core.interpolatePose(samples,t);
   return pointToFootprintDistance(point,core.footprint(p,length,width))<=radius+1e-9;
  };
  const refine=(lo,hi,loInside)=>{
   for(let i=0;i<14;i++){
    const mid=(lo+hi)/2;
    if(inside(mid)===loInside)lo=mid;else hi=mid;
   }
   return (lo+hi)/2;
  };
  const windows=[];let last=sorted[0],wasInside=inside(last),entry=wasInside?last:null;
  for(let i=1;i<sorted.length;i++){
   const t=sorted[i],nowInside=inside(t);
   if(nowInside!==wasInside){
    const crossing=refine(last,t,wasInside);
    if(nowInside)entry=crossing;
    else {windows.push({enterSeconds:entry,exitSeconds:crossing});entry=null}
   }
   last=t;wasInside=nowInside;
  }
  if(wasInside)windows.push({enterSeconds:entry,exitSeconds:end});
  return windows;
 }
 function closestWindows(A,B){
  let best=null;
  for(const a of A)for(const b of B){
   const start=Math.max(a.enterSeconds,b.enterSeconds);
   const end=Math.min(a.exitSeconds,b.exitSeconds);
   const overlap=Math.max(0,end-start);
   const gap=end>=start?0:Math.max(a.enterSeconds-b.exitSeconds,b.enterSeconds-a.exitSeconds,0);
   if(!best||gap<best.gapSeconds-1e-9||
       Math.abs(gap-best.gapSeconds)<1e-9&&overlap>best.overlapSeconds){
    best={A:a,B:b,gapSeconds:gap,overlapSeconds:overlap,
     simultaneous:end>=start,
     overlapStartSeconds:end>=start?start:null,
     overlapEndSeconds:end>=start?end:null};
   }
  }
  return best;
 }
 function assess(pathA,pathB,options={}){
  const params={
   lengthA:Number(options.lengthA??4.4),widthA:Number(options.widthA??1.8),
   lengthB:Number(options.lengthB??4.4),widthB:Number(options.widthB??1.8),
   marginMetres:Number(options.marginMetres??0.15),
   stepSeconds:Number(options.stepSeconds??0.15)
  };
  const base=core.assessFootprints(pathA,pathB,params);
  const radius=Number(options.zoneRadiusMetres??0.9);
  const zoneStep=Number(options.zoneStepSeconds??0.1);
  if(!Number.isFinite(radius)||radius<=0||radius>10||
     !Number.isFinite(zoneStep)||zoneStep<=0||zoneStep>1)
   throw Error('Invalid conflict-zone options');
  if(!base.spatialCandidate){
   return {...base,zone:null,occupancy:{A:[],B:[],nearest:null,status:'no_shared_zone'}};
  }
  const zone={x:base.point.x,y:base.point.y,radiusMetres:radius,method:'closest-projected-footprints'};
  const A=occupancyIntervals(pathA,zone,params.lengthA,params.widthA,radius,zoneStep);
  const B=occupancyIntervals(pathB,zone,params.lengthB,params.widthB,radius,zoneStep);
  const nearest=closestWindows(A,B);
  return {...base,zone,occupancy:{A,B,nearest,
   status:!nearest?'not_resolved':nearest.simultaneous?'overlapping_windows':'separate_windows'}};
 }
 return Object.freeze({assess,pointToFootprintDistance,occupancyIntervals,closestWindows});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=ConflictZones;
