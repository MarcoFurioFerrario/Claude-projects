/* ============ editor (finestre modali con bozza locale) ============ */
let DR=null;
const setPath=(o,path,v)=>{const ks=path.split('.');let c=o;for(let i=0;i<ks.length-1;i++){if(c[ks[i]]==null||typeof c[ks[i]]!=='object')c[ks[i]]={};c=c[ks[i]];}c[ks[ks.length-1]]=v;};

IN.dr=t=>{
  if(!DR)return;
  const f=t.dataset.f;
  setPath(DR,f,t.type==='checkbox'?t.checked:t.value);
  if(f==='category'||f==='title')renderIdeas();
};
CH.dr=t=>{
  if(!DR)return;
  setPath(DR,t.dataset.f,t.type==='checkbox'?t.checked:t.value);
  if(t.dataset.f==='category')renderIdeas();
};
IN.row=t=>{if(DR)DR[t.dataset.l][+t.dataset.i][t.dataset.k]=t.value;};
CH.row=IN.row;

/* ---------- proposta ---------- */
function ownersHtml(){
  return sortedPeople().map(p=>`<button type="button" class="pick" aria-pressed="${DR.ownerIds.includes(p.id)}" data-act="dr-owner" data-id="${esc(p.id)}">${esc(p.name)}</button>`).join('');
}
function renderOwners(){const e=$('#ed-owners');if(e)e.innerHTML=ownersHtml();}
function renderIdeas(){
  const e=$('#ed-ideas');if(!e||DR.id)return;
  const q=norm(DR.title);
  const list=SUG.filter(i=>(!DR.category||i.c===DR.category)&&sugState(i)==='libera'&&(!q||norm(i.t).indexOf(q)>=0)).slice(0,8);
  const dup=q.length>2?S.recipes.filter(r=>r.id!==DR.id&&(norm(r.title).includes(q)||q.includes(norm(r.title)))):[];
  e.innerHTML=(dup.length?`<p class="err">Esiste già una proposta simile: ${esc(dup.map(r=>r.title).join(', '))}.</p>`:'')
    +(list.length?`<span class="hint">Dai suggerimenti:</span> ${list.map(i=>`<button type="button" class="idea" data-act="dr-idea" data-id="${esc(i.id)}">${esc(i.t)}</button>`).join(' ')}`:'');
}
A['dr-owner']=t=>{
  const id=t.dataset.id,i=DR.ownerIds.indexOf(id);
  if(i<0)DR.ownerIds.push(id);else DR.ownerIds.splice(i,1);
  renderOwners();
};
function syncRecipeInputs(){
  $('#ed-title').value=DR.title;$('#ed-cat').value=DR.category;$('#ed-reg').value=DR.region;$('#ed-link').value=DR.link;
}
A['dr-idea']=t=>{
  const s=sugById(t.dataset.id);if(!s)return;
  Object.assign(DR,sugPre(s));syncRecipeInputs();renderIdeas();$('#ed-link').focus();
};
function openRecipeEditor(id,pre){
  const r=id?R(id):null;
  if(!S.meId){toast('Scegli prima il tuo nome.','err');return;}
  DR={id:id||null,title:r?r.title:'',category:r?r.category:(UI.cat||'primi'),region:r?r.region||'':'',link:r?r.link:'',note:r?r.note||'':'',
    ownerIds:r?[...(r.ownerIds||[])]:[S.meId],ver:Object.assign({stato:'da_verificare',linkAutorevole:'',fonte:'',nota:''},r&&r.verifica||{}),sugId:'',fasi:[],vini:[],verStato:'da_verificare',verNota:''};
  if(pre&&!id)Object.assign(DR,pre);
  const org=isOrg();
  openModal(`<header><div><h3>${id?'Modifica proposta':'Proponi un piatto'}</h3><p class="hint">${id?'Proposto da '+esc(pname(r.proposerId)):'Proponente: '+esc(me().name)}</p></div><button class="btn sm" data-act="modal-close">Annulla</button></header>
    <div class="field"><label for="ed-title">Nome del piatto *</label><input type="text" id="ed-title" data-in="dr" data-f="title" value="${esc(DR.title)}" placeholder="es. Risi e bisi" autocomplete="off"></div>
    <div id="ed-ideas" class="row" style="gap:6px"></div>
    <div class="formgrid"><div class="field"><label for="ed-cat">Categoria *</label><select id="ed-cat" data-chg="dr" data-f="category">${CATS.map(c=>`<option value="${c.key}" ${DR.category===c.key?'selected':''}>${esc(c.label)}</option>`).join('')}</select></div>
    <div class="field"><label for="ed-reg">Regione</label><select id="ed-reg" data-chg="dr" data-f="region"><option value="">Non specificata</option>${REGIONI.map(x=>`<option ${DR.region===x?'selected':''}>${esc(x)}</option>`).join('')}</select></div></div>
    <div class="field"><label for="ed-link">Link alla ricetta *</label><input type="url" id="ed-link" data-in="dr" data-f="link" value="${esc(DR.link)}" placeholder="https://…" inputmode="url" autocomplete="off">
      <span class="hint">Meglio una fonte autorevole. Il link viene controllato e affiancato da una fonte di riferimento.</span></div>
    <div class="field"><span class="lbl">Chi lo cucina (almeno uno) *</span><div class="pickrow" id="ed-owners">${ownersHtml()}</div></div>
    <div class="field"><label for="ed-note">Note (facoltative)</label><textarea id="ed-note" data-in="dr" data-f="note" placeholder="Perché lo proponi, varianti, difficoltà…">${esc(DR.note)}</textarea></div>
    ${org&&id?`<div class="panel" style="display:flex;flex-direction:column;gap:10px"><h4>Verifica del link (organizzatore)</h4>
      <div class="formgrid"><div class="field"><label for="ed-vs">Stato</label><select id="ed-vs" data-chg="dr" data-f="ver.stato">${Object.keys(VSTATI).map(k=>`<option value="${k}" ${DR.ver.stato===k?'selected':''}>${esc(VSTATI[k].label)}</option>`).join('')}</select></div>
      <div class="field"><label for="ed-vf">Nome della fonte</label><input type="text" id="ed-vf" data-in="dr" data-f="ver.fonte" value="${esc(DR.ver.fonte||'')}" placeholder="es. La Cucina Italiana"></div></div>
      <div class="field"><label for="ed-va">Link alla fonte autorevole</label><input type="url" id="ed-va" data-in="dr" data-f="ver.linkAutorevole" value="${esc(DR.ver.linkAutorevole||'')}" placeholder="https://…"></div>
      <div class="field"><label for="ed-vn">Nota</label><input type="text" id="ed-vn" data-in="dr" data-f="ver.nota" value="${esc(DR.ver.nota||'')}"></div></div>`:''}
    <p class="err" id="ed-err" hidden></p>
    <div class="foot"><button class="btn" data-act="modal-close">Annulla</button><button class="btn primary" data-act="save-recipe">${id?'Salva modifiche':'Aggiungi la proposta'}</button></div>`,
    ()=>{renderIdeas();});
}
A['new-recipe']=()=>{if(!canPropose()){toast('Le proposte sono chiuse.','err');return;}openRecipeEditor(null);};
A['edit-recipe']=t=>openRecipeEditor(t.dataset.id);
A['save-recipe']=async()=>{
  const err=m=>{const e=$('#ed-err');e.textContent=m;e.hidden=false;e.scrollIntoView({block:'nearest'});};
  const title=DR.title.trim(),link=DR.link.trim();
  if(!title)return err('Scrivi il nome del piatto.');
  if(!DR.category)return err('Scegli la categoria.');
  if(!link)return err('Aggiungi il link alla ricetta.');
  if(!isUrl(link))return err('Il link deve cominciare con http:// o https://.');
  if(!DR.ownerIds.length)return err('Indica almeno una persona che cucinerà il piatto.');
  let ok;
  if(DR.id){
    const r=R(DR.id);
    const patch={title,category:DR.category,region:DR.region,link,note:DR.note.trim(),ownerIds:DR.ownerIds};
    if(link!==r.link)patch.verifica={stato:'da_verificare'};
    else if(isOrg())patch.verifica={stato:DR.ver.stato,fonte:DR.ver.fonte||'',linkAutorevole:DR.ver.linkAutorevole||'',nota:DR.ver.nota||''};
    if(isOrg()&&DR.ver.linkAutorevole&&!isUrl(DR.ver.linkAutorevole))return err('Il link alla fonte autorevole non è valido.');
    ok=await write('update','recipes/'+DR.id,patch);
  }else{
    ok=await write('set','recipes/'+uid('r'),{title,category:DR.category,region:DR.region,link,note:DR.note.trim(),proposerId:S.meId,ownerIds:DR.ownerIds,teamIds:[],
      createdAt:Date.now(),verifica:{stato:DR.verStato||'da_verificare',nota:DR.verNota||''},sugId:DR.sugId||'',slot:'',serves:4,porzione:'normale',ingredients:[],steps:[],fasi:DR.fasi||[],preparabileACasa:false,vini:DR.vini||[],consigli:''});
  }
  if(ok){closeModal();toast(DR.id?'Proposta aggiornata':'Proposta aggiunta');DR=null;}
};

/* ---------- scheda piatto ---------- */
const rowIng=(g,i)=>`<div class="erow"><input type="text" list="dl-ing" data-in="row" data-l="ing" data-i="${i}" data-k="name" value="${esc(g.name)}" placeholder="Ingrediente" aria-label="Ingrediente">
  <input type="text" inputmode="decimal" data-in="row" data-l="ing" data-i="${i}" data-k="qty" value="${esc(g.qty===''||g.qty==null?'':g.qty)}" placeholder="Quantità" aria-label="Quantità">
  <select data-chg="row" data-l="ing" data-i="${i}" data-k="unit" aria-label="Unità">${UNITS.map(u=>`<option ${canonU(g.unit)===canonU(u)?'selected':''}>${esc(u)}</option>`).join('')}</select>
  <select data-chg="row" data-l="ing" data-i="${i}" data-k="shop" aria-label="Dove si compra">${SHOPS.filter(s=>s.key!=='cantina').map(s=>`<option value="${s.key}" ${g.shop===s.key?'selected':''}>${esc(s.short)}</option>`).join('')}</select>
  <button type="button" class="btn sm ico danger" data-act="row-del" data-l="ing" data-i="${i}" aria-label="Rimuovi">✕</button></div>`;
const rowVino=(g,i)=>`<div class="erow v"><input type="text" data-in="row" data-l="vini" data-i="${i}" data-k="nome" value="${esc(g.nome)}" placeholder="Vino (es. Soave Classico)" aria-label="Vino">
  <input type="text" inputmode="decimal" data-in="row" data-l="vini" data-i="${i}" data-k="bottiglie" value="${esc(g.bottiglie===''||g.bottiglie==null?'':g.bottiglie)}" placeholder="Bott." aria-label="Bottiglie">
  <button type="button" class="btn sm ico danger" data-act="row-del" data-l="vini" data-i="${i}" aria-label="Rimuovi">✕</button></div>`;
const rowFase=(g,i)=>`<div class="erow f"><input type="text" data-in="row" data-l="fasi" data-i="${i}" data-k="label" value="${esc(g.label)}" placeholder="Es. Mettere a bagno il baccalà" aria-label="Fase">
  <input type="text" inputmode="decimal" data-in="row" data-l="fasi" data-i="${i}" data-k="ore" value="${esc(g.ore===''||g.ore==null?'':g.ore)}" placeholder="Ore prima" aria-label="Ore di anticipo">
  <button type="button" class="btn sm ico danger" data-act="row-del" data-l="fasi" data-i="${i}" aria-label="Rimuovi">✕</button></div>`;
const ROWS={ing:rowIng,vini:rowVino,fasi:rowFase};
function renderRows(l){const e=$('#rows-'+l);if(e)e.innerHTML=DR[l].map((g,i)=>ROWS[l](g,i)).join('')||`<p class="hint">Nessuna riga.</p>`;}
function renderTeam(){const e=$('#ed-team');if(e)e.innerHTML=sortedPeople().filter(p=>!DR.ownerIds.includes(p.id)).map(p=>`<button type="button" class="pick" aria-pressed="${DR.teamIds.includes(p.id)}" data-act="dr-team" data-id="${esc(p.id)}">${esc(p.name)}</button>`).join('');}
A['dr-team']=t=>{const id=t.dataset.id,i=DR.teamIds.indexOf(id);if(i<0)DR.teamIds.push(id);else DR.teamIds.splice(i,1);renderTeam();};
A['row-add']=t=>{
  const l=t.dataset.l;
  DR[l].push(l==='ing'?{name:'',qty:'',unit:'g',shop:'dispensa'}:l==='vini'?{nome:'',bottiglie:1}:{label:'',ore:''});
  renderRows(l);
  const last=$$('#rows-'+l+' input[type=text]');const el=last[last.length-2];if(el)el.focus();
};
A['row-del']=t=>{DR[t.dataset.l].splice(+t.dataset.i,1);renderRows(t.dataset.l);};
function openDishEditor(id){
  const r=R(id);if(!r)return;
  DR={id,serves:num(r.serves)||4,porzione:r.porzione||'normale',casa:!!r.preparabileACasa,
    ing:(r.ingredients||[]).map(i=>({name:i.name,qty:i.qty==null?'':i.qty,unit:i.unit||'g',shop:i.shop||'dispensa'})),
    vini:(r.vini||[]).map(v=>({nome:v.nome,bottiglie:v.bottiglie})),
    fasi:(r.fasi||[]).map(f=>({label:f.label,ore:f.ore})),
    stepsText:(r.steps||[]).join('\n'),consigli:r.consigli||'',teamIds:[...(r.teamIds||[])],ownerIds:[...(r.ownerIds||[])]};
  const names=[...new Set(S.recipes.flatMap(x=>(x.ingredients||[]).map(i=>cap1(i.name))))].sort((a,b)=>a.localeCompare(b,'it'));
  openModal(`<header><div><h3>Scheda: ${esc(r.title)}</h3><p class="hint">Le quantità sono per il numero di persone indicato qui sotto. La spesa le scala sui confermati.</p></div><button class="btn sm" data-act="modal-close">Annulla</button></header>
    ${sampleCap?`<div class="panel" style="display:flex;flex-direction:column;gap:8px"><div class="row spread"><div><h4>Bozza con Claude</h4><p class="hint">Propone ingredienti, procedimento, tempi e vini. Claude non apre il link: scrive dalla ricetta tradizionale, quindi controlla sempre le dosi sulla fonte.</p></div>
      <button class="btn" data-act="ai-draft" id="ai-btn">Genera bozza</button></div><p class="small" id="ai-msg" hidden></p></div>`:''}
    <div class="formgrid"><div class="field"><label for="d-serves">La ricetta è per (persone)</label><input type="number" id="d-serves" min="1" step="1" data-in="dr" data-f="serves" value="${DR.serves}"></div>
    <div class="field"><label for="d-porz">Dimensione porzione</label><select id="d-porz" data-chg="dr" data-f="porzione">${Object.keys(PORZ).map(k=>`<option value="${k}" ${DR.porzione===k?'selected':''}>${esc(PORZ[k].label)}</option>`).join('')}</select></div></div>
    <p class="hint" style="margin-top:-8px">Con molti piatti nello stesso pasto conviene la porzione “assaggio”.</p>
    <div class="field"><span class="lbl">Ingredienti</span><datalist id="dl-ing">${names.map(n=>`<option value="${esc(n)}">`).join('')}</datalist>
      <div class="erow h"><span>Ingrediente</span><span>Quantità</span><span>Unità</span><span>Dove</span><span></span></div>
      <div id="rows-ing" style="display:flex;flex-direction:column;gap:6px"></div><div><button type="button" class="btn sm" data-act="row-add" data-l="ing">+ Ingrediente</button></div></div>
    <div class="field"><label for="d-steps">Procedimento (un passaggio per riga)</label><textarea id="d-steps" rows="7" data-in="dr" data-f="stepsText" placeholder="Scrivi i passaggi con parole tue; i dettagli restano nella ricetta di riferimento.">${esc(DR.stepsText)}</textarea></div>
    <div class="field"><span class="lbl">Tempi: cosa va avviato in anticipo</span><p class="hint">Indica le ore prima del servizio. Es. brodo che riposa 24 ore → 24; cottura di 3 ore → 3.</p>
      <div id="rows-fasi" style="display:flex;flex-direction:column;gap:6px"></div><div><button type="button" class="btn sm" data-act="row-add" data-l="fasi">+ Fase</button></div></div>
    <label class="checkline"><input type="checkbox" id="d-casa" data-in="dr" data-f="casa" ${DR.casa?'checked':''}> La parte lunga si prepara a casa prima di partire (e si porta già pronta)</label>
    <div class="field"><span class="lbl">Vini in abbinamento (bottiglie per le persone indicate sopra; 0 = solo abbinamento)</span>
      <div id="rows-vini" style="display:flex;flex-direction:column;gap:6px"></div><div><button type="button" class="btn sm" data-act="row-add" data-l="vini">+ Vino</button></div></div>
    <div class="field"><label for="d-cons">Consigli</label><textarea id="d-cons" rows="3" data-in="dr" data-f="consigli">${esc(DR.consigli)}</textarea></div>
    <div class="field"><span class="lbl">Squadra di preparazione (oltre ai responsabili)</span><div class="pickrow" id="ed-team"></div></div>
    <p class="err" id="ed-err" hidden></p>
    <div class="foot"><button class="btn" data-act="modal-close">Annulla</button><button class="btn primary" data-act="save-dish">Salva scheda</button></div>`,
    ()=>{renderRows('ing');renderRows('fasi');renderRows('vini');renderTeam();});
}
A['edit-dish']=t=>openDishEditor(t.dataset.id);
A['save-dish']=async()=>{
  const err=m=>{const e=$('#ed-err');e.textContent=m;e.hidden=false;e.scrollIntoView({block:'nearest'});};
  const serves=Math.max(1,Math.round(num(DR.serves)));
  if(!num(DR.serves))return err('Indica per quante persone è la ricetta.');
  const ingredients=[];
  for(const g of DR.ing){
    const name=String(g.name||'').trim();if(!name)continue;
    const u=normUnit(g.unit),q=num(g.qty);
    if(u.base!=='qb'&&!q)return err(`Manca la quantità di “${name}” (oppure scegli q.b.).`);
    ingredients.push({name,qty:u.base==='qb'?null:q,unit:u.base==='qb'?'q.b.':g.unit,shop:g.shop||'dispensa'});
  }
  const vini=DR.vini.filter(v=>String(v.nome||'').trim()).map(v=>({nome:String(v.nome).trim(),bottiglie:Math.max(0,num(v.bottiglie))}));
  const fasi=DR.fasi.filter(f=>String(f.label||'').trim()).map(f=>({label:String(f.label).trim(),ore:Math.max(0,num(f.ore))}));
  const steps=String(DR.stepsText||'').split('\n').map(s=>s.trim()).filter(Boolean);
  const ok=await write('update','recipes/'+DR.id,{serves,porzione:DR.porzione,preparabileACasa:!!DR.casa,ingredients,vini,fasi,steps,consigli:String(DR.consigli||'').trim(),teamIds:DR.teamIds,updatedAt:Date.now()});
  if(ok){closeModal();toast('Scheda salvata');DR=null;}
};
A['ai-draft']=async()=>{
  const r=R(DR.id),btn=$('#ai-btn'),msg=$('#ai-msg');
  if(!sampleCap||!r)return;
  btn.disabled=true;msg.hidden=false;msg.textContent='Claude sta scrivendo la bozza…';
  const prompt=`Sei un cuoco esperto di cucina regionale italiana. Prepara la scheda tecnica del piatto "${r.title}" (${r.region||'Triveneto'}, categoria: ${catOf(r.category).label}).
Link scelto dal gruppo (non puoi aprirlo: usa la ricetta tradizionale che conosci e, se hai dubbi sulle dosi, scrivilo nei consigli): ${r.link}
Le quantità sono per 4 persone, per un weekend tra amici con molti piatti in sequenza.
Rispondi SOLO con un oggetto JSON di questa forma:
{"ingredienti":[{"nome":"Riso Vialone Nano","qta":320,"unita":"g","negozio":"dispensa"}],"procedimento":["passaggio sintetico"],"fasi":[{"descrizione":"Mettere a bagno i fagioli","oreAnticipo":12}],"preparabileACasa":false,"vini":[{"nome":"Soave Classico","bottiglie":1}],"consigli":"testo breve"}
Regole:
- "unita" è una tra: g, kg, ml, l, pz, spicchi, mazzi, foglie, rametti, cucchiai, cucchiaini, bustine, barattoli, confezioni, fette, bicchieri, bottiglie, teste, coste, pizzichi, q.b. (per sale, olio, pepe usa q.b. e qta 0).
- "negozio" è uno tra: carne (carne, pesce, salumi), latticini (formaggi, latte, burro, uova), ortolano (verdura, frutta, erbe), dispensa (supermercato), altro. Mai vini negli ingredienti.
- "fasi": i passaggi da avviare prima del servizio, con "oreAnticipo" = ore prima di servire (un brodo che riposa 24 ore = 24; la cottura principale va inclusa). Massimo 6 fasi.
- "preparabileACasa": true solo se si può fare per intero prima di partire e portare già pronto.
- "vini": 1 o 2 vini del Triveneto in abbinamento, con le bottiglie per 4 persone.
- "procedimento": massimo 8 passaggi brevi scritti con parole tue. Ingredienti: massimo 25.
- Tutto in italiano.`;
  try{
    const d=await sampleCap.json(prompt,{modelTier:'default'});
    const shops=SHOPS.map(s=>s.key).filter(k=>k!=='cantina');
    DR.ing=(Array.isArray(d.ingredienti)?d.ingredienti:[]).slice(0,30).map(i=>({name:String(i.nome||'').trim(),qty:num(i.qta)||'',unit:UNITS.includes(i.unita)?i.unita:(normUnit(i.unita).base==='qb'?'q.b.':'g'),shop:shops.includes(i.negozio)?i.negozio:'dispensa'})).filter(i=>i.name);
    DR.stepsText=(Array.isArray(d.procedimento)?d.procedimento:[]).slice(0,10).map(s=>String(s).trim()).filter(Boolean).join('\n');
    DR.fasi=(Array.isArray(d.fasi)?d.fasi:[]).slice(0,8).map(f=>({label:String(f.descrizione||'').trim(),ore:num(f.oreAnticipo)})).filter(f=>f.label);
    DR.vini=(Array.isArray(d.vini)?d.vini:[]).slice(0,3).map(v=>({nome:String(v.nome||'').trim(),bottiglie:num(v.bottiglie)||1})).filter(v=>v.nome);
    DR.casa=!!d.preparabileACasa;DR.consigli=String(d.consigli||'').trim();DR.serves=4;
    $('#d-serves').value=4;$('#d-steps').value=DR.stepsText;$('#d-casa').checked=DR.casa;$('#d-cons').value=DR.consigli;
    renderRows('ing');renderRows('fasi');renderRows('vini');
    msg.textContent='Bozza pronta: controlla ingredienti e dosi con la ricetta di riferimento, poi salva.';
  }catch(e){
    const m={not_granted:'Hai negato l’uso di Claude per questa pagina.',rate_limited:'Troppe richieste: riprova tra poco.',invalid_json:'La risposta non era leggibile: riprova.',upstream_error:'Servizio momentaneamente non disponibile: riprova.'};
    msg.textContent=m[e&&e.code]||'Non sono riuscito a generare la bozza.';
  }finally{btn.disabled=false;}
};

/* ---------- impostazioni del weekend ---------- */
function openSettingsEditor(){
  const st=S.settings;
  DR={dataVen:st.dataVen||'',arrivo:st.arrivo,riservaOre:st.riservaOre,margine:st.margine,orari:Object.assign({},st.orari),cap:Object.assign({},st.cap)};
  openModal(`<header><div><h3>Il weekend</h3><p class="hint">Date e orari servono a calcolare i tempi utili per ogni piatto.</p></div><button class="btn sm" data-act="modal-close">Annulla</button></header>
    <div class="formgrid"><div class="field"><label for="s-data">Data del venerdì</label><input type="date" id="s-data" data-in="dr" data-f="dataVen" value="${esc(DR.dataVen)}"></div>
    <div class="field"><label for="s-arr">Arrivo del venerdì</label><input type="time" id="s-arr" data-in="dr" data-f="arrivo" value="${esc(DR.arrivo)}"></div>
    <div class="field"><label for="s-ris">Ore per spesa e sistemazione</label><input type="number" id="s-ris" min="0" step="0.5" data-in="dr" data-f="riservaOre" value="${esc(DR.riservaOre)}"></div></div>
    <div class="formgrid">${SLOTS.map(s=>`<div class="field"><label for="s-${s.key}">${esc(s.label)} (ora)</label><input type="time" id="s-${s.key}" data-in="dr" data-f="orari.${s.key}" value="${esc(DR.orari[s.key])}"></div>`).join('')}</div>
    <div class="formgrid">${DAYS.map(d=>`<div class="field"><label for="s-cap-${d.key}">Piatti ${esc(d.label.toLowerCase())}</label><input type="number" id="s-cap-${d.key}" min="0" step="1" data-in="dr" data-f="cap.${d.key}" value="${esc(DR.cap[d.key])}"></div>`).join('')}
    <div class="field"><label for="s-mar">Margine sulla spesa (%)</label><input type="number" id="s-mar" min="0" step="5" data-in="dr" data-f="margine" value="${esc(DR.margine)}"></div></div>
    <p class="err" id="ed-err" hidden></p>
    <div class="foot"><button class="btn" data-act="modal-close">Annulla</button><button class="btn primary" data-act="save-settings">Salva</button></div>`);
}
A['edit-settings']=()=>openSettingsEditor();
async function saveSettings(patch){
  const merged=mergeSettings(Object.assign({},S.settings,patch,patch.orari?{orari:Object.assign({},S.settings.orari,patch.orari)}:{},patch.cap?{cap:Object.assign({},S.settings.cap,patch.cap)}:{}));
  return S.settingsExists?write('update','settings/main',patch):write('set','settings/main',merged);
}
A['save-settings']=async()=>{
  const err=m=>{const e=$('#ed-err');e.textContent=m;e.hidden=false;};
  if(!/^\d{1,2}:\d{2}$/.test(DR.arrivo))return err('Inserisci l’ora di arrivo.');
  for(const s of SLOTS)if(!/^\d{1,2}:\d{2}$/.test(DR.orari[s.key]))return err('Inserisci tutti gli orari dei pasti.');
  const patch={dataVen:DR.dataVen||'',arrivo:DR.arrivo,riservaOre:Math.max(0,num(DR.riservaOre)),margine:Math.max(0,num(DR.margine)),orari:DR.orari,cap:{ven:Math.max(0,Math.round(num(DR.cap.ven))),sab:Math.max(0,Math.round(num(DR.cap.sab))),dom:Math.max(0,Math.round(num(DR.cap.dom)))}};
  if(await saveSettings(patch)){closeModal();toast('Impostazioni salvate');DR=null;}
};
