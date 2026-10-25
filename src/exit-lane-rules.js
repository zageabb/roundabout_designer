/* Explicit schematic exit-lane marking rules.
 * Pure policy data: no DOM, simulation clock, SVG or map assumptions.
 * Spiral-dual is a USER-DECLARED example: a real spiral is only valid with
 * surveyed markings and geometry; this is not inferred automatically.
 */
const ExitLaneRules=(()=>{
 'use strict';
 const ARMS=Object.freeze(['North','East','South','West']);
 const MODES=Object.freeze(['conventional','spiral-dual']);
 function selected(config,exitArm){
  if(!ARMS.includes(exitArm))throw Error('Unknown exit arm');
  return config.exitLaneModes?.[exitArm]==='spiral-dual'?'spiral-dual':'conventional';
 }
 function supported(config,exitArm){
  return selected(config,exitArm)!=='spiral-dual'||
    config.circulating>=2&&config.arms?.[exitArm]?.out>=2;
 }
 function mode(config,exitArm){
  return supported(config,exitArm)?selected(config,exitArm):'conventional';
 }
 function connectors(config,exitArm){
  if(!Number.isInteger(config.circulating)||config.circulating<1||
     !Number.isInteger(config.arms?.[exitArm]?.out)||config.arms[exitArm].out<1)
   throw Error('Invalid exit lane network');
  const rule=mode(config,exitArm);
  if(rule==='spiral-dual')return [
   {fromLane:1,exitLane:1,type:'marked-spiral-continuation',discretionary:false},
   {fromLane:2,exitLane:2,type:'marked-spiral-continuation',discretionary:false}
  ];
  return Array.from({length:config.arms[exitArm].out},(_,i)=>({
   fromLane:1,exitLane:i+1,type:'conventional-exit',discretionary:false
  }));
 }
 function resolve(config,v){
  if(!v||v.exitArm==='none'||!v.exitArm)return {
   allowed:false,reason:'no-destination',mode:'none',targetLane:null,exitLane:null
  };
  const rule=mode(config,v.exitArm),links=connectors(config,v.exitArm);
  if(rule==='conventional'){
   const current=Math.min(config.arms[v.exitArm].out,Math.max(1,Math.floor(Number(v.exitLane)||1)));
   return {allowed:v.lane===1&&!v.laneChange,reason:v.lane===1&&!v.laneChange?'connected':'requires-outside-lane',
    mode:rule,targetLane:1,exitLane:current,connectionId:'exit:'+v.exitArm+':1:'+current,
    needsOutwardMove:v.lane>1};
  }
  const link=links.find(c=>c.fromLane===v.lane);
  return {allowed:Boolean(link&&!v.laneChange),
   reason:!link?'no-marked-connector':v.laneChange?'transition-incomplete':'marked-connector',
   mode:rule,targetLane:link?v.lane:null,exitLane:link?.exitLane??null,
   connectionId:link?'exit:'+v.exitArm+':'+link.fromLane+':'+link.exitLane:null,
   needsOutwardMove:false};
 }
 function describe(config,exitArm){
  const links=connectors(config,exitArm);
  return {mode:mode(config,exitArm),selected:selected(config,exitArm),
   supported:supported(config,exitArm),links,
   label:mode(config,exitArm)==='spiral-dual'
    ?'Illustrative marked lanes: circulating 1 → exit 1; circulating 2 → exit 2. Other lanes have no marked exit connection.'
    :'Conventional: exit from outer circulating lane 1. Other circulating lanes need a separately checked outward transition.'};
 }
 return Object.freeze({ARMS,MODES,selected,supported,mode,connectors,resolve,describe});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=ExitLaneRules;
