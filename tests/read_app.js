// Test loader: concatenate browser classic scripts in their exact HTML order.
// These scripts intentionally share the browser global lexical environment;
// the split keeps behaviour intact without a bundler, server, or build step.
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const sources=[...html.matchAll(/<script\s+src="(\.\/src\/[^"]+\.js)"\s*><\/script>/g)].map(m=>m[1]);
if(sources.length!==6)throw Error('Expected six ordered application scripts; got '+sources.length);
if(new Set(sources).size!==sources.length)throw Error('Duplicated script file');
const source=sources.map(src=>{
 const name=path.join(__dirname,'..',src);
 if(!fs.existsSync(name))throw Error('Missing source '+src);
 return fs.readFileSync(name,'utf8');
}).join('\n');
exports.readAppSource=()=>html+'\n'+source;
exports.getJavaScript=()=>source;
exports.getModulePaths=()=>sources;
