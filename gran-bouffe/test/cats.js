// Prova: zuppe unite ai primi e griglia unita ai secondi, con dati già esistenti nelle vecchie categorie.
const {run,seed}=require('./harness');
const R=(id,title,category,extra)=>[`recipes/${id}`,Object.assign({title,category,region:'Veneto',link:'https://example.org/'+id,note:'',proposerId:'p_teo',ownerIds:['p_teo'],teamIds:[],createdAt:Date.now(),
  verifica:{stato:'da_verificare'},slot:'',serves:4,porzione:'normale',ingredients:[],steps:[],fasi:[],preparabileACasa:false,vini:[],consigli:''},extra||{})];
const recipes=[R('c1','Bigoli in salsa','primi'),R('c2','Jota triestina','zuppe'),R('c3','Gulasch triestino','secondi'),R('c4','Carre di costine','griglia')];
(async()=>{
  const {browser,errors,mk}=await run();
  let ok=true;const fail=m=>{ok=false;console.log('FAIL',m);};const pass=m=>console.log('ok  ',m);
  const d=await mk(1280,900,false);await d.waitForSelector('.login');
  await d.evaluate(({s,recipes})=>{s.forEach(w=>__db.data.set(w.collection+'/'+w.doc_id,w.data));recipes.forEach(r=>__db.data.set(r[0],r[1]));
    __db.data.set('votes/p_marco-furio',{rank:{primi:['c1'],zuppe:['c2'],griglia:['c4']},updatedAt:1});__db.data.get('settings/main').fase='voto';__db.notify();},{s:seed,recipes});
  await d.click('.names .btn:has-text("Marco Furio")');await d.waitForSelector('.rail');
  await d.click('.tab:has-text("Proposte")');await d.waitForSelector('.card');
  const chips=await d.$$eval('.filterchips .fchip',e=>e.map(x=>x.textContent.trim()));
  chips.join('|')==='Tutte|Antipasti e snack|Primi e zuppe|Secondi e griglia|Contorni|Dolci'?pass('categorie: '+chips.slice(1).join(', ')):fail('categorie '+chips);
  const groups=await d.$$eval('h3.grp',e=>e.map(x=>x.textContent.replace(/\s+/g,' ').trim()));
  groups.length===2&&groups[0].startsWith('Primi e zuppe')&&groups[0].endsWith('2')&&groups[1].startsWith('Secondi e griglia')&&groups[1].endsWith('2')
    ?pass('le proposte con le vecchie categorie compaiono sotto quelle nuove (2 + 2)'):fail('gruppi '+groups);
  await d.waitForFunction(()=>__db.data.get('recipes/c2').category==='primi'&&__db.data.get('recipes/c4').category==='secondi');
  pass('l\'organizzatore sistema anche il database: Jota → primi, costine → secondi');
  await d.click('[data-act=new-recipe]');await d.waitForSelector('#ed-cat');
  const opts=await d.$$eval('#ed-cat option',e=>e.map(x=>x.value));
  opts.join(',')==='antipasti,primi,secondi,contorni,dolci'?pass('modulo di proposta: 5 categorie'):fail('opzioni '+opts);
  await d.click('.sheet [data-act=modal-close]');
  // voto
  await d.click('.tab:has-text("Votazioni")');await d.waitForSelector('[data-act=vcat]');
  const vt=await d.$$eval('.filterchips .fchip',e=>e.map(x=>x.textContent.replace(/[✓\s\d]+$/,'').replace(/^✓\s*/,'').trim()));
  vt.length===7?pass('votazioni: 5 categorie (più i due interruttori)'):fail('chip voto '+vt);
  await d.click('[data-act=vcat][data-v=primi]');await d.waitForSelector('.rank');
  const rows=await d.$$eval('.rank .t',e=>e.map(x=>x.textContent.replace(/\s+/g,' ').trim()));
  rows.length===2&&rows[0].startsWith('Bigoli in salsa')&&rows[1].startsWith('Jota triestina')&&rows[1].includes('Nuova')
    ?pass('in "Primi e zuppe" l\'ordine salvato resta e la jota compare come nuova da ordinare'):fail('righe '+rows);
  // il vecchio voto sulle zuppe non conta più, quello sui primi sì
  await d.click('[data-act=vmode][data-v=ris]');await d.waitForSelector('.res');
  const res=await d.$$eval('.res',e=>e.map(x=>x.textContent.replace(/\s+/g,' ').trim()));
  res.length===2&&res[0].includes('Bigoli in salsa')&&res[0].includes('1 voto')&&res[1].includes('nessun voto')?pass('risultati: il voto sui primi vale, quello sulle vecchie zuppe viene ignorato'):fail('risultati '+res);
  // suggerimenti
  await d.click('.tab:has-text("Suggerimenti")');await d.waitForSelector('.card.sg');
  const sg=await d.$$eval('h3.grp',e=>e.map(x=>x.textContent.replace(/\s+/g,' ').trim()));
  sg.some(x=>x.startsWith('Zuppe'))?fail('gruppo zuppe nei suggerimenti'):pass('suggerimenti: niente più gruppo "Zuppe" ('+sg.map(x=>x.replace(/\s\d+$/,'')).join(', ')+')');
  const jota=await d.$$eval('.card.sg h3',e=>e.map(x=>x.textContent));!jota.includes('Jota triestina')&&jota.length>0?pass('la jota, già proposta, non compare più tra i suggerimenti'):fail('jota '+jota.includes('Jota triestina'));
  // menu: suggerisci rispetta le quote 22
  await d.evaluate(()=>{__db.data.get('settings/main').fase='menu';__db.notify();});
  console.log(errors.length?'ERRORI:\n'+errors.join('\n'):'nessun errore di console');
  if(errors.length)ok=false;
  await browser.close();process.exit(ok?0:1);
})().catch(e=>{console.error(e);process.exit(2);});
