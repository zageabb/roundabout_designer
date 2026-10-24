// Regression coverage for lane-specific entry -> circulating merge geometry.
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const html=require('./read_app').readAppSource();
function extract(start,end){
 const a=html.indexOf(start),b=html.indexOf(end,a);
 assert(a>=0&&b>a,'Cannot extract '+start);
 return html.slice(a,b);
}
const src=extract('function roadSurfaceGeometry(config,outer,end){','function draw(){')
 +extract('function mergeGeometry(v,progress,config){','function entryGapClear(')
 +'\n;({roadSurfaceGeometry,mergeGeometry});';
const {roadSurfaceGeometry,mergeGeometry}=vm.runInNewContext(src);
const config={width:4,displayScale:9.5,circulating:3,diameter:38,arms:{
 North:{in:3,out:2},East:{in:3,out:2},South:{in:4,out:2},West:{in:3,out:2}
}};
const w=config.width*config.displayScale;
const outer=config.diameter*3.1+config.circulating*w;
const end=Math.max(490,outer+245);
const profile=roadSurfaceGeometry(config,outer,end);
for(const arm of ['North','East','South','West']){
 assert(profile.mouths[arm]?.entry?.start?.length===2,'Missing entry mouth '+arm);
 for(let lane=1;lane<=config.arms[arm].in;lane++){
  const targetLane=Math.min(lane,config.circulating);
  const v={arm,lane,targetLane};
  const begin=mergeGeometry(v,0,config);
  const finish=mergeGeometry(v,1,config);
  const x0=-config.arms[arm].in*w+(lane-.5)*w;
  const y0=outer-18+45;
  assert(Math.abs(begin.x-x0)<1e-6 && Math.abs(begin.y-y0)<1e-6,'Approach path must start at give-way position');
  assert(Math.abs(Math.hypot(finish.x,finish.y)-(outer-(targetLane-.5)*w))<.0001,'Merge must finish on chosen circulating lane centreline');
  assert(Math.abs(finish.heading-(finish.arrivalAngle-90))<.001,'Merge final heading must be tangent to clockwise circulation');
  let previous=begin;
  for(let i=1;i<=100;i++){
   const p=mergeGeometry(v,i/100,config);
   assert(p.x<=previous.x+1e-6,arm+' lane '+lane+' turns the wrong way in X at '+i);
   assert(p.y<=previous.y+1e-6,arm+' lane '+lane+' moves outwards at '+i);
   previous=p;
  }
 }
}
// Explicit nonmatching destination remains supported for scenario testing.
const shifted=mergeGeometry({arm:'East',lane:1,targetLane:2},1,config);
assert(Math.abs(Math.hypot(shifted.x,shifted.y)-(outer-1.5*w))<1e-5);
console.log('Merge geometry: all default lanes turn smoothly clockwise, with no initial reverse turn.');
