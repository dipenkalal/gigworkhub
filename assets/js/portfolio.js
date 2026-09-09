"use strict";
const links=Array.from(document.querySelectorAll('[data-phase]'));
const panels=Array.from(document.querySelectorAll('.phase-panel'));
function selectPhase(){let id=location.hash.slice(1);if(!panels.some(p=>p.id===id))id='phase-06';panels.forEach(p=>{p.hidden=p.id!==id;});links.forEach(a=>{if(a.dataset.phase===id)a.setAttribute('aria-current','step');else a.removeAttribute('aria-current');});}
links.forEach(a=>a.addEventListener('click',event=>{event.preventDefault();history.pushState(null,'',a.getAttribute('href'));selectPhase();}));
window.addEventListener('hashchange',selectPhase);window.addEventListener('popstate',selectPhase);selectPhase();

// Move visitors from hero links to the selected case study.
document.querySelectorAll('.hero-actions a, .featured').forEach(a=>a.addEventListener('click',event=>{event.preventDefault();history.pushState(null,'',a.hash);selectPhase();document.querySelector('#work').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}));

const previous=document.querySelector('#previous-phase');
const next=document.querySelector('#next-phase');
function syncJourney(){const index=panels.findIndex(p=>!p.hidden);document.querySelector('#phase-status').textContent=`Phase ${index+1} of ${panels.length}`;previous.disabled=index===0;next.disabled=index===panels.length-1;}
function movePhase(direction){const index=panels.findIndex(p=>!p.hidden);const target=panels[index+direction];if(!target)return;history.pushState(null,'','#'+target.id);selectPhase();syncJourney();}
previous.addEventListener('click',()=>movePhase(-1));next.addEventListener('click',()=>movePhase(1));
links.forEach(a=>a.addEventListener('click',syncJourney));
document.querySelectorAll('.hero-actions a,.featured').forEach(a=>a.addEventListener('click',syncJourney));
window.addEventListener('hashchange',syncJourney);window.addEventListener('popstate',syncJourney);syncJourney();
const motion=matchMedia('(prefers-reduced-motion: reduce)');
if(!motion.matches && 'IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target);}}),{threshold:0.08});document.querySelectorAll('.reveal').forEach(el=>{el.classList.add('will-reveal');observer.observe(el);});}
const progress=document.querySelector('.reading-progress');
function updateProgress(){const height=document.documentElement.scrollHeight-innerHeight;progress.style.width=(height>0?scrollY/height*100:0)+'%';}
window.addEventListener('scroll',updateProgress,{passive:true});window.addEventListener('resize',updateProgress);updateProgress();
document.querySelector('#copy-email').addEventListener('click',async()=>{const status=document.querySelector('#copy-status');try{await navigator.clipboard.writeText('dipen55945@gmail.com');status.textContent='Email copied';}catch{status.textContent='Select and copy the email address above.';}});
