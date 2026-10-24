function line(x1,y1,x2,y2,color,thick,dash=''){return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+color+'" stroke-width="'+thick+'" '+(dash?'stroke-dasharray="'+dash+'"':'')+'/>'}
function text(x,y,s,size=17,fill='#fff',anchor='middle'){return '<text x="'+x+'" y="'+y+'" fill="'+fill+'" font-size="'+size+'" font-weight="700" text-anchor="'+anchor+'" dominant-baseline="middle">'+s+'</text>'}
// A single, shared-stem road arrow per inbound lane. Multiple movements branch
// from one trunk, rather than rendering separate arrow glyphs alongside each other.
function movementArrow(x,y,movement,scale=1){
 const left=movement.includes('L'),straight=movement.includes('S'),right=movement.includes('R');
 const p=['M 0 24 L 0 -3'];
 if(straight)p.push('M -5 -12 L 0 -21 L 5 -12');
 if(left){p.push('M 0 -3 Q -1 -12 -13 -12');p.push('M -7 -18 L -15 -12 L -7 -6')}
 if(right){p.push('M 0 -3 Q 1 -12 13 -12');p.push('M 7 -18 L 15 -12 L 7 -6')}
 // Unselected straight direction does not get an arrowhead.
 return '<g transform="translate('+x+' '+y+') scale('+scale+')" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><path d="'+p.join(' ')+'"/></g>';
}
// Geometry-only assessment: clockwise forward headway and relative speed.
// Rates are displayed in degrees/s; estimated metres use the current SVG scale.
function vehicleConflictAssessment(config){
 const a=config.vehicles.A,b=config.vehicles.B;
 if(a.side!=='circulating'||b.side!=='circulating')return {status:'inactive'};
 if(a.lane!==b.lane)return {status:'different-lanes'};
 const forwardAB=(b.angle-a.angle+360)%360;
 const forwardBA=(a.angle-b.angle+360)%360;
 const radius=config.diameter*3.1+(config.circulating-a.lane+.5)*config.width*config.displayScale;
 const metresPerDegree=radius*Math.PI/(180*config.displayScale);
 const abClosing=a.speed-b.speed,baClosing=b.speed-a.speed;
 const candidates=[
  {following:'A',leading:'B',headway:forwardAB,closing:abClosing},
  {following:'B',leading:'A',headway:forwardBA,closing:baClosing}
 ];
 const close=candidates.filter(c=>c.closing>0).map(c=>({...c,seconds:c.headway/c.closing}));
 close.sort((x,y)=>x.seconds-y.seconds);
 const nearestDegrees=Math.min(forwardAB,forwardBA);
 return {status:nearestDegrees*metresPerDegree<8?'near':'clear',
  nearestMetres:nearestDegrees*metresPerDegree,metresPerDegree,
  closest:close[0]||null};
}
function proximityWarning(){
 const notice=$('proximity');if(!notice)return;
 const result=vehicleConflictAssessment(state);
 if(result.status==='inactive'){notice.textContent=['A','B'].filter(id=>state.vehicles[id].waiting).map(id=>'Vehicle '+id+' waiting at give-way line.').join(' ')||'Place both vehicles on circulating lanes to monitor spacing.';return}
 if(result.status==='different-lanes'){notice.textContent='Vehicles occupy different circulating lanes; same-lane following check inactive.';return}
 const gap=result.nearestMetres.toFixed(1);
 const closing=result.closest;
 const catchUp=closing?' '+closing.following+' is closing on '+closing.leading+' at '+closing.closing.toFixed(1)+'°/s (estimated catch-up '+closing.seconds.toFixed(1)+' s, assuming constant speeds).':' Neither vehicle is currently closing on the other.';
 notice.textContent=(result.status==='near'?'Proximity warning — ':'Same-lane nearest separation: ')+gap+' m.'+catchUp;
}
// Build the entire roadway as one closed perimeter. Separate overlapping arm
// fills used to make visible cusps and pinched shoulders at their intersections.
function roadSurfaceGeometry(config,outer,end){
 const w=config.width*config.displayScale,shoulder=outer+104;
 function edge(side,count){
  const width=count*w;
  const lip=Math.min(outer*.86,Math.max(width+Math.max(18,w*.53),outer*.43));
  const y0=Math.sqrt(Math.max(0,outer*outer-lip*lip));
  // Never let a Bezier handle cross the straight road edge: this was the
  // cause of the North/West inward loops in the previous two versions.
  const dx=Math.max(0,Math.min((lip-width)*.72,56));
  const dy=y0?dx*lip/y0:0,sign=side==='left'?-1:1;
  return {
   start:[sign*lip,y0],ctrl1:[sign*(lip-dx),y0+dy],
   ctrl2:[sign*width,shoulder-62],end:[sign*width,shoulder],
   corner:[sign*width,end]
  };
 }
 function rotate(point,degrees){
  const a=degrees*Math.PI/180,c=Math.cos(a),q=Math.sin(a);
  return [point[0]*c-point[1]*q,point[0]*q+point[1]*c];
 }
 const xy=p=>p[0].toFixed(3)+' '+p[1].toFixed(3);
 const arms=[['North',180],['East',270],['South',0],['West',90]];
 const mouths={};
 const segments=arms.map(([name,angle])=>{
  const a=config.arms[name];
  const entry=edge('left',a.in),exit=edge('right',a.out);
  mouths[name]={entry,exit};
  const convert=e=>Object.fromEntries(Object.entries(e).map(([k,p])=>[k,rotate(p,angle)]));
  return {left:convert(entry),right:convert(exit)};
 });
 const surface=['M '+xy(segments[0].right.start)],kerbs=[];
 for(let i=0;i<segments.length;i++){
  const {left:l,right:r}=segments[i],next=segments[(i+1)%segments.length].right;
  surface.push('C '+[r.ctrl1,r.ctrl2,r.end].map(xy).join(' '));
  surface.push('L '+xy(r.corner),'L '+xy(l.corner),'L '+xy(l.end));
  surface.push('C '+[l.ctrl2,l.ctrl1,l.start].map(xy).join(' '));
  surface.push('A '+outer+' '+outer+' 0 0 1 '+xy(next.start));
  kerbs.push('M '+xy(r.start)+' C '+[r.ctrl1,r.ctrl2,r.end].map(xy).join(' ')+' L '+xy(r.corner));
  kerbs.push('M '+xy(l.corner)+' L '+xy(l.end)+' C '+[l.ctrl2,l.ctrl1,l.start].map(xy).join(' '));
  kerbs.push('M '+xy(l.start)+' A '+outer+' '+outer+' 0 0 1 '+xy(next.start));
 }
 surface.push('Z');
 return {surface:surface.join(' '),kerbs:kerbs.join(' '),mouths};
}
