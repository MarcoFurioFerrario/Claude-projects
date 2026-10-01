/* ============ viste: votazioni e menu ============ */
function vVoto(){
  const cat=UI.vcat;
  const tabs=CATS.map(x=>{
    const done=!!myRank(x.key);
    return `<button class="fchip" aria-pressed="${x.key===cat}" data-act="vcat" data-v="${x.key}">${done?'✓ ':''}${esc(x.label)} <span class="num">${catRecipes(x.key).length}</span></button>`;
  }).join('');
  const mine=UI.vmode==='mia';
  const doneN=CATS.filter(c=>catRecipes(c.key).length&&myRank(c.key)).length,needN=CATS.filter(c=>catRecipes(c.key).length).length;
  return `<section class="view">
    <div class="vhead"><div><h2>Votazioni</h2>
      <p class="lede">Per ogni categoria ordina le proposte dalla migliore (1) alla peggiore: vince chi ha il piazzamento medio più alto. Come nell’edizione scorsa, ma con il conteggio automatico.</p></div>
      <div class="filterchips"><button class="fchip" aria-pressed="${mine}" data-act="vmode" data-v="mia">La mia classifica</button><button class="fchip" aria-pressed="${!mine}" data-act="vmode" data-v="ris">Risultati</button></div></div>
    ${S.settings.fase==='proposte'?`<div class="note">Le votazioni non sono ancora aperte: puoi già guardare le proposte. L’organizzatore le apre dalla barra delle fasi.</div>`:''}
    ${S.settings.fase==='menu'||S.settings.fase==='cucina'?`<div class="note">Le votazioni sono chiuse. Restano visibili i risultati.</div>`:''}
    <div class="filterchips">${tabs}</div>
    ${mine?`<p class="small muted">Hai ordinato <b class="num">${doneN}</b> categorie su <b class="num">${needN}</b>.</p>`+vRank(cat):vRes(cat)}
  </section>`;
}
function vRank(cat){
  const d=rankedDraft(cat),open=canVote();
  if(!d.ids.length)return `<div class="empty"><h3>Nessuna proposta in “${esc(catOf(cat).label)}”</h3><p>Quando ne arriveranno potrai ordinarle qui.</p></div>`;
  const rows=d.ids.map((id,i)=>{
    const r=R(id);const fresh=d.fresh.includes(id)&&d.saved;
    return `<li class="rk ${fresh?'fresh':''}"><div class="pos num">${i+1}</div>
      <div><div class="t">${esc(r.title)} ${fresh?badge('Nuova','warn'):''}</div>
      <div class="small muted">${r.region?esc(r.region)+' · ':''}proposta da ${esc(pname(r.proposerId))} · <a href="${esc(safeHref(r.link))}" target="_blank" rel="noopener noreferrer">ricetta ↗</a></div></div>
      <div class="row mv" style="gap:6px"><button class="btn sm ico" data-act="mv" data-id="${esc(id)}" data-d="-1" aria-label="Sposta in su" ${(!open||i===0)?'disabled':''}>▲</button>
      <button class="btn sm ico" data-act="mv" data-id="${esc(id)}" data-d="1" aria-label="Sposta in giù" ${(!open||i===d.ids.length-1)?'disabled':''}>▼</button></div></li>`;
  }).join('');
  let status;
  if(d.dirty)status=`${badge('Modifiche non salvate','warn')}`;
  else if(d.saved&&!d.fresh.length)status=badge('Classifica salvata','ok');
  else if(d.saved)status=badge('Ci sono proposte nuove da ordinare','warn');
  else status=badge('Non hai ancora votato questa categoria','muted');
  return `<ol class="rank">${rows}</ol>
    <div class="row spread" style="position:sticky;bottom:12px;background:var(--bg);padding:10px 0;border-top:1px solid var(--line)">${status}
    <button class="btn primary" data-act="save-rank" ${(!open||(!d.dirty&&d.saved&&!d.fresh.length))?'disabled':''}>${d.saved&&!d.dirty&&!d.fresh.length?'Salvata':(d.dirty||d.saved?'Salva classifica':'Conferma questo ordine')}</button></div>`;
}
function vRes(cat){
  const st=voteStats()[cat],q=quotas(totalCap())[cat]||0;
  const done=voters().length,conf=S.participants.filter(p=>p.confirmed);
  const missing=conf.filter(p=>!voters().some(v=>v.id===p.id)).map(p=>p.name);
  if(!st.length)return `<div class="empty"><h3>Nessuna proposta in questa categoria</h3></div>`;
  const rows=st.map((x,i)=>{
    const inQ=x.score!=null&&i<q;
    return `<div class="res ${i<3&&x.score!=null?'top3':''} ${inQ?'cut':''}"><div class="pos num">${i+1}</div>
      <div><div style="font-weight:600;overflow-wrap:anywhere">${esc(x.r.title)}</div><div class="small muted">${x.r.region?esc(x.r.region)+' · ':''}${esc(pname(x.r.proposerId))}${x.r.slot?' · '+badge('In menu','ok'):''}</div></div>
      <div class="bar" title="Punteggio"><i style="width:${x.score==null?0:x.score}%"></i></div>
      <div class="small num" style="text-align:right">${x.score==null?'<span class="muted">nessun voto</span>':`<b>${x.score}</b>/100<br><span class="muted">pos. media ${fmtN(x.avg,1)} · ${x.n} vot${x.n===1?'o':'i'}</span>`}</div></div>`;
  }).join('');
  return `<div class="note">Hanno votato <b class="num">${done}</b> su <b class="num">${S.participants.length}</b>.${missing.length?` Mancano i confermati: ${esc(missing.join(', '))}.`:''}
    Le righe evidenziate rientrano nella quota suggerita per “${esc(catOf(cat).label)}” (<b class="num">${q}</b> su ${totalCap()} piatti).</div>
    <div class="panel" style="padding:0;overflow:hidden">${rows}</div>
    <p class="hint">Punteggio 100 = sempre primo; 0 = sempre ultimo. Conta solo chi ha ordinato la categoria.</p>`;
}
A.vcat=t=>{UI.vcat=t.dataset.v;render();};
A.vmode=t=>{UI.vmode=t.dataset.v;render();};
A.mv=t=>{
  const cat=UI.vcat,ids=rankedDraft(cat).ids.slice(),i=ids.indexOf(t.dataset.id),j=i+num(t.dataset.d);
  if(i<0||j<0||j>=ids.length)return;
  [ids[i],ids[j]]=[ids[j],ids[i]];UI.draft[cat]=ids;render();
};
A['save-rank']=async()=>{
  const cat=UI.vcat,ids=rankedDraft(cat).ids;
  if(!S.meId)return;
  const ex=S.votes[S.meId];
  const ok=ex?await write('update','votes/'+S.meId,{rank:{[cat]:ids},updatedAt:Date.now()}):await write('set','votes/'+S.meId,{rank:{[cat]:ids},updatedAt:Date.now()});
  if(ok){delete UI.draft[cat];toast('Classifica salvata: '+catOf(cat).label);}
  render();
};

/* --- menu --- */
function dishWarn(r,slotKey){
  const out=[];
  if(!feasible(r,slotKey)){
    const e=earliest(r);
    out.push(badge(`Servono ${leadText(lead(r))} di anticipo`,'bad')+' '+(e?`<span class="small">Primo pasto possibile: <b>${esc(e.label)}</b></span>`:`<span class="small">Non c’è un pasto utile: va preparato a casa.</span>`));
  }
  if(!(r.ingredients||[]).length)out.push(badge('Mancano gli ingredienti','warn'));
  return out.length?`<div class="row" style="gap:6px;margin-top:4px">${out.join('')}</div>`:'';
}
function dishRow(r,slotKey){
  const org=isOrg();
  return `<div class="dish"><div><button class="nm" data-act="open-dish" data-id="${esc(r.id)}">${esc(r.title)}</button>
    <div class="small muted">${chipCat(r.category)} ${esc((r.ownerIds||[]).map(pname).join(', '))}</div>${dishWarn(r,slotKey)}</div>
    ${org?`<select aria-label="Sposta ${esc(r.title)}" data-chg="setslot" data-id="${esc(r.id)}"><option value="">Togli dal menu</option>${SLOTS.map(s=>`<option value="${s.key}" ${s.key===slotKey?'selected':''}>${s.label}</option>`).join('')}</select>`:''}</div>`;
}
function vMenu(){
  const org=isOrg(),capv=S.settings.cap,sl=slotted();
  const days=DAYS.map(d=>{
    const rs=sl.filter(r=>slotDay(r.slot)===d.key),cap=num(capv[d.key]),over=rs.length>cap;
    const mix={};rs.forEach(r=>mix[r.category]=(mix[r.category]||0)+1);
    const slots=SLOTS.filter(s=>s.day===d.key).map(s=>{
      const list=rs.filter(r=>r.slot===s.key).sort((a,b)=>catIdx(a.category)-catIdx(b.category)||byTitle(a,b));
      return `<div class="slot"><h4>${s.label}</h4>${list.map(r=>dishRow(r,s.key)).join('')||'<p class="small muted">Nessun piatto assegnato.</p>'}</div>`;
    }).join('');
    return `<section class="day ${over?'over':''}"><header><h3>${d.label}</h3><span class="num"><b>${rs.length}</b> / ${cap}${over?' · troppi':''}</span></header>
      <div class="slot"><div class="capbar"><i style="width:${cap?Math.min(100,rs.length/cap*100):0}%"></i></div>
      <div class="mix">${CATS.filter(c=>mix[c.key]).map(c=>`<span class="chip" style="--h:${c.h}">${esc(c.label)} ${mix[c.key]}</span>`).join('')||'<span class="small muted">Nessun piatto</span>'}</div></div>
      ${slots}</section>`;
  }).join('');
  const st=voteStats(),cand=CATS.map(c=>[c,st[c.key].filter(x=>!x.r.slot)]).filter(g=>g[1].length);
  const candHtml=cand.length?cand.map(([c,xs])=>`<div><h3 class="grp">${esc(c.label)} <span class="muted small num">${xs.length}</span></h3>
    <div class="panel" style="padding:0;overflow:hidden">${xs.map(x=>`<div class="cand"><div><div style="font-weight:600;overflow-wrap:anywhere">${esc(x.r.title)}</div>
      <div class="small muted">${x.r.region?esc(x.r.region)+' · ':''}proposta da ${esc(pname(x.r.proposerId))}</div></div>
      <div class="small num muted" style="text-align:right">${x.score==null?'nessun voto':`punteggio <b style="color:var(--ink)">${x.score}</b> · ${x.n} vot${x.n===1?'o':'i'}`}</div>
      ${org?`<select aria-label="Assegna ${esc(x.r.title)}" data-chg="setslot" data-id="${esc(x.r.id)}"><option value="">Non in menu</option>${SLOTS.map(s=>`<option value="${s.key}">${s.label}</option>`).join('')}</select>`:'<span></span>'}</div>`).join('')}</div></div>`).join('')
    :`<div class="empty"><p>Nessun altro candidato.</p></div>`;
  const noIng=sl.filter(r=>!(r.ingredients||[]).length).length;
  return `<section class="view">
    <div class="vhead"><div><h2>Menu</h2>
      <p class="lede">Selezione finale: ${num(capv.ven)} piatti per venerdì sera, ${num(capv.sab)} per sabato, ${num(capv.dom)} per domenica. Tocca un piatto per aprire la sua scheda con squadra, ingredienti e tempi.</p></div>
      ${org?`<div class="row">${UI.sugg
        ?`<span class="small">Sostituisce la selezione attuale.</span><button class="btn primary sm" data-act="suggest-go">Applica suggerimento</button><button class="btn sm" data-act="suggest-cancel">Annulla</button>`
        :`<button class="btn" data-act="suggest">Suggerisci dai voti</button><button class="btn" data-act="clear-menu" ${sl.length?'':'disabled'}>Svuota</button>`}</div>`:''}</div>
    ${!org?`<div class="note">Solo gli organizzatori assegnano i piatti ai pasti. Qui puoi vedere il menu e aprire le schede.</div>`:''}
    ${noIng?`<div class="note warn"><b>${noIng}</b> piatt${noIng===1?'o':'i'} del menu senza ingredienti: la lista della spesa è incompleta finché i responsabili non compilano le schede.</div>`:''}
    <div class="days">${days}</div>
    <h3>Candidati</h3>${candHtml}</section>`;
}
A.suggest=()=>{
  if(!S.recipes.length){toast('Nessuna proposta da selezionare.','err');return;}
  if(!Object.keys(S.votes).length){toast('Nessun voto ancora: non c’è nulla da suggerire.','err');return;}
  UI.sugg=true;render();
};
A['suggest-cancel']=()=>{UI.sugg=false;render();};
A['suggest-go']=async()=>{
  UI.sugg=false;
  await makeBackup('prima del menu suggerito',true);
  const plan=suggest();let ok=true;
  for(const r of S.recipes){
    const want=plan[r.id]||'';
    if((r.slot||'')!==want){ok=await write('update','recipes/'+r.id,{slot:want})&&ok;}
  }
  if(ok)toast('Menu suggerito applicato. Controlla gli avvisi sui tempi.');
  render();
};
A['clear-menu']=async()=>{
  await makeBackup('prima di svuotare il menu',true);
  for(const r of slotted())await write('update','recipes/'+r.id,{slot:''});
  toast('Selezione svuotata');
};
CH.setslot=async t=>{
  const id=t.dataset.id,v=t.value;
  if(await write('update','recipes/'+id,{slot:v})){const r=R(id);if(v&&r&&!feasible(r,v))toast('Attenzione: i tempi di preparazione non stanno in questo pasto.','err');}
};
