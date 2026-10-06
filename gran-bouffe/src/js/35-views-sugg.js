/* ============ vista: suggerimenti (catalogo di 44 piatti del Triveneto) ============ */
const LV_ORD={A:0,B:1,C:2,'':3};
const lvBadge=lv=>lv?badge(LIVELLI[lv].t,LIVELLI[lv].cls):badge('Livello da assegnare','muted');

/* Nei Suggerimenti compaiono solo i piatti non ancora proposti: appena uno viene proposto sparisce dall'elenco. */
function sugList(){return sugLibere().map(s=>({s,st:'libera',r:null}));}
function filterSug(all){
  const q=norm(UI.sq);
  const l=all.filter(x=>{
    const s=x.s;
    if(UI.scat&&s.c!==UI.scat)return false;
    if(UI.sreg&&s.r!==UI.sreg)return false;
    if(UI.swt&&s.wt!==UI.swt)return false;
    if(UI.slv&&(s.lv||'-')!==UI.slv)return false;
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
function sugCard(x,grouped){
  const s=x.s,c=catOf(s.c);
  const mates=famMates(s).map(m=>({m,st:sugState(m)})).filter(y=>y.st!=='libera');
  const showLn=s.ln&&norm(s.ln)!==norm(s.t);
  const srcs=s.src.map(u=>`<li><a href="${esc(safeHref(u.u))}" target="_blank" rel="noopener noreferrer">${esc(u.l)} ↗</a>${u.n?` <span class="small muted">(${esc(u.n)})</span>`:''}</li>`).join('');
  return `<article class="card sg libera">
    ${sugFotoFig(s)}
    <div class="row" style="gap:6px">${grouped?'':chipCat(s.c)}<span class="chip reg" style="--h:${REG_H[s.r]||0}">${esc(REG_SHORT[s.r]||s.r)}</span></div>
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
    <div class="row spread" style="margin-top:auto"><button class="btn sm primary" data-act="sug-propose" data-id="${esc(s.id)}" ${canPropose()?'':'disabled'}>Proponi questo piatto</button></div></article>`;
}

/* ---- equilibrio: cosa abbiamo già e cosa manca (regioni, portate, vini) ---- */
function eqRowsData(){
  const lib=sugLibere(),all=SUG.map(s=>({s,st:sugState(s)})),fm=fmtNow(),q=fm.libero?null:quotas(totalCap());
  /* ogni riga: totali e divisione per regione (p = già proposti, l = ancora da proporre nel catalogo) */
  const split=(prop,libs,rf,lf)=>{
    const rows=REGIONI.map(r=>({r,p:prop.filter(x=>rf(x)===r).length,l:libs.filter(x=>lf(x)===r).length}));
    const resto=prop.length-rows.reduce((a,g)=>a+g.p,0);
    return resto>0?rows.concat([{r:'',p:resto,l:0}]):rows; // regione non indicata o fuori elenco
  };
  const mk=(k,label,prop,menu,libs,rf,lf,extra)=>Object.assign({k,label,tot:prop.length,menu,libere:libs.length,reg:split(prop,libs,rf,lf)},extra||{});
  const rr=x=>x.region,sr=x=>x.r;
  const reg=REGIONI.map(r=>{const rs=S.recipes.filter(x=>x.region===r);return mk(r,r,rs,rs.filter(x=>x.slot).length,lib.filter(s=>s.r===r),rr,sr);});
  const cat=CATS.map(c=>{const rs=S.recipes.filter(x=>x.category===c.key);return mk(c.key,c.label,rs,rs.filter(x=>x.slot).length,lib.filter(s=>s.c===c.key),rr,sr,{q:q?q[c.key]:null});});
  const wt=WTYPES.map(w=>{const xs=all.filter(x=>x.s.wt===w),pr=xs.filter(x=>x.st!=='libera').map(x=>x.s);return mk(w,w,pr,xs.filter(x=>x.st==='menu').length,xs.filter(x=>x.st==='libera').map(x=>x.s),sr,sr);});
  /* verdetti in parole: regioni e (senza quote) portate si confrontano con la media; con un formato a quote le portate con i posti nel menu */
  const media=rows=>{const rr=rows.filter(r=>r.k!=='contorni');return rr.reduce((a,r)=>a+r.tot,0)/Math.max(1,rr.length);};
  const vs=(rows,m)=>rows.forEach(r=>{
    if(r.k==='contorni'){r.v={k:'extra',c:'info',t:'Extra: fuori dal conteggio dei piatti'};return;}
    if(r.q!=null){
      if(r.tot<r.q)r.v={k:'manca',c:'bad',t:`Ne mancano almeno ${r.q-r.tot}: ${r.tot} proposte per ${r.q} posti`};
      else if(r.tot<r.q*1.5)r.v={k:'poche',c:'warn',t:`Poca scelta: ${r.tot} proposte per ${r.q} posti`};
      else if(r.tot>=r.q*4)r.v={k:'molte',c:'info',t:`Molte: ${r.tot} proposte per ${r.q} posti`};
      else r.v={k:'ok',c:'ok',t:`A posto: ${r.tot} proposte per ${r.q} posti`};
    }else if(!(m>0))r.v={k:'zero',c:'info',t:'Nessuna proposta ancora'};
    else{
      if(r.tot<m*0.6)r.v={k:'poche',c:'warn',t:'Poche rispetto alle altre'};
      else if(r.tot>m*1.6)r.v={k:'molte',c:'info',t:'Tante rispetto alle altre'};
      else r.v={k:'ok',c:'ok',t:'Equilibrata'};
    }
  });
  vs(reg,media(reg));vs(cat,media(cat));
  return{reg,cat,wt,q,fm};
}
/* un colore per regione (stesso tono delle etichette di regione); grigio per «regione non indicata» */
const regColor=r=>r?`hsl(${REG_H[r]} 45% var(--reg-l))`:'hsl(0 0% 45%)';
const elenca=a=>a.length>1?a.slice(0,-1).join(', ')+' e '+a[a.length-1]:a.join('');
function eqBlock(titolo,sotto,rows,key){
  const max=Math.max(1,...rows.map(r=>r.tot+r.libere));
  const nome=r=>r?(REG_SHORT[r]||r):'Regione non indicata';
  return `<div class="eqblk"><h4>${esc(titolo)}</h4><p class="small muted">${esc(sotto)}</p>
    ${rows.map(r=>{
      const w=(r.tot+r.libere)/max*100;
      /* per ogni regione: prima i piatti già proposti (colore pieno), poi quelli ancora da proporre (tratteggiati) */
      const seg=r.reg.map(g=>{
        const st=`--c:${regColor(g.r)}`;
        return (g.p?`<i class="g p" style="${st};flex:${g.p}" title="${esc(nome(g.r)+': '+g.p+(g.p===1?' proposto':' proposti'))}"><b>${g.p}</b></i>`:'')
          +(g.l?`<i class="g l" style="${st};flex:${g.l}" title="${esc(nome(g.r)+': '+g.l+' ancora da proporre')}"><b>${g.l}</b></i>`:'');
      }).join('');
      const aria=r.reg.filter(g=>g.p||g.l).map(g=>`${nome(g.r)}: ${g.p} ${g.p===1?'proposto':'proposti'}, ${g.l} da proporre`).join('; ');
      const senza=key==='reg'||!r.tot?[]:r.reg.filter(g=>g.r&&!g.p).map(g=>REG_SHORT[g.r]||g.r);
      return `<div class="eqr2"><div class="eql"><b>${esc(r.label)}</b>${r.v?`<span class="verd ${r.v.c}">${esc(r.v.t)}</span>`:''}</div>
        <div class="eqbar" style="width:${Math.max(8,w)}%" role="img" aria-label="${esc(r.label)}: ${esc(aria)}">${seg}</div>
        <div class="eqn small"><span><b class="num">${r.tot}</b> proposti${r.menu?` (${r.menu} in menu)`:''}</span><span><b class="num">${r.libere}</b> ancora da proporre</span>
        ${r.libere?`<button class="btn sm" data-act="eq-filtra" data-k="${key}" data-v="${esc(r.k)}">Vedi i ${r.libere} da proporre</button>`:''}</div>
        ${senza.length?`<p class="small eqsenza">Nessun piatto proposto di: <b>${esc(elenca(senza))}</b></p>`:''}</div>`;
    }).join('')}</div>`;
}
function vEquilibrio(){
  const d=eqRowsData();
  const manca=d.cat.filter(r=>r.v&&r.v.k==='manca').map(r=>`${r.label} (${r.tot} su ${r.q})`),tante=d.cat.filter(r=>r.v&&r.v.k==='molte').map(r=>r.q!=null?`${r.label} (${r.tot} per ${r.q} posti)`:`${r.label} (${r.tot} proposte)`);
  const catSenza=d.cat.filter(r=>r.tot>0).map(r=>[r.label,r.reg.filter(g=>g.r&&!g.p).map(g=>REG_SHORT[g.r]||g.r)]).filter(x=>x[1].length).map(x=>`${x[0]} (senza ${elenca(x[1])})`);
  const regPoche=d.reg.filter(r=>r.v&&r.v.k==='poche').map(r=>r.label),catPoche=d.cat.filter(r=>r.v&&r.v.k==='poche').map(r=>r.label);
  const righe=[
    manca.length?`<b>Ne servono altre:</b> ${esc(manca.join(', '))}.`:'',
    tante.length?`<b>Ce ne sono molte:</b> ${esc(tante.join(', '))}: la scelta sarà dura, meglio un voto per categoria.`:'',
    catSenza.length?`<b>Regioni assenti per portata:</b> ${esc(catSenza.join('; '))}.`:'',
    catPoche.length?`<b>Portate con poca scelta:</b> ${esc(catPoche.join(', '))}.`:'',
    regPoche.length?`<b>Regioni con poche proposte:</b> ${esc(regPoche.join(', '))}.`:'',
    !S.recipes.length?'Ancora nessuna proposta: le barre tratteggiate sono i piatti dei Suggerimenti che aspettano di essere proposti.':'',
    S.recipes.length&&!manca.length&&!tante.length&&!regPoche.length&&!catPoche.length&&!catSenza.length?'Per ora le proposte sono ben distribuite.':''
  ].filter(Boolean);
  return `<section class="panel eq" id="sg-eq"><h3>Equilibrio: regioni, portate e vini</h3>
    <p class="small muted" style="margin-top:6px">Quanti piatti abbiamo già (proposti e in menu) e quanti restano ancora da proporre nei Suggerimenti, così vedi dove il banchetto è sbilanciato. Formato del menu in uso: <b>${esc(d.fm.nome)}</b>, ${d.fm.tot} piatti.</p>
    <div class="legend" aria-label="Legenda dei colori">${REGIONI.map(r=>`<span><i class="lg g" style="--c:${regColor(r)}"></i> ${esc(r)}</span>`).join('')}${[d.reg,d.cat,d.wt].some(rows=>rows.some(x=>x.reg.some(g=>!g.r)))?`<span><i class="lg g" style="--c:${regColor('')}"></i> Regione non indicata</span>`:''}</div>
    <div class="legend"><span><i class="lg g p" style="--c:${regColor(REGIONI[0])}"></i> Colore pieno: già proposti</span><span><i class="lg g l" style="--c:${regColor(REGIONI[0])}"></i> Tratteggiato: ancora da proporre (nei Suggerimenti)</span></div>
    <div class="note" style="margin-top:10px">${righe.join('<br>')}</div>
    <div class="eqgrid2">${eqBlock('Per regione','Ogni regione ha il suo colore, lo stesso in tutte le barre qui sotto.',d.reg,'reg')}${eqBlock('Per portata',(d.q?'Con i posti che il formato lascia a ogni portata nel menu. ':'Il formato scelto non fissa quote per portata. ')+'I contorni sono extra: non entrano nel conteggio. Le barre sono divise per regione: se un colore manca, manca quella regione.',d.cat,'cat')}${eqBlock('Per tipo di vino','Solo i piatti del catalogo, per abbinamento di vino e per regione.',d.wt,'wt')}</div></section>`;
}
function vSugg(){
  const all=sugList(),list=filterSug(all),lib=all.length;
  const gia=SUG.length-lib,inMenu=SUG.filter(s=>sugState(s)==='menu').length;
  const catsLib=CATS.filter(c=>all.some(x=>x.s.c===c.key));
  const chips=[['','Tutte']].concat(catsLib.map(c=>[c.key,c.label])).map(c=>`<button class="fchip" aria-pressed="${UI.scat===c[0]}" data-act="scat" data-v="${c[0]}">${esc(c[1])}</button>`).join('');
  const opt=(v,cur,lab)=>`<option value="${esc(v)}" ${cur===v?'selected':''}>${esc(lab)}</option>`;
  let body;
  if(!lib)body=`<div class="empty"><h3>Tutti i piatti del catalogo sono già stati proposti</h3><p>Se ne hai in mente un altro, proponilo dalla scheda Proposte.</p><button class="btn" data-act="tab" data-v="proposte">Vai alle Proposte</button></div>`;
  else if(!list.length)body=`<div class="empty"><h3>Nessun piatto con questi filtri</h3><button class="btn" data-act="sclear">Azzera filtri</button></div>`;
  else if(UI.ssort==='cat')body=CATS.map(c=>[c,list.filter(x=>x.s.c===c.key)]).filter(g=>g[1].length)
    .map(([c,xs])=>`<div><h3 class="grp" style="--h:${c.h}">${esc(c.label)} <span class="muted small num">${xs.length}</span></h3><div class="cards">${xs.map(x=>sugCard(x,true)).join('')}</div></div>`).join('');
  else body=`<div class="cards">${list.map(x=>sugCard(x,false)).join('')}</div>`;
  const weakN=sugLibere().filter(s=>s.weak).length;
  return `<section class="view">
    <div class="hero-sug">
      <div class="hs-l"><h2><span class="hs-num" aria-hidden="true">${lib}</span><span><span class="sr">${lib} </span>ricette ancora da proporre</span></h2>
        <p>Piatti tradizionali del Triveneto con foto, fonte, vino in abbinamento e note di esecuzione. Ne scegli uno e lo proponi con un tocco: link, foto, vino e tempi sono già compilati. Quelli già proposti spariscono da questo elenco.</p></div>
      <div class="hs-r"><div class="hs-meta"><span><b class="num">${lib}</b> da proporre</span><span><b class="num">${gia}</b> già proposti${inMenu?` (${inMenu} in menu)`:''}</span></div>
        <button class="btn sm hs-eq" data-act="eq-go">Cosa manca? Vedi l’equilibrio ↓</button>
        <div class="hs-regs" role="group" aria-label="Filtra per regione">${REGIONI.map(r=>`<button class="chip reg" style="--h:${REG_H[r]}" aria-pressed="${UI.sreg===r}" data-act="sreg" data-v="${esc(r)}">${esc(REG_SHORT[r])} <span class="num">${all.filter(x=>x.s.r===r).length}</span></button>`).join('')}</div></div>
    </div>
    <div class="filters">
      <div class="field wide"><label for="sq">Cerca piatto, ingrediente o vino</label><input type="search" id="sq" data-in="sq" value="${esc(UI.sq)}" placeholder="es. polenta, Soave, anatra…"></div>
      <div class="field"><label for="swt">Tipo di vino</label><select id="swt" data-chg="swt"><option value="">Tutti</option>${WTYPES.map(w=>opt(w,UI.swt,w)).join('')}</select></div>
      <div class="field"><label for="slv">Livello fonte</label><select id="slv" data-chg="slv"><option value="">Tutti</option>${['A','B','C'].map(l=>opt(l,UI.slv,LIVELLI[l].t)).join('')}${opt('-',UI.slv,'Da assegnare')}</select></div>
      <div class="field"><label for="ssort">Ordina per</label><select id="ssort" data-chg="ssort">${opt('cat',UI.ssort,'Portata')}${opt('lv',UI.ssort,'Livello della fonte')}${opt('reg',UI.ssort,'Regione')}${opt('az',UI.ssort,'Nome')}</select></div>
    </div>
    <div class="filterchips">${chips}</div>
    <p class="small muted" id="sg-list">Mostro <b class="num">${list.length}</b> piatti su ${lib} ancora da proporre.</p>
    ${body}
    ${vEquilibrio()}
    <details class="panel" id="sg-tips" ${isOpen('sg-tips')}><summary style="cursor:pointer;font-weight:600">Consigli di regia per il banchetto</summary>
      <div class="cols" style="margin-top:12px"><div><h4>Tre farine di mais</h4><p class="small">Biancoperla per il pesce di laguna (schie, seppie, boreto); gialla fine per gli intingoli friulani (toc' in braide, salame all'aceto, blecs); Storo o Marano a grana rustica per selvaggina e brasati.</p></div>
      <div><h4>Le 24 ore</h4><p class="small">Brasato al Teroldego, pearà, base dei fasioi e seppie in nero migliorano se fatti il giorno prima: l'energia dell'ultimo momento va a fritture e pasta fresca.</p></div>
      <div><h4>Equilibrio e acidità</h4><p class="small">Aceto caldo (boreto, salame), crauti (tirtlan) e mirtilli rossi (capriolo, kaiserschmarrn) ripuliscono il palato tra una portata e l'altra. Evita troppi piatti simili: te lo segnalo qui e nel menu.</p></div></div></details>
    <details class="panel" id="sg-lv" ${isOpen('sg-lv')}><summary style="cursor:pointer;font-weight:600">Come leggere i livelli delle fonti e le foto</summary>
      <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px">${['A','B','C'].map(l=>`<p class="small">${lvBadge(l)} ${esc(LIVELLI[l].d)}</p>`).join('')}
      <p class="small">${badge('Livello da assegnare','muted')} I piatti della seconda rassegna non hanno ancora un livello: i loro link vanno controllati.${weakN?` In ${weakN} casi il link è generico o rimanda a un altro piatto, e sono segnati "Link da sostituire".`:''}</p>
      <p class="small">${badge('Creata con AI','warn')} Dove non c'è una foto in una fonte affidabile l'immagine è stata creata con l'intelligenza artificiale a partire dalla ricetta: è un'illustrazione, non il piatto vero, e può avere dettagli sbagliati. Si può sostituire con una foto vera dalla scheda del piatto.</p>
      <p class="small muted">Le fonti sono quelle dei due documenti del gruppo; i volumi cartacei di riferimento non sono stati consultati. I vini senza la scritta "suggerito" vengono dal documento, gli altri sono abbinamenti proposti per completare il catalogo.</p></div></details>
  </section>`;
}
A['sug-propose']=t=>{
  const s=sugById(t.dataset.id);if(!s)return;
  if(!canPropose()){toast('Le proposte sono chiuse.','err');return;}
  openRecipeEditor(null,sugPre(s));
};
A['eq-go']=()=>{const e=document.getElementById('sg-eq');if(e)e.scrollIntoView({block:'start',behavior:'smooth'});};
A['eq-filtra']=t=>{
  UI.sq='';UI.scat='';UI.sreg='';UI.swt='';UI.slv='';
  const k=t.dataset.k,v=t.dataset.v;if(k==='reg')UI.sreg=v;else if(k==='cat')UI.scat=v;else if(k==='wt')UI.swt=v;
  render();const e=document.getElementById('sg-list');if(e)e.scrollIntoView({block:'start'});
};
A.scat=t=>{UI.scat=t.dataset.v;render();};
A.sclear=()=>{UI.sq='';UI.scat='';UI.sreg='';UI.swt='';UI.slv='';render();};
IN.sq=t=>{UI.sq=t.value;render();};
A.sreg=t=>{UI.sreg=UI.sreg===t.dataset.v?'':t.dataset.v;render();};
['swt','slv','ssort'].forEach(k=>{CH[k]=t=>{UI[k]=t.value;render();};});
