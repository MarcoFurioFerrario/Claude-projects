/* ============ viste: accesso, testata, proposte ============ */
const safeHref=u=>isUrl(u)?String(u).trim():'#';
const sortedPeople=()=>[...S.participants].sort((a,b)=>((a.ord==null?1e9:a.ord)-(b.ord==null?1e9:b.ord))||a.name.localeCompare(b.name,'it'));

function vLogin(){
  const ps=sortedPeople();
  return `<div class="wrap"><div class="login">
    <div><p class="film">dal film di Marco Ferreri · 1973</p><h1>Gran Bouffe <span style="color:var(--accent)">Triveneto</span></h1></div>
    <p class="lede">Scegli il tuo nome per entrare: da qui proponi i piatti, voti, ti iscrivi alle squadre di cucina e vedi la lista della spesa.</p>
    ${ps.length?`<div class="names">${ps.map(p=>`<button class="btn" data-act="login" data-id="${esc(p.id)}">${esc(p.name)}</button>`).join('')}</div>`
      :`<div class="note">L’elenco partecipanti è vuoto.${S.standalone?` <button class="btn sm primary" data-act="seed-preset" style="margin-left:6px">Carica i ${PRESET.length} confermati</button>`:' Aggiungi il tuo nome: il primo che entra diventa organizzatore.'}</div>`}
    <form data-sub="addself" class="panel" style="display:flex;flex-direction:column;gap:10px">
      <h4>Non ci sei? Aggiungi un partecipante</h4>
      <div class="row"><input type="text" id="ln" placeholder="Nome (come lo chiamano gli amici)" autocomplete="off" style="flex:1;min-width:180px">
      <button class="btn primary" type="submit">Aggiungi ed entra</button></div>
      <label class="checkline"><input type="checkbox" id="lc" ${UI.login.conf?'checked':''}> Confermo la mia presenza al weekend</label>
      <p class="err" id="lerr" hidden></p>
    </form>
    <p class="hint">Il tuo nome viene ricordato su questo dispositivo con un cookie (dura un anno). Non raccogliamo altri dati personali.</p></div></div>`;
}

function vHeader(){
  const st=S.settings,f=st.fase,idx=FASI.findIndex(x=>x[0]===f);
  const rail=FASI.map((s,i)=>{
    const cls=i<idx?'done':i===idx?'now':'';
    return `<li class="${cls}">${isOrg()?`<button data-act="fase" data-v="${s[0]}" ${i===idx?'aria-current="step"':''}>${s[1]}</button>`:`<span ${i===idx?'aria-current="step"':''}>${s[1]}</span>`}</li>`;
  }).join('');
  const sel=slotted().length,tot=totalCap(),nv=voters().length;
  return `<header class="wrap top">
    <div class="brand"><div class="mark">Gran Bouffe <i>${esc(st.tema||'Triveneto')}</i></div>
    <div class="sub">${esc(st.edizione||'')} edizione · dal film di Marco Ferreri, 1973</div></div>
    <div class="who">${me()?`<span>Ciao, <b>${esc(me().name)}</b>${isOrg()?' · organizzatore':''}</span> <button class="link" data-act="logout">Cambia nome</button>`:''}</div>
  </header>
  <div class="wrap"><ol class="rail" aria-label="Fasi del progetto">${rail}</ol>
  <div class="stats"><span><b class="num">${nConf()}</b> confermati</span><span><b class="num">${S.recipes.length}</b> proposte</span>
  <span><b class="num">${nv}</b> hanno votato</span><span><b class="num">${sel}</b>/${tot} piatti in menu</span></div></div>`;
}

function vNav(){
  const tabs=[['proposte','Proposte',S.recipes.length],['voto','Votazioni'],['menu','Menu',slotted().length+'/'+totalCap()],['spesa','Spesa'],['programma','Programma'],['persone','Persone',nConf()]];
  return `<nav class="tabs" aria-label="Sezioni"><div class="in">${tabs.map(t=>
    `<button class="tab" data-act="tab" data-v="${t[0]}" ${(UI.tab===t[0]&&!UI.dish)||(UI.dish&&t[0]==='menu')?'aria-current="page"':''}>${t[1]}${t[2]!==undefined?`<span class="n">${t[2]}</span>`:''}</button>`).join('')}</div></nav>`;
}

/* --- proposte --- */
function filterRecipes(){
  const q=norm(UI.q);
  return S.recipes.filter(r=>(!UI.cat||r.category===UI.cat)&&(!UI.reg||r.region===UI.reg)&&(!UI.ver||vstato(r)===UI.ver)
    &&(!UI.mine||r.proposerId===S.meId||(r.ownerIds||[]).includes(S.meId))
    &&(!q||norm(r.title+' '+(r.note||'')+' '+pname(r.proposerId)).includes(q)))
    .sort((a,b)=>catIdx(a.category)-catIdx(b.category)||byTitle(a,b));
}
function srcBlock(r){
  const v=r.verifica||{};
  const auth=v.linkAutorevole&&isUrl(v.linkAutorevole);
  return `<div class="src"><span><span class="lbl">Link del proponente</span><br><a href="${esc(safeHref(r.link))}" target="_blank" rel="noopener noreferrer">${esc(domain(r.link)||r.link)} ↗</a></span>
    ${auth?`<span><span class="lbl">Fonte di riferimento</span><br><a href="${esc(safeHref(v.linkAutorevole))}" target="_blank" rel="noopener noreferrer">${esc(v.fonte||domain(v.linkAutorevole))} ↗</a></span>`:''}
    ${v.nota?`<span class="hint">${esc(v.nota)}</span>`:''}</div>`;
}
function cardRecipe(r){
  const st=VSTATI[vstato(r)]||VSTATI.da_verificare;
  const owners=(r.ownerIds||[]).map(pname).join(', ')||'—';
  const confirmDel=UI.confirm==='del:'+r.id;
  return `<article class="card ${r.slot?'sel':''}">
    <div class="row spread"><div class="row" style="gap:6px">${chipCat(r.category)}${r.region?`<span class="chip plain">${esc(r.region)}</span>`:''}</div>${badge(st.label,st.cls)}</div>
    <h3>${esc(r.title)}</h3>
    <dl class="kv"><dt>Proposta da</dt><dd>${esc(pname(r.proposerId))}</dd><dt>Responsabili</dt><dd>${esc(owners)}</dd></dl>
    ${r.note?`<p class="small muted clamp">${esc(r.note)}</p>`:''}
    ${srcBlock(r)}
    ${r.slot?`<div>${badge('In menu: '+slotLabel(r.slot),'ok')}</div>`:''}
    <div class="row">
      ${r.slot?`<button class="btn sm primary" data-act="open-dish" data-id="${esc(r.id)}">Scheda piatto</button>`:''}
      ${canEditRecipe(r)?`<button class="btn sm" data-act="edit-recipe" data-id="${esc(r.id)}">Modifica</button>`:''}
      ${canDelRecipe(r)?(confirmDel
        ?`<span class="small">Eliminare?</span><button class="btn sm danger" data-act="del-recipe" data-id="${esc(r.id)}">Sì, elimina</button><button class="btn sm" data-act="del-cancel">No</button>`
        :`<button class="btn sm" data-act="del-recipe" data-id="${esc(r.id)}">Elimina</button>`):''}
    </div></article>`;
}
function vProposte(){
  const list=filterRecipes();
  const pend=S.recipes.filter(r=>vstato(r)==='da_verificare').length;
  const chips=[['','Tutte']].concat(CATS.map(c=>[c.key,c.label])).map(c=>`<button class="fchip" aria-pressed="${UI.cat===c[0]}" data-act="fcat" data-v="${c[0]}">${esc(c[1])}</button>`).join('');
  let body='';
  if(!S.recipes.length){
    body=`<div class="empty"><h3>Nessuna proposta, per ora</h3><p>Scegli un piatto del Triveneto, indica chi lo cucinerà e incolla il link della ricetta.</p>
      ${canPropose()?`<button class="btn primary" data-act="new-recipe">+ Proponi il primo piatto</button>`:''}</div>`;
  }else if(!list.length){
    body=`<div class="empty"><h3>Nessun risultato</h3><p>Cambia o azzera i filtri.</p><button class="btn" data-act="fclear">Azzera filtri</button></div>`;
  }else{
    const groups=CATS.map(c=>[c,list.filter(r=>r.category===c.key)]).filter(g=>g[1].length);
    body=groups.map(([c,rs])=>`<div><h3 class="grp">${esc(c.label)} <span class="muted small num">${rs.length}</span></h3><div class="cards">${rs.map(cardRecipe).join('')}</div></div>`).join('');
  }
  return `<section class="view">
    <div class="vhead"><div><h2>Proposte</h2>
      <p class="lede">Ogni proposta ha un proponente, almeno un responsabile della produzione, una categoria e il link a una ricetta. Il link viene controllato e affiancato da una fonte di riferimento autorevole. <b class="num">${S.recipes.length}</b> proposte finora, obiettivo 40–50.</p></div>
      <button class="btn primary" data-act="new-recipe" ${canPropose()?'':'disabled'}>+ Proponi un piatto</button></div>
    ${!canPropose()?`<div class="note">Le proposte sono chiuse perché sono aperte le votazioni. L’organizzatore può riaprirle dalla barra delle fasi.</div>`:''}
    ${isOrg()&&pend?`<div class="note warn"><b>${pend} ${pend===1?'link da verificare':'link da verificare'}.</b> Chiedi a Claude di controllarli: verifica che il link funzioni e corrisponda al piatto, poi aggiunge una fonte autorevole (Accademia Italiana della Cucina, La Cucina Italiana, Cucchiaio d’Argento, Artusi, enti del territorio). Lo stato compare su ogni scheda.</div>`:''}
    <div class="filters">
      <div class="field wide"><label for="q">Cerca</label><input type="search" id="q" data-in="q" value="${esc(UI.q)}" placeholder="Piatto, proponente…"></div>
      <div class="field"><label for="freg">Regione</label><select id="freg" data-chg="freg"><option value="">Tutte</option>${REGIONI.map(r=>`<option ${UI.reg===r?'selected':''}>${esc(r)}</option>`).join('')}</select></div>
      <div class="field"><label for="fver">Link</label><select id="fver" data-chg="fver"><option value="">Tutti</option>${Object.keys(VSTATI).map(k=>`<option value="${k}" ${UI.ver===k?'selected':''}>${esc(VSTATI[k].label)}</option>`).join('')}</select></div>
      <label class="checkline"><input type="checkbox" id="fmine" data-chg="fmine" ${UI.mine?'checked':''}> Solo le mie</label>
    </div>
    <div class="filterchips">${chips}</div>
    ${body}</section>`;
}

A.tab=t=>{UI.tab=t.dataset.v;UI.dish=null;setHash(UI.tab);render();window.scrollTo(0,0);};
A.fcat=t=>{UI.cat=t.dataset.v;render();};
A.fclear=()=>{UI.q='';UI.cat='';UI.reg='';UI.ver='';UI.mine=false;render();};
A['del-cancel']=()=>{UI.confirm='';render();};
A['del-recipe']=async t=>{
  const id=t.dataset.id;
  if(UI.confirm!=='del:'+id){UI.confirm='del:'+id;render();return;}
  UI.confirm='';
  if(await write('delete','recipes/'+id))toast('Proposta eliminata');
  render();
};
A['open-dish']=t=>{UI.dish=t.dataset.id;UI.tab='menu';setHash('piatto-'+t.dataset.id);render();window.scrollTo(0,0);};
A.fase=async t=>{
  const v=t.dataset.v;if(S.settings.fase===v)return;
  if(await saveSettings({fase:v}))toast('Fase impostata: '+(FASI.find(f=>f[0]===v)||[])[1]);
};
IN.q=t=>{UI.q=t.value;render();};
CH.freg=t=>{UI.reg=t.value;render();};
CH.fver=t=>{UI.ver=t.value;render();};
CH.fmine=t=>{UI.mine=t.checked;render();};
