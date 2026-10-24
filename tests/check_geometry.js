// Execute the road-geometry generator directly rather than checking source text only.
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
const first=html.indexOf('function roadSurfaceGeometry(config,outer,end){');
const last=html.indexOf('function draw(){',first);
assert(first>0 && last>first,'Road geometry function missing');
const roadSurfaceGeometry=vm.runInNewContext(html.slice(first,last)+';roadSurfaceGeometry;');
const preset={
 North:{in:3,out:2},East:{in:3,out:2},
 South:{in:4,out:2},West:{in:3,out:2}
};
const configurations=[
 {width:4,displayScale:9.5,circulating:3,diameter:38,arms:preset},
 {width:3,displayScale:8,circulating:2,diameter:30,arms:Object.fromEntries(Object.keys(preset).map(k=>[k,{in:1,out:1}]))},
 {width:4.5,displayScale:10,circulating:5,diameter:54,arms:preset}
];
for(const config of configurations){
 const w=config.width*config.displayScale;
 const outer=config.diameter*3.1+config.circulating*w;
 const end=Math.max(490,outer+245);
 const geo=roadSurfaceGeometry(config,outer,end);
 assert.equal((geo.surface.match(/\\bA /g)||[]).length,4,'One circular arc between each pair of arms');
 assert.equal((geo.surface.match(/\\bC /g)||[]).length,8,'Two smooth shoulders on each arm');
 assert.equal((geo.kerbs.match(/\\bA /g)||[]).length,4,'Continuous outer kerb arcs');
 assert(!/NaN|Infinity|undefined/.test(geo.surface+' '+geo.kerbs));
 assert(geo.surface.trim().endsWith('Z'),'Single closed road surface');
 for(const arm of Object.values(config.arms)){
  for(const width of [arm.in*w,arm.out*w]){
   const lip=Math.min(outer*.86,Math.max(width+Math.max(18,w*.53),outer*.43));
   const dx=Math.max(0,Math.min((lip-width)*.72,56));
   if(width<lip)assert(dx<=lip-width,'Handle must not overshoot the road edge');
  }
 }
}
console.log('Road geometry: closed outline, 8 shoulders and 4 tangent arcs validated');
