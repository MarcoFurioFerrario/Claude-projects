// Prova della versione pubblica (docs/index.html) con un Firestore finto che rifiuta i valori undefined come quello vero.
const fs=require('fs'),path=require('path');
const {chromium}=require('/opt/node-tools/node_modules/playwright');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'..','docs','index.html'),'utf8').replace(/<link[^>]*fonts[^>]*>/g,'');

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
      set:async(d,o)=>{if(window.__hang)await new Promise(r=>setTimeout(r,9000));if(hasUndef(d))throw new Error('Unsupported field value: undefined');data.set(p,o&&o.merge&&data.has(p)?deepMerge(clone(data.get(p)),d):clone(d));notify();},
      delete:async()=>{data.delete(p);notify();},
      onSnapshot(n){const f=()=>n(snapDoc(p));ls.push(f);setTimeout(f,0);return()=>{};}}),
    collection:c=>({onSnapshot(n){const f=()=>{const docs=collDocs(c);n({docs,size:docs.length,empty:!docs.length});};ls.push(f);setTimeout(f,0);return()=>{};}})
  };
  fsx.enablePersistence=()=>Promise.resolve();
  window.firebase={initializeApp(){},firestore:()=>fsx};
})();`;

(async()=>{
  const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']}).catch(()=>chromium.launch({args:['--no-sandbox']}));
  const errors=[];let ok=true;const fail=m=>{ok=false;console.log('FAIL',m);};const pass=m=>console.log('ok  ',m);
  const ctx=await browser.newContext({viewport:{width:390,height:844}});
  const page=await ctx.newPage();
  page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text());});
  page.on('pageerror',e=>errors.push('pageerror: '+e.message));
  await page.addInitScript('window.GB_BACKUP_EVERY=3000;window.GB_TICK=1000;window.GB_NOW=()=>Date.parse("2026-10-03T12:00:00+02:00");'); // orologio fisso: il test non dipende dal giorno in cui gira
  let cfg='window.GB_FIREBASE=null;';
  const realBuild=(html.match(/const BUILD='([^']+)'/)||[])[1];let served=realBuild;const window_build=()=>served;
  await page.route('**/*',r=>{
    const u=r.request().url();
    if(u==='https://gb.test/version.json'||u.startsWith('https://gb.test/version.json?'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({build:window_build()})});
    if(u==='https://gb.test/'||u.startsWith('https://gb.test/?'))return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:html});
    if(u==='https://gb.test/config.js')return r.fulfill({status:200,contentType:'application/javascript',body:cfg});
    if(u.includes('firebase-app-compat'))return r.fulfill({status:200,contentType:'application/javascript',body:mockFirebase});
    if(u.includes('firebase-firestore-compat'))return r.fulfill({status:200,contentType:'application/javascript',body:''});
    if(r.request().resourceType()==='image')return r.fulfill({status:200,contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64')}); // foto di fonti esterne: immagine finta
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
  await page.click('.names .btn:has-text("Marco Furio")');await page.waitForSelector('.rail');await page.click('.tab:has-text("Proposte")');
  // 6) scritture: proposta, voto su due categorie (merge), verifica
  await page.click('[data-act=new-recipe]');await page.fill('#ed-title','Frico');await page.selectOption('#ed-cat','antipasti');await page.fill('#ed-link','https://example.org/frico');
  await page.click('[data-act=save-recipe]');await page.waitForSelector('.card');
  await page.click('[data-act=new-recipe]');await page.fill('#ed-title','Jota');await page.selectOption('#ed-cat','primi');await page.fill('#ed-link','https://example.org/jota');
  await page.click('[data-act=save-recipe]');await page.waitForFunction(()=>document.querySelectorAll('.card').length===2);
  pass('2 proposte salvate (nessun valore undefined verso Firestore)');
  await page.click('.fchip:has-text("Tutte")');
  await page.click('.rail button:has-text("Voto")');await page.waitForFunction(()=>document.querySelector('.rail .now')&&document.querySelector('.rail .now').textContent.includes('Voto'));
  await page.click('.tab:has-text("Votazioni")');await page.click('[data-act=vcat][data-v=antipasti]');await page.locator('select[data-chg=rkpos]').first().selectOption('1');await page.click('[data-act=save-rank]');
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('mockfs'))['votes/p_marco-furio']);
  await page.click('[data-act=vcat][data-v=primi]');await page.locator('select[data-chg=rkpos]').first().selectOption('1');await page.waitForSelector('[data-act=save-rank]:not([disabled])');await page.click('[data-act=save-rank]');
  await page.waitForFunction(()=>{const v=JSON.parse(localStorage.getItem('mockfs'))['votes/p_marco-furio'];return v&&v.rank.antipasti&&v.rank.primi;});
  pass('voto salvato su due categorie senza perdere la prima (merge)');
  // 7) niente blocco AI, CSV attivo
  await page.click('.tab:has-text("Menu")');
  const hasAi=await page.evaluate(()=>!!document.querySelector('#ai-btn'));!hasAi?pass('nessun pulsante AI nella versione pubblica'):fail('AI presente');

  // 9) indicatore, cestino, copie di sicurezza, ripristino, file, coda offline
  (await page.textContent('#savestat')).includes('Tutto salvato')?pass('indicatore: Tutto salvato'):fail('indicatore');
  await page.click('.tab:has-text("Proposte")');await page.waitForSelector('.card');
  await page.click('.card:has-text("Frico") [data-act=del-recipe]');await page.click('.card:has-text("Frico") [data-act=del-recipe]');
  await page.waitForSelector('#trash');
  const cn=await page.$$eval('.card',e=>e.length);
  cn===1?pass('proposta eliminata: va nel cestino, non più in elenco'):fail('card '+cn);
  await page.evaluate(()=>{const d=document.querySelector('#trash');if(!d.open)d.querySelector('summary').click();});await page.click('[data-act=restore-recipe]');
  await page.waitForFunction(()=>document.querySelectorAll('.card').length===2);pass('ripristino dal cestino');
  await page.waitForFunction(()=>{const m=JSON.parse(localStorage.getItem('mockfs'))['meta/backups'];return m&&m.items.length>=1;});
  pass('copia di sicurezza automatica creata (prima di eliminare / periodica)');
  await page.click('.tab:has-text("Persone")');await page.waitForSelector('[data-act=backup-now]');
  await page.click('[data-act=backup-now]');
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('mockfs'))['meta/backups'].items.some(i=>i.motivo==='manuale'));
  const man=await page.evaluate(()=>{const db=JSON.parse(localStorage.getItem('mockfs'));const it=db['meta/backups'].items.find(i=>i.motivo==='manuale');const b=db['backups/'+it.id];return{n:it.n,okP:Array.isArray(JSON.parse(b.p)),okR:JSON.parse(b.r).length};});
  man.okP&&man.okR===2&&man.n.r===2?pass('copia manuale: '+JSON.stringify(man.n)):fail('copia manuale '+JSON.stringify(man));
  // download + import
  const [dl]=await Promise.all([page.waitForEvent('download'),page.click('[data-act=backup-download]')]);
  const dpath=await dl.path();const dj=JSON.parse(require('fs').readFileSync(dpath,'utf8'));
  /^gran-bouffe-backup-\d{4}-\d{2}-\d{2}-\d{4}\.json$/.test(dl.suggestedFilename())&&dj.r.length===2&&dj.app==='gran-bouffe'?pass('download backup: '+dl.suggestedFilename()):fail('download '+dl.suggestedFilename());
  await page.setInputFiles('#bk-file',dpath);await page.waitForSelector('[data-act=restore-go]');
  (await page.textContent('.sheet')).includes('2 proposte')?pass('ripristino da file: riepilogo mostrato'):fail('riepilogo file');
  await page.click('.sheet [data-act=modal-close]');
  await page.setInputFiles('#bk-file',{name:'x.json',mimeType:'application/json',buffer:Buffer.from('{"a":1}')});
  await page.waitForSelector('.toast.err');pass('file non valido rifiutato');
  // errore grave: elimino Jota per sempre e cancello i voti, poi ripristino la copia manuale
  await page.click('.tab:has-text("Proposte")');
  await page.click('.card:has-text("Jota") [data-act=del-recipe]');await page.click('.card:has-text("Jota") [data-act=del-recipe]');await page.waitForSelector('#trash');
  await page.evaluate(()=>{const d=document.querySelector('#trash');if(!d.open)d.querySelector('summary').click();});await page.click('[data-act=purge-recipe]');await page.click('[data-act=purge-recipe]');
  await page.waitForFunction(()=>!Object.keys(JSON.parse(localStorage.getItem('mockfs'))).some(k=>k.startsWith('recipes/')&&JSON.parse(localStorage.getItem('mockfs'))[k].title==='Jota'));
  await page.evaluate(()=>{const db=JSON.parse(localStorage.getItem('mockfs'));delete db['votes/p_marco-furio'];localStorage.setItem('mockfs',JSON.stringify(db));});
  await page.reload();await page.waitForSelector('.who');await page.click('.tab:has-text("Persone")');await page.waitForSelector('#bk');
  await page.evaluate(()=>{const d=document.querySelector('#bk');if(!d.open)d.querySelector('summary').click();});
  const rid=await page.evaluate(()=>{const it=JSON.parse(localStorage.getItem('mockfs'))['meta/backups'].items.find(i=>i.motivo==='manuale');return it.id;});
  await page.click(`[data-act=restore-snap][data-id="${rid}"]`);await page.waitForSelector('[data-act=restore-go]');
  await page.click('[data-act=restore-go]');
  await page.waitForFunction(()=>{const db=JSON.parse(localStorage.getItem('mockfs'));return db['votes/p_marco-furio']&&Object.values(db).some(v=>v.title==='Jota'&&!v.eliminata);},null,{timeout:15000});
  pass('errore grave annullato: ripristino riporta proposta eliminata e voti');
  const hasPre=await page.evaluate(()=>JSON.parse(localStorage.getItem('mockfs'))['meta/backups'].items.some(i=>i.motivo==='prima del ripristino'));
  hasPre?pass('prima del ripristino salvata una copia dello stato attuale'):fail('copia pre-ripristino');
  // coda in assenza di risposta del server
  await page.evaluate(()=>{window.__hang=true;});
  await page.uncheck('[data-chg=confirm][data-id=p_lollo]');
  await page.waitForFunction(()=>document.querySelector('#savestat2')&&document.querySelector('#savestat2').textContent.includes('Salvataggio'),null,{timeout:3000});
  pass('durante il salvataggio: indicatore "Salvataggio…"');
  await page.waitForSelector('.toast:has-text("in coda")',{timeout:12000});pass('server lento: la modifica resta in coda e lo dice');
  await page.waitForFunction(()=>document.querySelector('#savestat2')&&document.querySelector('#savestat2').textContent.includes('Tutto salvato'),null,{timeout:15000});
  await page.evaluate(()=>{window.__hang=false;});pass('al ritorno del server: Tutto salvato');
  await ctx.setOffline(true);await page.waitForSelector('.note.warn:has-text("offline")');pass('offline: avviso visibile');
  await ctx.setOffline(false);await page.waitForFunction(()=>!document.querySelector('.note.warn')||!document.body.textContent.includes('Sei offline'));pass('online: avviso rimosso');


  // 10) avviso di nuova versione
  (await page.$('.upd'))===null?pass('nessun avviso se la versione è la stessa ('+realBuild+')'):fail('avviso senza motivo');
  served='nuova-versione';
  await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
  await page.waitForSelector('.upd',{timeout:5000});pass('avviso "Nuova versione disponibile" quando il file version.json cambia');
  await page.click('.upd [data-act=reload-new]');
  await page.waitForFunction(()=>location.search==='?v=nuova-versione',null,{timeout:8000});await page.waitForSelector('.rail');
  pass('"Aggiorna ora" ricarica con ?v=… e resta collegato come '+(await page.textContent('.who')).replace(/\s+/g,' ').trim().slice(0,30));

  // 8) un secondo visitatore anonimo (nuovo contesto) vede gli stessi dati? (stato condiviso simulato via localStorage: stesso origin)
  const dbSnap=await page.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('mockfs'))).length);
  dbSnap>=15?pass('documenti nel db finto: '+dbSnap):fail('documenti '+dbSnap);
  const ov=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);ov<=1?pass('nessuno scroll orizzontale'):fail('overflow '+ov);
  console.log(errors.length?'ERRORI:\n'+errors.join('\n'):'nessun errore di console');
  if(errors.length)ok=false;
  await browser.close();process.exit(ok?0:1);
})().catch(e=>{console.error(e);process.exit(2);});
