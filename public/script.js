/**
 * Attention Heatmap & Transformer Runtime Visual Engine
 * Formule : Scores = (Q · Kᵀ) / √d_k -> Softmax -> Attention Map
 * 
 * Améliorations :
 * 1. Softmax exponentiel contrasté (faisceau vainqueur hyper saturé / épais, extinction des autres)
 * 2. Ancrage des Keys (K_i) avec point d'impact, onde de choc pulsante et micro-badge α temps réel
 * 3. Parallaxe 3D magnétique couplée en continu à la Query Q
 */

document.addEventListener('DOMContentLoaded', () => {
  const engine = new AttentionEngine();
  engine.init();
});

class AttentionEngine {
  constructor() {
    this.canvas = document.getElementById('attention-canvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    // Dimension latente des vecteurs
    this.d_k = 32;
    this.sqrt_dk = Math.sqrt(this.d_k);
    this.temperature = 0.65; // Température affûtée pour accentuer la dynamique Softmax
    this.currentHead = 0; // 0: Spatial, 1: Sémantique, 2: Vélocité

    // Curseur = Query (Q)
    this.mouse = {
      x: this.width * 0.5,
      y: this.height * 0.4,
      targetX: this.width * 0.5,
      targetY: this.height * 0.4,
      prevX: this.width * 0.5,
      prevY: this.height * 0.4,
      vx: 0,
      vy: 0,
      speed: 0,
      active: false
    };

    this.Q = new Float32Array(this.d_k);

    // Grille de patchs spatiaux pour le fond (Vision Transformer style)
    this.gridCols = 20;
    this.gridRows = 14;
    this.patchKeys = [];
    this.patchAttention = new Float32Array(this.gridCols * this.gridRows);

    // Tokens DOM interactifs (Keys & Values)
    this.tokens = [
      { id: 'hero', keyLabel: 'K₀', name: 'Profil Ph4nt0m', elem: null, badge: null, pos: { x: 0, y: 0 }, K: null, score: 0, alpha: 0 },
      { id: 'portfolio', keyLabel: 'K₁', name: 'Portfolio', elem: null, badge: null, pos: { x: 0, y: 0 }, K: null, score: 0, alpha: 0 },
      { id: 'lab', keyLabel: 'K₂', name: 'AI Lab', elem: null, badge: null, pos: { x: 0, y: 0 }, K: null, score: 0, alpha: 0 },
      { id: 'github', keyLabel: 'K₃', name: 'GitHub', elem: null, badge: null, pos: { x: 0, y: 0 }, K: null, score: 0, alpha: 0 },
      { id: 'server', keyLabel: 'K₄', name: 'Nœud Serveur', elem: null, badge: null, pos: { x: 0, y: 0 }, K: null, score: 0, alpha: 0 },
      { id: 'inspector', keyLabel: 'K₅', name: 'Inspecteur', elem: null, badge: null, pos: { x: 0, y: 0 }, K: null, score: 0, alpha: 0 }
    ];

    // Particules synaptiques le long des faisceaux d'attention
    this.synapticParticles = [];
    for (let i = 0; i < 48; i++) {
      this.synapticParticles.push({
        targetIndex: i % this.tokens.length,
        progress: Math.random(),
        speed: 0.012 + Math.random() * 0.018
      });
    }

    // Physique 3D de la carte (Parallaxe magnétique)
    this.card = document.getElementById('tilt-card');
    this.cardTilt = {
      rx: 0,
      ry: 0,
      tx: 0,
      ty: 0
    };

    // Statistiques FPS & Télémétrie
    this.lastFrameTime = performance.now();
    this.fps = 60;
    this.frameCount = 0;
    this.lastFpsUpdate = performance.now();

    // Éléments du HUD
    this.hudArgmax = document.getElementById('hud-argmax');
    this.hudFps = document.getElementById('hud-fps');
    this.hudHead = document.getElementById('hud-head');
    this.metricQnorm = document.getElementById('metric-qnorm');
    this.metricSpeed = document.getElementById('metric-speed');
    this.softmaxContainer = document.getElementById('softmax-bars');
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());

    this.initSpatialGrid();
    this.initTokenEmbeddings();
    this.initListeners();
    this.initInspectorUI();

    // Démarrage de la boucle d'animation
    requestAnimationFrame((t) => this.render(t));
  }

  resize() {
    this.width = this.canvas.width = window.innerWidth;
    this.height = this.canvas.height = window.innerHeight;
    this.updateTokenPositions();
  }

  /* --------------------------------------------------------------------------
   * 1. Initialisation des Keys (K) : Grille Spatiale & Tokens DOM
   * -------------------------------------------------------------------------- */
  initSpatialGrid() {
    this.patchKeys = [];
    for (let r = 0; r < this.gridRows; r++) {
      for (let c = 0; c < this.gridCols; c++) {
        const u = (c + 0.5) / this.gridCols;
        const v = (r + 0.5) / this.gridRows;

        const K = new Float32Array(this.d_k);
        for (let i = 0; i < this.d_k / 2; i++) {
          const freq = 1 / Math.pow(1000, (2 * i) / this.d_k);
          K[2 * i] = Math.sin(u * Math.PI * 2 * freq) * 0.7;
          K[2 * i + 1] = Math.cos(v * Math.PI * 2 * freq) * 0.7;
        }

        K[0] += Math.sin(c * 1.5) * 0.25;
        K[1] += Math.cos(r * 1.5) * 0.25;

        this.normalizeVector(K);
        this.patchKeys.push(K);
      }
    }
  }

  initTokenEmbeddings() {
    this.tokens.forEach((token, idx) => {
      token.elem = document.querySelector(`[data-token-id="${token.id}"]`);
      token.badge = document.getElementById(`score-${token.id}`);

      token.K = new Float32Array(this.d_k);
      const seed = (idx + 1) * 4.2;
      for (let i = 0; i < this.d_k; i++) {
        token.K[i] = Math.sin(seed * (i + 1)) * 0.6;
      }

      if (token.id === 'portfolio') token.K[2] += 0.85;
      if (token.id === 'lab') token.K[5] += 0.95;
      if (token.id === 'github') token.K[8] += 0.85;
      if (token.id === 'server') token.K[12] += 0.95;

      this.normalizeVector(token.K);
    });

    this.updateTokenPositions();
  }

  updateTokenPositions() {
    this.tokens.forEach((token) => {
      if (!token.elem) return;
      const rect = token.elem.getBoundingClientRect();
      // Point d'ancrage précis sur l'icône/gauche du composant pour les cartes
      if (token.id === 'hero') {
        token.pos = {
          x: rect.left + rect.width / 2,
          y: rect.top + 40
        };
      } else if (token.id === 'inspector') {
        token.pos = {
          x: rect.left + 32,
          y: rect.top + rect.height / 2
        };
      } else {
        token.pos = {
          x: rect.left + 36,
          y: rect.top + rect.height / 2
        };
      }
    });
  }

  /* --------------------------------------------------------------------------
   * 2. Événements Curseur -> Projection du Vecteur Latent Q
   * -------------------------------------------------------------------------- */
  initListeners() {
    window.addEventListener('mousemove', (e) => {
      this.mouse.targetX = e.clientX;
      this.mouse.targetY = e.clientY;
      this.mouse.active = true;
    });

    window.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        this.mouse.targetX = e.touches[0].clientX;
        this.mouse.targetY = e.touches[0].clientY;
        this.mouse.active = true;
      }
    }, { passive: true });

    window.addEventListener('scroll', () => this.updateTokenPositions());

    const headBtns = document.querySelectorAll('.head-btn');
    headBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        headBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentHead = parseInt(btn.getAttribute('data-head'), 10) || 0;
        if (this.hudHead) {
          const names = ['#0 (Spatial)', '#1 (Sémantique)', '#2 (Vélocité)'];
          this.hudHead.textContent = names[this.currentHead] || `#${this.currentHead}`;
        }
      });
    });
  }

  updateQueryVector(timeSec) {
    const lerp = 0.22;
    this.mouse.x += (this.mouse.targetX - this.mouse.x) * lerp;
    this.mouse.y += (this.mouse.targetY - this.mouse.y) * lerp;

    this.mouse.vx = this.mouse.x - this.mouse.prevX;
    this.mouse.vy = this.mouse.y - this.mouse.prevY;
    this.mouse.speed = Math.sqrt(this.mouse.vx * this.mouse.vx + this.mouse.vy * this.mouse.vy);

    this.mouse.prevX = this.mouse.x;
    this.mouse.prevY = this.mouse.y;

    const u = this.mouse.x / this.width;
    const v = this.mouse.y / this.height;

    for (let i = 0; i < this.d_k / 2; i++) {
      const freq = 1 / Math.pow(1000, (2 * i) / this.d_k);
      const pe_x = Math.sin(u * Math.PI * 2 * freq);
      const pe_y = Math.cos(v * Math.PI * 2 * freq);
      const timeOsc = Math.sin(timeSec * 1.8 + i) * 0.15;

      this.Q[2 * i] = pe_x + timeOsc;
      this.Q[2 * i + 1] = pe_y + timeOsc;
    }

    if (this.currentHead === 1) {
      for (let i = 4; i < 16; i++) this.Q[i] *= 1.4;
    } else if (this.currentHead === 2) {
      const vNorm = Math.min(this.mouse.speed / 20, 1.5);
      this.Q[0] += this.mouse.vx * 0.05 * vNorm;
      this.Q[1] += this.mouse.vy * 0.05 * vNorm;
    }

    this.normalizeVector(this.Q);
  }

  normalizeVector(vec) {
    let norm = 0;
    for (let i = 0; i < vec.length; i++) norm += vec[i] * vec[i];
    norm = Math.sqrt(norm);
    if (norm > 0.00001) {
      const inv = 1 / norm;
      for (let i = 0; i < vec.length; i++) vec[i] *= inv;
    }
  }

  /* --------------------------------------------------------------------------
   * 3. Calcul Scaled Dot-Product Attention & Softmax Amplifié
   * -------------------------------------------------------------------------- */
  computeAttention() {
    // 3.1 Grille spatiale
    const totalPatches = this.patchKeys.length;
    for (let i = 0; i < totalPatches; i++) {
      const K = this.patchKeys[i];
      let dot = 0;
      for (let d = 0; d < this.d_k; d++) {
        dot += this.Q[d] * K[d];
      }
      this.patchAttention[i] = dot / this.sqrt_dk;
    }

    // 3.2 Tokens DOM interactifs avec proximité géométrique renforcée
    let maxTokenScore = -Infinity;
    let sumExp = 0;
    const scores = [];

    this.tokens.forEach((token) => {
      const dx = (this.mouse.x - token.pos.x) / this.width;
      const dy = (this.mouse.y - token.pos.y) / this.height;
      const distSq = dx * dx + dy * dy;
      
      // Proximité exponentielle accentuée
      const proximity = Math.exp(-distSq * 32);

      let dot = 0;
      for (let d = 0; d < this.d_k; d++) {
        dot += this.Q[d] * token.K[d];
      }

      // Logit d'attention : le terme de proximité amplifie le logit quand on s'approche
      const score = (dot / this.sqrt_dk) * 0.75 + proximity * 4.2;
      token.score = score;
      scores.push(score);
      if (score > maxTokenScore) maxTokenScore = score;
    });

    // Softmax avec température nette tau = 0.65
    const tau = this.temperature;
    for (let i = 0; i < this.tokens.length; i++) {
      const expVal = Math.exp((scores[i] - maxTokenScore) / tau);
      this.tokens[i].expVal = expVal;
      sumExp += expVal;
    }

    let argmaxToken = this.tokens[0];
    let maxAlpha = 0;

    for (let i = 0; i < this.tokens.length; i++) {
      const alpha = sumExp > 0 ? this.tokens[i].expVal / sumExp : 0;
      // Lissage réactif
      this.tokens[i].alpha = this.tokens[i].alpha * 0.75 + alpha * 0.25;

      if (this.tokens[i].alpha > maxAlpha) {
        maxAlpha = this.tokens[i].alpha;
        argmaxToken = this.tokens[i];
      }
    }

    this.argmaxToken = argmaxToken;
    this.updateDOMTokenHighlights();
  }

  updateDOMTokenHighlights() {
    this.tokens.forEach((token) => {
      const isMax = token === this.argmaxToken && token.alpha > 0.4;

      if (token.elem && token.elem.classList.contains('hub-card')) {
        token.elem.classList.toggle('max-attention', isMax);
      }

      if (token.badge) {
        token.badge.textContent = `α: ${token.alpha.toFixed(2)}`;
        token.badge.classList.toggle('active', isMax);
      }
    });

    const heroPill = document.getElementById('score-hero');
    if (heroPill) {
      const val = heroPill.querySelector('.score-val');
      if (val) val.textContent = this.tokens[0].alpha.toFixed(2);
    }

    if (this.hudArgmax && this.argmaxToken) {
      this.hudArgmax.textContent = `${this.argmaxToken.name} (${(this.argmaxToken.alpha * 100).toFixed(0)}%)`;
    }
  }

  /* --------------------------------------------------------------------------
   * 4. Rendu Visuel Canvas : Heatmap, Faisceaux Softmax & Ancrages Keys
   * -------------------------------------------------------------------------- */
  render(timestamp) {
    const timeSec = timestamp * 0.001;

    // Calcul FPS
    this.frameCount++;
    if (timestamp - this.lastFpsUpdate >= 500) {
      this.fps = Math.round((this.frameCount * 1000) / (timestamp - this.lastFpsUpdate));
      this.frameCount = 0;
      this.lastFpsUpdate = timestamp;
      if (this.hudFps) this.hudFps.textContent = this.fps;
    }

    this.updateQueryVector(timeSec);
    this.computeAttention();

    // Mise à jour de la parallaxe 3D magnétique couplée à Q
    this.updateCardTilt();

    this.ctx.clearRect(0, 0, this.width, this.height);

    // 4.1 Heatmap spatiale
    this.drawAttentionHeatmap();

    // 4.2 Grille de tokens
    this.drawTokenGrid();

    // 4.3 Faisceaux d'attention Softmax
    this.drawAttentionBeams(timeSec);

    // 4.4 Points d'ancrage Keys & micro-badges
    this.drawKeyAnchors(timeSec);

    // 4.5 Réticule Query (Curseur)
    this.drawQueryReticle();

    // 4.6 Inspecteur Softmax
    this.updateInspectorMetrics();

    requestAnimationFrame((t) => this.render(t));
  }

  drawAttentionHeatmap() {
    const cellW = this.width / this.gridCols;
    const cellH = this.height / this.gridRows;

    for (let r = 0; r < this.gridRows; r++) {
      for (let c = 0; c < this.gridCols; c++) {
        const idx = r * this.gridCols + c;
        const score = this.patchAttention[idx];
        const intensity = Math.max(0, Math.min(1, (score + 0.3) * 0.85));
        if (intensity < 0.05) continue;

        const cx = (c + 0.5) * cellW;
        const cy = (r + 0.5) * cellH;
        const radius = Math.max(cellW, cellH) * 1.8;

        const grad = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        const alphaGrad = intensity * 0.20;
        grad.addColorStop(0, `rgba(56, 189, 248, ${alphaGrad})`);
        grad.addColorStop(0.45, `rgba(129, 140, 248, ${alphaGrad * 0.55})`);
        grad.addColorStop(1, 'rgba(7, 8, 12, 0)');

        this.ctx.fillStyle = grad;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }

    // Halo direct sous le curseur Query (Q)
    const cursorGlowRadius = 240;
    const qGrad = this.ctx.createRadialGradient(
      this.mouse.x, this.mouse.y, 0,
      this.mouse.x, this.mouse.y, cursorGlowRadius
    );
    qGrad.addColorStop(0, 'rgba(56, 189, 248, 0.28)');
    qGrad.addColorStop(0.35, 'rgba(129, 140, 248, 0.12)');
    qGrad.addColorStop(1, 'rgba(7, 8, 12, 0)');

    this.ctx.fillStyle = qGrad;
    this.ctx.beginPath();
    this.ctx.arc(this.mouse.x, this.mouse.y, cursorGlowRadius, 0, Math.PI * 2);
    this.ctx.fill();
  }

  drawTokenGrid() {
    const cellW = this.width / this.gridCols;
    const cellH = this.height / this.gridRows;

    this.ctx.save();
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
    for (let r = 0; r <= this.gridRows; r++) {
      for (let c = 0; c <= this.gridCols; c++) {
        this.ctx.fillRect(c * cellW - 1, r * cellH - 1, 2, 2);
      }
    }
    this.ctx.restore();
  }

  /**
   * Faisceaux d'attention avec vraie dynamique exponentielle Softmax :
   * Le rayon vainqueur s'épaissit et s'illumine puissamment, les autres s'estompent.
   */
  drawAttentionBeams(timeSec) {
    const qx = this.mouse.x;
    const qy = this.mouse.y;

    this.tokens.forEach((token, idx) => {
      const alpha = token.alpha;
      // Les rayons de faible poids s'estompent presque totalement
      if (alpha < 0.03) return;

      const kx = token.pos.x;
      const ky = token.pos.y;

      const midX = (qx + kx) / 2;
      const midY = (qy + ky) / 2 - 25;

      const isWinner = token === this.argmaxToken && alpha > 0.45;

      // Courbe d'amplification exponentielle du Softmax
      const expAlpha = Math.pow(alpha, 1.4);

      this.ctx.save();

      if (isWinner) {
        // --- FAISCEAU VAINQUEUR HYPER-SATURÉ & ÉPAIS ---
        // 1. Halo néon large
        this.ctx.beginPath();
        this.ctx.moveTo(qx, qy);
        this.ctx.quadraticCurveTo(midX, midY, kx, ky);
        this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
        this.ctx.lineWidth = 9 + alpha * 8;
        this.ctx.shadowColor = '#38bdf8';
        this.ctx.shadowBlur = 24;
        this.ctx.stroke();

        // 2. Faisceau cyan/or saturé
        this.ctx.beginPath();
        this.ctx.moveTo(qx, qy);
        this.ctx.quadraticCurveTo(midX, midY, kx, ky);
        const winGrad = this.ctx.createLinearGradient(qx, qy, kx, ky);
        winGrad.addColorStop(0, `rgba(56, 189, 248, ${0.85 + alpha * 0.15})`);
        winGrad.addColorStop(0.7, `rgba(129, 140, 248, 0.9)`);
        winGrad.addColorStop(1, `rgba(251, 191, 36, 0.95)`);
        this.ctx.strokeStyle = winGrad;
        this.ctx.lineWidth = 3.5 + alpha * 4.5;
        this.ctx.stroke();

        // 3. Cœur laser blanc incandescent
        this.ctx.beginPath();
        this.ctx.moveTo(qx, qy);
        this.ctx.quadraticCurveTo(midX, midY, kx, ky);
        this.ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(1, alpha * 1.3)})`;
        this.ctx.lineWidth = 1.6;
        this.ctx.shadowBlur = 0;
        this.ctx.stroke();

      } else {
        // --- FAISCEAU SECONDAIRE ATTÉNUÉ & DISCRET ---
        const beamAlpha = expAlpha * 0.35;
        const beamWidth = 0.8 + expAlpha * 1.5;

        this.ctx.beginPath();
        this.ctx.moveTo(qx, qy);
        this.ctx.quadraticCurveTo(midX, midY, kx, ky);
        this.ctx.strokeStyle = `rgba(129, 140, 248, ${beamAlpha})`;
        this.ctx.lineWidth = beamWidth;
        this.ctx.stroke();
      }

      // Particules d'activation synaptique
      this.synapticParticles.forEach((p) => {
        if (p.targetIndex === idx) {
          const speedMultiplier = isWinner ? 1.6 : 0.8;
          p.progress += p.speed * speedMultiplier;
          if (p.progress > 1) p.progress = 0;

          const t = p.progress;
          const px = (1 - t) * (1 - t) * qx + 2 * (1 - t) * t * midX + t * t * kx;
          const py = (1 - t) * (1 - t) * qy + 2 * (1 - t) * t * midY + t * t * ky;

          this.ctx.beginPath();
          const pSize = isWinner ? 3.0 : 1.8;
          this.ctx.arc(px, py, pSize, 0, Math.PI * 2);
          this.ctx.fillStyle = isWinner ? '#ffffff' : `rgba(255, 255, 255, ${expAlpha * 0.6})`;
          this.ctx.shadowColor = '#38bdf8';
          this.ctx.shadowBlur = isWinner ? 12 : 4;
          this.ctx.fill();
        }
      });

      this.ctx.restore();
    });
  }

  /**
   * Ancrages des cibles (K / Keys) :
   * Point d'impact, pulsation discrète et micro-badge "K_i • α: 0.82"
   */
  drawKeyAnchors(timeSec) {
    this.tokens.forEach((token, idx) => {
      const alpha = token.alpha;
      const kx = token.pos.x;
      const ky = token.pos.y;
      const isWinner = token === this.argmaxToken && alpha > 0.4;

      this.ctx.save();

      // 1. Onde de choc / pulsation discrète au point d'impact
      const pulsePhase = (timeSec * 2.2 + idx * 0.35) % 1;
      const pulseRadius = 5 + pulsePhase * (12 + alpha * 14);
      const pulseAlpha = (1 - pulsePhase) * (0.25 + alpha * 0.65);

      this.ctx.beginPath();
      this.ctx.arc(kx, ky, pulseRadius, 0, Math.PI * 2);
      this.ctx.strokeStyle = isWinner 
        ? `rgba(56, 189, 248, ${pulseAlpha})` 
        : `rgba(129, 140, 248, ${pulseAlpha * 0.4})`;
      this.ctx.lineWidth = isWinner ? 1.4 : 0.8;
      this.ctx.stroke();

      // 2. Point d'impact focal (Dot central)
      const dotRadius = isWinner ? 4.5 : 2.5;
      this.ctx.beginPath();
      this.ctx.arc(kx, ky, dotRadius, 0, Math.PI * 2);
      this.ctx.fillStyle = isWinner ? '#38bdf8' : 'rgba(148, 163, 184, 0.7)';
      this.ctx.shadowColor = '#38bdf8';
      this.ctx.shadowBlur = isWinner ? 14 : 4;
      this.ctx.fill();

      // 3. Micro-badge "K_i • α: 0.82" en temps réel
      if (alpha > 0.06) {
        const labelText = `${token.keyLabel} • α: ${alpha.toFixed(2)}`;
        this.ctx.font = '600 10px "JetBrains Mono", monospace';
        const textW = this.ctx.measureText(labelText).width;
        const badgeW = textW + 12;
        const badgeH = 18;
        const bx = kx + 12;
        const by = ky - 9;

        // Tracé de la mini-ligne connectrice entre le dot d'impact et le badge
        this.ctx.beginPath();
        this.ctx.moveTo(kx + dotRadius, ky);
        this.ctx.lineTo(bx, by);
        this.ctx.strokeStyle = isWinner ? 'rgba(56, 189, 248, 0.6)' : 'rgba(255, 255, 255, 0.15)';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        // Fond du micro-badge
        this.ctx.fillStyle = isWinner ? 'rgba(10, 14, 24, 0.92)' : 'rgba(10, 14, 24, 0.75)';
        this.ctx.strokeStyle = isWinner ? 'rgba(56, 189, 248, 0.65)' : 'rgba(255, 255, 255, 0.12)';
        this.ctx.lineWidth = 1;

        if (this.ctx.roundRect) {
          this.ctx.beginPath();
          this.ctx.roundRect(bx, by - badgeH / 2, badgeW, badgeH, 5);
          this.ctx.fill();
          this.ctx.stroke();
        } else {
          this.ctx.fillRect(bx, by - badgeH / 2, badgeW, badgeH);
          this.ctx.strokeRect(bx, by - badgeH / 2, badgeW, badgeH);
        }

        // Texte du badge avec couleur adaptative
        this.ctx.fillStyle = isWinner ? '#38bdf8' : 'rgba(148, 163, 184, 0.85)';
        this.ctx.shadowBlur = isWinner ? 8 : 0;
        this.ctx.fillText(labelText, bx + 6, by + 3.5);
      }

      this.ctx.restore();
    });
  }

  drawQueryReticle() {
    const { x, y } = this.mouse;

    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
    this.ctx.lineWidth = 1.3;

    // Cercle central pulsant
    this.ctx.beginPath();
    this.ctx.arc(x, y, 7, 0, Math.PI * 2);
    this.ctx.stroke();

    // Réticules en croix
    const arm = 14;
    this.ctx.beginPath();
    this.ctx.moveTo(x - arm, y);
    this.ctx.lineTo(x - 10, y);
    this.ctx.moveTo(x + 10, y);
    this.ctx.lineTo(x + arm, y);
    this.ctx.moveTo(x, y - arm);
    this.ctx.lineTo(x, y - 10);
    this.ctx.moveTo(x, y + 10);
    this.ctx.lineTo(x, y + arm);
    this.ctx.stroke();

    this.ctx.font = '600 10px "JetBrains Mono", monospace';
    this.ctx.fillStyle = '#38bdf8';
    this.ctx.fillText('Q', x + 10, y - 10);

    this.ctx.restore();
  }

  /* --------------------------------------------------------------------------
   * 5. Parallaxe 3D Magnétique : La carte s'oriente vers le vecteur d'attention Q
   * -------------------------------------------------------------------------- */
  updateCardTilt() {
    if (!this.card) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const bounds = this.card.getBoundingClientRect();
    const cardCenterX = bounds.left + bounds.width / 2;
    const cardCenterY = bounds.top + bounds.height / 2;

    const diffX = this.mouse.x - cardCenterX;
    const diffY = this.mouse.y - cardCenterY;

    // Calcul de l'attraction :
    // Quand le curseur s'éloigne vers le haut à gauche (diffX < 0, diffY < 0),
    // la carte pivote vers lui (rotateY négatif, rotateX orienté vers le haut)
    const targetRy = (diffX / (this.width / 2)) * 7.5;
    const targetRx = -(diffY / (this.height / 2)) * 7.5;

    // Légère translation physique (effet d'aimant vers le vecteur Q)
    const targetTx = (diffX / (this.width / 2)) * 14;
    const targetTy = (diffY / (this.height / 2)) * 10;

    // Lissage dynamique (amortissement physique)
    const ease = 0.085;
    this.cardTilt.rx += (targetRx - this.cardTilt.rx) * ease;
    this.cardTilt.ry += (targetRy - this.cardTilt.ry) * ease;
    this.cardTilt.tx += (targetTx - this.cardTilt.tx) * ease;
    this.cardTilt.ty += (targetTy - this.cardTilt.ty) * ease;

    this.card.style.transform = `perspective(1200px) translate3d(${this.cardTilt.tx.toFixed(2)}px, ${this.cardTilt.ty.toFixed(2)}px, 0) rotateX(${this.cardTilt.rx.toFixed(2)}deg) rotateY(${this.cardTilt.ry.toFixed(2)}deg)`;
  }

  /* --------------------------------------------------------------------------
   * 6. Inspecteur de Tenseurs & Softmax
   * -------------------------------------------------------------------------- */
  initInspectorUI() {
    const toggleBtn = document.getElementById('inspector-toggle');
    const panel = document.getElementById('inspector-panel');

    if (toggleBtn && panel) {
      toggleBtn.addEventListener('click', () => {
        const isHidden = panel.hidden;
        panel.hidden = !isHidden;
        toggleBtn.setAttribute('aria-expanded', String(isHidden));
        if (isHidden) this.updateTokenPositions();
      });
    }

    if (this.softmaxContainer) {
      this.softmaxContainer.innerHTML = '';
      this.tokens.forEach((token) => {
        const row = document.createElement('div');
        row.className = 'softmax-row';
        row.innerHTML = `
          <span class="softmax-label">${token.keyLabel} • ${token.name}</span>
          <div class="softmax-track">
            <div class="softmax-fill" id="bar-${token.id}"></div>
          </div>
          <span class="softmax-num" id="val-${token.id}">0%</span>
        `;
        this.softmaxContainer.appendChild(row);
      });
    }
  }

  updateInspectorMetrics() {
    const panel = document.getElementById('inspector-panel');
    if (panel && !panel.hidden) {
      let qnorm = 0;
      for (let i = 0; i < this.d_k; i++) qnorm += this.Q[i] * this.Q[i];
      qnorm = Math.sqrt(qnorm);
      if (this.metricQnorm) this.metricQnorm.textContent = qnorm.toFixed(3);

      if (this.metricSpeed) this.metricSpeed.textContent = `${Math.round(this.mouse.speed * 60)} px/s`;

      this.tokens.forEach((token) => {
        const bar = document.getElementById(`bar-${token.id}`);
        const val = document.getElementById(`val-${token.id}`);
        const percent = Math.round(token.alpha * 100);
        const isMax = token === this.argmaxToken && token.alpha > 0.4;

        if (bar) {
          bar.style.width = `${percent}%`;
          bar.classList.toggle('highlight', isMax);
        }
        if (val) {
          val.textContent = `${percent}%`;
          val.classList.toggle('highlight', isMax);
        }
      });
    }
  }
}
