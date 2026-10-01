// Assembla src/ in index.html (il file che viene pubblicato come artifact).
const fs=require('fs'),path=require('path');
const src=p=>fs.readFileSync(path.join(__dirname,'src',p),'utf8');
const js=fs.readdirSync(path.join(__dirname,'src','js')).filter(f=>f.endsWith('.js')).sort().map(f=>src('js/'+f)).join('\n');
const out=src('head.html').replace('/*CSS*/',()=>src('style.css')).replace('/*JS*/',()=>js);
fs.writeFileSync(path.join(__dirname,'index.html'),out);
console.log('index.html',out.length,'byte');
