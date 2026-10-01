/* ============ copie di sicurezza, scarico e ripristino ============ */
const fmtWhen=ts=>new Date(ts).toLocaleString('it-IT',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
let backingUp=false;

function snapshotNow(motivo){
  return{at:Date.now(),by:S.meId||'',motivo,
    p:JSON.stringify(S.participants),r:JSON.stringify(S.allRecipes),v:JSON.stringify(S.votes),s:JSON.stringify(S.spesa),
    m:JSON.stringify(S.settingsExists?S.settings:null)};
}
async function makeBackup(motivo,silent){
  if(!db||S.readOnly||backingUp||!S.loaded.p||!S.loaded.r)return false;
  if(!S.participants.length&&!S.allRecipes.length)return false;
  backingUp=true;
  try{
    const snap=snapshotNow(motivo);
    if(snap.p.length+snap.r.length+snap.v.length+snap.s.length+snap.m.length>900000){
      if(!silent)toast('I dati sono troppo grandi per la copia online: scarica la copia come file.','err');
      return false;
    }
    const id='b'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
    if(!await write('set','backups/'+id,snap))return false;
    const item={id,at:snap.at,motivo,by:snap.by,n:{p:S.participants.length,r:S.recipes.length,v:Object.keys(S.votes).length,m:slotted().length}};
    const items=[item].concat(S.backups||[]);
    const keep=items.slice(0,BACKUP_KEEP),drop=items.slice(BACKUP_KEEP);
    const ok=S.metaExists?await write('update','meta/backups',{items:keep}):await write('set','meta/backups',{items:keep});
    for(const d of drop)await write('delete','backups/'+d.id);
    S.dirty=false;
    if(!silent&&ok)toast('Copia di sicurezza salvata');
    return ok;
  }finally{backingUp=false;}
}

const validBackup=o=>o&&typeof o==='object'&&Array.isArray(o.p)&&Array.isArray(o.r)&&o.v&&typeof o.v==='object'&&o.s&&typeof o.s==='object'
  &&o.p.every(x=>x&&typeof x.id==='string'&&typeof x.name==='string')&&o.r.every(x=>x&&typeof x.id==='string'&&typeof x.title==='string');

async function restoreData(d){
  await makeBackup('prima del ripristino',true);
  const jobs=[];
  const arrMap=a=>Object.fromEntries((a||[]).map(x=>{const c=Object.assign({},x);delete c.id;return[x.id,c];}));
  const sync=(coll,cur,target)=>{
    for(const id of cur)if(!(id in target))jobs.push(()=>write('delete',coll+'/'+id));
    for(const id of Object.keys(target))jobs.push(()=>write('set',coll+'/'+id,target[id]));
  };
  sync('participants',S.participants.map(x=>x.id),arrMap(d.p));
  sync('recipes',S.allRecipes.map(x=>x.id),arrMap(d.r));
  sync('votes',Object.keys(S.votes),d.v||{});
  sync('spesa',Object.keys(S.spesa),d.s||{});
  if(d.m)jobs.push(()=>write('set','settings/main',d.m));
  let all=true;
  for(let i=0;i<jobs.length;i+=8){
    const rs=await Promise.all(jobs.slice(i,i+8).map(f=>f()));
    if(rs.includes(false))all=false;
    const el=$('#rs-prog');if(el)el.textContent=Math.min(i+8,jobs.length)+' di '+jobs.length;
  }
  return all;
}
function confirmRestore(d,label){
  DR={restore:d};
  const nr=d.r.filter(x=>!x.eliminata).length,nm=d.r.filter(x=>x.slot&&!x.eliminata).length,nv=Object.keys(d.v||{}).length;
  openModal(`<header><div><h3>Ripristinare questa copia?</h3><p class="hint">${esc(label)}</p></div><button class="btn sm" data-act="modal-close">Annulla</button></header>
    <p>La copia contiene <b>${nr}</b> proposte, <b>${nm}</b> piatti in menu, <b>${d.p.length}</b> partecipanti e i voti di <b>${nv}</b> persone.</p>
    <div class="note warn">I dati attuali verranno sostituiti da questa copia. Prima il sito salva una copia dello stato di adesso, così puoi tornare indietro.</div>
    <div class="foot"><button class="btn" data-act="modal-close">Annulla</button><button class="btn danger" data-act="restore-go">Sì, ripristina</button></div>`);
}
A['restore-go']=async()=>{
  const d=DR&&DR.restore;if(!d)return;
  const sheet=$('.sheet');
  sheet.innerHTML=`<h3>Ripristino in corso…</h3><p>Non chiudere la pagina. Passaggi completati: <b id="rs-prog">0</b></p>`;
  const ok=await restoreData(d);
  closeModal();DR=null;
  toast(ok?'Ripristino completato':'Ripristino finito con qualche errore: controlla i dati.',ok?'':'err');
};
A['restore-snap']=async t=>{
  try{
    const s=await db.doc('backups/'+t.dataset.id).get();
    if(!s.exists){toast('Copia non trovata.','err');return;}
    const o=s.data(),d={p:JSON.parse(o.p),r:JSON.parse(o.r),v:JSON.parse(o.v),s:JSON.parse(o.s),m:JSON.parse(o.m)};
    if(!validBackup(d)){toast('La copia non è leggibile.','err');return;}
    confirmRestore(d,fmtWhen(o.at)+' · '+(o.motivo||'automatica'));
  }catch(e){console.error(e);toast('Non riesco a leggere la copia.','err');}
};
A['backup-now']=async()=>{
  if(!await makeBackup('manuale'))toast('Copia non riuscita: riprova.','err');
};
A['backup-download']=async()=>{
  const s=snapshotNow('file'),pad=n=>String(n).padStart(2,'0'),d=new Date(s.at);
  const body=JSON.stringify({app:'gran-bouffe',versione:1,at:s.at,p:JSON.parse(s.p),r:JSON.parse(s.r),v:JSON.parse(s.v),s:JSON.parse(s.s),m:JSON.parse(s.m)},null,1);
  const filename=`gran-bouffe-backup-${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.json`;
  if(!dlCap){copyText(body,'Copia negli appunti: incollala in un file di testo e conservala.');return;}
  try{await dlCap.save({filename,data:body});toast('Copia scaricata: conservala in un posto sicuro.');}
  catch(e){if(!e||e.code!=='declined')toast('Download non riuscito.','err');}
};
CH['bk-file']=async t=>{
  const f=t.files&&t.files[0];if(!f)return;
  try{
    const o=JSON.parse(await f.text());
    if(!validBackup(o))throw new Error('formato');
    confirmRestore(o,'File '+f.name+(o.at?' · '+fmtWhen(o.at):''));
  }catch(e){toast('Il file non è una copia valida della Gran Bouffe.','err');}
  t.value='';
};

function vBackup(){
  const org=isOrg(),bs=S.backups||[],last=bs[0];
  const list=bs.slice(0,20).map(b=>`<div class="row spread" style="padding:7px 0;border-top:1px dashed var(--line)">
    <span><b>${esc(fmtWhen(b.at))}</b> <span class="small muted">· ${esc(b.motivo||'automatica')}${b.n?` · ${b.n.r} proposte, ${b.n.m} in menu, ${b.n.v} votanti`:''}</span></span>
    ${org?`<button class="btn sm" data-act="restore-snap" data-id="${esc(b.id)}">Ripristina</button>`:''}</div>`).join('');
  return `<div class="panel"><div class="row spread"><h3>Salvataggi e copie di sicurezza</h3><span id="savestat2">${saveHtml()}</span></div>
    <p style="margin-top:8px">Ogni modifica viene salvata online subito. In più, ogni ${Math.round(BACKUP_EVERY/60000)} minuti, se ci sono novità, il sito crea una copia di sicurezza e conserva le ultime ${BACKUP_KEEP}. ${last?`Ultima copia: <b>${esc(fmtWhen(last.at))}</b>.`:'La prima copia arriva dopo le prime modifiche.'}</p>
    ${org?`<div class="row" style="margin-top:10px"><button class="btn" data-act="backup-now">Salva una copia ora</button>
      <button class="btn" data-act="backup-download">Scarica una copia sul dispositivo</button>
      <label class="btn" style="cursor:pointer">Ripristina da file<input type="file" id="bk-file" accept=".json,application/json" data-chg="bk-file" class="sr"></label></div>`
      :`<p class="hint" style="margin-top:8px">Il ripristino lo fanno gli organizzatori.</p>`}
    ${bs.length?`<details id="bk" style="margin-top:12px" ${isOpen('bk')}><summary style="cursor:pointer;font-weight:600">Copie precedenti (${bs.length})</summary>${list}</details>`:''}</div>`;
}
