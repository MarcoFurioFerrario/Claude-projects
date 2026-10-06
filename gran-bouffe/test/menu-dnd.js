// Prova: Menu a due colonne (pasti a sinistra, exit poll a destra con i primi 5 per portata) e trascinamento dei piatti.
const {run,seed}=require('./harness');
const out=require('path').join(__dirname,'shots');require('fs').mkdirSync(out,{recursive:true});
const R=(id,title,category,slot)=>[`recipes/${id}`,{title,category,region:'Veneto',link:'https://example.org/'+id,note:'',proposerId:'p_teo',ownerIds:['p_teo'],teamIds:[],createdAt:1000,
  verifica:{stato:'da_verificare'},slot:slot||'',serves:4,porzione:'normale',ingredients:[{name:'Sale',qty:0,unit:'q.b.',shop:'dispensa'}],steps:[],fasi:[],preparabileACasa:false,vini:[],consigli:''}];
const recipes=[
  R('a1','Antipasto Uno','antipasti','sab-pranzo'),R('a2','Antipasto Due','antipasti'),R('a3','Antipasto Tre','antipasti'),
  ...[1,2,3,4,5,6,7].map(i=>R('p'+i,'Primo '+i,'primi',i===1?'ven-cena':'')),
  R('s1','Secondo Uno','secondi'),R('s2','Secondo Due','secondi'),R('c1','Contorno Uno','contorni'),
  ...[1,2,3,4,5,6,7].map(i=>R('d'+i,'Dolce '+i,'dolci'))
];
const votes={ // tutti ordinano allo stesso modo: Primo 1..6, Dolce 1..6, Antipasto Uno/Due, Secondo Uno
  p_teo:{primi:['p1','p2','p3','p4','p5','p6'],dolci:['d1','d2','d3','d4','d5','d6'],antipasti:['a1','a2'],secondi:['s1']},
  p_tia:{primi:['p1','p2','p3','p4','p5','p6'],dolci:['d1','d2','d3','d4','d5','d6'],antipasti:['a1']},
  p_jack:{primi:['p1','p2','p3','p4','p5','p6'],dolci:['d1','d2','d3','d4','d5','d6']}
};
(async()=>{
  const {browser,errors,mk}=await run();
  let ok=true;const fail=m=>{ok=false;console.log('FAIL',m);};const pass=m=>console.log('ok  ',m);
  const setup=async(p)=>{await p.waitForSelector('.login');
    await p.evaluate(({s,recipes,votes})=>{s.forEach(w=>__db.data.set(w.collection+'/'+w.doc_id,w.data));recipes.forEach(r=>__db.data.set(r[0],r[1]));
      for(const [id,rank] of Object.entries(votes))__db.data.set('votes/'+id,{rank,updatedAt:5});
      __db.data.get('settings/main').fase='voto';__db.data.get('settings/main').formato='esagerare';__db.notify();},{s:seed,recipes,votes});};
  const d=await mk(1280,2400,false);await setup(d);
  await d.click('.names .btn:has-text("Marco Furio")');await d.waitForSelector('.rail');
  await d.click('.tab:has-text("Menu")');await d.waitForSelector('.menu2');
  const rec=id=>d.evaluate(i=>__db.data.get('recipes/'+i),id);
  // --- due colonne
  const L=await d.locator('.menu2-l').boundingBox(),Rb=await d.locator('.menu2-r').boundingBox();
  L.x<Rb.x&&Math.abs(L.y-Rb.y)<30&&L.width>Rb.width&&L.width+Rb.width>1000?pass('due colonne affiancate: il menu a sinistra (più larga), gli exit poll a destra'):fail('colonne '+JSON.stringify([L,Rb]));
  (await d.$('.band'))===null?pass('nel Menu non c’è la banda bordata del voto'):fail('banda nel menu');
  const meals=await d.$$eval('.menu2-l [data-mslot]',e=>e.map(x=>[x.dataset.mslot,Math.round(x.getBoundingClientRect().top)]));
  meals.map(x=>x[0]).join()==='ven-cena,sab-pranzo,sab-cena,dom-pranzo'&&meals.every((m,i)=>i===0||m[1]>meals[i-1][1])?pass('a sinistra i pasti uno sotto l’altro, da venerdì sera a domenica pranzo'):fail('pasti '+JSON.stringify(meals));
  (await d.$('[data-act=suggest]'))&&(await d.$('[data-act=clear-menu]'))?pass('«Suggerisci dai voti» e «Svuota» ci sono ancora'):fail('suggerisci');
  // --- exit poll: primi 5 per portata
  const poll=await d.$$eval('.xp .xp-cat',cs=>cs.map(c=>({t:c.querySelector('h4').textContent.replace(/\s+/g,' ').trim(),rows:[...c.querySelectorAll('.xpr .nm')].map(n=>n.textContent),vuoto:[...c.querySelectorAll('p.muted')].map(p=>p.textContent).join(' ')})));
  const by=Object.fromEntries(poll.map(c=>[c.t.split(' ')[0],c]));
  by.Primi.rows.join()==='Primo 1,Primo 2,Primo 3,Primo 4,Primo 5'?pass('Primi: solo i 5 più votati, in ordine (Primo 6 e 7 restano fuori)'):fail('primi '+JSON.stringify(by.Primi));
  by.Dolci.rows.length===5&&by.Dolci.rows[0]==='Dolce 1'?pass('Dolci: 5 righe (7 proposte, 6 votate)'):fail('dolci '+JSON.stringify(by.Dolci));
  by.Antipasti.rows.join()==='Antipasto Uno,Antipasto Due'?pass('Antipasti: solo i piatti con voti (2)'):fail('antipasti '+JSON.stringify(by.Antipasti));
  by.Contorni.rows.length===0&&by.Contorni.vuoto.includes('Nessun voto')&&by.Contorni.vuoto.includes('non contano nel numero dei piatti')?pass('Contorni senza voti: «Nessun voto ancora»'):fail('contorni '+JSON.stringify(by.Contorni));
  poll.length===5?pass('un blocco per ognuna delle 5 portate'):fail('blocchi '+poll.length);
  (await d.textContent('.xpr:has(.nm:text-is("Primo 1")) .badge')).includes('In menu')?pass('un piatto già nel menu è segnato «In menu · pasto» anche nell’exit poll'):fail('badge in menu');
  const xv=await d.textContent('.xpr:has(.nm:text-is("Primo 1")) .xpv');xv.includes('21')&&xv.includes('3 su 3')?pass('punti e votanti: 21 punti (3 votanti × 7 punti del primo posto), 3 su 3'):fail('punti '+xv);
  const rest=await d.textContent('.xp-rest');
  rest.includes('Primo 6')&&rest.includes('Primo 7')&&rest.includes('Dolce 6')&&rest.includes('Dolce 7')&&!(await d.$('.xp-rest[open]'))?pass('gli altri candidati sono in un riquadro chiuso, fuori dai primi 5'):fail('altri candidati');
  (await d.textContent('.xp-head')).includes('Evidenziati in verde quelli in menu')?pass('il riquadro spiega: «Evidenziati in verde quelli in menu»'):fail('legenda verde');
  const bg=await d.$eval('.xpr.inmenu',e=>getComputedStyle(e).backgroundColor),bg2=await d.$eval('.xpr:not(.inmenu)',e=>getComputedStyle(e).backgroundColor);
  bg!==bg2?pass('le righe in menu hanno davvero un colore diverso dalle altre'):fail('colore righe');
  const nr=(await d.$$('.xpr')).length,ns=(await d.$$('.xpr select.xps')).length;
  nr===ns&&nr>0?pass('ogni voce degli exit poll ha il menu a tendina per il pasto ('+ns+' su '+nr+')'):fail('select exit poll '+ns+'/'+nr);
  const o1=await d.$$eval('.xpr:has(.nm:text-is("Primo 3")) select.xps option',e=>e.map(x=>x.textContent));
  o1[0]==='Metti in menu…'&&o1.length===5?pass('per un piatto non in menu: «Metti in menu…» più i 4 pasti'):fail('opzioni '+o1);
  (await d.$eval('.xpr:has(.nm:text-is("Primo 1")) select.xps',e=>e.value))==='ven-cena'&&(await d.$eval('.xpr:has(.nm:text-is("Primo 1")) select.xps option',e=>e.textContent))==='Togli dal menu'?pass('per un piatto in menu: il pasto attuale selezionato e «Togli dal menu»'):fail('select in menu');
  await d.selectOption('.xpr:has(.nm:text-is("Primo 3")) select.xps','sab-cena');
  await d.waitForFunction(()=>__db.data.get('recipes/p3').slot==='sab-cena');
  await d.waitForSelector('.xpr.inmenu:has(.nm:text-is("Primo 3"))');
  pass('dal menu a tendina dell’exit poll: Primo 3 → Sabato cena, e la riga diventa verde');
  await d.selectOption('.xpr:has(.nm:text-is("Primo 3")) select.xps','');
  await d.waitForFunction(()=>!__db.data.get('recipes/p3').slot);
  await d.waitForSelector('.xpr:not(.inmenu):has(.nm:text-is("Primo 3"))');
  pass('«Togli dal menu» dall’exit poll: Primo 3 esce e la riga torna normale');
  await d.screenshot({path:out+'/91-menu-due-colonne.png',fullPage:true});

  // --- trascinamento
  const box=async sel=>(await d.locator(sel).first().boundingBox());
  const drag=async(from,to,steps)=>{const a=await box(from),b=await box(to);
    await d.mouse.move(a.x+a.width/2,a.y+a.height/2);await d.mouse.down();await d.mouse.move(b.x+b.width/2,b.y+Math.min(b.height/2,24),{steps:steps||10});};
  await drag('.xpr [data-mgrip=p2]','[data-mslot="sab-cena"]');
  (await d.$('.mghost'))&&(await d.$('.slot.mover'))?pass('trascinando: ombra del piatto e pasto di arrivo evidenziato'):fail('ghost/mover');
  await d.screenshot({path:out+'/92-menu-trascinamento.png'});
  await d.mouse.up();
  await d.waitForFunction(()=>__db.data.get('recipes/p2').slot==='sab-cena');
  pass('dall’exit poll al menu: Primo 2 → Sabato cena');
  await d.waitForSelector('[data-mslot="sab-cena"] .dish:has(.nm:text-is("Primo 2"))');
  (await d.textContent('.xpr:has(.nm:text-is("Primo 2")) .badge')).includes('Sabato cena')?pass('l’exit poll si aggiorna: «In menu · Sabato cena»'):fail('badge dopo drop');
  await drag('[data-mslot="ven-cena"] [data-mgrip=p1]','[data-mslot="dom-pranzo"]');await d.mouse.up();
  await d.waitForFunction(()=>__db.data.get('recipes/p1').slot==='dom-pranzo');pass('dentro il menu: Primo 1 da Venerdì sera a Domenica pranzo');
  await d.waitForSelector('[data-mslot="ven-cena"] .mempty');
  (await d.textContent('[data-mslot="ven-cena"] .mempty')).includes('Trascina')?pass('un pasto vuoto invita a trascinare un piatto'):fail('pasto vuoto');
  await drag('[data-mslot="sab-pranzo"] [data-mgrip=a1]','.xp-head');await d.mouse.up();
  await d.waitForFunction(()=>!__db.data.get('recipes/a1').slot);pass('dal menu agli exit poll: Antipasto Uno esce dal menu');
  (await d.textContent('.toast')).includes('tolto dal menu')?pass('un avviso conferma lo spostamento'):fail('toast '+await d.textContent('.toast'));
  const b4=(await rec('d1')).slot;
  await drag('.xpr [data-mgrip=d1]','h2');await d.mouse.up();await d.waitForTimeout(300);
  (await rec('d1')).slot===b4?pass('rilascio fuori dalle zone: non cambia nulla'):fail('drop fuori');
  await drag('.xpr [data-mgrip=d1]','[data-mslot="sab-pranzo"]');
  await d.evaluate(()=>{__db.notify();});await d.waitForTimeout(150);
  (await d.$('.mghost'))?pass('un aggiornamento dei dati durante il trascinamento non lo interrompe'):fail('render durante drag');
  await d.mouse.up();await d.waitForFunction(()=>__db.data.get('recipes/d1').slot==='sab-pranzo');pass('...e il rilascio funziona lo stesso');
  // il menu a tendina resta come alternativa
  await d.selectOption('[data-mslot="sab-pranzo"] .dish:has(.nm:text-is("Dolce 1")) select','ven-cena');
  await d.waitForFunction(()=>__db.data.get('recipes/d1').slot==='ven-cena');pass('il menu a tendina «Sposta» funziona ancora');
  const sp=await d.evaluate(()=>[...__db.data.entries()].filter(e=>e[0].startsWith('recipes/')&&e[1].slot).length);
  sp>=3?pass('ora in menu: '+sp+' piatti'):fail('conteggio');
  await d.click('[data-act=suggest]');await d.waitForSelector('[data-act=suggest-go]');pass('«Suggerisci dai voti» apre ancora la conferma');
  await d.click('[data-act=suggest-cancel]');

  // --- chi non organizza: vede tutto, non sposta
  const f=await mk(1280,2400,false);await setup(f);
  await f.click('.names .btn:has-text("Fede")');await f.waitForSelector('.rail');
  await f.click('.tab:has-text("Menu")');await f.waitForSelector('.menu2');
  (await f.$$('.mgrip')).length===0&&(await f.$$('.menu2 select')).length===0&&(await f.$$('.xps')).length===0&&(await f.$('[data-mdrop]'))===null?pass('chi non è organizzatore: niente maniglie, né menu a tendina (nemmeno negli exit poll), né zona di rilascio'):fail('permessi');
  (await f.$$('.xpr')).length>=12&&(await f.textContent('.xp-head')).includes('Evidenziati in verde')?pass('...ma vede gli exit poll, la legenda e il menu'):fail('exit poll visitatore');
  await f.close();

  // --- telefono
  const m=await mk(390,844,true);await setup(m);
  await m.click('.names .btn:has-text("Marco Furio")');await m.waitForSelector('.rail');
  await m.click('.tab:has-text("Menu")');await m.waitForSelector('.menu2');
  const ml=await m.locator('.menu2-l').boundingBox(),mr=await m.locator('.menu2-r').boundingBox();
  mr.y>ml.y+ml.height-5&&Math.abs(ml.x-mr.x)<5?pass('telefono: una colonna, prima il menu poi gli exit poll'):fail('mobile colonne '+JSON.stringify([ml,mr]));
  const ov=await m.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);ov<=1?pass('telefono: nessuno scroll orizzontale'):fail('overflow '+ov);
  const nm=await m.$$eval('.menu2 .nm',e=>e.map(n=>Math.round(n.getBoundingClientRect().height)));
  nm.every(h=>h<=90)?pass('telefono: titoli leggibili'):fail('titoli alti '+nm);
  await m.screenshot({path:out+'/93-menu-telefono.png',fullPage:true});
  console.log(errors.length?'ERRORI:\n'+errors.join('\n'):'nessun errore di console');
  if(errors.length)ok=false;
  await browser.close();process.exit(ok?0:1);
})().catch(e=>{console.error(e);process.exit(2);});
