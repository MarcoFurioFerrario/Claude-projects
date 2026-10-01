/* ============ avvio, sottoscrizioni, eventi ============ */
const SUB={};
function setHash(h){try{history.replaceState(null,'','#'+h);}catch(e){try{location.hash=h;}catch(e2){}}}
function routeFromHash(){
  let h='';try{h=location.hash.slice(1);}catch(e){}
  if(h.startsWith('piatto-')){UI.dish=h.slice(7);UI.tab='menu';}
  else if(['proposte','voto','menu','spesa','programma','persone'].includes(h)){UI.tab=h;UI.dish=null;}
}
function doLogout(){S.meId=null;store.set('gb.me','');render();}

function noDb(){
  return `<div class="wrap"><div class="login"><div><p class="film">dal film di Marco Ferreri · 1973</p><h1>Gran Bouffe <span style="color:var(--accent)">Triveneto</span></h1></div>
    <div class="note bad"><b>Non riesco a collegarmi ai dati condivisi.</b> Apri la pagina da claude.ai con il tuo account e controlla di avere accesso alla pagina come collaboratore. Se il problema continua, avvisa Marco.</div></div></div>`;
}
function build(){
  if(S.dbOk===false)return noDb();
  if(!S.loaded.p||!S.loaded.r||!S.loaded.s)return `<p class="boot">Carico i dati del weekend…</p>`;
  if(!me())return vLogin();
  const views={proposte:vProposte,voto:vVoto,menu:vMenu,spesa:vSpesa,programma:vProgramma,persone:vPersone};
  const view=UI.dish?vPiatto():(views[UI.tab]||vProposte)();
  return vHeader()+vNav()+`<main class="wrap">${S.readOnly?`<div class="note bad" style="margin-top:16px"><b>Sola lettura.</b> Puoi guardare tutto ma non modificare: chiedi a Marco di darti accesso come collaboratore.</div>`:''}${view}</main>`;
}
function render(){
  const root=$('#app');if(!root)return;
  const ae=document.activeElement;
  const fid=ae&&ae.id&&root.contains(ae)?ae.id:null;
  const sel=fid&&ae.selectionStart!=null?[ae.selectionStart,ae.selectionEnd]:null;
  let html;
  try{html=build();}catch(e){console.error(e);html=`<div class="wrap"><div class="note bad" style="margin-top:24px">Errore di visualizzazione: ${esc(e.message)}</div></div>`;}
  root.innerHTML=html;
  if(fid){const n=document.getElementById(fid);if(n){n.focus();try{if(sel)n.setSelectionRange(sel[0],sel[1]);}catch(e){}}}
}
let raf=0;
function schedule(){if(raf)return;raf=requestAnimationFrame(()=>{raf=0;render();});}

/* --- accesso e partecipanti --- */
A.login=t=>{S.meId=t.dataset.id;store.set('gb.me',S.meId);UI.tab='proposte';UI.dish=null;routeFromHash();render();window.scrollTo(0,0);};
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
SUB.addself=async()=>{
  const r=await addParticipant($('#ln').value,$('#lc').checked);
  UI.login.conf=$('#lc').checked;
  if(r.err){const e=$('#lerr');e.textContent=r.err;e.hidden=false;return;}
  S.meId=r.id;store.set('gb.me',r.id);UI.tab='proposte';render();
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
  const onErr=k=>e=>{console.error('snapshot',k,e);S.loaded[k]=true;schedule();};
  db.collection('participants').onSnapshot(s=>{S.participants=s.docs.map(d=>Object.assign({},d.data(),{id:d.id}));S.loaded.p=true;schedule();},onErr('p'));
  db.collection('recipes').onSnapshot(s=>{S.recipes=s.docs.map(d=>Object.assign({},d.data(),{id:d.id}));S.loaded.r=true;schedule();},onErr('r'));
  db.collection('votes').onSnapshot(s=>{const v={};s.docs.forEach(d=>{v[d.id]=d.data();});S.votes=v;S.loaded.v=true;schedule();},onErr('v'));
  db.collection('spesa').onSnapshot(s=>{const v={};s.docs.forEach(d=>{v[d.id]=d.data();});S.spesa=v;S.loaded.sp=true;schedule();},onErr('sp'));
  db.doc('settings/main').onSnapshot(d=>{S.settingsExists=!!d.exists;S.settings=mergeSettings(d.exists?d.data():null);S.loaded.s=true;schedule();},onErr('s'));
}
async function init(){
  S.meId=store.get('gb.me')||null;
  routeFromHash();
  render();
  const c=window.claude;
  if(!c||typeof c.use!=='function'){S.dbOk=false;render();return;}
  const ask=n=>Promise.resolve().then(()=>c.use(n)).catch(()=>null);
  c.use&&ask('sample').then(v=>{sampleCap=v;});
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
init();
