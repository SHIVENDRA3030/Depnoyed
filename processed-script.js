
// ===== NOISE (static tile) =====
(function(){
  const c=document.getElementById('noise'),x=c.getContext('2d'),s=128;
  c.width=s;c.height=s;
  const img=x.createImageData(s,s),d=img.data;
  for(let i=0;i<d.length;i+=4){const v=Math.random()*255;d[i]=d[i+1]=d[i+2]=v;d[i+3]=255;}
  x.putImageData(img,0,0);
  c.style.width='100%';c.style.height='100%';
})();

const R=window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ===== GSAP + LENIS =====
gsap.registerPlugin(ScrollTrigger);
const lenis=new Lenis({duration:R?0:1.3,easing:t=>Math.min(1,1.001-Math.pow(2,-10*t)),smoothWheel:!R,wheelMultiplier:1,touchMultiplier:2});
lenis.on('scroll',ScrollTrigger.update);
gsap.ticker.add(t=>{lenis.raf(t*1000)});
gsap.ticker.lagSmoothing(0);

// ===== CURSOR =====
const cd=document.getElementById('cd'),cr=document.getElementById('cr');
let cmx=-100,cmy=-100,crx=-100,cry=-100,cok=false;
document.addEventListener('mousemove',e=>{
  cmx=e.clientX;cmy=e.clientY;
  if(!cok){cok=true;cd.classList.add('on');cr.classList.add('on');gsap.set(cd,{x:cmx,y:cmy});gsap.set(cr,{x:cmx,y:cmy});}
  gsap.to(cd,{x:cmx,y:cmy,duration:.1,ease:'power2.out'});
});
gsap.ticker.add(()=>{if(!cok)return;crx+=(cmx-crx)*.1;cry+=(cmy-cry)*.1;gsap.set(cr,{x:crx,y:cry});});
document.querySelectorAll('a,button,[data-m],.exp-item,.flow-step,.engine-feat,.problem-diagram .node').forEach(el=>{
  el.addEventListener('mouseenter',()=>{cd.classList.add('hov');cr.classList.add('hov');});
  el.addEventListener('mouseleave',()=>{cd.classList.remove('hov');cr.classList.remove('hov');});
});

// ===== MAGNETIC =====
document.querySelectorAll('[data-m]').forEach(el=>{
  el.addEventListener('mousemove',e=>{const r=el.getBoundingClientRect();gsap.to(el,{x:(e.clientX-r.left-r.width/2)*.2,y:(e.clientY-r.top-r.height/2)*.2,duration:.35,ease:'power2.out'});});
  el.addEventListener('mouseleave',()=>{gsap.to(el,{x:0,y:0,duration:.6,ease:'elastic.out(1,0.4)'});});
});

// ===== PARTICLE NETWORK (HERO) =====
(function(){
  const c=document.getElementById('heroCanvas'),x=c.getContext('2d');
  let w,h,nodes=[],mouse={x:-1000,y:-1000};
  function resize(){w=c.width=c.offsetWidth;h=c.height=c.offsetHeight;}
  resize();window.addEventListener('resize',resize);

  // Generate nodes
  const count=R?30:60;
  for(let i=0;i<count;i++){
    nodes.push({x:Math.random()*w,y:Math.random()*h,vx:(Math.random()-.5)*.3,vy:(Math.random()-.5)*.3,r:Math.random()*1.5+.5});
  }

  c.parentElement.addEventListener('mousemove',e=>{const r=c.getBoundingClientRect();mouse.x=e.clientX-r.left;mouse.y=e.clientY-r.top;});
  c.parentElement.addEventListener('mouseleave',()=>{mouse.x=-1000;mouse.y=-1000;});

  function draw(){
    x.clearRect(0,0,w,h);
    // Update nodes
    nodes.forEach(n=>{
      n.x+=n.vx;n.y+=n.vy;
      if(n.x<0||n.x>w)n.vx*=-1;
      if(n.y<0||n.y>h)n.vy*=-1;
      // Mouse repel
      const dx=n.x-mouse.x,dy=n.y-mouse.y,dist=Math.sqrt(dx*dx+dy*dy);
      if(dist<150){const f=(150-dist)/150*.8;n.x+=dx/dist*f;n.y+=dy/dist*f;}
      // Draw node
      x.beginPath();x.arc(n.x,n.y,n.r,0,Math.PI*2);x.fillStyle='rgba(255,176,0,.15)';x.fill();
    });
    // Draw connections
    for(let i=0;i<nodes.length;i++){
      for(let j=i+1;j<nodes.length;j++){
        const dx=nodes[i].x-nodes[j].x,dy=nodes[i].y-nodes[j].y,dist=Math.sqrt(dx*dx+dy*dy);
        if(dist<120){
          x.beginPath();x.moveTo(nodes[i].x,nodes[i].y);x.lineTo(nodes[j].x,nodes[j].y);
          x.strokeStyle=`rgba(255,176,0,${.06*(1-dist/120)})`;x.lineWidth=.5;x.stroke();
        }
      }
    }
    if(!R)requestAnimationFrame(draw);
  }
  draw();
})();

// ===== PRELOADER =====
(function(){
  const n=document.getElementById('preN'),bar=document.getElementById('preBar'),pre=document.getElementById('pre');
  const obj={val:0};const dur=R?.1:2.8;

  // Fade in counter
  gsap.to(n,{opacity:1,duration:.5});

  gsap.to(obj,{val:100,duration:dur,ease:'power2.inOut',onUpdate:()=>{n.textContent=String(Math.floor(obj.val)).padStart(2,'0');}});
  gsap.to(bar,{width:'100%',duration:dur,ease:'power2.inOut'});
  gsap.to(pre,{yPercent:-100,duration:R?.01:1,ease:'power4.inOut',delay:dur+.3,onComplete:()=>{
    pre.style.display='none';
    initAll();
  }});
})();

function initAll(){
  initHero();initProblem();initShift();initSystem();initEngine();initExp();initScale();initFuture();initNav();
  ScrollTrigger.refresh();
}

// ===== HERO =====
function initHero(){
  const chars=document.querySelectorAll('.hero-title .ch');
  const bar=document.querySelector('.accent-bar');

  if(R){
    gsap.set('.hero-label',{opacity:1});gsap.set(chars,{opacity:1});gsap.set('.hero-desc',{opacity:1});gsap.set('.hero-acts',{opacity:1});
    if(bar)bar.classList.add('on');gsap.set('#scrollLine',{opacity:1});return;
  }

  gsap.set(chars,{y:120,opacity:0,rotateX:-45});
  const tl=gsap.timeline({delay:.1});
  tl.to('.hero-label',{opacity:1,y:0,duration:.7,ease:'power3.out'})
    .to(chars,{y:0,opacity:1,rotateX:0,duration:1,ease:'power4.out',stagger:.02},'-=.4')
    .to('.hero-desc',{opacity:1,y:0,duration:.7,ease:'power3.out'},'-=.5')
    .to('.hero-acts',{opacity:1,y:0,duration:.7,ease:'power3.out'},'-=.5')
    .to('#scrollLine',{opacity:1,duration:.8},'-=.3')
    .call(()=>{if(bar)bar.classList.add('on');},null,'-=0.4');
}

// ===== PROBLEM =====
function initProblem(){
  gsap.from('.problem-head',{opacity:0,y:50,duration:1,ease:'power3.out',scrollTrigger:{trigger:'.problem-head',start:'top 75%'}});
  gsap.from('.problem-text p',{opacity:0,y:30,duration:.8,stagger:.15,ease:'power3.out',scrollTrigger:{trigger:'.problem-text',start:'top 75%'}});
  gsap.from('.problem-diagram .node',{opacity:0,x:-20,duration:.6,stagger:.1,ease:'power3.out',scrollTrigger:{trigger:'.problem-diagram',start:'top 75%'}});
}

// ===== SHIFT (STICKY STORYTELLING) =====
function initShift(){
  const words=document.querySelectorAll('.shift-word');
  const texts=document.querySelectorAll('.shift-right-text p');
  const totalSteps=4;

  ScrollTrigger.create({
    trigger:'#shiftSticky',start:'top top',end:'bottom bottom',
    onUpdate:self=>{
      const p=self.progress;
      const step=Math.min(totalSteps-1,Math.floor(p*totalSteps));
      words.forEach((w,i)=>{w.classList.toggle('active',i===step);});
      texts.forEach((t,i)=>{t.classList.toggle('on',i===step);});
    }
  });
}

// ===== SYSTEM =====
function initSystem(){
  gsap.from('.system-title',{opacity:0,y:60,duration:1,ease:'power3.out',scrollTrigger:{trigger:'.system-title',start:'top 75%'}});
  document.querySelectorAll('.flow-step').forEach((s,i)=>{
    gsap.from(s,{opacity:0,y:60,duration:.8,delay:i*.15,ease:'power3.out',scrollTrigger:{trigger:s,start:'top 82%'}});
  });
}

// ===== ENGINE =====
function initEngine(){
  // Code lines reveal
  const lines=document.querySelectorAll('#engineCode .ln');
  const codeObs=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        lines.forEach((l,i)=>{setTimeout(()=>l.classList.add('vis'),i*60);});
        codeObs.unobserve(entry.target);
      }
    });
  },{threshold:.3});
  codeObs.observe(document.getElementById('engineCode'));

  gsap.from('.engine-feat',{opacity:0,x:30,duration:.7,stagger:.12,ease:'power3.out',scrollTrigger:{trigger:'.engine-feats',start:'top 75%'}});
}

// ===== EXPERIENCE =====
function initExp(){
  gsap.from('.exp-head',{opacity:0,y:60,duration:1,ease:'power3.out',scrollTrigger:{trigger:'.exp-head',start:'top 75%'}});
  document.querySelectorAll('.exp-item').forEach((item,i)=>{
    gsap.from(item,{opacity:0,y:80,scale:.97,duration:1,delay:i*.1,ease:'power3.out',scrollTrigger:{trigger:item,start:'top 85%'}});
    gsap.to(item.querySelector('img'),{y:-40,scrollTrigger:{trigger:item,start:'top bottom',end:'bottom top',scrub:1}});
  });
}

// ===== SCALE =====
function initScale(){
  gsap.from('.scale-title',{opacity:0,y:40,duration:1,ease:'power3.out',scrollTrigger:{trigger:'.scale-title',start:'top 75%'}});
  document.querySelectorAll('.counter').forEach(c=>{
    const t=parseFloat(c.dataset.target),dec=parseInt(c.dataset.dec||'0');
    ScrollTrigger.create({trigger:c,start:'top 85%',once:true,onEnter:()=>{
      const o={v:0};
      gsap.to(o,{v:t,duration:2.2,ease:'power2.out',onUpdate:()=>{c.textContent=dec?o.v.toFixed(dec):Math.floor(o.v);}});
    }});
  });
}

// ===== FUTURE =====
function initFuture(){
  gsap.fromTo('#futureBg',{x:'-10%'},{x:'10%',scrollTrigger:{trigger:'.s-future',start:'top bottom',end:'bottom top',scrub:1}});
  gsap.from('.future-title',{opacity:0,y:60,duration:1.2,ease:'power3.out',scrollTrigger:{trigger:'.future-title',start:'top 75%'}});
  gsap.from('.future-desc',{opacity:0,y:30,duration:.8,ease:'power3.out',scrollTrigger:{trigger:'.future-desc',start:'top 80%'}});
  gsap.from('.s-future .btn-p',{opacity:0,y:30,duration:.8,ease:'power3.out',scrollTrigger:{trigger:'.s-future .btn-p',start:'top 85%'}});
}

// ===== NAV =====
function initNav(){
  ScrollTrigger.create({start:'top -80',end:99999,onUpdate:self=>{
    if(self.direction===1&&self.scroll()>200){gsap.to('#nav',{y:-100,duration:.4,ease:'power3.in'});}
    else{gsap.to('#nav',{y:0,duration:.4,ease:'power3.out'});}
  }});
}

// ===== SMOOTH SCROLL =====
document.querySelectorAll('a[href^="#"]').forEach(l=>{
  l.addEventListener('click',e=>{e.preventDefault();const t=document.querySelector(l.getAttribute('href'));if(t)lenis.scrollTo(t,{offset:-80});});
});
