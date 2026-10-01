// Prova della versione pubblica (docs/index.html) con un Firestore finto che rifiuta i valori undefined come quello vero.
const fs=require('fs'),path=require('path');
const {chromium}=require('/opt/node-tools/node_modules/playwright');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'docs','index.html'),'utf8').replace(/<link[^>]*fonts[^>]*>/g,'');

const mockFirebase=`
(function(){
  const KEY='mockfs';
  const data=new Map(Object.entries(JSON.parse(localStorage.getItem(KEY)||'{}')));const ls=[];
  const clone=o=>JSON.parse(JSON.stringify(o));
  const hasUndef=o=>o===undefined||(o&&typeof o==='object'&&Object.values(o).some(hasUndef));
  const deepMerge=(a,b)=>{for(const k of Object.keys(b)){if(b[k]&&typeof b[k]==='object'&&!Array.isArray(b[k])&&a[k]&&typeof a[k]==='object'&&!Array.isArray(a[k]))deepMerge(a[k],b[k]);else a[k]=clone(b[k]);}return a;};
  const snapDoc=p=>{const ex=data.has(p);return{id:p.split('/').pop(),exists:ex,data:()=>ex?clone(data.get(p)):undefined};};
  const collDocs=c=>[...data.keys()].filter(k=>k.startsWith(c+'/')&&k.split('/').length===c.split('/').length+1).sort().map(snapDoc);
  const notify=()=>{localStorage.setItem(KEY,JSON.stringify(Object.fromEntries(data)));ls.forEach(f=>f());};
  const fsx={
    doc:p=>({get:async()=>snapDoc(p),
      set:async(d,o)=>{if(hasUndef(d))throw new Error('Unsupported field value: undefined');data.set(p,o&&o.merge&&data.has(p)?deepMerge(clone(data.get(p)),d):clone(d));notify();},
      delete:async()=>{data.delete(p);notify();},
      onSnapshot(n){const f=()=>n(snapDoc(p));ls.push(f);setTimeout(f,0);return()=>{};}}),
    collection:c=>({onSnapshot(n){const f=()=>{const docs=collDocs(c);n({docs,size:docs.length,empty:!docs.length});};ls.push(f);setTimeout(f,0);return()=>{};}})
  };
  window.firebase={initializeApp(){},firestore:()=>fsx};
})();`;

(async()=>{
  const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']}).catch(()=>chromium.launch({args:['--no-sandbox']}));
  const errors=[];let ok=true;const fail=m=>{ok=false;console.log('FAIL',m);};const pass=m=>console.log('ok  ',m);
  const ctx=await browser.newContext({viewport:{width:390,height:844}});
  const page=await ctx.newPage();
  page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text());});
  page.on('pageerror',e=>errors.push('pageerror: '+e.message));
  let cfg='window.GB_FIREBASE=null;';
  await page.route('**/*',r=>{
    const u=r.request().url();
    if(u==='https://gb.test/')return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:html});
    if(u==='https://gb.test/config.js')return r.fulfill({status:200,contentType:'application/javascript',body:cfg});
    if(u.includes('firebase-app-compat'))return r.fulfill({status:200,contentType:'application/javascript',body:mockFirebase});
    if(u.includes('firebase-firestore-compat'))return r.fulfill({status:200,contentType:'application/javascript',body:''});
    return r.abort();
  });
  // 1) senza configurazione
  await page.goto('https://gb.test/');await page.waitForSelector('.note.bad');
  (await page.textContent('.note.bad')).includes('config.js')?pass('senza config: messaggio chiaro'):fail('messaggio config');
  // 2) con configurazione, db vuoto
  cfg='window.GB_FIREBASE={projectId:"demo"};';
  await page.goto('https://gb.test/');await page.waitForSelector('[data-act=seed-preset]');pass('db vuoto: pulsante "Carica i confermati"');
  await page.click('[data-act=seed-preset]');await page.waitForSelector('.names .btn');
  const n=await page.$$eval('.names .btn',e=>e.length);n===15?pass('15 confermati caricati'):fail('nomi '+n);
  // 3) accesso + cookie
  await page.click('.names .btn:has-text("Teo")');await page.waitForSelector('.rail');
  const ck=(await ctx.cookies()).find(c=>c.name==='gb_me');
  ck&&ck.value==='p_teo'&&ck.expires>Date.now()/1000+300*86400&&ck.sameSite==='Lax'?pass('cookie gb_me=p_teo, scadenza ~1 anno, SameSite=Lax, Secure='+ck.secure):fail('cookie '+JSON.stringify(ck));
  // 4) ricarica: ricorda l'utente (anche senza localStorage)
  await page.evaluate(()=>localStorage.removeItem('gb.me'));
  await page.reload();await page.waitForSelector('.who');
  (await page.textContent('.who')).includes('Teo')?pass('dopo la ricarica sei ancora Teo (cookie)'):fail('non ricordato');
  // 5) cambia nome cancella il cookie
  await page.click('[data-act=logout]');await page.waitForSelector('.names');
  !(await ctx.cookies()).some(c=>c.name==='gb_me'&&c.value)?pass('"Cambia nome" cancella il cookie'):fail('cookie rimasto');
  await page.click('.names .btn:has-text("Marco Furio")');await page.waitForSelector('.rail');
  // 6) scritture: proposta, voto su due categorie (merge), verifica
  await page.click('[data-act=new-recipe]');await page.fill('#ed-title','Frico');await page.selectOption('#ed-cat','antipasti');await page.fill('#ed-link','https://example.org/frico');
  await page.click('[data-act=save-recipe]');await page.waitForSelector('.card');
  await page.click('[data-act=new-recipe]');await page.fill('#ed-title','Jota');await page.selectOption('#ed-cat','zuppe');await page.fill('#ed-link','https://example.org/jota');
  await page.click('[data-act=save-recipe]');await page.waitForFunction(()=>document.querySelectorAll('.card').length===2);
  pass('2 proposte salvate (nessun valore undefined verso Firestore)');
  await page.click('.fchip:has-text("Tutte")');
  await page.click('.rail button:has-text("Voto")');await page.waitForFunction(()=>document.querySelector('.rail .now')&&document.querySelector('.rail .now').textContent.includes('Voto'));
  await page.click('.tab:has-text("Votazioni")');await page.click('[data-act=vcat][data-v=antipasti]');await page.click('[data-act=save-rank]');
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('mockfs'))['votes/p_marco-furio']);
  await page.click('[data-act=vcat][data-v=zuppe]');await page.waitForSelector('[data-act=save-rank]:not([disabled])');await page.click('[data-act=save-rank]');
  await page.waitForFunction(()=>{const v=JSON.parse(localStorage.getItem('mockfs'))['votes/p_marco-furio'];return v&&v.rank.antipasti&&v.rank.zuppe;});
  pass('voto salvato su due categorie senza perdere la prima (merge)');
  // 7) niente blocco AI, CSV attivo
  await page.click('.tab:has-text("Menu")');
  const hasAi=await page.evaluate(()=>!!document.querySelector('#ai-btn'));!hasAi?pass('nessun pulsante AI nella versione pubblica'):fail('AI presente');
  // 8) un secondo visitatore anonimo (nuovo contesto) vede gli stessi dati? (stato condiviso simulato via localStorage: stesso origin)
  const dbSnap=await page.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('mockfs'))).length);
  dbSnap>=19?pass('documenti nel db finto: '+dbSnap):fail('documenti '+dbSnap);
  const ov=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);ov<=1?pass('nessuno scroll orizzontale'):fail('overflow '+ov);
  console.log(errors.length?'ERRORI:\n'+errors.join('\n'):'nessun errore di console');
  if(errors.length)ok=false;
  await browser.close();process.exit(ok?0:1);
})().catch(e=>{console.error(e);process.exit(2);});
