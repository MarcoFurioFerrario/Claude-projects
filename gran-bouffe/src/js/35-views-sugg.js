/* ============ vista: suggerimenti (catalogo di 44 piatti del Triveneto) ============ */
const LV_ORD={A:0,B:1,C:2,'':3};
const lvBadge=lv=>lv?badge(LIVELLI[lv].t,LIVELLI[lv].cls):badge('Livello da assegnare','muted');

function sugList(){return SUG.map(s=>({s,st:sugState(s),r:sugRecipe(s)}));}
function filterSug(all){
  const q=norm(UI.sq);
  const l=all.filter(x=>{
    const s=x.s;
    if(UI.scat&&s.c!==UI.scat)return false;
    if(UI.sreg&&s.r!==UI.sreg)return false;
    if(UI.swt&&s.wt!==UI.swt)return false;
    if(UI.slv&&(s.lv||'-')!==UI.slv)return false;
    if(UI.sst&&x.st!==UI.sst)return false;
    if(q&&norm([s.t,s.ln,s.i,s.v,s.r,s.rl,s.d].join(' ')).indexOf(q)<0)return false;
    return true;
  });
  const byT=(a,b)=>a.s.t.localeCompare(b.s.t,'it');
  const cmp={cat:(a,b)=>catIdx(a.s.c)-catIdx(b.s.c)||byT(a,b),
    lv:(a,b)=>LV_ORD[a.s.lv]-LV_ORD[b.s.lv]||catIdx(a.s.c)-catIdx(b.s.c)||byT(a,b),
    reg:(a,b)=>REGIONI.indexOf(a.s.r)-REGIONI.indexOf(b.s.r)||catIdx(a.s.c)-catIdx(b.s.c)||byT(a,b),
    az:byT};
  return l.sort(cmp[UI.ssort]||cmp.cat);
}
function eqHtml(rows){
  const max=Math.max(1,...rows.map(r=>r.l+r.p+r.m));
  return `<div class="eq">${rows.map(r=>{
    const t=r.l+r.p+r.m;
    return `<div class="eqr"><span>${esc(r.label)}</span><div class="eqb" style="width:${Math.max(6,t/max*100)}%" role="img" aria-label="${esc(r.label)}: ${r.m} approvate, ${r.p} proposte, ${r.l} da proporre"><i class="m" style="flex:${r.m}"></i><i class="p" style="flex:${r.p}"></i><i class="l" style="flex:${r.l}"></i></div><span class="num small muted">${r.m} · ${r.p} · ${r.l}</span></div>`;
  }).join('')}</div>`;
}
function eqRows(all,labels,key){
  return labels.map(([k,lab])=>{
    const xs=all.filter(x=>x.s[key]===k);
    return{label:lab,m:xs.filter(x=>x.st==='menu').length,p:xs.filter(x=>x.st==='proposta').length,l:xs.filter(x=>x.st==='libera').length};
  });
}
function sugFlag(x){
  if(x.st==='menu')return badge('Approvata · '+slotLabel(x.r.slot),'ok');
  if(x.st==='proposta')return badge(['menu','cucina'].includes(S.settings.fase)?'Proposta · non selezionata':'Già proposta','info');
  return badge('Da proporre','muted');
}
function sugCard(x,grouped){
  const s=x.s,r=x.r,c=catOf(s.c);
  const mates=x.st==='libera'?famMates(s).map(m=>({m,st:sugState(m)})).filter(y=>y.st!=='libera'):[];
  const showLn=s.ln&&norm(s.ln)!==norm(s.t);
  const srcs=s.src.map(u=>`<li><a href="${esc(safeHref(u.u))}" target="_blank" rel="noopener noreferrer">${esc(u.l)} ↗</a>${u.n?` <span class="small muted">(${esc(u.n)})</span>`:''}</li>`).join('');
  const act=x.st==='libera'
    ?`<button class="btn sm primary" data-act="sug-propose" data-id="${esc(s.id)}" ${canPropose()?'':'disabled'}>Proponi questo piatto</button>`
    :`<span class="small muted">Proposta da ${esc(pname(r.proposerId))}</span><button class="btn sm" data-act="sug-open" data-id="${esc(s.id)}">${r.slot?'Apri la scheda':'Vedi la proposta'}</button>`;
  return `<article class="card sg ${x.st}">
    <div class="row spread"><div class="row" style="gap:6px">${grouped?'':chipCat(s.c)}<span class="chip reg" style="--h:${REG_H[s.r]||0}">${esc(REG_SHORT[s.r]||s.r)}</span></div>${sugFlag(x)}</div>
    <h3>${esc(s.t)}</h3>${(showLn||s.rl)?`<p class="small muted" style="margin-top:-4px">${showLn?`<i>${esc(s.ln)}</i>`:''}${showLn&&s.rl?' · ':''}${esc(s.rl||'')}</p>`:''}
    <p class="small">${esc(s.d)}</p>
    <dl class="kv"><dt>Ingredienti</dt><dd>${esc(s.i)}</dd>
      <dt>Vino</dt><dd>${esc(s.v)} <span class="chip plain">${esc(s.wt)}</span>${s.vs==='sug'?' <span class="small muted">suggerito</span>':''}</dd></dl>
    ${s.avv?`<p class="small avv">${esc(s.avv)}</p>`:''}
    ${s.weak?`<p class="small avv"><b>Link da sostituire.</b> ${esc(s.weak)}</p>`:''}
    ${mates.length?`<p class="small sim">Simile a ${mates.map(y=>`<b>${esc(y.m.t)}</b> (${y.st==='menu'?'in menu':'già proposta'})`).join(', ')}: ne basta uno?</p>`:''}
    <details><summary class="small" style="cursor:pointer;font-weight:600">Fonti, tempi e note ${lvBadge(s.lv)}</summary>
      <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px">
        <ul class="steps" style="padding-left:18px;gap:4px">${srcs}</ul>
        ${s.e?`<p class="small"><b>Esecuzione.</b> ${esc(s.e)}</p>`:''}
        ${s.tempi?`<p class="small"><b>Tempi.</b> ${esc(s.tempi)}</p>`:''}
        ${s.mais?`<p class="small"><b>Polenta o farina.</b> ${esc(s.mais)}</p>`:''}
        ${s.f?`<p class="small muted">Famiglia: ${esc(FAM[s.f])}.</p>`:''}</div></details>
    <div class="row spread" style="margin-top:auto">${act}</div></article>`;
}
function vSugg(){
  const all=sugList(),list=filterSug(all);
  const n={libera:0,proposta:0,menu:0};all.forEach(x=>n[x.st]++);
  const regRows=eqRows(all,REGIONI.map(r=>[r,r]),'r'),catRows=eqRows(all,CATS.filter(c=>SUG.some(s=>s.c===c.key)).map(c=>[c.key,c.label]),'c'),wtRows=eqRows(all,WTYPES.map(w=>[w,w]),'wt');
  const chips=[['','Tutte']].concat(CATS.filter(c=>SUG.some(s=>s.c===c.key)).map(c=>[c.key,c.label])).map(c=>`<button class="fchip" aria-pressed="${UI.scat===c[0]}" data-act="scat" data-v="${c[0]}">${esc(c[1])}</button>`).join('');
  const opt=(v,cur,lab)=>`<option value="${esc(v)}" ${cur===v?'selected':''}>${esc(lab)}</option>`;
  let body;
  if(!list.length)body=`<div class="empty"><h3>Nessun piatto con questi filtri</h3><button class="btn" data-act="sclear">Azzera filtri</button></div>`;
  else if(UI.ssort==='cat')body=CATS.map(c=>[c,list.filter(x=>x.s.c===c.key)]).filter(g=>g[1].length)
    .map(([c,xs])=>`<div><h3 class="grp" style="--h:${c.h}">${esc(c.label)} <span class="muted small num">${xs.length}</span></h3><div class="cards">${xs.map(x=>sugCard(x,true)).join('')}</div></div>`).join('');
  else body=`<div class="cards">${list.map(x=>sugCard(x,false)).join('')}</div>`;
  const weakN=SUG.filter(s=>s.weak).length;
  return `<section class="view">
    <div class="hero-sug">
      <div class="hs-l"><h2><span class="hs-num" aria-hidden="true">${SUG.length}</span><span><span class="sr">${SUG.length} </span>ricette già pronte da cui attingere</span></h2>
        <p>Piatti tradizionali del Triveneto con fonte, vino in abbinamento e note di esecuzione. Ne scegli uno e lo proponi con un tocco: link, vino e tempi sono già compilati.</p></div>
      <div class="hs-r"><div class="hs-meta"><span><b class="num">${n.libera}</b> da proporre</span><span><b class="num">${n.proposta}</b> già proposti</span><span><b class="num">${n.menu}</b> approvati in menu</span></div>
        <div class="hs-regs" role="group" aria-label="Filtra per regione">${REGIONI.map(r=>`<button class="chip reg" style="--h:${REG_H[r]}" aria-pressed="${UI.sreg===r}" data-act="sreg" data-v="${esc(r)}">${esc(REG_SHORT[r])} <span class="num">${SUG.filter(x=>x.r===r).length}</span></button>`).join('')}</div></div>
    </div>
    <div class="filters">
      <div class="field wide"><label for="sq">Cerca piatto, ingrediente o vino</label><input type="search" id="sq" data-in="sq" value="${esc(UI.sq)}" placeholder="es. polenta, Soave, anatra…"></div>
      <div class="field"><label for="swt">Tipo di vino</label><select id="swt" data-chg="swt"><option value="">Tutti</option>${WTYPES.map(w=>opt(w,UI.swt,w)).join('')}</select></div>
      <div class="field"><label for="sst">Stato</label><select id="sst" data-chg="sst"><option value="">Tutti</option>${opt('libera',UI.sst,'Da proporre')}${opt('proposta',UI.sst,'Già proposti')}${opt('menu',UI.sst,'Approvati')}</select></div>
      <div class="field"><label for="slv">Livello fonte</label><select id="slv" data-chg="slv"><option value="">Tutti</option>${['A','B','C'].map(l=>opt(l,UI.slv,LIVELLI[l].t)).join('')}${opt('-',UI.slv,'Da assegnare')}</select></div>
      <div class="field"><label for="ssort">Ordina per</label><select id="ssort" data-chg="ssort">${opt('cat',UI.ssort,'Portata')}${opt('lv',UI.ssort,'Livello della fonte')}${opt('reg',UI.ssort,'Regione')}${opt('az',UI.ssort,'Nome')}</select></div>
    </div>
    <div class="filterchips">${chips}</div>
    <p class="small muted">Mostro <b class="num">${list.length}</b> piatti su ${SUG.length}.</p>
    ${body}
    <details class="panel" id="sg-eq" ${isOpen('sg-eq')}><summary style="cursor:pointer;font-weight:600">Equilibrio del catalogo: regioni, portate e vini</summary>
      <div class="eqgrid" style="margin-top:12px"><div><h4>Per regione</h4>${eqHtml(regRows)}</div><div><h4>Per portata</h4>${eqHtml(catRows)}</div><div><h4>Per tipo di vino</h4>${eqHtml(wtRows)}</div></div>
      <p class="small muted" style="margin-top:12px"><span class="lg m"></span> approvati · <span class="lg p"></span> già proposti · <span class="lg l"></span> da proporre. I numeri sono approvati · proposti · da proporre.</p></details>
    <details class="panel" id="sg-tips" ${isOpen('sg-tips')}><summary style="cursor:pointer;font-weight:600">Consigli di regia per il banchetto</summary>
      <div class="cols" style="margin-top:12px"><div><h4>Tre farine di mais</h4><p class="small">Biancoperla per il pesce di laguna (schie, seppie, boreto); gialla fine per gli intingoli friulani (toc' in braide, salame all'aceto, blecs); Storo o Marano a grana rustica per selvaggina e brasati.</p></div>
      <div><h4>Le 24 ore</h4><p class="small">Brasato al Teroldego, pearà, base dei fasioi e seppie in nero migliorano se fatti il giorno prima: l'energia dell'ultimo momento va a fritture e pasta fresca.</p></div>
      <div><h4>Equilibrio e acidità</h4><p class="small">Aceto caldo (boreto, salame), crauti (tirtlan) e mirtilli rossi (capriolo, kaiserschmarrn) ripuliscono il palato tra una portata e l'altra. Evita troppi piatti simili: te lo segnalo qui e nel menu.</p></div></div></details>
    <details class="panel" id="sg-lv" ${isOpen('sg-lv')}><summary style="cursor:pointer;font-weight:600">Come leggere i livelli delle fonti</summary>
      <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px">${['A','B','C'].map(l=>`<p class="small">${lvBadge(l)} ${esc(LIVELLI[l].d)}</p>`).join('')}
      <p class="small">${badge('Livello da assegnare','muted')} I 22 piatti della seconda rassegna non hanno ancora un livello: i loro link vanno controllati. In ${weakN} casi il link è generico o rimanda a un altro piatto, e sono segnati "Link da sostituire".</p>
      <p class="small muted">Le fonti sono quelle dei due documenti del gruppo; i volumi cartacei di riferimento non sono stati consultati. I vini senza la scritta "suggerito" vengono dal documento, gli altri sono abbinamenti proposti per completare il catalogo.</p></div></details>
  </section>`;
}
A['sug-propose']=t=>{
  const s=sugById(t.dataset.id);if(!s)return;
  if(!canPropose()){toast('Le proposte sono chiuse.','err');return;}
  openRecipeEditor(null,sugPre(s));
};
A['sug-open']=t=>{
  const s=sugById(t.dataset.id),r=s&&sugRecipe(s);if(!r)return;
  if(r.slot){UI.navigated=true;UI.dish=r.id;UI.tab='menu';setHash('piatto-'+r.id);}
  else{UI.navigated=true;UI.dish=null;UI.tab='proposte';UI.q=r.title;UI.cat='';UI.reg='';UI.ver='';UI.mine=false;setHash('proposte');}
  render();window.scrollTo(0,0);
};
A.scat=t=>{UI.scat=t.dataset.v;render();};
A.sclear=()=>{UI.sq='';UI.scat='';UI.sreg='';UI.swt='';UI.slv='';UI.sst='';render();};
IN.sq=t=>{UI.sq=t.value;render();};
A.sreg=t=>{UI.sreg=UI.sreg===t.dataset.v?'':t.dataset.v;render();};
['swt','sst','slv','ssort'].forEach(k=>{CH[k]=t=>{UI[k]=t.value;render();};});
