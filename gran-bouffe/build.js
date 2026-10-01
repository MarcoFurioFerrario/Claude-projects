// Assembla src/ in due file:
//   index.html       -> versione per l'artifact di claude.ai (senza skeleton: lo aggiunge la piattaforma)
//   ../docs/index.html -> versione pubblica (qualsiasi hosting statico) con database Firestore
const fs=require('fs'),path=require('path');
const src=p=>fs.readFileSync(path.join(__dirname,'src',p),'utf8');
const BUILD=Date.now().toString(36);
const js=fs.readdirSync(path.join(__dirname,'src','js')).filter(f=>f.endsWith('.js')).sort().map(f=>src('js/'+f)).join('\n').replace('__BUILD__',BUILD);
const head=src('head.html').replace('/*CSS*/',()=>src('style.css'));
// artifact
fs.writeFileSync(path.join(__dirname,'index.html'),head+src('body.html').replace('/*JS*/',()=>js));
// pubblica
const pub=path.join(__dirname,'..','docs');
fs.mkdirSync(pub,{recursive:true});
fs.writeFileSync(path.join(pub,'index.html'),src('standalone.html').replace('/*HEAD*/',()=>head).replace('/*JS*/',()=>js));
fs.writeFileSync(path.join(pub,'.nojekyll'),'');
fs.writeFileSync(path.join(pub,'version.json'),JSON.stringify({build:BUILD})+'\n');
const cfg=path.join(pub,'config.js');
if(!fs.existsSync(cfg))fs.writeFileSync(cfg,`// Configurazione Firebase del progetto (le chiavi web di Firebase sono pubbliche per progettazione).
// Sostituisci null con l'oggetto firebaseConfig copiato dalla console Firebase (vedi README).
window.GB_FIREBASE = null;
`);
console.log('ok: index.html + docs/index.html');
