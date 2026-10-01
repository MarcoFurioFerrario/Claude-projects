// Banco di prova locale: carica index.html in Chromium con un window.claude finto (db in memoria).
// Uso: node test/harness.js   (richiede playwright e Chromium preinstallato)
const fs=require('fs'),path=require('path');
const {chromium}=require('/opt/node-tools/node_modules/playwright');

const root=path.join(__dirname,'..');
const body=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<link[^>]*fonts[^>]*>/g,'');
const page_html=`<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>${body}</body></html>`;
const seed=JSON.parse(fs.readFileSync(path.join(root,'seed','seed.json'),'utf8')).writes;

const mock=`
(function(){
  const data=new Map(), ls=[];
  const clone=o=>JSON.parse(JSON.stringify(o));
  const deepMerge=(a,b)=>{for(const k of Object.keys(b)){if(b[k]&&typeof b[k]==='object'&&!Array.isArray(b[k])&&a[k]&&typeof a[k]==='object'&&!Array.isArray(a[k]))deepMerge(a[k],b[k]);else a[k]=clone(b[k]);}return a;};
  const snapDoc=p=>{const ex=data.has(p);return{id:p.split('/').pop(),exists:ex,data:()=>ex?clone(data.get(p)):undefined,metadata:{}};};
  const collDocs=c=>[...data.keys()].filter(k=>k.startsWith(c+'/')&&k.split('/').length===c.split('/').length+1).sort().map(snapDoc);
  const notify=()=>ls.forEach(f=>f());
  const db={
    doc(path){return{id:path.split('/').pop(),path,
      get:async()=>snapDoc(path),
      set:async d=>{if(window.__failWrites)throw{code:'invalid_argument'};data.set(path,clone(d));notify();},
      update:async d=>{if(window.__failWrites)throw{code:'invalid_argument'};if(!data.has(path))throw{code:'invalid_argument',message:'missing'};data.set(path,deepMerge(clone(data.get(path)),d));notify();},
      delete:async()=>{data.delete(path);notify();},
      onSnapshot(next){const f=()=>next(snapDoc(path));ls.push(f);setTimeout(f,0);return()=>{};}};},
    collection(c){return{onSnapshot(next){const f=()=>{const docs=collDocs(c);next({docs,size:docs.length,empty:!docs.length});};ls.push(f);setTimeout(f,0);return()=>{};},doc(id){return db.doc(c+'/'+id);}};}
  };
  window.__db={data,notify};
  const sample=async()=>({text:''});
  sample.json=async()=>({ingredienti:[{nome:'Riso Vialone Nano',qta:320,unita:'g',negozio:'dispensa'},{nome:'Piselli freschi sgranati',qta:600,unita:'g',negozio:'ortolano'},{nome:'Burro',qta:50,unita:'g',negozio:'latticini'},{nome:'Sale',qta:0,unita:'q.b.',negozio:'dispensa'}],procedimento:['Fai un brodo con i baccelli.','Soffriggi la cipolla.','Aggiungi riso e piselli e porta a cottura.'],fasi:[{descrizione:'Brodo di baccelli',oreAnticipo:2}],preparabileACasa:false,vini:[{nome:'Soave Classico',bottiglie:1}],consigli:'Il risotto deve restare all onda.'});
  sample.limits=async()=>({});
  const caps={db,sample,downloads:{save:async r=>{window.__saved=r;return{status:'saved'};}},user:{isOwner:async()=>window.__owner||false,canEdit:async()=>false,can:async()=>true,id:async()=>'u_test'}};
  window.claude={use:async n=>caps[n]||null};
  window.__clip=null;
  Object.defineProperty(navigator,'clipboard',{value:{writeText:async t=>{window.__clip=t;}},configurable:true});
})();`;

async function run(){
  const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']}).catch(()=>chromium.launch({args:['--no-sandbox']}));
  const errors=[];
  const mk=async(w,h,dark)=>{
    const ctx=await browser.newContext({viewport:{width:w,height:h},colorScheme:dark?'dark':'light'});
    const page=await ctx.newPage();
    page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text());});
    page.on('pageerror',e=>errors.push('pageerror: '+e.message));
    await page.addInitScript(mock);
    await page.route('**/*',r=>{const u=r.request().url();if(u==='https://gb.test/')return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:page_html});return r.abort();});
    await page.goto('https://gb.test/',{waitUntil:'domcontentloaded'});
    return page;
  };
  return {browser,errors,mk,seed};
}
module.exports={run,seed};
