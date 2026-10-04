// Prova: foto del piatto (card, scheda, aggiunta/cambio/rimozione, fonte citata, immagine non raggiungibile).
const {run,seed}=require('./harness');
const out=require('path').join(__dirname,'shots');require('fs').mkdirSync(out,{recursive:true});
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64');
const R=(id,title,category,proposer,owners,extra)=>[`recipes/${id}`,Object.assign({title,category,region:'Veneto',link:'https://example.org/'+id,note:'',proposerId:proposer,ownerIds:owners,teamIds:[],createdAt:Date.now(),
  verifica:{stato:'da_verificare'},slot:'',serves:4,porzione:'normale',ingredients:[],steps:[],fasi:[],preparabileACasa:false,vini:[],consigli:''},extra||{})];
const recipes=[
  R('f1','Tiramisù','dolci','p_teo',['p_teo'],{foto:{url:'https://img.test/tiramisu.png',pagina:'https://www.cucchiaio.it/ricetta/ricetta-tiramisu/',fonte:'Cucchiaio d’Argento',autore:'',data:'2026-10-03'}}),
  R('f2','Fegato alla veneziana','secondi','p_teo',['p_teo'],{verifica:{stato:'da_verificare',linkAutorevole:'https://www.taccuinigastrosofici.it/ita/ricette/contemporanea/carni/Fegato-alla-veneziana.html',fonte:'Taccuini Gastrosofici'}}),
  R('f3','Frico','antipasti','p_tia',['p_tia'],{foto:{url:'https://broken.test/frico.png',pagina:'https://www.cucchiaio.it/ricetta/frico/',fonte:'Cucchiaio d’Argento',data:'2026-10-03'}})
];
(async()=>{
  const {browser,errors,mk}=await run();
  let ok=true;const fail=m=>{ok=false;console.log('FAIL',m);};const pass=m=>console.log('ok  ',m);
  const d=await mk(1280,900,false);await d.waitForSelector('.login');
  await d.route('https://img.test/**',r=>r.fulfill({status:200,contentType:'image/png',body:PNG}));
  await d.evaluate(({s,recipes})=>{s.forEach(w=>__db.data.set(w.collection+'/'+w.doc_id,w.data));recipes.forEach(r=>__db.data.set(r[0],r[1]));__db.notify();},{s:seed,recipes});
  const login=async n=>{await d.click('.names .btn:has-text("'+n+'")');await d.waitForSelector('.rail');};
  const logout=async()=>{await d.click('[data-act=logout]');await d.waitForSelector('.names');};
  const card=t=>`.card:has(h3:text-is("${t}"))`;
  const open=async id=>{await d.evaluate(i=>{location.hash='#piatto-'+i;},id);await d.waitForSelector('.hero');};
  const rec=id=>d.evaluate(i=>__db.data.get('recipes/'+i),id);
  const vedi=async sel=>{for(let i=0;i<6;i++){try{await d.locator(sel).scrollIntoViewIfNeeded({timeout:3000});return;}catch(e){await d.waitForTimeout(250);}}}; // un'immagine che non si carica ridisegna la pagina mentre scorriamo: si riprova

  await login('Teo');await d.click('.tab:has-text("Proposte")');await d.waitForSelector('.card');
  await vedi(card('Tiramisù')); // le foto si caricano quando la card è vicina alla vista (loading=lazy)
  await d.waitForFunction(()=>{const c=[...document.querySelectorAll('.card')].find(x=>x.querySelector('h3').textContent==='Tiramisù');const i=c&&c.querySelector('.foto.thumb img');return i&&i.complete&&i.naturalWidth>0;});
  pass('card: la foto si carica (anteprima 16:9)');
  const cap=await d.textContent(card('Tiramisù')+' .foto figcaption');
  cap.includes('Cucchiaio d’Argento')&&cap.includes('✓ affidabile')?pass('sotto la foto: nome della fonte, link alla pagina e segno "✓ affidabile"'):fail('didascalia '+cap);
  (await d.getAttribute(card('Tiramisù')+' .foto figcaption a','href'))==='https://www.cucchiaio.it/ricetta/ricetta-tiramisu/'?pass('il link porta alla pagina della fonte'):fail('link fonte');
  (await d.getAttribute(card('Tiramisù')+' .foto img','referrerpolicy'))==='no-referrer'?pass('immagine caricata senza inviare l’indirizzo del sito (no-referrer)'):fail('referrer');
  (await d.$(card('Fegato alla veneziana')+' .foto'))===null?pass('senza foto la card resta compatta, senza riquadri vuoti'):fail('riquadro vuoto');

  // immagine non raggiungibile
  await vedi(card('Frico'));
  await d.waitForSelector(card('Frico')+' .foto.ko');
  (await d.$(card('Frico')+' .foto img'))===null&&(await d.textContent(card('Frico')+' .foto.ko')).includes('Cucchiaio')?pass('immagine non raggiungibile: niente icona rotta, resta il link alla fonte'):fail('fallback foto');
  await d.screenshot({path:out+'/50-card-foto.png',clip:{x:0,y:380,width:1280,height:520}});

  // scheda: proponente
  await open('f1');
  (await d.$('.hero ~ .fotobox .foto.big img'))||(await d.$('.fotobox .foto.big img'))?pass('scheda: foto grande con didascalia'):fail('foto scheda');
  (await d.$('[data-act=foto-edit]'))&&(await d.$('[data-act=foto-del]'))?pass('il proponente vede "Cambia foto" e "Togli foto"'):fail('bottoni proponente');
  await d.screenshot({path:out+'/51-scheda-foto.png',clip:{x:0,y:0,width:1280,height:900}});
  // scheda senza foto: aggiunta
  await open('f2');
  (await d.textContent('.foto-add')).includes('Nessuna foto')?pass('scheda senza foto: riquadro "Nessuna foto" con pulsante per aggiungerla'):fail('riquadro aggiungi');
  await d.click('[data-act=foto-edit]');await d.waitForSelector('#fo-url');
  (await d.inputValue('#fo-pg'))==='https://www.taccuinigastrosofici.it/ita/ricette/contemporanea/carni/Fegato-alla-veneziana.html'?pass('la pagina della fonte è già compilata con la ricetta di riferimento'):fail('pagina precompilata '+await d.inputValue('#fo-pg'));
  (await d.textContent('#fo-prev')).includes('✓ Fonte nella lista')?pass('segnala che la fonte è nella lista delle affidabili (Taccuini Gastrosofici)'):fail('segnalazione fonte '+await d.textContent('#fo-prev'));
  await d.click('[data-act=foto-save]');
  (await d.textContent('#ed-err')).includes('indirizzo dell’immagine')?pass('validazione: serve l’indirizzo dell’immagine'):fail('val url');
  await d.fill('#fo-url','http://img.test/fegato.png');await d.click('[data-act=foto-save]');
  (await d.textContent('#ed-err')).includes('https://')?pass('validazione: solo https'):fail('val https');
  await d.fill('#fo-url','https://img.test/fegato.png');await d.fill('#fo-pg','');await d.click('[data-act=foto-save]');
  (await d.textContent('#ed-err')).includes('pagina della fonte')?pass('validazione: la pagina della fonte è obbligatoria (si deve citare)'):fail('val pagina');
  await d.fill('#fo-pg','https://www.taccuinigastrosofici.it/ita/ricette/contemporanea/carni/Fegato-alla-veneziana.html');
  await d.waitForFunction(()=>{const i=document.querySelector('#fo-prev img');return i&&i.complete&&i.naturalWidth>0;});
  pass('anteprima nella finestra prima di salvare');
  await d.screenshot({path:out+'/52-editor-foto.png'});
  await d.click('[data-act=foto-save]');
  await d.waitForFunction(()=>__db.data.get('recipes/f2').foto);
  const f2=(await rec('f2')).foto;
  f2.url==='https://img.test/fegato.png'&&f2.fonte==='Taccuini Gastrosofici'&&/^\d{4}-\d{2}-\d{2}$/.test(f2.data)?pass('foto salvata con la fonte ricavata dal sito: Taccuini Gastrosofici'):fail('foto salvata '+JSON.stringify(f2));
  await d.waitForSelector('.fotobox .foto.big',{timeout:5000}).then(()=>pass('la scheda mostra subito la foto'),()=>fail('foto non mostrata'));
  await d.click('[data-act=foto-del]');
  await d.waitForFunction(()=>__db.data.get('recipes/f2').foto===null);
  (await d.textContent('.foto-add')).includes('Nessuna foto')?pass('"Togli foto" la rimuove'):fail('rimozione');

  // permessi
  await logout();await login('Fede');await open('f1');
  (await d.$('[data-act=foto-edit]'))===null&&(await d.$('[data-act=foto-del]'))===null?pass('chi non è proponente né responsabile può solo guardare la foto'):fail('permessi non responsabile');
  await d.click('.panel:has(h3:text-is("Team responsabili")) [data-act=owner-toggle]');
  await d.waitForFunction(()=>__db.data.get('recipes/f1').ownerIds.includes('p_fede'));
  await d.waitForSelector('[data-act=foto-edit]');
  pass('chi entra tra i responsabili può cambiare la foto');
  await d.evaluate(()=>{const r=__db.data.get('recipes/f1');r.ownerIds=r.ownerIds.filter(x=>x!=='p_fede');__db.notify();});
  await logout();await login('Marco Furio');await open('f1');
  (await d.$('[data-act=foto-edit]'))?pass('l’organizzatore può cambiare qualsiasi foto'):fail('organizzatore');

  const m=await mk(390,844,true);await m.waitForSelector('.login');
  await m.route('https://img.test/**',r=>r.fulfill({status:200,contentType:'image/png',body:PNG}));
  await m.evaluate(({s,recipes})=>{s.forEach(w=>__db.data.set(w.collection+'/'+w.doc_id,w.data));recipes.forEach(r=>__db.data.set(r[0],r[1]));__db.notify();},{s:seed,recipes});
  await m.click('.names .btn:has-text("Teo")');await m.waitForSelector('.rail');
  await m.evaluate(()=>{location.hash='#piatto-f1';});await m.waitForSelector('.fotobox .foto.big');
  await m.screenshot({path:out+'/53-scheda-foto-mobile.png'});
  const ov=await m.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);ov<=1?pass('mobile: nessuno scroll orizzontale'):fail('overflow '+ov);
  console.log(errors.filter(e=>!/broken\.test|ERR_FAILED|Failed to load resource/.test(e)).length?'ERRORI:\n'+errors.join('\n'):'nessun errore di console (a parte l’immagine volutamente irraggiungibile)');
  if(errors.filter(e=>!/broken\.test|ERR_FAILED|Failed to load resource/.test(e)).length)ok=false;
  await browser.close();process.exit(ok?0:1);
})().catch(e=>{console.error(e);process.exit(2);});
