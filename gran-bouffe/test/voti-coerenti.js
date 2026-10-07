// Prova: i punti e i votanti di ogni piatto sono gli stessi in Votazioni (Risultati) e nel Menu (exit poll e «Altri candidati»),
// e coincidono con un calcolo rifatto qui dai voti grezzi; le voci di una classifica salvata che non contano più sono segnalate.
const {run,seed}=require('./harness');
const R=(id,title,category,extra)=>[`recipes/${id}`,Object.assign({title,category,region:'Veneto',link:'https://example.org/'+id,note:'',proposerId:'p_teo',ownerIds:['p_teo'],teamIds:[],createdAt:1000,
  verifica:{stato:'da_verificare'},slot:'',serves:4,porzione:'normale',ingredients:[],steps:[],fasi:[],preparabileACasa:false,vini:[],consigli:''},extra||{})];
const names=['Alfa','Beta','Gamma','Delta','Epsilon','Zeta','Eta','Theta','Iota'];
const recipes=[...names.map((n,i)=>R('p'+(i+1),n+' di primi','primi')),
  R('x1','Cancellato di primi','primi',{eliminata:true}),R('a1','Antipasto spostato','antipasti'),
  ...[1,2,3].map(i=>R('s'+i,'Secondo '+i,'secondi'))];
const votes={ // ogni lista è la classifica salvata (id in ordine di posizione); Fede ha due voci che non contano più
  p_teo:{primi:['p6','p2','p1']},p_tia:{primi:['p6','p2','p3','p4']},p_jack:{primi:['p1','p3','p2','p4','p6','p9']},
  p_murro:{primi:['p9','p8','p7','p5','p4','p3']},p_umbe:{primi:['p2','p9']},
  p_fede:{primi:['p1','a1','p3','x1','p5'],secondi:['s2','s1']}};
const CAP={primi:6,secondi:6};
(async()=>{
  const {browser,errors,mk}=await run();
  let ok=true;const fail=m=>{ok=false;console.log('FAIL',m);};const pass=m=>console.log('ok  ',m);
  const d=await mk(1280,1600,false);await d.waitForSelector('.login');
  await d.evaluate(({s,recipes,votes})=>{s.forEach(w=>__db.data.set(w.collection+'/'+w.doc_id,w.data));recipes.forEach(r=>__db.data.set(r[0],r[1]));
    for(const [id,rank] of Object.entries(votes))__db.data.set('votes/'+id,{rank,rankAt:Object.fromEntries(Object.keys(rank).map(k=>[k,5])),updatedAt:5});
    __db.data.get('settings/main').fase='voto';__db.notify();},{s:seed,recipes,votes});
  await d.click('.names .btn:has-text("Marco Furio")');await d.waitForSelector('.rail');

  // ---- atteso, dai voti grezzi (le voci non valide vengono saltate e le successive salgono)
  const rec=Object.fromEntries(recipes.map(r=>[r[0].slice(8),r[1]]));
  const exp={};const nv={};
  for(const [pid,rank] of Object.entries(votes))for(const [cat,list] of Object.entries(rank)){
    const seen=new Set(),valid=list.filter(id=>rec[id]&&!rec[id].eliminata&&rec[id].category===cat&&!seen.has(id)&&seen.add(id)).slice(0,CAP[cat]);
    if(!valid.length)continue;nv[cat]=(nv[cat]||0)+1;
    valid.forEach((id,i)=>{const o=exp[id]=exp[id]||{pts:0,n:0};o.pts+=CAP[cat]+2-(i+1);o.n++;});}
  const title=id=>rec[id].title;

  // ---- Votazioni → Risultati
  await d.click('.tab:has-text("Votazioni")');await d.click('[data-act=vmode][data-v=ris]');await d.click('[data-act=vcat][data-v=primi]');await d.waitForSelector('.res');
  const readRes=()=>d.$$eval('.res',rows=>Object.fromEntries(rows.map(r=>{
    const t=r.firstElementChild.nextElementSibling.firstElementChild.textContent.replace(/\s+/g,' ').replace(/ Pari merito$/,'').trim();
    const v=r.querySelector('.small.num').innerText.replace(/\s+/g,' ');const m=v.match(/(\d+) punti.*?(\d+) su (\d+)/);
    return[t,m?{pts:+m[1],n:+m[2],nv:+m[3]}:null];})));
  const res=await readRes();
  const bad=Object.keys(exp).filter(id=>rec[id].category==='primi').filter(id=>{const x=res[title(id)];return !x||x.pts!==exp[id].pts||x.n!==exp[id].n||x.nv!==nv.primi;});
  bad.length===0?pass('Votazioni: punti, votanti e «N su M» di ogni piatto coincidono con il calcolo dai voti grezzi'):fail('Votazioni diverso dall’atteso: '+bad.map(id=>title(id)+' '+JSON.stringify(res[title(id)])+' vs '+JSON.stringify(exp[id])));
  !res['Cancellato di primi']&&!res['Antipasto spostato']?pass('il piatto eliminato e quello spostato di portata non compaiono tra i primi'):fail('piatti non validi tra i primi');
  const valid3=(res['Alfa di primi']||{}).pts;
  valid3===exp.p1.pts?pass('le voci non valide della classifica di Fede sono saltate: Gamma e Epsilon salgono di un posto ('+exp.p3.pts+' e '+exp.p5.pts+' punti)'):fail('Alfa '+valid3);

  // ---- Menu: exit poll (primi 5) e «Altri candidati» con gli stessi numeri
  await d.click('.tab:has-text("Menu")');await d.waitForSelector('.menu2');
  await d.evaluate(()=>{const x=document.querySelector('#xp-rest');if(x)x.open=true;});
  const menu=await d.evaluate(()=>{
    const out={};
    for(const li of document.querySelectorAll('.xpr')){const v=li.querySelector('.xpv').innerText.replace(/\s+/g,' ');const m=v.match(/(\d+) punti.*?(\d+) su (\d+)/);out[li.querySelector('.nm').textContent.trim()]=m?{pts:+m[1],n:+m[2],nv:+m[3],src:'exit'}:null;}
    for(const c of document.querySelectorAll('.cand')){const v=c.querySelector('.small.num').innerText.replace(/\s+/g,' ');const m=v.match(/(\d+) punti.*?(\d+) su (\d+)/);
      out[c.firstElementChild.firstElementChild.textContent.trim()]=m?{pts:+m[1],n:+m[2],nv:+m[3],src:'altri'}:(/nessun voto/.test(v)?{none:true,src:'altri'}:{raw:v,src:'altri'});}
    return out;});
  const diff=[];let seenExit=0,seenAltri=0;
  for(const id of Object.keys(exp).filter(i=>rec[i].category==='primi')){const m=menu[title(id)],r=res[title(id)];
    if(!m){diff.push(title(id)+': assente nel Menu');continue;}
    m.src==='exit'?seenExit++:seenAltri++;
    if(m.pts!==r.pts||m.n!==r.n||m.nv!==r.nv)diff.push(title(id)+': Menu '+JSON.stringify(m)+' / Votazioni '+JSON.stringify(r));}
  diff.length===0?pass('Menu: i 5 piatti dell’exit poll e gli «Altri candidati» mostrano gli stessi punti e gli stessi votanti della scheda Votazioni ('+seenExit+' + '+seenAltri+' piatti)'):fail('Menu diverso da Votazioni: '+diff.join(' | '));
  seenExit===5&&seenAltri>=1?pass('l’exit poll ha 5 piatti e gli altri candidati con voti sono nell’elenco a parte'):fail('conteggi exit '+seenExit+' altri '+seenAltri);
  !(await d.$$eval('.cand .small.num',e=>e.some(x=>/punteggio/.test(x.textContent))))?pass('negli «Altri candidati» non c’è più il «punteggio» in percentuale: solo punti'):fail('compare ancora «punteggio»');

  // ---- La mia classifica: segnala le voci che non contano più e permette di aggiornare il voto
  const f=await mk(1280,1600,false);await f.waitForSelector('.login');
  await f.evaluate(({s,recipes,votes})=>{s.forEach(w=>__db.data.set(w.collection+'/'+w.doc_id,w.data));recipes.forEach(r=>__db.data.set(r[0],r[1]));
    for(const [id,rank] of Object.entries(votes))__db.data.set('votes/'+id,{rank,rankAt:Object.fromEntries(Object.keys(rank).map(k=>[k,5])),updatedAt:5});
    __db.data.get('settings/main').fase='voto';__db.notify();},{s:seed,recipes,votes});
  await f.click('.names .btn:has-text("Fede")');await f.waitForSelector('.rail');
  await f.click('.tab:has-text("Votazioni")');await f.click('[data-act=vcat][data-v=primi]');await f.waitForSelector('.rankbox');
  const slots=()=>f.$$eval('.rkslots .rkslot',e=>e.map(s=>{const t=s.querySelector('.t');return t?t.textContent.replace(/\s+/g,' ').trim().replace(/ di primi$/,''):'—';}));
  (await slots()).join()==='Alfa,Gamma,Epsilon,—,—,—'?pass('la mia classifica mostra i 3 piatti che contano, già saliti di posto'):fail('slot '+await slots());
  const box=await f.textContent('.rankbox');
  box.includes('2 piatti che non ci sono più')&&box.includes('Classifica da aggiornare')?pass('avviso: «2 piatti che non ci sono più» e stato «Classifica da aggiornare»'):fail('avviso '+box.slice(-400));
  (await f.$('[data-act=save-rank]:not([disabled])'))?pass('il pulsante per aggiornare il voto è attivo anche senza altre modifiche'):fail('salva spento');
  await f.click('[data-act=save-rank]');
  await f.waitForFunction(()=>__db.data.get('votes/p_fede').rank.primi.length===3);
  const saved=await f.evaluate(()=>__db.data.get('votes/p_fede').rank);
  saved.primi.join()==='p1,p3,p5'&&saved.secondi.join()==='s2,s1'?pass('salvata la lista pulita (p1, p3, p5); le altre portate non cambiano'):fail('salvato '+JSON.stringify(saved));
  await f.waitForFunction(()=>!document.querySelector('.rankbox').textContent.includes('non ci sono più'));
  const after=await f.$$eval('.rankbox .badge',e=>e.map(x=>x.textContent.trim()));
  after.includes('Classifica salvata')&&(await f.$('[data-act=save-rank][disabled]'))?pass('dopo il salvataggio: «Classifica salvata», nessun avviso, pulsante spento'):fail('dopo '+after);
  await f.click('[data-act=vmode][data-v=ris]');await f.waitForSelector('.res');
  const res2=await f.$$eval('.res',rows=>Object.fromEntries(rows.map(r=>[r.firstElementChild.nextElementSibling.firstElementChild.textContent.replace(/\s+/g,' ').trim(),+(r.querySelector('.small.num b')||{textContent:-1}).textContent])));
  Object.keys(exp).filter(i=>rec[i].category==='primi').every(i=>res2[title(i)]===exp[i].pts)?pass('i punti non cambiano dopo l’aggiornamento: erano già contati così'):fail('punti dopo il salvataggio '+JSON.stringify(res2));

  errors.length?fail('errori: '+errors.join(' | ')):pass('nessun errore di console');
  await browser.close();
  console.log(ok?'\nTUTTO OK':'\nCI SONO ERRORI');process.exit(ok?0:1);
})().catch(e=>{console.error(e);process.exit(1);});
