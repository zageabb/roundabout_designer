function renderVehicles(){
 normalizeVehicles();
 $('vehicles').innerHTML=['A','B'].map(id=>{
 const v=state.vehicles[id],n=v.side==='circulating'?state.circulating:state.arms[v.arm][v.side==='exit'?'out':'in'];
 return '<div class="vehicle-card"><strong>Vehicle '+id+'</strong><div class="row">'+
 '<select data-vehicle="'+id+'" data-field="arm" '+(v.side==='circulating'?'disabled':'')+'>'+['North','East','South','West'].map(x=>'<option '+(x===v.arm?'selected ':'')+'value="'+x+'">'+x+'</option>').join('')+'</select>'+
 '<select data-vehicle="'+id+'" data-field="side"><option value="entry" '+(v.side==='entry'?'selected':'')+'>Entry</option><option value="exit" '+(v.side==='exit'?'selected':'')+'>Exit</option><option value="circulating" '+(v.side==='circulating'?'selected':'')+'>Roundabout</option><option value="merging" '+(v.side==='merging'?'selected':'')+' disabled>Joining…</option><option value="exiting" '+(v.side==='exiting'?'selected':'')+' disabled>Leaving…</option></select>'+
 '<select data-vehicle="'+id+'" data-field="lane">'+Array.from({length:n},(_,i)=>'<option value="'+(i+1)+'" '+(v.lane===i+1?'selected':'')+'>Lane '+(i+1)+'</option>').join('')+'</select></div>'+(v.side==='entry'||v.side==='merging'?'<div class="row"><label>Circulating destination lane</label><select data-vehicle="'+id+'" data-field="targetLane" '+(v.side==='merging'?'disabled':'')+'>'+Array.from({length:state.circulating},(_,i)=>'<option value="'+(i+1)+'" '+(v.targetLane===i+1?'selected':'')+'>Lane '+(i+1)+'</option>').join('')+'</select></div>':'')+(v.side==='circulating'?'<div class="row"><label>Angle clockwise from North</label><input type="range" min="0" max="355" step="5" style="width:100%;min-width:130px" data-vehicle="'+id+'" data-field="angle" value="'+Math.round(v.angle)+'"><output>'+Math.round(v.angle)+'°</output><button type="button" data-nudge="-1" data-vehicle="'+id+'">−1°</button><button type="button" data-nudge="1" data-vehicle="'+id+'">+1°</button></div>':'')+(v.side==='entry'||v.side==='merging'||v.side==='circulating'?'<div class="row"><label>Exit destination</label><select data-vehicle="'+id+'" data-field="exitArm" '+(v.side==='merging'?'disabled':'')+'><option value="none" '+(v.exitArm==='none'?'selected':'')+'>Keep circulating</option>'+selectableExitArms(v,state).map(arm=>'<option value="'+arm+'" '+(v.exitArm===arm?'selected':'')+'>'+arm+(arm===v.arm?' (return)':'')+'</option>').join('')+'</select>'+'<label>Exit lane</label><select data-vehicle="'+id+'" data-field="exitLane" '+(v.side==='merging'||v.exitArm==='none'?'disabled':'')+'>'+Array.from({length:state.arms[v.exitArm]?.out||1},(_,i)=>'<option value="'+(i+1)+'" '+(v.exitLane===i+1?'selected':'')+'>Lane '+(i+1)+'</option>').join('')+'</select></div>':'')+(v.side==='entry'||v.side==='merging'||v.side==='circulating'?'<div class="row"><label><input type="checkbox" data-vehicle="'+id+'" data-field="overrideExitRules" '+(v.overrideExitRules?'checked ':'')+(v.side==='merging'?'disabled':'')+'> Override lane turn rules</label></div>'+(violatesExitRule(v,state)?'<p class="warning">Rule-breaking route: '+v.arm+' lane '+v.entryLane+' → '+v.exitArm+'. Scenario override enabled.</p>':''):'')+'<div class="row"><label>Vehicle '+id+' speed (°/s)</label><input type="number" min="0" max="90" step="5" data-vehicle="'+id+'" data-field="speed" value="'+v.speed+'"></div></div>';
 }).join('');
 $('vehicles').querySelectorAll('select,input').forEach(el=>{el.onchange=()=>{
 const v=state.vehicles[el.dataset.vehicle];
 if(el.dataset.field==='side'&&el.value==='circulating'&&v.side!=='circulating')v.angle=45;
 if(el.dataset.field==='side'&&el.value==='entry'){v.progress=0;v.mergeProgress=0;v.waiting=false;v.targetLane=Math.min(state.circulating,v.lane);v.exitArm=undefined}
 if(el.dataset.field==='lane'&&v.side==='entry')v.targetLane=Math.min(state.circulating,Number(el.value));
 v[el.dataset.field]=el.dataset.field==='overrideExitRules'?el.checked:['lane','angle','speed','targetLane','exitLane'].includes(el.dataset.field)?Number(el.value):el.value;
 if((el.dataset.field==='lane'||el.dataset.field==='arm')&&v.side==='entry'){v.entryLane=v.lane;v.exitArm=undefined}
 stopPlayback();clearScenario();normalizeVehicles();renderVehicles();draw();
 };if(el.dataset.field==='angle')el.oninput=()=>{state.vehicles[el.dataset.vehicle].angle=Number(el.value);el.parentElement.querySelector('output').textContent=el.value+'°';stopPlayback();clearScenario();draw()};});
 $('vehicles').querySelectorAll('button[data-nudge]').forEach(btn=>btn.onclick=()=>{
 const v=state.vehicles[btn.dataset.vehicle];
 stopPlayback();clearScenario();v.angle=(v.angle+Number(btn.dataset.nudge)+360)%360;
 renderVehicles();draw();
 });
}
const $=x=>document.getElementById(x);
function clamp(v,a,b){return Math.min(b,Math.max(a,v))}
function updateStatus(t){$('status').textContent=t}
function renderControls(){
 $('circulating').value=state.circulating;$('diameter').value=state.diameter;$('width').value=state.width;$('displayScale').value=state.displayScale;$('laneNumbers').checked=state.laneNumbers;$('showRoutes').checked=state.showRoutes;
 $('tabs').innerHTML=Object.keys(state.arms).map(d=>'<button class="'+(d===active?'on':'')+'" data-arm="'+d+'">'+d+'</button>').join('');
 $('tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>{active=b.dataset.arm;renderControls()});
 const a=state.arms[active];$('incoming').value=a.in;$('outgoing').value=a.out;
 $('lanes').innerHTML=a.moves.map((m,i)=>'<div class="lane"><label>Lane '+(i+1)+'</label><select data-lane="'+i+'">'+moves.map(x=>'<option value="'+x+'"'+(x===m?' selected':'')+'>'+labels[x]+'</option>').join('')+'</select></div>').join('');
 $('lanes').querySelectorAll('select').forEach(s=>s.onchange=()=>{stopPlayback();clearScenario();a.moves[+s.dataset.lane]=s.value;renderVehicles();draw();renderConnectivity()});renderConnectivity();renderVehicles();
}
function routeDestination(origin,movement){
 const directions=['North','East','South','West'];
 const delta={L:1,S:2,R:3}[movement];
 return directions[(directions.indexOf(origin)+delta)%4];
}
function deriveConnections(config){
 return Object.entries(config.arms).flatMap(([origin,arm])=>arm.moves.flatMap((rule,index)=>
   rule.split('').filter(m=>['L','S','R'].includes(m)).map(movement=>({
     origin,lane:index+1,movement,destination:routeDestination(origin,movement)
   }))));
}
function provisionalLaneMapping(config){
 const n=config.circulating;
 return deriveConnections(config).map(c=>{
   const approach=config.arms[c.origin];
   // Number circulating lanes outer-to-inner. Prefer outer for left,
   // middle for straight, inner for right. This is NOT a validated path.
   const desired=c.movement==='L'?1:c.movement==='S'?Math.ceil((n+1)/2):n;
   const entry=Math.max(1,Math.min(n,desired));
   const dest=config.arms[c.destination];
   const exit=Math.max(1,Math.min(dest.out,c.movement==='R'?dest.out:1));
   return {...c,circulatingLane:entry,exitLane:exit,status:'provisional'};
 });
}
function validateNetwork(config){
 const issues=[];
 for(const [name,arm] of Object.entries(config.arms)){
   if(!Number.isInteger(arm.in)||arm.in<1||arm.in>6||!Number.isInteger(arm.out)||arm.out<1||arm.out>6)issues.push(name+': lane count must be 1–6');
   if(!Array.isArray(arm.moves)||arm.moves.length!==arm.in||arm.moves.some(m=>!moves.includes(m)))issues.push(name+': invalid permitted movements');
 }
 if(!Number.isInteger(config.circulating)||config.circulating<1||config.circulating>5)issues.push('Circulating lane count must be 1–5');
 return issues;
}
function renderConnectivity(){
 const issues=validateNetwork(state);
 const connections=issues.length?[]:provisionalLaneMapping(state).filter(item=>item.origin===active);
 $('connections').innerHTML=issues.length?'<p class="warning">'+issues.join('; ')+'</p>':
 connections.map(c=>'<div>Entry '+c.lane+' · '+labels[c.movement]+' → '+c.destination+' (circulating '+c.circulatingLane+', exit '+c.exitLane+')</div>').join('');
 $('networkNotice').textContent=issues.length?issues.join(' · '):'Provisional mapping only — actual merging, lane changing and spiral alignment not verified.';
}
function inputValue(id,min,max,step,cb){$(id).addEventListener('change',()=>{const v=clamp(Number($(id).value)||min,min,max);stopPlayback();clearScenario();cb(step?Math.round(v/step)*step:v);renderControls();draw()})}
inputValue('circulating',1,5,1,v=>state.circulating=v);
inputValue('diameter',12,85,1,v=>state.diameter=v);
inputValue('width',2.5,5,.1,v=>state.width=v);
inputValue('displayScale',8,14,.5,v=>state.displayScale=v);
$('laneNumbers').onchange=()=>{state.laneNumbers=$('laneNumbers').checked;draw()};
$('showRoutes').onchange=()=>{state.showRoutes=$('showRoutes').checked;draw()};
inputValue('incoming',1,6,1,v=>{const a=state.arms[active];a.in=v;while(a.moves.length<v)a.moves.push('S');a.moves.length=v});
inputValue('outgoing',1,6,1,v=>state.arms[active].out=v);
$('drivingMode').value=state.drivingMode;
$('minGap').value=state.minGap;
$('drivingMode').onchange=()=>{stopPlayback();clearScenario();state.drivingMode=$('drivingMode').value;draw()};
$('minGap').onchange=()=>{stopPlayback();clearScenario();state.minGap=Math.max(2,Math.min(30,Number($('minGap').value)||8));$('minGap').value=state.minGap;draw()};
$('playCars').onclick=()=>{if(playback)return;playback=true;previousFrame=null;$('playCars').textContent='Playing';playbackFrame=requestAnimationFrame(playbackTick)};
$('pauseCars').onclick=stopPlayback;
$('replayCars').onclick=replayScenario;
$('showTrails').checked=state.showTrails!==false;
$('showTrails').onchange=()=>{state.showTrails=$('showTrails').checked;draw()};
$('exportEvents').onclick=()=>{
 const rows=[['elapsed_seconds','vehicle','event','details'],...(runState?.events||[]).map(e=>[e.time.toFixed(3),e.vehicle,e.event,e.detail])];
 const content=rows.map(row=>row.map(x=>'"'+String(x).replace(/"/g,'""')+'"').join(',')).join('\r\n');
 download('roundabout-events.csv',content,'text/csv;charset=utf-8');
};
$('stepCars').onclick=()=>{stopPlayback();advanceVehicles(5)};
