/* ============ logica: tempi, votazioni, selezione, spesa ============ */
const slotDef=k=>SLOTS.find(s=>s.key===k);
const slotDay=k=>(slotDef(k)||{}).day||'';
const slotLabel=k=>(slotDef(k)||{}).label||'';
const totalCap=()=>{const c=S.settings.cap;return num(c.ven)+num(c.sab)+num(c.dom);};
const slotted=()=>S.recipes.filter(r=>r.slot&&slotDef(r.slot));

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
const myRank=cat=>{const v=S.votes[S.meId];return v&&v.rank&&Array.isArray(v.rank[cat])?v.rank[cat]:null;};
function rankedDraft(cat){
  const all=catRecipes(cat);
  if(UI.draft[cat]){
    const ids=UI.draft[cat].filter(id=>R(id)&&R(id).category===cat);
    const missing=all.filter(r=>!ids.includes(r.id)).sort(byTitle).map(r=>r.id);
    return{ids:[...ids,...missing],dirty:true,fresh:[...missing],saved:!!myRank(cat)};
  }
  const saved=(myRank(cat)||[]).filter(id=>R(id)&&R(id).category===cat);
  const missing=all.filter(r=>!saved.includes(r.id)).sort(byTitle).map(r=>r.id);
  return{ids:[...saved,...missing],dirty:false,fresh:saved.length?missing:[],saved:!!myRank(cat)};
}
function voteStats(){
  const by={};CATS.forEach(c=>by[c.key]=new Map());
  for(const [pid,v] of Object.entries(S.votes)){
    if(!P(pid))continue;
    const rk=v.rank||{};
    for(const c of CATS){
      const list=(rk[c.key]||[]).filter(id=>R(id)&&R(id).category===c.key);
      const n=list.length;if(!n)continue;
      list.forEach((id,i)=>{
        const o=by[c.key].get(id)||{sumPos:0,sumNorm:0,n:0};
        o.sumPos+=i+1;o.sumNorm+=n>1?i/(n-1):0;o.n++;by[c.key].set(id,o);
      });
    }
  }
  const res={};
  for(const c of CATS){
    res[c.key]=catRecipes(c.key).map(r=>{
      const o=by[c.key].get(r.id);
      return{r,n:o?o.n:0,avg:o?o.sumPos/o.n:null,score:o?Math.round(100*(1-o.sumNorm/o.n)):null};
    }).sort((a,b)=>{
      if((a.score==null)!==(b.score==null))return a.score==null?1:-1;
      if(a.score!==b.score)return (b.score||0)-(a.score||0);
      if(a.n!==b.n)return b.n-a.n;
      return byTitle(a.r,b.r);
    });
  }
  return res;
}
const voters=()=>S.participants.filter(p=>S.votes[p.id]&&Object.values(S.votes[p.id].rank||{}).some(l=>Array.isArray(l)&&l.length));

/* --- selezione automatica dai voti --- */
function quotas(total){
  const w={antipasti:4,primi:7,secondi:6,contorni:2,dolci:3};
  const sw=Object.values(w).reduce((a,b)=>a+b,0);
  const q={},rem=[];let used=0;
  for(const k in w){const x=w[k]*total/sw;q[k]=Math.floor(x);used+=q[k];rem.push([k,x-q[k]]);}
  rem.sort((a,b)=>b[1]-a[1]);
  for(let i=0;used<total;i++,used++)q[rem[i%rem.length][0]]++;
  return q;
}
function suggest(){
  const st=voteStats(),total=totalCap(),q=quotas(total);
  const chosen=[],left=[];
  for(const c of CATS){
    const list=st[c.key],k=q[c.key]||0;
    list.slice(0,k).forEach(x=>chosen.push(x));
    list.slice(k).forEach(x=>left.push(x));
  }
  left.sort((a,b)=>((b.score==null?-1:b.score)-(a.score==null?-1:a.score))||byTitle(a.r,b.r));
  while(chosen.length<total&&left.length)chosen.push(left.shift());
  const caps={ven:num(S.settings.cap.ven),sab:num(S.settings.cap.sab),dom:num(S.settings.cap.dom)};
  const cnt={ven:0,sab:0,dom:0},catCnt={ven:{},sab:{},dom:{}},slotCnt={};
  const out={};
  const arr=[...chosen].sort((a,b)=>lead(b.r)-lead(a.r)||(b.score||0)-(a.score||0));
  for(const x of arr){
    const r=x.r;
    let best=null,bs=-1e9;
    for(const d of DAYS){
      if(cnt[d.key]>=caps[d.key])continue;
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
    verStato:s.weak?'da_sostituire':'da_verificare',verNota:s.weak||''};
}
