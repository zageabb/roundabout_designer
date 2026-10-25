/* Junction-independent lane-network foundations.
 * Zero DOM/global state dependencies. This classic-script wrapper is also
 * CommonJS-loadable for CI and future use in a Worker / Node simulation.
 * Geometry at each connector is provisional until the shared path refactor.
 */
const LaneNetwork=(()=>{
 'use strict';
 const ARMS=Object.freeze(['North','East','South','West']);
 const TURNS=Object.freeze({L:1,S:2,R:3});
 const finiteInt=(value,min,max)=>Number.isInteger(value)&&value>=min&&value<=max;
 const laneId=(role,arm,lane)=>role+':'+arm+':'+lane;
 const ringId=(arm,section,lane)=>'ring:'+arm+':'+section+':'+lane;
 function destination(origin,turn){
  const index=ARMS.indexOf(origin);
  if(index<0||!Object.hasOwn(TURNS,turn))throw Error('Invalid origin or turn');
  return ARMS[(index+TURNS[turn])%4];
 }
 function validate(config){
  if(!config||!config.arms||!finiteInt(config.circulating,1,5))throw Error('Invalid lane-network configuration');
  for(const arm of ARMS){
   const a=config.arms[arm];
   if(!a||!finiteInt(a.in,1,6)||!finiteInt(a.out,1,6)||!Array.isArray(a.moves)||a.moves.length!==a.in
     ||a.moves.some(m=>typeof m!=='string'||m.length===0||[...m].some(ch=>!Object.hasOwn(TURNS,ch))))
    throw Error('Invalid '+arm+' lane configuration');
  }
 }
 function movements(config){
  validate(config);
  return ARMS.flatMap(origin=>config.arms[origin].moves.flatMap((allowed,index)=>
   [...allowed].map(movement=>({
    origin,lane:index+1,movement,destination:destination(origin,movement)
   }))));
 }
 function permittedExits(config,origin,entryLane){
  validate(config);
  if(!ARMS.includes(origin)||!finiteInt(entryLane,1,config.arms[origin].in))throw Error('Invalid entry lane');
  return [...new Set([...config.arms[origin].moves[entryLane-1]].map(turn=>destination(origin,turn)))];
 }
 function suggestedLane(config,turn,dest){
  const desired=turn==='L'?1:turn==='S'?Math.ceil((config.circulating+1)/2):config.circulating;
  return {
   circulatingLane:Math.max(1,Math.min(config.circulating,desired)),
   exitLane:Math.max(1,Math.min(config.arms[dest].out,turn==='R'?config.arms[dest].out:1))
  };
 }
 function build(config){
  validate(config);
  const segments=[],nodes=[],lanes=[],connectors=[];
  for(let i=0;i<ARMS.length;i++){
   const arm=ARMS[i],next=ARMS[(i+1)%4],a=config.arms[arm];
   // A roundabout arm is an exit diverge followed clockwise by an entry merge.
   nodes.push({id:'node:'+arm+':exit',type:'diverge',arm,control:'none'});
   nodes.push({id:'node:'+arm+':entry',type:'merge',arm,control:config.entryPriority?.[arm]==='none'?'none':'give-way'});
   for(const [role,count,direction] of [['in',a.in,'toward-junction'],['out',a.out,'away-from-junction']]){
    const id='segment:'+arm+':'+role;
    segments.push({id,type:'approach',arm,direction,laneCount:count});
    for(let lane=1;lane<=count;lane++)lanes.push({id:laneId(role,arm,lane),segmentId:id,type:role,lane,arm});
   }
   for(const section of ['exit-to-merge','merge-to-next-exit']){
    const id='segment:ring:'+arm+':'+section;
    segments.push({id,type:'one-way',from:section==='exit-to-merge'?'node:'+arm+':exit':'node:'+arm+':entry',to:section==='exit-to-merge'?'node:'+arm+':entry':'node:'+next+':exit',laneCount:config.circulating});
    for(let lane=1;lane<=config.circulating;lane++){
     lanes.push({id:ringId(arm,section,lane),segmentId:id,type:'circulating',lane,arm});
    }
   }
   for(let lane=1;lane<=config.circulating;lane++){
    connectors.push({id:'continue:'+arm+':'+lane,from:ringId(arm,'exit-to-merge',lane),to:ringId(arm,'merge-to-next-exit',lane),type:'continuation',nodeId:'node:'+arm+':entry'});
    connectors.push({id:'passing:'+next+':'+lane,from:ringId(arm,'merge-to-next-exit',lane),to:ringId(next,'exit-to-merge',lane),type:'continuation',nodeId:'node:'+next+':exit'});
    for(let out=1;out<=config.arms[next].out;out++){
     connectors.push({id:'leave:'+next+':'+lane+':'+out,from:ringId(arm,'merge-to-next-exit',lane),to:laneId('out',next,out),type:'diverge',nodeId:'node:'+next+':exit',provisional:true});
    }
    for(let entry=1;entry<=a.in;entry++){
     connectors.push({id:'join:'+arm+':'+entry+':'+lane,from:laneId('in',arm,entry),to:ringId(arm,'merge-to-next-exit',lane),type:'merge',nodeId:'node:'+arm+':entry',control:'give-way',provisional:true});
    }
   }
  }
  const turns=movements(config).map(m=>{
   const suggestion=suggestedLane(config,m.movement,m.destination);
   return {...m,id:'turn:'+m.origin+':'+m.lane+':'+m.destination,
    entryLaneId:laneId('in',m.origin,m.lane),
    exitLaneId:laneId('out',m.destination,suggestion.exitLane),
    ...suggestion,legal:true,status:'provisional'};
  });
  return {version:1,type:'roundabout',direction:'clockwise',handedness:'left',
   nodes,segments,lanes,connectors,turns};
 }
 function routeForVehicle(config,v){
  const origin=v.arm,entryLane=Math.floor(v.entryLane||v.lane||1);
  const allowed=permittedExits(config,origin,entryLane);
  const exitArm=v.exitArm||'none';
  if(exitArm!=='none'&&!ARMS.includes(exitArm))throw Error('Invalid exit');
  const targetLane=Math.floor(v.targetLane||v.lane||1);
  if(!finiteInt(targetLane,1,config.circulating))throw Error('Invalid target circulating lane');
  const exitLane=exitArm==='none'?null:Math.floor(v.exitLane||1);
  if(exitArm!=='none'&&!finiteInt(exitLane,1,config.arms[exitArm].out))throw Error('Invalid exit lane');
  const legal=exitArm==='none'||allowed.includes(exitArm);
  const steps=[laneId('in',origin,entryLane),ringId(origin,'merge-to-next-exit',targetLane)];
  if(exitArm!=='none'){
   let index=ARMS.indexOf(origin);
   do {
    const next=ARMS[(index+1)%4];
    if(next===exitArm){steps.push(laneId('out',exitArm,exitLane));break}
    steps.push(ringId(next,'exit-to-merge',targetLane));
    steps.push(ringId(next,'merge-to-next-exit',targetLane));
    index=(index+1)%4;
   }while(steps.length<12);
  }
  return {origin,entryLane,destination:exitArm,exitLane,circulatingLane:targetLane,
   legal,violation:!legal,overrideEnabled:v.overrideExitRules===true,
   availableExits:allowed,laneIds:steps,kind:exitArm==='none'?'circulate':'to-exit'};
 }
 // Geometry used by the sprite renderer and the trajectory/trail recorder.
 // Both paths deliberately sample the same existing cubic merge/exit curves.
 function sampleVehiclePose(config,v,curves={}){
  const width=config.width*config.displayScale,inner=config.diameter*3.1,outer=inner+config.circulating*width;
  const angleByArm={South:0,West:90,North:180,East:270};
  if(v.side==='circulating'){
   const radius=inner+(config.circulating-v.lane+.5)*width;
   const angle=v.angle*Math.PI/180;
   return {x:radius*Math.sin(angle),y:-radius*Math.cos(angle),heading:v.angle+90,phase:'circulating'};
  }
  const arm=v.side==='exiting'?v.exitArm:v.arm;
  if(!Object.hasOwn(angleByArm,arm))throw Error('Unknown vehicle approach');
  const rot=angleByArm[arm],t=rot*Math.PI/180;
  let x,y,heading=0;
  if(v.side==='merging'){
   if(typeof curves.mergeGeometry!=='function')throw Error('Missing merge geometry');
   const p=curves.mergeGeometry(v,v.mergeProgress||0,config);
   x=p.x;y=p.y;heading=p.heading;
  }else if(v.side==='exiting'){
   if(typeof curves.exitGeometry!=='function')throw Error('Missing exit geometry');
   const p=curves.exitGeometry(v,v.exitProgress||0,config);
   x=p.x;y=p.y;heading=p.heading;
  }else if(v.side==='exit'){
   x=(v.lane-.5)*width;y=outer+142;heading=180;
  }else if(v.side==='entry'){
   x=-config.arms[arm].in*width+(v.lane-.5)*width;
   y=outer-18+210-165*(v.progress||0);
  }else throw Error('Invalid vehicle phase');
  return {x:x*Math.cos(t)-y*Math.sin(t),y:x*Math.sin(t)+y*Math.cos(t),
   heading:rot+heading,phase:v.side};
 }
 function mergeRelationship(a,b){
  if(a.arm!==b.arm)return {type:'other-approach',conflicts:false};
  if(a.lane===b.lane)return {type:'same-entry-lane',conflicts:true};
  if(a.targetLane===b.targetLane)return {type:'shared-target-lane',conflicts:true};
  if((a.lane-b.lane)*(a.targetLane-b.targetLane)<0)return {type:'crossing-lane-paths',conflicts:true};
  return {type:'parallel-independent',conflicts:false};
 }
 return Object.freeze({ARMS,destination,validate,movements,permittedExits,build,routeForVehicle,sampleVehiclePose,mergeRelationship});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=LaneNetwork;
