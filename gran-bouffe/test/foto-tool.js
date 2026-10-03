// Prova di tools/foto.js contro un server finto (pagine delle fonti, immagini e API di Firestore): niente rete vera.
const http=require('http'),{spawn}=require('child_process'),path=require('path');
let ok=true;const fail=m=>{ok=false;console.log('FAIL',m);};const pass=m=>console.log('ok  ',m);
const img=Buffer.alloc(5000,1);
const patches=[];
let PORT=0;
const U=p=>`http://127.0.0.1:${PORT}${p}`;
const S=v=>({stringValue:v});
const doc=(id,f)=>({name:'projects/t/databases/(default)/documents/recipes/'+id,fields:f});
const fieldsOf=(title,link,ver,foto)=>{const f={title:S(title),link:S(link)};if(ver)f.verifica={mapValue:{fields:Object.fromEntries(Object.entries(ver).map(([k,v])=>[k,S(v)]))}};if(foto)f.foto={mapValue:{fields:{url:S(foto)}}};return f;};
const pages={
  '/p/a':`<html><head><meta property="og:site_name" content="Sito Prova"><meta property="og:image" content="/img/a.jpg?x=1&amp;y=2"></head></html>`,
  '/p/c':`<html><head><meta property="og:image" content="/img/logo.png"><script type="application/ld+json">{"@type":"Recipe","image":["/img/c.jpg"]}</script></head></html>`,
  '/p/f':`<html><head><meta property="og:image" content="/p/notimage"></head></html>`,
  '/p/g':`<html><head><meta name="twitter:image" content="/img/tiny.gif"></head></html>`
};
const srv=http.createServer((q,r)=>{
  const u=q.url.split('?')[0];
  if(u==='/v1/projects/t/databases/(default)/documents/recipes'&&q.method==='GET'){
    r.setHeader('content-type','application/json');
    return r.end(JSON.stringify({documents:[
      doc('rA',fieldsOf('Piatto A','https://example.org/a',{linkAutorevole:U('/p/a')})),
      doc('rB',fieldsOf('Piatto B','https://example.org/b',null)),
      doc('rC',fieldsOf('Piatto C',U('/p/c'),null)),
      doc('rD',fieldsOf('Piatto D',U('/p/none'),null)),
      doc('rE',fieldsOf('Piatto E',U('/p/a'),null,'https://img/esistente.jpg')),
      doc('rF',fieldsOf('Piatto F',U('/p/f'),null)),
      doc('rG',fieldsOf('Piatto G',U('/p/g'),null)),
      {name:'projects/t/databases/(default)/documents/recipes/rH',fields:Object.assign(fieldsOf('Piatto H (eliminato)',U('/p/a'),null),{eliminata:{booleanValue:true}})}
    ]}));
  }
  if(q.method==='PATCH'&&u.startsWith('/v1/projects/t/databases/(default)/documents/recipes/')){
    let b='';q.on('data',c=>b+=c);q.on('end',()=>{patches.push({url:q.url,body:JSON.parse(b)});r.statusCode=200;r.setHeader('content-type','application/json');r.end('{}');});return;
  }
  if(u.startsWith('/img/')){
    if(u==='/img/tiny.gif'){r.setHeader('content-type','image/gif');return r.end(Buffer.alloc(40,1));}
    r.setHeader('content-type',u.endsWith('.png')?'image/png':'image/jpeg');return r.end(img);
  }
  if(u==='/p/notimage'){r.setHeader('content-type','text/html');return r.end('<html>no</html>');}
  if(pages[u]){r.setHeader('content-type','text/html; charset=utf-8');return r.end(pages[u]);}
  r.statusCode=404;r.end('nf');
});
srv.listen(0,'127.0.0.1',async()=>{
  PORT=srv.address().port;
  // asincrono: il server finto sta in questo stesso processo e deve poter rispondere mentre lo script gira
  const run=a=>new Promise(res=>{
    const c=spawn('node',[path.join(__dirname,'..','tools','foto.js'),...a],{env:Object.assign({},process.env,{GB_PROJECT:'t',GB_FS_BASE:U(''),GB_ALLOW:'127.0.0.1',NO_PROXY:'127.0.0.1,localhost',no_proxy:'127.0.0.1,localhost'})});
    let so='',se='';c.stdout.on('data',d=>so+=d);c.stderr.on('data',d=>se+=d);c.on('close',code=>res({status:code,stdout:so,stderr:se}));
  });
  let r=await run([]);const o=r.stdout;
  r.status===0?pass('a secco: esce senza errori'):fail('exit '+r.status+r.stderr);
  patches.length===0?pass('a secco: non scrive nulla su Firestore'):fail('scritture a secco');
  /ok  rA[\s\S]*foto:\s+http:\/\/127\.0\.0\.1:\d+\/img\/a\.jpg\?x=1&y=2/.test(o)?pass('rA: immagine da og:image, indirizzo relativo risolto e &amp; decodificato'):fail('rA\n'+o);
  /ok  rA[\s\S]*fonte:\s+Sito Prova/.test(o)?pass('rA: nome della fonte da og:site_name (sito fuori elenco dei nomi)'):fail('fonte rA');
  /ok  rC[\s\S]*\/img\/c\.jpg/.test(o)&&!/logo\.png/.test(o)?pass('rC: scarta il logo di og:image e usa l’immagine del JSON-LD'):fail('rC\n'+o);
  /NO  rB.*nessuna fonte affidabile.*example\.org/.test(o)?pass('rB: link su sito non in whitelist → nessuna foto, dice perché'):fail('rB\n'+o);
  /NO  rD.*HTTP 404/.test(o)?pass('rD: pagina non raggiungibile (404) segnalata'):fail('rD\n'+o);
  /--  rE.*ha già una foto/.test(o)?pass('rE: ha già la foto, non la tocca'):fail('rE');
  /NO  rF.*non è un'immagine utilizzabile/.test(o)?pass('rF: og:image che non è un’immagine rifiutata'):fail('rF\n'+o);
  /NO  rG.*non è un'immagine utilizzabile.*40 byte/.test(o)?pass('rG: immagine minuscola (pixel di tracciamento) rifiutata'):fail('rG\n'+o);
  !/rH/.test(o)?pass('rH: le proposte nel cestino sono ignorate'):fail('rH');
  r=await run(['--scrivi']);
  const ids=patches.map(p=>p.url.split('/recipes/')[1].split('?')[0]).sort().join(',');
  ids==='rA,rC'?pass('--scrivi: salva solo rA e rC'):fail('patch '+ids);
  const pa=patches.find(p=>p.url.includes('/rA?'));
  pa&&pa.url.includes('updateMask.fieldPaths=foto')&&pa.url.includes('currentDocument.exists=true')&&Object.keys(pa.body.fields).join()==='foto'?pass('scrive solo il campo "foto", su un documento esistente'):fail('maschera '+(pa&&pa.url));
  const ff=pa&&pa.body.fields.foto.mapValue.fields;
  ff&&ff.url.stringValue.includes('/img/a.jpg')&&ff.pagina.stringValue===U('/p/a')&&ff.fonte.stringValue==='Sito Prova'&&/^\d{4}-\d{2}-\d{2}$/.test(ff.data.stringValue)?pass('foto salvata con url, pagina d’origine, fonte e data'):fail('corpo '+JSON.stringify(ff));
  patches.length=0;r=await run(['--scrivi','--forza','--solo','rE']);
  patches.length===1&&patches[0].url.includes('/rE?')&&/ok  rE/.test(r.stdout)?pass('--forza --solo rE: rifà solo quella e sostituisce la foto esistente'):fail('forza\n'+r.stdout+patches.length);
  srv.close();process.exit(ok?0:1);
});
