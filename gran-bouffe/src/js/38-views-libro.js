/* ============ "Il libro": ricette e considerazioni di «Giorni Golosi», collegate alle proposte ============ */
const ingTxt=i=>{
  const u=String(i.unit||'');
  if(u==='q.b.'||!num(i.qty))return 'q.b.';
  return (u==='g'||u==='ml')?fmtQty(u,num(i.qty)):fmtN(num(i.qty))+' '+u;
};
function libroRicettaHtml(rc,id){
  return `<details class="rl" id="rl-${esc(id)}" ${isOpen('rl-'+id)}><summary>Ricetta del libro: ${esc(rc.titolo)} (per ${rc.serves} persone)</summary>
    <div class="cols" style="margin-top:10px"><div><h4>Ingredienti</h4><ul class="steps" style="padding-left:18px;margin-top:6px;gap:3px">${rc.ing.map(i=>`<li>${esc(i.name)}: <b>${esc(ingTxt(i))}</b></li>`).join('')}</ul></div>
    <div><h4>Procedimento</h4><ol class="steps" style="margin-top:6px">${rc.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol></div></div>
    ${rc.cons?`<p class="small muted" style="margin-top:8px">${esc(rc.cons)}</p>`:''}</details>`;
}
function vLibro(){
  const n=S.recipes.filter(libroFor).length;
  const regs=LIBRO.reg.map(g=>{
    const chips=g.piatti.map(id=>{const r=libroProposta(id);return r
      ?`<button class="fchip" data-act="open-dish" data-id="${esc(r.id)}">${esc(r.title)}</button>`
      :`<span class="chip plain">${esc(LIBRO_N[id]||id)}</span>`;}).join(' ');
    const rc=LIBRO.ricette[g.festa.ric];
    return `<section class="panel rcard" style="--h:${g.h}"><div class="row spread"><h3>${esc(g.nome)}</h3><span class="badge info">${esc(g.pag)}</span></div>
      <p style="margin-top:10px">${esc(g.intro)}</p>
      <div class="festa"><b>${esc(g.festa.nome)}</b> · ${esc(g.festa.quando)} · ${esc(g.festa.cosa)}</div>
      <div class="pens">${g.pensieri.map((p,i)=>`<details id="lp-${g.k}-${i}" ${isOpen('lp-'+g.k+'-'+i)}><summary>${esc(p.t)}</summary><p>${esc(p.x)}</p></details>`).join('')}</div>
      ${libroRicettaHtml(rc,g.festa.ric)}
      <div><span class="lbl">Piatti del libro tra le proposte</span><div class="filterchips" style="margin-top:6px">${chips}</div></div></section>`;
  }).join('');
  const cerca=LIBRO.cerca.map(c=>`<div class="row spread" style="padding:8px 0;border-top:1px dashed var(--line)"><span><b>${esc(c.n)}</b> <span class="chip plain">${esc(c.reg)}</span><br><span class="small muted">${esc(c.x)}</span></span>
    <button class="btn sm" data-act="libro-proponi" data-n="${esc(c.n)}" ${canPropose()?'':'disabled'}>Proponi</button></div>`).join('');
  return `<section class="view">
    <div class="libro-hero"><p class="film">dal libro</p><h2>${esc(LIBRO.t)}</h2><p>${esc(LIBRO.sub)}. Di ${esc(LIBRO.aut)}, ${esc(LIBRO.ed)}.</p>
      <p class="small">Le ricette citate nelle pagine su Trentino-Alto Adige, Veneto e Friuli-Venezia Giulia sono tra le Proposte (<b class="num">${n}</b> con il segno «Dal libro»); qui le riflessioni storico-culturali del libro.</p>
      <div class="row"><button class="btn primary" data-act="libro-filtro">Vedi le proposte dal libro</button></div></div>
    <div><h3 class="grp">L’idea del libro</h3><div class="idee">${LIBRO.idee.map(i=>`<div class="panel"><h4>${esc(i.t)}</h4><p class="small" style="margin-top:6px">${esc(i.x)}</p></div>`).join('')}</div></div>
    <div><h3 class="grp">Le tre regioni</h3><div style="display:flex;flex-direction:column;gap:16px">${regs}</div></div>
    <div class="panel"><h3>Citati nel libro, ricetta ancora da trovare</h3><p class="hint" style="margin:6px 0">Nominati nell’introduzione della regione, ma senza una ricetta su una fonte della lista. Se ne trovi una, proponili con il link.</p>${cerca}</div></section>`;
}
/* riquadro nella scheda del piatto */
function libroPanel(r){
  const l=libroFor(r);if(!l)return '';
  const g=LIBRO.reg.find(x=>x.k===l.reg),rc=libroRecipe(r);
  const vuota=!(r.ingredients||[]).length&&!(r.steps||[]).length;
  const conf=UI.confirm==='libro:'+r.id;
  return `<div class="panel libro"><div class="row spread"><h3>Dal libro «${esc(LIBRO.t)}»</h3><span class="badge info">${esc(l.pag)}</span></div>
    <p style="margin-top:8px">${esc(l.nota)}</p>
    ${rc?libroRicettaHtml(rc,'p-'+rc.key):''}
    <div class="row" style="margin-top:10px">${rc&&canEditRecipe(r)?(vuota||conf
      ?`<button class="btn sm primary" data-act="libro-usa" data-id="${esc(r.id)}">${conf?'Sì, sostituisci ingredienti e procedimento':'Usa questa ricetta nella scheda'}</button>${conf?`<button class="btn sm" data-act="del-cancel">No</button>`:''}`
      :`<button class="btn sm" data-act="libro-usa" data-id="${esc(r.id)}">Sostituisci la scheda con la ricetta del libro</button>`):''}
      <button class="btn sm" data-act="tab" data-v="libro">${esc(g?g.nome:'Il libro')}: le riflessioni →</button></div></div>`;
}
A['libro-filtro']=()=>{UI.navigated=true;UI.libro=true;UI.tab='proposte';UI.dish=null;setHash('proposte');render();window.scrollTo(0,0);};
A['libro-proponi']=t=>{
  const c=LIBRO.cerca.find(x=>x.n===t.dataset.n);if(!c)return;
  if(!canPropose()){toast('Le proposte sono chiuse.','err');return;}
  openRecipeEditor(null,{title:c.n,category:'dolci',region:c.reg,note:'Citato nel libro «'+LIBRO.t+'»: '+c.x});
};
A['libro-usa']=async t=>{
  const r=R(t.dataset.id),rc=r&&libroRecipe(r);if(!r||!rc||!canEditRecipe(r))return;
  const vuota=!(r.ingredients||[]).length&&!(r.steps||[]).length;
  if(!vuota&&UI.confirm!=='libro:'+r.id){UI.confirm='libro:'+r.id;render();return;}
  UI.confirm='';
  const patch={ingredients:rc.ing.map(i=>({name:i.name,qty:i.qty,unit:i.unit,shop:i.shop})),steps:rc.steps.slice(),serves:rc.serves};
  if(rc.fasi&&rc.fasi.length&&!(r.fasi||[]).length)patch.fasi=rc.fasi.map(f=>({label:f.label,ore:f.ore}));
  if(await write('update','recipes/'+r.id,patch))toast('Scheda compilata con la ricetta del libro (per '+rc.serves+' persone)');
  render();
};
