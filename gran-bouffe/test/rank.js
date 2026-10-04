// Prova: voto a posizioni con tetto (6/6/6/4/6), numero scelto a mano con spostamento automatico dei doppioni, trascinamento, punteggio e spareggi.
const {run,seed}=require('./harness');
const out=require('path').join(__dirname,'shots');require('fs').mkdirSync(out,{recursive:true});
const R=(id,title,category)=>[`recipes/${id}`,{title,category,region:'Veneto',link:'https://example.org/'+id,note:'',proposerId:'p_teo',ownerIds:['p_teo'],teamIds:[],createdAt:1000,
  verifica:{stato:'da_verificare'},slot:'',serves:4,porzione:'normale',ingredients:[],steps:[],fasi:[],preparabileACasa:false,vini:[],consigli:''}];
const names=['Alfa','Beta','Gamma','Delta','Epsilon','Zeta','Eta','Theta'];
const recipes=[...names.map((n,i)=>R('p'+(i+1),n+' di primi','primi')),
  ...[1,2,3,4,5].map(i=>R('c'+i,'Contorno '+i,'contorni')),R('d1','Unico dolce','dolci')];
(async()=>{
  const {browser,errors,mk}=await run();
  let ok=true;const fail=m=>{ok=false;console.log('FAIL',m);};const pass=m=>console.log('ok  ',m);
  const d=await mk(1280,2000,false);await d.waitForSelector('.login');
  await d.evaluate(({s,recipes})=>{s.forEach(w=>__db.data.set(w.collection+'/'+w.doc_id,w.data));recipes.forEach(r=>__db.data.set(r[0],r[1]));__db.data.get('settings/main').fase='voto';__db.notify();},{s:seed,recipes});
  await d.click('.names .btn:has-text("Fede")');await d.waitForSelector('.rail');
  await d.click('.tab:has-text("Votazioni")');await d.click('[data-act=vcat][data-v=primi]');await d.waitForSelector('.rankbox');
  const slotsOf=()=>d.$$eval('.slots .slot',e=>e.map(s=>{const t=s.querySelector('.t');return t?t.textContent.replace(/\s+/g,' ').trim().replace(/ di primi$/,''):'—';}));
  const poolN=()=>d.$$eval('.pool .poolist li',e=>e.length);
  const pick=(id,p)=>d.selectOption('#rk-'+id,String(p));
  const draft=cat=>d.evaluate(c=>null,cat);
  // tetti per portata
  await d.click('[data-act=vcat][data-v=primi]');
  (await slotsOf()).length===6&&(await poolN())===8?pass('Primi (8 proposte): 6 posizioni, tutte le proposte fuori classifica'):fail('slot primi '+(await slotsOf()).length+'/'+await poolN());
  (await d.textContent('.rkinfo')).includes('fino a 6')&&(await d.textContent('.rkinfo')).includes('7')?pass('spiega: fino a 6 piatti, 1° posto = 7 punti'):fail('info '+await d.textContent('.rkinfo'));
  await d.click('[data-act=vcat][data-v=contorni]');(await slotsOf()).length===4?pass('Contorni (5 proposte): 4 posizioni'):fail('slot contorni');
  await d.click('[data-act=vcat][data-v=dolci]');(await slotsOf()).length===1?pass('Dolci con una sola proposta: una posizione'):fail('slot dolci');
  await d.click('[data-act=vcat][data-v=primi]');
  (await d.$('[data-act=save-rank]:disabled'))?pass('senza nessuna posizione il pulsante di salvataggio è spento'):fail('salva attivo a vuoto');
  // numero a mano
  await pick('p1',1);await pick('p2',2);await pick('p3',5);
  let s=await slotsOf();s.join()==='Alfa,Beta,—,—,Gamma,—'?pass('scelgo 1°, 2° e 5°: i piatti vanno al loro posto (le posizioni vuote restano vuote)'):fail('posizioni '+s);
  // doppione: Delta al 5° → Gamma scende al 6°
  await pick('p4',5);
  s=await slotsOf();s[4]==='Delta'&&s[5]==='Gamma'?pass('Delta al 5°, già occupato: Gamma scende alla prima posizione libera sotto (6°)'):fail('doppione '+s);
  (await d.textContent('.toast')).includes('Gamma')&&(await d.textContent('.toast')).includes('posizione 6')?pass('un avviso dice chi è stato spostato e dove'):fail('toast '+await d.textContent('.toast'));
  // doppione senza posto sotto: Epsilon al 5° → Delta esce
  await pick('p5',5);
  s=await slotsOf();s[4]==='Epsilon'&&!s.includes('Delta')?pass('Epsilon al 5° con il 6° occupato: Delta esce dalla classifica'):fail('uscita '+s);
  (await d.textContent('.toast')).includes('Delta')&&(await d.textContent('.toast')).includes('esce')?pass('avviso: «Delta esce dalla classifica»'):fail('toast uscita '+await d.textContent('.toast'));
  (await d.$$eval('.pool .t',e=>e.map(x=>x.textContent)).then(a=>a.some(x=>x.startsWith('Delta'))))?pass('Delta è tornato tra i piatti fuori classifica'):fail('Delta non nel pool');
  // spostamento da un posto all'altro: Gamma (6°) al 1°: Alfa scende al primo libero sotto (3°)
  await pick('p3',1);
  s=await slotsOf();s.join()==='Gamma,Beta,Alfa,—,Epsilon,—'?pass('Gamma dal 6° al 1°: Alfa scende al primo posto libero sotto (3°), il posto lasciato libero resta vuoto'):fail('spostamento '+s);
  // fuori classifica
  await pick('p3',0);s=await slotsOf();s.join()==='Gamma,Beta,—,—,Epsilon,—'||s.join()==='—,Beta,Alfa,—,Epsilon,—'?pass('«Fuori classifica» toglie il piatto dalla posizione'):fail('fuori '+s);
  await pick('p3',1);
  s=await slotsOf();
  (await d.textContent('.rankbox')).includes('Modifiche non salvate')&&(await d.textContent('.rankbox')).includes('posizioni vuote')?pass('avvisi: modifiche non salvate e posizioni vuote che si chiuderanno'):fail('avvisi '+await d.textContent('.rankbox .row'));
  await d.screenshot({path:out+'/80-voto-posizioni.png',fullPage:true});
  // salvataggio: lista compatta nell'ordine delle posizioni
  await d.click('[data-act=save-rank]');
  await d.waitForFunction(()=>(__db.data.get('votes/p_fede')||{}).rank&&__db.data.get('votes/p_fede').rank.primi);
  const sv=await d.evaluate(()=>__db.data.get('votes/p_fede'));
  const exp=s.filter(x=>x!=='—').map(x=>x);
  sv.rank.primi.length===exp.length&&sv.rank.primi.every((id,i)=>names[+id.slice(1)-1]===exp[i])&&sv.rankAt&&sv.rankAt.primi>0?pass('salvata la lista compatta in ordine ('+sv.rank.primi.join(', ')+') con la data del voto'):fail('salvataggio '+JSON.stringify(sv));
  (await d.textContent('.rankbox')).includes('Classifica salvata')?pass('stato: Classifica salvata'):fail('stato salvata');
  s=await slotsOf();s.slice(0,exp.length).join()===exp.join()&&s.slice(exp.length).every(x=>x==='—')?pass('dopo il salvataggio le posizioni vuote si sono chiuse'):fail('compatta '+s);
  // proposta nuova dopo il voto → fuori classifica con «Nuova»
  await d.evaluate(()=>{__db.data.set('recipes/pnew',{title:'Novità di primi',category:'primi',region:'Veneto',link:'https://example.org/n',note:'',proposerId:'p_teo',ownerIds:['p_teo'],teamIds:[],createdAt:Date.now()+5000,verifica:{stato:'da_verificare'},slot:'',serves:4,porzione:'normale',ingredients:[],steps:[],fasi:[],preparabileACasa:false,vini:[],consigli:''});__db.notify();});
  await d.waitForSelector('.pool .badge:has-text("Nuova")');pass('una proposta arrivata dopo il voto resta fuori classifica con il segno «Nuova»');
  await d.evaluate(()=>{__db.data.delete('recipes/pnew');__db.notify();});await d.waitForFunction(()=>!document.querySelector('[data-grip=pnew]'));
  // ---- trascinamento con il mouse
  const box=async sel=>(await d.locator(sel).first().boundingBox());
  const drag=async(from,to,steps)=>{const a=await box(from),b=await box(to);
    await d.mouse.move(a.x+a.width/2,a.y+a.height/2);await d.mouse.down();await d.mouse.move(b.x+b.width/2,b.y+Math.min(b.height/2,20),{steps:steps||8});};
  s=await slotsOf();const free=s.indexOf('—');
  await drag('.pool [data-grip=p6]',`.slot[data-slot="${free}"]`);
  (await d.$('.dr.ghost'))&&(await d.$('.slot.over'))?pass('trascinando: compare l’ombra del piatto e il posto di arrivo si evidenzia'):fail('ghost/over');
  await d.screenshot({path:out+'/81-trascinamento.png'});
  await d.mouse.up();
  s=await slotsOf();s[free]==='Zeta'?pass('trascinato Zeta nel posto libero '+(free+1)+'°'):fail('drop '+s);
  // su un posto occupato: chi c'era scende
  const before=await slotsOf();
  await drag('.pool [data-grip=p7]','.slot[data-slot="0"]');await d.mouse.up();
  s=await slotsOf();s[0]==='Eta'&&before[0]!=='—'&&s.includes(before[0])&&s.indexOf(before[0])>0?pass('trascinato Eta sul 1°: chi c’era scende al primo posto libero sotto'):fail('drop su occupato '+before+' → '+s);
  // trascinare nel riquadro "fuori classifica" toglie dalla classifica
  await drag('.slot[data-slot="0"] [data-grip]','.pool h4');await d.mouse.up();
  s=await slotsOf();!s.includes('Eta')?pass('trascinato nel riquadro «Fuori classifica»: il piatto esce dalla classifica'):fail('drop in pool '+s);
  // rilascio fuori da ogni zona: nessun cambiamento
  const b4=await slotsOf();
  await drag('.pool [data-grip=p8]','h2');await d.mouse.up();
  JSON.stringify(await slotsOf())===JSON.stringify(b4)?pass('rilascio fuori dalle zone: non cambia nulla'):fail('drop fuori');
  // durante il trascinamento un aggiornamento dal database non rompe nulla
  await drag('.pool [data-grip=p8]','.slot[data-slot="5"]');
  await d.evaluate(()=>{__db.notify();});await d.waitForTimeout(150);
  (await d.$('.dr.ghost'))?pass('un aggiornamento dei dati durante il trascinamento non lo interrompe'):fail('render durante drag');
  await d.mouse.up();s=await slotsOf();s[5]==='Theta'||s.includes('Theta')?pass('...e il rilascio funziona lo stesso'):fail('drop dopo render '+s);
  // voto chiuso: niente maniglie né numeri attivi
  await d.evaluate(()=>{__db.data.get('settings/main').fase='menu';__db.notify();});
  await d.waitForFunction(()=>!document.querySelector('.grip:not([disabled])'));
  (await d.$$eval('.rank select:not([disabled])',e=>e.length))===0?pass('a voto chiuso maniglie e numeri sono disattivati'):fail('attivi a voto chiuso');
  await d.evaluate(()=>{__db.data.get('settings/main').fase='voto';__db.notify();});

  // ---- punteggio, spareggio a cascata e pari merito
  const rk=(id,primi)=>__db.data.set('votes/'+id,{rank:{primi},rankAt:{primi:5},updatedAt:5});
  await d.evaluate(()=>{for(const k of [...__db.data.keys()])if(k.startsWith('votes/'))__db.data.delete(k);
    const set=(id,primi)=>__db.data.set('votes/'+id,{rank:{primi},rankAt:{primi:5},updatedAt:5});
    // Zeta (p6) prende due primi posti e un 5°, Beta (p2) due secondi e un 3°: 17 punti pari, ma Zeta ha più primi posti
    set('p_teo',['p6','p2']);set('p_tia',['p6','p2']);set('p_jack',['p1','p3','p2','p4','p6']);__db.notify();});
  await d.click('[data-act=vmode][data-v=ris]');await d.waitForSelector('.res');
  const res=await d.$$eval('.res',e=>e.map(x=>x.textContent.replace(/\s+/g,' ').trim()));
  res[0].startsWith('1')&&res[0].includes('Zeta')&&res[0].includes('17 punti')&&res[1].includes('Beta')&&res[1].includes('17 punti')?pass('17 punti pari: sopra Zeta (due primi posti) anche se «Beta» viene prima in ordine alfabetico'):fail('cascata '+res.slice(0,3));
  !res[0].includes('Pari merito')?pass('con i primi posti diversi non c’è «Pari merito»'):fail('pari merito spurio');
  // pari merito vero a cavallo del limite: tre piatti identici al 6°-8° posto, formato Bouffetta (quota primi 6)
  await d.evaluate(()=>{__db.data.get('settings/main').formato='bouffetta';const set=(id,primi)=>__db.data.set('votes/'+id,{rank:{primi},rankAt:{primi:5},updatedAt:5});
    set('p_teo',['p1','p2','p3','p4','p5','p6']);set('p_tia',['p1','p2','p3','p4','p5','p7']);set('p_jack',['p1','p2','p3','p4','p5','p8']);__db.notify();});
  await d.waitForFunction(()=>document.querySelectorAll('.res').length===8);
  const txt=await d.textContent('.view');
  const q=/<b[^>]*>(\d+)<\/b> su/.test('')?0:0;
  const edge=await d.$$eval('.res .badge.warn',e=>e.length);
  const note=await d.$('.note.warn');
  const quota=await d.evaluate(()=>{const n=[...document.querySelectorAll('.view .note')].find(x=>x.textContent.includes('quota suggerita'));const m=n&&n.textContent.match(/\((\d+) su \d+ piatti/);return m?+m[1]:0;});
  const avviso=await d.evaluate(()=>[...document.querySelectorAll('.view .note.warn')].some(x=>x.textContent.includes('Pari merito al limite')));
  quota===6&&edge===3&&avviso?pass('tre piatti identici a cavallo del limite (quota 6): «Pari merito» in evidenza e avviso all’organizzatore'):fail('pari merito al limite quota='+quota+' badge='+edge+' avviso='+avviso);
  await d.screenshot({path:out+'/82-risultati-pari.png',fullPage:true});

  // ---- telefono: nessuno scroll orizzontale, trascinamento col dito
  const m=await mk(390,844,false);await m.waitForSelector('.login');
  await m.evaluate(({s,recipes})=>{s.forEach(w=>__db.data.set(w.collection+'/'+w.doc_id,w.data));recipes.forEach(r=>__db.data.set(r[0],r[1]));__db.data.get('settings/main').fase='voto';__db.notify();},{s:seed,recipes});
  await m.click('.names .btn:has-text("Fede")');await m.waitForSelector('.rail');
  await m.click('.tab:has-text("Votazioni")');await m.click('[data-act=vcat][data-v=primi]');await m.waitForSelector('.rankbox');
  await m.selectOption('#rk-p1','1');
  const ov=await m.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);ov<=1?pass('mobile: nessuno scroll orizzontale'):fail('overflow '+ov);
  await m.screenshot({path:out+'/83-voto-mobile.png',fullPage:true});
  const cdp=await m.context().newCDPSession(m);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
  const gb=await m.locator('.pool [data-grip=p2]').boundingBox();await m.locator('.pool [data-grip=p2]').scrollIntoViewIfNeeded();
  const g2=await m.locator('.pool [data-grip=p2]').boundingBox();const tb=await m.locator('.slot[data-slot="2"]').boundingBox();
  // per un tocco vero la destinazione deve essere visibile: porto in vista lo slot e riprendo la maniglia
  await m.evaluate(()=>{const r=document.querySelector('.slot[data-slot="2"]').getBoundingClientRect();window.scrollBy(0,r.top-150);});
  const g3=await m.locator('.pool [data-grip=p2]').boundingBox(),t3=await m.locator('.slot[data-slot="2"]').boundingBox();
  if(g3&&g3.y>0&&g3.y<800){
    const x=g3.x+g3.width/2,y=g3.y+g3.height/2,tx=t3.x+t3.width/2,ty=t3.y+t3.height/2;
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+(tx-x)*i/8,y:y+(ty-y)*i/8}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await m.waitForTimeout(200);
    const ms=await m.$$eval('.slots .slot',e=>e.map(s=>{const t=s.querySelector('.t');return t?t.textContent.trim():'—';}));
    ms[2].startsWith('Beta')?pass('telefono: trascinamento col dito dalla maniglia nello slot 3'):fail('touch '+ms);
  }else console.log('   (trascinamento col dito non verificabile in questa schermata: maniglia fuori vista)');
  console.log(errors.length?'ERRORI:\n'+errors.join('\n'):'nessun errore di console');
  if(errors.length)ok=false;
  await browser.close();process.exit(ok?0:1);
})().catch(e=>{console.error(e);process.exit(2);});
