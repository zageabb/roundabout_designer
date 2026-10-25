// Regression contract for zero-build modular browser deployment.
// The classic script order is intentional: it preserves shared global lexical
// bindings while model/engine/rendering are gradually moved to true modules.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {getModulePaths,getJavaScript,readAppSource}=require('./read_app');
const html=fs.readFileSync('index.html','utf8');
const expected=['./src/state.js','./src/lane-network.js','./src/conflict-engine.js','./src/conflict-zones.js','./src/conflict-projection.js','./src/simulation.js','./src/controls.js','./src/geometry.js','./src/render.js','./src/bootstrap.js'];
assert.deepEqual(getModulePaths(),expected,'Browser scripts must load in dependency order');
assert.match(html,/<link rel="stylesheet" href="\.\/src\/styles\.css">/);
assert(!html.includes('<style>')&&!html.includes('<script>'),'No embedded CSS or JavaScript should remain');
assert(!/src="\/(?:src|assets)\//.test(html),'Paths must stay relative for the Ubuntu reverse proxy');
const css=fs.readFileSync('src/styles.css','utf8');
assert(css.includes('.vehicle-grid')&&css.includes('.stage svg'));
const js=getJavaScript();
assert(js.includes("const presets="));
assert(js.includes('function normalizeVehicles()'));
assert(js.includes('const LaneNetwork='));
assert(js.includes('const ConflictEngine='));
assert(js.includes('const ConflictZones='));
assert(js.includes('const ConflictProjection='));
assert(js.includes('function mergeGeometry(v,progress,config)'));
assert(js.includes('function exitGeometry(v,progress,config)'));
assert(js.includes('function roadSurfaceGeometry(config,outer,end)'));
assert(js.includes('function draw()'));
assert(js.includes('function renderVehicles()'));
assert(js.includes("renderControls();renderScenarioActivity();draw();"));
assert(js.indexOf('const presets=')<js.indexOf('function normalizeVehicles()'));
assert(js.indexOf('function renderVehicles()')<js.indexOf('function draw()'));
assert(js.indexOf('function draw()')<js.lastIndexOf('renderControls();renderScenarioActivity();draw();'));
assert(readAppSource().includes('id="replayCars"'));
assert(readAppSource().includes('Override lane turn rules'));
console.log('Static browser assets and dependency-ordered modules validated.');
