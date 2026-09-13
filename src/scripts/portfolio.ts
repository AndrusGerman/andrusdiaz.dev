const menu = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
const mobileNav = document.querySelector<HTMLElement>('[data-mobile-nav]');

function closeMenu() {
  menu?.setAttribute('aria-expanded', 'false');
  menu?.setAttribute('aria-label', 'Abrir menú');
  if (mobileNav) mobileNav.hidden = true;
}

menu?.addEventListener('click', () => {
  const opening = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(opening));
  menu.setAttribute('aria-label', opening ? 'Cerrar menú' : 'Abrir menú');
  if (mobileNav) mobileNav.hidden = !opening;
});

mobileNav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeMenu();
});

if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.animate(
        [
          { opacity: 0, transform: 'translateY(18px)' },
          { opacity: 1, transform: 'translateY(0)' },
        ],
        { duration: 620, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'both' },
      );
      observer.unobserve(entry.target);
    });
  }, { threshold: .12 });

  document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((element) => observer.observe(element));
}
