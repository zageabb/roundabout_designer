/* Roundabout adapter: project existing car motion without manipulating UI state.
 * ConflictEngine itself has no roundabout, browser or UK driving assumptions.
 * This forecast intentionally ignores interaction-based braking and yielding.
 */
const ConflictProjection=(()=>{
 'use strict';
 const ENTRY_ANGLES={North:0,East:90,South:180,West:270};
 function crosses(before,step,target){
  return step>0&&(target-before+360)%360<=step+1e-7;
 }
 function advance(config,v,seconds,geometry,playbackSpeed=20){
  const movement=seconds*playbackSpeed*Math.max(0,Number(v.speed??20))/20;
  if(!movement)return;
  if(v.side==='entry'){
   v.progress=Math.min(1,(v.progress||0)+movement/45);
   if(v.progress>=1){v.side='merging';v.mergeProgress=0;v.waiting=false}
  }else if(v.side==='merging'){
   v.mergeProgress=Math.min(1,(v.mergeProgress||0)+movement/55);
   if(v.mergeProgress>=1){
    const last=geometry.mergeGeometry(v,1,config);
    v.side='circulating';v.lane=v.targetLane;
    v.angle=(ENTRY_ANGLES[v.arm]+last.arrivalAngle)%360;
    v.mergeProgress=0;
   }
  }else if(v.side==='circulating'){
   const start=geometry.circularExitStart;
   if(v.exitArm&&v.exitArm!=='none'&&crosses(v.angle,movement,start(v.exitArm,config))){
    v.angle=start(v.exitArm,config);v.side='exiting';v.exitProgress=0;
   }else v.angle=(v.angle+movement)%360;
  }else if(v.side==='exiting'){
   v.exitProgress=Math.min(1,(v.exitProgress||0)+movement/55);
   if(v.exitProgress>=1){
    v.side='exit';v.arm=v.exitArm;v.lane=v.exitLane;
    v.exitArm='none';v.exitProgress=0;
   }
  }
 }
 function forecast(config,vehicle,geometry,options={}){
  if(!config?.displayScale||!geometry||typeof geometry.mergeGeometry!=='function'
   ||typeof geometry.exitGeometry!=='function'||typeof geometry.circularExitStart!=='function')
   throw Error('Missing projection configuration or path callbacks');
  const horizon=Number(options.horizonSeconds??8),step=Number(options.stepSeconds??0.25);
  if(!Number.isFinite(horizon)||horizon<=0||horizon>60
   ||!Number.isFinite(step)||step<=0||step>1)throw Error('Invalid forecast horizon/step');
  const playback=Number(options.playbackSpeed??20);
  if(!Number.isFinite(playback)||playback<=0)throw Error('Invalid playback rate');
  const v={...vehicle},samples=[],count=Math.ceil(horizon/step);
  const append=t=>{
   const pose=geometry.sampleVehiclePose(config,v,geometry);
   samples.push({t,x:pose.x/config.displayScale,y:pose.y/config.displayScale,heading:pose.heading,phase:v.side});
  };
  append(0);
  for(let i=1;i<=count;i++){
   const t=Math.min(horizon,i*step),elapsed=t-samples[samples.length-1].t;
   advance(config,v,elapsed,geometry,playback);
   append(t);
  }
  return samples;
 }
 function assessVehicles(config,vehicles,geometry,options={}){
  const samplesA=forecast(config,vehicles.A,geometry,options);
  const samplesB=forecast(config,vehicles.B,geometry,options);
  const core=typeof ConflictEngine!=='undefined'?ConflictEngine:require('./conflict-engine.js');
  const result=core.assessFootprints(samplesA,samplesB,{
   lengthA:vehicles.A.lengthMetres??4.4,widthA:vehicles.A.widthMetres??1.8,
   lengthB:vehicles.B.lengthMetres??4.4,widthB:vehicles.B.widthMetres??1.8,
   marginMetres:options.marginMetres??0.15,stepSeconds:0.15
  });
  return {...result,point:result.point?{
   x:result.point.x*config.displayScale,
   y:result.point.y*config.displayScale}:null,
   horizonSeconds:Number(options.horizonSeconds??8),
   assumption:'sampled vehicle rectangles at constant speed; ignores priority, yielding, braking and continuous swept-body motion'};
 }
 return Object.freeze({forecast,assessVehicles});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=ConflictProjection;
