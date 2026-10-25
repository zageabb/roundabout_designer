/* Generic priority rules for lane-graph merge nodes.
 * Pure decision policy: no DOM, rendering, state mutation or road bearings.
 * The geometry adapter supplies the already-computed conflict-zone forecast.
 * A candidate overlap is only a reason to yield, never a crash finding.
 */
const PriorityRules=(()=>{
 'use strict';
 const CONTROLS=Object.freeze(['give-way','none']);
 function normalizeControl(value){return CONTROLS.includes(value)?value:'give-way'}
 function decideMerge({control='give-way',entrant,incumbent,relationship,forecast,mergeDurationSeconds=3}){
  const policy=normalizeControl(control);
  if(!entrant||!incumbent)throw Error('Entry priority decision requires two vehicles');
  if(!Number.isFinite(mergeDurationSeconds)||mergeDurationSeconds<=0)throw Error('Invalid merge duration');
  const rel=relationship||{type:'unknown',conflicts:true};
  // Vehicles can enter adjacent non-intersecting lanes in parallel.
  if(rel.type==='parallel-independent')return {allow:true,reason:'independent-lanes',control:policy};
  // Once a merge is under way its path is reserved, independently of road rules.
  if(incumbent.side==='merging'&&rel.conflicts)
   return {allow:false,reason:'merge-in-progress',control:policy};
  if(incumbent.side!=='circulating'&&incumbent.side!=='merging'&&incumbent.hasPriority!==true)
   return {allow:true,reason:'no-active-priority-vehicle',control:policy};
  // Uncontrolled is explicitly experimental. Safe playback still prevents
  // direct same-node simultaneous merges (above) but doesn't grant yield priority.
  if(policy==='none')return {allow:true,reason:'uncontrolled',control:policy};
  if(!forecast||!forecast.occupancy||!forecast.occupancy.nearest)
   return {allow:true,reason:'no-resolved-overlapping-zone',control:policy};
  const closest=forecast.occupancy.nearest;
  if(!closest.simultaneous||closest.overlapSeconds<=0)
   return {allow:true,reason:'separate-occupancy-times',control:policy};
  // Only reserve the entry/merge itself: later roundabout following conflicts
  // belong to the car-following logic, not the give-way line.
  const earliest=closest.overlapStartSeconds;
  if(earliest===null||earliest>mergeDurationSeconds+.5)
   return {allow:true,reason:'interaction-after-merge',control:policy};
  return {allow:false,reason:'yield-to-priority-traffic',control:policy,
   overlapSeconds:closest.overlapSeconds,atSeconds:earliest};
 }
 function entryControl(config,arm){
  const setting=config?.entryPriority?.[arm];
  return normalizeControl(setting);
 }
 return Object.freeze({CONTROLS,normalizeControl,entryControl,decideMerge});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=PriorityRules;
