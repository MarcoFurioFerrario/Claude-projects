/* ============ trascinamento dei piatti nella classifica (mouse e dito, Pointer Events) ============
   Si parte solo dalla maniglia ⠿ (touch-action: none lì), così il resto della riga scorre normalmente sul telefono.
   Durante il trascinamento la pagina non viene ridisegnata (render() aspetta la fine); al rilascio vale la stessa regola del numero scelto a mano. */
(function(){
  let d=null;
  const target=(x,y)=>{
    const e=document.elementFromPoint(x,y);if(!e)return null;
    const s=e.closest('[data-slot]');if(s)return{k:'slot',i:+s.dataset.slot,el:s};
    const p=e.closest('[data-drop="pool"]');return p?{k:'pool',el:p}:null;
  };
  const mark=t=>{
    if(d.hot&&(!t||d.hot.el!==t.el))d.hot.el.classList.remove('over');
    if(t&&(!d.hot||d.hot.el!==t.el))t.el.classList.add('over');
    d.hot=t;
  };
  function move(e){
    if(!d||e.pointerId!==d.pid)return;
    d.x=e.clientX;d.y=e.clientY;
    d.ghost.style.left=(d.x-d.dx)+'px';d.ghost.style.top=(d.y-d.dy)+'px';
    mark(target(d.x,d.y));
  }
  function tick(){
    if(!d)return;
    const m=70,h=window.innerHeight;
    if(d.y<m)window.scrollBy(0,-Math.ceil((m-d.y)/5));else if(d.y>h-m)window.scrollBy(0,Math.ceil((d.y-(h-m))/5));
    mark(target(d.x,d.y));
    d.raf=requestAnimationFrame(tick);
  }
  function end(e,drop){
    if(!d||(e&&e.pointerId!==d.pid))return;
    const x=d;d=null;
    cancelAnimationFrame(x.raf);
    window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',cancel);
    x.ghost.remove();x.row.classList.remove('lifted');if(x.hot)x.hot.el.classList.remove('over');
    document.body.classList.remove('dragging');UI.dragging=false;
    const t=drop?target(e.clientX,e.clientY):null;
    if(t)rankSet(UI.vcat,x.id,t.k==='slot'?t.i+1:0);
    else if(UI.dragPending){UI.dragPending=false;render();}
    UI.dragPending=false;
  }
  const up=e=>end(e,true),cancel=e=>end(e,false);
  document.addEventListener('pointerdown',e=>{
    const g=e.target.closest&&e.target.closest('.grip');
    if(!g||g.disabled||(e.pointerType==='mouse'&&e.button!==0)||d)return;
    const row=g.closest('[data-dish]');if(!row||!canVote())return;
    e.preventDefault();
    const r=row.getBoundingClientRect(),ghost=row.cloneNode(true);
    ghost.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));
    ghost.classList.add('ghost');
    ghost.style.cssText=`position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;pointer-events:none;z-index:300`;
    document.body.appendChild(ghost);row.classList.add('lifted');document.body.classList.add('dragging');
    d={id:row.dataset.dish,ghost,row,dx:e.clientX-r.left,dy:e.clientY-r.top,pid:e.pointerId,hot:null,x:e.clientX,y:e.clientY,raf:0};
    UI.dragging=true;
    try{g.setPointerCapture(e.pointerId);}catch(_){}
    window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);window.addEventListener('pointercancel',cancel);
    d.raf=requestAnimationFrame(tick);
  });
})();
