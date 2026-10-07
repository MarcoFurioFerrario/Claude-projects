// Prova: CSV di controllo della spesa (solo da scaricare, non è nella pagina). Righe = ingredienti raggruppati per negozio, colonne = piatti in menu per pasto,
// celle = quantità del piatto scalata (ricalcolata qui dai dati grezzi), poi totale come nella lista e somma esatta.
const {run,seed}=require('./harness');
const I=(name,qty,unit,shop)=>({name,qty,unit,shop});
const R=(id,title,category,slot,serves,porzione,ingredients,extra)=>[`recipes/${id}`,Object.assign({title,category,region:'Veneto',link:'https://example.org/'+id,note:'',proposerId:'p_teo',ownerIds:['p_teo'],teamIds:[],createdAt:1000,
  verifica:{stato:'verificato'},slot,serves,porzione,ingredients,steps:['x'],fasi:[],preparabileACasa:false,vini:[],consigli:''},extra||{})];
const recipes=[
  R('a','Primo A','primi','ven-cena',4,'normale',[I('Riso',320,'g','dispensa'),I('Burro',50,'g','latticini'),I('Sale',0,'q.b.','dispensa'),I('Cipolla',150,'g','ortolano')]),
  R('b','Secondo B','secondi','ven-cena',6,'normale',[I('Cipolla',300,'g','ortolano'),I('Macinato di manzo',600,'g','carne'),I('Olio',30,'ml','dispensa'),I('Sale',0,'q.b.','dispensa')]),
  R('c','Dolce C','dolci','sab-pranzo',3,'abbondante',[I('Latte',500,'ml','latticini'),I('Uova',4,'pz','latticini'),I('Zucchero',100,'g','dispensa'),I('Zucchero',2,'pizzichi','dispensa')],{vini:[{nome:'Passito',bottiglie:1}]}),
  R('d','Contorno D','contorni','sab-cena',4,'normale',[I('Verza',1,'kg','ortolano'),I('Olio',40,'ml','dispensa')]),
  R('e','Antipasto senza ingredienti','antipasti','dom-pranzo',4,'normale',[]),
  R('f','Primo F','primi','dom-pranzo',5,'assaggio',[I('Riso',250,'g','dispensa'),I('Olio',20,'ml','dispensa'),I('Sale',0,'q.b.','dispensa')],{verifica:{stato:'verificato',linkAutorevole:'https://www.cucchiaio.it/ricetta/f/'}}),
  R('g','Fuori menu','primi','',4,'normale',[I('Tartufo',1,'pz','ortolano')])];
const MARG=10,PORZ={assaggio:.5,normale:1,abbondante:1.5};
const SHOPL={carne:'Carne, pesce e salumi',latticini:'Formaggi e latticini',ortolano:'Verdura e frutta',dispensa:'Supermercato e dispensa',cantina:'Vini e bevande'};
const nrm=s=>s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const base=u=>({g:['g',1],kg:['g',1000],ml:['ml',1],l:['ml',1000]})[u]||[u,1];
const parse=t=>{const o={parts:{},qb:false};for(const p of t.split(' + ').map(x=>x.trim()).filter(Boolean)){if(p==='q.b.'){o.qb=true;continue;}
  const m=p.match(/^([\d.,]+)\s+(.+)$/);if(!m){o.bad=p;continue;}let v=Number(m[1].replace(/\.(?=\d{3}\b)/g,'').replace(',','.')),u=m[2].trim();
  if(u==='kg'){v*=1000;u='g';}else if(u==='l'){v*=1000;u='ml';}o.parts[u]=(o.parts[u]||0)+v;}return o;};
const readCsv=c=>{const t=c.data;const bom=t.charCodeAt(0)===0xFEFF;return{bom,rows:t.replace(/^﻿/,'').split('\r\n').map(l=>l.slice(1,-1).split('";"'))};};
(async()=>{
  const {browser,errors,mk}=await run();
  let ok=true;const fail=m=>{ok=false;console.log('FAIL',m);};const pass=m=>console.log('ok  ',m);
  const load=async(w,h)=>{
    const d=await mk(w,h,false);await d.waitForSelector('.login');
    await d.evaluate(({s,recipes,MARG})=>{s.forEach(x=>__db.data.set(x.collection+'/'+x.doc_id,x.data));recipes.forEach(r=>__db.data.set(r[0],r[1]));__db.data.get('settings/main').margine=MARG;__db.notify();},{s:seed,recipes,MARG});
    await d.click('.names .btn:has-text("Marco Furio")');await d.waitForSelector('.rail');
    await d.click('.tab:has-text("Spesa")');await d.waitForSelector('.totals');return d;};
  const download=async d=>{await d.evaluate(()=>{window.__saved=null;});await d.click('[data-act=csv-pivot]');await d.waitForFunction(()=>window.__saved&&window.__saved.filename);return d.evaluate(()=>window.__saved);};
  const d=await load(1280,1000);
  const N=await d.evaluate(()=>[...__db.data.entries()].filter(([k,v])=>k.startsWith('participants/')&&v.confirmed).length);
  const inMenu=recipes.filter(r=>r[1].slot);
  const factor=r=>N*PORZ[r[1].porzione]*(1+MARG/100)/r[1].serves;
  const exp={};
  for(const r of inMenu){const f=factor(r),id=r[0].slice(8);
    const all=[...r[1].ingredients,...(r[1].vini||[]).filter(v=>v.bottiglie>0).map(v=>I(v.nome,v.bottiglie,'bottiglie','cantina'))];
    for(const i of all){const e=exp[nrm(i.name)]=exp[nrm(i.name)]||{shop:i.shop,name:i.name,cells:{},qb:{}};
      if(i.unit==='q.b.'||!i.qty){e.qb[id]=true;e.cells[id]=e.cells[id]||{};continue;}
      const [b,m]=base(i.unit),c=e.cells[id]=e.cells[id]||{};c[b]=(c[b]||0)+i.qty*m*f;}}

  // ---- niente tabella nella pagina: solo il pulsante per scaricare il CSV
  (await d.$('table'))||(await d.$('.pv'))||(await d.$('[data-act=sview]'))?fail('nella pagina compare una tabella o un interruttore di vista'):pass('nella pagina non c’è nessuna tabella: la Spesa resta la lista di prima');
  const btns=await d.$$eval('.vhead .row .btn',e=>e.map(b=>b.textContent.trim()));
  btns.join('|')==='Copia per WhatsApp|Scarica CSV|CSV di controllo'?pass('accanto a «Scarica CSV» c’è il pulsante «CSV di controllo»'):fail('pulsanti '+btns);
  const listLines=await d.$$eval('.ln',e=>e.map(l=>({n:l.querySelector('.nm').textContent.trim(),q:l.querySelector('.q').firstChild.textContent.trim()})));

  // ---- il file
  const f=await download(d);const csv=readCsv(f);const T=csv.rows;
  f.filename==='spesa-controllo-ingredienti-per-piatto.csv'&&csv.bom?pass('file «'+f.filename+'», con BOM per aprirlo bene in Excel'):fail('file '+f.filename+' bom '+csv.bom);
  const head=T[0];
  head.slice(0,2).join('|')==='Negozio|Ingrediente'&&head[head.length-2]==='Totale da comprare'&&head[head.length-1]==='Somma esatta'?pass('intestazione: Negozio, Ingrediente, un piatto per colonna, Totale da comprare, Somma esatta'):fail('intestazione '+head);
  const titles=head.slice(2,-2);
  titles.join('|')==='Primo A|Secondo B|Dolce C|Contorno D|Antipasto senza ingredienti|Primo F'?pass('una colonna per ogni piatto in menu, per pasto e poi per portata (il piatto fuori menu non c’è)'):fail('colonne '+titles);
  T[1].slice(2,-2).join('|')==='Venerdì sera|Venerdì sera|Sabato pranzo|Sabato cena|Domenica pranzo|Domenica pranzo'&&T[1][1]==='Pasto'?pass('sotto i titoli: il pasto di ogni piatto'):fail('pasto '+T[1]);
  const fx=x=>x.toLocaleString('it-IT',{maximumFractionDigits:3});
  const meta=T[2].slice(2,-2);
  meta[0]==='per 4 → ×'+fx(N*1.1/4)&&meta[1]==='per 6 → ×'+fx(N*1.1/6)&&meta[2].startsWith('per 3 → ×'+fx(N*1.1*1.5/3))&&meta[2].includes('(abbondante)')&&meta[5].includes('(assaggio)')?pass('poi per quante persone è la ricetta e il fattore di scala, con la porzione se non è «normale» (A: '+meta[0]+', C: '+meta[2]+')'):fail('fattori '+meta);
  T[2][T[2].length-2]==='per '+N+' persone'?pass('...e il numero di persone confermate su cui è scalato ('+N+')'):fail('persone '+T[2]);
  const fonti=T[3].slice(2,-2);
  fonti[0]==='https://example.org/a'&&fonti[5]==='https://www.cucchiaio.it/ricetta/f/'?pass('poi la ricetta di riferimento: fonte autorevole se c’è, altrimenti il link della proposta'):fail('fonti '+fonti);
  const data=T.slice(4);

  // ---- righe: stesse voci e stesso ordine della lista, raggruppate per negozio
  data.map(r=>r[1]).join('|')===listLines.map(l=>l.n).join('|')?pass('le righe sono le stesse voci della lista, nello stesso ordine ('+data.length+')'):fail('righe '+data.map(r=>r[1])+' / lista '+listLines.map(l=>l.n));
  const shopSeq=[];data.forEach(r=>{if(shopSeq[shopSeq.length-1]!==r[0])shopSeq.push(r[0]);});
  shopSeq.join('|')===Object.values(SHOPL).join('|')?pass('ordinate per negozio come nella lista: '+shopSeq.join(' · ')):fail('negozi '+shopSeq);
  const bad=[];
  for(const r of data){const e=exp[nrm(r[1])];if(!e){bad.push('riga in più '+r[1]);continue;}
    if(r[0]!==SHOPL[e.shop])bad.push(r[1]+': negozio '+r[0]);
    titles.forEach((_,i)=>{const id='abcdef'[i],t=r[2+i],has=e.cells[id];
      if(!has){if(t!=='')bad.push(r[1]+' / '+titles[i]+': cella piena «'+t+'» ma il piatto non usa l’ingrediente');return;}
      const a=parse(t);if(a.bad){bad.push(r[1]+' / '+titles[i]+': illeggibile «'+t+'»');return;}
      if(!!e.qb[id]!==a.qb)bad.push(r[1]+' / '+titles[i]+': q.b. «'+t+'»');
      const ks=Object.keys(has);if(ks.sort().join()!==Object.keys(a.parts).sort().join())bad.push(r[1]+' / '+titles[i]+': unità «'+t+'»');
      for(const b of ks){const tol=(b==='g'||b==='ml')&&has[b]>=1000?0.51:0.006;if(Math.abs((a.parts[b]||0)-has[b])>tol)bad.push(r[1]+' / '+titles[i]+': «'+t+'» atteso '+has[b]);}});}
  Object.keys(exp).every(k=>data.some(r=>nrm(r[1])===k))||bad.push('manca una voce attesa');
  bad.length===0?pass('ogni cella = dose × persone ÷ persone della ricetta × porzione × (1+margine): ricalcolata dai dati grezzi per tutte le '+data.length+' righe × '+titles.length+' piatti'):fail('celle: '+bad.slice(0,8).join(' | '));
  const sale=data.find(r=>r[1]==='Sale');
  sale.slice(2,-2).filter(Boolean).join()==='q.b.,q.b.,q.b.'&&sale[sale.length-2]==='q.b.'?pass('«q.b.» nelle celle e nel totale'):fail('q.b. '+sale);
  /g \+ .*pizzichi/.test(data.find(r=>r[1]==='Zucchero').slice(2,-2).join(' '))?pass('unità diverse nella stessa cella (grammi + pizzichi) restano separate'):fail('zucchero');
  data.find(r=>r[1]==='Passito').slice(2,-2).some(c=>/bottiglie/.test(c))?pass('i vini in abbinamento compaiono come bottiglie, nel gruppo «Vini e bevande»'):fail('vino');
  data.every(r=>r[2+titles.indexOf('Antipasto senza ingredienti')]==='')?pass('la colonna del piatto senza ingredienti è vuota'):fail('colonna vuota');
  // ---- totale = lista; somma esatta
  data.map(r=>r[1]+':'+r[r.length-2]).join('|')===listLines.map(l=>l.n+':'+l.q).join('|')?pass('«Totale da comprare» è identico al totale della lista della spesa per tutte le voci'):fail('totali ≠ lista');
  const ci=data.find(r=>r[1]==='Cipolla'),sumExact=exp.cipolla.cells.a.g+exp.cipolla.cells.b.g;
  Math.abs(parse(ci[ci.length-1]).parts.g-sumExact)<1?pass('«Somma esatta» = somma delle celle della riga ('+ci[ci.length-1]+'), da confrontare con il totale arrotondato per eccesso ('+ci[ci.length-2]+')'):fail('somma esatta '+ci[ci.length-1]+' atteso '+sumExact);

  // ---- filtri: il giorno vale come per la lista; negozio e «già comprati» no (il file è la tabella intera)
  await d.selectOption('#sday','sab');await d.waitForFunction(()=>document.querySelectorAll('.ln').length<12);
  const sab=readCsv(await download(d)).rows;
  sab[0].slice(2,-2).join('|')==='Dolce C|Contorno D'&&sab.slice(4).map(r=>r[1]).sort().join('|')===['Latte','Uova','Zucchero','Passito','Verza','Olio'].sort().join('|')?pass('con il filtro «Sabato» il file ha solo i piatti e gli ingredienti del sabato'):fail('sabato '+sab[0]+' / '+sab.slice(4).map(r=>r[1]));
  const lat=sab.slice(4).find(r=>r[1]==='Latte');const eL=exp.latte.cells.c.ml;
  parse(lat[lat.length-2]).parts.ml===(eL<200?Math.ceil(eL/5-1e-9)*5:eL<1000?Math.ceil(eL/10-1e-9)*10:Math.ceil(eL/50-1e-9)*50)?pass('...e i totali sono quelli del sabato (Latte '+lat[lat.length-2]+')'):fail('Latte sabato '+lat[lat.length-2]);
  await d.selectOption('#sday','');await d.selectOption('#sshop','latticini');await d.check('#shide');
  const all2=readCsv(await download(d)).rows;
  all2.slice(4).length===data.length?pass('i filtri Negozio e «Nascondi già comprati» non toccano il file: resta la tabella intera ('+data.length+' righe)'):fail('righe con filtri '+all2.slice(4).length);
  await d.uncheck('#shide');await d.selectOption('#sshop','');

  // ---- telefono: i tre pulsanti vanno a capo senza far scorrere la pagina
  const m=await load(390,844);
  const mm=await m.evaluate(()=>({doc:document.documentElement.scrollWidth,vw:innerWidth,n:document.querySelectorAll('.vhead .row .btn').length}));
  mm.doc<=mm.vw&&mm.n===3?pass('telefono: i tre pulsanti non fanno scorrere la pagina di lato'):fail('telefono '+JSON.stringify(mm));
  await m.screenshot({path:require('path').join(__dirname,'shots','93-spesa-csv-telefono.png')});

  errors.length?fail('errori: '+errors.join(' | ')):pass('nessun errore di console');
  await browser.close();
  console.log(ok?'\nTUTTO OK':'\nCI SONO ERRORI');process.exit(ok?0:1);
})().catch(e=>{console.error(e);process.exit(1);});
