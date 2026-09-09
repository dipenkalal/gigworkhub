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
