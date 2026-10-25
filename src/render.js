function draw(){
 normalizeVehicles();
 proximityWarning();
 const issues=validateNetwork(state);if(issues.length){updateStatus(issues.join('; '));return}
 const interaction=projectedVehicleInteraction();
 const w=state.width*state.displayScale, inner=state.diameter*3.1, outer=inner+state.circulating*w;
 const join=outer-18, end=Math.max(490,outer+245);
 const extent=end+76, canvas=extent*2;
 let svg='<svg id="diagram" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+canvas+' '+canvas+'" role="img" aria-label="UK left-driving clockwise roundabout"><rect width="'+canvas+'" height="'+canvas+'" fill="#e9f2e5"/><g transform="translate('+extent+' '+extent+')">';
 // One continuous outline removes old arm/disk overlap artifacts.
 const road=roadSurfaceGeometry(state,outer,end);
 svg+='<path d="'+road.surface+'" fill="#454c51"/>';
 svg+='<path d="'+road.kerbs+'" fill="none" stroke="#eef1ed" stroke-width="2.5"/>';
 const arms=[['South',0],['West',90],['North',180],['East',270]];
 for(const [name,rot] of arms){
   const a=state.arms[name],ei=a.in*w,eo=a.out*w,flare=Math.min(w/2,16);
   const shoulder=outer+104;
   svg+='<g transform="rotate('+rot+')">';
   // Rounded splitter nose blends into a constant-width central reservation.
   svg+='<path d="M 0 '+(join+26)+' C -10 '+(join+44)+' -13 '+(join+90)+' -11 '+shoulder+' L -11 '+end+' L 11 '+end+' L 11 '+shoulder+' C 13 '+(join+90)+' 10 '+(join+44)+' 0 '+(join+26)+' Z" fill="#b8cda9" stroke="#edf0e8" stroke-width="2"/>';
   for(let i=1;i<a.in;i++)svg+=line(-ei+i*w,join+65,-ei+i*w,end,'#e3e8e9',2,'13 11');
   for(let i=1;i<a.out;i++)svg+=line(i*w,join+65,i*w,end,'#e3e8e9',2,'13 11');
   // Give-way line is drawn only across the entering lanes.
   if(PriorityRules.entryControl(state,name)==='give-way')svg+=line(-ei-flare*.55,join+30,-10,join+30,'white',4,'10 7');
   for(let i=0;i<a.in;i++){
     const x=-ei+(i+.5)*w;
     if(state.laneNumbers)svg+=text(x,join+105,String(i+1),Math.min(15,w*.47),'#ffcf87');
     svg+=movementArrow(x,join+161,a.moves[i],Math.min(1,w/36));
   }
   for(let i=0;i<a.out;i++){
     const x=(i+.5)*w;
     svg+=line(x,join+145,x,join+175,'white',3);
     svg+='<path d="M '+(x-5)+' '+(join+165)+' L '+x+' '+(join+176)+' L '+(x+5)+' '+(join+165)+'" fill="none" stroke="white" stroke-width="3"/>';
   }
   if(ExitLaneRules.mode(state,name)!=='conventional'){
     const links=ExitLaneRules.connectors(state,name);
     svg+='<text x="'+(w*.85)+'" y="'+(join+62)+'" font-size="11" fill="#9be5f5" text-anchor="middle" aria-label="User-declared marked exit">'+
      links.map(link=>link.fromLane+'→'+link.exitLane).join(' · ')+'</text>';
   }
   svg+='</g>';
 }
 // Exact sampled marked connector centreline guides use the same sampler
 // as vehicle sprites, projection and traces. These are illustrative paths,
 // not imported road markings or a certified swept-envelope design.
 if(state.showRoutes&&ExitLaneRules.mode(state,active)!=='conventional'){
  const armsOrder=['North','East','South','West'];
  const origin=armsOrder[(armsOrder.indexOf(active)+1)%4],exitAngle=circularExitStart(active,state);
  for(const link of ExitLaneRules.connectors(state,active)){
   const base={arm:origin,exitArm:active,lane:link.fromLane,targetLane:link.fromLane,
    exitLane:link.exitLane,autoLaneChange:true,side:'circulating',angle:0};
   const samples=[];
   for(let i=0;i<=24;i++){
    const v={...base,angle:(exitAngle-MarkedExitGeometry.SPAN_DEGREES+
      MarkedExitGeometry.SPAN_DEGREES*i/24+360)%360};
    const pos=LaneNetwork.sampleVehiclePose(state,v,{mergeGeometry,exitGeometry,circularExitStart});
    samples.push([pos.x,pos.y]);
   }
   for(let i=1;i<=18;i++){
    const pos=LaneNetwork.sampleVehiclePose(state,{...base,side:'exiting',exitProgress:i/18},
      {mergeGeometry,exitGeometry,circularExitStart});
    samples.push([pos.x,pos.y]);
   }
   svg+='<polyline aria-label="Marked exit centreline '+link.fromLane+' to '+link.exitLane+
    '" fill="none" stroke="#69dcf0" stroke-width="2.6" stroke-dasharray="8 5" stroke-opacity=".8" points="'+
     samples.map(p=>p[0].toFixed(2)+','+p[1].toFixed(2)).join(' ')+'"/>';
  }
 }
 // Route lines show movement connectivity, NOT exact vehicle swept paths.
 if(state.showRoutes){
   const anchors={North:[0,-1],East:[1,0],South:[0,1],West:[-1,0]};
   const visible=deriveConnections(state).filter(item=>item.origin===active);
   for(const item of visible){
     const p=anchors[item.origin],q=anchors[item.destination],r=outer+28;
     const x=p[0]*r,y=p[1]*r,u=q[0]*r,v=q[1]*r;
     svg+='<path d="M '+x+' '+y+' Q 0 0 '+u+' '+v+'" fill="none" stroke="#65e4f5" stroke-opacity=".45" stroke-width="3" stroke-dasharray="9 8"/>';
   }
 }
 // Projected conflict zone is a small radius around the closest estimated
 // body interaction. This represents temporal occupancy screening, NOT a
 // verified vehicle sweep or legal-fault determination.
 if(state.showConflictZones!==false&&interaction.zone&&interaction.spatialCandidate){
  const zone=interaction.zone,p=zone,color=interaction.simultaneousCandidate?'#ffba60':'#8ce3ff';
  const radius=zone.radiusMetres*state.displayScale;
  svg+='<g transform="translate('+p.x.toFixed(2)+' '+p.y.toFixed(2)+')" aria-label="Projected interaction location">'+
   '<circle class="projected-conflict-zone" r="'+radius.toFixed(2)+'" fill="'+color+'" fill-opacity=".14" stroke="'+color+'" stroke-width="1.5" stroke-opacity=".65"/>'+
   '<circle r="18" fill="none" stroke="'+color+'" stroke-width="4" stroke-dasharray="7 5"/>'+
   '<circle r="4" fill="'+color+'" stroke="#22333e" stroke-width="1.5"/></g>';
 }
 // Curbed central island, not a solid ring covering the entries.
 svg+='<circle r="'+inner+'" fill="#8aaa7e" stroke="#d8dfd3" stroke-width="8"/>';
 for(let k=1;k<state.circulating;k++){
   const r=inner+k*w;
   // Omit centreline marks at entry/exit mouths.
   for(let q=0;q<4;q++){
     const gap=Math.asin(Math.min(.7,(2*w+14)/r));
     const a=q*Math.PI/2+gap,b=(q+1)*Math.PI/2-gap;
     if(a<b)svg+='<path d="M '+(r*Math.sin(a))+' '+(-r*Math.cos(a))+' A '+r+' '+r+' 0 0 1 '+(r*Math.sin(b))+' '+(-r*Math.cos(b))+'" fill="none" stroke="#e7eaeb" stroke-width="2" stroke-dasharray="14 12"/>';
   }
 }
 // The direction tangents are clockwise on the screen; keep them distinct
 // from the per-lane permitted movement arrows.
 for(let deg=40;deg<360;deg+=90){
   const rad=deg*Math.PI/180,r=inner+state.circulating*w/2;
   const x=r*Math.sin(rad),y=-r*Math.cos(rad);
   svg+='<g transform="translate('+x+' '+y+') rotate('+(deg-90)+')">'+line(0,-12,0,12,'#fff',3)+'<path d="M -6 4 L 0 14 L 6 4" fill="none" stroke="#fff" stroke-width="3"/></g>';
 }
 svg+=text(0,-17,'UK',25,'#234b35')+text(0,14,state.circulating+' circulating lanes',13,'#234b35');
 // Labels are NOT children of the rotated arms.
 for(const [name,x,y] of [['North',0,-end-32],['South',0,end+32],['East',end+32,0],['West',-end-32,0]]){
   svg+=text(x,y,name.toUpperCase(),19,'#174862');
 }
 if(state.showTrails&&runState){
  for(const id of ['A','B']){
   const coords=runState.trails[id];
   if(coords.length>1)svg+='<polyline points="'+coords.map(p=>p[0].toFixed(2)+','+p[1].toFixed(2)).join(' ')+'" fill="none" stroke="'+(id==='A'?'#f5ba43':'#4bb9f3')+'" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" opacity=".88"/>';
  }
 }
 for(const id of ['A','B']){
 const v=state.vehicles[id];
 const pose=LaneNetwork.sampleVehiclePose(state,v,{mergeGeometry,exitGeometry,circularExitStart});
 const fill=id==='A'?'#f5ba43':'#4bb9f3';
 const placement='translate('+pose.x+' '+pose.y+') rotate('+pose.heading+')';
 svg+='<g transform="'+placement+'">';
 const bodyWidth=v.widthMetres*state.displayScale,bodyLength=v.lengthMetres*state.displayScale;
 svg+='<rect x="'+(-bodyWidth/2)+'" y="'+(-bodyLength/2)+'" width="'+bodyWidth+'" height="'+bodyLength+'" rx="6" fill="'+fill+'" stroke="#19354b" stroke-width="2.5"/>';
 svg+='<rect x="'+(-bodyWidth*.36)+'" y="'+(-bodyLength*.26)+'" width="'+(bodyWidth*.72)+'" height="'+(bodyLength*.27)+'" rx="3" fill="#dceef5" stroke="#19354b"/>';
 svg+='<text x="0" y="3" font-size="16" fill="#102d42" font-weight="800" text-anchor="middle" dominant-baseline="middle">'+id+'</text></g>';
 }
 svg+='</g></svg>';
 $('view').innerHTML=svg;
}
