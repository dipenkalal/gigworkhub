'use strict';
const links = [...document.querySelectorAll('[data-phase]')];
const panels = [...document.querySelectorAll('.phase-panel')];
const previous = document.querySelector('#previous-phase');
const next = document.querySelector('#next-phase');
const phaseStatus = document.querySelector('#phase-status');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
let selected = 'phase-06';
function updateProgress() {
  const height = document.documentElement.scrollHeight - innerHeight;
  document.querySelector('.reading-progress').style.width = `${height > 0 ? Math.min(100, scrollY / height * 100) : 0}%`;
}
function selectPhase() {
  const requested = location.hash.slice(1);
  if (panels.some(panel => panel.id === requested)) selected = requested;
  panels.forEach(panel => { panel.hidden = panel.id !== selected; });
  links.forEach(link => {
    if (link.dataset.phase === selected) link.setAttribute('aria-current', 'step');
    else link.removeAttribute('aria-current');
  });
  const index = panels.findIndex(panel => panel.id === selected);
  previous.disabled = index === 0;
  next.disabled = index === panels.length - 1;
  phaseStatus.textContent = `Phase ${index + 1} of ${panels.length}`;
  updateProgress();
}
function navigatePhase(id, focusHeading = false) {
  if (!panels.some(panel => panel.id === id)) return;
  if (location.hash !== '#' + id) history.pushState(null, '', '#' + id);
  selectPhase();
  if (focusHeading) {
    const heading = document.querySelector('#' + selected + ' h2');
    heading.focus({preventScroll:true});
    heading.scrollIntoView({block:'nearest',behavior:motion.matches?'auto':'smooth'});
  }
}
links.forEach(link => link.addEventListener('click', event => {
  event.preventDefault(); navigatePhase(link.dataset.phase, true);
}));
previous.addEventListener('click', () => navigatePhase(panels[panels.findIndex(p=>p.id===selected)-1]?.id, true));
next.addEventListener('click', () => navigatePhase(panels[panels.findIndex(p=>p.id===selected)+1]?.id, true));
document.querySelectorAll('.hero-actions a, .featured, .identity').forEach(link => link.addEventListener('click', event => {
  event.preventDefault(); navigatePhase(link.hash.slice(1), true);
}));
window.addEventListener('hashchange', selectPhase);
window.addEventListener('popstate', selectPhase);
selectPhase();
let observer;
function configureMotion() {
  observer?.disconnect();
  const elements = [...document.querySelectorAll('.reveal')];
  if (motion.matches || !('IntersectionObserver' in window)) {
    elements.forEach(el=>el.classList.remove('will-reveal'));
    return;
  }
  observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
  }), {threshold:0.08});
  elements.forEach(el=>{el.classList.add('will-reveal');observer.observe(el);});
}
motion.addEventListener('change', configureMotion);
configureMotion();
window.addEventListener('scroll', updateProgress, {passive:true});
window.addEventListener('resize', updateProgress);
document.querySelectorAll('details').forEach(el=>el.addEventListener('toggle',updateProgress));
document.querySelector('#copy-email').addEventListener('click', async () => {
  const status = document.querySelector('#copy-status');
  try { await navigator.clipboard.writeText('dipen55945@gmail.com'); status.textContent='Email copied'; }
  catch { status.textContent='Select and copy the email address above.'; }
});

const componentData = {
 owner: ['The operator’s point of view.', 'I integrated the dashboard with DAP’s APIs so requests, evidence, and owner review belong to one platform.', 'docs/phase11g-dashboard-engineering-workspace.md', 'Inspect the workspace design'],
 policy: ['AI output is not execution authority.', 'I defined admission checks and restricted execution boundaries. Requests that need broader privileges are rejected rather than silently escalated.', 'docs/phase11d-guardian-execution-admission.md', 'Inspect the admission rules'],
 models: ['The right model, with a bounded request.', 'I adapted local inference around Granite for general work and Qwen for coding. The timeout investigation below explains why output limits became a platform rule.', null, 'Explore the timeout investigation'],
 workflows: ['Evidence before action.', 'I integrated research and career workflows with evidence capture and owner review. The public research checklist documents reliability checks and operational limits.', 'docs/phase14-research-operations-reliability-checklist.md', 'Inspect the reliability checklist']
};
function setupTabs(buttons, activate) {
 buttons.forEach((button,index) => {
  button.addEventListener('click',()=>activate(index));
  button.addEventListener('keydown',event=>{
   let target;
   if(event.key==='ArrowRight') target=(index+1)%buttons.length;
   if(event.key==='ArrowLeft') target=(index+buttons.length-1)%buttons.length;
   if(event.key==='Home') target=0;
   if(event.key==='End') target=buttons.length-1;
   if(target!==undefined){event.preventDefault();activate(target);buttons[target].focus();}
  });
 });
}
const componentButtons=[...document.querySelectorAll('[data-component]')];
function activateComponent(index) {
 componentButtons.forEach((button,i)=>{button.setAttribute('aria-selected',String(i===index));button.tabIndex=i===index?0:-1;});
 const button=componentButtons[index], data=componentData[button.dataset.component];
 const detail=document.querySelector('#component-detail');
 detail.setAttribute('aria-labelledby',button.id);
 detail.querySelector('h3').textContent=data[0];
 document.querySelector('#component-copy').textContent=data[1];
 const link=document.querySelector('#component-evidence');
 link.textContent=data[3]+' ↗';
 if(data[2]){link.href='https://github.com/dipenkalal/dipen-ai-platform/blob/HEAD/'+data[2];link.target='_blank';}
 else {link.href='#debug-title';link.removeAttribute('target');}
}
setupTabs(componentButtons,activateComponent);
document.querySelector('#component-evidence').addEventListener('click',event=>{
 if(event.currentTarget.getAttribute('href')==='#debug-title'){event.preventDefault();navigatePhase('phase-06');document.querySelector('#debug-title').scrollIntoView({block:'start',behavior:motion.matches?'auto':'smooth'});}
});
const evolutionCopy=[
 ['Start with the network.', 'Public entry points, private application logic, and isolated data establish the first boundaries.'],
 ['Make the environment reproducible.', 'Terraform turns resource choices and dependencies into infrastructure that can be reviewed.'],
 ['Connect services around a request.', 'Static delivery and API processing become separate paths, each with a clear responsibility.'],
 ['Follow the change into deployment.', 'Build, smoke-test, publish, and validate the rollout—with a failure path in the pipeline.'],
 ['Plan for a regional failure.', 'Replication, monitoring, and traffic routing extend the design beyond the primary environment.'],
 ['Bring the system under explicit control.', 'DAP brings inference, workflows, evidence, and owner decisions together behind defined boundaries.']
];
const evolutionLinks=[...document.querySelectorAll('[data-evolution]')];
function updateEvolution(){
 const index=panels.findIndex(p=>!p.hidden);
 document.querySelector('#evolution-title').textContent=evolutionCopy[index][0];
 document.querySelector('#evolution-copy').textContent=evolutionCopy[index][1];
 evolutionLinks.forEach((a,i)=>{a.classList.toggle('reached',i<=index);if(i===index)a.setAttribute('aria-current','step');else a.removeAttribute('aria-current');});
}
evolutionLinks.forEach(a=>a.addEventListener('click',event=>{event.preventDefault();navigatePhase(a.dataset.evolution,true);updateEvolution();}));
new MutationObserver(updateEvolution).observe(phaseStatus,{childList:true,characterData:true,subtree:true});
updateEvolution();
let debugStep=0;
const debugButtons=[...document.querySelectorAll('[data-debug]')];
function activateDebug(index){
 debugStep=index;
 debugButtons.forEach((b,i)=>{b.setAttribute('aria-selected',String(i===index));b.tabIndex=i===index?0:-1;document.querySelector('#debug-panel-'+i).hidden=i!==index;});
 document.querySelector('#debug-prev').disabled=index===0;document.querySelector('#debug-next').disabled=index===3;
 updateProgress();
}
setupTabs(debugButtons,activateDebug);
document.querySelector('#debug-prev').addEventListener('click',()=>{activateDebug(Math.max(0,debugStep-1));debugButtons[debugStep].focus();});
document.querySelector('#debug-next').addEventListener('click',()=>{activateDebug(Math.min(3,debugStep+1));debugButtons[debugStep].focus();});
