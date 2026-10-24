function allowedExitArms(v,config){
 const lanes=config.arms[v.arm],lane=Math.min(lanes.in,Math.max(1,Math.floor(v.entryLane||v.lane||1)));
 return LaneNetwork.permittedExits(config,v.arm,lane);
}
// Legal routing remains the default. Explicitly enabling this flag makes
// all four exits available (including returning to the entry arm) for
// deliberately unsafe or rule-breaking scenarios.
function selectableExitArms(v,config){
 return v.overrideExitRules?['North','East','South','West']:allowedExitArms(v,config);
}
function violatesExitRule(v,config){
 return v.exitArm && v.exitArm!=='none' && !allowedExitArms(v,config).includes(v.exitArm);
}
function exitSweep(destination,config){
 const w=config.width*config.displayScale,outer=config.diameter*3.1+config.circulating*w;
 const end=Math.max(490,outer+245);
 const p=roadSurfaceGeometry(config,outer,end).mouths[destination].exit.start;
 return Math.min(.8,Math.max(.48,Math.atan2(p[0],p[1])+.055));
}
function circularExitStart(destination,config){
 return (entryAngles[destination]+360-exitSweep(destination,config)*180/Math.PI)%360;
}
function crossesClockwiseAngle(before,step,target){
 const forward=(target-before+360)%360;
 return step>0 && forward<=step+1e-7;
}
// Different approach lanes going into distinct circular lanes can merge together.
// Crossovers, same lane allocations, and identical starts are still serialized.
function mergingPathsConflict(a,b){
 return LaneNetwork.mergeRelationship(a,b).conflicts;
}
let playback=false,playbackFrame=null,previousFrame=null;
let scenarioBaseline=null,runState=null;
// The renderer and trail recorder now read exactly the same canonical pose.
function vehicleWorldPosition(v,config){
 const pose=LaneNetwork.sampleVehiclePose(config,v,{mergeGeometry,exitGeometry});
 return [pose.x,pose.y];
}
function recordScenarioEvent(vehicle,event,detail){
 if(!runState)return;
 runState.events.push({time:runState.seconds,vehicle,event,detail});
 if(runState.events.length>150)runState.events.shift();
}
function addScenarioTrace(id){
 if(!runState)return;
 const p=vehicleWorldPosition(state.vehicles[id],state),history=runState.trails[id];
 const prev=history[history.length-1];
 if(prev&&Math.hypot(p[0]-prev[0],p[1]-prev[1])<3)return;
 history.push(p);if(history.length>360)history.shift();
}
function startScenario(){
 if(scenarioBaseline && runState)return;
 if(!scenarioBaseline)scenarioBaseline=structuredClone(state.vehicles);
 runState={seconds:0,events:[],trails:{A:[],B:[]},waitSeconds:{A:0,B:0}};
 for(const id of ['A','B']){
  const v=state.vehicles[id];
  addScenarioTrace(id);
  recordScenarioEvent(id,'start',v.arm+' lane '+v.lane+(v.exitArm&&v.exitArm!=='none'?' → '+v.exitArm:' → circulating'));
  if(violatesExitRule(v,state))recordScenarioEvent(id,'override','Non-permitted exit '+v.exitArm+' explicitly selected');
 }
 renderScenarioActivity();
}
function clearScenario(){
 scenarioBaseline=null;runState=null;renderScenarioActivity();
}
function replayScenario(){
 stopPlayback();
 if(scenarioBaseline)state.vehicles=structuredClone(scenarioBaseline);
 runState=null;
 normalizeVehicles();renderVehicles();
 startScenario();draw();
 updateStatus('Scenario restarted from the configured vehicle positions.');
}
function renderScenarioActivity(){
 const summary=$('runSummary'),events=$('runEvents');
 if(!summary||!events)return;
 if(!runState){summary.textContent='Ready to run A and B. Replay resets the vehicles to the first Play/Step position.';events.textContent='No events recorded.';return}
 const exited=['A','B'].filter(id=>state.vehicles[id].side==='exit').length;
 summary.textContent='Elapsed '+runState.seconds.toFixed(1)+' s · '+exited+'/2 cars on exit roads · Give-way waiting A '+runState.waitSeconds.A.toFixed(1)+' s, B '+runState.waitSeconds.B.toFixed(1)+' s';
 events.innerHTML=runState.events.slice(-18).reverse().map(e=>'<div><strong>'+e.time.toFixed(1)+' s · '+e.vehicle+' · '+e.event+'</strong> — '+e.detail+'</div>').join('');
}
function trackScenarioTick(delta,before){
 if(!runState)return;
 const rate=Math.max(1,Math.min(90,Number($('playSpeed').value)||20));
 const dt=delta/rate;runState.seconds+=dt;
 for(const id of ['A','B']){
  const v=state.vehicles[id],old=before[id];
  if(v.waiting)runState.waitSeconds[id]+=dt;
  if(v.waiting&&!old.waiting)recordScenarioEvent(id,'waiting','Give-way gap');
  if(!v.waiting&&old.waiting)recordScenarioEvent(id,'moving','Give-way released');
  if(v.side!==old.side){
   const event={merging:'merge started',circulating:'joined',exiting:'exit started',exit:'exited'}[v.side];
   if(event)recordScenarioEvent(id,event,v.side==='exit'?v.arm+' lane '+v.lane:v.side==='exiting'?v.exitArm+' lane '+v.exitLane:'Circulating lane '+v.targetLane);
  }
  addScenarioTrace(id);
 }
 renderScenarioActivity();
}

function normalizeVehicles(){
 if(!state.vehicles)state.vehicles=defaultVehicles();
 for(const id of ['A','B']){
 const v=state.vehicles[id]||{arm:'North',side:'entry',lane:1};
 v.arm=['North','East','South','West'].includes(v.arm)?v.arm:'North';
 v.side=['entry','exit','circulating','merging','exiting'].includes(v.side)?v.side:'entry';
 v.angle=((Number(v.angle??45)%360)+360)%360;
 v.speed=Math.max(0,Math.min(90,Number(v.speed??20)||0));
 v.progress=Math.max(0,Math.min(1,Number(v.progress??0)||0));
 v.waiting=Boolean(v.waiting);
 v.mergeProgress=Math.max(0,Math.min(1,Number(v.mergeProgress)||0));
 v.exitProgress=Math.max(0,Math.min(1,Number(v.exitProgress)||0));
 v.overrideExitRules=v.overrideExitRules===true;
 if(v.side==='entry')v.entryLane=Math.max(1,Math.min(state.arms[v.arm].in,Math.floor(Number(v.lane)||1)));
 else v.entryLane=Math.max(1,Math.min(state.arms[v.arm].in,Math.floor(Number(v.entryLane)||v.lane||1)));
 const destinations=selectableExitArms(v,state);
 if(v.exitArm===undefined)v.exitArm=v.side==='circulating'?'none':allowedExitArms(v,state)[0];
 if(v.side!=='exit' && !['none',...destinations].includes(v.exitArm))v.exitArm=allowedExitArms(v,state)[0];
 const exits=state.arms[v.exitArm]?.out||1;
 v.exitLane=Math.max(1,Math.min(exits,Math.floor(Number(v.exitLane)||Math.min(v.targetLane||v.lane,exits))));
 v.targetLane=Math.max(1,Math.min(state.circulating,Math.floor(Number(v.targetLane??v.lane)||1)));
 const limit=v.side==='circulating'?state.circulating:state.arms[v.arm][v.side==='exit'?'out':'in'];
 v.lane=Math.max(1,Math.min(limit,Math.floor(Number(v.lane)||1)));
 state.vehicles[id]=v;
 }
}
function stopPlayback(){
 playback=false;previousFrame=null;
 if(playbackFrame!==null)cancelAnimationFrame(playbackFrame);
 playbackFrame=null;
 const play=$('playCars');if(play)play.textContent='Play';
}
function safeAdvance(delta){
 const moving=['A','B'].filter(id=>state.vehicles[id].side==='circulating');
 const proposed=Object.fromEntries(moving.map(id=>[id,delta*state.vehicles[id].speed/20]));
 if(state.drivingMode!=='safe'||moving.length<2||state.vehicles.A.lane!==state.vehicles.B.lane)return proposed;
 const a=state.vehicles.A,b=state.vehicles.B;
 const radius=state.diameter*3.1+(state.circulating-a.lane+.5)*state.width*state.displayScale;
 const gapDegrees=state.minGap*180*state.displayScale/(Math.PI*radius);
 // Preserve the order of cars during this integration tick. A car cannot pass
 // its leader in the same lane while safe-following mode is enabled.
 for(const [follower,leader] of [['A','B'],['B','A']]){
  const behind=state.vehicles[follower],ahead=state.vehicles[leader];
  const forward=(ahead.angle-behind.angle+360)%360;
  if(forward<0.0001){proposed[follower]=0;continue}
  const maxMove=Math.max(0,forward-gapDegrees+proposed[leader]);
  proposed[follower]=Math.min(proposed[follower],maxMove);
 }
 return proposed;
}
// The entry stage is intentionally simple. Position 0 is back on the approach;
// position 1 reaches the give-way line and joins the outer circulating lane.
// Enter at the approach-to-circulatory merge angle, not the radial centreline.
// On an east approach this is 135°, rather than a visible jump to 90°.
// This offset is provisional until lane-centreline curved paths are modelled.
const entryAngles={North:0,East:90,South:180,West:270};
// Geometric merge from the approach's give-way line into the outer circular lane.
// local South approach is then rotated into the chosen compass arm.
function mergeGeometry(v,progress,config){
 // Use the SAME entry-mouth geometry that draws the final road perimeter.
 // Local +Y points outward from the junction, -X is the UK entry side.
 const w=config.width*config.displayScale,inner=config.diameter*3.1;
 const outer=inner+config.circulating*w,join=outer-18;
 const end=Math.max(490,outer+245);
 const mouth=roadSurfaceGeometry(config,outer,end).mouths[v.arm].entry;
 const entryCount=config.arms[v.arm].in,targetLane=Math.max(1,Math.min(config.circulating,v.targetLane));
 const radius=outer-(targetLane-.5)*w;
 const x0=-entryCount*w+(v.lane-.5)*w,y0=join+45;
 const lipAngle=Math.atan2(-mouth.start[0],mouth.start[1]);
 // Finish beyond the road shoulder, at the real circulating lane centre.
 // Allow enough sideways travel for the outer entry lane to turn LEFT,
 // without first drifting right towards the splitter island.
 const needed=Math.asin(Math.min(.995,(Math.abs(x0)+Math.max(12,w*.36))/radius));
 const endAngle=Math.min(Math.PI*.49,Math.max(lipAngle+.09,needed));
 const x3=-radius*Math.sin(endAngle),y3=radius*Math.cos(endAngle);
 const lateral=Math.max(0,x0-x3),depth=y0-y3;
 // Constrain both Bézier handles to the span of the endpoints. In the old
 // version x2=x3+65*cos(angle) could exceed x0, causing a wrong-way S-turn.
 const exitHandle=Math.max(0,Math.min(68,lateral*.68/Math.max(.1,Math.cos(endAngle)),depth*.7));
 const x1=x0,y1=y0-Math.min(58,depth*.5);
 const x2=x3+exitHandle*Math.cos(endAngle),y2=y3+exitHandle*Math.sin(endAngle);
 const t=Math.max(0,Math.min(1,progress)),u=1-t;
 const x=u*u*u*x0+3*u*u*t*x1+3*u*t*t*x2+t*t*t*x3;
 const y=u*u*u*y0+3*u*u*t*y1+3*u*t*t*y2+t*t*t*y3;
 const dx=3*u*u*(x1-x0)+6*u*t*(x2-x1)+3*t*t*(x3-x2);
 const dy=3*u*u*(y1-y0)+6*u*t*(y2-y1)+3*t*t*(y3-y2);
 const heading=Math.atan2(dx,-dy)*180/Math.PI;
 return {x,y,heading,arrivalAngle:endAngle*180/Math.PI};
}
function entryGapClear(id){
 const v=state.vehicles[id],target=entryAngles[v.arm];
 const other=state.vehicles[id==='A'?'B':'A'];
 if(other.side==='merging'&&mergingPathsConflict(v,other))return false;
 if(other.side!=='circulating')return true;
 // Vehicles from separate entry lanes following their matching circulating
 // lanes may merge in parallel; the old check held lane 2 behind lane 1.
 if(other.arm===v.arm&&other.entryLane!==v.lane&&other.lane===other.entryLane&&v.targetLane===v.lane&&other.lane!==v.targetLane)return true;
 // Check along the entry's intended outer lane; this is a prototype,
 // conservative at high circulating speeds, not a validated gap model.
 if(other.lane>v.targetLane)return true; // only crossed lanes and the destination lane
 const ahead=(other.angle-target+360)%360;
 const behind=(target-other.angle+360)%360;
 const speed=other.speed*Math.max(1,Number($('playSpeed').value)||20)/20;
 const upstream=Math.min(170,Math.max(42,speed*2+15));
 return !(ahead<32||behind<upstream);
}
function advanceEntries(delta){
 for(const id of ['A','B']){
  const v=state.vehicles[id],speedFactor=Math.max(0,v.speed/20);
  if(v.side==='entry'){
   v.progress=Math.min(1,v.progress+delta*speedFactor/45);
   v.waiting=false;
   if(v.progress<1||!speedFactor)continue;
   if(state.drivingMode==='safe'&&!entryGapClear(id)){v.waiting=true;continue}
   v.side='merging';v.mergeProgress=0;v.waiting=false;
   renderVehicles();
  }else if(v.side==='merging'){
   // A complete merge is deliberately slower than a frame: no teleportation.
   v.mergeProgress=Math.min(1,v.mergeProgress+delta*speedFactor/55);
   if(v.mergeProgress>=1){
    const terminal=mergeGeometry(v,1,state);
    v.side='circulating';v.lane=v.targetLane;v.angle=(entryAngles[v.arm]+terminal.arrivalAngle)%360;
    v.progress=0;v.mergeProgress=0;
    renderVehicles();
   }
  }
 }
}
// Turn smoothly from the circular lane into the selected outbound lane.
// Uses the finished road's exit-mouth profile, matching the same outline as
// roadSurfaceGeometry; unlike the old fixed exit sprites this has a heading tangent.
function exitGeometry(v,progress,config){
 const w=config.width*config.displayScale,inner=config.diameter*3.1,outer=inner+config.circulating*w;
 const join=outer-18,end=Math.max(490,outer+245);
 const profile=roadSurfaceGeometry(config,outer,end).mouths[v.exitArm].exit;
 const radius=outer-(v.lane-.5)*w,beta=exitSweep(v.exitArm,config);
 const x0=radius*Math.sin(beta),y0=radius*Math.cos(beta);
 const x3=(v.exitLane-.5)*w,y3=outer+142;
 const lateral=Math.max(0,x0-x3);
 const handle=Math.min(72,Math.max(0,lateral*.78/Math.cos(beta)),Math.max(10,y3-y0)*.7);
 const x1=x0-handle*Math.cos(beta),y1=y0+handle*Math.sin(beta);
 const x2=x3,y2=y3-Math.min(75,(y3-y0)*.4);
 const t=Math.max(0,Math.min(1,progress)),u=1-t;
 const x=u*u*u*x0+3*u*u*t*x1+3*u*t*t*x2+t*t*t*x3;
 const y=u*u*u*y0+3*u*u*t*y1+3*u*t*t*y2+t*t*t*y3;
 const dx=3*u*u*(x1-x0)+6*u*t*(x2-x1)+3*t*t*(x3-x2);
 const dy=3*u*u*(y1-y0)+6*u*t*(y2-y1)+3*t*t*(y3-y2);
 const heading=Math.atan2(dx,-dy)*180/Math.PI;
 return {x,y,heading,mouth:profile};
}
function advanceVehicles(delta){
 startScenario();
 const before=Object.fromEntries(['A','B'].map(id=>[id,{side:state.vehicles[id].side,waiting:state.vehicles[id].waiting}]));
 const increments=safeAdvance(delta);
 for(const id of ['A','B']){
 const v=state.vehicles[id];
 if(v.side==='circulating'){
  const increment=increments[id];
  if(v.exitArm&&v.exitArm!=='none'&&crossesClockwiseAngle(v.angle,increment,circularExitStart(v.exitArm,state))){
   v.angle=circularExitStart(v.exitArm,state);v.side='exiting';v.exitProgress=0;renderVehicles();
  }else v.angle=(v.angle+increment+360)%360;
 }else if(v.side==='exiting'){
  v.exitProgress=Math.min(1,v.exitProgress+delta*Math.max(0,v.speed/20)/55);
  if(v.exitProgress>=1){
   const destination=v.exitArm,exitLane=v.exitLane;
   v.side='exit';v.arm=destination;v.lane=exitLane;v.exitArm='none';v.exitProgress=0;
   renderVehicles();
  }
 }
 }
 advanceEntries(delta);
 trackScenarioTick(delta,before);
 draw();
 $('vehicles').querySelectorAll('input[data-field="angle"]').forEach(el=>{
 const angle=state.vehicles[el.dataset.vehicle].angle;
 el.value=Math.round(angle/5)*5%360;
 const out=el.parentElement.querySelector('output');if(out)out.textContent=Math.round(angle)+'°';
 });
}
function playbackTick(time){
 if(!playback)return;
 if(previousFrame!==null){
 const dt=Math.min(0.1,Math.max(0,(time-previousFrame)/1000));
 const speed=Math.max(1,Math.min(90,Number($('playSpeed').value)||20));
 advanceVehicles(speed*dt);
 }
 previousFrame=time;playbackFrame=requestAnimationFrame(playbackTick);
}
