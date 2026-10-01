// Prova della sezione Suggerimenti (artifact, db finto in memoria). Dati inventati solo per il test.
const {run,seed}=require('./harness');
const out=require('path').join(__dirname,'shots');require('fs').mkdirSync(out,{recursive:true});
const R=(id,title,category,region,extra)=>[`recipes/${id}`,Object.assign({title,category,region,link:'https://example.org/'+id,note:'',proposerId:'p_marco-furio',ownerIds:['p_marco-furio'],teamIds:[],createdAt:Date.now(),
  verifica:{stato:'da_verificare'},slot:'',serves:4,porzione:'normale',ingredients:[],steps:[],fasi:[],preparabileACasa:false,vini:[],consigli:''},extra||{})];
const recipes=[
  R('t1','Tiramisu','dolci','Veneto',{slot:'dom-pranzo',vini:[{nome:'Prosecco Superiore DOCG Dry',bottiglie:0}]}),
  R('t2','Jota','zuppe','Friuli-Venezia Giulia',{slot:'sab-pranzo',vini:[{nome:'Carso Terrano DOC',bottiglie:2}]}),
  R('t3','Gubana','dolci','Friuli-Venezia Giulia',{slot:'sab-cena'}),
  R('t4','Presnitz triestino','dolci','Friuli-Venezia Giulia',{slot:'dom-pranzo'}),
  R('t5','Bigoli in salsa','primi','Veneto'),
  R('t6','Sarde in saor','antipasti','Veneto')
];
(async()=>{
  const {browser,errors,mk}=await run();
  let ok=true;const fail=m=>{ok=false;console.log('FAIL',m);};const pass=m=>console.log('ok  ',m);
  const d=await mk(1280,900,false);
  await d.waitForSelector('.login');
  await d.evaluate(({s,recipes})=>{s.forEach(w=>__db.data.set(w.collection+'/'+w.doc_id,w.data));recipes.forEach(r=>__db.data.set(r[0],r[1]));__db.notify();},{s:seed,recipes});
  await d.click('.names .btn:has-text("Marco Furio")');await d.waitForSelector('.rail');
  await d.click('.tab:has-text("Suggerimenti")');await d.waitForSelector('.card.sg');
  const tot=await d.$$eval('.totals .big',e=>e.map(x=>x.textContent));
  tot.join(',')==='44,38,2,4'?pass('contatori: 44 piatti, 38 da proporre, 2 proposti, 4 approvati'):fail('contatori '+tot);
  const card=t=>`.card.sg:has(h3:text-is("${t}"))`;
  (await d.textContent(card('Tiramisù')+' .badge')).includes('Approvata · Domenica pranzo')?pass('flag Approvata su Tiramisù (riconosciuto anche se proposto a mano senza accento)'):fail('flag tiramisu');
  (await d.textContent(card('Sarde in saor')+' .badge')).includes('Già proposta')?pass('flag Già proposta su Sarde in saor'):fail('flag sarde');
  (await d.textContent(card('Putizza goriziana e triestina')+' .sim')).includes('Gubana')?pass('Putizza: avviso "simile a Gubana e Presnitz"'):fail('simile');
  await d.screenshot({path:out+'/20-suggerimenti-desktop.png',clip:{x:0,y:0,width:1280,height:1500},fullPage:true});
  // filtri
  await d.selectOption('#sst','menu');
  (await d.$$eval('.card.sg',e=>e.length))===4?pass('filtro Stato=Approvati: 4 piatti'):fail('filtro stato');
  await d.selectOption('#sst','');await d.fill('#sq','soave');
  const ns=await d.$$eval('.card.sg',e=>e.length);ns>=4?pass('ricerca per vino "soave": '+ns+' piatti'):fail('ricerca vino '+ns);
  await d.fill('#sq','anatra');(await d.$$eval('.card.sg h3',e=>e.map(x=>x.textContent))).includes('Bigoli co\' l\'arna')?pass('ricerca per ingrediente "anatra"'):fail('ricerca ingrediente');
  await d.fill('#sq','');await d.selectOption('#slv','C');
  (await d.$$eval('.card.sg',e=>e.length))===5?pass('filtro livello C: 5 piatti (come nel documento)'):fail('livello C');
  await d.selectOption('#slv','-');(await d.$$eval('.card.sg',e=>e.length))===22?pass('livello da assegnare: 22 piatti'):fail('livello da assegnare');
  await d.selectOption('#slv','');await d.selectOption('#swt','Passito / Dolce');
  (await d.$$eval('.card.sg',e=>e.length))===9?pass('tipo di vino Passito/Dolce: 9 piatti'):fail('tipo vino');
  await d.selectOption('#swt','');
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
  await d.waitForFunction(()=>{const c=[...document.querySelectorAll('.card.sg')].find(x=>x.querySelector('h3').textContent.startsWith('Brasato'));return c&&c.querySelector('.badge').textContent.includes('Già proposta');},null,{timeout:5000}).catch(()=>{});
  (await d.textContent(card('Brasato di manzo al Teroldego')+' .badge')).includes('Già proposta')?pass('il piatto diventa "Già proposta" e non si può riproporre'):fail('flag dopo proposta');
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
  await d.click('.tab:has-text("Suggerimenti")');await d.click(card('Tiramisù')+' [data-act=sug-open]');await d.waitForSelector('.hero');pass('"Apri la scheda" dal suggerimento');
  // mobile + scuro
  const m=await mk(390,844,true);await m.waitForSelector('.login');
  await m.evaluate(({s,recipes})=>{s.forEach(w=>__db.data.set(w.collection+'/'+w.doc_id,w.data));recipes.forEach(r=>__db.data.set(r[0],r[1]));__db.notify();},{s:seed,recipes});
  await m.click('.names .btn:has-text("Teo")');await m.waitForSelector('.rail');await m.click('.tab:has-text("Suggerimenti")');await m.waitForSelector('.card.sg');
  await m.evaluate(()=>document.querySelector('#sg-eq summary').click());await m.waitForSelector('.eq');
  await m.screenshot({path:out+'/23-suggerimenti-mobile-scuro.png'});
  await m.evaluate(()=>window.scrollTo(0,1500));await m.screenshot({path:out+'/24-suggerimenti-mobile-cards.png'});
  const ov=await m.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);ov<=1?pass('mobile: nessuno scroll orizzontale'):fail('overflow '+ov);
  console.log(errors.length?'ERRORI:\n'+errors.join('\n'):'nessun errore di console');
  if(errors.length)ok=false;
  await browser.close();process.exit(ok?0:1);
})().catch(e=>{console.error(e);process.exit(2);});
