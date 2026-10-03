#!/usr/bin/env node
'use strict';
/* Cerca la foto di ogni piatto nelle FONTI AFFIDABILI e la salva in recipes/<id>.foto.
   Per ogni proposta apre, nell'ordine, la fonte di riferimento (verifica.linkAutorevole) e il link del proponente, ma solo se il sito è
   nella whitelist (FONTI in src/js/00-core.js). Dalla pagina prende l'immagine principale (og:image, poi JSON-LD, twitter:image),
   controlla che l'indirizzo risponda davvero con un'immagine e salva SOLO l'indirizzo, con nome della fonte e pagina d'origine.

   Uso:   node tools/foto.js              prova a secco: stampa cosa farebbe, non scrive nulla
          node tools/foto.js --scrivi     scrive su Firestore (solo il campo "foto")
          --forza                         rifà anche le proposte che hanno già una foto
          --solo r_abc,r_def              solo queste proposte
   Serve che l'ambiente raggiunga i siti delle fonti (e Firestore): vedi README. Usa curl, quindi rispetta il proxy dell'ambiente.
   Per i test: GB_PROJECT, GB_FS_BASE (indirizzo dell'API Firestore), GB_ALLOW (domini extra, separati da virgola). */
const {execFileSync}=require('child_process'),fs=require('fs'),path=require('path');
const args=process.argv.slice(2),flag=n=>args.includes('--'+n),opt=n=>{const i=args.indexOf('--'+n);return i>=0?args[i+1]:null;};
if(flag('aiuto')||flag('help')){console.log(fs.readFileSync(__filename,'utf8').split('/*')[1].split('*/')[0]);process.exit(0);}
const core=fs.readFileSync(path.join(__dirname,'..','src','js','00-core.js'),'utf8');
const FONTI=[...core.matchAll(/\{d:'([^']+)',n:'([^']*)'/g)].map(m=>({d:m[1],n:m[2]}));
(process.env.GB_ALLOW||'').split(',').map(s=>s.trim()).filter(Boolean).forEach(d=>FONTI.push({d,n:''}));
const PROJECT=process.env.GB_PROJECT||'gran-bouffe';
const DOCS=(process.env.GB_FS_BASE||'https://firestore.googleapis.com')+`/v1/projects/${PROJECT}/databases/(default)/documents`;
const UA='Mozilla/5.0 (compatible; GranBouffeFoto/1.0)';
const TMO=25;

const host=u=>{try{return new URL(u).hostname.replace(/^www\./,'');}catch(e){return '';}};
const isHttp=u=>/^https?:\/\//i.test(String(u||'').trim());
const fonteOf=u=>{const h=host(u);return FONTI.find(f=>h===f.d||h.endsWith('.'+f.d))||null;};
function curl(a){
  try{return execFileSync('curl',['-sS','-m',String(TMO),'-A',UA,...a],{encoding:'utf8',maxBuffer:64*1024*1024,stdio:['ignore','pipe','pipe']});}
  catch(e){throw new Error(String(e.stderr||e.message).trim().split('\n')[0]);}
}
function getPage(url){
  const o=curl(['-L','--max-redirs','5','-H','Accept-Language: it,en;q=0.7','-w','\n@@%{http_code}@@%{url_effective}',url]);
  const i=o.lastIndexOf('\n@@'),m=/^@@(\d+)@@(.*)$/.exec(o.slice(i+1));
  return{html:o.slice(0,i),code:m?+m[1]:0,url:m?m[2]:url};
}
function checkImage(url){
  const o=curl(['-L','--max-redirs','5','-r','0-4095','-o','/dev/null','-w','%{http_code}\t%{content_type}\t%{size_download}\t%{url_effective}',url]).split('\t');
  const code=+o[0],type=(o[1]||'').toLowerCase(),size=+o[2];
  return{ok:(code===200||code===206)&&type.startsWith('image/')&&size>=2000,code,type,size,url:o[3]||url};
}

const dec=s=>String(s).replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#0*39;|&apos;/g,"'").replace(/&#x2F;/gi,'/').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
const attrs=tag=>{const o={};for(const m of tag.matchAll(/([a-zA-Z:_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g))o[m[1].toLowerCase()]=dec(m[2]!=null?m[2]:m[3]!=null?m[3]:m[4]);return o;};
function jsonldImages(html){
  const out=[];
  const walk=n=>{
    if(!n||typeof n!=='object')return;
    if(Array.isArray(n)){n.forEach(walk);return;}
    for(const [k,v] of Object.entries(n)){
      if(k==='image'){(Array.isArray(v)?v:[v]).forEach(x=>{if(typeof x==='string')out.push(x);else if(x&&typeof x.url==='string')out.push(x.url);});}
      else if(typeof v==='object')walk(v);
    }
  };
  for(const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)){try{walk(JSON.parse(m[1].trim()));}catch(e){}}
  return out;
}
const BAD=/logo|favicon|sprite|placeholder|default[-_]?(image|og|share)|avatar|blank|spacer|pixel/i;
function imageCandidates(html,base){
  const metas=[...html.matchAll(/<meta\b[^>]*>/gi)].map(m=>attrs(m[0]));
  const get=(...ks)=>metas.filter(a=>ks.includes((a.property||a.name||'').toLowerCase())&&a.content).map(a=>a.content);
  const links=[...html.matchAll(/<link\b[^>]*>/gi)].map(m=>attrs(m[0])).filter(a=>/image_src/i.test(a.rel||'')&&a.href).map(a=>a.href);
  const raw=[...get('og:image:secure_url','og:image'),...jsonldImages(html),...get('twitter:image','twitter:image:src'),...links];
  const seen=new Set(),out=[];
  for(const x of raw){
    let u;try{u=new URL(x.trim(),base);}catch(e){continue;}
    if(!/^https?:$/.test(u.protocol)||BAD.test(u.pathname))continue;
    if(u.protocol==='http:'&&/^https:/.test(base))u.protocol='https:';
    if(!seen.has(u.href)){seen.add(u.href);out.push(u.href);}
  }
  return{list:out,site:(metas.find(a=>(a.property||'').toLowerCase()==='og:site_name')||{}).content||''};
}

/* Firestore REST: lettura e scrittura del solo campo foto */
const unval=v=>{if(!v)return null;if('stringValue' in v)return v.stringValue;if('booleanValue' in v)return v.booleanValue;if('integerValue' in v)return +v.integerValue;
  if('mapValue' in v){const o={};for(const k in (v.mapValue.fields||{}))o[k]=unval(v.mapValue.fields[k]);return o;}
  if('arrayValue' in v)return (v.arrayValue.values||[]).map(unval);return null;};
function listRecipes(){
  const all=[];let tok='';
  do{
    const j=JSON.parse(curl([`${DOCS}/recipes?pageSize=300${tok?'&pageToken='+encodeURIComponent(tok):''}`]));
    if(j.error)throw new Error('Firestore: '+(j.error.message||JSON.stringify(j.error)));
    for(const d of j.documents||[]){const o={id:d.name.split('/').pop()};for(const k in d.fields)o[k]=unval(d.fields[k]);all.push(o);}
    tok=j.nextPageToken||'';
  }while(tok);
  return all;
}
function saveFoto(id,foto){
  const S=v=>({stringValue:String(v||'')});
  const body={fields:{foto:{mapValue:{fields:{url:S(foto.url),pagina:S(foto.pagina),fonte:S(foto.fonte),autore:S(''),data:S(foto.data)}}}}};
  const o=curl(['-X','PATCH','-H','Content-Type: application/json','-d',JSON.stringify(body),'-w','\n%{http_code}',`${DOCS}/recipes/${id}?updateMask.fieldPaths=foto&currentDocument.exists=true`]);
  const code=+o.trim().split('\n').pop();
  if(code!==200)throw new Error('Firestore ha risposto '+code);
}

function findPhoto(r){
  const v=r.verifica||{};
  const pages=[...new Set([v.linkAutorevole,r.link].map(x=>String(x||'').trim()).filter(isHttp))];
  const ok=pages.filter(p=>fonteOf(p));
  if(!ok.length)return{why:'nessuna fonte affidabile tra i link ('+(pages.map(host).join(', ')||'nessun link')+')'};
  const notes=[];
  for(const p of ok){
    let pg;try{pg=getPage(p);}catch(e){notes.push(host(p)+': '+e.message);continue;}
    if(pg.code!==200){notes.push(host(p)+': pagina non raggiungibile (HTTP '+pg.code+')');continue;}
    const {list,site}=imageCandidates(pg.html,pg.url);
    if(!list.length){notes.push(host(p)+': nessuna immagine nella pagina');continue;}
    for(const img of list.slice(0,4)){
      let c;try{c=checkImage(img);}catch(e){notes.push(host(img)+': '+e.message);continue;}
      if(c.ok){const f=fonteOf(p);return{foto:{url:c.url.replace(/^http:/,/^https:/.test(pg.url)?'https:':'http:'),pagina:p,fonte:(f&&f.n)||site||host(p),data:new Date().toISOString().slice(0,10)}};}
      notes.push(host(img)+': non è un\'immagine utilizzabile (HTTP '+c.code+', '+(c.type||'?')+', '+c.size+' byte)');
    }
  }
  return{why:notes.join(' · ')||'nessuna immagine trovata'};
}

function main(){
  const solo=(opt('solo')||'').split(',').filter(Boolean);
  const write=flag('scrivi'),force=flag('forza');
  const rs=listRecipes().filter(r=>!r.eliminata&&(!solo.length||solo.includes(r.id)));
  let n={ok:0,skip:0,no:0};
  console.log(`${rs.length} proposte · ${write?'SCRITTURA su Firestore':'prova a secco (usa --scrivi per salvare)'}\n`);
  for(const r of rs){
    if(r.foto&&r.foto.url&&!force){n.skip++;console.log(`--  ${r.id} ${r.title}: ha già una foto (usa --forza per rifarla)`);continue;}
    const res=findPhoto(r);
    if(!res.foto){n.no++;console.log(`NO  ${r.id} ${r.title}: ${res.why}`);continue;}
    if(write){try{saveFoto(r.id,res.foto);}catch(e){n.no++;console.log(`NO  ${r.id} ${r.title}: salvataggio non riuscito (${e.message})`);continue;}}
    n.ok++;console.log(`ok  ${r.id} ${r.title}\n      foto:   ${res.foto.url}\n      fonte:  ${res.foto.fonte} · ${res.foto.pagina}`);
  }
  console.log(`\n${n.ok} foto ${write?'salvate':'trovate'} · ${n.skip} già presenti · ${n.no} senza foto`);
  if(!write&&n.ok)console.log('Controlla l\'elenco, poi rilancia con --scrivi. Ogni foto si può cambiare o togliere dalla scheda del piatto.');
}
main();
