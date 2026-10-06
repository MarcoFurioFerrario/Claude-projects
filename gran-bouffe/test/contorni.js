// Prova: i contorni si possono mettere in menu oltre il numero di piatti deciso; per il conteggio contano solo antipasti, primi, secondi e dolci.
const {run,seed}=require('./harness');
const out=require('path').join(__dirname,'shots');require('fs').mkdirSync(out,{recursive:true});
const R=(id,title,category,slot,ing)=>[`recipes/${id}`,{title,category,region:'Veneto',link:'https://example.org/'+id,note:'',proposerId:'p_teo',ownerIds:['p_teo'],teamIds:[],createdAt:1000,
  verifica:{stato:'da_verificare'},slot:slot||'',serves:4,porzione:'normale',ingredients:ing||[{name:'Sale',qty:0,unit:'q.b.',shop:'dispensa'}],steps:[],fasi:[],preparabileACasa:false,vini:[],consigli:''}];
// Dieta: ven 3, sab 8 (4+4), dom 4 = 15 piatti che contano; in più 3 contorni (uno per giorno)
const mk15=()=>{const r=[];
  ['antipasti','primi','secondi'].forEach((c,i)=>r.push(R('v'+i,'Ven '+c,c,'ven-cena')));
  [['sab-pranzo',0],['sab-cena',1]].forEach(([sl,k])=>['antipasti','primi','secondi','dolci'].forEach((c,i)=>r.push(R('s'+k+i,'Sab '+sl+' '+c,c,sl))));
  ['antipasti','primi','secondi','dolci'].forEach((c,i)=>r.push(R('d'+i,'Dom '+c,c,'dom-pranzo')));
  return r;};
const contorni=[R('c1','Contorno venerdì','contorni','ven-cena',[{name:'Radicchio',qty:400,unit:'g',shop:'ortolano'}]),R('c2','Contorno sabato','contorni','sab-pranzo',[{name:'Radicchio',qty:200,unit:'g',shop:'ortolano'}]),R('c3','Contorno domenica','contorni','dom-pranzo'),R('c4','Contorno libero','contorni','')];
(async()=>{
  const {browser,errors,mk}=await run();
  let ok=true;const fail=m=>{ok=false;console.log('FAIL',m);};const pass=m=>console.log('ok  ',m);
  const setup=async(p,fmt)=>{await p.waitForSelector('.login');
    await p.evaluate(({s,recipes,fmt})=>{s.forEach(w=>__db.data.set(w.collection+'/'+w.doc_id,w.data));recipes.forEach(r=>__db.data.set(r[0],r[1]));
      const st=__db.data.get('settings/main');st.fase='menu';st.formato=fmt;__db.notify();},{s:seed,recipes:[...mk15(),...contorni],fmt});};
  const d=await mk(1280,1800,false);await setup(d,'dieta');
  await d.click('.names .btn:has-text("Marco Furio")');await d.waitForSelector('.rail');
  await d.click('.tab:has-text("Menu")');await d.waitForSelector('.menu2');
  const lede=(await d.textContent('.vhead .lede')).replace(/\s+/g,' ');
  /In menu: 15 \/ 15 \+ 3 contorni in più/.test(lede)?pass('menu: «In menu: 15 / 15 + 3 contorni in più» (i contorni non si contano)'):fail('lede '+lede);
  (await d.$('.vhead .lede .bad'))===null?pass('15 su 15 non è "troppo", nonostante i contorni'):fail('conteggio segnato come eccesso');
  (await d.textContent('.stats')).replace(/\s+/g,' ').includes('15/15 piatti in menu')?pass('in testata: 15/15 piatti in menu'):fail('stats '+await d.textContent('.stats'));
  (await d.textContent('.tab:has-text("Menu")')).includes('15/15')?pass('nella scheda Menu: 15/15'):fail('badge scheda');
  const heads=await d.$$eval('.days .day>header',e=>e.map(h=>h.textContent.replace(/\s+/g,' ').trim()));
  heads[0].includes('3 / 3')&&heads[1].includes('8 / 8')&&heads[2].includes('4 / 4')&&heads.every(h=>/contorn/.test(h))?pass('giorni: 3/3, 8/8, 4/4, con «+ 1 contorno in più» accanto'):fail('giorni '+heads);
  !/troppi/.test(await d.textContent('.days'))&&(await d.$$('.day.over')).length===0?pass('nessun giorno è «troppi» con i contorni in più'):fail('troppi');
  await d.screenshot({path:out+'/94-contorni-extra.png',fullPage:true});
  // un piatto che conta in più sì che manda il giorno in eccesso
  await d.evaluate(()=>{__db.data.set('recipes/extra1',Object.assign({},__db.data.get('recipes/v0'),{title:'Un antipasto di troppo',slot:'ven-cena'}));__db.notify();});
  await d.waitForSelector('.day.over');
  (await d.textContent('.day.over>header')).includes('troppi')?pass('un antipasto in più, invece, fa scattare «troppi» (contano gli antipasti, non i contorni)'):fail('eccesso vero');
  await d.evaluate(()=>{__db.data.delete('recipes/extra1');__db.notify();});await d.waitForFunction(()=>!document.querySelector('.day.over'));
  // spesa: etichetta e ingredienti dei contorni
  await d.click('.tab:has-text("Spesa")');await d.waitForSelector('.totals');
  /15\s*piatti in menu \+ 3 contorni in più/.test((await d.textContent('.totals')).replace(/\s+/g,' '))?pass('Spesa: «15 piatti in menu + 3 contorni in più»'):fail('totali spesa '+await d.textContent('.totals'));
  const nomi=await d.$$eval('.ln .nm',e=>e.map(x=>x.textContent));
  nomi.includes('Radicchio')?pass('la lista della spesa include comunque gli ingredienti dei contorni (Radicchio)'):fail('radicchio mancante');
  // risultati della votazione: i contorni sono extra
  await d.evaluate(()=>{__db.data.get('settings/main').fase='voto';__db.data.set('votes/p_teo',{rank:{contorni:['c1','c2']},updatedAt:1});__db.notify();});
  await d.click('.tab:has-text("Votazioni")');await d.waitForSelector('[data-act=vcat]');
  await d.click('[data-act=vcat][data-v=contorni]');await d.click('[data-act=vmode][data-v=ris]');await d.waitForSelector('.res');
  const nt=(await d.$$eval('.view .note',e=>e.map(x=>x.textContent).join(' '))).replace(/\s+/g,' ');
  nt.includes('I contorni non contano nel numero dei piatti')&&!/quota suggerita/.test(await d.textContent('.view'))?pass('Risultati dei contorni: nessuna quota, solo «non contano nel numero dei piatti»'):fail('risultati contorni '+nt);
  (await d.$$('.res.cut')).length===0?pass('nessun contorno evidenziato come «dentro la quota»'):fail('cut contorni');
  // equilibrio
  await d.click('.tab:has-text("Suggerimenti")');await d.waitForSelector('#sg-eq .eqr2');
  const v=await d.$$eval('#sg-eq .eqblk:nth-of-type(2) .eqr2',rs=>rs.map(r=>[r.querySelector('.eql b').textContent,(r.querySelector('.verd')||{}).textContent||'']));
  const cv=v.find(x=>x[0].startsWith('Contorni'));
  cv&&cv[1].includes('Extra')?pass('Equilibrio: i contorni hanno il verdetto «Extra: fuori dal conteggio dei piatti»'):fail('equilibrio contorni '+JSON.stringify(cv));

  // --- Bouffetta: contatori per pasto e venerdì a portate fisse
  const b=await mk(1280,1800,false);
  const R2=(id,title,category,slot)=>R(id,title,category,slot);
  await b.waitForSelector('.login');
  await b.evaluate(({s,recipes})=>{s.forEach(w=>__db.data.set(w.collection+'/'+w.doc_id,w.data));recipes.forEach(r=>__db.data.set(r[0],r[1]));const st=__db.data.get('settings/main');st.fase='menu';st.formato='bouffetta';__db.notify();},
    {s:seed,recipes:[R('b1','Ven A','antipasti','ven-cena'),R('b2','Ven P','primi','ven-cena'),R('b3','Ven S','secondi','ven-cena'),R('b4','Ven D','dolci','ven-cena'),R('bc','Contorno venerdì','contorni','ven-cena'),
      ...[1,2,3,4,5].map(i=>R('sp'+i,'Pranzo '+i,'primi','sab-pranzo')),R('bc2','Contorno sabato','contorni','sab-pranzo')]});
  await b.click('.names .btn:has-text("Marco Furio")');await b.waitForSelector('.rail');
  await b.click('.tab:has-text("Menu")');await b.waitForSelector('.menu2');
  const hs=await b.$$eval('.days .slot h4',e=>e.map(h=>h.textContent.replace(/\s+/g,' ').trim()));
  hs.some(h=>h.startsWith('Sabato pranzo')&&h.includes('5 / 5'))&&!(await b.$('.days h4 .bad'))?pass('Bouffetta: Sabato pranzo 5 / 5 anche con un contorno in più'):fail('contatori bouffetta '+hs);
  const warn=await b.$$eval('.note.warn',e=>e.map(x=>x.textContent));
  !warn.some(w=>/fuori schema/.test(w))?pass('Bouffetta: un contorno nel venerdì a portate fisse non è «fuori schema»'):fail('fuori schema '+warn);
  console.log(errors.length?'ERRORI:\n'+errors.join('\n'):'nessun errore di console');
  if(errors.length)ok=false;
  await browser.close();process.exit(ok?0:1);
})().catch(e=>{console.error(e);process.exit(2);});
