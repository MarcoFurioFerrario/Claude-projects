/* ============ viste: votazioni e menu ============ */
function vVoto(){
  const cat=UI.vcat,sg=stage();
  const tabs=CATS.map(x=>{
    const done=!!myRank(x.key);
    return `<button class="fchip" aria-pressed="${x.key===cat}" data-act="vcat" data-v="${x.key}">${done?'✓ ':''}${esc(x.label)} <span class="num">${catRecipes(x.key).length}</span></button>`;
  }).join('');
  const mine=UI.vmode==='mia';
  const doneN=CATS.filter(c=>catRecipes(c.key).length&&myRank(c.key)).length,needN=CATS.filter(c=>catRecipes(c.key).length).length;
  return `<section class="view">
    <div class="vhead"><div><h2>Votazioni</h2>
      <p class="lede">Per ogni portata assegna le tue prime posizioni: scegli il numero accanto a ogni piatto oppure trascinalo nel suo posto. I piatti che non metti in classifica restano fuori (0 punti). A parità di punti vince chi ha più primi posti, poi più secondi posti e così via.</p></div>
      <div class="filterchips"><button class="fchip" aria-pressed="${mine}" data-act="vmode" data-v="mia">La mia classifica</button><button class="fchip" aria-pressed="${!mine}" data-act="vmode" data-v="ris">Risultati</button></div></div>
    ${sg==='proposte'||sg==='attesa'?`<div class="note"><b>Il voto sui piatti non è ancora aperto.</b> ${scadOn()?`Si apre ${esc(fmtDT(scadMs('votoIni')))} e dura fino a ${esc(fmtEnd(scadMs('votoFine')))}.`:'Lo apre l’organizzatore dalla barra delle fasi.'} Intanto puoi guardare le proposte e votare il formato del menu (banda in alto).</div>`:''}
    ${sg==='voto'&&scadOn()?`<div class="note ok">Votazione aperta fino a ${esc(fmtEnd(scadMs('votoFine')))}.</div>`:''}
    ${sg==='menu'||sg==='cucina'?`<div class="note">Le votazioni sono chiuse. Restano visibili i risultati.</div>`:''}
    <div class="filterchips">${tabs}</div>
    ${mine?`<p class="small muted">Hai ordinato <b class="num">${doneN}</b> categorie su <b class="num">${needN}</b>.</p>`+vRank(cat):vRes(cat)}
  </section>`;
}
function vRank(cat){
  const d=rankedDraft(cat),open=canVote(),n=d.n;
  if(!n)return `<div class="empty"><h3>Nessuna proposta in “${esc(catOf(cat).label)}”</h3><p>Quando ne arriveranno potrai ordinarle qui.</p></div>`;
  const opts=cur=>`<option value="0" ${!cur?'selected':''}>${cur?'Fuori classifica':'Posizione…'}</option>`+Array.from({length:n},(_,i)=>`<option value="${i+1}" ${cur===i+1?'selected':''}>${i+1}° posto · ${rankPts(cat,i+1)} punti</option>`).join('');
  const row=(id,pos)=>{
    const r=R(id),fresh=d.fresh.includes(id);
    return `<div class="dr" data-dish="${esc(id)}"><button type="button" class="grip" data-grip="${esc(id)}" aria-label="Trascina «${esc(r.title)}»" title="Trascina" ${open?'':'disabled'}>⠿</button>
      <div class="dt"><div class="t">${esc(r.title)} ${fresh?badge('Nuova','warn'):''}</div>
      <div class="small muted">${r.region?esc(r.region)+' · ':''}proposta da ${esc(pname(r.proposerId))} · <a href="${esc(safeHref(r.link))}" target="_blank" rel="noopener noreferrer">ricetta ↗</a></div></div>
      ${fotoThumb(r)}
      <label class="pp"><span class="sr">Posizione di ${esc(r.title)}</span><select id="rk-${esc(id)}" data-chg="rkpos" data-id="${esc(id)}" ${open?'':'disabled'}>${opts(pos)}</select></label></div>`;
  };
  const slots=d.slots.map((id,i)=>`<li class="rkslot ${id?'on':''}" data-slot="${i}"><div class="pos num">${i+1}</div>${id?row(id,i+1):`<div class="rkempty">${open?'Trascina qui un piatto o sceglilo dall’elenco sotto':'Posizione libera'}</div>`}</li>`).join('');
  const pool=d.pool.map(r=>`<li>${row(r.id,0)}</li>`).join('');
  let status;
  if(d.dirty)status=badge('Modifiche non salvate','warn');
  else if(d.saved&&d.stale)status=badge('Classifica da aggiornare','warn');
  else if(d.saved&&d.fresh.length)status=badge('Ci sono proposte nuove: decidi se metterle in classifica','warn');
  else if(d.saved)status=badge('Classifica salvata','ok');
  else status=badge('Non hai ancora votato questa portata','muted');
  const hints=[];
  if(d.filled&&d.filled<n)hints.push(`Hai compilato ${d.filled} ${d.filled===1?'posizione':'posizioni'} su ${n}: più posizioni compili, meno pareggi.`);
  if(d.gaps)hints.push('Ci sono posizioni vuote: salvando, quelle sotto salgono a chiuderle.');
  if(d.stale&&!d.dirty){const u=d.stale===1;hints.push(`Nella classifica salvata ${u?'c’era 1 piatto che non c’è più':'c’erano '+d.stale+' piatti che non ci sono più'} in questa portata (eliminat${u?'o':'i'} o spostat${u?'o':'i'} in un’altra): ${u?'non conta':'non contano'} e i piatti sotto sono saliti di posto. Salva per aggiornare il voto.`);}
  const canSave=open&&d.filled>0&&(d.dirty||!d.saved||d.stale>0);
  return `<div class="rankbox rank">
    <p class="small muted rkinfo">In “${esc(catOf(cat).label)}” classifichi fino a <b class="num">${n}</b> piatti: 1° posto = <b class="num">${rankPts(cat,1)}</b> punti, ${n}° = <b class="num">${rankPts(cat,n)}</b>; fuori classifica 0. Se scegli una posizione già occupata, il piatto che c’era scende alla prima posizione libera sotto, oppure esce.</p>
    <ol class="rkslots" aria-label="La tua classifica">${slots}</ol>
    <div class="pool" data-drop="pool"><h4>Fuori classifica <span class="num muted">${d.pool.length}</span></h4>
      ${d.pool.length?`<ul class="poolist">${pool}</ul>`:'<p class="small muted">Hai messo in classifica tutte le proposte.</p>'}</div>
    ${hints.length?`<p class="small muted">${hints.join(' ')}</p>`:''}
    <div class="row spread" style="position:sticky;bottom:12px;background:var(--bg);padding:10px 0;border-top:1px solid var(--line)">${status}
    <button class="btn primary" data-act="save-rank" ${canSave?'':'disabled'}>${d.saved&&!d.dirty&&!d.stale?'Salvata':(d.dirty||d.saved?'Salva classifica':'Conferma questa classifica')}</button></div></div>`;
}
function vRes(cat){
  const stAll=voteStats()[cat],libero=!!fmtNow().libero,extra=cat==='contorni',q=(libero||extra)?0:(quotas(totalCap())[cat]||0);
  const done=voters().length,conf=S.participants.filter(p=>p.confirmed);
  const missing=conf.filter(p=>!voters().some(v=>v.id===p.id)).map(p=>p.name);
  const st=stAll;
  if(!st.length)return `<div class="empty"><h3>Nessuna proposta in questa categoria</h3></div>`;
  const voted=x=>x.score!=null;
  const same=(a,b)=>a&&b&&voted(a)&&voted(b)&&sameVotes(a,b);
  const tie=i=>same(st[i],st[i-1])||same(st[i],st[i+1]);
  /* pari merito a cavallo del limite della quota: serve una decisione dell'organizzatore */
  const edge=q>0&&q<st.length&&same(st[q-1],st[q]);
  const edgeAt=i=>edge&&same(st[i],st[q]);
  const rows=st.map((x,i)=>{
    const inQ=voted(x)&&i<q,pari=voted(x)&&tie(i);
    return `<div class="res ${i<3&&voted(x)?'top3':''} ${inQ?'cut':''}"><div class="pos num">${i+1}</div>
      <div><div style="font-weight:600;overflow-wrap:anywhere">${esc(x.r.title)} ${pari?badge('Pari merito',edgeAt(i)?'warn':'muted'):''}</div><div class="small muted">${x.r.region?esc(x.r.region)+' · ':''}${esc(pname(x.r.proposerId))}${x.r.slot?' · '+badge('In menu','ok'):''}</div></div>
      ${fotoThumb(x.r)}
      <div class="bar" title="Punti in percentuale del massimo possibile"><i style="width:${voted(x)?x.score:0}%"></i></div>
      <div class="small num" style="text-align:right">${voted(x)?`<b>${x.pts}</b> punti<br><span class="muted">${x.first[0]} primi posti · in classifica per ${x.n} su ${x.nv}</span>`:'<span class="muted">nessun voto</span>'}</div></div>`;
  }).join('');
  return `<div class="note">Hanno votato <b class="num">${done}</b> su <b class="num">${S.participants.length}</b>.${missing.length?` Mancano i confermati: ${esc(missing.join(', '))}.`:''}
    ${extra?`I contorni non contano nel numero dei piatti: si possono mettere in menu in più, scegliendo i più votati.`:libero?`Formato «${esc(fmtNow().nome)}»: nessuna quota per portata, entrano i più votati in assoluto.`:`Le righe evidenziate rientrano nella quota suggerita per “${esc(catOf(cat).label)}” (<b class="num">${q}</b> su ${totalCap()} piatti, formato ${esc(fmtNow().nome)}).`}</div>
    ${edge?`<div class="note warn"><b>Pari merito al limite della quota.</b> Anche contando primi, secondi posti e così via i piatti evidenziati “Pari merito” sono identici: decide l’organizzatore.</div>`:''}
    <div class="panel" style="padding:0;overflow:hidden">${rows}</div>
    <p class="hint">Punteggio: 1° posto = ${rankPts(cat,1)} punti, 2° = ${rankPts(cat,2)}… ultimo posto classificabile = 2; fuori classifica 0. La barra mostra i punti rispetto al massimo possibile (tutti i votanti della portata che mettono il piatto primo). A parità di punti: più primi posti, poi più secondi posti, e così via.</p>`;
}
A.vcat=t=>{UI.vcat=t.dataset.v;render();};
A.vmode=t=>{UI.vmode=t.dataset.v;render();};
CH.rkpos=t=>rankSet(UI.vcat,t.dataset.id,num(t.value));
function rankSet(cat,id,p){
  if(!canVote()){toast('Il voto non è aperto.','err');return;}
  const d=rankedDraft(cat),cur=d.slots.indexOf(id)+1;
  if(cur===p)return;
  const out=rankPlace(d.slots,id,p);
  UI.draft[cat]=out.slots;render();
  if(out.moved){const t=R(out.moved.id).title;toast(out.moved.pos?`«${t}» scende alla posizione ${out.moved.pos}.`:`«${t}» esce dalla classifica: non c’era posto libero sotto.`);}
}
A['save-rank']=async()=>{
  const cat=UI.vcat,d=rankedDraft(cat),ids=d.slots.filter(Boolean);
  if(!S.meId||!ids.length)return;
  const now=Date.now(),patch={rank:{[cat]:ids},rankAt:{[cat]:now},updatedAt:now};
  const ex=S.votes[S.meId];
  const ok=ex?await write('update','votes/'+S.meId,patch):await write('set','votes/'+S.meId,patch);
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
  return `<div class="dish" data-mdish="${esc(r.id)}">${org?`<button type="button" class="mgrip" data-mgrip="${esc(r.id)}" aria-label="Trascina «${esc(r.title)}» in un altro pasto" title="Trascina in un altro pasto o negli exit poll">⠿</button>`:''}${fotoThumb(r)}<div><button class="nm" data-act="open-dish" data-id="${esc(r.id)}">${esc(r.title)}</button>
    <div class="small muted">${chipCat(r.category)} ${esc(ownersOf(r).map(pname).join(', '))}</div>${dishWarn(r,slotKey)}</div>
    ${org?`<select aria-label="Sposta ${esc(r.title)}" data-chg="setslot" data-id="${esc(r.id)}"><option value="">Togli dal menu</option>${SLOTS.map(s=>`<option value="${s.key}" ${s.key===slotKey?'selected':''}>${s.label}</option>`).join('')}</select>`:''}</div>`;
}
/* Exit poll: i piatti più votati finora, per portata (solo i primi XP_N); si trascinano nel menu */
const XP_N=5;
function exitPoll(org){
  const st=voteStats();
  const cats=CATS.map(c=>{
    const all=st[c.key],voted=all.filter(x=>x.score!=null);
    const rows=voted.slice(0,XP_N).map((x,i)=>{
      const r=x.r;
      return `<li class="xpr ${r.slot?'inmenu':''}" data-mdish="${esc(r.id)}">${org?`<button type="button" class="mgrip" data-mgrip="${esc(r.id)}" aria-label="Trascina «${esc(r.title)}» nel menu" title="Trascina nel menu">⠿</button>`:''}
        <span class="xtn">${fotoThumb(r)}<span class="pos num">${i+1}</span></span>
        <div class="xpt"><button class="nm" data-act="open-dish" data-id="${esc(r.id)}">${esc(r.title)}</button> ${r.slot?badge('In menu · '+slotLabel(r.slot),'ok'):''}
          <div class="small muted">${r.region?esc(r.region)+' · ':''}proposta da ${esc(pname(r.proposerId))}</div>
          <div class="xbar" aria-hidden="true"><i style="width:${x.score}%"></i></div>
          ${org?`<select class="xps" aria-label="${r.slot?'Sposta':'Assegna'} ${esc(r.title)}" data-chg="setslot" data-id="${esc(r.id)}"><option value="">${r.slot?'Togli dal menu':'Metti in menu…'}</option>${SLOTS.map(sl=>`<option value="${sl.key}" ${sl.key===r.slot?'selected':''}>${sl.label}</option>`).join('')}</select>`:''}</div>
        <div class="small num xpv"><b>${x.pts}</b> punti<br><span class="muted">${x.n} su ${x.nv} vot${x.nv===1?'ante':'anti'}</span></div></li>`;
    }).join('');
    return `<div class="xp-cat" style="--h:${c.h}"><h4 class="grp" style="--h:${c.h}">${esc(c.label)} <span class="muted small num">${voted.length} con voti</span></h4>${c.key==='contorni'?'<p class="small muted" style="margin:0 0 6px">Extra: non contano nel numero dei piatti, se ne possono aggiungere quanti servono.</p>':''}
      ${rows?`<ol class="xpl">${rows}</ol>`:'<p class="small muted">Nessun voto ancora.</p>'}</div>`;
  }).join('');
  const rest=CATS.map(c=>[c,st[c.key].filter(x=>!x.r.slot&&!(x.score!=null&&st[c.key].filter(y=>y.score!=null).indexOf(x)<XP_N))]).filter(g=>g[1].length);
  const nRest=rest.reduce((a,g)=>a+g[1].length,0);
  const restHtml=nRest?`<details class="panel xp-rest" id="xp-rest" ${isOpen('xp-rest')}><summary style="cursor:pointer;font-weight:600">Altri candidati, fuori dai primi ${XP_N} <span class="muted small num">(${nRest})</span></summary>
    <div style="display:flex;flex-direction:column;gap:12px;margin-top:10px">${rest.map(([c,xs])=>`<div><h4 class="grp" style="--h:${c.h}">${esc(c.label)}</h4>${xs.map(x=>`<div class="cand"><div><div style="font-weight:600;overflow-wrap:anywhere">${esc(x.r.title)}</div>
      <div class="small muted">${x.r.region?esc(x.r.region)+' · ':''}proposta da ${esc(pname(x.r.proposerId))}</div></div>
      <div class="small num muted" style="text-align:right">${x.score==null?'nessun voto':`<b style="color:var(--ink)">${x.pts}</b> punti<br>${x.n} su ${x.nv} vot${x.nv===1?'ante':'anti'}`}</div>
      ${org?`<select aria-label="Assegna ${esc(x.r.title)}" data-chg="setslot" data-id="${esc(x.r.id)}"><option value="">Non in menu</option>${SLOTS.map(s=>`<option value="${s.key}">${s.label}</option>`).join('')}</select>`:'<span></span>'}</div>`).join('')}</div>`).join('')}</div></details>`:'';
  return `<aside class="xp" ${org?'data-mdrop="out"':''} aria-label="Exit poll">
    <div class="xp-head"><h3>Exit poll</h3><p class="small muted">I ${XP_N} piatti più votati finora per portata, con gli stessi punti della scheda Votazioni. <b>Evidenziati in verde quelli in menu.</b>${org?' Trascinali nel menu a sinistra o scegli il pasto dal menu a tendina; trascina un piatto qui per toglierlo dal menu.':''}</p></div>
    ${cats}${restHtml}</aside>`;
}
function vMenu(){
  const org=isOrg(),fm=fmtNow(),capv=fm.cap,sl=slotted(),cn=counted(),tot=totalCap(),overTot=cn.length>tot;
  const days=DAYS.map(d=>{
    const rs=sl.filter(r=>slotDay(r.slot)===d.key),rc=rs.filter(isCounted),cap=num(capv[d.key]),over=fm.libero?false:rc.length>cap;
    const mix={};rs.forEach(r=>mix[r.category]=(mix[r.category]||0)+1);
    const slots=SLOTS.filter(s=>s.day===d.key).map(s=>{
      const list=rs.filter(r=>r.slot===s.key).sort((a,b)=>catIdx(a.category)-catIdx(b.category)||byTitle(a,b));
      const sc=fm.slot&&fm.slot[s.key],nl=list.filter(isCounted).length;
      return `<div class="slot" data-mslot="${s.key}"><h4>${s.label}${sc?` <span class="num ${nl>sc?'bad':''}">${nl} / ${sc}</span>`:''}</h4>${list.map(r=>dishRow(r,s.key)).join('')||`<p class="small muted mempty">${org?'Trascina qui un piatto dagli exit poll.':'Nessun piatto assegnato.'}</p>`}</div>`;
    }).join('');
    return `<section class="day ${over?'over':''}"><header><h3>${d.label}</h3><span class="num">${fm.libero?`<b>${rc.length}</b> piatt${rc.length===1?'o':'i'}`:`<b>${rc.length}</b> / ${cap}${over?' · troppi':''}`}${rs.length>rc.length?`<span class="small muted">${extraTxt(rs.length-rc.length)}</span>`:''}</span></header>
      <div class="slot daysum">${fm.libero?'':`<div class="capbar"><i style="width:${cap?Math.min(100,rc.length/cap*100):0}%"></i></div>`}
      <div class="mix">${CATS.filter(c=>mix[c.key]).map(c=>`<span class="chip" style="--h:${c.h}">${esc(c.label)} ${mix[c.key]}</span>`).join('')||'<span class="small muted">Nessun piatto</span>'}</div></div>
      ${slots}</section>`;
  }).join('');
  const noIng=sl.filter(r=>!(r.ingredients||[]).length).length;
  return `<section class="view">
    <div class="vhead"><div><h2>Menu</h2>
      <p class="lede">Formato <b>${esc(fm.nome)}</b>, ${fm.tot} piatti${fm.libero?', senza vincoli su portata e pasto':': '+num(capv.ven)+' per venerdì sera, '+num(capv.sab)+' per sabato, '+num(capv.dom)+' per domenica'}. In menu: <b class="num ${overTot?'bad':''}">${cn.length}</b> / ${tot}${extraTxt(nExtra())} <span class="small muted">(i contorni si possono aggiungere in più: non contano nel numero dei piatti)</span>. Tocca un piatto per aprire la sua scheda con squadra, ingredienti e tempi.</p></div>
      ${org?`<div class="row">${UI.sugg
        ?`<span class="small">Sostituisce la selezione attuale.</span><button class="btn primary sm" data-act="suggest-go">Applica suggerimento</button><button class="btn sm" data-act="suggest-cancel">Annulla</button>`
        :`<button class="btn" data-act="suggest">Suggerisci dai voti</button><button class="btn" data-act="clear-menu" ${sl.length?'':'disabled'}>Svuota</button>`}</div>`:''}</div>
    ${!org?`<div class="note">Solo gli organizzatori assegnano i piatti ai pasti. Qui puoi vedere il menu e aprire le schede.</div>`:''}
    ${noIng?`<div class="note warn"><b>${noIng}</b> piatt${noIng===1?'o':'i'} del menu senza ingredienti: la lista della spesa è incompleta finché i responsabili non compilano le schede.</div>`:''}
    ${famNote()}
    ${compNote(fm,cn)}
    <div class="menu2"><div class="menu2-l"><h3 class="menu2-h">Il menu, pasto per pasto</h3><div class="days">${days}</div></div>
      <div class="menu2-r">${exitPoll(org)}</div></div>
    ${vCarta()}</section>`;
}
A.suggest=()=>{
  if(!S.recipes.length){toast('Nessuna proposta da selezionare.','err');return;}
  if(!voters().length){toast('Nessun voto sui piatti ancora: non c’è nulla da suggerire.','err');return;}
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
/* sposta un piatto in un pasto (slotKey) o lo toglie dal menu (''); usata dai menu a tendina e dal trascinamento */
async function moveDish(id,slotKey){
  const r=R(id);if(!r||!isOrg()||(r.slot||'')===slotKey)return;
  if(await write('update','recipes/'+id,{slot:slotKey})){
    if(slotKey&&!feasible(r,slotKey))toast('Attenzione: i tempi di preparazione non stanno in questo pasto.','err');
    else toast(slotKey?`«${r.title}» → ${slotLabel(slotKey)}`:`«${r.title}» tolto dal menu`);
  }
}
CH.setslot=t=>moveDish(t.dataset.id,t.value);

/* pasto con portate obbligatorie (venerdì della Bouffetta): avvisa se manca o avanza qualcosa */
function compNote(fm,sl){
  const out=[];
  for(const [sk,cats] of Object.entries(fm.comp||{})){
    const rs=sl.filter(r=>r.slot===sk);if(!rs.length)continue;
    const miss=cats.filter(c=>!rs.some(r=>r.category===c)).map(c=>catOf(c).label);
    const extra=rs.filter(r=>!cats.includes(r.category)).map(r=>r.title);
    if(miss.length||extra.length)out.push(`<b>${esc(slotLabel(sk))}</b> (${esc(fm.nome)}): ${miss.length?'manca '+esc(miss.join(', ')):''}${miss.length&&extra.length?'; ':''}${extra.length?'fuori schema: '+esc(extra.join(', ')):''}`);
  }
  return out.length?`<div class="note warn">${out.join('<br>')}</div>`:'';
}

/* --- carta dei vini e piatti simili --- */
function famNote(){
  const d=famDupes();
  if(!d.length)return '';
  return `<div class="note"><b>Piatti simili nel menu.</b> ${d.map(([f,rs])=>`${esc(FAM[f])}: ${rs.map(r=>esc(r.title)).join(', ')}`).join(' · ')}. Valuta se servono tutti.</div>`;
}
function winesInMenu(){
  const m=new Map();
  for(const r of slotted())for(const v of (r.vini||[])){
    const k=norm(v.nome);if(!k)continue;
    const o=m.get(k)||{nome:v.nome,dishes:[],raw:0};o.dishes.push(r.title);o.raw+=num(v.bottiglie)*scaleF(r);m.set(k,o);
  }
  return [...m.values()].sort((a,b)=>a.nome.localeCompare(b.nome,'it'));
}
function vCarta(){
  if(!slotted().length)return '';
  const ws=winesInMenu();
  const rows=ws.map(w=>`<div class="row spread" style="padding:7px 0;border-top:1px dashed var(--line)"><span><b>${esc(w.nome)}</b> <span class="small muted">· ${esc(w.dishes.join(', '))}</span></span><span class="small num muted">${w.raw>0?roundUp('bottiglie',w.raw)+' bott.':'quantità da definire'}</span></div>`).join('');
  return `<div class="panel"><div class="row spread"><h3>Carta dei vini</h3><button class="btn sm" data-act="copy-carta">Copia la carta del banchetto</button></div>
    ${ws.length?rows:'<p class="muted small" style="margin-top:8px">Nessun vino indicato nelle schede. Compaiono qui quando proponi un piatto dai Suggerimenti o li aggiungi nella scheda del piatto.</p>'}</div>`;
}
function cartaText(){
  const out=['CARTA DEL BANCHETTO · Gran Bouffe '+(S.settings.tema||''),''];
  for(const sl of SLOTS){
    const rs=slotted().filter(r=>r.slot===sl.key).sort((a,b)=>catIdx(a.category)-catIdx(b.category)||byTitle(a,b));
    if(!rs.length)continue;
    out.push(sl.label.toUpperCase());
    rs.forEach(r=>out.push('- '+r.title+((r.vini||[])[0]?' · '+r.vini[0].nome:'')));
    out.push('');
  }
  return out.join('\n').trim();
}
A['copy-carta']=()=>copyText(cartaText(),'Carta copiata: incollala dove vuoi');
