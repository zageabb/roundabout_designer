/* Reusable path interaction analysis.
 * Pure geometry/time engine: no DOM, roundabout constants or claims of crashes.
 * Distances are supplied in physical metres; samples carry elapsed seconds.
 */
const ConflictEngine=(()=>{
 'use strict';
 const clamp01=x=>Math.max(0,Math.min(1,x));
 function validate(samples){
  if(!Array.isArray(samples)||samples.length<2)throw Error('Trajectory requires at least two samples');
  for(let i=0;i<samples.length;i++){
   const s=samples[i];
   if(!s||!Number.isFinite(s.x)||!Number.isFinite(s.y)||!Number.isFinite(s.t)
      ||i>0&&s.t<=samples[i-1].t)throw Error('Invalid monotonic trajectory samples');
  }
 }
 function closestSegments(a,b,c,d){
  // Closest points on two finite segments, including parallel and degenerate cases.
  const ux=b.x-a.x,uy=b.y-a.y,vx=d.x-c.x,vy=d.y-c.y,wx=a.x-c.x,wy=a.y-c.y;
  const A=ux*ux+uy*uy,B=ux*vx+uy*vy,C=vx*vx+vy*vy,D=ux*wx+uy*wy,E=vx*wx+vy*wy;
  const EPS=1e-10;
  let s=0,t=0;
  if(A<EPS&&C<EPS){s=0;t=0}
  else if(A<EPS){s=0;t=clamp01(E/C)}
  else if(C<EPS){t=0;s=clamp01(-D/A)}
  else{
   const denom=A*C-B*B;
   s=denom>EPS?clamp01((B*E-C*D)/denom):0;
   t=clamp01((B*s+E)/C);
   s=clamp01((B*t-D)/A);
   // A second clamp can shift the other parameter at an endpoint.
   t=clamp01((B*s+E)/C);
  }
  const p={x:a.x+s*ux,y:a.y+s*uy},q={x:c.x+t*vx,y:c.y+t*vy};
  return {distance:Math.hypot(p.x-q.x,p.y-q.y),point:{x:(p.x+q.x)/2,y:(p.y+q.y)/2},
    timeA:a.t+(b.t-a.t)*s,timeB:c.t+(d.t-c.t)*t};
 }
 function interpolate(samples,time){
  if(time<=samples[0].t)return samples[0];
  if(time>=samples[samples.length-1].t)return samples[samples.length-1];
  let low=0,high=samples.length-1;
  while(high-low>1){const mid=(high+low)>>1;if(samples[mid].t<=time)low=mid;else high=mid}
  const a=samples[low],b=samples[high],f=(time-a.t)/(b.t-a.t);
  return {t:time,x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f};
 }
 function assess(pathA,pathB,opts={}){
  validate(pathA);validate(pathB);
  const clearance=Number(opts.clearanceMetres??2.4);
  const step=Number(opts.stepSeconds??0.15);
  if(!Number.isFinite(clearance)||clearance<=0||!Number.isFinite(step)||step<=0)throw Error('Invalid interaction thresholds');
  const start=Math.max(pathA[0].t,pathB[0].t);
  const end=Math.min(pathA[pathA.length-1].t,pathB[pathB.length-1].t);
  let closest=null;
  // Even an off-time crossing remains a useful spatial candidate.
  for(let i=1;i<pathA.length;i++)for(let j=1;j<pathB.length;j++){
   const item=closestSegments(pathA[i-1],pathA[i],pathB[j-1],pathB[j]);
   if(!closest||item.distance<closest.distance-1e-8
     ||Math.abs(item.distance-closest.distance)<1e-8&&Math.abs(item.timeA-item.timeB)<Math.abs(closest.timeA-closest.timeB))
    closest=item;
  }
  let simultaneous=null;
  if(start<=end){
   const count=Math.max(1,Math.ceil((end-start)/step));
   // Include original sample timestamps as well as the uniform time grid so
   // true simultaneous crossings at sample boundaries are not missed.
   const times=new Set();
   for(let i=0;i<=count;i++)times.add(start+(end-start)*i/count);
   for(const p of [...pathA,...pathB])if(p.t>=start&&p.t<=end)times.add(p.t);
   for(const time of times){
    const a=interpolate(pathA,time),b=interpolate(pathB,time),distance=Math.hypot(a.x-b.x,a.y-b.y);
    if(!simultaneous||distance<simultaneous.distance){
     simultaneous={distance,time,point:{x:(a.x+b.x)/2,y:(a.y+b.y)/2}};
    }
   }
  }
  const spatial=closest.distance<=clearance;
  const overlap=Boolean(simultaneous&&simultaneous.distance<=clearance);
  return {
   type:overlap?'possible_overlap':spatial?'paths_intersect_different_times':'separate_paths',
   spatialCandidate:spatial,simultaneousCandidate:overlap,
   clearanceMetres:clearance,closestSpatialMetres:closest.distance,
   closestSimultaneousMetres:simultaneous?.distance??null,
   arrivalGapSeconds:spatial?Math.abs(closest.timeA-closest.timeB):null,
   timeSeconds:overlap?simultaneous.time:null,
   point:overlap?simultaneous.point:spatial?closest.point:null,
   // A geometric 'possible overlap' is not an accident finding: swept bodies,
   // steering, braking, priority and calibration are not yet modelled.
   model:'projected-centreline-clearance'
  };
 }
 return Object.freeze({assess,closestSegments,interpolate});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=ConflictEngine;
