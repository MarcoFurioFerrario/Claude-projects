// Prova: miniatura della ricetta nelle righe di Votazioni (Risultati e La mia classifica), senza cambiare l'altezza delle righe.
const {run,seed}=require('./harness');
const out=require('path').join(__dirname,'shots');require('fs').mkdirSync(out,{recursive:true});
const F=(u,ai)=>Object.assign({url:u,pagina:'https://www.cucchiaio.it/ricetta/x/',fonte:'Cucchiaio d’Argento',data:'2026-10-03'},ai?{ai:true,fonte:'Immagine creata con AI',autore:'Pollinations.AI'}:{});
const R=(id,title,foto)=>[`recipes/${id}`,{title,category:'primi',region:'Veneto',link:'https://example.org/'+id,note:'',proposerId:'p_teo',ownerIds:['p_teo'],teamIds:[],createdAt:1000,
  verifica:{stato:'da_verificare'},slot:'',serves:4,porzione:'normale',ingredients:[],steps:[],fasi:[],preparabileACasa:false,vini:[],consigli:'',foto:foto||null}];
const recipes=[R('p1','Bigoli in salsa',F('https://img.test/a.png')),R('p2','Pasta e fasioi alla veneta con un titolo davvero lungo per andare a capo',F('https://img.test/b.png')),R('p3','Jota triestina',F('https://img.test/c.png',true)),
  R('p4','Risi e bisi'),R('p5','Gnocchi con foto rotta',F('https://broken.test/x.png')),R('p6','Canederli allo speck',F('https://img.test/d.png'))];
const votes={p_teo:{primi:['p1','p2','p3','p4','p5','p6']},p_tia:{primi:['p1','p3','p2']},p_jack:{primi:['p2','p1']}};
(async()=>{
  const {browser,errors,mk}=await run();
  let ok=true;const fail=m=>{ok=false;console.log('FAIL',m);};const pass=m=>console.log('ok  ',m);
  const setup=async p=>{await p.waitForSelector('.login');
    await p.evaluate(({s,recipes,votes})=>{s.forEach(w=>__db.data.set(w.collection+'/'+w.doc_id,w.data));recipes.forEach(r=>__db.data.set(r[0],r[1]));
      for(const [id,rank] of Object.entries(votes))__db.data.set('votes/'+id,{rank,updatedAt:5});__db.data.get('settings/main').fase='voto';__db.notify();},{s:seed,recipes,votes});};
  const d=await mk(1280,1300,false);await setup(d);
  await d.click('.names .btn:has-text("Fede")');await d.waitForSelector('.rail');
  await d.click('.tab:has-text("Votazioni")');await d.click('[data-act=vcat][data-v=primi]');
  // ---- Risultati
  await d.click('[data-act=vmode][data-v=ris]');await d.waitForSelector('.res');
  const rows=await d.$$('.res');rows.length===6?pass('6 righe di risultati'):fail('righe '+rows.length);
  (await d.$$('.res .tn')).length===6?pass('ogni riga ha il suo riquadro per la miniatura (anche chi non ha foto)'):fail('riquadri');
  await d.waitForFunction(()=>[...document.querySelectorAll('.res .tn img')].filter(i=>i.complete&&i.naturalWidth>0).length>=3,null,{timeout:8000}).catch(()=>{});
  pass('le miniature con foto si caricano');
  const pos=await d.$$eval('.res',rs=>rs.map(r=>{const b=r.getBoundingClientRect(),t=r.querySelector('.tn').getBoundingClientRect(),txt=r.children[1].getBoundingClientRect(),bar=r.querySelector('.bar').getBoundingClientRect();
    return{ord:[...r.children].map(c=>c.className.split(' ')[0]||c.tagName).join(','),tn:{l:t.left,r:t.right,w:t.width,h:t.height},txtR:txt.right,barL:bar.left,mid:((t.left+t.right)/2-b.left)/b.width};}));
  pos.every(p=>p.tn.l>=p.txtR-1&&p.tn.r<=p.barL+1)?pass('la miniatura sta tra la descrizione e il grafico dei voti'):fail('posizione '+JSON.stringify(pos[0]));
  pos.every(p=>p.mid>0.35&&p.mid<0.8)?pass('in posizione circa centrale ('+pos.map(p=>Math.round(p.mid*100)+'%').join(', ')+' della larghezza)'):fail('centro '+pos.map(p=>p.mid));
  pos.every(p=>Math.abs(p.tn.l-pos[0].tn.l)<1)?pass('le miniature sono incolonnate (stesso x in tutte le righe)'):fail('colonna');
  // altezza delle righe: con la miniatura o con una miniatura alta 0, le righe misurano uguale
  const h1=await d.$$eval('.res',rs=>rs.map(r=>Math.round(r.getBoundingClientRect().height*10)/10));
  await d.addStyleTag({content:'.tn{height:0!important;border:0!important}'});
  const h0=await d.$$eval('.res',rs=>rs.map(r=>Math.round(r.getBoundingClientRect().height*10)/10));
  h1.every((h,i)=>Math.abs(h-h0[i])<=0.5)?pass('altezza delle righe invariata ('+h1.join(', ')+' px)'):fail('altezze '+h1+' / '+h0);
  // ---- sigla AI e immagine che non si carica (pagina nuova: le foto rotte restano registrate nella sessione)
  const d2=await mk(1280,1300,false);await setup(d2);
  await d2.click('.names .btn:has-text("Fede")');await d2.waitForSelector('.rail');
  await d2.click('.tab:has-text("Votazioni")');await d2.click('[data-act=vcat][data-v=primi]');await d2.click('[data-act=vmode][data-v=ris]');await d2.waitForSelector('.res');
  const ai=await d2.$$eval('.res',rs=>rs.filter(r=>r.textContent.includes('Jota triestina')).map(r=>({ai:r.querySelector('.tn').classList.contains('ai'),t:r.querySelector('.tn').title})));
  ai.length===1&&ai[0].ai&&ai[0].t.includes('creata con AI')?pass('l’immagine creata con AI porta la sigla «AI» (con spiegazione al passaggio del mouse)'):fail('ai '+JSON.stringify(ai));
  await d2.waitForFunction(()=>{const r=[...document.querySelectorAll('.res')].find(x=>x.textContent.includes('foto rotta'));return r&&r.querySelector('.tn.none');},null,{timeout:8000});
  pass('foto che non si carica: resta il riquadro vuoto, senza icona rotta');
  const nofoto=await d2.$$eval('.res',rs=>rs.filter(r=>r.textContent.includes('Risi e bisi')).map(r=>r.querySelector('.tn').classList.contains('none')));
  nofoto[0]===true?pass('ricetta senza foto: riquadro vuoto tratteggiato'):fail('senza foto');
  await d2.screenshot({path:out+'/96-voto-risultati-foto.png',clip:{x:0,y:380,width:1280,height:560}});
  // ---- La mia classifica
  await d2.click('[data-act=vmode][data-v=mia]');await d2.waitForSelector('.rankbox');
  await d2.selectOption('#rk-p1','1');await d2.selectOption('#rk-p2','2');
  (await d2.$$('.rankbox .dr .tn')).length===6?pass('anche nelle righe della mia classifica (slot e fuori classifica)'):fail('tn in classifica '+(await d2.$$('.rankbox .dr .tn')).length);
  const ord=await d2.$$eval('.rkslot.on .dr',rs=>rs.map(r=>[...r.children].map(c=>c.className.split(' ')[0]||c.tagName).join(',')));
  ord.every(o=>/dt,tn.*,pp/.test(o))?pass('la miniatura sta tra la descrizione e il numero della posizione'):fail('ordine classifica '+ord);
  const g1=await d2.$$eval('.rkslot.on, .poolist li',rs=>rs.map(r=>Math.round(r.getBoundingClientRect().height*10)/10));
  await d2.addStyleTag({content:'.tn{height:0!important;border:0!important}'});
  const g0=await d2.$$eval('.rkslot.on, .poolist li',rs=>rs.map(r=>Math.round(r.getBoundingClientRect().height*10)/10));
  g1.every((h,i)=>Math.abs(h-g0[i])<=0.5)?pass('altezza delle righe invariata anche nella classifica ('+g1.join(', ')+' px)'):fail('altezze classifica '+g1+' / '+g0);
  // ---- telefono
  const m=await mk(390,844,false);await setup(m);
  await m.click('.names .btn:has-text("Fede")');await m.waitForSelector('.rail');
  await m.click('.tab:has-text("Votazioni")');await m.click('[data-act=vcat][data-v=primi]');await m.click('[data-act=vmode][data-v=ris]');await m.waitForSelector('.res');
  const tw=await m.$$eval('.res .tn',e=>e.map(x=>Math.round(x.getBoundingClientRect().width)));
  tw.every(w=>w<=52)?pass('telefono: miniature più piccole ('+tw[0]+' px)'):fail('larghezza mobile '+tw);
  let ov=await m.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);ov<=1?pass('telefono: nessuno scroll orizzontale nei risultati'):fail('overflow ris '+ov);
  await m.screenshot({path:out+'/97-voto-risultati-telefono.png'});
  const mh=await m.$$eval('.res',rs=>rs.map(r=>Math.round(r.getBoundingClientRect().height)));
  await m.addStyleTag({content:'.tn{height:0!important;border:0!important}'});
  const mh0=await m.$$eval('.res',rs=>rs.map(r=>Math.round(r.getBoundingClientRect().height)));
  mh.every((h,i)=>Math.abs(h-mh0[i])<=1)?pass('telefono: altezza delle righe invariata'):fail('altezze mobile '+mh+' / '+mh0);
  await m.click('[data-act=vmode][data-v=mia]');await m.waitForSelector('.rankbox');
  ov=await m.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);ov<=1?pass('telefono: nessuno scroll orizzontale nella classifica'):fail('overflow classifica '+ov);
  const real=errors.filter(e=>!/broken\.test|ERR_FAILED|Failed to load resource/.test(e));
  console.log(real.length?'ERRORI:\n'+real.join('\n'):'nessun errore di console (a parte l’immagine volutamente irraggiungibile)');
  if(real.length)ok=false;
  await browser.close();process.exit(ok?0:1);
})().catch(e=>{console.error(e);process.exit(2);});
