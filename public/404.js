/**
 * Animation et interactivité pour la page d'erreur 404
 */

document.addEventListener('DOMContentLoaded', () => {
  initSpaceParticles();
  initTiltEffect();
  initDiagnostics();
  initActionButtons();
});

/* ==========================================================================
   1. Toile Cosmique (Canvas Particules & Poussières d'étoiles)
   ========================================================================== */
function initSpaceParticles() {
  const canvas = document.getElementById('space-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  const particles = [];
  const PARTICLE_COUNT = Math.min(65, Math.floor((width * height) / 18000));

  class Star {
    constructor() {
      this.reset(true);
    }

    reset(initial = false) {
      this.x = Math.random() * width;
      this.y = initial ? Math.random() * height : -10;
      this.size = Math.random() * 1.5 + 0.5;
      this.speedY = Math.random() * 0.2 + 0.05;
      this.speedX = (Math.random() - 0.5) * 0.1;
      this.opacity = Math.random() * 0.6 + 0.2;
      this.twinkleSpeed = Math.random() * 0.015 + 0.005;
      this.twinkleDir = Math.random() > 0.5 ? 1 : -1;
    }

    update() {
      this.y += this.speedY;
      this.x += this.speedX;

      // Scintillement doux
      this.opacity += this.twinkleSpeed * this.twinkleDir;
      if (this.opacity > 0.85 || this.opacity < 0.2) {
        this.twinkleDir *= -1;
      }

      if (this.y > height + 10 || this.x < -10 || this.x > width + 10) {
        this.reset(false);
      }
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
      ctx.fill();
    }
  }

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push(new Star());
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);
    particles.forEach((p) => {
      p.update();
      p.draw();
    });
    requestAnimationFrame(animate);
  }

  animate();

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });
}

/* ==========================================================================
   2. Effet d'inclinaison 3D au survol (Tilt interactif)
   ========================================================================== */
function initTiltEffect() {
  const card = document.getElementById('tilt-card');
  if (!card) return;

  // Respecter l'option d'accessibilité utilisateur
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  let bounds;
  let mouseLeaveTimeout;

  function updateBounds() {
    bounds = card.getBoundingClientRect();
  }

  window.addEventListener('resize', updateBounds);
  window.addEventListener('scroll', updateBounds);
  updateBounds();

  window.addEventListener('mousemove', (e) => {
    clearTimeout(mouseLeaveTimeout);
    if (!bounds) updateBounds();

    const mouseX = e.clientX;
    const mouseY = e.clientY;

    const cardCenterX = bounds.left + bounds.width / 2;
    const cardCenterY = bounds.top + bounds.height / 2;

    const diffX = mouseX - cardCenterX;
    const diffY = mouseY - cardCenterY;

    // Amplitude douce d'inclinaison (max ~7 degrés)
    const rotateY = (diffX / (window.innerWidth / 2)) * 6.5;
    const rotateX = -(diffY / (window.innerHeight / 2)) * 6.5;

    card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`;
  });

  window.addEventListener('mouseleave', () => {
    mouseLeaveTimeout = setTimeout(() => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
    }, 150);
  });
}

/* ==========================================================================
   3. Détails Techniques & Diagnostics du Conteneur
   ========================================================================== */
function initDiagnostics() {
  const toggleBtn = document.getElementById('diagnostics-toggle');
  const panel = document.getElementById('diagnostics-panel');
  const routeElem = document.getElementById('diag-route');
  const timeElem = document.getElementById('diag-time');
  const pingElem = document.getElementById('diag-ping');

  if (routeElem) {
    const cleanPath = window.location.pathname || '/';
    routeElem.textContent = cleanPath.length > 25 ? cleanPath.substring(0, 22) + '...' : cleanPath;
    routeElem.title = cleanPath;
  }

  function updateClock() {
    if (timeElem) {
      const now = new Date();
      timeElem.textContent = now.toTimeString().split(' ')[0] + ' UTC';
    }
  }
  updateClock();
  setInterval(updateClock, 1000);

  if (pingElem) {
    const fakePing = (Math.random() * 0.4 + 0.3).toFixed(1);
    pingElem.textContent = `${fakePing} ms`;
  }

  const serverElem = document.getElementById('diag-server');
  if (serverElem && window.location.hostname.endsWith('github.io')) {
    serverElem.textContent = 'GitHub Pages (Fastly CDN)';
  }

  if (toggleBtn && panel) {
    toggleBtn.addEventListener('click', () => {
      const isHidden = panel.hidden;
      panel.hidden = !isHidden;
      toggleBtn.setAttribute('aria-expanded', String(isHidden));
    });
  }
}

/* ==========================================================================
   4. Boutons d'Action (Réessayer et Retour)
   ========================================================================== */
function initActionButtons() {
  const retryBtn = document.getElementById('btn-retry');
  const backBtn = document.getElementById('btn-back');
  const toast = document.getElementById('status-toast');

  function showToast(message, duration = 3000) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, duration);
  }

  if (retryBtn) {
    retryBtn.addEventListener('click', () => {
      retryBtn.classList.add('loading');
      const btnText = retryBtn.querySelector('.btn-text');
      const originalText = btnText ? btnText.textContent : 'Réessayer';
      if (btnText) btnText.textContent = 'Vérification...';

      const startTime = performance.now();

      // Test réel de connectivité au serveur
      fetch(window.location.href, { method: 'HEAD', cache: 'no-store' })
        .then((response) => {
          const latency = Math.round(performance.now() - startTime);
          if (response.ok) {
            showToast('✅ Route rétablie ! Rechargement...');
            setTimeout(() => window.location.reload(), 800);
          } else {
            showToast(`⚠️ Connexion OK (${latency}ms) — Route introuvable (HTTP ${response.status})`);
          }
        })
        .catch(() => {
          showToast('⚠️ Serveur inaccessible. Vérifiez la connexion.');
        })
        .finally(() => {
          setTimeout(() => {
            retryBtn.classList.remove('loading');
            if (btnText) btnText.textContent = originalText;
          }, 600);
        });
    });
  }

  if (backBtn) {
    backBtn.addEventListener('click', () => {
      if (window.history.length > 1 && document.referrer) {
        window.history.back();
      } else {
        const isGH = window.location.hostname.endsWith('github.io');
        const segments = window.location.pathname.split('/').filter(Boolean);
        const homePath = isGH && segments.length > 0 ? '/' + segments[0] + '/' : '/';
        window.location.href = homePath;
      }
    });
  }
}
