import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(pointer: fine)').matches;

function initMenu() {
  const toggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const nav = document.querySelector<HTMLElement>('[data-mobile-nav]');
  if (!toggle || !nav) return;

  const close = () => {
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Abrir menú');
    nav.hidden = true;
  };

  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    nav.hidden = !open;
  });
  nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', close));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });
}

function initHeader() {
  const header = document.querySelector<HTMLElement>('[data-header]');
  if (!header) return;
  ScrollTrigger.create({
    start: 24,
    onEnter: () => header.classList.add('is-scrolled'),
    onLeaveBack: () => header.classList.remove('is-scrolled'),
  });
}

function initReveals() {
  const items = gsap.utils.toArray<HTMLElement>('[data-reveal]');
  if (reducedMotion) return;
  items.forEach((item, index) => {
    gsap.from(item, {
      y: 28,
      autoAlpha: 0,
      duration: .78,
      delay: index < 4 ? index * .06 : 0,
      ease: 'power3.out',
      scrollTrigger: { trigger: item, start: 'top 88%', once: true },
    });
  });
}

function initMagnetic() {
  if (!finePointer || reducedMotion) return;
  document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((element) => {
    element.addEventListener('pointermove', (event) => {
      const rect = element.getBoundingClientRect();
      const x = (event.clientX - rect.left - rect.width / 2) / rect.width;
      const y = (event.clientY - rect.top - rect.height / 2) / rect.height;
      gsap.to(element, { x: x * 12, y: y * 10, duration: .35, ease: 'power2.out' });
    });
    element.addEventListener('pointerleave', () => gsap.to(element, { x: 0, y: 0, duration: .6, ease: 'elastic.out(1, .45)' }));
  });
}

function initTilt() {
  if (!finePointer || reducedMotion) return;
  document.querySelectorAll<HTMLElement>('[data-tilt]').forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      const rect = card.getBoundingClientRect();
      const rotateX = ((event.clientY - rect.top) / rect.height - .5) * -4.5;
      const rotateY = ((event.clientX - rect.left) / rect.width - .5) * 4.5;
      gsap.to(card, { rotateX, rotateY, transformPerspective: 900, duration: .45, ease: 'power2.out' });
    });
    card.addEventListener('pointerleave', () => gsap.to(card, { rotateX: 0, rotateY: 0, duration: .7, ease: 'elastic.out(1, .5)' }));
  });
}

async function initScene() {
  const canvas = document.querySelector<HTMLCanvasElement>('#hero-3d');
  const stage = canvas?.closest<HTMLElement>('.hero-stage');
  if (!canvas || !stage || reducedMotion || window.matchMedia('(max-width: 700px)').matches) return;

  const load = async () => {
    try {
      const { createControlRoomScene } = await import('./control-room-3d');
      createControlRoomScene(canvas);
      stage.classList.add('scene-ready');
    } catch {
      stage.classList.add('scene-fallback-only');
    }
  };

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, instance) => {
      if (!entries[0]?.isIntersecting) return;
      instance.disconnect();
      void load();
    }, { rootMargin: '240px' });
    observer.observe(stage);
  } else {
    void load();
  }
}

function init() {
  initMenu();
  initHeader();
  initReveals();
  initMagnetic();
  initTilt();
  void initScene();
  requestAnimationFrame(() => ScrollTrigger.refresh());
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();
