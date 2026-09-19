/**
 * New Leap Labs - Space Animations Engine
 * Shared across all pages for premium motion effects
 * Pure Vanilla JavaScript - No Dependencies
 */

(function () {
  'use strict';

  // ── Reduced Motion Check ──────────────────────────────────────────
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) {
    // Make all reveal elements visible immediately
    document.addEventListener('DOMContentLoaded', () => {
      document.querySelectorAll('.space-reveal, .space-reveal-left, .space-reveal-scale').forEach(el => {
        el.classList.add('visible');
      });
    });
    return; // Skip all animation setup
  }

  // ── IntersectionObserver Reveal System ─────────────────────────────
  function initRevealSystem() {
    const revealElements = document.querySelectorAll('.space-reveal, .space-reveal-left, .space-reveal-scale');

    if (!revealElements.length) return;

    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target); // Animate only once
        }
      });
    }, {
      threshold: 0.12,
      rootMargin: '0px 0px -40px 0px'
    });

    revealElements.forEach(el => {
      revealObserver.observe(el);
    });
  }

  // ── Counter Animation ─────────────────────────────────────────────
  function initCounterAnimation() {
    const counters = document.querySelectorAll('.space-counter');
    if (!counters.length) return;

    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });

    counters.forEach(el => counterObserver.observe(el));
  }

  function animateCounter(el) {
    const target = parseInt(el.getAttribute('data-target') || el.textContent, 10);
    if (isNaN(target)) return;

    const duration = 1200;
    const startTime = performance.now();
    const startValue = 0;

    function updateCounter(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + (target - startValue) * eased);

      el.textContent = current.toLocaleString();

      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      }
    }

    requestAnimationFrame(updateCounter);
  }

  // ── Button Ripple Effect ──────────────────────────────────────────
  function initRippleEffect() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.space-btn-ripple');
      if (!btn) return;

      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      btn.style.setProperty('--ripple-x', x + 'px');
      btn.style.setProperty('--ripple-y', y + 'px');

      btn.classList.remove('rippling');
      // Force reflow to restart animation
      void btn.offsetWidth;
      btn.classList.add('rippling');

      btn.addEventListener('animationend', () => {
        btn.classList.remove('rippling');
      }, { once: true });
    });
  }

  // ── Table Row Stagger Animation ───────────────────────────────────
  function initTableRowStagger() {
    const tables = document.querySelectorAll('table tbody');
    if (!tables.length) return;

    const tableObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const rows = entry.target.querySelectorAll('tr');
          rows.forEach((row, index) => {
            row.classList.add('space-row-enter');
            row.style.animationDelay = `${index * 50}ms`;
          });
          tableObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    tables.forEach(tbody => tableObserver.observe(tbody));
  }

  // ── Nebula Orb Injection ──────────────────────────────────────────
  function injectNebulaOrbs() {
    const body = document.body;
    const existingOrbs = body.querySelectorAll('.space-nebula-orb');
    if (existingOrbs.length > 0) return; // Don't double-inject

    const orbConfigs = [
      { className: 'space-nebula-orb--purple', size: 280, top: '8%', right: '5%', delay: '0s' },
      { className: 'space-nebula-orb--cyan', size: 200, bottom: '15%', left: '3%', delay: '3s' },
    ];

    orbConfigs.forEach(config => {
      const orb = document.createElement('div');
      orb.className = `space-nebula-orb ${config.className}`;
      orb.style.width = config.size + 'px';
      orb.style.height = config.size + 'px';
      orb.style.animationDelay = config.delay;
      orb.setAttribute('aria-hidden', 'true');

      if (config.top) orb.style.top = config.top;
      if (config.bottom) orb.style.bottom = config.bottom;
      if (config.left) orb.style.left = config.left;
      if (config.right) orb.style.right = config.right;

      body.appendChild(orb);
    });
  }

  // ── Orbit Ring Injection ──────────────────────────────────────────
  function injectOrbitRing() {
    const body = document.body;
    if (body.querySelector('.space-orbit-ring')) return;

    const ring = document.createElement('div');
    ring.className = 'space-orbit-ring';
    ring.setAttribute('aria-hidden', 'true');
    ring.style.width = '500px';
    ring.style.height = '500px';
    ring.style.top = '-120px';
    ring.style.right = '-150px';
    ring.style.position = 'fixed';

    const dot = document.createElement('div');
    dot.className = 'space-orbit-dot';
    ring.appendChild(dot);

    body.appendChild(ring);
  }

  // ── Sidebar Nav Hover Enhancement ─────────────────────────────────
  function initNavHoverEffects() {
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    navItems.forEach(item => {
      if (!item.classList.contains('active')) {
        item.classList.add('space-nav-hover');
      }
    });
  }

  // ── Stat Card Hover Enhancement ───────────────────────────────────
  function initStatCardEffects() {
    const statCards = document.querySelectorAll('.stat-card, .task-stat-card');
    statCards.forEach(card => {
      card.classList.add('space-hover-glow');
    });
  }

  // ── Submit/Primary Button Ripple Enhancement ──────────────────────
  function initButtonEffects() {
    const primaryButtons = document.querySelectorAll(
      '.submit-btn, .assign-task-submit-btn, .assign-btn, .task-submit-btn, .btn-primary-action'
    );
    primaryButtons.forEach(btn => {
      btn.classList.add('space-btn-ripple');
    });
  }

  // ── Page Load Entrance Animation ──────────────────────────────────
  function initPageEntrance() {
    const mainContent = document.querySelector('.dashboard-main-content, .task-main-content, .main-content, .page-container, .app-card-container');
    if (mainContent) {
      mainContent.style.opacity = '0';
      mainContent.style.transform = 'translateY(16px)';
      mainContent.style.transition = 'opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1), transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          mainContent.style.opacity = '1';
          mainContent.style.transform = 'translateY(0)';
        });
      });
    }
  }

  // ── Sidebar Entrance Animation ────────────────────────────────────
  function initSidebarEntrance() {
    const sidebar = document.querySelector('.dashboard-sidebar');
    if (sidebar) {
      sidebar.style.opacity = '0';
      sidebar.style.transform = 'translateX(-20px)';
      sidebar.style.transition = 'opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.1s, transform 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.1s';

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          sidebar.style.opacity = '1';
          sidebar.style.transform = 'translateX(0)';
        });
      });
    }
  }

  // ── Mouse Parallax on Decorative Elements ─────────────────────────
  function initMouseParallax() {
    const parallaxElements = document.querySelectorAll('.satellite-container, .space-nebula-orb, .space-orbit-ring');
    if (!parallaxElements.length) return;

    let ticking = false;

    document.addEventListener('mousemove', (e) => {
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        const x = (e.clientX / window.innerWidth - 0.5) * 2;
        const y = (e.clientY / window.innerHeight - 0.5) * 2;

        parallaxElements.forEach((el, index) => {
          const intensity = 6 + (index * 3);
          const offsetX = x * intensity;
          const offsetY = y * intensity;

          // Don't override existing animation transforms — use CSS custom properties
          el.style.setProperty('--parallax-x', offsetX + 'px');
          el.style.setProperty('--parallax-y', offsetY + 'px');
        });

        ticking = false;
      });
    });
  }

  // ── Enhanced Satellite Animation ──────────────────────────────────
  function initSatelliteEnhancement() {
    const satellite = document.querySelector('.satellite-img');
    if (satellite) {
      satellite.classList.add('space-satellite-float');
    }
  }

  // ── Shimmer on Accent Lines ───────────────────────────────────────
  function initShimmerEffects() {
    const accentLines = document.querySelectorAll('.brand-accent-line, .values-accent-bar');
    accentLines.forEach(line => {
      line.classList.add('space-shimmer-line');
    });
  }

  // ── Initialize Everything on DOM Ready ────────────────────────────
  function init() {
    // Core animation systems
    initRevealSystem();
    initCounterAnimation();
    initRippleEffect();
    initTableRowStagger();

    // Decorative injections
    injectNebulaOrbs();
    injectOrbitRing();

    // Auto-enhancement
    initNavHoverEffects();
    initStatCardEffects();
    initButtonEffects();
    initSatelliteEnhancement();
    initShimmerEffects();

    // Page transitions
    initPageEntrance();
    initSidebarEntrance();

    // Parallax (desktop only)
    if (window.innerWidth > 768) {
      initMouseParallax();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
