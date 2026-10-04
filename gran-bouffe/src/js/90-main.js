/* ============ avvio, sottoscrizioni, eventi ============ */
const SUB={};
function setHash(h){try{history.replaceState(null,'','#'+h);}catch(e){try{location.hash=h;}catch(e2){}}}
function routeFromHash(){
  let h='';try{h=location.hash.slice(1);}catch(e){}
  if(h.startsWith('piatto-')){UI.dish=h.slice(7);UI.tab='menu';UI.navigated=true;}
  else if(['proposte','suggerimenti','libro','voto','menu','spesa','programma','persone'].includes(h)){UI.tab=h;UI.dish=null;UI.navigated=true;}
}
function doLogout(){S.meId=null;store.set('gb.me','');render();}

function noDb(){
  let msg;
  if(S.noConfig)msg=`<b>Il sito non è ancora collegato a un database.</b> Manca la configurazione Firebase in <code>config.js</code>: vedi le istruzioni nel README.`;
  else if(S.permDenied)msg=`<b>Il database rifiuta la lettura.</b> Le regole di Firestore devono consentire lettura e scrittura (vedi il README). Se le hai appena cambiate, ricarica la pagina.`;
  else if(S.standalone)msg=`<b>Non riesco a collegarmi al database.</b> Controlla la connessione e ricarica la pagina. Se il problema continua, avvisa Marco.`;
  else msg=`<b>Non riesco a collegarmi ai dati condivisi.</b> Apri la pagina da claude.ai con il tuo account e controlla di avere accesso come collaboratore. Se il problema continua, avvisa Marco.`;
  return `<div class="wrap"><div class="login"><div><p class="film">dal film di Marco Ferreri · 1973</p><h1>Gran Bouffe <span style="color:var(--accent)">Triveneto</span></h1></div>
    <div class="note bad">${msg}</div></div></div>`;
}
function build(){
  if(S.dbOk===false)return noDb();
  if(!S.loaded.p||!S.loaded.r||!S.loaded.s)return `<p class="boot">Carico i dati del weekend…</p>`;
  if(!me())return vLogin();
  if(!UI.homed){UI.homed=true;if(!UI.navigated)UI.tab=homeTab();}
  if(!UI.migrated&&isOrg()&&!S.readOnly&&S.legacyCats&&Object.keys(S.legacyCats).length){UI.migrated=true;migrateCats();}
  const views={proposte:vProposte,suggerimenti:vSugg,libro:vLibro,voto:vVoto,menu:vMenu,spesa:vSpesa,programma:vProgramma,persone:vPersone};
  const view=UI.dish?vPiatto():(views[UI.tab]||vProposte)();
  return vHeader()+vNav()+vStatus()+vBand()+`<main class="wrap">${S.offline?`<div class="note warn" style="margin-top:16px"><b>Sei offline.</b> Puoi continuare: le modifiche restano in coda e si salvano appena torna la connessione. Non chiudere la pagina.</div>`:''}${S.readOnly?`<div class="note bad" style="margin-top:16px"><b>Sola lettura.</b> Puoi guardare tutto ma non modificare: chiedi a Marco di darti accesso come collaboratore.</div>`:''}${view}</main>`;
}
function render(){
  const root=$('#app');if(!root)return;
  if(UI.dragging){UI.dragPending=true;return;} // durante il trascinamento la pagina non si ridisegna
  const ae=document.activeElement;
  const fid=ae&&ae.id&&root.contains(ae)?ae.id:null;
  const sel=fid&&ae.selectionStart!=null?[ae.selectionStart,ae.selectionEnd]:null;
  const tsOld=$('.tabs .in',root),tl=tsOld?tsOld.scrollLeft:0;
  let html;
  try{html=build();}catch(e){console.error(e);html=`<div class="wrap"><div class="note bad" style="margin-top:24px">Errore di visualizzazione: ${esc(e.message)}</div></div>`;}
  if(S.newVersion)html=`<div class="upd" role="status"><span><b>Nuova versione disponibile.</b> Aggiorna per vedere le novità.</span> <button class="btn sm primary" data-act="reload-new">Aggiorna ora</button></div>`+html;
  root.innerHTML=html;
  tabsFix(tl);
  if(fid){const n=document.getElementById(fid);if(n){n.focus();try{if(sel)n.setSelectionRange(sel[0],sel[1]);}catch(e){}}}
}
/* barra delle schede: resta dove l'utente l'ha scorsa, la scheda attiva è sempre visibile, le frecce compaiono solo se c'è altro da scorrere */
function tabsArrows(){
  const n=$('.tabs .in'),bar=$('.tabs');if(!n||!bar)return;
  const l=$('.tabarr.l',bar),r=$('.tabarr.r',bar),canL=n.scrollLeft>2,canR=n.scrollLeft+n.clientWidth<n.scrollWidth-2;
  if(l)l.hidden=!canL;if(r)r.hidden=!canR;
  bar.classList.toggle('can-l',canL);bar.classList.toggle('can-r',canR);
}
function tabsFix(left){
  const n=$('.tabs .in');if(!n)return;
  n.scrollLeft=left||0;
  const a=$('.tab[aria-current="page"]',n);
  if(a){const lo=a.offsetLeft-28,hi=a.offsetLeft+a.offsetWidth+28;if(lo<n.scrollLeft)n.scrollLeft=Math.max(0,lo);else if(hi>n.scrollLeft+n.clientWidth)n.scrollLeft=hi-n.clientWidth;}
  tabsArrows();
}
A['tabs-scroll']=t=>{const n=$('.tabs .in');if(n)n.scrollBy({left:num(t.dataset.d)*Math.max(160,n.clientWidth*0.6),behavior:'smooth'});};
document.addEventListener('scroll',e=>{if(e.target&&e.target.classList&&e.target.classList.contains('in')&&e.target.parentElement&&e.target.parentElement.classList.contains('tabs'))tabsArrows();},true);
window.addEventListener('resize',tabsArrows);
let raf=0;
function schedule(){if(raf)return;raf=requestAnimationFrame(()=>{raf=0;render();});}

/* Sistema nel database le proposte con le vecchie categorie (le vede già bene chiunque, anche senza questa scrittura). */
async function migrateCats(){
  for(const id of Object.keys(S.legacyCats))await write('update','recipes/'+id,{category:S.legacyCats[id]});
}

/* --- accesso e partecipanti --- */
A.login=t=>{S.meId=t.dataset.id;store.set('gb.me',S.meId);UI.homed=true;UI.navigated=false;UI.tab=homeTab();UI.dish=null;routeFromHash();render();window.scrollTo(0,0);};
A.logout=()=>doLogout();
async function addParticipant(name,confirmed){
  name=name.trim().replace(/\s+/g,' ');
  if(!name)return{err:'Scrivi un nome.'};
  if(S.participants.some(p=>norm(p.name)===norm(name)))return{err:'Esiste già un partecipante con questo nome: sceglilo dall’elenco.'};
  const first=!S.participants.length;
  const id='p_'+slug(name)+(S.participants.some(p=>p.id==='p_'+slug(name))?'-'+Math.random().toString(36).slice(2,5):'');
  const ord=S.participants.reduce((m,p)=>Math.max(m,p.ord==null?0:p.ord),0)+1;
  const ok=await write('set','participants/'+id,{name,confirmed:!!confirmed,organizer:first,ord,createdAt:Date.now()});
  return ok?{id}:{err:'Non sono riuscito a salvare il nome.'};
}
A['seed-preset']=async()=>{
  if(S.participants.length)return;
  const now=Date.now();let ok=true;
  for(let i=0;i<PRESET.length;i++)ok=(await write('set','participants/p_'+slug(PRESET[i]),{name:PRESET[i],confirmed:true,organizer:i===0,ord:i+1,createdAt:now}))&&ok;
  if(!S.settingsExists)ok=(await write('set','settings/main',mergeSettings()))&&ok;
  toast(ok?'Elenco caricato':'Caricamento incompleto: riprova.',ok?'':'err');
};
SUB.addself=async()=>{
  const r=await addParticipant($('#ln').value,$('#lc').checked);
  UI.login.conf=$('#lc').checked;
  if(r.err){const e=$('#lerr');e.textContent=r.err;e.hidden=false;return;}
  S.meId=r.id;store.set('gb.me',r.id);UI.homed=true;UI.navigated=false;UI.tab=homeTab();render();
};
SUB.addperson=async()=>{
  const r=await addParticipant($('#np').value,$('#npc').checked);
  if(r.err){const e=$('#nperr');e.textContent=r.err;e.hidden=false;return;}
  toast('Partecipante aggiunto');
};

/* --- eventi (delegati) --- */
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-act]');if(!t||t.disabled)return;
  const f=A[t.dataset.act];if(f)f(t,e);
});
document.addEventListener('change',e=>{
  const t=e.target.closest('[data-chg]');if(!t)return;
  const f=CH[t.dataset.chg];if(f)f(t,e);
});
document.addEventListener('input',e=>{
  const t=e.target.closest('[data-in]');if(!t)return;
  const f=IN[t.dataset.in];if(f)f(t,e);
});
document.addEventListener('submit',e=>{
  const f=e.target.closest('[data-sub]');if(!f)return;
  e.preventDefault();const h=SUB[f.dataset.sub];if(h)h(f,e);
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#modal').hidden&&!(e.target&&e.target.closest&&e.target.closest('input,textarea,select')))closeModal();});
window.addEventListener('hashchange',()=>{routeFromHash();render();});

/* --- avvio --- */
function subscribe(){
  const onErr=k=>e=>{console.error('snapshot',k,e);S.loaded[k]=true;if(e&&e.code==='permission-denied'){S.permDenied=true;S.dbOk=false;}schedule();};
  db.collection('participants').onSnapshot(s=>{S.participants=s.docs.map(d=>Object.assign({},d.data(),{id:d.id}));S.loaded.p=true;schedule();},onErr('p'));
  db.collection('recipes').onSnapshot(s=>{S.legacyCats={};S.allRecipes=s.docs.map(d=>{const raw=d.data(),o=Object.assign({},raw,{id:d.id}),a=CAT_ALIAS[raw.category];if(a){S.legacyCats[d.id]=a;o.category=a;}return o;});S.recipes=S.allRecipes.filter(r=>!r.eliminata);S.trash=S.allRecipes.filter(r=>r.eliminata);S.loaded.r=true;schedule();},onErr('r'));
  db.doc('meta/backups').onSnapshot(d=>{S.metaExists=!!d.exists;S.backups=d.exists?(d.data().items||[]):[];schedule();},onErr('meta'));
  db.collection('votes').onSnapshot(s=>{const v={};s.docs.forEach(d=>{v[d.id]=d.data();});S.votes=v;S.loaded.v=true;schedule();},onErr('v'));
  db.collection('spesa').onSnapshot(s=>{const v={};s.docs.forEach(d=>{v[d.id]=d.data();});S.spesa=v;S.loaded.sp=true;schedule();},onErr('sp'));
  db.doc('settings/main').onSnapshot(d=>{S.settingsExists=!!d.exists;S.settings=mergeSettings(d.exists?d.data():null);S.loaded.s=true;schedule();},onErr('s'));
}
async function initArtifact(c){
  const ask=n=>Promise.resolve().then(()=>c.use(n)).catch(()=>null);
  ask('sample').then(v=>{sampleCap=v;});
  ask('downloads').then(v=>{dlCap=v;schedule();});
  ask('user').then(async v=>{
    userCap=v;if(!v)return;
    try{S.owner=!!(await v.isOwner());}catch(e){}
    try{if((await v.can('data.write'))===false)S.readOnly=true;}catch(e){}
    schedule();
  });
  db=await ask('db');
  if(!db){S.dbOk=false;render();return;}
  S.dbOk=true;
  subscribe();
}

/* Versione pubblica (fuori da claude.ai): dati su Firestore, nessun account richiesto. */
function fsAdapter(fs){
  return{
    doc:p=>{const r=fs.doc(p);return{
      get:()=>r.get(),
      set:d=>r.set(d),
      update:async d=>{const s=await r.get();if(!s.exists)throw{code:'invalid_argument',message:'documento inesistente'};return r.set(d,{merge:true});},
      delete:()=>r.delete(),
      onSnapshot:(n,e)=>r.onSnapshot(n,e)};},
    collection:p=>{const c=fs.collection(p);return{onSnapshot:(n,e)=>c.onSnapshot(n,e)};}
  };
}
function initStandalone(){
  S.standalone=true;
  const cfg=window.GB_FIREBASE;
  if(!cfg||!cfg.projectId){S.noConfig=true;S.dbOk=false;render();return;}
  if(!window.firebase||!window.firebase.firestore){S.dbOk=false;render();return;}
  try{
    window.firebase.initializeApp(cfg);
    const f=window.firebase.firestore();
    try{f.enablePersistence({synchronizeTabs:true}).catch(()=>{});}catch(e){}
    db=fsAdapter(f);
  }catch(e){console.error(e);S.dbOk=false;render();return;}
  dlCap={save:async({filename,data})=>{
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type:/\.json$/i.test(filename)?'application/json':'text/csv;charset=utf-8'}));a.download=filename;
    document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1500);return{status:'saved'};}};
  S.dbOk=true;
  subscribe();
}
window.addEventListener('offline',()=>{S.offline=true;paintSave();schedule();});
window.addEventListener('online',()=>{S.offline=false;paintSave();schedule();});
document.addEventListener('click',e=>{ // ricorda se i riquadri a tendina sono aperti, anche dopo un aggiornamento dei dati
  const sm=e.target.closest&&e.target.closest('details[id]>summary');
  if(sm){const d=sm.parentElement;UI.open=UI.open||{};UI.open[d.id]=!d.open;}
},true);
/* Countdown: aggiorna i conti alla rovescia ogni secondo senza ridisegnare la pagina; allo scadere ridisegna (la fase cambia). */
setInterval(()=>{
  $$('[data-cd]').forEach(e=>{
    const left=+e.dataset.cd-nowMs();
    if(left<=0){if(!e.dataset.done){e.dataset.done='1';schedule();}e.textContent=fmtCd(0);}else e.textContent=fmtCd(left);
  });
},1000);
setInterval(()=>{ // copia di sicurezza periodica, solo se ci sono state modifiche
  if(!db||!S.dirty||S.pending>0||S.offline)return;
  const last=(S.backups[0]&&S.backups[0].at)||0;
  if(Date.now()-last>=BACKUP_EVERY)makeBackup('automatico',true);
},window.GB_TICK||60000);
/* Avviso di nuova versione: la pagina pubblica confronta il proprio id di build con docs/version.json. */
async function checkVersion(){
  if(!S.standalone)return;
  try{
    const r=await fetch('version.json?t='+Date.now(),{cache:'no-store'});
    if(!r.ok)return;
    const v=await r.json();
    if(v&&v.build&&v.build!==BUILD&&S.newVersion!==v.build){S.newVersion=v.build;schedule();}
  }catch(e){}
}
A['reload-new']=()=>{
  try{location.href=location.pathname+'?v='+encodeURIComponent(S.newVersion||Date.now())+location.hash;}catch(e){location.reload();}
};
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')checkVersion();});
async function init(){
  S.offline=typeof navigator!=='undefined'&&navigator.onLine===false;
  S.meId=store.get('gb.me')||null;
  routeFromHash();
  render();
  const c=window.claude;
  if(c&&typeof c.use==='function')return initArtifact(c);
  initStandalone();
  checkVersion();
  setInterval(checkVersion,window.GB_VER_TICK||5*60*1000);
}
init();
