// Prova: la barra delle schede (Suggerimenti, Il libro, Proposte…) è cliccabile, scorrevole, con frecce, e non perde la posizione.
const {run,seed}=require('./harness');
const out=require('path').join(__dirname,'shots');require('fs').mkdirSync(out,{recursive:true});
(async()=>{
  const {browser,errors,mk}=await run();
  let ok=true;const fail=m=>{ok=false;console.log('FAIL',m);};const pass=m=>console.log('ok  ',m);
  const m=await mk(390,844,false);await m.waitForSelector('.login');
  await m.evaluate(({s})=>{s.forEach(w=>__db.data.set(w.collection+'/'+w.doc_id,w.data));__db.notify();},{s:seed});
  await m.click('.names .btn:has-text("Fede")');await m.waitForSelector('.rail');
  const st=()=>m.evaluate(()=>{const n=document.querySelector('.tabs .in'),b=document.querySelector('.tabs');return{sl:Math.round(n.scrollLeft),cw:n.clientWidth,sw:n.scrollWidth,l:!document.querySelector('.tabarr.l').hidden,r:!document.querySelector('.tabarr.r').hidden,cl:b.classList.contains('can-l'),cr:b.classList.contains('can-r')};});
  let s=await st();
  s.sw>s.cw&&s.r&&!s.l&&s.cr?pass('mobile: la barra è più larga dello schermo, compare la freccia destra «›» (non la sinistra)'):fail('stato iniziale '+JSON.stringify(s));
  (await m.$$eval('.tabs .tab',e=>e.every(t=>t.tagName==='BUTTON'&&t.getAttribute('role')==='tab'&&getComputedStyle(t).cursor==='pointer')))?pass('le schede sono pulsanti veri (role=tab, cursore a mano)'):fail('tab non pulsanti');
  (await m.$eval('.tabs .tab[aria-current=page]',e=>e.textContent)).startsWith('Suggerimenti')?pass('la scheda attiva è evidenziata (aria-current)'):fail('attiva');
  (await m.evaluate(()=>{const t=document.querySelector('nav.tabs'),r=document.querySelector('.rail');return !!(t.compareDocumentPosition(r)&Node.DOCUMENT_POSITION_FOLLOWING)&&t.getBoundingClientRect().bottom<260;}))?pass('la barra delle schede sta subito sotto il titolo, prima della fase del progetto e della banda, visibile senza scorrere'):fail('posizione barra');
  (await m.textContent('.railhd')).toLowerCase().includes('fase del progetto')&&(await m.$$eval('.rail button',e=>e.length))===0?pass('la fase del progetto è un indicatore a tratti con etichetta (non cliccabile per chi non organizza), distinto dalle schede'):fail('rail');
  (await m.textContent('#sg-eq')).includes('Ancora nessuna proposta')&&!/null|undefined|NaN/.test(await m.textContent('#sg-eq'))?pass('Equilibrio senza proposte: lo dice (nessun «ben distribuite» a vuoto)'):fail('equilibrio vuoto');
  await m.screenshot({path:out+'/70-schede-mobile.png',clip:{x:0,y:0,width:390,height:300}});
  await m.click('.tabarr.r');await m.waitForFunction(()=>document.querySelector('.tabs .in').scrollLeft>100);
  s=await st();s.l?pass('la freccia «›» fa scorrere la barra, ora compare «‹»'):fail('freccia sinistra '+JSON.stringify(s));
  // scorri fino in fondo con le frecce
  for(let i=0;i<6&&(await st()).r;i++){await m.click('.tabarr.r');await m.waitForTimeout(450);}
  s=await st();!s.r&&s.l?pass('in fondo la freccia destra sparisce'):fail('fine corsa '+JSON.stringify(s));
  // la scheda scelta resta dove sei dopo il ridisegno
  const lab=await m.$eval('.tabs .tab:last-child',e=>e.textContent.trim());
  await m.click('.tabs .tab:last-child');await m.waitForTimeout(300);
  s=await st();
  (await m.$eval('.tabs .tab[aria-current=page]',e=>e.textContent.trim()))===lab&&s.sl>100?pass('tocco su «'+lab.replace(/\d+.*$/,'')+'»: la barra non torna a sinistra e la scheda attiva resta visibile'):fail('scroll perso '+JSON.stringify(s));
  const vis=await m.evaluate(()=>{const n=document.querySelector('.tabs .in').getBoundingClientRect(),a=document.querySelector('.tab[aria-current=page]').getBoundingClientRect();return a.left>=n.left-1&&a.right<=n.right+1;});
  vis?pass('la scheda attiva è dentro la parte visibile della barra'):fail('attiva non visibile '+JSON.stringify(await m.evaluate(()=>{const n=document.querySelector('.tabs .in').getBoundingClientRect(),a=document.querySelector('.tab[aria-current=page]').getBoundingClientRect();return[n.left,n.right,a.left,a.right,document.querySelector('.tabs .in').scrollLeft];})));
  // da un'altra scheda lontana: tornare a Suggerimenti la riporta in vista
  await m.click('.tabarr.l');await m.waitForTimeout(450);
  await m.evaluate(()=>{location.hash='#suggerimenti';});await m.waitForSelector('.hero-sug');
  const vis2=await m.evaluate(()=>{const n=document.querySelector('.tabs .in').getBoundingClientRect(),a=document.querySelector('.tab[aria-current=page]').getBoundingClientRect();return a.left>=n.left-1&&a.right<=n.right+1;});
  vis2?pass('cambiando scheda dal link, quella attiva viene riportata in vista'):fail('attiva fuori vista dopo hash');
  // niente scroll orizzontale della pagina
  const ov=await m.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);ov<=1?pass('la pagina non scorre in orizzontale (scorre solo la barra)'):fail('overflow '+ov);
  // scorrimento col dito/trackpad: la barra si muove da sola e le frecce seguono
  await m.evaluate(()=>{document.querySelector('.tabs .in').scrollLeft=0;});await m.waitForTimeout(100);
  s=await st();!s.l?pass('scorrendo a mano fino a sinistra la freccia «‹» sparisce'):fail('freccia sx non sparita');
  // desktop: tutte le schede stanno, nessuna freccia
  const d=await mk(1280,900,false);await d.waitForSelector('.login');
  await d.evaluate(({s})=>{s.forEach(w=>__db.data.set(w.collection+'/'+w.doc_id,w.data));__db.notify();},{s:seed});
  await d.click('.names .btn:has-text("Fede")');await d.waitForSelector('.rail');
  const ds=await d.evaluate(()=>({l:document.querySelector('.tabarr.l').hidden,r:document.querySelector('.tabarr.r').hidden}));
  ds.l&&ds.r?pass('desktop: le schede ci stanno tutte, nessuna freccia'):fail('frecce desktop '+JSON.stringify(ds));
  await d.screenshot({path:out+'/71-schede-desktop.png',clip:{x:0,y:0,width:1280,height:260}});
  await d.hover('.tabs .tab:nth-child(3)');
  console.log(errors.length?'ERRORI:\n'+errors.join('\n'):'nessun errore di console');
  if(errors.length)ok=false;
  await browser.close();process.exit(ok?0:1);
})().catch(e=>{console.error(e);process.exit(2);});
