/* ============ logica: tempi, votazioni, selezione, spesa ============ */
const slotDef=k=>SLOTS.find(s=>s.key===k);
const slotDay=k=>(slotDef(k)||{}).day||'';
const slotLabel=k=>(slotDef(k)||{}).label||'';
/* --- formato del menu: voto di ognuno in votes/<id>.formato; vale quello fissato dall'organizzatore, altrimenti
   (a voto chiuso) il più votato, a parità il più abbondante; senza voti resta "esagerare" (22 piatti, come prima). --- */
function fmtVotes(){
  const t={};FORMATI.forEach(f=>{t[f.key]=[];});
  for(const p of S.participants){const v=S.votes[p.id];if(v&&t[v.formato])t[v.formato].push(p);}
  return t;
}
function fmtWinner(){
  const t=fmtVotes();let best=null,bn=0;
  for(const f of [...FORMATI].reverse()){const n=t[f.key].length;if(n>bn){bn=n;best=f.key;}}
  return best;
}
function fmtEff(){
  const fx=S.settings.formato;
  if(FMT(fx))return{key:fx,how:'fissato'};
  if(!fmtOpen()){const w=fmtWinner();if(w)return{key:w,how:'voto'};}
  return{key:'esagerare',how:'provvisorio'};
}
const fmtNow=()=>FMT(fmtEff().key);
const capNow=()=>fmtNow().cap;
const totalCap=()=>{const c=capNow();return num(c.ven)+num(c.sab)+num(c.dom);};
const slotted=()=>S.recipes.filter(r=>r.slot&&slotDef(r.slot));
/* I contorni si possono mettere in menu anche oltre il numero di piatti deciso: per il conteggio (formato, giorni, pasti) contano solo antipasti, primi, secondi e dolci. */
const isCounted=r=>r.category!=='contorni';
const counted=()=>slotted().filter(isCounted);
const nExtra=()=>slotted().length-counted().length;
const extraTxt=n=>n?` + ${n} contorn${n===1?'o':'i'} in più`:'';

/* --- tempi e fattibilità --- */
const lead=r=>Math.max(0,...(r.fasi||[]).map(f=>num(f.ore)));
const slotAbs=k=>slotDef(k).dayIdx*24+hm(S.settings.orari[k]);
const slotOffset=k=>slotAbs(k)-hm(S.settings.arrivo)-num(S.settings.riservaOre);
const feasible=(r,k)=>!!r.preparabileACasa||lead(r)<=slotOffset(k)+1e-9;
const earliest=r=>SLOTS.find(s=>feasible(r,s.key))||null;
function dayLabel(idx){
  let name=WEEKDAYS[((idx%7)+7)%7];
  const d=S.settings.dataVen;
  if(d&&/^\d{4}-\d{2}-\d{2}$/.test(d)){
    const [y,m,dd]=d.split('-').map(Number);
    const dt=new Date(y,m-1,dd+idx);
    name=dt.toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long'});
    name=name[0].toUpperCase()+name.slice(1);
  }
  return name;
}
function leadText(h){
  if(h<=0)return '';
  if(h>=48&&h%24===0)return (h/24)+' giorni';
  if(h>=24)return fmtN(h,1)+' ore ('+fmtN(h/24,1)+' giorni)';
  return fmtN(h,1)+' ore';
}

/* --- quantità e spesa --- */
const UMAP={g:'g',gr:'g',grammi:'g',grammo:'g',kg:'kg',kilo:'kg',chili:'kg',chilo:'kg',ml:'ml',millilitri:'ml',cl:'cl',dl:'dl',l:'l',lt:'l',litro:'l',litri:'l',
  pz:'pz',pezzo:'pz',pezzi:'pz',n:'pz',nr:'pz',unita:'pz',spicchio:'spicchi',spicchi:'spicchi',mazzo:'mazzi',mazzi:'mazzi',mazzetto:'mazzi',mazzetti:'mazzi',
  foglia:'foglie',foglie:'foglie',rametto:'rametti',rametti:'rametti',cucchiaio:'cucchiai',cucchiai:'cucchiai',cucchiaino:'cucchiaini',cucchiaini:'cucchiaini',
  bustina:'bustine',bustine:'bustine',barattolo:'barattoli',barattoli:'barattoli',confezione:'confezioni',confezioni:'confezioni',fetta:'fette',fette:'fette',
  bicchiere:'bicchieri',bicchieri:'bicchieri',bottiglia:'bottiglie',bottiglie:'bottiglie',testa:'teste',teste:'teste',costa:'coste',coste:'coste',
  pizzico:'pizzichi',pizzichi:'pizzichi',qb:'qb',quantobasta:'qb'};
const canonU=u=>{const k=norm(u).replace(/ /g,'');return UMAP[k]||k;};
function normUnit(u){
  const k=norm(u).replace(/ /g,'');
  if(k==='')return{base:'pz',mult:1};
  const b=UMAP[k]||k;
  if(b==='kg')return{base:'g',mult:1000};
  if(b==='cl')return{base:'ml',mult:10};
  if(b==='dl')return{base:'ml',mult:100};
  if(b==='l')return{base:'ml',mult:1000};
  return{base:b,mult:1};
}
function fmtQty(base,v){
  if(base==='g')return v>=1000?fmtN(v/1000)+' kg':fmtN(v)+' g';
  if(base==='ml')return v>=1000?fmtN(v/1000)+' l':fmtN(v)+' ml';
  return fmtN(v)+' '+base;
}
/* arrotondamento "da spesa": per eccesso */
function roundUp(base,v){
  if(base==='g'||base==='ml'){
    if(v<50)return Math.ceil(v-1e-9);
    if(v<200)return Math.ceil(v/5-1e-9)*5;
    if(v<1000)return Math.ceil(v/10-1e-9)*10;
    return Math.ceil(v/50-1e-9)*50;
  }
  return Math.max(1,Math.ceil(v-1e-9));
}
/* arrotondamento "da ricetta": al più vicino */
function niceQty(base,v){
  if(base==='g'||base==='ml'){
    if(v<10)return Math.round(v*2)/2;
    if(v<100)return Math.round(v/5)*5;
    if(v<1000)return Math.round(v/10)*10;
    return Math.round(v/50)*50;
  }
  if(v<3)return Math.max(.5,Math.round(v*2)/2);
  return Math.round(v);
}
function scaleF(r){
  const sv=Math.max(1,num(r.serves)||4);
  return nConf()*(PORZ[r.porzione]?PORZ[r.porzione].f:1)*(1+num(S.settings.margine)/100)/sv;
}
function allIngs(r){
  const a=(r.ingredients||[]).map(i=>({name:i.name,qty:i.qty,unit:i.unit,shop:i.shop||'dispensa'}));
  for(const v of (r.vini||[]))if(num(v.bottiglie)>0)a.push({name:v.nome,qty:v.bottiglie,unit:'bottiglie',shop:'cantina',vino:true});
  return a;
}
function consolidate(day){
  const lines=new Map();
  for(const r of slotted()){
    if(day&&slotDay(r.slot)!==day)continue;
    const f=scaleF(r);
    for(const ing of allIngs(r)){
      const nm=norm(ing.name);if(!nm)continue;
      let L=lines.get(nm);
      if(!L){L={key:nm,id:nm.replace(/ /g,'-').slice(0,90),name:cap1(ing.name),shop:ing.shop,tot:{},qb:false,uses:[]};lines.set(nm,L);}
      if(L.shop==='altro'&&ing.shop!=='altro')L.shop=ing.shop;
      const q=num(ing.qty),u=normUnit(ing.unit);
      if(u.base==='qb'||!q){L.qb=true;L.uses.push({r,txt:'q.b.'});continue;}
      const v=q*u.mult*f;
      L.tot[u.base]=(L.tot[u.base]||0)+v;
      L.uses.push({r,base:u.base,v});
    }
  }
  const out=[...lines.values()];
  for(const L of out){
    L.parts=Object.keys(L.tot).map(b=>({base:b,raw:L.tot[b],up:roundUp(b,L.tot[b])}));
    L.text=L.parts.map(p=>fmtQty(p.base,p.up)).join(' + ')+(L.qb?(L.parts.length?' + q.b.':'q.b.'):'');
    const sp=S.spesa[L.id]||{};L.sp=sp;
    if(sp.pack&&sp.pack.size>0){
      const part=L.parts.find(p=>p.base===sp.pack.base);
      if(part)L.packs=Math.ceil(part.raw/sp.pack.size-1e-9);
    }
  }
  out.sort((a,b)=>a.name.localeCompare(b.name,'it'));
  return out;
}
/* --- tabella di controllo (pivot): righe = voci della spesa, colonne = piatti in menu, celle = quantità del piatto già scalata ---
   Le celle sono esatte (nessun arrotondamento): la somma di una riga è il "raw" della voce, il totale della lista è lo stesso numero arrotondato per eccesso. */
const slotIdx=k=>SLOTS.findIndex(s=>s.key===k);
const fmtExact=(base,v)=>(base==='g'||base==='ml')&&v>=1000?fmtN(v/1000,3)+(base==='g'?' kg':' l'):fmtN(v,2)+' '+base;
const exactText=(tot,qb)=>{const a=Object.keys(tot).map(b=>fmtExact(b,tot[b]));if(qb)a.push('q.b.');return a.join(' + ');};
function pivotData(day,lines){
  const ls=lines||consolidate(day);
  const cols=slotted().filter(r=>!day||slotDay(r.slot)===day)
    .sort((a,b)=>slotIdx(a.slot)-slotIdx(b.slot)||catIdx(a.category)-catIdx(b.category)||byTitle(a,b))
    .map(r=>({r,f:scaleF(r)}));
  const rows=ls.map(L=>{
    const cells=new Map();
    for(const u of L.uses){
      let c=cells.get(u.r.id);if(!c){c={tot:{},qb:false};cells.set(u.r.id,c);}
      if(u.txt)c.qb=true;else c.tot[u.base]=(c.tot[u.base]||0)+u.v;
    }
    return{L,cells,exact:exactText(L.tot,L.qb)};
  });
  return{cols,rows};
}
/* CSV di controllo: tabella ingredienti × piatti (solo da scaricare, non è nella pagina). In cima, sotto i titoli, i dati di ogni piatto: pasto, persone della ricetta e fattore di scala, fonte. */
function pivotCsv(day){
  const {cols,rows}=pivotData(day),q=v=>'"'+String(v).replace(/"/g,'""')+'"';
  const src=r=>(r.verifica&&r.verifica.linkAutorevole)||r.link||'';
  const out=[['Negozio','Ingrediente',...cols.map(c=>c.r.title),'Totale da comprare','Somma esatta'],
    ['Dati del piatto','Pasto',...cols.map(c=>slotLabel(c.r.slot)),'',''],
    ['Dati del piatto','Ricetta per → fattore di scala',...cols.map(c=>'per '+(c.r.serves||4)+' → ×'+fmtN(c.f,3)+(c.r.porzione&&c.r.porzione!=='normale'?' ('+c.r.porzione+')':'')),'per '+nConf()+' persone',''],
    ['Dati del piatto','Fonte di riferimento',...cols.map(c=>src(c.r)),'','']];
  for(const s of SHOPS)for(const x of rows.filter(y=>y.L.shop===s.key))
    out.push([s.label,x.L.name,...cols.map(c=>{const v=x.cells.get(c.r.id);return v?exactText(v.tot,v.qb):'';}),x.L.text,x.exact]);
  return '\ufeff'+out.map(r=>r.map(q).join(';')).join('\r\n');
}
function usesText(L){
  return L.uses.map(u=>{
    const t=esc(u.r.title);
    return u.txt?`${t} (q.b.)`:`${t} (${esc(fmtQty(u.base,niceQty(u.base,u.v)))})`;
  }).join(' · ');
}
function groceryText(day){
  const ls=consolidate(day);
  const head=`LISTA SPESA GRAN BOUFFE ${S.settings.tema||''} — per ${nConf()} persone${day?' — '+DAYS.find(d=>d.key===day).label:''}`;
  const out=[head,''];
  for(const sh of SHOPS){
    const g=ls.filter(l=>l.shop===sh.key);if(!g.length)continue;
    out.push(sh.label.toUpperCase());
    for(const l of g){
      let t='- '+l.name+': '+l.text;
      if(l.packs)t+=` (${l.packs} conf. da ${fmtQty(l.sp.pack.base,l.sp.pack.size)})`;
      if(l.sp.chi&&P(l.sp.chi))t+=` [${P(l.sp.chi).name}]`;
      out.push(t);
    }
    out.push('');
  }
  return out.join('\n').trim();
}

/* --- votazioni --- */
const catRecipes=cat=>S.recipes.filter(r=>r.category===cat);
/* Voto a classifica con tetto: per ogni portata ognuno ordina al massimo le sue prime N proposte (le altre restano "fuori classifica").
   Punti: 1° posto = N+1, … ultimo posto classificabile = 2; fuori classifica = 0. È lo stesso ordine che si avrebbe dando -1 ai non classificati
   (la scala è solo spostata di 1, così non ci sono numeri negativi). A pari punti: più primi posti, poi più secondi posti, e così via. */
const RANK_CAP={antipasti:6,primi:6,secondi:6,contorni:4,dolci:6};
const rankCap=cat=>RANK_CAP[cat]||6;                                      // posizioni previste per la portata (fisso: servono ai punti)
const rankSlots=cat=>Math.min(rankCap(cat),catRecipes(cat).length);       // posizioni che si vedono ora (non più delle proposte)
const rankPts=(cat,pos)=>rankCap(cat)+2-pos;
const sameVotes=(a,b)=>a.pts===b.pts&&a.first.length===b.first.length&&a.first.every((f,i)=>f===b.first[i]);
const myRank=cat=>{const v=S.votes[S.meId];return v&&v.rank&&Array.isArray(v.rank[cat])?v.rank[cat]:null;};
/* Bozza della mia classifica: slots = una voce per posizione (id oppure null), pool = proposte fuori classifica */
function rankedDraft(cat){
  const all=catRecipes(cat),n=rankSlots(cat),ok=id=>!!(id&&R(id)&&R(id).category===cat);
  const saved=myRank(cat),v=S.votes[S.meId];
  let slots;
  if(UI.draft[cat])slots=UI.draft[cat].slice(0,n);
  else slots=(saved||[]).filter(ok).slice(0,n);                           // il voto salvato è una lista compatta; vecchie classifiche complete si troncano al tetto
  while(slots.length<n)slots.push(null);
  const seen=new Set();slots=slots.map(id=>{if(!ok(id)||seen.has(id))return null;seen.add(id);return id;});
  const at=(v&&v.rankAt&&v.rankAt[cat])||(v&&v.updatedAt)||0;
  const pool=all.filter(r=>!seen.has(r.id)).sort(byTitle);
  const filled=slots.filter(Boolean).length,last=slots.reduce((m,id,i)=>id?i:m,-1);
  return{slots,pool,n,filled,dirty:!!UI.draft[cat],saved:!!saved,stale:saved?saved.filter(id=>!ok(id)).length:0,
    gaps:slots.slice(0,last+1).some(x=>!x),
    fresh:saved?pool.filter(r=>(r.createdAt||0)>at).map(r=>r.id):[]};
}
/* Sposta un piatto alla posizione p (1..N) o fuori classifica (p=0). Se la posizione è occupata, chi c'era scende alla prima posizione libera sotto, altrimenti esce. */
function rankPlace(slots,id,p){
  slots=slots.map(x=>x===id?null:x);
  let moved=null;
  if(p>=1&&p<=slots.length){
    const occ=slots[p-1];slots[p-1]=id;
    if(occ){let j=p;while(j<slots.length&&slots[j])j++;
      if(j<slots.length){slots[j]=occ;moved={id:occ,pos:j+1};}else moved={id:occ,pos:0};}
  }
  return{slots,moved};
}
function voteStats(){
  const by={};CATS.forEach(c=>by[c.key]={m:new Map(),nv:0});
  for(const [pid,v] of Object.entries(S.votes)){
    if(!P(pid))continue;
    const rk=v.rank||{};
    for(const c of CATS){
      const cap=rankCap(c.key),seen=new Set();
      const list=(rk[c.key]||[]).filter(id=>R(id)&&R(id).category===c.key&&!seen.has(id)&&seen.add(id)).slice(0,cap);
      if(!list.length)continue;
      by[c.key].nv++;
      list.forEach((id,i)=>{
        const o=by[c.key].m.get(id)||{pts:0,n:0,first:new Array(cap).fill(0)};
        o.pts+=rankPts(c.key,i+1);o.n++;o.first[i]++;by[c.key].m.set(id,o);
      });
    }
  }
  const res={};
  for(const c of CATS){
    const cap=rankCap(c.key),nv=by[c.key].nv;
    res[c.key]=catRecipes(c.key).map(r=>{
      const o=by[c.key].m.get(r.id);
      const pct=o&&nv?100*o.pts/((cap+1)*nv):null;
      return{r,n:o?o.n:0,nv,pts:o?o.pts:0,first:o?o.first:new Array(cap).fill(0),pct,score:pct==null?null:Math.round(pct)};
    }).sort((a,b)=>{
      if((a.pct==null)!==(b.pct==null))return a.pct==null?1:-1;
      if(a.pts!==b.pts)return b.pts-a.pts;
      for(let i=0;i<a.first.length;i++)if(a.first[i]!==b.first[i])return b.first[i]-a.first[i];
      return byTitle(a.r,b.r);
    });
  }
  return res;
}
const voters=()=>S.participants.filter(p=>S.votes[p.id]&&Object.values(S.votes[p.id].rank||{}).some(l=>Array.isArray(l)&&l.length));
const myFmt=()=>{const v=S.votes[S.meId];return v&&FMT(v.formato)?v.formato:'';};

/* --- selezione automatica dai voti --- */
function quotas(total){ // solo le quattro portate che contano nel totale; i contorni sono extra
  const w={antipasti:4,primi:7,secondi:6,dolci:3};
  const sw=Object.values(w).reduce((a,b)=>a+b,0);
  const q={},rem=[];let used=0;
  for(const k in w){const x=w[k]*total/sw;q[k]=Math.floor(x);used+=q[k];rem.push([k,x-q[k]]);}
  rem.sort((a,b)=>b[1]-a[1]);
  for(let i=0;used<total;i++,used++)q[rem[i%rem.length][0]]++;
  return q;
}
const contorniExtra=total=>Math.max(1,Math.round(total*2/22)); // quanti contorni propone il suggerimento, in più rispetto al totale
const byScore=(a,b)=>((b.pct==null?-1:b.pct)-(a.pct==null?-1:a.pct))||byTitle(a.r,b.r);
function suggest(){
  const st=voteStats(),fm=fmtNow(),total=totalCap(),q=quotas(total);
  const chosen=[],left=[],cats4=CATS.filter(c=>c.key!=='contorni');
  if(fm.libero){ // nessuna quota per portata: i più votati in assoluto (contorni esclusi dal conteggio)
    const all=[].concat(...cats4.map(c=>st[c.key])).sort(byScore);
    all.slice(0,total).forEach(x=>chosen.push(x));
  }else{
    for(const c of cats4){
      const list=st[c.key],k=q[c.key]||0;
      list.slice(0,k).forEach(x=>chosen.push(x));
      list.slice(k).forEach(x=>left.push(x));
    }
    left.sort(byScore);
    while(chosen.length<total&&left.length)chosen.push(left.shift());
  }
  const extras=(st.contorni||[]).slice(0,contorniExtra(total)); // contorni in più, fuori dal conteggio
  const caps={ven:num(fm.cap.ven),sab:num(fm.cap.sab),dom:num(fm.cap.dom)};
  const cnt={ven:0,sab:0,dom:0},catCnt={ven:{},sab:{},dom:{}},slotCnt={};
  const out={};
  /* pasto con portate obbligatorie (venerdì della Bouffetta): prima una per portata, la meglio votata tra quelle che stanno nei tempi */
  const fixedIds=new Set(),venMissing=new Set();
  for(const [sk,cats] of Object.entries(fm.comp||{})){
    const day=slotDay(sk);
    for(const cat of cats){
      const pool=st[cat].filter(x=>!fixedIds.has(x.r.id)&&feasible(x.r,sk));
      const pick=pool.find(x=>chosen.includes(x))||pool[0];
      if(!pick){venMissing.add(cat);continue;}
      if(!chosen.includes(pick)){
        const same=chosen.filter(x=>x.r.category===cat&&!fixedIds.has(x.r.id)).pop()||chosen.filter(x=>!fixedIds.has(x.r.id)).pop();
        if(same&&chosen.length>=total)chosen.splice(chosen.indexOf(same),1);
        chosen.push(pick);
      }
      fixedIds.add(pick.r.id);out[pick.r.id]=sk;cnt[day]++;catCnt[day][cat]=(catCnt[day][cat]||0)+1;slotCnt[sk]=(slotCnt[sk]||0)+1;
    }
  }
  const comp=fm.comp&&fm.comp['ven-cena'];
  const arr=chosen.filter(x=>!fixedIds.has(x.r.id)).sort((a,b)=>lead(b.r)-lead(a.r)||(b.score||0)-(a.score||0));
  for(const x of arr){
    const r=x.r;
    let best=null,bs=-1e9;
    for(const d of DAYS){
      if(cnt[d.key]>=caps[d.key])continue;
      if(comp&&d.key==='ven'&&!venMissing.has(r.category))continue;
      if(!SLOTS.some(s=>s.day===d.key&&feasible(r,s.key)))continue;
      const sc=(caps[d.key]-cnt[d.key])/Math.max(1,caps[d.key])-0.25*(catCnt[d.key][r.category]||0);
      if(sc>bs){bs=sc;best=d.key;}
    }
    if(!best){
      const open=DAYS.filter(d=>cnt[d.key]<caps[d.key]);
      best=(open[open.length-1]||DAYS[2]).key;
    }
    const opts=SLOTS.filter(s=>s.day===best);
    const feas=opts.filter(s=>feasible(r,s.key));
    const pool=feas.length?feas:opts;
    pool.sort((a,b)=>(slotCnt[a.key]||0)-(slotCnt[b.key]||0));
    out[r.id]=pool[0].key;
    cnt[best]++;catCnt[best][r.category]=(catCnt[best][r.category]||0)+1;slotCnt[pool[0].key]=(slotCnt[pool[0].key]||0)+1;
  }
  /* contorni: sul pasto con più secondi (dove servono), mai su un pasto a portate fisse, senza toccare i contatori */
  const per={};for(const [id,sk] of Object.entries(out)){const c=(R(id)||{}).category;per[sk]=per[sk]||{};per[sk][c]=(per[sk][c]||0)+1;}
  for(const x of extras){
    const r=x.r,free=SLOTS.filter(sl=>!(fm.comp&&fm.comp[sl.key]));
    const cand=(free.filter(sl=>feasible(r,sl.key)).length?free.filter(sl=>feasible(r,sl.key)):free);
    cand.sort((a,b)=>((per[b.key]||{}).secondi||0)*2+Object.values(per[b.key]||{}).reduce((p,v)=>p+v,0)*.1-((per[b.key]||{}).contorni||0)*3
      -(((per[a.key]||{}).secondi||0)*2+Object.values(per[a.key]||{}).reduce((p,v)=>p+v,0)*.1-((per[a.key]||{}).contorni||0)*3));
    const sk=(cand[0]||SLOTS[SLOTS.length-1]).key;
    out[r.id]=sk;per[sk]=per[sk]||{};per[sk].contorni=(per[sk].contorni||0)+1;
  }
  return out;
}

/* --- cronoprogramma --- */
function timeline(){
  const items=[];
  const arrive=hm(S.settings.arrivo);
  items.push({t:arrive,kind:'meal',what:'Arrivo e sistemazione',who:''});
  for(const s of SLOTS){
    const rs=slotted().filter(r=>r.slot===s.key);
    if(!rs.length)continue;
    items.push({t:slotAbs(s.key),kind:'meal',what:s.label+' — a tavola ('+rs.length+' piatt'+(rs.length===1?'o':'i')+')'});
  }
  for(const f of PROG_FISSO)items.push({t:f.day*24+hm(f.da),kind:'fix',what:f.what,fine:f.a});
  for(const r of slotted()){
    const sa=slotAbs(r.slot);
    for(const f of (r.fasi||[])){
      const t=sa-num(f.ore);
      items.push({t,kind:t<arrive?'pre':'fase',what:f.label,r,ore:num(f.ore)});
    }
  }
  items.sort((a,b)=>a.t-b.t||(a.kind==='meal'?1:-1));
  return items;
}

/* --- suggerimenti: collegamento con le proposte e piatti simili --- */
function sugRecipe(s){
  return S.recipes.find(r=>r.sugId===s.id)||S.recipes.find(r=>{const t=norm(r.title);return s.k.some(k=>t.indexOf(k)>=0);})||null;
}
const sugState=s=>{const r=sugRecipe(s);return r?(r.slot?'menu':'proposta'):'libera';};
/* nei Suggerimenti restano solo i piatti non ancora proposti */
const sugLibere=()=>SUG.filter(s=>sugState(s)==='libera');
const sugFor=r=>(r.sugId&&sugById(r.sugId))||SUG.find(s=>s.k.some(k=>norm(r.title).indexOf(k)>=0))||null;
const famMates=s=>s.f?SUG.filter(x=>x.f===s.f&&x.id!==s.id):[];
function famDupes(){
  const m={};
  for(const r of slotted()){const s=sugFor(r);if(s&&s.f)(m[s.f]=m[s.f]||[]).push(r);}
  return Object.keys(m).filter(f=>m[f].length>1).map(f=>[f,m[f]]);
}
function sugPre(s){
  const src=(s.src&&s.src[0])||{};
  return{sugId:s.id,title:s.t,category:s.c,region:s.r,link:src.u||'',
    vini:s.v?[{nome:s.v,bottiglie:0}]:[],fasi:(s.fasi||[]).map(f=>({label:f.label,ore:f.ore})),
    verStato:s.weak?'da_sostituire':'da_verificare',verNota:s.weak||'',foto:SUG_FOTO[s.id]?Object.assign({},SUG_FOTO[s.id]):null};
}
