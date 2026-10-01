'use strict';
/* ============ utilità ============ */
const $=(s,r)=>(r||document).querySelector(s);
const $$=(s,r)=>Array.from((r||document).querySelectorAll(s));
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=p=>p+'_'+Math.random().toString(36).slice(2,8)+Date.now().toString(36).slice(-4);
const stripAcc=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'');
const norm=s=>stripAcc(s).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const slug=s=>norm(s).replace(/ /g,'-').slice(0,90)||'x';
const num=v=>{if(typeof v==='number')return isFinite(v)?v:0;const n=parseFloat(String(v==null?'':v).replace(',','.'));return isFinite(n)?n:0;};
const fmtN=(n,d)=>Number(n).toLocaleString('it-IT',{maximumFractionDigits:d==null?2:d});
const cap1=s=>{s=String(s||'').trim();return s?s[0].toUpperCase()+s.slice(1):s;};
const byTitle=(a,b)=>String(a.title).localeCompare(String(b.title),'it');
/* Il nome scelto si ricorda con un cookie (un anno) e, in più, con localStorage. */
const cookieDir=()=>{try{return location.pathname.replace(/[^/]*$/,'')||'/';}catch(e){return '/';}};
const store={
  get(k){
    const ck=k.replace(/\W/g,'_');
    try{const m=document.cookie.split('; ').find(c=>c.indexOf(ck+'=')===0);if(m){const v=decodeURIComponent(m.slice(ck.length+1));if(v)return v;}}catch(e){}
    try{return localStorage.getItem(k);}catch(e){return null;}
  },
  set(k,v){
    const ck=k.replace(/\W/g,'_');
    try{document.cookie=ck+'='+encodeURIComponent(v||'')+'; Path='+cookieDir()+'; Max-Age='+(v?31536000:0)+'; SameSite=Lax'+(location.protocol==='https:'?'; Secure':'');}catch(e){}
    try{if(v)localStorage.setItem(k,v);else localStorage.removeItem(k);}catch(e){}
  }
};
const hm=s=>{const m=/^(\d{1,2}):(\d{2})$/.exec(String(s||''));return m?(+m[1]+(+m[2])/60):0;};
const fmtT=h=>{h=((h%24)+24)%24;let H=Math.floor(h+1e-9),M=Math.round((h-H)*60);if(M>=60){H=(H+1)%24;M=0;}return String(H).padStart(2,'0')+':'+String(M).padStart(2,'0');};
const isUrl=s=>{try{const u=new URL(String(s).trim());return u.protocol==='http:'||u.protocol==='https:';}catch(e){return false;}};
const domain=s=>{try{return new URL(s).hostname.replace(/^www\./,'');}catch(e){return '';}};

/* ============ costanti del dominio ============ */
const CATS=[
  {key:'antipasti',label:'Antipasti e snack',h:42},
  {key:'primi',label:'Primi',h:18},
  {key:'zuppe',label:'Zuppe e minestre',h:165},
  {key:'secondi',label:'Secondi',h:345},
  {key:'griglia',label:'Griglia',h:215},
  {key:'contorni',label:'Contorni',h:100},
  {key:'dolci',label:'Dolci',h:290}
];
const catOf=k=>CATS.find(c=>c.key===k)||{key:k,label:k||'—',h:0};
const catIdx=k=>{const i=CATS.findIndex(c=>c.key===k);return i<0?99:i;};
const REGIONI=['Veneto','Friuli-Venezia Giulia','Trentino-Alto Adige'];
const SHOPS=[
  {key:'carne',label:'Carne, pesce e salumi',short:'Carne e pesce'},
  {key:'latticini',label:'Formaggi e latticini',short:'Latticini'},
  {key:'ortolano',label:'Verdura e frutta',short:'Ortolano'},
  {key:'dispensa',label:'Supermercato e dispensa',short:'Supermercato'},
  {key:'cantina',label:'Vini e bevande',short:'Vini'},
  {key:'altro',label:'Altro (farmacia, ferramenta…)',short:'Altro'}
];
const shopOf=k=>SHOPS.find(s=>s.key===k)||SHOPS[3];
const UNITS=['g','kg','ml','l','pz','spicchi','mazzi','foglie','rametti','cucchiai','cucchiaini','bustine','barattoli','confezioni','fette','bicchieri','bottiglie','teste','coste','pizzichi','q.b.'];
const PORZ={assaggio:{f:.5,label:'Assaggio (mezza porzione)'},normale:{f:1,label:'Normale'},abbondante:{f:1.5,label:'Abbondante'}};
const DAYS=[{key:'ven',label:'Venerdì'},{key:'sab',label:'Sabato'},{key:'dom',label:'Domenica'}];
const SLOTS=[
  {key:'ven-cena',day:'ven',dayIdx:0,label:'Venerdì sera'},
  {key:'sab-pranzo',day:'sab',dayIdx:1,label:'Sabato pranzo'},
  {key:'sab-cena',day:'sab',dayIdx:1,label:'Sabato cena'},
  {key:'dom-pranzo',day:'dom',dayIdx:2,label:'Domenica pranzo'}
];
const WEEKDAYS=['Venerdì','Sabato','Domenica','Lunedì','Martedì','Mercoledì','Giovedì'];
const FASI=[['proposte','Proposte'],['voto','Voto'],['menu','Menu'],['cucina','Cucina']];
const VSTATI={
  da_verificare:{label:'Link da verificare',cls:'muted'},
  verificato:{label:'Link verificato',cls:'ok'},
  migliorato:{label:'Fonte autorevole aggiunta',cls:'info'},
  da_sostituire:{label:'Link da sostituire',cls:'warn'},
  non_valido:{label:'Link non valido',cls:'bad'}
};
const PRESET=['Marco Furio','Marco Terracina','Teo','Tia','Melo','Jaki','Mazzetti','Fantoni','Murro','Fede','Umbe','Jack','Gesù Pippia','Turi','Lollo'];
const DEF={fase:'proposte',edizione:'XI',tema:'Triveneto',dataVen:'',arrivo:'16:00',riservaOre:1,margine:0,
  orari:{'ven-cena':'20:30','sab-pranzo':'13:30','sab-cena':'20:30','dom-pranzo':'13:30'},cap:{ven:5,sab:12,dom:5}};
function mergeSettings(d){
  const o=JSON.parse(JSON.stringify(DEF));if(!d)return o;
  for(const k of Object.keys(d)){if(k==='orari'||k==='cap')Object.assign(o[k],d[k]||{});else o[k]=d[k];}
  return o;
}

/* ============ stato ============ */
const S={meId:null,participants:[],recipes:[],allRecipes:[],trash:[],backups:[],metaExists:false,pending:0,dirty:false,offline:false,lastOk:0,votes:{},spesa:{},settings:mergeSettings(),settingsExists:false,loaded:{},dbOk:null,readOnly:false,owner:false};
const UI={tab:'proposte',dish:null,q:'',cat:'',reg:'',ver:'',mine:false,vcat:'antipasti',vmode:'mia',draft:{},sday:'',sshop:'',shide:false,confirm:'',sugg:false,login:{conf:true},sq:'',scat:'',sreg:'',swt:'',slv:'',sst:'',ssort:'cat'};
let db=null,sampleCap=null,dlCap=null,userCap=null;

const P=id=>S.participants.find(p=>p.id===id);
const pname=id=>(P(id)||{}).name||'ex partecipante';
const R=id=>S.recipes.find(r=>r.id===id);
const me=()=>P(S.meId);
const nConf=()=>S.participants.filter(p=>p.confirmed).length;
const isOrg=()=>!!(S.owner||(me()&&me().organizer));
const canPropose=()=>S.settings.fase==='proposte'||isOrg();
const canVote=()=>S.settings.fase==='voto';
const canEditRecipe=r=>isOrg()||(!!S.meId&&(r.proposerId===S.meId||(r.ownerIds||[]).includes(S.meId)||(r.teamIds||[]).includes(S.meId)));
const canDelRecipe=r=>isOrg()||r.proposerId===S.meId;
const vstato=r=>((r.verifica||{}).stato)||'da_verificare';

/* ============ helper di interfaccia ============ */
const chipCat=k=>{const c=catOf(k);return `<span class="chip" style="--h:${c.h}">${esc(c.label)}</span>`;};
const badge=(t,cls)=>`<span class="badge ${cls||''}">${esc(t)}</span>`;
const A={},CH={},IN={};
const isOpen=id=>(UI.open&&UI.open[id])?'open':'';
let toastT;
function toast(msg,kind){
  const t=$('#toast');if(!t)return;
  t.innerHTML=`<div class="toast ${kind||''}" role="status">${esc(msg)}</div>`;
  clearTimeout(toastT);toastT=setTimeout(()=>{t.innerHTML='';},kind==='err'?6500:2600);
}
function errMsg(e){
  const c=e&&e.code;
  if(c==='permission-denied')return 'Il database ha rifiutato la scrittura: le regole di Firestore non permettono di modificare i dati.';
  if(c==='unavailable')return 'Connessione assente: riprova tra poco.';
  if(c==='invalid_argument')return 'Salvataggio rifiutato: probabilmente non hai i permessi di modifica. Chiedi a Marco di darti accesso come collaboratore.';
  if(c==='quota_exceeded')return 'Spazio del database esaurito.';
  if(c==='resource_exhausted')return 'Troppe operazioni ravvicinate: riprova tra qualche secondo.';
  if(c==='revoked')return 'Accesso alla pagina revocato.';
  return 'Salvataggio non riuscito'+(e&&e.message?': '+e.message:'.');
}
const BUILD='__BUILD__';
const BACKUP_EVERY=window.GB_BACKUP_EVERY||15*60*1000,BACKUP_KEEP=60;
function saveHtml(){
  if(S.offline)return '<span class="sv warn">Offline: le modifiche restano in coda</span>';
  if(S.pending>0)return '<span class="sv">Salvataggio…</span>';
  return '<span class="sv ok">✓ Tutto salvato'+(S.lastOk?' · '+new Date(S.lastOk).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'}):'')+'</span>';
}
function paintSave(){['savestat','savestat2'].forEach(id=>{const e=document.getElementById(id);if(e)e.innerHTML=saveHtml();});}
/* Scrittura con indicatore di stato: se il server non risponde entro 7 s la modifica resta in coda
   (il database la completa appena torna la rete) e l'interfaccia non si blocca. */
async function write(op,path,data){
  if(!db){toast('Database non disponibile in questa vista.','err');return false;}
  if(S.readOnly){toast('Sei in sola lettura: non puoi modificare i dati.','err');return false;}
  const task=(async()=>{const ref=db.doc(path);if(op==='set')await ref.set(data);else if(op==='update')await ref.update(data);else await ref.delete();})();
  S.pending++;S.dirty=true;paintSave();
  const done=ok=>{S.pending=Math.max(0,S.pending-1);if(ok)S.lastOk=Date.now();paintSave();};
  let timer;
  try{
    const r=await Promise.race([task.then(()=>'ok'),new Promise(res=>{timer=setTimeout(()=>res('slow'),7000);})]);
    clearTimeout(timer);
    if(r==='slow'){
      toast('Connessione lenta o assente: la modifica è in coda e si salva appena torna la rete. Non chiudere la pagina.');
      task.then(()=>done(true),e=>{done(false);console.error(path,e);toast(errMsg(e),'err');});
      return true;
    }
    done(true);return true;
  }catch(e){clearTimeout(timer);done(false);console.error(path,e);toast(errMsg(e),'err');return false;}
}
function openModal(html,onMount){
  const m=$('#modal');
  m.innerHTML=`<div class="scrim"></div><div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
  m.hidden=false;document.body.classList.add('modal-open');
  if(onMount)onMount($('.sheet',m));
}
function closeModal(){const m=$('#modal');m.hidden=true;m.innerHTML='';document.body.classList.remove('modal-open');}
function copyText(text,okMsg){
  const done=()=>toast(okMsg||'Copiato negli appunti');
  const fallback=()=>openModal(`<header><h3>Copia il testo</h3><button class="btn sm" data-act="modal-close">Chiudi</button></header>
    <textarea id="cp" rows="14" readonly>${esc(text)}</textarea><p class="hint">Seleziona tutto e copia.</p>`,s=>{const ta=$('#cp',s);ta.focus();ta.select();});
  try{
    if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(done,fallback);}else fallback();
  }catch(e){fallback();}
}
A['modal-close']=()=>closeModal();
