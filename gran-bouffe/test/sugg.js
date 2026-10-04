// Prova della sezione Suggerimenti (artifact, db finto in memoria). Dati inventati solo per il test.
const {run,seed}=require('./harness');
const SUG=new Function(require('fs').readFileSync(require('path').join(__dirname,'..','src','js','05-sugg-data.js'),'utf8')+';return SUG;')(); // catalogo (dati statici), per confrontare i numeri a video
const PROPOSTI=['Tiramisù','Jota triestina','Gubana','Presnitz triestino','Bigoli in salsa','Sarde in saor']; // titoli già proposti nei dati di prova

const out=require('path').join(__dirname,'shots');require('fs').mkdirSync(out,{recursive:true});
const R=(id,title,category,region,extra)=>[`recipes/${id}`,Object.assign({title,category,region,link:'https://example.org/'+id,note:'',proposerId:'p_marco-furio',ownerIds:['p_marco-furio'],teamIds:[],createdAt:Date.now(),
  verifica:{stato:'da_verificare'},slot:'',serves:4,porzione:'normale',ingredients:[],steps:[],fasi:[],preparabileACasa:false,vini:[],consigli:''},extra||{})];
const recipes=[
  R('t1','Tiramisu','dolci','Veneto',{slot:'dom-pranzo',vini:[{nome:'Prosecco Superiore DOCG Dry',bottiglie:0}]}),
  R('t2','Jota','zuppe','Friuli-Venezia Giulia',{slot:'sab-pranzo',vini:[{nome:'Carso Terrano DOC',bottiglie:2}]}),
  R('t3','Gubana','dolci','Friuli-Venezia Giulia',{slot:'sab-cena'}),
  R('t4','Presnitz triestino','dolci','Friuli-Venezia Giulia',{slot:'dom-pranzo'}),
  R('t5','Bigoli in salsa','primi','Veneto'),
  R('t6','Sarde in saor','antipasti','Veneto'),
  R('t7','Radicchio alla piastra','contorni','')
];
(async()=>{
  const {browser,errors,mk}=await run();
  let ok=true;const fail=m=>{ok=false;console.log('FAIL',m);};const pass=m=>console.log('ok  ',m);
  const d=await mk(1280,900,false);
  await d.waitForSelector('.login');
  await d.evaluate(({s,recipes})=>{s.forEach(w=>__db.data.set(w.collection+'/'+w.doc_id,w.data));recipes.forEach(r=>__db.data.set(r[0],r[1]));__db.notify();},{s:seed,recipes});
  await d.click('.names .btn:has-text("Marco Furio")');await d.waitForSelector('.rail');
  // home: Suggerimenti è la prima scheda, colorata, ed è la pagina d'ingresso
  (await d.$$eval('.tab',e=>e[0].textContent.startsWith('Suggerimenti')&&e[0].classList.contains('tab-sug')))?pass('Suggerimenti è la prima scheda ed è colorata'):fail('ordine schede');
  await d.waitForSelector('.hero-sug');
  const lib0=SUG.filter(s=>!PROPOSTI.includes(s.t));
  lib0.length===38?pass('catalogo di 44 piatti, 6 già proposti (4 in menu): ne restano 38'):fail('libere '+lib0.length);
  (await d.textContent('.hs-num'))==='38'&&(await d.textContent('.hero-sug')).includes('ricette ancora da proporre')?pass('home: banda "38 ricette ancora da proporre"'):fail('hero');
  (await d.$('.pill-sug'))===null?pass('nessuna pillola ridondante mentre sei già nei Suggerimenti'):fail('pillola doppia');
  await d.click('.tab:has-text("Proposte")');await d.waitForSelector('.choose');
  (await d.textContent('.pill-sug')).includes('38 ricette ancora da proporre')&&(await d.textContent('.choose .opt.a')).includes('38 piatti del Triveneto ancora da proporre')?pass('Proposte: pillola in testata e strada A con "38 piatti ancora da proporre"'):fail('choose');
  await d.screenshot({path:out+'/25-proposte-promo.png',clip:{x:0,y:0,width:1280,height:700}});
  await d.click('.choose .opt.a [data-act=tab]');await d.waitForSelector('.hero-sug');
  await d.screenshot({path:out+'/26-suggerimenti-hero.png',clip:{x:0,y:0,width:1280,height:900}});
  await d.waitForSelector('.card.sg');
  const titles=()=>d.$$eval('.card.sg h3',e=>e.map(x=>x.textContent));
  const t0=await titles();
  t0.length===38&&PROPOSTI.every(x=>!t0.includes(x))
    ?pass('le schede già proposte (Tiramisù, Jota, Gubana, Presnitz, Bigoli, Sarde in saor) non compaiono più'):fail('schede proposte ancora presenti '+t0.length);
  (await d.$$eval('.card.sg',e=>e.filter(c=>/Già proposta|Approvata/.test(c.textContent)).length))===0?pass('nessun segno di stato sulle card: sono tutte da proporre'):fail('segni di stato');
  (await d.$('#sst'))===null?pass('il filtro "Stato" non serve più'):fail('filtro stato');
  const venL=lib0.filter(s=>s.r==='Veneto').length;
  await d.click('.hs-regs [data-v="Veneto"]');(await d.$$eval('.card.sg',e=>e.length))===venL?pass('chip regione Veneto: '+venL+' piatti ancora da proporre'):fail('chip regione');
  await d.click('.hs-regs [data-v="Veneto"]');(await d.$$eval('.card.sg',e=>e.length))===38?pass('secondo tocco: filtro tolto'):fail('chip toggle');
  const tot=await d.$$eval('.hs-meta b',e=>e.map(x=>x.textContent));
  tot.join(',')==='38,6'?pass('contatori: 38 da proporre, 6 già proposti'):fail('contatori '+tot);
  (await d.textContent('.hs-meta')).includes('(4 in menu)')?pass('...di cui 4 in menu'):fail('in menu');
  const card=t=>`.card.sg:has(h3:text-is("${t}"))`;
  (await d.textContent(card('Putizza goriziana e triestina')+' .sim')).includes('Gubana')?pass('Putizza: avviso "simile a Gubana e Presnitz" (già in menu)'):fail('simile');
  // foto: tutte le card hanno la foto, le sei create con AI sono segnalate
  const nofoto=await d.$$eval('.card.sg',e=>e.filter(c=>!c.querySelector('.foto')).length);
  nofoto===0?pass('ogni scheda dei Suggerimenti ha la sua foto'):fail('schede senza foto '+nofoto);
    const ai=await d.$$eval('.card.sg .foto.ai',e=>e.map(f=>({t:f.closest('.card').querySelector('h3').textContent,b:f.querySelector('.aib').textContent,c:f.querySelector('figcaption').textContent,s:f.querySelector('img').getAttribute('src')})));
  ai.length===8&&ai.every(x=>x.b==='Creata con AI'&&x.c.includes('non è una foto del piatto vero')&&/^https:\/\/marcofurioferrario\.github\.io\/Claude-projects\/img\/ai\/[a-z]+\.jpg$/.test(x.s))
    ?pass('8 immagini create con AI, tutte con il segno "Creata con AI" e la didascalia ('+ai.map(x=>x.t.split(' ')[0]).join(', ')+')'):fail('foto AI '+JSON.stringify(ai));
  const reali=await d.$$eval('.card.sg .foto:not(.ai)',e=>e.map(f=>({c:f.querySelector('figcaption').textContent,a:f.querySelector('figcaption a')&&f.querySelector('figcaption a').getAttribute('href')})));
  reali.length===30&&reali.every(x=>x.c.includes('✓ affidabile')&&/^https:\/\//.test(x.a))?pass('30 foto vere da fonti in lista, con link alla pagina e "✓ affidabile"'):fail('foto vere '+reali.length+' '+JSON.stringify(reali.filter(x=>!x.c.includes('✓ affidabile')).slice(0,3)));
  await d.screenshot({path:out+'/20-suggerimenti-desktop.png',clip:{x:0,y:0,width:1280,height:1500},fullPage:true});
  // filtri
  await d.fill('#sq','soave');
  const ns=await d.$$eval('.card.sg',e=>e.length);ns>=3?pass('ricerca per vino "soave": '+ns+' piatti'):fail('ricerca vino '+ns);
  await d.fill('#sq','anatra');(await titles()).includes('Bigoli co\' l\'arna')?pass('ricerca per ingrediente "anatra"'):fail('ricerca ingrediente');
  await d.fill('#sq','');await d.selectOption('#slv','C');
  const nC=lib0.filter(s=>s.lv==='C').length;
  (await d.$$eval('.card.sg',e=>e.length))===nC?pass('filtro livello C: '+nC+' piatti ancora da proporre'):fail('livello C');
  await d.selectOption('#slv','-');const nD=lib0.filter(s=>!s.lv).length;(await d.$$eval('.card.sg',e=>e.length))===nD?pass('livello da assegnare: '+nD+' piatti'):fail('livello da assegnare');
  await d.selectOption('#slv','');await d.selectOption('#swt','Passito / Dolce');
  const nW=lib0.filter(s=>s.wt==='Passito / Dolce').length;(await d.$$eval('.card.sg',e=>e.length))===nW?pass('tipo di vino Passito/Dolce: '+nW+' piatti'):fail('tipo vino');
  await d.selectOption('#swt','');
  // equilibrio: regioni, portate, vini
  await d.waitForSelector('#sg-eq .eqblk');
  (await d.$$eval('#sg-eq .eqblk h4',e=>e.map(x=>x.textContent))).join('|')==='Per regione|Per portata|Per tipo di vino'?pass('Equilibrio: tre blocchi, regioni, portate e vini'):fail('blocchi equilibrio');
  (await d.$('#sg-eq details'))===null?pass('Equilibrio sempre aperto'):fail('equilibrio chiuso');
  const leg=await d.$$eval('#sg-eq .legend span',e=>e.map(x=>x.textContent.trim()));
  leg.slice(0,3).join('|')==='Veneto|Friuli-Venezia Giulia|Trentino-Alto Adige'&&leg.includes('Colore pieno: già proposti')&&leg.some(x=>x.startsWith('Tratteggiato'))&&leg.includes('Regione non indicata')
    ?pass('legenda: un colore per regione (più «regione non indicata» perché c’è una proposta senza regione), pieno = proposti, tratteggiato = da proporre'):fail('legenda '+leg);
  // le barre sono divise per regione, con gli stessi colori delle etichette di regione
  const col=sel=>d.$eval(sel,e=>getComputedStyle(e).backgroundColor);
  const chipCol={};for(const r of ['Veneto','Friuli-Venezia Giulia','Trentino-Alto Adige'])chipCol[r]=await col('.hs-regs .chip.reg[data-v="'+r+'"]');
  new Set(Object.values(chipCol)).size===3?pass('le tre regioni hanno tre colori diversi'):fail('colori regioni '+JSON.stringify(chipCol));
  const segs=await d.$$eval('#sg-eq .eqblk:nth-of-type(2) .eqr2',rs=>rs.map(r=>({l:r.querySelector('.eql b').textContent,s:[...r.querySelectorAll('.eqbar i')].map(i=>({t:i.title,c:getComputedStyle(i).backgroundColor,b:i.textContent,p:i.classList.contains('p')}))})));
  const dolciS=segs.find(x=>x.l.startsWith('Dolci')).s.filter(x=>x.p);
  dolciS.length===2&&dolciS[0].t==='Veneto: 1 proposto'&&dolciS[1].t==='Friuli-V.G.: 2 proposti'&&dolciS[0].c===chipCol.Veneto&&dolciS[1].c===chipCol['Friuli-Venezia Giulia']
    ?pass('Dolci: segmenti per regione (Veneto 1, Friuli 2) con il colore della regione'):fail('segmenti dolci '+JSON.stringify(dolciS));
  const aiuto=segs.find(x=>x.l.startsWith('Antipasti')).s;
  aiuto.some(x=>!x.p&&x.t.startsWith('Veneto')&&x.b!=='0')&&aiuto.some(x=>x.p&&x.t==='Veneto: 1 proposto')?pass('Antipasti: Veneto con un piatto proposto (pieno) e gli altri ancora da proporre (tratteggiato), nello stesso colore'):fail('segmenti antipasti '+JSON.stringify(aiuto));
  const cont=segs.find(x=>x.l.startsWith('Contorni')).s.filter(x=>x.p);
  cont.length===1&&cont[0].t==='Regione non indicata: 1 proposto'&&cont[0].c!==chipCol.Veneto?pass('proposta senza regione: segmento grigio «Regione non indicata»'):fail('segmento senza regione '+JSON.stringify(cont));
  const senza=await d.$$eval('#sg-eq .eqsenza',e=>e.map(x=>x.closest('.eqr2').querySelector('.eql b').textContent+': '+x.textContent));
  senza.some(x=>x.startsWith('Dolci')&&x.includes('Trentino-A.A.'))?pass('sotto la barra: «Nessun piatto proposto di: Trentino-A.A.» dove una regione manca'):fail('senza '+senza);
  (await d.textContent('#sg-eq .note')).includes('Regioni assenti per portata')?pass('nel riepilogo: le portate dove manca una regione'):fail('riepilogo assenti');
  const vv=await d.$$eval('#sg-eq .eqblk:nth-of-type(1) .eqr2',rs=>rs.map(r=>[r.querySelector('.eql b').textContent,[...r.querySelectorAll('.eqbar i')].map(i=>i.title.split(':')[0]).filter((v,i,a)=>a.indexOf(v)===i)]));
  vv.every(x=>x[1].length<=1)?pass('nel blocco per regione ogni barra ha un solo colore'):fail('barre per regione '+JSON.stringify(vv));
  const rows=await d.$$eval('#sg-eq .eqblk',b=>b.map(x=>[...x.querySelectorAll('.eqr2')].map(r=>({l:r.querySelector('.eql b').textContent,v:(r.querySelector('.verd')||{}).textContent||'',n:r.querySelector('.eqn').textContent.replace(/\s+/g,' ').trim()}))));
  rows[0].length===3&&rows[1].length===5&&rows[2].length===new Set(SUG.map(s=>s.wt)).size?pass('righe: 3 regioni, 5 portate, tutti i tipi di vino'):fail('righe '+rows.map(r=>r.length));
  const dolci=rows[1].find(r=>r.l.startsWith('Dolci'));
  const dolciN=[await d.evaluate(()=>[...__db.data.entries()].filter(e=>e[0].startsWith('recipes/')&&e[1].category==='dolci').length),lib0.filter(s=>s.c==='dolci').length];
  dolci.n.includes(dolciN[0]+' proposti')&&dolci.n.includes(dolciN[1]+' ancora da proporre')?pass('Dolci: '+dolciN[0]+' proposti, '+dolciN[1]+' ancora da proporre (numeri scritti, non solo barre)'):fail('dolci '+JSON.stringify(dolci));
  rows[1].every(r=>r.v)&&rows[0].every(r=>r.v)?pass('ogni regione e portata ha un verdetto in parole ('+rows[1].map(r=>r.v).join(' / ')+')'):fail('verdetti '+JSON.stringify(rows.slice(0,2)));
  !/null|undefined|NaN/.test(await d.textContent('#sg-eq'))?pass('nessun «null» o «NaN» nei testi dell’Equilibrio'):fail('testo equilibrio sporco');
  await d.click('#sg-eq .eqblk:nth-of-type(2) [data-act=eq-filtra][data-v=dolci]').catch(async()=>{await d.click('#sg-eq [data-act=eq-filtra][data-k=cat][data-v=dolci]');});
  const nDolciLib=lib0.filter(s=>s.c==='dolci').length;
  (await d.$$eval('.card.sg',e=>e.length))===nDolciLib&&(await d.$eval('.filterchips .fchip[aria-pressed=true]',e=>e.textContent))==='Dolci'?pass('"Vedi i '+nDolciLib+' da proporre" filtra l\'elenco sui dolci'):fail('eq-filtra');
  await d.click('[data-act=sclear]').catch(()=>{});await d.click('.filterchips .fchip:has-text("Tutte")');
  await d.screenshot({path:out+'/27-equilibrio.png',clip:await d.$eval('#sg-eq',e=>{const b=e.getBoundingClientRect();return{x:0,y:b.top+scrollY,width:1280,height:Math.min(b.height,1400)};}),fullPage:true});
  // proponi dal catalogo
  await d.click('[data-act=sug-propose][data-id=brasato]');await d.waitForSelector('#ed-title');
  const pre=await d.evaluate(()=>({t:document.querySelector('#ed-title').value,c:document.querySelector('#ed-cat').value,r:document.querySelector('#ed-reg').value,l:document.querySelector('#ed-link').value}));
  pre.t.startsWith('Brasato')&&pre.c==='secondi'&&pre.r==='Trentino-Alto Adige'&&pre.l.includes('visitrotaliana')?pass('editor precompilato da suggerimento'):fail('precompilato '+JSON.stringify(pre));
  await d.screenshot({path:out+'/21-proponi-da-suggerimento.png'});
  await d.click('[data-act=save-recipe]');
  await d.waitForFunction(()=>Object.values(__db.data.entries?[...__db.data.entries()].reduce((a,[k,v])=>{a[k]=v;return a;},{}):{}).some(v=>v&&v.sugId==='brasato'));
  const br=await d.evaluate(()=>[...__db.data.entries()].map(e=>e[1]).find(v=>v&&v.sugId==='brasato'));
  br.vini[0].bottiglie===0&&br.fasi.length===2&&br.verifica.stato==='da_sostituire'&&br.verifica.nota.includes('carne salada')&&br.proposerId==='p_marco-furio'&&br.ownerIds.length===1
    ?pass('proposta con sugId, vino (0 bottiglie), 2 fasi e link segnato "da sostituire"'):fail('proposta da sug '+JSON.stringify(br));
  br.foto&&br.foto.ai===true&&/img\/ai\/brasato\.jpg$/.test(br.foto.url)&&br.foto.fonte==='Immagine creata con AI'?pass('la proposta eredita l’immagine AI, ancora segnata come tale (foto.ai = true)'):fail('foto proposta '+JSON.stringify(br.foto));
  await d.waitForFunction(()=>!([...document.querySelectorAll('.card.sg h3')].some(x=>x.textContent.startsWith('Brasato'))),null,{timeout:5000}).catch(()=>{});
  const t1=await titles();
  !t1.some(x=>x.startsWith('Brasato'))&&t1.length===37?pass('il piatto proposto sparisce subito dai Suggerimenti (37 rimasti)'):fail('dopo proposta '+t1.length);
  (await d.textContent('.hs-num'))==='37'&&(await d.textContent('.hs-meta')).replace(/\s+/g,' ').includes('7 già proposti')?pass('i contatori si aggiornano: 37 da proporre, 7 già proposti'):fail('contatori dopo proposta '+await d.textContent('.hs-meta'));
  const bras=await d.$$eval('#sg-eq .eqr2',e=>e.map(r=>r.querySelector('.eql b').textContent+': '+r.querySelector('.eqn').textContent.replace(/\s+/g,' ').trim()));
  bras.some(x=>x.startsWith('Secondi')&&/ancora da proporre/.test(x))?pass('anche l’Equilibrio si aggiorna (Secondi)'):fail('equilibrio dopo proposta');
  // suggerimenti nell'editor delle proposte
  await d.click('.tab:has-text("Proposte")');await d.click('[data-act=new-recipe]');await d.waitForSelector('#ed-title');
  await d.selectOption('#ed-cat','secondi');
  const ideas=await d.$$eval('.idea',e=>e.map(x=>x.textContent));
  ideas.length>0&&!ideas.includes('Brasato di manzo al Teroldego')?pass('editor: idee dal catalogo, senza i piatti già proposti ('+ideas.length+')'):fail('idee '+ideas);
  await d.click('.sheet [data-act=modal-close]');
  // menu: simili, carta vini
  await d.evaluate(()=>{const db=__db.data;db.get('settings/main').fase='menu';__db.notify();});
  await d.click('.tab:has-text("Menu")');await d.waitForSelector('.days');
  const menuTxt=await d.textContent('.view');
  menuTxt.includes('Piatti simili nel menu')&&menuTxt.includes('Dolci a spirale')&&menuTxt.includes('Gubana, Presnitz')?pass('menu: avviso piatti simili (Gubana, Presnitz)'):fail('famNote');
  menuTxt.includes('Carta dei vini')&&menuTxt.includes('Carso Terrano DOC')&&menuTxt.includes('8 bott.')?pass('carta dei vini: Terrano 8 bottiglie (2 per 4 persone → 15 persone)'):fail('carta vini');
  menuTxt.includes('quantità da definire')?pass('vino senza bottiglie: "quantità da definire"'):fail('vino a 0');
  await d.click('[data-act=copy-carta]');
  const clip=await d.evaluate(()=>window.__clip);clip&&clip.includes('CARTA DEL BANCHETTO')&&clip.includes('Tiramisu · Prosecco Superiore DOCG Dry')?pass('copia della carta del banchetto'):fail('copia carta '+clip);
  await d.screenshot({path:out+'/22-menu-carta-vini.png',fullPage:true});
  // spesa: il vino a 0 bottiglie non entra, quello con bottiglie sì
  await d.click('.tab:has-text("Spesa")');
  const spesa=await d.evaluate(()=>[...document.querySelectorAll('.ln .nm')].map(x=>x.textContent));
  spesa.includes('Carso Terrano DOC')&&!spesa.some(x=>x.includes('Prosecco Superiore'))?pass('spesa: solo i vini con bottiglie'):fail('spesa vini '+spesa);
  // scheda
  await d.click('.tab:has-text("Menu")');await d.click('.dish .nm:has-text("Tiramisu")');await d.waitForSelector('.hero');
  (await d.textContent('.view')).includes('abbinamento suggerito')?pass('scheda: vino senza bottiglie mostrato come abbinamento'):fail('scheda vino');
  // apri dalla card
  // nelle Proposte la card del piatto con immagine AI porta il segno
  await d.click('.tab:has-text("Proposte")');await d.waitForSelector('.card');
  const pc=`.card:has(h3:text-is("Brasato di manzo al Teroldego"))`;
  await d.locator(pc).scrollIntoViewIfNeeded();
  (await d.textContent(pc+' .foto.ai .aib'))==='Creata con AI'?pass('Proposte: la card del Brasato mostra il segno "Creata con AI"'):fail('badge AI in Proposte');
  // mobile + scuro
  const m=await mk(390,844,true);await m.waitForSelector('.login');
  await m.evaluate(({s,recipes})=>{s.forEach(w=>__db.data.set(w.collection+'/'+w.doc_id,w.data));recipes.forEach(r=>__db.data.set(r[0],r[1]));__db.notify();},{s:seed,recipes});
  await m.click('.names .btn:has-text("Teo")');await m.waitForSelector('.rail');await m.click('.tab:has-text("Suggerimenti")');await m.waitForSelector('.card.sg');
  await m.screenshot({path:out+'/23-suggerimenti-mobile-scuro.png'});
  await m.evaluate(()=>document.querySelector('#sg-eq').scrollIntoView());await m.screenshot({path:out+'/28-equilibrio-mobile-scuro.png'});
  await m.evaluate(()=>window.scrollTo(0,1500));await m.screenshot({path:out+'/24-suggerimenti-mobile-cards.png'});
  const ov=await m.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);ov<=1?pass('mobile: nessuno scroll orizzontale'):fail('overflow '+ov);
  console.log(errors.length?'ERRORI:\n'+errors.join('\n'):'nessun errore di console');
  if(errors.length)ok=false;
  await browser.close();process.exit(ok?0:1);
})().catch(e=>{console.error(e);process.exit(2);});
