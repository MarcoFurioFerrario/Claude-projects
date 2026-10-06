// Prova: scadenze con countdown, fasi automatiche, voto sul formato del menu, scelta Suggerimenti / fuori elenco, whitelist.
// L'orologio dei test è finto (window.__now): sabato 3 ottobre 2026, 12:00 ora italiana.
const {run,seed}=require('./harness');
const out=require('path').join(__dirname,'shots');require('fs').mkdirSync(out,{recursive:true});
const T=s=>Date.parse(s);
const R=(id,title,category,extra)=>[`recipes/${id}`,Object.assign({title,category,region:'Veneto',link:'https://example.org/'+id,note:'',proposerId:'p_teo',ownerIds:['p_teo'],teamIds:[],createdAt:Date.now(),
  verifica:{stato:'da_verificare'},slot:'',serves:4,porzione:'normale',ingredients:[],steps:[],fasi:[],preparabileACasa:false,vini:[],consigli:''},extra||{})];
const recipes=[];
const mkcat=(cat,n)=>{for(let i=1;i<=n;i++)recipes.push(R(`${cat}${i}`,`${cat[0].toUpperCase()+cat.slice(1)} ${String(i).padStart(2,'0')}`,cat));};
mkcat('antipasti',6);mkcat('primi',8);mkcat('secondi',8);mkcat('contorni',3);mkcat('dolci',5);
recipes.push(R('wl1','Fegato (fonte Taccuini)','secondi',{link:'https://www.taccuinigastrosofici.it/ita/ricette/contemporanea/carni/Fegato-alla-veneziana.html'}));
const ranks={};['p_teo','p_tia','p_jack'].forEach(p=>{ranks[p]={};['antipasti','primi','secondi','contorni','dolci'].forEach(c=>{ranks[p][c]=recipes.filter(r=>r[1].category===c&&!r[0].startsWith('recipes/wl')).map(r=>r[0].slice(8));});});

(async()=>{
  const {browser,errors,mk}=await run();
  let ok=true;const fail=m=>{ok=false;console.log('FAIL',m);};const pass=m=>console.log('ok  ',m);
  const d=await mk(1280,900,false);await d.waitForSelector('.login');
  await d.evaluate(({s,recipes})=>{s.forEach(w=>__db.data.set(w.collection+'/'+w.doc_id,w.data));recipes.forEach(r=>__db.data.set(r[0],r[1]));__db.notify();},{s:seed,recipes});
  const login=async n=>{await d.click('.names .btn:has-text("'+n+'")');await d.waitForSelector('.rail');};
  const logout=async()=>{await d.click('[data-act=logout]');await d.waitForSelector('.names');};
  const clock=async iso=>{await d.evaluate(t=>{window.__now=t;__db.notify();},T(iso));};
  const cdTitle=()=>d.textContent('.cd-t b');
  const onVoto=async()=>{await d.click('.tab:has-text("Votazioni")');await d.waitForSelector('.band');};
  const waitTitle=async t=>{if(!(await d.$('.cd-t b')))await onVoto();await d.waitForFunction(x=>{const e=document.querySelector('.cd-t b');return e&&e.textContent===x;},t,{timeout:8000});};
  const vote=id=>d.evaluate(i=>__db.data.get('votes/'+i),id);

  // --- countdown e tappe
  await login('Fede');
  const altre=['Suggerimenti','Il libro','Proposte','Menu','Spesa','Programma','Persone'];
  const presenti=[];for(const t of altre){await d.click('.tab:has-text("'+t+'")');await d.waitForTimeout(120);if(await d.$('.band'))presenti.push(t);}
  presenti.length===0?pass('la banda bordata (scadenze e voto sul formato) non compare in nessuna scheda tranne Votazioni ('+altre.length+' schede controllate)'):fail('banda presente in '+presenti);
  await onVoto();
  (await d.$$('.band')).length===1?pass('in Votazioni la banda c’è, una sola volta'):fail('banda in Votazioni');
  const cd=(await d.textContent('.cd [data-cd]')).trim();
  cd==='1 g 09 h 00 min 00 s'?pass('countdown alle proposte: '+cd+' (sab 3 ott 12:00 → dom 4 ott 21:00)'):fail('countdown '+cd);
  (await d.textContent('.cd-t')).includes('domenica 4 ottobre, ore 21:00')?pass('scadenza scritta per esteso: domenica 4 ottobre, ore 21:00'):fail('testo scadenza '+await d.textContent('.cd-t'));
  (await d.textContent('.steps3 li.now b'))==='Proposte e voto sul formato'?pass('tappa attuale: proposte e voto sul formato'):fail('tappa');
  (await d.textContent('.steps3')).includes('lunedì 5 ottobre, da 00:00 a mezzanotte')?pass('tappa voto piatti: lunedì 5 ottobre, da 00:00 a mezzanotte'):fail('tappa voto '+await d.textContent('.steps3'));
  await d.screenshot({path:out+'/40-banda-desktop.png',clip:{x:0,y:0,width:1280,height:760}});

  // --- voto sul formato
  (await d.$$('.fmo')).length===3?pass('tre formati visibili a chi non ha ancora votato'):fail('formati '+(await d.$$('.fmo')).length);
  const txt=await d.textContent('.fmgrid');
  txt.includes('15')&&txt.includes('18')&&txt.includes('22')&&txt.includes('Dieta')&&txt.includes('Bouffetta')&&txt.includes('L’importante è esagerare')?pass('Dieta 15 · Bouffetta 18 · L’importante è esagerare 22'):fail('testo formati');
  txt.includes('antipasto, primo, secondo, dolce')&&txt.includes('Sabato 5 + 5')?pass('Bouffetta: venerdì antipasto, primo, secondo, dolce; sabato 5 + 5'):fail('righe bouffetta');
  await d.click('.fmo[data-v=bouffetta]');
  await d.waitForFunction(()=>{const v=__db.data.get('votes/p_fede');return v&&v.formato==='bouffetta';});
  const v1=await vote('p_fede');
  v1.formato==='bouffetta'&&v1.rank&&Object.keys(v1.rank).length===0?pass('voto salvato in votes/p_fede.formato, senza toccare le classifiche'):fail('voto '+JSON.stringify(v1));
  await d.waitForSelector('.fm-sum');
  (await d.textContent('.fm-sum')).includes('Hai scelto Bouffetta (18 piatti)')?pass('dopo il voto la banda si riduce a una riga'):fail('riga '+await d.textContent('.fm-sum'));
  (await d.$$('.fmo')).length===0?pass('nessuna scheda aperta dopo il voto'):fail('schede aperte');
  /hanno votato/.test(await d.textContent('.stats'))&&/\b0\s*hanno votato/.test((await d.textContent('.stats')).replace(/\s+/g,' '))?pass('chi vota solo il formato non conta tra chi ha votato i piatti'):fail('stats '+await d.textContent('.stats'));
  await d.evaluate(()=>{const s=(id,f)=>__db.data.set('votes/'+id,{formato:f,rank:{},updatedAt:1});s('p_teo','dieta');s('p_tia','esagerare');s('p_melo','esagerare');s('p_jack','bouffetta');__db.notify();});
  await d.click('.fm-sum [data-act=fmt-x]');await d.waitForSelector('.fmo');
  const card=k=>d.textContent('.fmo[data-v='+k+']');
  const c1=(await card('dieta')).replace(/\s+/g,' '),c2=(await card('bouffetta')).replace(/\s+/g,' '),c3=(await card('esagerare')).replace(/\s+/g,' ');
  c1.includes('1 voto')&&c2.includes('2 voti')&&c3.includes('2 voti')?pass('conteggi in tempo reale: dieta 1, bouffetta 2, esagerare 2'):fail('conteggi '+[c1,c2,c3].join(' / '));
  c2.includes('Il tuo voto')?pass('la scheda del mio voto è segnata'):fail('segno voto');
  (await d.textContent('.fm-sum')).includes('provvisorio')?pass('finché si vota il menu resta su 22 piatti, "provvisorio"'):fail('provvisorio');
  await d.screenshot({path:out+'/41-formato-aperto.png',clip:{x:0,y:0,width:1280,height:900}});
  await d.click('.fmo[data-v=dieta]');
  await d.waitForFunction(()=>__db.data.get('votes/p_fede').formato==='dieta');
  pass('il voto si può cambiare finché le proposte sono aperte (bouffetta → dieta)');
  await d.evaluate(()=>{__db.data.set('votes/p_fede',{formato:'bouffetta',rank:{},updatedAt:2});__db.notify();}); // pareggio 2-2-1

  // --- Proposte: le due strade
  await d.click('.tab:has-text("Proposte")');await d.waitForSelector('.choose');
  (await d.$$('.choose .opt')).length===2&&(await d.textContent('.choose .opt.a')).includes('Scegli tra i Suggerimenti')&&(await d.textContent('.choose .opt.b')).includes('fuori elenco')?pass('Proposte: due strade affiancate, A Suggerimenti / B fuori elenco'):fail('strade');
  (await d.$('.vhead [data-act=new-recipe]'))===null?pass('nessun secondo pulsante "Proponi" ridondante in testata'):fail('pulsante duplicato');
  await d.screenshot({path:out+'/42-proposte-strade.png',clip:{x:0,y:0,width:1280,height:900}});
  await d.click('.choose .opt.b [data-act=new-recipe]');await d.waitForSelector('#ed-title');
  (await d.textContent('.sheet')).includes('Taccuini Gastrosofici')?pass('l’editor elenca le fonti affidabili (whitelist)'):fail('whitelist nell’editor');
  await d.click('.sheet [data-act=modal-close]');
  await d.click('.choose .opt.a [data-act=tab]');await d.waitForSelector('.hero-sug');pass('la strada A porta ai Suggerimenti');
  await d.click('.tab:has-text("Proposte")');await d.waitForSelector('.card');
  const wl=await d.evaluate(()=>{const c=[...document.querySelectorAll('.card')];const f=c.find(x=>x.querySelector('h3').textContent.startsWith('Fegato'));const e=c.find(x=>x.querySelector('h3').textContent==='Primi 01');return [!!f.querySelector('.wl'),!!e.querySelector('.wl')];});
  wl[0]&&!wl[1]?pass('link su taccuinigastrosofici.it segnato "✓ affidabile", example.org no'):fail('whitelist '+wl);

  // --- scadenza proposte: tutto si chiude insieme
  await clock('2026-10-04T21:00:01+02:00');await waitTitle('Proposte chiuse');
  pass('allo scadere il countdown passa da solo a "Proposte chiuse"');
  (await d.textContent('.cd-t')).includes('lunedì 5 ottobre, ore 00:00')?pass('prossima tappa: voto sui piatti lunedì 5 ottobre, ore 00:00'):fail('prossima tappa '+await d.textContent('.cd-t'));
  (await d.$('.rail li.next'))&&(await d.textContent('.rail li.next')).includes('Voto')?pass('barra delle fasi: Proposte fatta, Voto in arrivo'):fail('rail');
  await d.click('.tab:has-text("Proposte")');await d.waitForSelector('.choose');
  (await d.$eval('[data-act=new-recipe]',e=>e.disabled))===true?pass('Fede non può più proporre (pulsante disattivato)'):fail('proposta ancora aperta');
  (await d.textContent('.view')).includes('Le proposte sono chiuse')?pass('avviso "Le proposte sono chiuse"'):fail('avviso chiuse');
  await onVoto();
  await d.click('.fm-sum [data-act=fmt-x]').catch(()=>{});
  await d.waitForSelector('.fmo');
  (await d.$$('.fmo[disabled]')).length===3?pass('voto sul formato chiuso: schede disattivate'):fail('formato non chiuso');
  const sum=await d.textContent('.fm-sum');
  sum.includes('L’importante è esagerare')&&sum.includes('deciso dal voto')?pass('a parità vince il formato più abbondante: esagerare (22), deciso dal voto'):fail('vincitore '+sum);
  await d.click('.tab:has-text("Menu")');await d.waitForSelector('.days');
  (await d.textContent('.lede')).includes('22 piatti')?pass('il menu passa a 22 piatti'):fail('lede '+await d.textContent('.lede'));
  await logout();await login('Marco Furio');await d.click('.tab:has-text("Proposte")');await d.waitForSelector('.choose');
  (await d.$eval('[data-act=new-recipe]',e=>e.disabled))===false?pass('l’organizzatore può proporre anche dopo la scadenza'):fail('organizzatore bloccato');

  // --- organizzatore fissa il formato
  await d.evaluate(({ranks})=>{for(const [id,rank] of Object.entries(ranks)){const v=__db.data.get('votes/'+id)||{};__db.data.set('votes/'+id,Object.assign({},v,{rank,updatedAt:1}));}__db.notify();},{ranks});
  await onVoto();await d.waitForSelector('#fx-set');
  const planned=async f=>{
    await onVoto();
    await d.selectOption('#fx-set',f);
    await d.waitForFunction(x=>__db.data.get('settings/main').formato===x,f);
    await d.click('.tab:has-text("Menu")');await d.waitForSelector('.days');
    await d.click('[data-act=suggest]');await d.click('[data-act=suggest-go]');
    await d.waitForFunction(()=>[...__db.data.entries()].filter(e=>e[0].startsWith('recipes/')&&e[1].slot).length>0);
    await d.waitForTimeout(400);
    return d.evaluate(()=>{const all=[...__db.data.entries()].filter(e=>e[0].startsWith('recipes/')&&e[1].slot).map(e=>e[1]);const s=all.filter(r=>r.category!=='contorni');const by={};s.forEach(r=>{(by[r.slot]=by[r.slot]||[]).push(r.category);});const cont=all.filter(r=>r.category==='contorni');return {n:s.length,by,extra:cont.length,contSlots:cont.map(r=>r.slot)};}); // n = piatti che contano (senza contorni)
  };
  let p1=await planned('bouffetta');
  const ven=(p1.by['ven-cena']||[]).slice().sort().join(',');
  p1.n===18?pass('Bouffetta: il suggerimento riempie 18 piatti (i contorni sono in più)'):fail('bouffetta n='+p1.n);
  p1.extra>=1&&!p1.contSlots.includes('ven-cena')?pass('Bouffetta: '+p1.extra+' contorni in più, mai nel venerdì a portate fisse'):fail('contorni bouffetta '+JSON.stringify(p1));
  ven==='antipasti,dolci,primi,secondi'?pass('Bouffetta: venerdì sera = un antipasto, un primo, un secondo, un dolce'):fail('venerdì '+ven);
  (await d.textContent('.lede')).includes('Bouffetta')&&(await d.textContent('.lede')).includes('18 piatti')?pass('il Menu dichiara il formato: Bouffetta, 18 piatti'):fail('lede bouffetta');
  (await d.$$eval('.slot h4 .num',e=>e.length))>=4?pass('Bouffetta: contatori per pasto (n / tetto)'):fail('contatori per pasto');
  await d.screenshot({path:out+'/43-menu-bouffetta.png',fullPage:true});
  p1=await planned('dieta');
  p1.n===15&&(p1.by['ven-cena']||[]).length===3&&p1.extra>=1?pass('Dieta: 15 piatti (+ '+p1.extra+' contorni in più), venerdì 3'):fail('dieta '+JSON.stringify(p1));
  p1=await planned('esagerare');
  p1.n===22?pass('Esagerare: 22 piatti, senza quote per portata'):fail('esagerare '+p1.n);
  (await d.textContent('.days')).includes('piatti')&&!(await d.textContent('.days')).includes('troppi')?pass('Esagerare: nessun "troppi" per giorno'):fail('troppi');

  // --- fasi automatiche con le scadenze
  await clock('2026-10-05T00:00:01+02:00');await waitTitle('Voto sui piatti aperto');
  pass('lunedì 5 ottobre 00:00: il voto sui piatti si apre da solo (la fase salvata è ancora "proposte")');
  (await d.textContent('.cd-t')).includes('mezzanotte di lunedì 5 ottobre')?pass('chiusura scritta: mezzanotte di lunedì 5 ottobre'):fail('chiusura '+await d.textContent('.cd-t'));
  (await d.textContent('.cd [data-cd]')).trim()==='23 h 59 min 59 s'||(await d.textContent('.cd [data-cd]')).trim().startsWith('23:59')?pass('24 ore di voto: '+(await d.textContent('.cd [data-cd]')).trim()):fail('24 ore '+await d.textContent('.cd [data-cd]'));
  await d.click('.tab:has-text("Votazioni")');await d.waitForSelector('.rank');
  (await d.$$eval('.rank select:not([disabled])',e=>e.length))>0?pass('Votazioni: ordinamento attivo'):fail('voto non attivo');
  await d.click('.rail button:has-text("Proposte")');await d.waitForSelector('.toast.err');
  (await d.textContent('.toast')).includes('scadenze automatiche')?pass('l’organizzatore non può riaprire una fase che le scadenze hanno chiuso (spiega come fare)'):fail('toast fase');
  await clock('2026-10-06T00:00:01+02:00');await waitTitle('Votazioni chiuse');
  (await d.textContent('.view')).includes('Le votazioni sono chiuse')?pass('martedì 6 ottobre 00:00: votazioni chiuse, risultati visibili'):fail('chiusura voto');
  (await d.$$eval('.rank select:not([disabled])',e=>e.length))===0?pass('ordinamento disattivato a voto chiuso'):fail('voto ancora attivo');

  // --- editor delle scadenze (ora italiana)
  await clock('2026-10-03T12:00:00+02:00');
  await d.click('.tab:has-text("Persone")');await d.waitForSelector('[data-act=edit-settings]');
  (await d.textContent('.panel:has(h3:text-is("Il weekend"))')).includes('fino a domenica 4 ottobre, ore 21:00')?pass('Persone: scadenze scritte'):fail('persone scadenze');
  await d.click('.panel:has(h3:text-is("Il weekend")) [data-act=edit-settings]');await d.waitForSelector('#s-pf');
  const iv=await d.$$eval('#s-pf,#s-vi,#s-vf',e=>e.map(x=>x.value));
  iv.join('|')==='2026-10-04T21:00|2026-10-05T00:00|2026-10-06T00:00'?pass('l’editor mostra le scadenze in ora italiana'):fail('valori '+iv);
  await d.fill('#s-pf','2026-10-05T22:00');await d.click('[data-act=save-settings]');
  (await d.textContent('#ed-err')).includes('in ordine')?pass('scadenze fuori ordine rifiutate'):fail('ordine');
  await d.fill('#s-vi','2026-10-05T23:00');await d.fill('#s-vf','2026-10-06T23:00');await d.click('[data-act=save-settings]');
  await d.waitForFunction(()=>__db.data.get('settings/main').scad&&__db.data.get('settings/main').scad.propFine==='2026-10-05T22:00:00+02:00');
  pass('scadenza salvata con offset estivo: 2026-10-05T22:00:00+02:00');
  await onVoto();
  await d.waitForFunction(()=>{const e=document.querySelector('.cd [data-cd]');return e&&e.textContent.trim().startsWith('2 g 10 h');},null,{timeout:5000})
    .then(()=>pass('il countdown segue la nuova scadenza: 2 g 10 h'),async()=>fail('nuovo countdown '+await d.textContent('.cd [data-cd]')));
  await d.click('.tab:has-text("Persone")');
  await d.click('.panel:has(h3:text-is("Il weekend")) [data-act=edit-settings]');await d.waitForSelector('#s-pf');
  await d.fill('#s-pf','2026-12-10T10:00');await d.fill('#s-vi','2026-12-11T00:00');await d.fill('#s-vf','2026-12-12T00:00');await d.click('[data-act=save-settings]');
  await d.waitForFunction(()=>__db.data.get('settings/main').scad.propFine==='2026-12-10T10:00:00+01:00');
  pass('in inverno l’offset è +01:00');
  await d.click('.panel:has(h3:text-is("Il weekend")) [data-act=edit-settings]');await d.waitForSelector('#s-auto');
  await d.uncheck('#s-auto');await d.click('[data-act=save-settings]');
  await d.waitForFunction(()=>__db.data.get('settings/main').scadAuto===false);
  await onVoto();
  await d.waitForFunction(()=>document.querySelector('.cd-t span').textContent.includes('organizzatore'));
  pass('fasi manuali: niente countdown, decide l’organizzatore');
  (await d.$('.cd [data-cd]'))===null?pass('senza fasi automatiche non compare il conto alla rovescia'):fail('countdown con fasi manuali');

  // --- mobile
  const m=await mk(390,844,true);await m.waitForSelector('.login');
  await m.evaluate(({s,recipes})=>{s.forEach(w=>__db.data.set(w.collection+'/'+w.doc_id,w.data));recipes.forEach(r=>__db.data.set(r[0],r[1]));__db.notify();},{s:seed,recipes});
  await m.click('.names .btn:has-text("Fede")');await m.waitForSelector('.rail');await m.click('.tab:has-text("Votazioni")');await m.waitForSelector('.band');
  await m.screenshot({path:out+'/44-banda-mobile.png'});
  let ov=await m.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);ov<=1?pass('mobile: banda senza scroll orizzontale'):fail('overflow banda '+ov);
  await m.click('.tab:has-text("Proposte")');await m.waitForSelector('.choose');
  await m.screenshot({path:out+'/45-proposte-mobile.png'});
  ov=await m.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);ov<=1?pass('mobile: Proposte senza scroll orizzontale'):fail('overflow proposte '+ov);
  console.log(errors.length?'ERRORI:\n'+errors.join('\n'):'nessun errore di console');
  if(errors.length)ok=false;
  await browser.close();process.exit(ok?0:1);
})().catch(e=>{console.error(e);process.exit(2);});
