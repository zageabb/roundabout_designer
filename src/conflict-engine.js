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

 // Vehicle bodies are oriented rectangles. Headings use the browser's
 // clockwise-from-north convention. All positions/dimensions are metres.
 function footprint(pose,length,width){
  if(!pose||![pose.x,pose.y,pose.heading,length,width].every(Number.isFinite)
      ||length<=0||width<=0)throw Error('Invalid vehicle footprint');
  const a=pose.heading*Math.PI/180,forward=[Math.sin(a),-Math.cos(a)],right=[Math.cos(a),Math.sin(a)];
  const h=length/2,w=width/2;
  return {
   centre:[pose.x,pose.y],radius:Math.hypot(h,w),axes:[forward,right],
   corners:[[h,w],[h,-w],[-h,-w],[-h,w]].map(([f,r])=>[
    pose.x+forward[0]*f+right[0]*r,
    pose.y+forward[1]*f+right[1]*r
   ])
  };
 }
 function polygonsOverlap(a,b){
  for(const axis of [...a.axes,...b.axes]){
   let loA=Infinity,hiA=-Infinity,loB=Infinity,hiB=-Infinity;
   for(const p of a.corners){const d=p[0]*axis[0]+p[1]*axis[1];loA=Math.min(loA,d);hiA=Math.max(hiA,d)}
   for(const p of b.corners){const d=p[0]*axis[0]+p[1]*axis[1];loB=Math.min(loB,d);hiB=Math.max(hiB,d)}
   if(hiA<loB-1e-9||hiB<loA-1e-9)return false;
  }
  return true;
 }
 function pointSegmentDistance(p,a,b){
  const x=b[0]-a[0],y=b[1]-a[1],d=x*x+y*y;
  const t=d>1e-12?clamp01(((p[0]-a[0])*x+(p[1]-a[1])*y)/d):0;
  return Math.hypot(p[0]-a[0]-x*t,p[1]-a[1]-y*t);
 }
 function polygonDistance(a,b){
  const centres=Math.hypot(a.centre[0]-b.centre[0],a.centre[1]-b.centre[1]);
  if(polygonsOverlap(a,b))return 0;
  let closest=Math.max(0,centres-a.radius-b.radius);
  // Quick conservative lower bound: disjoint envelopes cannot be closer.
  if(closest>20)return closest;
  closest=Infinity;
  for(let i=0;i<4;i++){
   const a1=a.corners[i],a2=a.corners[(i+1)%4];
   const b1=b.corners[i],b2=b.corners[(i+1)%4];
   for(const p of b.corners)closest=Math.min(closest,pointSegmentDistance(p,a1,a2));
   for(const p of a.corners)closest=Math.min(closest,pointSegmentDistance(p,b1,b2));
  }
  return closest;
 }
 function interpolatePose(samples,time){
  const s=interpolate(samples,time);
  if(s.heading!==undefined)return s;
  let index=0;
  while(index+1<samples.length-1&&samples[index+1].t<time)index++;
  const a=samples[index],b=samples[index+1],t=clamp01((time-a.t)/(b.t-a.t));
  const change=((b.heading-a.heading+540)%360)-180;
  return {...s,heading:a.heading+change*t,phase:t<.5?a.phase:b.phase};
 }
 function classifyInteraction(a,b){
  const turn=Math.abs(((a.heading-b.heading+540)%360)-180);
  if(a.phase==='merging'||b.phase==='merging')return 'merge';
  if(a.phase==='exiting'||b.phase==='exiting')return 'diverge';
  return turn<=35?'following': 'crossing';
 }
 function assessFootprints(pathA,pathB,opts={}){
  validate(pathA);validate(pathB);
  const lengthA=Number(opts.lengthA??4.4),widthA=Number(opts.widthA??1.8);
  const lengthB=Number(opts.lengthB??4.4),widthB=Number(opts.widthB??1.8);
  const margin=Number(opts.marginMetres??0.15),step=Number(opts.stepSeconds??0.15);
  if(![lengthA,widthA,lengthB,widthB,margin,step].every(Number.isFinite)
      ||lengthA<=0||lengthB<=0||widthA<=0||widthB<=0||margin<0||step<=0)
   throw Error('Invalid footprint or time thresholds');
  const a=pathA.map(p=>footprint(p,lengthA,widthA));
  const b=pathB.map(p=>footprint(p,lengthB,widthB));
  let spatial=null,simultaneous=null;
  for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++){
   const distance=polygonDistance(a[i],b[j]);
   const gap=Math.abs(pathA[i].t-pathB[j].t);
   if(!spatial||distance<spatial.distance-1e-9
      ||Math.abs(distance-spatial.distance)<=1e-9&&gap<spatial.arrivalGapSeconds){
    spatial={distance,arrivalGapSeconds:gap,point:{
     x:(pathA[i].x+pathB[j].x)/2,y:(pathA[i].y+pathB[j].y)/2},
     a:pathA[i],b:pathB[j]};
   }
  }
  const start=Math.max(pathA[0].t,pathB[0].t),end=Math.min(pathA.at(-1).t,pathB.at(-1).t);
  if(start<=end){
   const count=Math.max(1,Math.ceil((end-start)/step)),times=new Set();
   for(let i=0;i<=count;i++)times.add(start+(end-start)*i/count);
   for(const p of [...pathA,...pathB])if(p.t>=start&&p.t<=end)times.add(p.t);
   for(const t of [...times].sort((x,y)=>x-y)){
    const pa=interpolatePose(pathA,t),pb=interpolatePose(pathB,t);
    const distance=polygonDistance(footprint(pa,lengthA,widthA),footprint(pb,lengthB,widthB));
    if(!simultaneous||distance<simultaneous.distance){
     simultaneous={distance,time:t,point:{x:(pa.x+pb.x)/2,y:(pa.y+pb.y)/2},a:pa,b:pb};
    }
   }
  }
  const spatialCandidate=spatial.distance<=margin;
  const simultaneousCandidate=Boolean(simultaneous&&simultaneous.distance<=margin);
  const selected=simultaneousCandidate?simultaneous:spatialCandidate?spatial:null;
  return {
   type:simultaneousCandidate?'possible_overlap':spatialCandidate?'paths_intersect_different_times':'separate_paths',
   spatialCandidate,simultaneousCandidate,
   closestSpatialMetres:spatial.distance,closestSimultaneousMetres:simultaneous?.distance??null,
   arrivalGapSeconds:spatialCandidate?spatial.arrivalGapSeconds:null,
   timeSeconds:simultaneousCandidate?simultaneous.time:null,
   point:selected?.point??null,
   interactionKind:selected?classifyInteraction(selected.a,selected.b):'none',
   model:'sampled-oriented-rectangles',marginMetres:margin,
   vehicleDimensions:{A:{length:lengthA,width:widthA},B:{length:lengthB,width:widthB}}
  };
 }

 return Object.freeze({assess,assessFootprints,footprint,polygonDistance,closestSegments,interpolate});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=ConflictEngine;
