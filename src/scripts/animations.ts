import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(pointer: fine)').matches;

/* ------------------------------------------------------------------ */
/* Botones magnéticos (solo desktop con puntero fino, sin reduced-motion) */
/* ------------------------------------------------------------------ */
function initMagneticButtons() {
  if (!finePointer || prefersReducedMotion) return;

  document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
    const strength = 24;

    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      gsap.to(el, {
        x: (x / rect.width) * strength,
        y: (y / rect.height) * strength,
        duration: 0.4,
        ease: 'power3.out',
      });
    });

    el.addEventListener('mouseleave', () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    });
  });
}

/* ------------------------------------------------------------------ */
/* Navbar: fondo al hacer scroll                                       */
/* ------------------------------------------------------------------ */
function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  ScrollTrigger.create({
    start: 80,
    onEnter: () => navbar.classList.add('bg-midnight/85', 'backdrop-blur-xl', 'border-b', 'border-white/10', 'shadow-lg'),
    onLeaveBack: () => navbar.classList.remove('bg-midnight/85', 'backdrop-blur-xl', 'border-b', 'border-white/10', 'shadow-lg'),
  });
}

/* ------------------------------------------------------------------ */
/* Hero: entrada escalonada                                            */
/* ------------------------------------------------------------------ */
function initHero() {
  if (prefersReducedMotion) return;

  gsap.timeline({ defaults: { ease: 'power3.out' } })
    .from('[data-hero="badge"]', { y: 24, autoAlpha: 0, duration: 0.7 })
    .from('[data-hero="title"]', { y: 40, autoAlpha: 0, duration: 0.9 }, '-=0.4')
    .from('[data-hero="subtitle"]', { y: 30, autoAlpha: 0, duration: 0.8 }, '-=0.55')
    .from('[data-hero="cta"]', { y: 24, autoAlpha: 0, duration: 0.7 }, '-=0.5')
    .from('[data-hero="chips"]', { y: 20, autoAlpha: 0, duration: 0.7 }, '-=0.45')
    .from('[data-hero="scroll"]', { autoAlpha: 0, duration: 0.8 }, '-=0.3');
}

/* ------------------------------------------------------------------ */
/* Escena 3D del showcase (Three.js) — carga diferida                  */
/* ------------------------------------------------------------------ */
let showcaseApi: { setActive: (index: number) => void } | null = null;

async function initShowcaseThree() {
  const canvas = document.getElementById('showcase-3d');
  if (!canvas || prefersReducedMotion) return;

  const { createShowcaseScene } = await import('./showcase-3d');
  showcaseApi = createShowcaseScene(canvas as HTMLCanvasElement);
}

/* ------------------------------------------------------------------ */
/* Showcase: pinning + transición vertical entre productos             */
/* ------------------------------------------------------------------ */
function initShowcase() {
  const pin = document.getElementById('showcase-pin');
  if (!pin) return;

  const panels = gsap.utils.toArray<HTMLElement>('[data-product-panel]');
  const dots = gsap.utils.toArray<HTMLElement>('[data-progress-dot]');
  if (panels.length === 0) return;

  if (prefersReducedMotion) return; // fallback: paneles en flujo vertical

  pin.classList.add('is-animated');

  let currentIndex = 0;
  const setActiveProduct = (i: number) => {
    if (i === currentIndex) return;
    currentIndex = i;
    showcaseApi?.setActive(i);
  };

  const setActiveDot = (i: number) => {
    dots.forEach((dot, j) => {
      dot.style.backgroundColor = j === i ? '#fff' : 'rgba(255,255,255,0.2)';
      dot.style.transform = j === i ? 'scale(1.5)' : 'scale(1)';
    });
  };
  setActiveDot(0);

  // Estado inicial: primer panel visible, el resto debajo
  gsap.set(panels, { yPercent: 100, autoAlpha: 0 });
  gsap.set(panels[0], { yPercent: 0, autoAlpha: 1 });

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: pin,
      start: 'top top',
      end: `+=${panels.length * 100}%`,
      pin: true,
      scrub: 1,
      anticipatePin: 1,
      onUpdate: (self) => {
        const i = Math.min(
          panels.length - 1,
          Math.floor(self.progress * panels.length),
        );
        setActiveDot(i);
        setActiveProduct(i);
      },
    },
  });

  // Entrada escalonada del contenido del primer panel al fijarse la sección
  tl.from(panels[0].querySelectorAll('[data-stagger]'), {
    y: 30,
    autoAlpha: 0,
    stagger: 0.08,
    duration: 0.6,
    ease: 'power3.out',
  }, 0);

  panels.forEach((panel, i) => {
    if (i === 0) return;
    tl.to(panels[i - 1], { yPercent: -35, autoAlpha: 0, duration: 1, ease: 'power2.inOut' }, i)
      .fromTo(panel, { yPercent: 100, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 1, ease: 'power2.inOut' }, i)
      .from(panel.querySelectorAll('[data-stagger]'), {
        y: 30,
        autoAlpha: 0,
        stagger: 0.08,
        duration: 0.6,
        ease: 'power3.out',
      }, i + 0.45);
  });
}

/* ------------------------------------------------------------------ */
/* Ecosistema: escena 3D con fallback al SVG animado                   */
/* ------------------------------------------------------------------ */
function initEcosystemSvg() {
  const section = document.querySelector('[data-ecosystem]');
  if (!section || prefersReducedMotion) return;

  const links = section.querySelectorAll<SVGPathElement>('[data-link]');
  links.forEach((path) => {
    const length = path.getTotalLength();
    gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
  });

  gsap.timeline({
    scrollTrigger: { trigger: section, start: 'top 75%' },
    defaults: { ease: 'power2.out' },
  })
    .from(section.querySelectorAll('[data-node]'), {
      scale: 0,
      autoAlpha: 0,
      transformOrigin: 'center',
      stagger: 0.12,
      duration: 0.7,
      ease: 'back.out(1.7)',
    })
    .to(links, { strokeDashoffset: 0, stagger: 0.08, duration: 0.9 }, '-=0.4');
}

function initStats() {
  if (prefersReducedMotion) return;

  gsap.from('[data-stat]', {
    scrollTrigger: { trigger: '[data-stat]', start: 'top 85%' },
    y: 30,
    autoAlpha: 0,
    stagger: 0.1,
    duration: 0.7,
    ease: 'power3.out',
  });
}

async function initEcosystemSection() {
  initStats();

  const canvas = document.getElementById('ecosystem-3d');
  const wrap = document.getElementById('ecosystem-3d-wrap');
  const fallback = document.getElementById('ecosystem-fallback');

  if (canvas && wrap && !prefersReducedMotion) {
    try {
      const { createEcosystemScene } = await import('./ecosystem-3d');
      createEcosystemScene(canvas as HTMLCanvasElement);
      fallback?.classList.add('hidden');
      wrap.classList.remove('hidden');
      return;
    } catch {
      /* Si WebGL falla, se usa el SVG animado */
    }
  }

  initEcosystemSvg();
}

/* ------------------------------------------------------------------ */
/* Tilt 3D en tarjetas (perspectiva al mover el mouse)                 */
/* ------------------------------------------------------------------ */
function initTilt() {
  if (!finePointer || prefersReducedMotion) return;

  document.querySelectorAll<HTMLElement>('[data-tilt]').forEach((el) => {
    gsap.set(el, { transformPerspective: 800 });

    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const rotateX = ((e.clientY - rect.top) / rect.height - 0.5) * -8;
      const rotateY = ((e.clientX - rect.left) / rect.width - 0.5) * 8;
      gsap.to(el, { rotateX, rotateY, duration: 0.4, ease: 'power2.out' });
    });

    el.addEventListener('mouseleave', () => {
      gsap.to(el, { rotateX: 0, rotateY: 0, duration: 0.7, ease: 'elastic.out(1, 0.5)' });
    });
  });
}

/* ------------------------------------------------------------------ */
/* CTA final                                                           */
/* ------------------------------------------------------------------ */
function initCTA() {
  if (prefersReducedMotion) return;

  gsap.from('[data-cta]', {
    scrollTrigger: { trigger: '[data-cta]', start: 'top 80%' },
    y: 50,
    autoAlpha: 0,
    duration: 0.9,
    ease: 'power3.out',
  });
}

/* ------------------------------------------------------------------ */
/* Reveal genérico para secciones                                      */
/* ------------------------------------------------------------------ */
function initReveal() {
  if (prefersReducedMotion) return;

  gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
    gsap.from(el, {
      scrollTrigger: { trigger: el, start: 'top 85%' },
      y: 36,
      autoAlpha: 0,
      duration: 0.8,
      ease: 'power3.out',
    });
  });
}

/* ------------------------------------------------------------------ */
/* Fondo 3D (Three.js) — carga diferida y code-split                   */
/* ------------------------------------------------------------------ */
async function initThree() {
  const canvas = document.getElementById('hero-3d');
  if (!canvas || prefersReducedMotion) return;

  const { createHeroScene } = await import('./three-bg');
  createHeroScene(canvas as HTMLCanvasElement);
}

/* ------------------------------------------------------------------ */
/* Barra de progreso de scroll                                         */
/* ------------------------------------------------------------------ */
function initScrollProgress() {
  const bar = document.getElementById('scroll-progress');
  if (!bar) return;

  gsap.to(bar, {
    scaleX: 1,
    ease: 'none',
    scrollTrigger: { scrub: 0.3, start: 0, end: 'max' },
  });
}

/* ------------------------------------------------------------------ */
/* Parallax en elementos decorativos                                   */
/* ------------------------------------------------------------------ */
function initParallax() {
  if (prefersReducedMotion) return;

  gsap.utils.toArray<HTMLElement>('[data-parallax]').forEach((el) => {
    const speed = parseFloat(el.dataset.parallax ?? '10');
    gsap.to(el, {
      yPercent: speed,
      ease: 'none',
      scrollTrigger: {
        trigger: el.closest('section') ?? el,
        start: 'top top',
        end: 'bottom top',
        scrub: 1,
      },
    });
  });
}

/* ------------------------------------------------------------------ */
/* Contadores animados (stats)                                         */
/* ------------------------------------------------------------------ */
function initCounters() {
  document.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
    const target = parseInt(el.dataset.count ?? '0', 10);
    const suffix = el.dataset.suffix ?? '';

    if (prefersReducedMotion) {
      el.textContent = `${target}${suffix}`;
      return;
    }

    const state = { value: 0 };
    gsap.to(state, {
      value: target,
      duration: 1.8,
      ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 85%' },
      onUpdate: () => {
        el.textContent = `${Math.round(state.value)}${suffix}`;
      },
    });
  });
}

/* ------------------------------------------------------------------ */
function init() {
  initNavbar();
  initHero();
  initShowcase();
  initEcosystemSection();
  initCTA();
  initReveal();
  initMagneticButtons();
  initScrollProgress();
  initParallax();
  initCounters();
  initTilt();
  initThree();
  initShowcaseThree();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
