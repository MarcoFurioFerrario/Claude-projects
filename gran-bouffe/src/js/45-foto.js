/* ============ foto del piatto ============
   La foto viene da una fonte affidabile: si salva solo l'indirizzo dell'immagine (recipes/<id>.foto = {url, pagina, fonte, autore, data}),
   senza copiarla, e sotto compaiono sempre il nome della fonte e il link alla pagina d'origine. */
const fotoOf=r=>{const f=r&&r.foto;return f&&isUrl(f.url)?f:null;};
const canFoto=r=>!!S.meId&&(canEditRecipe(r)||ownersOf(r).includes(S.meId));
const fotoKey=(k,f)=>k+'|'+f.url;
/* html di una foto (di una proposta o di un piatto del catalogo). Le immagini create con AI portano sempre il badge «Creata con AI». */
function fotoMarkup(f,alt,key,cls){
  const pg=isUrl(f.pagina)?f.pagina:'',nome=f.fonte||domain(pg||f.url);
  const cap=f.ai
    ?`<b>Immagine creata con AI</b> a partire dalla ricetta${f.autore?' ('+esc(f.autore)+')':''}: non è una foto del piatto vero.`
    :`Foto: ${pg?`<a href="${esc(safeHref(pg))}" target="_blank" rel="noopener noreferrer">${esc(nome)} ↗</a>`:esc(nome)}${f.autore?' · '+esc(f.autore):''}${pg?wlMark(pg):''}`;
  if(UI.fotoKo&&UI.fotoKo[fotoKey(key,f)])return `<div class="foto ko ${cls||''}"><span>${f.ai?'L’immagine creata con AI non si carica.':`La foto non si carica da qui. ${pg?`Aprila alla fonte: ${cap}`:''}`}</span></div>`;
  return `<figure class="foto ${cls||''}${f.ai?' ai':''}">${f.ai?`<span class="aib" title="Immagine creata con AI, non è una foto del piatto vero">Creata con AI</span>`:''}<img src="${esc(f.url)}" alt="${esc(alt)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" data-foto="${esc(key)}">
    <figcaption>${cap}</figcaption></figure>`;
}
const fotoFig=(r,cls)=>{const f=fotoOf(r);return f?fotoMarkup(f,'Foto: '+r.title,r.id,cls):'';};
const sugFotoFig=s=>{const f=SUG_FOTO[s.id];return f?fotoMarkup(f,'Foto: '+s.t,'sug:'+s.id,'thumb'):'';};
/* immagine che non si carica (sito che blocca il collegamento diretto, indirizzo cambiato): niente icona rotta, si mostra il link alla fonte */
document.addEventListener('error',e=>{
  const im=e.target;if(!im||im.tagName!=='IMG'||!im.dataset)return;
  if(im.dataset.tn){ // miniatura di una riga: resta il riquadro vuoto, senza ridisegnare la pagina
    const r=R(im.dataset.tn),f=fotoOf(r);if(f){UI.fotoKo=UI.fotoKo||{};UI.fotoKo[fotoKey(r.id,f)]=1;}
    const t=im.parentElement;if(t)t.classList.add('none');im.remove();return;
  }
  if(!im.dataset.foto)return;
  const key=im.dataset.foto,f=key.indexOf('sug:')===0?SUG_FOTO[key.slice(4)]:fotoOf(R(key));if(!f)return;
  UI.fotoKo=UI.fotoKo||{};UI.fotoKo[fotoKey(key,f)]=1;schedule();
},true);

/* miniatura per le righe di voto e risultati: la stessa foto della scheda in un riquadro fisso (così le colonne restano allineate);
   senza foto, o se non si carica, resta il riquadro vuoto. Le immagini create con AI portano la sigla «AI». */
function fotoThumb(r){
  const f=fotoOf(r);
  if(!f||(UI.fotoKo&&UI.fotoKo[fotoKey(r.id,f)]))return '<span class="tn none" aria-hidden="true"></span>';
  return `<span class="tn${f.ai?' ai':''}"${f.ai?' title="Immagine creata con AI"':''}><img src="${esc(f.url)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" data-tn="${esc(r.id)}"></span>`;
}

/* nella scheda del piatto: la foto, oppure il riquadro per aggiungerla */
function fotoBlock(r){
  const f=fotoOf(r),can=canFoto(r);
  if(f)return `<div class="fotobox">${fotoFig(r,'big')}${can?`<div class="row" style="gap:8px"><button class="btn sm" data-act="foto-edit" data-id="${esc(r.id)}">Cambia foto</button><button class="btn sm" data-act="foto-del" data-id="${esc(r.id)}">Togli foto</button></div>`:''}</div>`;
  return `<div class="fotobox"><div class="foto-add"><div><b>Nessuna foto per questo piatto.</b><br><span class="small muted">Si usa una foto della ricetta di riferimento, con il nome della fonte sotto.</span></div>
    ${can?`<button class="btn sm primary" data-act="foto-edit" data-id="${esc(r.id)}">+ Aggiungi foto</button>`:''}</div></div>`;
}

/* ---- finestra per aggiungere o cambiare la foto ---- */
function fotoPrev(){
  const e=$('#fo-prev');if(!e||!DR||!DR.foto)return;
  const f=DR.foto,u=String(f.url||'').trim(),pg=String(f.pagina||'').trim();
  const fo=pg&&isUrl(pg)?fonteOk(pg):null;
  e.innerHTML=(isUrl(u)?`<img src="${esc(u)}" alt="Anteprima della foto" referrerpolicy="no-referrer" class="fo-img">`:'<span class="hint">Incolla l’indirizzo dell’immagine per vedere l’anteprima.</span>')
    +(pg&&isUrl(pg)?`<p class="hint">${fo?`✓ Fonte nella lista di quelle affidabili: ${esc(fo.n)}.`:'Questo sito non è nella lista delle fonti affidabili (vedi README): se possibile scegli una foto da una di quelle.'}</p>`:'');
}
function openFotoEditor(id){
  const r=R(id);if(!r||!canFoto(r))return;
  const f=fotoOf(r)||{},v=r.verifica||{};
  DR={fid:id,foto:{url:f.url||'',pagina:f.pagina||(isUrl(v.linkAutorevole)?v.linkAutorevole:r.link)||'',fonte:f.fonte||'',autore:f.autore||''}};
  openModal(`<header><div><h3>Foto del piatto</h3><p class="hint">${esc(r.title)}. Usa una foto della ricetta di riferimento: tasto destro sull’immagine → “Copia indirizzo immagine”.</p></div><button class="btn sm" data-act="modal-close">Annulla</button></header>
    <div class="field"><label for="fo-url">Indirizzo dell’immagine *</label><input type="url" id="fo-url" data-in="dr" data-f="foto.url" value="${esc(DR.foto.url)}" placeholder="https://…/foto.jpg" inputmode="url" autocomplete="off"></div>
    <div id="fo-prev"></div>
    <div class="field"><label for="fo-pg">Pagina da cui viene la foto *</label><input type="url" id="fo-pg" data-in="dr" data-f="foto.pagina" value="${esc(DR.foto.pagina)}" placeholder="https://…" inputmode="url" autocomplete="off"></div>
    <div class="formgrid"><div class="field"><label for="fo-fonte">Nome della fonte</label><input type="text" id="fo-fonte" data-in="dr" data-f="foto.fonte" value="${esc(DR.foto.fonte)}" placeholder="se vuoto: si ricava dal sito"></div>
    <div class="field"><label for="fo-autore">Autore o crediti (facoltativo)</label><input type="text" id="fo-autore" data-in="dr" data-f="foto.autore" value="${esc(DR.foto.autore)}"></div></div>
    <p class="err" id="ed-err" hidden></p>
    <div class="foot"><button class="btn" data-act="modal-close">Annulla</button><button class="btn primary" data-act="foto-save">Salva foto</button></div>`,()=>{fotoPrev();});
}
A['foto-edit']=t=>openFotoEditor(t.dataset.id);
A['foto-save']=async()=>{
  const err=m=>{const e=$('#ed-err');e.textContent=m;e.hidden=false;};
  const id=DR&&DR.fid,r=R(id);if(!r||!canFoto(r))return;
  const url=DR.foto.url.trim(),pg=DR.foto.pagina.trim();
  if(!isUrl(url))return err('Incolla l’indirizzo dell’immagine (comincia con https://).');
  if(!/^https:/i.test(url))return err('L’indirizzo dell’immagine deve cominciare con https:// (altrimenti il browser non la mostra).');
  if(!isUrl(pg))return err('Indica la pagina della fonte da cui viene la foto: serve per citarla.');
  const fo=fonteOk(pg);
  const foto={url,pagina:pg,fonte:DR.foto.fonte.trim()||(fo?fo.n:domain(pg)),autore:DR.foto.autore.trim(),data:new Date(nowMs()).toISOString().slice(0,10)};
  if(await write('update','recipes/'+id,{foto})){closeModal();DR=null;if(UI.fotoKo)for(const k of Object.keys(UI.fotoKo))if(k.startsWith(id+'|'))delete UI.fotoKo[k];toast('Foto salvata');}
};
A['foto-del']=async t=>{
  const r=R(t.dataset.id);if(!r||!canFoto(r))return;
  if(await write('update','recipes/'+r.id,{foto:null}))toast('Foto tolta');
};
