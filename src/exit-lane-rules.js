/* Declared per-exit lane connectors; permissions are not surveyed markings.
 * Pure data policy, shared by rendering, movement, forecast and CI.
 */
const ExitLaneRules=(()=>{
 'use strict';
 const ARMS=Object.freeze(['North','East','South','West']);
 const MODES=Object.freeze(['conventional','spiral-dual','custom']);
 function selected(config,exitArm){
  if(!ARMS.includes(exitArm))throw Error('Unknown exit arm');
  const value=config.exitLaneModes?.[exitArm];
  return MODES.includes(value)?value:'conventional';
 }
 function customIssues(config,exitArm){
  const raw=config.exitLaneConnectors?.[exitArm],issues=[];
  if(!Array.isArray(raw)||raw.length<1||raw.length>5)
   return ['Define between 1 and 5 explicit exit connectors'];
  const usedIn=new Set(),usedOut=new Set();
  let previousFrom=0,previousTo=0;
  for(const link of raw){
   const source=link?.fromLane,dest=link?.exitLane;
   if(!Number.isInteger(source)||source<1||source>config.circulating
     ||!Number.isInteger(dest)||dest<1||dest>config.arms[exitArm].out){
    issues.push('Connector lane outside the available circulating or exit lanes');continue;
   }
   if(usedIn.has(source)||usedOut.has(dest))
    issues.push('Each circulating and exit lane may occur only once');
   if(source<=previousFrom||dest<=previousTo)
    issues.push('Connectors must be ordered from outside to inside, without crossing');
   usedIn.add(source);usedOut.add(dest);
   previousFrom=source;previousTo=dest;
  }
  return [...new Set(issues)];
 }
 function supported(config,exitArm){
  const value=selected(config,exitArm);
  if(value==='spiral-dual')return config.circulating>=2&&config.arms?.[exitArm]?.out>=2;
  if(value==='custom')return customIssues(config,exitArm).length===0;
  return true;
 }
 function mode(config,exitArm){return supported(config,exitArm)?selected(config,exitArm):'conventional'}
 function connectors(config,exitArm){
  if(!Number.isInteger(config.circulating)||config.circulating<1||
    !Number.isInteger(config.arms?.[exitArm]?.out)||config.arms[exitArm].out<1)
   throw Error('Invalid exit lane network');
  const value=mode(config,exitArm);
  if(value==='spiral-dual')return [
   {fromLane:1,exitLane:1,type:'marked-spiral-continuation',discretionary:false},
   {fromLane:2,exitLane:2,type:'marked-spiral-continuation',discretionary:false}
  ];
  if(value==='custom')return config.exitLaneConnectors[exitArm].map(link=>({
   fromLane:link.fromLane,exitLane:link.exitLane,
   type:'custom-marked-continuation',discretionary:false
  }));
  return Array.from({length:config.arms[exitArm].out},(_,i)=>({
   fromLane:1,exitLane:i+1,type:'conventional-exit',discretionary:false
  }));
 }
 function resolve(config,v){
  if(!v||v.exitArm==='none'||!v.exitArm)return {
   allowed:false,reason:'no-destination',mode:'none',targetLane:null,exitLane:null
  };
  const value=mode(config,v.exitArm),links=connectors(config,v.exitArm);
  if(value==='conventional'){
   const current=Math.min(config.arms[v.exitArm].out,Math.max(1,Math.floor(Number(v.exitLane)||1)));
   return {allowed:v.lane===1&&!v.laneChange,reason:v.lane===1&&!v.laneChange?'connected':'requires-outside-lane',
    mode:value,targetLane:1,exitLane:current,connectionId:'exit:'+v.exitArm+':1:'+current,
    needsOutwardMove:v.lane>1};
  }
  const link=links.find(c=>c.fromLane===v.lane);
  return {allowed:Boolean(link&&!v.laneChange),
   reason:!link?'no-marked-connector':v.laneChange?'transition-incomplete':'marked-connector',
   mode:value,targetLane:link?v.lane:null,exitLane:link?.exitLane??null,
   connectionId:link?'exit:'+v.exitArm+':'+link.fromLane+':'+link.exitLane:null,
   needsOutwardMove:false};
 }
 function describe(config,exitArm){
  const links=connectors(config,exitArm),value=mode(config,exitArm),chosen=selected(config,exitArm);
  return {mode:value,selected:chosen,supported:supported(config,exitArm),links,
   issues:chosen==='custom'?customIssues(config,exitArm):[],
   label:value==='conventional'
    ?'Conventional: leave from outside circulating lane 1; other lanes need a checked outward move.'
    :'Declared marked connectors: '+links.map(x=>'circulating '+x.fromLane+' → exit '+x.exitLane).join('; ')+'. No other marked movements are permitted.'};
 }
 function initialCustom(config,exitArm){
  const available=connectors(config,exitArm);
  if(mode(config,exitArm)!=='conventional')
   return available.map(({fromLane,exitLane})=>({fromLane,exitLane}));
  return [{fromLane:1,exitLane:1}];
 }
 return Object.freeze({ARMS,MODES,selected,supported,mode,connectors,resolve,describe,customIssues,initialCustom});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=ExitLaneRules;
