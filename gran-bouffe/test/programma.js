// Prova: il Programma (cronoprogramma) include gli appuntamenti fissi della domenica, anche senza piatti in menu.
const {run,seed}=require('./harness');
const out=require('path').join(__dirname,'shots');require('fs').mkdirSync(out,{recursive:true});
(async()=>{
  const {browser,errors,mk}=await run();
  let ok=true;const fail=m=>{ok=false;console.log('FAIL',m);};const pass=m=>console.log('ok  ',m);
  const d=await mk(1280,1500,false);await d.waitForSelector('.login');
  await d.evaluate(({s})=>{s.forEach(w=>__db.data.set(w.collection+'/'+w.doc_id,w.data));__db.data.get('settings/main').fase='menu';__db.notify();},{s:seed});
  await d.click('.names .btn:has-text("Fede")');await d.waitForSelector('.rail');
  await d.click('.tab:has-text("Programma")');await d.waitForSelector('.tl');
  const rows=async()=>d.$$eval('.tl .ti, .tl .tlday',e=>e.map(x=>x.classList.contains('tlday')?'## '+x.textContent.trim():x.querySelector('.tm').textContent.trim()+' | '+x.querySelector('.what').textContent.replace(/\s+/g,' ').trim()));
  let r=await rows();
  const dom=r.findIndex(x=>x.startsWith('## Domenica'));
  dom>=0&&r[dom+1]==='16:00 | Rassetto e pulizia · fino alle 18:00'&&r[dom+2]==='18:30 | Chiusura, saluti e partenza'?pass('Domenica: 16:00 Rassetto e pulizia (fino alle 18:00), 18:30 Chiusura, saluti e partenza'):fail('domenica '+JSON.stringify(r));
  r[0].startsWith('##')&&r[1].includes('Arrivo e sistemazione')?pass('anche senza piatti il programma parte dall’arrivo del venerdì'):fail('arrivo '+JSON.stringify(r.slice(0,3)));
  (await d.textContent('.view')).includes('Nessun piatto in menu')?pass('senza piatti, i Consigli lo dicono e rimandano al Menu'):fail('consigli vuoti');
  // con un piatto la domenica a pranzo, l'ordine resta cronologico
  await d.evaluate(()=>{__db.data.set('recipes/x1',{title:'Piatto della domenica',category:'primi',region:'Veneto',link:'https://example.org/x',note:'',proposerId:'p_teo',ownerIds:['p_teo'],teamIds:[],createdAt:1,verifica:{stato:'da_verificare'},slot:'dom-pranzo',serves:4,porzione:'normale',ingredients:[],steps:[],fasi:[{label:'Cuocere',ore:2}],preparabileACasa:false,vini:[],consigli:''});__db.notify();});
  await d.waitForSelector('.ti.fase');
  r=await rows();const di=r.findIndex(x=>x.startsWith('## Domenica'));
  const dd=r.slice(di+1);
  const ip=dd.findIndex(x=>x.includes('Domenica pranzo')),ir=dd.findIndex(x=>x.includes('Rassetto')),ic=dd.findIndex(x=>x.includes('Chiusura'));
  ip>=0&&ip<ir&&ir<ic?pass('con i piatti: pranzo (13:00) → rassetto (16:00) → chiusura (18:30), in ordine'):fail('ordine '+JSON.stringify(dd));
  (await d.$$('.ti.fix')).length===2?pass('due appuntamenti fissi, una sola volta'):fail('duplicati');
  await d.screenshot({path:out+'/95-programma-domenica.png',fullPage:true});
  console.log(errors.length?'ERRORI:\n'+errors.join('\n'):'nessun errore di console');
  if(errors.length)ok=false;
  await browser.close();process.exit(ok?0:1);
})().catch(e=>{console.error(e);process.exit(2);});
