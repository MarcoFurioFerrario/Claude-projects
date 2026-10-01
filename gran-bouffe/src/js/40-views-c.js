/* ============ viste: scheda piatto, spesa, programma, persone ============ */
function absLabel(t){
  const idx=Math.floor(t/24+1e-9);
  return `${dayLabel(idx)} ${fmtT(t-idx*24)}`;
}
function vPiatto(){
  const r=R(UI.dish);
  const back=`<button class="btn sm" data-act="tab" data-v="menu">← Torna al menu</button>`;
  if(!r)return `<section class="view">${back}<div class="empty"><h3>Piatto non trovato</h3><p>Potrebbe essere stato eliminato.</p></div></section>`;
  const f=scaleF(r),n=nConf(),por=PORZ[r.porzione]||PORZ.normale;
  const owners=(r.ownerIds||[]),team=(r.teamIds||[]).filter(id=>!owners.includes(id));
  const mine=S.meId&&(owners.includes(S.meId)||team.includes(S.meId));
  const ings=(r.ingredients||[]).map(i=>{
    const u=normUnit(i.unit),q=num(i.qty);
    const txt=(u.base==='qb'||!q)?'q.b.':fmtQty(u.base,niceQty(u.base,q*u.mult*f));
    return `<tr><td>${esc(cap1(i.name))}${i.note?` <span class="small muted">${esc(i.note)}</span>`:''}</td><td>${esc(txt)}</td></tr>`;
  }).join('');
  const vini=(r.vini||[]).map(v=>`<li><b>${esc(v.nome)}</b> <span class="muted small">· ${fmtN(roundUp('bottiglie',num(v.bottiglie)*f))} bottigli${roundUp('bottiglie',num(v.bottiglie)*f)===1?'a':'e'} per ${n} persone</span></li>`).join('');
  const fasi=[...(r.fasi||[])].sort((a,b)=>num(b.ore)-num(a.ore));
  const ld=lead(r),e=earliest(r);
  let verdict='';
  if(r.slot){
    verdict=feasible(r,r.slot)
      ?`<div class="note ok">I tempi stanno nel pasto scelto (${esc(slotLabel(r.slot))}).${r.preparabileACasa?' Il piatto si prepara a casa prima di partire.':''}</div>`
      :`<div class="note bad"><b>Non sta nei tempi di ${esc(slotLabel(r.slot))}.</b> Servono ${esc(leadText(ld))} di anticipo, più di quanto resta dall’arrivo.${e?` Il primo pasto possibile è ${esc(e.label)}.`:''} Se la parte lunga si fa a casa prima di partire, spunta “si prepara a casa” nella scheda.
        ${isOrg()&&e?`<div style="margin-top:8px"><button class="btn sm" data-act="move-slot" data-id="${esc(r.id)}" data-v="${e.key}">Sposta a ${esc(e.label)}</button></div>`:''}</div>`;
  }else if(ld>0){
    verdict=`<div class="note">${r.preparabileACasa?'Pensato per essere preparato a casa e portato.':`Servono ${esc(leadText(ld))} di anticipo: ${e?`il primo pasto possibile è <b>${esc(e.label)}</b>.`:'non c’è un pasto utile dopo l’arrivo, va preparato a casa.'}`}</div>`;
  }
  const hasFasi=fasi.length?fasi.map(x=>{
    const when=r.slot?absLabel(slotAbs(r.slot)-num(x.ore)):'−'+leadText(num(x.ore));
    return `<div class="phase"><div class="h">${esc(when)}</div><div>${esc(x.label)}${r.slot?` <span class="small muted">(−${esc(leadText(num(x.ore))||'0')})</span>`:''}</div></div>`;
  }).join(''):`<p class="muted small">Nessuna fase inserita. Aggiungi i passaggi che richiedono anticipo (ammollo, riposo, marinatura) per avere il cronoprogramma.</p>`;
  const empty=!(r.ingredients||[]).length&&!(r.steps||[]).length;
  return `<section class="view">
    <div>${back}</div>
    <div class="hero"><div class="row" style="gap:6px">${chipCat(r.category)}${r.region?`<span class="chip plain">${esc(r.region)}</span>`:''}${r.slot?badge(slotLabel(r.slot),'ok'):badge('Non ancora in menu','muted')}</div>
      <h2>${esc(r.title)}</h2>
      <div class="row"><span class="muted">Proposto da <b style="color:var(--ink)">${esc(pname(r.proposerId))}</b></span>
      ${canEditRecipe(r)?`<button class="btn sm primary" data-act="edit-dish" data-id="${esc(r.id)}">Compila / modifica scheda</button><button class="btn sm" data-act="edit-recipe" data-id="${esc(r.id)}">Dati della proposta</button>`:''}</div></div>
    ${verdict}
    <div class="cols">
      <div style="display:flex;flex-direction:column;gap:16px;min-width:0">
        <div class="panel"><h3>Squadra di preparazione</h3>
          <div class="people" style="margin-top:10px">${owners.map(id=>`<span class="pill own" title="Responsabile della produzione">${esc(pname(id))}</span>`).join('')}${team.map(id=>`<span class="pill">${esc(pname(id))}</span>`).join('')}</div>
          <p class="hint" style="margin-top:8px">In rosa i responsabili della produzione, in grigio chi li aiuta.</p>
          ${S.meId&&!owners.includes(S.meId)?`<div style="margin-top:10px"><button class="btn sm" data-act="join" data-id="${esc(r.id)}">${mine?'Esci dalla squadra':'Mi unisco alla squadra'}</button></div>`:''}</div>
        <div class="panel"><h3>Ricetta di riferimento</h3><div style="margin-top:10px">${srcBlock(r)}</div>
          <div style="margin-top:8px">${badge((VSTATI[vstato(r)]||VSTATI.da_verificare).label,(VSTATI[vstato(r)]||VSTATI.da_verificare).cls)}</div></div>
        <div class="panel"><h3>Vini in abbinamento</h3>${vini?`<ul class="steps" style="margin-top:10px;padding-left:18px">${vini}</ul>`:`<p class="muted small" style="margin-top:8px">Nessun vino indicato.</p>`}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:16px;min-width:0">
        <div class="panel"><div class="row spread"><h3>Ingredienti</h3><span class="small muted">per <b class="num">${n}</b> persone · porzione ${esc(por.label.toLowerCase())}</span></div>
          ${ings?`<table class="ing" style="margin-top:8px"><tbody>${ings}</tbody></table><p class="hint" style="margin-top:8px">Ricetta base per ${fmtN(num(r.serves)||4,0)} persone, scalata sui confermati. Le quantità si aggiornano da sole se cambia il numero dei partecipanti.</p>`
            :`<div class="empty" style="margin-top:10px"><p>Ingredienti non ancora inseriti.</p>${canEditRecipe(r)?`<button class="btn primary sm" data-act="edit-dish" data-id="${esc(r.id)}">Compila la scheda</button>`:'<p class="small">Li inseriscono i responsabili del piatto.</p>'}</div>`}</div>
        <div class="panel"><h3>Procedimento</h3>${(r.steps||[]).length?`<ol class="steps" style="margin-top:10px">${r.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol>`:`<p class="muted small" style="margin-top:8px">${empty?'Il procedimento sarà inserito insieme agli ingredienti.':'Nessun passaggio inserito.'}</p>`}
          <p class="hint" style="margin-top:8px">Per dosi e dettagli fa fede la ricetta di riferimento.</p></div>
        <div class="panel"><h3>Tempi e consigli</h3><div style="margin-top:8px">${hasFasi}</div>
          ${r.consigli?`<p style="margin-top:10px">${esc(r.consigli)}</p>`:''}</div>
      </div></div></section>`;
}
A['move-slot']=async t=>{if(await write('update','recipes/'+t.dataset.id,{slot:t.dataset.v}))toast('Piatto spostato');};
A.join=async t=>{
  const r=R(t.dataset.id);if(!r||!S.meId)return;
  const set=new Set(r.teamIds||[]);
  if(set.has(S.meId))set.delete(S.meId);else set.add(S.meId);
  if(await write('update','recipes/'+r.id,{teamIds:[...set]}))toast(set.has(S.meId)?'Sei nella squadra di '+r.title:'Sei uscito dalla squadra');
};

/* --- spesa --- */
async function upSpesa(id,patch){
  const ex=S.spesa[id];
  return ex?write('update','spesa/'+id,patch):write('set','spesa/'+id,patch);
}
function vSpesa(){
  const sl=slotted();
  if(!sl.length)return `<section class="view"><div class="vhead"><div><h2>Spesa</h2></div></div>
    <div class="empty"><h3>Il menu non è ancora definito</h3><p>Quando i piatti sono assegnati ai pasti, qui compare la lista unica della spesa, già sommata e calcolata sul numero di confermati.</p>
    <button class="btn" data-act="tab" data-v="menu">Vai al menu</button></div></section>`;
  const all=consolidate(UI.sday),n=nConf();
  const noIng=sl.filter(r=>!(r.ingredients||[]).length);
  const boughtN=all.filter(l=>l.sp.comprato).length;
  let ls=all;
  if(UI.sshop)ls=ls.filter(l=>l.shop===UI.sshop);
  if(UI.shide)ls=ls.filter(l=>!l.sp.comprato);
  const people=[...S.participants].sort((a,b)=>(b.confirmed?1:0)-(a.confirmed?1:0)||a.name.localeCompare(b.name,'it'));
  const groups=SHOPS.map(s=>[s,ls.filter(l=>l.shop===s.key)]).filter(g=>g[1].length).map(([s,g])=>`<section class="shop"><h3>${esc(s.label)} <span class="small muted num">${g.filter(l=>l.sp.comprato).length}/${g.length}</span></h3>
    ${g.map(L=>`<div class="ln ${L.sp.comprato?'done':''}">
      <input type="checkbox" id="b-${esc(L.id)}" data-chg="bought" data-id="${esc(L.id)}" ${L.sp.comprato?'checked':''} aria-label="Comprato: ${esc(L.name)}">
      <div><label for="b-${esc(L.id)}" class="nm">${esc(L.name)}</label><div class="use">${usesText(L)}</div></div>
      <div class="q">${esc(L.text)}${L.packs?`<small>${L.packs} conf. da ${esc(fmtQty(L.sp.pack.base,L.sp.pack.size))}</small>`:''}</div>
      <div class="ext"><select data-chg="who" data-id="${esc(L.id)}" aria-label="Chi compra ${esc(L.name)}"><option value="">Chi compra?</option>${people.map(p=>`<option value="${esc(p.id)}" ${L.sp.chi===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}</select>
      ${L.parts.length?`<button class="btn sm" data-act="pack" data-id="${esc(L.id)}">${L.sp.pack?'Cambia formato':'Formato confezione'}</button>`:''}</div></div>`).join('')}</section>`).join('');
  return `<section class="view">
    <div class="vhead"><div><h2>Spesa</h2><p class="lede">Lista unica: le quantità dei singoli piatti sono sommate e scalate sul numero di confermati. Le dosi sono arrotondate per eccesso, così si compra una volta sola.</p></div>
      <div class="row"><button class="btn" data-act="copy-spesa">Copia per WhatsApp</button>${dlCap?`<button class="btn" data-act="csv-spesa">Scarica CSV</button>`:''}</div></div>
    <div class="panel totals"><div><div class="big num">${n}</div><div class="small muted">persone confermate</div></div>
      <div><div class="big num">${sl.length}</div><div class="small muted">piatti in menu</div></div>
      <div><div class="big num">${all.length}</div><div class="small muted">voci da comprare</div></div>
      <div><div class="big num">${boughtN}/${all.length}</div><div class="small muted">già comprate</div></div></div>
    ${noIng.length?`<div class="note warn"><b>Lista incompleta:</b> mancano gli ingredienti di ${noIng.length} piatt${noIng.length===1?'o':'i'} (${esc(noIng.slice(0,5).map(r=>r.title).join(', '))}${noIng.length>5?'…':''}). I responsabili li inseriscono dalla scheda del piatto.</div>`:''}
    ${n===0?`<div class="note bad">Non ci sono partecipanti confermati: le quantità risultano zero. Conferma le persone nella sezione Persone.</div>`:''}
    <div class="filters" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">
      <div class="field"><label for="sday">Giorno</label><select id="sday" data-chg="sday"><option value="">Tutto il weekend</option>${DAYS.map(d=>`<option value="${d.key}" ${UI.sday===d.key?'selected':''}>${d.label}</option>`).join('')}</select></div>
      <div class="field"><label for="sshop">Negozio</label><select id="sshop" data-chg="sshop"><option value="">Tutti</option>${SHOPS.map(s=>`<option value="${s.key}" ${UI.sshop===s.key?'selected':''}>${esc(s.label)}</option>`).join('')}</select></div>
      <label class="checkline"><input type="checkbox" id="shide" data-chg="shide" ${UI.shide?'checked':''}> Nascondi già comprati</label></div>
    ${groups||`<div class="empty"><p>${all.length?'Hai comprato tutto, con questi filtri.':'Nessuna voce: i piatti in menu non hanno ancora ingredienti.'}</p></div>`}
  </section>`;
}
CH.sday=t=>{UI.sday=t.value;render();};
CH.sshop=t=>{UI.sshop=t.value;render();};
CH.shide=t=>{UI.shide=t.checked;render();};
CH.bought=async t=>{await upSpesa(t.dataset.id,{comprato:t.checked,quando:Date.now()});};
CH.who=async t=>{await upSpesa(t.dataset.id,{chi:t.value});};
A['copy-spesa']=()=>copyText(groceryText(UI.sday),'Lista copiata: incollala su WhatsApp');
A['csv-spesa']=async()=>{
  const ls=consolidate(UI.sday),q=v=>'"'+String(v).replace(/"/g,'""')+'"';
  const rows=[['Negozio','Prodotto','Quantità','Confezioni','Chi compra','Comprato','Usato in']];
  for(const s of SHOPS)for(const l of ls.filter(x=>x.shop===s.key))
    rows.push([s.label,l.name,l.text,l.packs?`${l.packs} da ${fmtQty(l.sp.pack.base,l.sp.pack.size)}`:'',P(l.sp.chi)?P(l.sp.chi).name:'',l.sp.comprato?'sì':'no',l.uses.map(u=>u.r.title).join(' · ')]);
  const csv='﻿'+rows.map(r=>r.map(q).join(';')).join('\r\n');
  try{await dlCap.save({filename:'lista-spesa-gran-bouffe.csv',data:csv});}catch(e){if(!e||e.code!=='declined')toast('Download non disponibile in questa vista.','err');}
};
A.pack=t=>{
  const id=t.dataset.id,L=consolidate('').find(x=>x.id===id);if(!L)return;
  const cur=(S.spesa[id]||{}).pack||{};
  const bases=L.parts.map(p=>p.base);
  openModal(`<header><div><h3>Formato confezione</h3><p class="hint">${esc(L.name)}: servono ${esc(L.text)}.</p></div><button class="btn sm" data-act="modal-close">Chiudi</button></header>
    <div class="formgrid"><div class="field"><label for="pk-size">Quanto contiene una confezione</label><input type="number" id="pk-size" min="0" step="any" value="${cur.size||''}" placeholder="es. 500"></div>
    <div class="field"><label for="pk-base">Unità</label><select id="pk-base">${bases.map(b=>`<option value="${esc(b)}" ${cur.base===b?'selected':''}>${b==='g'?'grammi (g)':b==='ml'?'millilitri (ml)':esc(b)}</option>`).join('')}</select></div></div>
    <p class="hint">Indica il formato in grammi o millilitri: la lista calcolerà quante confezioni comprare.</p>
    <div class="foot">${cur.size?`<button class="btn danger" data-act="pack-clear" data-id="${esc(id)}">Rimuovi formato</button>`:''}<button class="btn primary" data-act="pack-save" data-id="${esc(id)}">Salva</button></div>`);
};
A['pack-save']=async t=>{
  const size=num($('#pk-size').value),base=$('#pk-base').value;
  if(size<=0){toast('Inserisci un formato maggiore di zero.','err');return;}
  if(await upSpesa(t.dataset.id,{pack:{base,size}})){closeModal();}
};
A['pack-clear']=async t=>{if(await upSpesa(t.dataset.id,{pack:{base:'',size:0}}))closeModal();};

/* --- programma --- */
function vProgramma(){
  const sl=slotted();
  if(!sl.length)return `<section class="view"><div class="vhead"><div><h2>Programma</h2></div></div>
    <div class="empty"><h3>Nessun piatto in menu</h3><p>Il cronoprogramma si costruisce dalle fasi inserite nelle schede dei piatti selezionati.</p><button class="btn" data-act="tab" data-v="menu">Vai al menu</button></div></section>`;
  const bad=sl.filter(r=>!feasible(r,r.slot)),nofasi=sl.filter(r=>!(r.fasi||[]).length),home=sl.filter(r=>r.preparabileACasa);
  const longs=sl.filter(r=>lead(r)>=12&&feasible(r,r.slot));
  const win=SLOTS.map(s=>`<tr><td>${esc(s.label)}</td><td class="num" style="text-align:right"><b>${fmtN(Math.max(0,slotOffset(s.key)),1)} h</b> utili dall’arrivo</td></tr>`).join('');
  const items=timeline();
  let curDay=null,tl='';
  for(const it of items){
    const di=Math.floor(it.t/24+1e-9);
    if(di!==curDay){curDay=di;tl+=`<div class="tlday">${esc(dayLabel(di))}</div>`;}
    const who=it.r?(it.r.ownerIds||[]).map(pname).join(', '):'';
    tl+=`<div class="ti ${it.kind}"><div class="tm">${fmtT(it.t-di*24)}</div><div class="dot"></div><div class="what">${it.kind==='meal'?esc(it.what):`${esc(it.what)} — <button class="link" data-act="open-dish" data-id="${esc(it.r.id)}">${esc(it.r.title)}</button> ${it.kind==='pre'?badge('prima della partenza','warn'):''}<div class="small muted">${esc(who)}</div>`}</div></div>`;
  }
  const tips=[];
  bad.forEach(r=>{const e=earliest(r);tips.push(`<li><b>${esc(r.title)}</b> è su ${esc(slotLabel(r.slot))} ma richiede ${esc(leadText(lead(r)))} di anticipo. ${e?`Primo pasto possibile: ${esc(e.label)}. ${isOrg()?`<button class="btn sm" data-act="move-slot" data-id="${esc(r.id)}" data-v="${e.key}">Sposta</button>`:''}`:'Preparalo a casa e portalo già pronto.'}</li>`);});
  longs.forEach(r=>tips.push(`<li><b>${esc(r.title)}</b>: ${esc(leadText(lead(r)))} di anticipo. Va avviato presto: controlla il cronoprogramma qui sotto.</li>`));
  if(nofasi.length)tips.push(`<li>Senza fasi né tempi: ${esc(nofasi.map(r=>r.title).join(', '))}. Aggiungili nelle schede per completare il programma.</li>`);
  if(home.length)tips.push(`<li>Da preparare a casa e portare: ${esc(home.map(r=>r.title).join(', '))}.</li>`);
  return `<section class="view">
    <div class="vhead"><div><h2>Programma</h2><p class="lede">Un piatto con lunghe attese (un brodo che riposa 24 ore, un ammollo, una marinatura) non può stare in un pasto troppo vicino all’arrivo. Qui sotto i tempi utili e, per ogni fase, quando va avviata.</p></div>
      ${isOrg()?`<button class="btn" data-act="edit-settings">Orari e arrivo</button>`:''}</div>
    <div class="cols"><div class="panel"><h3>Tempo utile per pasto</h3><table class="ing" style="margin-top:8px"><tbody>${win}</tbody></table>
      <p class="hint" style="margin-top:8px">Arrivo ${esc(S.settings.arrivo)}, meno ${fmtN(num(S.settings.riservaOre),1)} h per scaricare la spesa e sistemarsi.</p></div>
    <div class="panel"><h3>Consigli</h3>${tips.length?`<ul class="steps" style="margin-top:10px;padding-left:18px">${tips.join('')}</ul>`:`<p class="muted" style="margin-top:8px">Tutto sta nei tempi.</p>`}</div></div>
    <div class="panel"><h3>Cronoprogramma</h3><div class="tl" style="margin-top:8px">${tl}</div></div></section>`;
}

/* --- persone --- */
function vPersone(){
  const org=isOrg(),st=S.settings,ps=sortedPeople();
  const people=ps.map(p=>{
    const own=S.recipes.filter(r=>r.proposerId===p.id||(r.ownerIds||[]).includes(p.id)).length;
    const cr=UI.confirm==='rm:'+p.id;
    return `<div class="person ${p.confirmed?'':'off'}"><div style="min-width:0"><div class="nm">${esc(p.name)}</div>
      <div class="small muted">${p.organizer?'organizzatore · ':''}${S.votes[p.id]?'ha votato':'non ha votato'}${own?' · '+own+' piatt'+(own===1?'o':'i'):''}</div></div>
      <div class="row" style="gap:8px;flex-wrap:nowrap"><label class="switch"><input type="checkbox" data-chg="confirm" data-id="${esc(p.id)}" ${p.confirmed?'checked':''} ${S.readOnly?'disabled':''}> Presente</label>
      ${org?(cr?`<button class="btn sm danger" data-act="rm-person" data-id="${esc(p.id)}">Conferma</button><button class="btn sm" data-act="del-cancel">No</button>`
        :`<button class="btn sm ico" data-act="rm-person" data-id="${esc(p.id)}" aria-label="Rimuovi ${esc(p.name)}">✕</button>`):''}</div></div>`;
  }).join('');
  const orgs=org?`<div class="panel"><h3>Organizzatori</h3><p class="hint" style="margin:6px 0 10px">Gli organizzatori cambiano fase, assegnano i piatti ai pasti e modificano orari e arrivo.</p>
    <div class="people">${ps.map(p=>`<label class="pill" style="cursor:pointer"><input type="checkbox" data-chg="orgflag" data-id="${esc(p.id)}" ${p.organizer?'checked':''}> ${esc(p.name)}</label>`).join('')}</div></div>`:'';
  return `<section class="view">
    <div class="vhead"><div><h2>Persone</h2><p class="lede">La lista della spesa si calcola sui <b>confermati</b>. Spunta chi c’è e aggiungi chi manca.</p></div></div>
    <div class="panel totals"><div><div class="big num">${nConf()}</div><div class="small muted">confermati</div></div><div><div class="big num">${S.participants.length-nConf()}</div><div class="small muted">da confermare</div></div></div>
    <div class="people-list">${people||'<div class="empty"><p>Nessun partecipante.</p></div>'}</div>
    <form data-sub="addperson" class="panel" style="display:flex;flex-direction:column;gap:10px"><h4>Aggiungi un partecipante</h4>
      <div class="row"><input type="text" id="np" placeholder="Nome" autocomplete="off" style="flex:1;min-width:160px"><label class="checkline"><input type="checkbox" id="npc"> Confermato</label>
      <button class="btn primary" type="submit">Aggiungi</button></div><p class="err" id="nperr" hidden></p></form>
    ${orgs}
    ${vBackup()}
    <div class="panel"><div class="row spread"><h3>Il weekend</h3>${org?`<button class="btn sm" data-act="edit-settings">Modifica</button>`:''}</div>
      <dl class="kv" style="margin-top:10px"><dt>Data del venerdì</dt><dd>${st.dataVen?esc(dayLabel(0)):'<span class="muted">da definire</span>'}</dd>
      <dt>Arrivo</dt><dd>venerdì alle ${esc(st.arrivo)}</dd>
      ${SLOTS.map(s=>`<dt>${esc(s.label)}</dt><dd>${esc(st.orari[s.key])}</dd>`).join('')}
      <dt>Piatti</dt><dd>${num(st.cap.ven)} venerdì · ${num(st.cap.sab)} sabato · ${num(st.cap.dom)} domenica</dd>
      <dt>Margine spesa</dt><dd>${fmtN(num(st.margine),0)}%</dd></dl></div>
  </section>`;
}
CH.confirm=async t=>{await write('update','participants/'+t.dataset.id,{confirmed:t.checked});};
CH.orgflag=async t=>{
  const orgCount=S.participants.filter(p=>p.organizer).length;
  if(!t.checked&&orgCount<=1&&!S.owner){toast('Serve almeno un organizzatore.','err');render();return;}
  await write('update','participants/'+t.dataset.id,{organizer:t.checked});
};
A['rm-person']=async t=>{
  const id=t.dataset.id;
  if(UI.confirm!=='rm:'+id){
    const used=S.recipes.filter(r=>r.proposerId===id||(r.ownerIds||[]).includes(id)).length;
    if(used){toast(`${pname(id)} è proponente o responsabile di ${used} piatti: riassegnali prima di rimuoverlo.`,'err');return;}
    UI.confirm='rm:'+id;render();return;
  }
  UI.confirm='';
  await makeBackup('prima di rimuovere un partecipante',true);
  if(await write('delete','participants/'+id)){toast('Partecipante rimosso');if(id===S.meId)doLogout();}
  render();
};
