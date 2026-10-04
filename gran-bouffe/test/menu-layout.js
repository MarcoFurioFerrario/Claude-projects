// Prova: la scheda Menu si legge bene (colonne dei giorni, pasti, titoli dei piatti non spezzati lettera per lettera), in chiaro/scuro, desktop e telefono.
const {run,seed}=require('./harness');
const out=require('path').join(__dirname,'shots');require('fs').mkdirSync(out,{recursive:true});
const R=(id,title,category,slot,owners)=>[`recipes/${id}`,{title,category,region:'Veneto',link:'https://example.org/'+id,note:'',proposerId:'p_teo',ownerIds:owners||['p_teo','p_tia'],teamIds:[],createdAt:1000,
  verifica:{stato:'da_verificare'},slot,serves:4,porzione:'normale',ingredients:[],steps:[],fasi:[],preparabileACasa:false,vini:[],consigli:''}];
const recipes=[
  R('m1','Salame all’aceto','antipasti','ven-cena'),R('m2','Bigoli in salsa','primi','ven-cena'),R('m3','Tripudio di würstel e carré di maiale con crauti','secondi','ven-cena'),
  R('m4','Baccalà mantecato alla vicentina','antipasti','sab-pranzo'),R('m5','Frico friulano','antipasti','sab-pranzo'),R('m6','Radicchio alla piastra','contorni','sab-pranzo'),
  R('m7','Tortada','dolci','sab-cena'),R('m8','Fegato alla veneziana','antipasti','dom-pranzo'),R('m9','Tortei di patate','primi','dom-pranzo'),R('m10','Gran bollito con salsa pearà','secondi','dom-pranzo'),R('m11','Tiramisù','dolci','dom-pranzo')
];
(async()=>{
  const {browser,errors,mk}=await run();
  let ok=true;const fail=m=>{ok=false;console.log('FAIL',m);};const pass=m=>console.log('ok  ',m);
  for(const [w,h,dark,name] of [[1229,850,true,'desktop scuro'],[1280,900,false,'desktop chiaro'],[390,844,false,'telefono']]){
    const p=await mk(w,h,dark);await p.waitForSelector('.login');
    await p.evaluate(({s,recipes})=>{s.forEach(x=>__db.data.set(x.collection+'/'+x.doc_id,x.data));recipes.forEach(r=>__db.data.set(r[0],r[1]));__db.data.get('settings/main').fase='menu';__db.notify();},{s:seed,recipes});
    await p.click('.names .btn:has-text("Marco Furio")');await p.waitForSelector('.rail');
    await p.click('.tab:has-text("Menu")');await p.waitForSelector('.days .dish');
    await p.screenshot({path:out+'/90-menu-'+name.replace(' ','-')+'.png',fullPage:true});
    const info=await p.evaluate(()=>{
      const slots=[...document.querySelectorAll('.days .slot')].map(s=>{const c=getComputedStyle(s);return{d:c.display,fd:c.flexDirection,b:c.borderTopStyle};});
      const names=[...document.querySelectorAll('.days .dish .nm')].map(n=>{const r=n.getBoundingClientRect();return{t:n.textContent,w:Math.round(r.width),h:Math.round(r.height)};});
      const day=document.querySelector('.days .day').getBoundingClientRect();
      return{slots,names,dayW:Math.round(day.width),ov:document.documentElement.scrollWidth-document.documentElement.clientWidth};
    });
    info.slots.every(s=>s.d==='flex'&&s.fd==='column'&&s.b==='none')?pass(name+': i pasti sono colonne di righe, senza bordi tratteggiati e griglia'):fail(name+' stile .slot '+JSON.stringify(info.slots[0]));
    const bad=info.names.filter(n=>n.h>90||n.w<n.t.length*3);
    bad.length===0?pass(name+': titoli dei piatti su poche righe, non spezzati lettera per lettera'):fail(name+' titoli spezzati '+JSON.stringify(bad.slice(0,3)));
    info.ov<=1?pass(name+': nessuno scroll orizzontale'):fail(name+' overflow '+info.ov);
    const lab=await p.$$eval('.days .slot h4',e=>e.map(x=>{const r=x.getBoundingClientRect();return r.width;}));
    lab.every(x=>x>100)?pass(name+': le intestazioni dei pasti (Venerdì sera, Sabato pranzo…) hanno spazio'):fail(name+' h4 '+lab);
    await p.close();
  }
  console.log(errors.length?'ERRORI:\n'+errors.join('\n'):'nessun errore di console');
  if(errors.length)ok=false;
  await browser.close();process.exit(ok?0:1);
})().catch(e=>{console.error(e);process.exit(2);});
