function draw(){
 normalizeVehicles();
 proximityWarning();
 const issues=validateNetwork(state);if(issues.length){updateStatus(issues.join('; '));return}
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
   svg+=line(-ei-flare*.55,join+30,-10,join+30,'white',4,'10 7');
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
   svg+='</g>';
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
 const orientation={South:0,West:90,North:180,East:270};
 for(const id of ['A','B']){
 const v=state.vehicles[id];
 const n=v.side==='circulating'?state.circulating:state.arms[v.arm][v.side==='exit'?'out':'in'];
 const x=v.side==='entry'||v.side==='merging'?-n*w+(v.lane-.5)*w:(v.lane-.5)*w;
 const y=v.side==='exit'?outer+142:join+(v.side==='entry'?210-165*v.progress:210),angle=orientation[v.side==='exiting'?v.exitArm:v.arm],fill=id==='A'?'#f5ba43':'#4bb9f3';
 // Circulating lane 1 is outermost; all vehicle headings follow UK clockwise flow.
 const radius=inner+(state.circulating-v.lane+.5)*w,theta=v.angle*Math.PI/180;
 const curve=v.side==='merging'?mergeGeometry(v,v.mergeProgress,state):null;
 const exitCurve=v.side==='exiting'?exitGeometry(v,v.exitProgress,state):null;
 const placement=v.side==='circulating'
 ?'translate('+(radius*Math.sin(theta))+' '+(-radius*Math.cos(theta))+') rotate('+(v.angle+90)+')'
 :v.side==='merging'
 ?'rotate('+angle+') translate('+curve.x+' '+curve.y+') rotate('+curve.heading+')'
 :v.side==='exiting'
 ?'rotate('+angle+') translate('+exitCurve.x+' '+exitCurve.y+') rotate('+exitCurve.heading+')'
 :'rotate('+angle+') translate('+x+' '+y+')'+(v.side==='exit'?' rotate(180)':'');
 svg+='<g transform="'+placement+'">';
 svg+='<rect x="-13" y="-20" width="26" height="40" rx="7" fill="'+fill+'" stroke="#19354b" stroke-width="2.5"/>';
 svg+='<rect x="-9" y="-10" width="18" height="12" rx="3" fill="#dceef5" stroke="#19354b"/>';
 svg+='<text x="0" y="3" font-size="16" fill="#102d42" font-weight="800" text-anchor="middle" dominant-baseline="middle">'+id+'</text></g>';
 }
 svg+='</g></svg>';
 $('view').innerHTML=svg;
}
