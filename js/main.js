/**
 * main.js — Hansje Görtz website
 * Vanilla JS, no dependencies
 */

document.addEventListener('DOMContentLoaded', () => {

  // 1. HEADER SCROLL BEHAVIOUR
  const header = document.getElementById('site-header');
  const handleScroll = () => {
    header.classList.toggle('scrolled', window.scrollY > 80);
  };
  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();


  // 2. MOBILE NAVIGATION
  const hamburger   = document.querySelector('.hamburger');
  const mobileNav   = document.getElementById('mobile-nav');
  const mobileLinks = document.querySelectorAll('.mobile-nav__link');

  const openMenu = () => {
    hamburger.classList.add('is-open');
    hamburger.setAttribute('aria-expanded', 'true');
    mobileNav.classList.add('is-open');
    mobileNav.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };
  const closeMenu = () => {
    hamburger.classList.remove('is-open');
    hamburger.setAttribute('aria-expanded', 'false');
    mobileNav.classList.remove('is-open');
    mobileNav.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  hamburger.addEventListener('click', () => {
    hamburger.classList.contains('is-open') ? closeMenu() : openMenu();
  });
  mobileLinks.forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && mobileNav.classList.contains('is-open')) closeMenu();
  });


  // 3. CREDITS TABS
  const creditsTabs = document.querySelector('.credits-tabs');

  const activateCreditTab = btn => {
    if (!btn) return;

    document.querySelectorAll('.tab-btn').forEach(tab => {
      const isActive = tab === btn;
      tab.classList.toggle('tab-btn--active', isActive);
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
      tab.tabIndex = isActive ? 0 : -1;
    });

    document.querySelectorAll('.credits-list').forEach(panel => {
      const isActive = panel.id === btn.getAttribute('aria-controls');
      panel.classList.toggle('credits-list--active', isActive);
      panel.hidden = !isActive;
    });
  };

  if (creditsTabs) {
    creditsTabs.addEventListener('click', e => {
      const btn = e.target.closest('.tab-btn');
      if (btn && creditsTabs.contains(btn)) activateCreditTab(btn);
    });

    creditsTabs.addEventListener('keydown', e => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;

      const btn = e.target.closest('.tab-btn');
      if (!btn) return;
      if (document.body.classList.contains('edit-mode') && btn.isContentEditable) return;

      const tabs = [...creditsTabs.querySelectorAll('.tab-btn')];
      let index = tabs.indexOf(btn);
      if (e.key === 'Home') index = 0;
      else if (e.key === 'End') index = tabs.length - 1;
      else index = (index + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;

      e.preventDefault();
      activateCreditTab(tabs[index]);
      tabs[index].focus();
    });

    activateCreditTab(creditsTabs.querySelector('.tab-btn--active') || creditsTabs.querySelector('.tab-btn'));
  }


  // 4. LIGHTBOX
  const lightbox      = document.getElementById('lightbox');
  const lightboxImg   = lightbox.querySelector('.lightbox-img');
  const lightboxClose = lightbox.querySelector('.lightbox-close');
  const lightboxPrev  = lightbox.querySelector('.lightbox-prev');
  const lightboxNext  = lightbox.querySelector('.lightbox-next');
  const photoItems    = document.querySelectorAll('.photo-item');

  const gallery = Array.from(photoItems).map(item => {
    const img = item.querySelector('img');
    return { src: img.src, alt: img.alt };
  });

  let currentIdx = 0;

  const openLightbox = (idx) => {
    currentIdx = idx;
    lightboxImg.src = gallery[idx].src;
    lightboxImg.alt = gallery[idx].alt;
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    lightboxClose.focus();
  };
  const closeLightbox = () => {
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };
  const showPrev = () => {
    currentIdx = (currentIdx - 1 + gallery.length) % gallery.length;
    lightboxImg.src = gallery[currentIdx].src;
    lightboxImg.alt = gallery[currentIdx].alt;
  };
  const showNext = () => {
    currentIdx = (currentIdx + 1) % gallery.length;
    lightboxImg.src = gallery[currentIdx].src;
    lightboxImg.alt = gallery[currentIdx].alt;
  };

  photoItems.forEach((item, i) => {
    item.setAttribute('tabindex', '0');
    item.setAttribute('role', 'button');
    item.addEventListener('click', () => openLightbox(i));
    item.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(i); }
    });
  });

  lightboxClose.addEventListener('click', closeLightbox);
  lightboxPrev.addEventListener('click', showPrev);
  lightboxNext.addEventListener('click', showNext);
  lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', e => {
    if (!lightbox.classList.contains('is-open')) return;
    if (e.key === 'Escape')     closeLightbox();
    if (e.key === 'ArrowLeft')  showPrev();
    if (e.key === 'ArrowRight') showNext();
  });


  // 5. CONTACT FORM (Netlify Forms async submission)
  const contactForm = document.getElementById('contact-form');
  const formSuccess = document.getElementById('form-success');

  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = contactForm.querySelector('[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';
      try {
        const res = await fetch('/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(new FormData(contactForm)).toString()
        });
        if (res.ok) {
          contactForm.reset();
          formSuccess.hidden = false;
          submitBtn.textContent = 'Sent ✓';
        } else {
          submitBtn.textContent = 'Error — try emailing directly';
          submitBtn.disabled = false;
        }
      } catch {
        submitBtn.textContent = 'Error — try emailing directly';
        submitBtn.disabled = false;
      }
    });
  }


  // 6. SCROLL-TRIGGERED FADE-IN
  const fadeTargets = document.querySelectorAll(
    '.about-grid, .video-wrap, .credits-heading, .training-grid, .photos-grid, .contact-heading'
  );
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  fadeTargets.forEach(el => {
    el.classList.add('fade-target');
    observer.observe(el);
  });

});
