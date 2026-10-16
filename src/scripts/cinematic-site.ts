import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { createSystemsWorld } from './systems-world';

gsap.registerPlugin(ScrollTrigger);
type World = ReturnType<typeof createSystemsWorld>;

function init() {
  const cinema = document.querySelector<HTMLElement>('[data-cinema]');
  const stage = document.querySelector<HTMLElement>('[data-cinema-stage]');
  const canvas = document.querySelector<HTMLCanvasElement>('#systems-world');
  const projects = document.querySelector<HTMLElement>('#proyectos');
  const viewport = document.querySelector<HTMLElement>('[data-projects-window]');
  const track = document.querySelector<HTMLElement>('[data-projects-track]');
  const toggle = document.querySelector<HTMLButtonElement>('[data-motion-toggle]');
  if (!cinema || !stage || !canvas || !projects || !viewport || !track) return;
  const acts = Array.from(cinema.querySelectorAll<HTMLElement>('[data-act]'));
  const header = document.querySelector<HTMLElement>('[data-header]');
  const progressBar = document.querySelector<HTMLElement>('[data-cinema-progress]');
  const chapterLabel = document.querySelector<HTMLElement>('[data-chapter-index]');
  const sceneLabel = document.querySelector<HTMLElement>('[data-scene-label]');
  const labels = ['01 / EL ORIGEN', '02 / CONSTRUIR', '03 / DARLE MUNDO', '04 / OPERAR'];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = window.matchMedia('(min-width: 1000px) and (min-height: 680px)');
  let overrideReduced: boolean | null = null;
  let generation = 0;
  let world: World | undefined;
  let worldProgress = 0;
  let cleanMotion = () => {};

  const updateHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 32);
  window.addEventListener('scroll', updateHeader, { passive: true });
  updateHeader();

  function showProgress(progress: number) {
    worldProgress = progress;
    world?.setProgress(progress);
    const chapter = Math.min(3, Math.floor(progress * 3.55 + .12));
    cinema!.dataset.progress = progress.toFixed(3);
    if (progressBar) progressBar.style.transform = 'scaleX(' + progress + ')';
    if (chapterLabel) chapterLabel.textContent = '0' + (chapter + 1) + ' / 04';
    if (sceneLabel) sceneLabel.textContent = labels[chapter];
  }

  function rebuildMotion() {
    generation += 1;
    const activeGeneration = generation;
    cleanMotion();
    world?.dispose();
    world = undefined;
    cinema!.classList.remove('cinema-enhanced', 'world-ready');
    projects!.classList.remove('projects-enhanced');
    viewport!.scrollLeft = 0;
    const isReduced = overrideReduced ?? reduced.matches;
    document.documentElement.dataset.motion = isReduced ? 'reduced' : 'full';
    toggle?.setAttribute('aria-pressed', String(isReduced));
    toggle?.setAttribute('aria-label', isReduced ? 'Activar movimiento' : 'Reducir movimiento');
    const label = toggle?.querySelector('.motion-label');
    if (label) label.textContent = isReduced ? 'Activar movimiento' : 'Pausar movimiento';
    if (isReduced) {
      cleanMotion = () => {};
      showProgress(0);
      ScrollTrigger.refresh();
      return;
    }

    let context: gsap.Context | undefined;
    let focusHandler: ((event: FocusEvent) => void) | undefined;
    try {
      context = gsap.context(() => {
        if (desktop.matches) {
          cinema!.classList.add('cinema-enhanced');
          gsap.set(acts, { autoAlpha: 0 });
          gsap.set(acts[0], { autoAlpha: 1 });
          const story = gsap.timeline({
            defaults: { ease: 'power2.inOut' },
            scrollTrigger: {
              id: 'cinema', trigger: cinema, pin: stage,
              start: 'top top', end: () => '+=' + Math.round(window.innerHeight * 3.6),
              scrub: .7, anticipatePin: 1, invalidateOnRefresh: true,
              onUpdate: (self) => showProgress(self.progress),
            },
          });
          for (let i = 1; i < acts.length; i += 1) {
            story.to(acts[i - 1], { autoAlpha: 0, y: -65, filter: 'blur(5px)', duration: .25 }, i - .25);
            story.fromTo(acts[i], { autoAlpha: 0, y: 85, filter: 'blur(6px)' }, { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: .35 }, i - .12);
          }
          story.to({}, { duration: .4 }, 3.15);

          projects!.classList.add('projects-enhanced');
          const distance = () => Math.max(0, track!.scrollWidth - viewport!.clientWidth);
          const rail = gsap.to(viewport, {
            scrollLeft: distance, ease: 'none',
            scrollTrigger: {
              id: 'projects', trigger: viewport, start: 'top top',
              end: () => '+=' + Math.max(window.innerHeight, distance() * 1.1),
              pin: true, scrub: .65, anticipatePin: 1, invalidateOnRefresh: true,
              onUpdate: () => {
                track!.querySelectorAll<HTMLElement>('.artifact-window').forEach((art) => {
                  const card = art.closest<HTMLElement>('.case-card');
                  if (!card) return;
                  const x = (card.getBoundingClientRect().left + card.clientWidth / 2) / window.innerWidth - .5;
                  art.style.transform = 'perspective(900px) rotateY(' + (-x * 18) + 'deg) rotateX(7deg) rotateZ(' + (-x * 5) + 'deg)';
                });
              },
            },
          });
          focusHandler = (event) => {
            const target = event.target;
            const card = target instanceof HTMLElement ? target.closest<HTMLElement>('.case-card') : null;
            const trigger = rail.scrollTrigger;
            if (!card || !trigger || !distance()) return;
            const ratio = Math.min(1, Math.max(0, (card.offsetLeft - 56) / distance()));
            window.scrollTo({ top: trigger.start + ratio * (trigger.end - trigger.start), behavior: 'instant' });
          };
          viewport!.addEventListener('focusin', focusHandler);
        } else {
          ScrollTrigger.create({ trigger: cinema, start: 'top top', end: 'bottom bottom', onUpdate: (self) => showProgress(self.progress) });
        }
      });
      cleanMotion = () => {
        if (focusHandler) viewport!.removeEventListener('focusin', focusHandler);
        context?.revert();
        track!.querySelectorAll<HTMLElement>('.artifact-window').forEach((art) => art.style.removeProperty('transform'));
      };
    } catch (error) {
      context?.revert();
      cinema!.classList.remove('cinema-enhanced');
      projects!.classList.remove('projects-enhanced');
      acts.forEach((act) => { act.style.removeProperty('visibility'); act.style.removeProperty('opacity'); act.style.removeProperty('transform'); act.style.removeProperty('filter'); });
      console.warn('Scroll enhancement unavailable; readable layout retained.', error);
    }

    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (!connection?.saveData) {
      void import('./systems-world').then(({ createSystemsWorld: create }) => {
        if (generation !== activeGeneration) return;
        try {
          world = create(canvas!);
          world.setProgress(worldProgress);
          cinema!.classList.add('world-ready');
        } catch (error) {
          cinema!.classList.remove('world-ready');
          console.warn('WebGL unavailable; illustrated fallback retained.', error);
        }
      }).catch((error) => console.warn('3D enhancement unavailable; illustrated fallback retained.', error));
    }
    requestAnimationFrame(() => ScrollTrigger.refresh());
  }

  const onContextLost = () => {
    cinema.classList.remove('world-ready');
    world?.dispose();
    world = undefined;
  };
  canvas.addEventListener('webglcontextlost', onContextLost);
  const onPreferenceChange = () => { overrideReduced = null; rebuildMotion(); };
  reduced.addEventListener('change', onPreferenceChange);
  desktop.addEventListener('change', rebuildMotion);
  toggle?.addEventListener('click', () => { overrideReduced = !(overrideReduced ?? reduced.matches); rebuildMotion(); });

  document.querySelectorAll<HTMLAnchorElement>('a[href="#construir"],a[href="#entregar"],a[href="#operar"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const trigger = ScrollTrigger.getById('cinema');
      const index = acts.findIndex((act) => '#' + act.id === link.getAttribute('href'));
      if (!trigger || index < 0) return;
      event.preventDefault();
      window.scrollTo({ top: trigger.start + (index / 3.55) * (trigger.end - trigger.start), behavior: 'smooth' });
    });
  });

  const copyButton = document.querySelector<HTMLButtonElement>('[data-copy-email]');
  copyButton?.addEventListener('click', () => {
    const status = document.querySelector<HTMLElement>('[data-copy-status]');
    if (!navigator.clipboard?.writeText) {
      if (status) status.textContent = 'Puedes escribir a contacto@andrusdiaz.dev.';
      return;
    }
    void navigator.clipboard.writeText(copyButton.dataset.email ?? 'contacto@andrusdiaz.dev').then(() => {
      if (status) status.textContent = 'Correo copiado. Nos leemos pronto.';
    }).catch(() => { if (status) status.textContent = 'Puedes escribir a contacto@andrusdiaz.dev.'; });
  });

  rebuildMotion();
  void document.fonts?.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener('pagehide', (event) => {
    generation += 1;
    cleanMotion();
    world?.dispose();
    world = undefined;
    cinema.classList.remove('cinema-enhanced', 'world-ready');
    projects.classList.remove('projects-enhanced');
    // Keep lifecycle listeners when this document is stored in the back/forward cache.
    if (event.persisted) return;
    window.removeEventListener('scroll', updateHeader);
    reduced.removeEventListener('change', onPreferenceChange);
    desktop.removeEventListener('change', rebuildMotion);
    canvas.removeEventListener('webglcontextlost', onContextLost);
  });
  window.addEventListener('pageshow', (event) => {
    if (!event.persisted) return;
    updateHeader();
    rebuildMotion();
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();
