/* ============ banda in alto: scadenze con countdown e voto sul formato del menu ============ */
/* Tre tappe: proposte (+ voto sul formato) fino alla scadenza, voto dei piatti per 24 ore, poi menu e spesa. */
function vSteps(sg){
  const pf=scadMs('propFine'),vi=scadMs('votoIni'),vf=scadMs('votoFine'),auto=scadOn();
  const cls=i=>{
    const cur={proposte:0,attesa:0,voto:1,menu:2,cucina:2}[sg];
    if(sg==='attesa')return i===0?'done':i===1?'next':'';
    return i<cur?'done':i===cur?'now':'';
  };
  const items=[
    ['Proposte e voto sul formato',auto?'fino a '+fmtDay(pf)+', ore '+fmtHour(pf):'chiude l’organizzatore'],
    ['Voto sui piatti',auto?fmtDay(vi)+', da '+fmtHour(vi)+' a '+(fmtHour(vf)==='00:00'?'mezzanotte':fmtHour(vf)):'quando lo apre l’organizzatore'],
    ['Menu, spesa, cucina','dopo il voto']
  ];
  return `<ol class="steps3">${items.map((x,i)=>`<li class="${cls(i)}"><b>${x[0]}</b><span>${esc(x[1])}</span></li>`).join('')}</ol>`;
}
function vCountdown(){
  const sg=stage(),auto=scadOn();
  let title,sub,target=0;
  if(sg==='proposte'){title='Proposte e voto sul formato aperti';sub='Chiudono '+fmtDT(scadMs('propFine'));target=auto?scadMs('propFine'):0;}
  else if(sg==='attesa'){title='Proposte chiuse';sub='Il voto sui piatti apre '+fmtDT(scadMs('votoIni'));target=scadMs('votoIni');}
  else if(sg==='voto'){title='Voto sui piatti aperto';sub='Chiude '+fmtEnd(scadMs('votoFine'));target=auto?scadMs('votoFine'):0;}
  else{title='Votazioni chiuse';sub='Il menu è in definizione';}
  if(!auto&&sg==='proposte')sub='Le fasi le decide l’organizzatore';
  if(!auto&&sg==='voto')sub='Le fasi le decide l’organizzatore';
  return `<div class="cd"><div class="cd-t"><b>${esc(title)}</b><span class="small">${esc(sub)}</span></div>
    ${target?`<div class="cd-n" role="timer" aria-label="Tempo rimasto"><span class="lbl">mancano</span><span class="num" data-cd="${target}">${fmtCd(target-nowMs())}</span></div>`:''}</div>`;
}
/* Il voto sul formato: tre opzioni accanto, con voti in tempo reale. Ridotto a una riga una volta votato. */
const fmtExpanded=()=>UI.fmtX!=null?UI.fmtX:(fmtOpen()&&!myFmt());
function vFormato(){
  const open=fmtOpen(),mine=myFmt(),t=fmtVotes(),nv=Object.values(t).reduce((a,l)=>a+l.length,0),eff=fmtEff(),en=FMT(eff.key);
  const how={fissato:'scelto dall’organizzatore',voto:'deciso dal voto',provvisorio:'provvisorio: decide il voto alla chiusura'}[eff.how];
  const expanded=fmtExpanded();
  const summary=`<div class="fm-sum"><span>${mine?`Hai scelto <b>${esc(FMT(mine).nome)}</b> (${FMT(mine).tot} piatti). `:(open?'<b>Non hai ancora votato il formato.</b> ':'')}In uso per il menu: <b>${esc(en.nome)}</b>, ${en.tot} piatti <span class="muted">(${esc(how)})</span>.</span>
    <button class="btn sm" data-act="fmt-x" aria-expanded="${expanded}">${expanded?'Chiudi':(open?(mine?'Cambia voto':'Vota ora'):'Vedi risultati')}</button></div>`;
  if(!expanded)return `<div class="fm">${summary}</div>`;
  const cards=FORMATI.map(f=>{
    const n=t[f.key].length,pct=nv?Math.round(n/nv*100):0,on=mine===f.key;
    return `<button class="fmo ${on?'on':''}" data-act="vote-fmt" data-v="${f.key}" aria-pressed="${on}" ${open?'':'disabled'}>
      <span class="fmo-h"><span class="fmo-n">${esc(f.nome)}</span><span class="fmo-t num"><b>${f.tot}</b> piatti</span></span>
      <ul class="fmo-l">${f.righe.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
      <span class="fmo-b"><span class="bar"><i style="width:${pct}%"></i></span><span class="small num"><b>${n}</b> vot${n===1?'o':'i'}</span></span>
      <span class="fmo-go">${on?'✓ Il tuo voto':(open?'Voto questo':'')}</span></button>`;
  }).join('');
  const org=isOrg()?`<div class="row" style="gap:8px"><label class="small" for="fx-set">Formato in uso (organizzatore)</label>
    <select id="fx-set" data-chg="setfmt" style="width:auto"><option value="">Decide il voto</option>${FORMATI.map(f=>`<option value="${f.key}" ${S.settings.formato===f.key?'selected':''}>${esc(f.nome)} · ${f.tot}</option>`).join('')}</select></div>`:'';
  return `<div class="fm open">${summary}
    <div class="fmgrid" role="group" aria-label="Formato del menu">${cards}</div>
    <p class="small muted">${open?'Un voto a testa, modificabile fino alla chiusura delle proposte.':'Il voto è chiuso.'} Hanno votato <b class="num">${nv}</b> su <b class="num">${S.participants.length}</b>. A parità vince il formato più abbondante.</p>${org}</div>`;
}
function vBand(){
  const sg=stage();
  return `<section class="wrap band" aria-label="Scadenze e formato del menu">${vCountdown()}${vSteps(sg)}<div class="fm-wrap"><h3>Quanti piatti prepariamo?</h3>${vFormato()}</div></section>`;
}
A['fmt-x']=()=>{UI.fmtX=!fmtExpanded();render();};
A['vote-fmt']=async t=>{
  if(!S.meId)return;
  if(!fmtOpen()){toast('Il voto sul formato è chiuso.','err');return;}
  const k=t.dataset.v;if(!FMT(k))return;
  const ex=S.votes[S.meId];
  const ok=ex?await write('update','votes/'+S.meId,{formato:k,updatedAt:Date.now()}):await write('set','votes/'+S.meId,{formato:k,rank:{},updatedAt:Date.now()});
  if(ok){UI.fmtX=false;toast('Voto registrato: '+FMT(k).nome+' ('+FMT(k).tot+' piatti)');}
  render();
};
CH.setfmt=async t=>{if(isOrg()&&await saveSettings({formato:t.value}))toast(t.value?'Formato fissato: '+FMT(t.value).nome:'Il formato lo decide il voto');};
