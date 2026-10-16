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
  const toggle = document.querySelector<HTMLButtonElement>('[data-motion-toggle]');
  if (!cinema || !stage || !canvas || !projects) return;
  const acts = Array.from(cinema.querySelectorAll<HTMLElement>('[data-act]'));
  const pinnedStages = [stage, ...document.querySelectorAll<HTMLElement>('[data-exhibit-stage]')];
  const originalStageStyles = new Map(pinnedStages.map((element) => [element, element.getAttribute('style')]));
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
    try {
      context = gsap.context(() => {});
      context.add(() => {
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

          document.querySelectorAll<HTMLElement>('[data-work-exhibit]').forEach((exhibit, index) => {
            const exhibitStage = exhibit.querySelector<HTMLElement>('[data-exhibit-stage]');
            const media = exhibit.querySelector<HTMLElement>('[data-exhibit-media]');
            const meter = exhibit.querySelector<HTMLElement>('[data-exhibit-progress]');
            if (!exhibitStage || !media) return;
            const direction = index === 2 ? -1 : 1;
            const sequence = gsap.timeline({
              scrollTrigger: {
                id: 'exhibit-' + index, trigger: exhibit, pin: exhibitStage,
                start: 'top top', end: () => '+=' + Math.round(innerHeight * .75),
                scrub: .8, anticipatePin: 1, invalidateOnRefresh: true,
              },
            });
            sequence.fromTo(media,
              { xPercent: direction * 8, rotateY: direction * -12, rotateX: 6, rotateZ: direction * -3, scale: .86 },
              { xPercent: direction * -3, rotateY: direction * 2, rotateX: 0, rotateZ: 0, scale: 1.02, ease: 'none', duration: 1 }, 0);
            if (meter) sequence.to(meter, { scaleX: 1, ease: 'none', duration: 1 }, 0);
          });
          document.querySelectorAll<HTMLElement>('[data-lab-scene]').forEach((scene) => {
            scene.querySelectorAll<HTMLElement>('[data-lab-image]').forEach((image) => {
              gsap.fromTo(image, { y: 18 }, {
                y: -18, ease: 'none',
                scrollTrigger: { trigger: scene, start: 'top bottom', end: 'bottom top', scrub: .8 },
              });
            });
          });
        } else {
          ScrollTrigger.create({ trigger: cinema, start: 'top top', end: 'bottom bottom', onUpdate: (self) => showProgress(self.progress) });
        }
      });
      cleanMotion = () => {
        context?.revert();
      };
    } catch (error) {
      context?.revert();
      ScrollTrigger.getAll().forEach((trigger) => {
        if (pinnedStages.includes(trigger.pin as HTMLElement)) trigger.kill(true);
      });
      // A constructor failure can leave a spacer before ScrollTrigger registers it.
      pinnedStages.forEach((element) => {
        const spacer = element.parentElement;
        if (spacer?.classList.contains('pin-spacer')) spacer.replaceWith(element);
        const original = originalStageStyles.get(element);
        if (original == null) element.removeAttribute('style');
        else element.setAttribute('style', original);
      });
      cinema!.classList.remove('cinema-enhanced');
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

  const dialog = document.querySelector<HTMLDialogElement>('[data-image-dialog]');
  const dialogImage = dialog?.querySelector<HTMLImageElement>('[data-image-dialog-content]');
  const dialogTitle = dialog?.querySelector<HTMLElement>('[data-image-dialog-title]');
  const dialogCaption = dialog?.querySelector<HTMLElement>('[data-image-dialog-caption]');
  document.querySelectorAll<HTMLAnchorElement>('[data-image-viewer]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (!dialog || !dialogImage || !dialog.showModal || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const url = new URL(link.href);
      if (url.origin !== location.origin) return;
      event.preventDefault();
      dialogImage.src = url.href;
      dialogImage.alt = link.dataset.imageAlt ?? link.querySelector('img')?.alt ?? 'Captura del proyecto';
      if (dialogTitle) dialogTitle.textContent = link.dataset.imageTitle ?? 'Captura del proyecto';
      if (dialogCaption) dialogCaption.textContent = dialogImage.alt;
      dialog.showModal();
    });
  });
  dialog?.querySelector('[data-close-image]')?.addEventListener('click', () => dialog.close());
  dialog?.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  dialog?.addEventListener('close', () => dialogImage?.removeAttribute('src'));

  document.querySelectorAll<HTMLImageElement>('.work-gallery img,.experiment-archive img').forEach((image) => {
    if (!image.complete) image.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
  });

  rebuildMotion();
  void document.fonts?.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener('pagehide', (event) => {
    generation += 1;
    cleanMotion();
    world?.dispose();
    world = undefined;
    cinema.classList.remove('cinema-enhanced', 'world-ready');
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
