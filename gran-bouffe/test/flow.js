// Scenario di prova (solo sviluppo): dati finti in memoria, mai pubblicati.
const {run,seed}=require('./harness');
const out=require('path').join(__dirname,'shots');
require('fs').mkdirSync(out,{recursive:true});

const R=(id,title,category,region,proposer,owners,extra)=>[`recipes/${id}`,Object.assign({title,category,region,link:'https://example.org/'+id,note:'',proposerId:proposer,ownerIds:owners,teamIds:[],createdAt:Date.now(),
  verifica:{stato:'da_verificare'},slot:'',serves:4,porzione:'normale',ingredients:[],steps:[],fasi:[],preparabileACasa:false,vini:[],consigli:''},extra||{})];
const I=(name,qty,unit,shop)=>({name,qty,unit,shop});
const recipes=[
  R('r1','Frico croccante','antipasti','Friuli-Venezia Giulia','p_teo',['p_teo'],{slot:'ven-cena',verifica:{stato:'verificato',nota:'Link ok'},ingredients:[I('Formaggio Montasio',500,'g','latticini'),I('Patate',400,'g','ortolano'),I('Cipolla',1,'pz','ortolano'),I('Olio di semi',0,'q.b.','dispensa')],steps:['Grattugia il formaggio.','Cuoci in padella antiaderente.'],fasi:[{label:'Cottura dei frichi',ore:1}]}),
  R('r2','Risi e bisi','primi','Veneto','p_tia',['p_tia','p_jack'],{slot:'ven-cena',verifica:{stato:'migliorato',fonte:'La Cucina Italiana',linkAutorevole:'https://example.org/autorevole',nota:'Aggiunta la versione con brodo di baccelli'},ingredients:[I('Riso Vialone Nano',320,'g','dispensa'),I('Piselli freschi',600,'g','ortolano'),I('Burro',50,'g','latticini'),I('Parmigiano Reggiano',100,'g','latticini'),I('Cipolla',0.5,'pz','ortolano')],vini:[{nome:'Soave Classico',bottiglie:1}],fasi:[{label:'Brodo di baccelli',ore:2}]}),
  R('r3','Baccalà alla vicentina','secondi','Veneto','p_fede',['p_fede'],{slot:'sab-cena',ingredients:[I('Stoccafisso ammollato',800,'g','carne'),I('Cipolla',2,'pz','ortolano'),I('Acciughe sotto sale',8,'pz','carne'),I('Latte',0.75,'l','latticini'),I('Parmigiano reggiano',0.1,'kg','latticini')],fasi:[{label:'Ammollo dello stoccafisso',ore:48},{label:'Cottura lenta (4 ore)',ore:4}],vini:[{nome:'Soave Classico',bottiglie:1},{nome:'Prosecco Brut',bottiglie:1}],consigli:'Non mescolare mai: scuoti la pentola.'}),
  R('r4','Jota','zuppe','Friuli-Venezia Giulia','p_murro',['p_murro'],{slot:'sab-pranzo',porzione:'assaggio',ingredients:[I('Fagioli borlotti secchi',300,'g','dispensa'),I('Crauti',400,'g','ortolano'),I('Costine affumicate',500,'g','carne'),I('Aglio',3,'spicchi','ortolano')],fasi:[{label:'Ammollo fagioli',ore:12},{label:'Cottura',ore:3}]}),
  R('r5','Brovada e muset','secondi','Friuli-Venezia Giulia','p_fantoni',['p_fantoni'],{slot:'sab-cena',fasi:[{label:'Brovada in vinaccia',ore:96}]}),
  R('r6','Tiramisù','dolci','Veneto','p_melo',['p_melo','p_umbe'],{slot:'dom-pranzo',preparabileACasa:true,ingredients:[I('Mascarpone',500,'g','latticini'),I('Uova',4,'pz','latticini'),I('Savoiardi',300,'g','dispensa'),I('Caffè',0.3,'l','dispensa'),I('Zucchero',100,'g','dispensa')],fasi:[{label:'Riposo in frigo',ore:6}]}),
  R('r7','Canederli in brodo','zuppe','Trentino-Alto Adige','p_jaki',['p_jaki'],{slot:'dom-pranzo',ingredients:[I('Pane raffermo',300,'g','dispensa'),I('Speck',150,'g','carne'),I('Uova',3,'pz','latticini'),I('Latte',0.25,'l','latticini'),I('Aglio',1,'spicchi','ortolano'),I('Parmigiano reggiano',0.7,'kg','latticini')],fasi:[{label:'Brodo di carne',ore:5}]}),
  R('r8','Sarde in saor','antipasti','Veneto','p_umbe',['p_umbe']),
  R('r9','Bigoli in salsa','primi','Veneto','p_turi',['p_turi']),
  R('r10','Gnocchi di susine','primi','Friuli-Venezia Giulia','p_lollo',['p_lollo']),
  R('r11','Luganega alla brace','griglia','Veneto','p_jack',['p_jack','p_murro']),
  R('r12','Strudel di mele','dolci','Trentino-Alto Adige','p_mazzetti',['p_mazzetti'])
];
const ranks={ // id votante -> categoria -> ordine
  p_teo:{primi:['r2','r9','r10'],antipasti:['r1','r8'],dolci:['r6','r12']},
  p_tia:{primi:['r9','r2','r10'],antipasti:['r8','r1'],dolci:['r6','r12']},
  p_jack:{primi:['r2','r10','r9'],antipasti:['r1','r8'],dolci:['r12','r6']}
};

(async()=>{
  const {browser,errors,mk}=await run();
  let ok=true;const fail=m=>{ok=false;console.log('FAIL',m);};const pass=m=>console.log('ok  ',m);
  const p=await mk(390,844,false);
  await p.waitForSelector('.login');
  await p.screenshot({path:out+'/01-vuoto-mobile.png'});
  if(!(await p.textContent('.login')).includes('vuoto'))fail('stato vuoto non mostrato');else pass('stato vuoto');
  await p.evaluate(s=>{s.forEach(w=>__db.data.set(w.collection+'/'+w.doc_id,w.data));__db.notify();},seed);
  await p.waitForSelector('.names .btn');
  const nNames=await p.$$eval('.names .btn',e=>e.length);
  nNames===15?pass('15 nomi preimpostati'):fail('nomi '+nNames);
  await p.screenshot({path:out+'/02-login-mobile.png'});
  await p.click('.names .btn:has-text("Teo")');
  await p.waitForSelector('.rail');await p.click('.tab:has-text("Proposte")');
  await p.screenshot({path:out+'/03-proposte-vuoto-mobile.png'});
  const conf=await p.textContent('.stats');conf.includes('15')?pass('15 confermati: '+conf.replace(/\s+/g,' ')):fail('confermati '+conf);

  // proposta: validazione e salvataggio
  await p.click('[data-act=new-recipe]');await p.waitForSelector('#ed-title');
  await p.click('[data-act=save-recipe]');
  (await p.textContent('#ed-err')).includes('nome')?pass('validazione nome'):fail('validazione nome');
  await p.fill('#ed-title','Risi e bisi (prova)');await p.fill('#ed-link','abc');await p.click('[data-act=save-recipe]');
  (await p.textContent('#ed-err')).includes('http')?pass('validazione link'):fail('validazione link');
  await p.fill('#ed-link','https://example.org/risi');
  await p.click('[data-act=dr-owner][data-id=p_teo]');await p.click('[data-act=save-recipe]');
  (await p.textContent('#ed-err')).includes('almeno')?pass('validazione responsabile'):fail('validazione responsabile');
  await p.click('[data-act=dr-owner][data-id=p_teo]');
  await p.screenshot({path:out+'/04-editor-proposta-mobile.png'});
  await p.click('[data-act=save-recipe]');await p.waitForSelector('.card');
  const saved=await p.evaluate(()=>[...__db.data.entries()].filter(e=>e[0].startsWith('recipes/')).map(e=>e[1]));
  saved.length===1&&saved[0].proposerId==='p_teo'&&saved[0].ownerIds.length===1&&saved[0].verifica.stato==='da_verificare'?pass('proposta salvata con proponente, responsabile, stato verifica'):fail('proposta '+JSON.stringify(saved));
  await p.evaluate(()=>{for(const k of [...__db.data.keys()])if(k.startsWith('recipes/'))__db.data.delete(k);__db.notify();});

  // dati ricchi
  await p.evaluate(({recipes,ranks})=>{recipes.forEach(r=>__db.data.set(r[0],r[1]));
    for(const [id,rank] of Object.entries(ranks))__db.data.set('votes/'+id,{rank,updatedAt:1});
    const s=__db.data.get('settings/main');s.fase='voto';__db.notify();},{recipes,ranks});
  await p.waitForSelector('.card');
  await p.screenshot({path:out+'/05-proposte-mobile.png',fullPage:true});
  await p.click('.tab:has-text("Votazioni")');await p.waitForSelector('.rank');
  await p.screenshot({path:out+'/06-voto-mobile.png',fullPage:true});
  const before=await p.$$eval('.slots .t',e=>e.map(x=>x.textContent.trim()));
  await p.selectOption('#rk-r8','1');
  const after=await p.$$eval('.slots .t',e=>e.map(x=>x.textContent.trim()));
  before[0]===after[1]&&before[1]===after[0]?pass('cambio posizione: il secondo piatto va al 1° posto, chi c’era scende al primo posto libero sotto'):fail('riordino '+before+' / '+after);
  await p.click('[data-act=save-rank]');
  await p.waitForFunction(()=>__db.data.get('votes/p_teo')&&__db.data.get('votes/p_teo').rank.antipasti[0]==='r8');
  pass('classifica salvata');
  await p.click('[data-act=vmode][data-v=ris]');await p.waitForSelector('.res');
  await p.screenshot({path:out+'/07-risultati-mobile.png',fullPage:true});

  // menu, scheda, spesa, programma (desktop)
  const d=await mk(1280,900,false);
  await d.waitForSelector('.login');
  await d.evaluate(({s,recipes,ranks})=>{s.forEach(w=>__db.data.set(w.collection+'/'+w.doc_id,w.data));recipes.forEach(r=>__db.data.set(r[0],r[1]));
    for(const [id,rank] of Object.entries(ranks))__db.data.set('votes/'+id,{rank,updatedAt:1});
    __db.data.get('settings/main').fase='menu';__db.notify();},{s:seed,recipes,ranks});
  await d.click('.names .btn:has-text("Marco Furio")');
  await d.waitForSelector('.rail');
  await d.click('.tab:has-text("Menu")');await d.waitForSelector('.days');
  await d.screenshot({path:out+'/08-menu-desktop.png',fullPage:true});
  const warn=await d.textContent('.days');
  warn.includes('Servono 4 giorni')||warn.includes('anticipo')?pass('avviso anticipo (brovada 96 h su sabato cena)'):fail('avviso anticipo mancante');
  await d.click('.dish .nm:has-text("Baccalà")');await d.waitForSelector('.hero');
  await d.screenshot({path:out+'/09-scheda-desktop.png',fullPage:true});
  const sch=await d.textContent('.hero+*,.view');
  (await d.textContent('.view')).includes('15')?pass('scheda scalata su 15 persone'):fail('scheda');
  const ingText=await d.$$eval('.ing tr',e=>e.map(x=>x.textContent.replace(/\s+/g,' ').trim()));
  console.log('     ingredienti baccalà:',ingText.join(' | '));
  await d.click('.tab:has-text("Spesa")');await d.waitForSelector('.shop');
  await d.screenshot({path:out+'/10-spesa-desktop.png',fullPage:true});
  const lines=await d.$$eval('.ln',e=>e.map(x=>x.querySelector('.nm').textContent.trim()+' = '+x.querySelector('.q').textContent.trim().replace(/\s+/g,' ')));
  console.log('     spesa:\n       '+lines.join('\n       '));
  const parm=lines.find(l=>l.startsWith('Parmigiano'));
  // parmigiano: r2 100g*15/4=375 ; r3 100g*15/4=375 (0,1kg) ; r7 700g*15/4=2625 -> 3375 g (norm. 'parmigiano reggiano' unica voce)
  parm&&parm.includes('3,4 kg')||parm&&parm.includes('3,38')||parm&&parm.includes('3,35')?pass('somma parmigiano tra piatti e unità diverse: '+parm):fail('parmigiano '+parm);
  await d.click('[data-act=copy-spesa]');
  const clip=await d.evaluate(()=>window.__clip);clip&&clip.includes('LISTA SPESA')?pass('copia WhatsApp'):fail('copia');
  await d.click('[data-act=pack][data-id=burro]');await d.fill('#pk-size','250');await d.click('[data-act=pack-save]');
  await d.waitForFunction(()=>__db.data.get('spesa/burro'));
  await d.waitForSelector('.ln .q small');
  pass('formato confezione: '+(await d.textContent('.ln .q small')));
  await d.click('.ln input[type=checkbox]');
  await d.waitForFunction(()=>[...__db.data.keys()].some(k=>k.startsWith('spesa/')&&__db.data.get(k).comprato));pass('comprato');
  await d.click('.tab:has-text("Programma")');await d.waitForSelector('.tl');
  await d.screenshot({path:out+'/11-programma-desktop.png',fullPage:true});
  await d.click('.tab:has-text("Persone")');await d.waitForSelector('.people-list');
  await d.screenshot({path:out+'/12-persone-desktop.png',fullPage:true});
  // aggiungi persona
  await d.fill('#np','Nuovo Amico');await d.click('form[data-sub=addperson] button[type=submit]');
  await d.waitForFunction(()=>__db.data.has('participants/p_nuovo-amico'));
  const c2=await d.textContent('.stats');c2.includes('15')?pass('nuovo partecipante non confermato di default: confermati ancora 15'):fail('conf '+c2);
  await d.check('[data-chg=confirm][data-id=p_nuovo-amico]');
  await d.waitForFunction(()=>document.querySelector('.stats').textContent.includes('16'));pass('conferma → 16 e spesa ricalcolata');
  // bozza Claude + salvataggio scheda
  await d.click('.tab:has-text("Menu")');await d.click('.dish .nm:has-text("Frico")');await d.click('[data-act=edit-dish]');
  await d.waitForSelector('#ai-btn');await d.click('#ai-btn');await d.waitForFunction(()=>document.querySelector('#ai-msg').textContent.includes('pronta'));
  await d.screenshot({path:out+'/13-editor-scheda-desktop.png'});
  await d.click('[data-act=save-dish]');await d.waitForFunction(()=>!document.querySelector('#ed-err')||document.querySelector('#modal').hidden);
  const fr=await d.evaluate(()=>__db.data.get('recipes/r1'));
  fr.ingredients.length===4&&fr.vini.length===1?pass('bozza Claude → scheda salvata'):fail('scheda '+JSON.stringify(fr.ingredients));
  // tema scuro
  const dk=await mk(390,844,true);
  await dk.waitForSelector('.login');
  await dk.evaluate(({s,recipes,ranks})=>{s.forEach(w=>__db.data.set(w.collection+'/'+w.doc_id,w.data));recipes.forEach(r=>__db.data.set(r[0],r[1]));__db.data.get('settings/main').fase='menu';__db.notify();},{s:seed,recipes,ranks});
  await dk.click('.names .btn:has-text("Fede")');await dk.waitForSelector('.rail');await dk.click('.tab:has-text("Spesa")');await dk.waitForSelector('.shop');
  await dk.screenshot({path:out+'/14-spesa-scuro-mobile.png'});
  // overflow orizzontale
  for(const [n,pg] of [['mobile',p],['dark',dk]]){
    const ov=await pg.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    ov<=1?pass('nessuno scroll orizzontale ('+n+')'):fail('overflow '+n+' '+ov);
  }
  console.log(errors.length?'ERRORI CONSOLE:\n'+errors.join('\n'):'nessun errore di console');
  if(errors.length)ok=false;
  await browser.close();
  process.exit(ok?0:1);
})().catch(e=>{console.error(e);process.exit(2);});
