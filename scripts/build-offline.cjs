// Build the React class-based application for an offline, double-clickable demo.
// The bundled compatibility runtime is an older React build used only for OPEN_DEMO.html.
// The actual Vite project uses React 19 after `npm install`.
const fs = require('fs');
const path = require('path');
let ts;
try { ts = require('typescript'); } catch { ts = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript'); }
const root = path.join(__dirname, '..');
const modules = [['./data.js','src/data.js'],['./App.jsx','src/App.jsx']].map(([name,file])=>{
  const src = fs.readFileSync(path.join(root,file),'utf8');
  const result=ts.transpileModule(src,{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2020,allowJs:true,esModuleInterop:true},reportDiagnostics:true});
  const diagnostics=(result.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error);
  if(diagnostics.length)throw Error(file+': '+diagnostics.map(x=>x.messageText).join('; '));
  return JSON.stringify(name)+':function(require,module,exports){'+result.outputText+'}';
});
const js='(function(){var modules={'+modules.join(',')+'};var cache={};function load(name){if(name==="react")return window.React;if(!modules[name])throw Error("Unknown module: "+name);if(!cache[name]){let module={exports:{}};cache[name]=module;modules[name](load,module,module.exports);}return cache[name].exports;}window.ReactDOM.render(window.React.createElement(load("./App.jsx").default),document.getElementById("root"));})();';
fs.mkdirSync(path.join(root,'demo'),{recursive:true});fs.writeFileSync(path.join(root,'demo','app.offline.js'),js);
fs.writeFileSync(path.join(root,'OPEN_DEMO.html'),'<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>API-Verse — Sprint 1 Demo</title><link rel="stylesheet" href="./src/styles.css"/></head><body><div id="root"></div><script src="./public/vendor/react.js"></script><script src="./public/vendor/react-dom.js"></script><script src="./demo/app.offline.js"></script></body></html>');
console.log('Created OPEN_DEMO.html');
