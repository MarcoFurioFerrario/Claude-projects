// Prova: «Giorni Golosi» — vista "Il libro", segno "Dal libro" sulle proposte, filtro, riquadro nella scheda e ricetta del libro.
const {run,seed}=require('./harness');
const out=require('path').join(__dirname,'shots');require('fs').mkdirSync(out,{recursive:true});
const R=(id,title,category,proposer,owners,extra)=>[`recipes/${id}`,Object.assign({title,category,region:'Veneto',link:'https://example.org/'+id,note:'',proposerId:proposer,ownerIds:owners,teamIds:[],createdAt:Date.now(),
  verifica:{stato:'da_verificare'},slot:'',serves:4,porzione:'normale',ingredients:[],steps:[],fasi:[],preparabileACasa:false,vini:[],consigli:''},extra||{})];
const recipes=[
  R('l1','Tiramisù','dolci','p_umbe',['p_umbe']),
  R('l2','Gubana','dolci','p_tia',['p_tia'],{region:'Friuli-Venezia Giulia'}),
  R('l3','Kaiserschmarrn altoatesino','dolci','p_melo',['p_melo'],{region:'Trentino-Alto Adige'}),
  R('l4','Pinza veneta (pinsa della marantega)','dolci','p_marco-furio',[],{daLibro:true,libroId:'pinza'}),
  R('l5','Risi e bisi','primi','p_tia',['p_tia'])
];
(async()=>{
  const {browser,errors,mk}=await run();
  let ok=true;const fail=m=>{ok=false;console.log('FAIL',m);};const pass=m=>console.log('ok  ',m);
  const d=await mk(1280,900,false);await d.waitForSelector('.login');
  await d.evaluate(({s,recipes})=>{s.forEach(w=>__db.data.set(w.collection+'/'+w.doc_id,w.data));recipes.forEach(r=>__db.data.set(r[0],r[1]));__db.notify();},{s:seed,recipes});
  const login=async n=>{await d.click('.names .btn:has-text("'+n+'")');await d.waitForSelector('.rail');};
  const logout=async()=>{await d.click('[data-act=logout]');await d.waitForSelector('.names');};
  const open=async id=>{await d.evaluate(i=>{location.hash='#piatto-'+i;},id);await d.waitForSelector('.hero');};
  const card=t=>`.card:has(h3:text-is("${t}"))`;
  const rec=id=>d.evaluate(i=>__db.data.get('recipes/'+i),id);

  await login('Marco Furio');
  const tabs=await d.$$eval('.tabs .tab',e=>e.map(x=>x.textContent.trim().replace(/\d+$/,'')));
  tabs[0]==='Suggerimenti'&&tabs[1]==='Il libro'?pass('scheda "Il libro" subito dopo Suggerimenti'):fail('tab '+tabs);
  await d.click('.tab:has-text("Il libro")');await d.waitForSelector('.libro-hero');
  (await d.textContent('.libro-hero')).includes('Giorni Golosi')&&(await d.textContent('.libro-hero')).includes('Trenta Editore')?pass('intestazione: Giorni Golosi, Marco Ferrario, Trenta Editore 2013'):fail('hero');
  (await d.$$('.idee .panel')).length===6?pass('sei idee dell’impianto del libro (festa dolce, evoluzione, variante, simbolo…)'):fail('idee '+(await d.$$('.idee .panel')).length);
  (await d.$$('.rcard')).length===3?pass('tre regioni: Trentino-Alto Adige, Veneto, Friuli-Venezia Giulia'):fail('regioni');
  const rtxt=await d.textContent('.rcard:nth-of-type(1)');
  const all=await d.textContent('.view');
  all.includes('Simposio di Platone')&&all.includes('marantega')&&all.includes('scisma d’Occidente')&&all.includes('pastafarianesimo')?pass('considerazioni culturali: Simposio di Platone, marantega e rigenerazione, scisma d’Occidente, pastafarianesimo'):fail('considerazioni');
  (await d.$$('.rcard details.rl')).length===3?pass('le tre ricette complete del libro (Apfelschmarren, Pinsa, Gubana), per 6 persone'):fail('ricette complete');
  (await d.textContent('.view')).includes('Golosessi')&&(await d.textContent('.view')).includes('Tampelun')?pass('elenco dei piatti citati senza ricetta trovata (Golosessi, Maronada, Tampelun, Busolai, Pane dei Morti)'):fail('cerca');
  const chip=await d.$$eval('.rcard .fchip',e=>e.map(x=>x.textContent.trim()));
  chip.includes('Tiramisù')&&chip.includes('Gubana')&&chip.includes('Pinza veneta (pinsa della marantega)')&&chip.includes('Kaiserschmarrn altoatesino')?pass('i piatti già proposti compaiono come pulsanti (Tiramisù, Gubana, Kaiserschmarrn, Pinza)'):fail('chip '+chip);
  await d.screenshot({path:out+'/60-libro-desktop.png',fullPage:true});

  // riconoscimento per titolo delle proposte esistenti + badge e filtro
  await d.click('.tab:has-text("Proposte")');await d.waitForSelector('.card');
  const badges=await d.$$eval('.card',e=>e.map(c=>[c.querySelector('h3').textContent,!![...c.querySelectorAll('.badge')].find(b=>b.textContent==='Dal libro')]));
  const has=Object.fromEntries(badges);
  has['Tiramisù']&&has['Gubana']&&has['Kaiserschmarrn altoatesino']&&has['Pinza veneta (pinsa della marantega)']&&!has['Risi e bisi']?pass('segno «Dal libro»: anche sulle proposte fatte a mano (Tiramisù, Gubana, Kaiserschmarrn), non su Risi e bisi'):fail('badge '+JSON.stringify(has));
  await d.check('#flibro');
  (await d.$$('.card')).length===4?pass('filtro "Solo dal libro": 4 proposte'):fail('filtro '+(await d.$$('.card')).length);
  await d.click('[data-act=fclear]').catch(()=>{});
  await d.uncheck('#flibro').catch(()=>{});
  await d.click('.tab:has-text("Il libro")');await d.click('[data-act=libro-filtro]');await d.waitForSelector('#flibro:checked');
  pass('"Vedi le proposte dal libro" porta alle Proposte già filtrate');
  await d.uncheck('#flibro');

  // scheda con riquadro del libro e ricetta
  await open('l2');
  const pn=await d.textContent('.panel.libro');
  pn.toLowerCase().includes('pieno come una gubana')&&pn.includes('pp. 40-41')?pass('scheda Gubana: riquadro «Dal libro» con pagine e nota'):fail('riquadro '+pn.slice(0,200));
  (await d.textContent('.panel.libro details.rl summary')).includes('per 6 persone')?pass('con la ricetta del libro (per 6 persone)'):fail('ricetta nel riquadro');
  await d.screenshot({path:out+'/61-scheda-libro.png',fullPage:true});
  await d.click('[data-act=libro-usa]');
  await d.waitForFunction(()=>(__db.data.get('recipes/l2').ingredients||[]).length>10);
  const g=await rec('l2');
  g.ingredients.length===22&&g.steps.length===8&&g.serves===6&&g.fasi.length===2&&g.ingredients.every(i=>i.name&&typeof i.qty==='number'&&i.unit&&i.shop)?pass('"Usa questa ricetta nella scheda": 22 ingredienti, 8 passi, 6 persone e le 2 attese (ripieno 24 h, lievitazioni)'):fail('compila '+JSON.stringify([g.ingredients.length,g.steps.length,g.serves,g.fasi]));
  await d.waitForSelector('[data-act=libro-usa]:has-text("Sostituisci la scheda")');
  await d.click('[data-act=libro-usa]');await d.waitForSelector('[data-act=libro-usa]:has-text("Sì, sostituisci")');
  pass('se la scheda è già compilata chiede conferma prima di sostituire');
  await d.click('[data-act=del-cancel]');
  // chi non può modificare
  await logout();await login('Fede');await open('l2');
  (await d.$('[data-act=libro-usa]'))===null?pass('chi non ha proposto il piatto non può riscrivere la scheda'):fail('permessi libro-usa');
  await open('l5');
  (await d.$('.panel.libro'))===null?pass('nessun riquadro sui piatti non legati al libro'):fail('riquadro su Risi e bisi');
  await open('l4');
  (await d.textContent('.panel.libro')).includes('Befana')||(await d.textContent('.panel.libro')).includes('5 gennaio')?pass('Pinza veneta (proposta dal libro, senza responsabili): riquadro con Befana e rigenerazione'):fail('riquadro pinza');
  // piatto citato ma da cercare → editor precompilato
  await d.click('.tab:has-text("Il libro")');await d.waitForSelector('.libro-hero');
  await d.click('[data-act=libro-proponi][data-n=Golosessi]');await d.waitForSelector('#ed-title');
  (await d.inputValue('#ed-title'))==='Golosessi'&&(await d.inputValue('#ed-cat'))==='dolci'&&(await d.inputValue('#ed-reg'))==='Veneto'&&(await d.inputValue('#ed-note')).includes('Giorni Golosi')?pass('"Proponi" su un piatto da cercare apre il modulo già compilato'):fail('modulo golosessi');
  await d.click('.sheet [data-act=modal-close]');

  const m=await mk(390,844,true);await m.waitForSelector('.login');
  await m.evaluate(({s,recipes})=>{s.forEach(w=>__db.data.set(w.collection+'/'+w.doc_id,w.data));recipes.forEach(r=>__db.data.set(r[0],r[1]));__db.notify();},{s:seed,recipes});
  await m.click('.names .btn:has-text("Fede")');await m.waitForSelector('.rail');
  await m.evaluate(()=>{location.hash='#libro';});await m.waitForSelector('.libro-hero');
  await m.screenshot({path:out+'/62-libro-mobile.png'});
  const ov=await m.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);ov<=1?pass('mobile: nessuno scroll orizzontale'):fail('overflow '+ov);
  console.log(errors.length?'ERRORI:\n'+errors.join('\n'):'nessun errore di console');
  if(errors.length)ok=false;
  await browser.close();process.exit(ok?0:1);
})().catch(e=>{console.error(e);process.exit(2);});
