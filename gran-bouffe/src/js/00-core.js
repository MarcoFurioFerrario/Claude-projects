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
/* Zuppe e griglia sono state unite a primi e secondi (poche proposte per categoria rendevano il voto poco utile):
   i vecchi valori restano riconosciuti tramite CAT_ALIAS. */
const CATS=[
  {key:'antipasti',label:'Antipasti e snack',h:42},
  {key:'primi',label:'Primi e zuppe',h:18},
  {key:'secondi',label:'Secondi e griglia',h:345},
  {key:'contorni',label:'Contorni',h:100},
  {key:'dolci',label:'Dolci',h:290}
];
const CAT_ALIAS={zuppe:'primi',griglia:'secondi'};
const catKey=k=>CAT_ALIAS[k]||k;
const catOf=k=>CATS.find(c=>c.key===catKey(k))||{key:k,label:k||'—',h:0};
const catIdx=k=>{const i=CATS.findIndex(c=>c.key===catKey(k));return i<0?99:i;};
const REGIONI=['Veneto','Friuli-Venezia Giulia','Trentino-Alto Adige'];
const SHOPS=[
  {key:'carne',label:'Carne, pesce e salumi',short:'Carne e pesce'},
  {key:'latticini',label:'Formaggi e latticini',short:'Latticini'},
  {key:'ortolano',label:'Verdura e frutta',short:'Ortolano'},
  {key:'dispensa',label:'Supermercato e dispensa',short:'Supermercato'},
  {key:'cantina',label:'Vini e bevande',short:'Vini'},
  {key:'altro',label:'Altro (farmacia, ferramenta…)',short:'Altro'}
];
/* Appuntamenti fissi del programma, indipendenti dai piatti (day: 0 venerdì, 1 sabato, 2 domenica; da/a = ora) */
const PROG_FISSO=[{day:2,da:'16:00',a:'18:00',what:'Rassetto e pulizia'},{day:2,da:'18:30',a:'',what:'Chiusura, saluti e partenza'}];
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
/* Scadenze (ora italiana, UTC+2 in ottobre): le proposte e il voto sul formato chiudono insieme; il voto sui piatti dura 24 ore. */
const SCAD_DEF={propFine:'2026-10-04T21:00:00+02:00',votoIni:'2026-10-05T00:00:00+02:00',votoFine:'2026-10-06T00:00:00+02:00'};
const DEF={fase:'proposte',edizione:'XI',tema:'Triveneto',dataVen:'',arrivo:'16:00',riservaOre:1,margine:0,
  orari:{'ven-cena':'20:30','sab-pranzo':'13:30','sab-cena':'20:30','dom-pranzo':'13:30'},scad:Object.assign({},SCAD_DEF),scadAuto:true,formato:''};
function mergeSettings(d){
  const o=JSON.parse(JSON.stringify(DEF));if(!d)return o;
  for(const k of Object.keys(d)){if(k==='orari'||k==='scad')Object.assign(o[k],d[k]||{});else o[k]=d[k];}
  return o;
}
/* Formati del menu tra cui si vota. cap = piatti per giorno, slot = piatti per pasto, comp = portate obbligatorie in un pasto. */
const FORMATI=[
  {key:'dieta',nome:'Dieta',tot:15,cap:{ven:3,sab:8,dom:4},slot:{'ven-cena':3,'sab-pranzo':4,'sab-cena':4,'dom-pranzo':4},
    righe:['Venerdì 3 piatti','Sabato 4 a pranzo + 4 a cena','Domenica 4 a pranzo']},
  {key:'bouffetta',nome:'Bouffetta',tot:18,cap:{ven:4,sab:10,dom:4},slot:{'ven-cena':4,'sab-pranzo':5,'sab-cena':5,'dom-pranzo':4},comp:{'ven-cena':['antipasti','primi','secondi','dolci']},
    righe:['Venerdì 4 piatti: antipasto, primo, secondo, dolce','Sabato 5 + 5','Domenica 4']},
  {key:'esagerare',nome:'L’importante è esagerare',tot:22,cap:{ven:5,sab:12,dom:5},libero:true,
    righe:['22 piatti','Nessun vincolo su cosa, quando e come']}
];
const FMT=k=>FORMATI.find(f=>f.key===k)||null;
/* Fonti ritenute affidabili (whitelist). lv A = riferimento culturale o istituzionale, B = editoria di cucina o ente del territorio. */
const FONTI=[
  {d:'accademiaitalianadellacucina.it',n:'Accademia Italiana della Cucina',lv:'A'},
  {d:'it.wikisource.org',n:'Wikisource (Artusi, La scienza in cucina)',lv:'A'},
  {d:'taccuinigastrosofici.it',n:'Taccuini Gastrosofici',lv:'B',nota:'affidabile se contiene la ricetta cercata'},
  {d:'cucchiaio.it',n:'Cucchiaio d’Argento',lv:'B'},
  {d:'lacucinaitaliana.it',n:'La Cucina Italiana',lv:'B'},
  {d:'aifb.it',n:'AIFB · Calendario del cibo italiano',lv:'B'},
  {d:'turismofvg.it',n:'Turismo FVG',lv:'B'},
  {d:'docfriuli.eu',n:'Consorzio DOC Friuli',lv:'B'},
  {d:'trentinoqualita.it',n:'Qualità Trentino',lv:'B'},
  {d:'visittrentino.it',n:'Visit Trentino',lv:'B'},
  {d:'alto-adige.com',n:'Alto Adige (promozione del territorio)',lv:'B'},
  {d:'suedtirol.info',n:'Alto Adige · Südtirol Info',lv:'B'},
  {d:'genusslandsuedtirol.it',n:'Il gusto dell’Alto Adige',lv:'B'},
  {d:'tirol.at',n:'Tirol (turismo)',lv:'B'}
];
const fonteOk=u=>{const h=domain(u);return h?FONTI.find(f=>h===f.d||h.endsWith('.'+f.d))||null:null;};

/* ============ stato ============ */
const S={meId:null,participants:[],recipes:[],allRecipes:[],trash:[],backups:[],metaExists:false,pending:0,dirty:false,offline:false,lastOk:0,votes:{},spesa:{},settings:mergeSettings(),settingsExists:false,loaded:{},dbOk:null,readOnly:false,owner:false};
const UI={tab:'suggerimenti',homed:false,navigated:false,dish:null,q:'',cat:'',reg:'',ver:'',mine:false,vcat:'antipasti',vmode:'mia',draft:{},sday:'',sshop:'',shide:false,confirm:'',sugg:false,login:{conf:true},sq:'',scat:'',sreg:'',swt:'',slv:'',sst:'',ssort:'cat'};
let db=null,sampleCap=null,dlCap=null,userCap=null;

const P=id=>S.participants.find(p=>p.id===id);
const pname=id=>(P(id)||{}).name||'ex partecipante';
const R=id=>S.recipes.find(r=>r.id===id);
const me=()=>P(S.meId);
const nConf=()=>S.participants.filter(p=>p.confirmed).length;
const isOrg=()=>!!(S.owner||(me()&&me().organizer));
/* ---- scadenze e fasi ----
   La fase effettiva è la più avanzata tra quella scelta dall'organizzatore e quella che dicono le scadenze (se automatiche).
   stage() distingue anche "attesa": proposte chiuse, voto dei piatti non ancora aperto. */
const nowMs=()=>(typeof window!=='undefined'&&typeof window.GB_NOW==='function'?window.GB_NOW():Date.now());
const scadOn=()=>S.settings.scadAuto!==false;
const scadMs=k=>{const t=Date.parse((S.settings.scad||{})[k]);return isFinite(t)?t:Date.parse(SCAD_DEF[k]);};
const faseIdx=k=>Math.max(0,FASI.findIndex(f=>f[0]===k));
const autoIdx=()=>{if(!scadOn())return 0;const n=nowMs();return n>=scadMs('votoFine')?2:n>=scadMs('votoIni')?1:0;};
const faseEff=()=>FASI[Math.max(faseIdx(S.settings.fase),autoIdx())][0];
const stage=()=>{const f=faseEff();return f==='proposte'&&scadOn()&&nowMs()>=scadMs('propFine')?'attesa':f;};
const propOpen=()=>stage()==='proposte';
const fmtOpen=propOpen; // il voto sul formato chiude insieme alle proposte
const canPropose=()=>propOpen()||isOrg();
const canVote=()=>stage()==='voto';
const TZ='Europe/Rome';
function romeParts(ms){
  const o={};new Intl.DateTimeFormat('en-GB',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(ms)).forEach(p=>{o[p.type]=p.value;});
  return o;
}
const toLocalInput=ms=>{const o=romeParts(ms);return `${o.year}-${o.month}-${o.day}T${o.hour}:${o.minute}`;};
/* 'AAAA-MM-GGTHH:MM' in ora italiana -> testo ISO con l'offset giusto (+02:00 d'estate, +01:00 d'inverno) */
function fromLocalInput(s){
  const m=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(String(s||''));if(!m)return null;
  const guess=Date.UTC(+m[1],+m[2]-1,+m[3],+m[4],+m[5]);
  for(const off of [2,1])if(toLocalInput(guess-off*3600000)===s)return s+':00'+(off===2?'+02:00':'+01:00');
  return null;
}
const fmtDay=ms=>new Date(ms).toLocaleDateString('it-IT',{timeZone:TZ,weekday:'long',day:'numeric',month:'long'});
const fmtHour=ms=>new Date(ms).toLocaleTimeString('it-IT',{timeZone:TZ,hour:'2-digit',minute:'2-digit'});
const fmtDT=ms=>fmtDay(ms)+', ore '+fmtHour(ms);
/* una scadenza a mezzanotte si legge meglio come "mezzanotte di lunedì 5 ottobre" */
const fmtEnd=ms=>fmtHour(ms)==='00:00'?'mezzanotte di '+fmtDay(ms-60000):fmtDT(ms);
function fmtCd(ms){
  const s=Math.max(0,Math.floor(ms/1000)),d=Math.floor(s/86400),h=Math.floor(s%86400/3600),m=Math.floor(s%3600/60),x=s%60,p=n=>String(n).padStart(2,'0');
  return d>0?`${d} g ${p(h)} h ${p(m)} min ${p(x)} s`:`${p(h)}:${p(m)}:${p(x)}`;
}
/* I responsabili sono ownerIds (le vecchie squadre, teamIds, contano come responsabili). Chiunque può aggiungersi o togliersi;
   i dati del piatto li modifica solo chi l'ha proposto (o un organizzatore). */
const ownersOf=r=>[...new Set([...(r.ownerIds||[]),...(r.teamIds||[])])];
const canEditRecipe=r=>isOrg()||(!!S.meId&&r.proposerId===S.meId);
const canDelRecipe=r=>isOrg()||r.proposerId===S.meId;
const vstato=r=>((r.verifica||{}).stato)||'da_verificare';

/* ============ helper di interfaccia ============ */
const chipCat=k=>{const c=catOf(k);return `<span class="chip" style="--h:${c.h}">${esc(c.label)}</span>`;};
const badge=(t,cls)=>`<span class="badge ${cls||''}">${esc(t)}</span>`;
const A={},CH={},IN={};
const homeTab=()=>({voto:'voto',menu:'menu',cucina:'menu',attesa:'proposte'}[stage()])||'suggerimenti';
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
