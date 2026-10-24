// Smoke-test the complete ordered browser application without a live server.
// Uses a minimal DOM test double to verify initialization, playback and replay
// after extracting CSS and JavaScript into independent static assets.
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {getJavaScript}=require('./read_app');
const elements={};
function element(id){
 if(!elements[id]){
  elements[id]={
   id,innerHTML:'',textContent:'',value:'20',checked:true,style:{},
   addEventListener(){},querySelectorAll(){return []},
   click(){},getAttribute(){return null}
  };
 }
 return elements[id];
}
const context=vm.createContext({
 document:{getElementById:element},
 structuredClone,Math,Number,Array,Object,Date,Set,JSON,
 requestAnimationFrame:()=>123,cancelAnimationFrame:()=>{},
 console,
});
const app=vm.runInContext(getJavaScript()+'\n;({state,draw,advanceVehicles,renderControls,normalizeVehicles,stopPlayback});',context);
assert.match(elements.view.innerHTML,/<svg id="diagram"/);
assert.match(elements.view.innerHTML,/A<\/text>/);
assert.match(elements.view.innerHTML,/B<\/text>/);
assert.match(elements.vehicles.innerHTML,/Override lane turn rules/);
assert.match(elements.vehicles.innerHTML,/Exit destination/);
assert(elements.replayCars.onclick && elements.playCars.onclick && elements.pauseCars.onclick);
assert(elements.showTrails.onchange && elements.exportEvents.onclick);
assert.equal(app.state.arms.East.moves[0],'LS');
assert.equal(app.state.arms.East.moves[1],'S');
const first=JSON.stringify(app.state.vehicles);
app.advanceVehicles(5);
assert.match(elements.runSummary.textContent,/Elapsed/);
assert.match(elements.view.innerHTML,/<svg id="diagram"/);
assert.notEqual(JSON.stringify(app.state.vehicles),first,'Playback moves an entering vehicle');
elements.replayCars.onclick();
assert.equal(JSON.stringify(app.state.vehicles),first,'Replay restores original positions');
assert(elements.runSummary.textContent.includes('Elapsed 0.0 s'));
console.log('Browser startup, SVG render, controls, playback and replay smoke-test passed.');
