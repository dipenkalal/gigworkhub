"use strict";
const links=Array.from(document.querySelectorAll('[data-phase]'));
const panels=Array.from(document.querySelectorAll('.phase-panel'));
function selectPhase(){let id=location.hash.slice(1);if(!panels.some(p=>p.id===id))id='phase-06';panels.forEach(p=>{p.hidden=p.id!==id;});links.forEach(a=>{if(a.dataset.phase===id)a.setAttribute('aria-current','step');else a.removeAttribute('aria-current');});}
links.forEach(a=>a.addEventListener('click',event=>{event.preventDefault();history.pushState(null,'',a.getAttribute('href'));selectPhase();}));
window.addEventListener('hashchange',selectPhase);window.addEventListener('popstate',selectPhase);selectPhase();

const background=document.querySelector('.background');
const closeBackground=document.querySelector('.close-background');
closeBackground.addEventListener('click',()=>{background.open=false;const summary=background.querySelector('summary');summary.focus({preventScroll:true});summary.scrollIntoView({block:'nearest',behavior:'auto'});});

// Move visitors from hero links to the selected case study.
document.querySelectorAll('.hero-actions a, .featured').forEach(a=>a.addEventListener('click',event=>{event.preventDefault();history.pushState(null,'',a.hash);selectPhase();document.querySelector('#work').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}));
