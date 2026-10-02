// Prova: ognuno si aggiunge o si toglie dai responsabili di un piatto; solo chi l'ha proposto modifica il resto.
const {run,seed}=require('./harness');
const out=require('path').join(__dirname,'shots');require('fs').mkdirSync(out,{recursive:true});
const R=(id,title,category,proposer,owners,extra)=>[`recipes/${id}`,Object.assign({title,category,region:'Veneto',link:'https://example.org/'+id,note:'',proposerId:proposer,ownerIds:owners,teamIds:[],createdAt:Date.now(),
  verifica:{stato:'da_verificare'},slot:'',serves:4,porzione:'normale',ingredients:[],steps:[],fasi:[],preparabileACasa:false,vini:[],consigli:''},extra||{})];
const recipes=[
  R('o1','Frico croccante','antipasti','p_teo',['p_teo'],{slot:'ven-cena'}),
  R('o2','Risi e bisi','primi','p_tia',['p_tia']),
  R('o3','Tiramisu','dolci','p_umbe',['p_umbe'],{teamIds:['p_melo']})
];
(async()=>{
  const {browser,errors,mk}=await run();
  let ok=true;const fail=m=>{ok=false;console.log('FAIL',m);};const pass=m=>console.log('ok  ',m);
  const d=await mk(1280,900,false);await d.waitForSelector('.login');
  await d.evaluate(({s,recipes})=>{s.forEach(w=>__db.data.set(w.collection+'/'+w.doc_id,w.data));recipes.forEach(r=>__db.data.set(r[0],r[1]));__db.notify();},{s:seed,recipes});
  const owners=id=>d.evaluate(i=>{const r=__db.data.get('recipes/'+i);return [...r.ownerIds].sort().join(',')+'|'+(r.teamIds||[]).join(',');},id);
  const card=t=>`.card:has(h3:text-is("${t}"))`;
  const login=async n=>{await d.click('.names .btn:has-text("'+n+'")');await d.waitForSelector('.rail');await d.click('.tab:has-text("Proposte")');await d.waitForSelector('.card');};
  const logout=async()=>{await d.click('[data-act=logout]');await d.waitForSelector('.names');};

  // Fede: non ha proposto niente
  await login('Fede');
  const btnTxt=async t=>(await d.textContent(card(t)+' [data-act=owner-toggle]')).trim();
  (await btnTxt('Frico croccante'))==='Mi aggiungo ai responsabili'?pass('ogni card ha "Mi aggiungo ai responsabili"'):fail('pulsante');
  (await d.$(card('Frico croccante')+' [data-act=edit-recipe]'))===null&&(await d.$(card('Frico croccante')+' [data-act=del-recipe]'))===null?pass('chi non ha proposto non vede Modifica né Elimina'):fail('permessi card');
  await d.click(card('Frico croccante')+' [data-act=owner-toggle]');
  await d.waitForFunction(()=>__db.data.get('recipes/o1').ownerIds.includes('p_fede'));
  (await owners('o1'))==='p_fede,p_teo|'?pass('Fede si aggiunge: responsabili Teo + Fede, nient\'altro cambia'):fail('join '+await owners('o1'));
  await d.waitForFunction(()=>[...document.querySelectorAll('.card')].some(c=>c.querySelector('h3').textContent==='Frico croccante'&&c.textContent.includes('Fede (tu)')));
  (await btnTxt('Frico croccante'))==='Esco dai responsabili'?pass('il pulsante diventa "Esco dai responsabili" e compare "Fede (tu)"'):fail('stato pulsante');
  (await d.$(card('Frico croccante')+' [data-act=edit-recipe]'))===null?pass('diventare responsabile non dà il permesso di modificare'):fail('permessi dopo join');
  const before=await d.evaluate(()=>JSON.stringify(Object.assign({},__db.data.get('recipes/o1'),{ownerIds:0,teamIds:0})));
  await d.screenshot({path:out+'/30-responsabili-card.png',clip:{x:0,y:0,width:1280,height:900}});
  // scheda piatto
  await d.click(card('Frico croccante')+' [data-act=open-dish]');await d.waitForSelector('.hero');
  (await d.$('[data-act=edit-dish]'))===null?pass('scheda: nessun "Compila / modifica" per chi non ha proposto'):fail('scheda modifica visibile');
  (await d.textContent('.panel:has(h3:text-is("Team responsabili"))')).includes('Fede (tu)')?pass('scheda: pannello "Team responsabili" con "Fede (tu)"'):fail('pannello team');
  await d.screenshot({path:out+'/31-responsabili-scheda.png',clip:{x:0,y:0,width:1280,height:700}});
  await d.click('.panel:has(h3:text-is("Team responsabili")) [data-act=owner-toggle]');
  await d.waitForFunction(()=>!__db.data.get('recipes/o1').ownerIds.includes('p_fede'));
  (await owners('o1'))==='p_teo|'?pass('Fede esce dalla scheda: torna solo Teo'):fail('leave '+await owners('o1'));
  const after=await d.evaluate(()=>JSON.stringify(Object.assign({},__db.data.get('recipes/o1'),{ownerIds:0,teamIds:0})));
  after===before?pass('titolo, link, voti e ogni altro campo restano identici'):fail('altri campi cambiati');
  // ultimo responsabile
  await logout();await login('Teo');
  await d.click(card('Frico croccante')+' [data-act=owner-toggle]');await d.waitForSelector('.toast.err');
  (await d.textContent('.toast')).includes('almeno un responsabile')&&(await owners('o1'))==='p_teo|'?pass('l\'ultimo responsabile non può uscire'):fail('guardia ultimo');
  (await d.$(card('Frico croccante')+' [data-act=edit-recipe]'))!==null&&(await d.$(card('Frico croccante')+' [data-act=del-recipe]'))!==null?pass('il proponente (Teo) vede Modifica ed Elimina'):fail('proponente');
  // modifica simultanea di un\'altra persona: non va persa
  await logout();await login('Fede');
  await d.evaluate(()=>{__db.data.get('recipes/o2').ownerIds.push('p_jack');}); // senza notificare: la pagina di Fede è "vecchia"
  await d.click(card('Risi e bisi')+' [data-act=owner-toggle]');
  await d.waitForFunction(()=>__db.data.get('recipes/o2').ownerIds.includes('p_fede'));
  (await owners('o2'))==='p_fede,p_jack,p_tia|'?pass('aggiunta di Jack avvenuta nello stesso momento: non si perde'):fail('concorrenza '+await owners('o2'));
  // squadre storiche (teamIds) contano come responsabili e si fondono quando si esce
  await logout();await login('Melo');
  (await d.textContent(card('Tiramisu'))).includes('Melo (tu)')&&(await btnTxt('Tiramisu'))==='Esco dai responsabili'?pass('chi era in una vecchia "squadra" risulta responsabile'):fail('legacy');
  await d.click(card('Tiramisu')+' [data-act=owner-toggle]');
  await d.waitForFunction(()=>!(__db.data.get('recipes/o3').teamIds||[]).includes('p_melo'));
  (await owners('o3'))==='p_umbe|'?pass('Melo esce: restano solo i responsabili veri, squadre svuotate'):fail('legacy leave '+await owners('o3'));
  // organizzatore: può modificare tutto
  await logout();await login('Marco Furio');
  (await d.$(card('Risi e bisi')+' [data-act=edit-recipe]'))!==null?pass('l\'organizzatore può modificare ogni proposta'):fail('organizzatore');
  // il proponente gestisce l'intero team
  await logout();await login('Tia');
  (await d.$(card('Risi e bisi')+' [data-act=team-edit]'))!==null?pass('il proponente (Tia) vede "Gestisci team"'):fail('team-edit proponente');
  await d.click(card('Risi e bisi')+' [data-act=edit-recipe]');await d.waitForSelector('#ed-title');
  (await d.$('#ed-owners'))===null?pass('il modulo di modifica non ripete la scelta dei responsabili (c\'è "Gestisci team")'):fail('owners nel modulo');
  await d.click('.sheet [data-act=modal-close]');
  await d.click(card('Risi e bisi')+' [data-act=team-edit]');await d.waitForSelector('#tm-pick');
  (await d.$$eval('#tm-pick .pick[aria-pressed="true"]',e=>e.map(x=>x.textContent).sort().join(',')))==='Fede,Jack,Tia'?pass('il team attuale è già selezionato'):fail('team attuale');
  await d.screenshot({path:out+'/33-gestisci-team.png'});
  await d.click('#tm-pick [data-id=p_fede]');await d.click('#tm-pick [data-id=p_melo]');await d.click('#tm-pick [data-id=p_lollo]');
  // nel frattempo Umbe si aggiunge da solo (la pagina di Tia non lo sa)
  await d.evaluate(()=>{__db.data.get('recipes/o2').ownerIds.push('p_umbe');});
  await d.click('[data-act=team-save]');
  await d.waitForFunction(()=>__db.data.get('recipes/o2').ownerIds.includes('p_lollo'));
  (await owners('o2'))==='p_jack,p_lollo,p_melo,p_tia,p_umbe|'?pass('Tia toglie Fede e aggiunge Melo e Lollo; Umbe, entrato nel frattempo, resta'):fail('team-save '+await owners('o2'));
  await d.click(card('Risi e bisi')+' [data-act=team-edit]');await d.waitForSelector('#tm-pick');
  for(const id of ['p_jack','p_lollo','p_melo','p_tia','p_umbe'])await d.click('#tm-pick [data-id='+id+']');
  await d.click('[data-act=team-save]');await d.waitForSelector('#ed-err:not([hidden])');
  (await d.textContent('#ed-err')).includes('almeno un responsabile')&&(await owners('o2'))==='p_jack,p_lollo,p_melo,p_tia,p_umbe|'?pass('il team non può restare vuoto'):fail('team vuoto');
  await d.click('.sheet [data-act=modal-close]');
  // chi non ha proposto non può gestire il team degli altri
  await logout();await login('Fede');
  (await d.$(card('Risi e bisi')+' [data-act=team-edit]'))===null?pass('chi non ha proposto non vede "Gestisci team"'):fail('team-edit non proponente');
  // mobile
  const m=await mk(390,844,true);await m.waitForSelector('.login');
  await m.evaluate(({s,recipes})=>{s.forEach(w=>__db.data.set(w.collection+'/'+w.doc_id,w.data));recipes.forEach(r=>__db.data.set(r[0],r[1]));__db.notify();},{s:seed,recipes});
  await m.click('.names .btn:has-text("Fede")');await m.waitForSelector('.rail');await m.click('.tab:has-text("Proposte")');await m.waitForSelector('.card');
  await m.screenshot({path:out+'/32-responsabili-mobile.png',clip:{x:0,y:380,width:390,height:520}});
  const ov=await m.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);ov<=1?pass('mobile: nessuno scroll orizzontale'):fail('overflow '+ov);
  console.log(errors.length?'ERRORI:\n'+errors.join('\n'):'nessun errore di console');
  if(errors.length)ok=false;
  await browser.close();process.exit(ok?0:1);
})().catch(e=>{console.error(e);process.exit(2);});
