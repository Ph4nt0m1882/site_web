/**
 * Attention Heatmap & Transformer Runtime Visual Engine
 * Formule : Scores = (Q · Kᵀ) / √d_k -> Softmax -> Attention Map
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

    // Dimension latente des vecteurs (ex: d_k = 32)
    this.d_k = 32;
    this.sqrt_dk = Math.sqrt(this.d_k);
    this.temperature = 1.0;
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
    this.patchKeys = []; // Array of Float32Array
    this.patchAttention = new Float32Array(this.gridCols * this.gridRows);

    // Tokens DOM interactifs (Keys & Values)
    this.tokens = [
      { id: 'hero', name: 'Profil Ph4nt0m', elem: null, badge: null, pos: { x: 0, y: 0 }, K: null, score: 0, alpha: 0 },
      { id: 'portfolio', name: 'Portfolio', elem: null, badge: null, pos: { x: 0, y: 0 }, K: null, score: 0, alpha: 0 },
      { id: 'lab', name: 'AI Lab', elem: null, badge: null, pos: { x: 0, y: 0 }, K: null, score: 0, alpha: 0 },
      { id: 'github', name: 'GitHub', elem: null, badge: null, pos: { x: 0, y: 0 }, K: null, score: 0, alpha: 0 },
      { id: 'server', name: 'Nœud Serveur', elem: null, badge: null, pos: { x: 0, y: 0 }, K: null, score: 0, alpha: 0 },
      { id: 'inspector', name: 'Inspecteur', elem: null, badge: null, pos: { x: 0, y: 0 }, K: null, score: 0, alpha: 0 }
    ];

    // Particules synaptiques le long des faisceaux d'attention
    this.synapticParticles = [];
    for (let i = 0; i < 36; i++) {
      this.synapticParticles.push({
        targetIndex: 0,
        progress: Math.random(),
        speed: 0.008 + Math.random() * 0.012
      });
    }

    // Statistiques FPS & Télémétrie
    this.lastFrameTime = performance.now();
    this.fps = 60;
    this.frameCount = 0;
    this.lastFpsUpdate = performance.now();

    // DOM Télémétrie & HUD
    this.hudArgmax = document.getElementById('hud-argmax');
    this.hudFps = document.getElementById('hud-fps');
    this.hudHead = document.getElementById('hud-head');
    this.metricQnorm = document.getElementById('metric-qnorm');
    this.metricSpeed = document.getElementById('metric-speed');
    this.softmaxContainer = document.getElementById('softmax-bars');

    this.card = document.getElementById('tilt-card');
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());

    this.initSpatialGrid();
    this.initTokenEmbeddings();
    this.initListeners();
    this.initTiltEffect();
    this.initInspectorUI();

    // Boucle de rendu mathématique à 60 FPS
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
    const totalPatches = this.gridCols * this.gridRows;

    for (let r = 0; r < this.gridRows; r++) {
      for (let c = 0; c < this.gridCols; c++) {
        const u = (c + 0.5) / this.gridCols;
        const v = (r + 0.5) / this.gridRows;

        const K = new Float32Array(this.d_k);
        // Positional Encoding sinusoïdal 2D (Vaswani et al. adapté en 2D)
        for (let i = 0; i < this.d_k / 2; i++) {
          const freq = 1 / Math.pow(1000, (2 * i) / this.d_k);
          K[2 * i] = Math.sin(u * Math.PI * 2 * freq) * 0.7;
          K[2 * i + 1] = Math.cos(v * Math.PI * 2 * freq) * 0.7;
        }

        // Bruit harmonique unique au patch
        K[0] += Math.sin(c * 1.5) * 0.25;
        K[1] += Math.cos(r * 1.5) * 0.25;

        // Normalisation L2 du vecteur clé
        this.normalizeVector(K);
        this.patchKeys.push(K);
      }
    }
  }

  initTokenEmbeddings() {
    this.tokens.forEach((token, idx) => {
      token.elem = document.querySelector(`[data-token-id="${token.id}"]`);
      token.badge = document.getElementById(`score-${token.id}`);

      // Vecteur sémantique caractéristique de chaque token (dimension d_k)
      token.K = new Float32Array(this.d_k);

      // Empreinte sémantique spécifique
      const seed = (idx + 1) * 3.7;
      for (let i = 0; i < this.d_k; i++) {
        token.K[i] = Math.sin(seed * (i + 1)) * 0.6;
      }

      // Renforcer certaines dimensions sémantiques
      if (token.id === 'portfolio') token.K[2] += 0.8;
      if (token.id === 'lab') token.K[5] += 0.9;
      if (token.id === 'github') token.K[8] += 0.8;
      if (token.id === 'server') token.K[12] += 0.9;

      this.normalizeVector(token.K);
    });

    this.updateTokenPositions();
  }

  updateTokenPositions() {
    this.tokens.forEach((token) => {
      if (!token.elem) return;
      const rect = token.elem.getBoundingClientRect();
      token.pos = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
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

    // Sélecteur de têtes d'attention (Multi-Head)
    const headBtns = document.querySelectorAll('.head-btn');
    headBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
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
    // Lissage du curseur pour une vélocité stable
    const lerp = 0.22;
    this.mouse.x += (this.mouse.targetX - this.mouse.x) * lerp;
    this.mouse.y += (this.mouse.targetY - this.mouse.y) * lerp;

    this.mouse.vx = this.mouse.x - this.mouse.prevX;
    this.mouse.vy = this.mouse.y - this.mouse.prevY;
    this.mouse.speed = Math.sqrt(this.mouse.vx * this.mouse.vx + this.mouse.vy * this.mouse.vy);

    this.mouse.prevX = this.mouse.x;
    this.mouse.prevY = this.mouse.y;

    // Coordonnées normalisées [0, 1]
    const u = this.mouse.x / this.width;
    const v = this.mouse.y / this.height;

    // Construction du vecteur Query Q(t)
    for (let i = 0; i < this.d_k / 2; i++) {
      const freq = 1 / Math.pow(1000, (2 * i) / this.d_k);

      // Positional Encoding sinusoïdal
      const pe_x = Math.sin(u * Math.PI * 2 * freq);
      const pe_y = Math.cos(v * Math.PI * 2 * freq);

      // Composante temporelle harmonique (fluctuation quantique des neurones)
      const timeOsc = Math.sin(timeSec * 1.8 + i) * 0.15;

      this.Q[2 * i] = pe_x + timeOsc;
      this.Q[2 * i + 1] = pe_y + timeOsc;
    }

    // Modulation selon la tête d'attention active
    if (this.currentHead === 1) {
      // Tête sémantique : amplification des dimensions intermédiaires
      for (let i = 4; i < 16; i++) this.Q[i] *= 1.4;
    } else if (this.currentHead === 2) {
      // Tête vélocité : injection de la vitesse
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
   * 3. Calcul Scaled Dot-Product Attention : Scores = (Q · Kᵀ) / √d_k
   * -------------------------------------------------------------------------- */
  computeAttention() {
    // 3.1 Calcul sur la grille spatiale de fond
    const totalPatches = this.patchKeys.length;
    let maxPatchScore = -Infinity;

    for (let i = 0; i < totalPatches; i++) {
      const K = this.patchKeys[i];
      let dot = 0;
      for (let d = 0; d < this.d_k; d++) {
        dot += this.Q[d] * K[d];
      }
      // Scaled dot-product
      const score = dot / this.sqrt_dk;
      this.patchAttention[i] = score;
      if (score > maxPatchScore) maxPatchScore = score;
    }

    // 3.2 Calcul sur les tokens DOM interactifs
    let maxTokenScore = -Infinity;
    let sumExp = 0;
    const scores = [];

    this.tokens.forEach((token) => {
      // Intégration de la proximité physique au curseur + embedding
      const dx = (this.mouse.x - token.pos.x) / this.width;
      const dy = (this.mouse.y - token.pos.y) / this.height;
      const distSq = dx * dx + dy * dy;
      const proximity = Math.exp(-distSq * 18); // Proximité spatiale

      let dot = 0;
      for (let d = 0; d < this.d_k; d++) {
        dot += this.Q[d] * token.K[d];
      }

      // Combinaison : Produit scalaire mis à l'échelle + bias de position
      const score = (dot / this.sqrt_dk) * 0.65 + proximity * 0.85;
      token.score = score;
      scores.push(score);
      if (score > maxTokenScore) maxTokenScore = score;
    });

    // Normalisation Softmax : exp(s_i / tau) / sum(exp(s_j / tau))
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
      // Lissage pour l'affichage visuel
      this.tokens[i].alpha = this.tokens[i].alpha * 0.8 + alpha * 0.2;

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
      const isMax = token === this.argmaxToken && token.alpha > 0.35;

      // Mise à jour de la classe visuelle
      if (token.elem && token.elem.classList.contains('hub-card')) {
        token.elem.classList.toggle('max-attention', isMax);
      }

      // Mise à jour du badge alpha
      if (token.badge) {
        token.badge.textContent = `α: ${token.alpha.toFixed(2)}`;
        token.badge.classList.toggle('active', isMax);
      }
    });

    // Mise à jour de l'en-tête hero
    const heroPill = document.getElementById('score-hero');
    if (heroPill) {
      const val = heroPill.querySelector('.score-val');
      if (val) val.textContent = this.tokens[0].alpha.toFixed(2);
    }

    // HUD Argmax
    if (this.hudArgmax && this.argmaxToken) {
      this.hudArgmax.textContent = `${this.argmaxToken.name} (${(this.argmaxToken.alpha * 100).toFixed(0)}%)`;
    }
  }

  /* --------------------------------------------------------------------------
   * 4. Rendu Visuel Canvas : Attention Heatmap & Faisceaux Synaptiques
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

    // Actualisation mathématique du vecteur Q et de l'attention
    this.updateQueryVector(timeSec);
    this.computeAttention();

    // Effacement de la toile
    this.ctx.clearRect(0, 0, this.width, this.height);

    // 4.1 Dessin de la Heatmap d'Attention Spatiale
    this.drawAttentionHeatmap();

    // 4.2 Dessin de la Grille Subtile de Tokens
    this.drawTokenGrid();

    // 4.3 Dessin des Faisceaux d'Attention (Attention Beams de Q vers K_i)
    this.drawAttentionBeams();

    // 4.4 Dessin du réticule Query (Curseur)
    this.drawQueryReticle();

    // 4.5 Mise à jour de l'inspecteur Softmax si ouvert
    this.updateInspectorMetrics();

    requestAnimationFrame((t) => this.render(t));
  }

  drawAttentionHeatmap() {
    const cellW = this.width / this.gridCols;
    const cellH = this.height / this.gridRows;

    // Rayon d'interpolation gaussienne pour chaque patch
    for (let r = 0; r < this.gridRows; r++) {
      for (let c = 0; c < this.gridCols; c++) {
        const idx = r * this.gridCols + c;
        const score = this.patchAttention[idx];

        // Normalisation d'intensité [0, 1]
        const intensity = Math.max(0, Math.min(1, (score + 0.3) * 0.85));
        if (intensity < 0.05) continue;

        const cx = (c + 0.5) * cellW;
        const cy = (r + 0.5) * cellH;
        const radius = Math.max(cellW, cellH) * 1.8;

        const grad = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        
        // Palette Thermique Cyberpunk / Inferno : Indigo -> Cyan -> Amber -> Blanc
        const alphaGrad = intensity * 0.22;
        grad.addColorStop(0, `rgba(56, 189, 248, ${alphaGrad})`);
        grad.addColorStop(0.45, `rgba(129, 140, 248, ${alphaGrad * 0.6})`);
        grad.addColorStop(1, 'rgba(7, 8, 12, 0)');

        this.ctx.fillStyle = grad;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }

    // Halo thermique direct centré sur le curseur Query (Q)
    const cursorGlowRadius = 240;
    const qGrad = this.ctx.createRadialGradient(
      this.mouse.x, this.mouse.y, 0,
      this.mouse.x, this.mouse.y, cursorGlowRadius
    );
    qGrad.addColorStop(0, 'rgba(56, 189, 248, 0.25)');
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
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';

    // Petits points de matrice aux intersections des tokens
    for (let r = 0; r <= this.gridRows; r++) {
      for (let c = 0; c <= this.gridCols; c++) {
        const x = c * cellW;
        const y = r * cellH;
        this.ctx.fillRect(x - 1, y - 1, 2, 2);
      }
    }
    this.ctx.restore();
  }

  drawAttentionBeams() {
    // Relie le curseur Query (Q) aux tokens Keys (K_i) avec un faisceau lumineux proportionnel à alpha
    this.tokens.forEach((token, idx) => {
      if (token.alpha < 0.05) return;

      const qx = this.mouse.x;
      const qy = this.mouse.y;
      const kx = token.pos.x;
      const ky = token.pos.y;

      // Courbure de Bézier dynamique
      const midX = (qx + kx) / 2;
      const midY = (qy + ky) / 2 - 30;

      const beamAlpha = Math.min(0.85, token.alpha * 1.5);
      const beamWidth = 1 + token.alpha * 3.5;

      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.moveTo(qx, qy);
      this.ctx.quadraticCurveTo(midX, midY, kx, ky);

      // Dégradé de la ligne synaptique
      const grad = this.ctx.createLinearGradient(qx, qy, kx, ky);
      grad.addColorStop(0, `rgba(56, 189, 248, ${beamAlpha})`);
      grad.addColorStop(1, `rgba(129, 140, 248, ${beamAlpha * 0.4})`);

      this.ctx.strokeStyle = grad;
      this.ctx.lineWidth = beamWidth;
      this.ctx.stroke();

      // Particule glissante le long de la ligne synaptique
      this.synapticParticles.forEach((p) => {
        if (p.targetIndex === idx) {
          p.progress += p.speed;
          if (p.progress > 1) p.progress = 0;

          // Interpolation quadratique de Bézier
          const t = p.progress;
          const px = (1 - t) * (1 - t) * qx + 2 * (1 - t) * t * midX + t * t * kx;
          const py = (1 - t) * (1 - t) * qy + 2 * (1 - t) * t * midY + t * t * ky;

          this.ctx.beginPath();
          this.ctx.arc(px, py, 2.2, 0, Math.PI * 2);
          this.ctx.fillStyle = `rgba(255, 255, 255, ${beamAlpha})`;
          this.ctx.shadowColor = '#38bdf8';
          this.ctx.shadowBlur = 8;
          this.ctx.fill();
        }
      });

      this.ctx.restore();
    });
  }

  drawQueryReticle() {
    const { x, y } = this.mouse;

    this.ctx.save();
    // Réticule du vecteur Query
    this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
    this.ctx.lineWidth = 1.2;

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

    // Label discret 'Q'
    this.ctx.font = '10px "JetBrains Mono", monospace';
    this.ctx.fillStyle = '#38bdf8';
    this.ctx.fillText('Q', x + 10, y - 10);

    this.ctx.restore();
  }

  /* --------------------------------------------------------------------------
   * 5. Effet d'Inclinaison 3D (Tilt) sur la Carte Centrale
   * -------------------------------------------------------------------------- */
  initTiltEffect() {
    if (!this.card) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    window.addEventListener('mousemove', (e) => {
      const bounds = this.card.getBoundingClientRect();
      const cardCenterX = bounds.left + bounds.width / 2;
      const cardCenterY = bounds.top + bounds.height / 2;

      const diffX = e.clientX - cardCenterX;
      const diffY = e.clientY - cardCenterY;

      const rotateY = (diffX / (window.innerWidth / 2)) * 6.5;
      const rotateX = -(diffY / (window.innerHeight / 2)) * 6.5;

      this.card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`;
    });

    window.addEventListener('mouseleave', () => {
      this.card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
    });
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

    // Création initiale des lignes de barres softmax
    if (this.softmaxContainer) {
      this.softmaxContainer.innerHTML = '';
      this.tokens.forEach((token) => {
        const row = document.createElement('div');
        row.className = 'softmax-row';
        row.innerHTML = `
          <span class="softmax-label">${token.name}</span>
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
      // Norme ||Q||
      let qnorm = 0;
      for (let i = 0; i < this.d_k; i++) qnorm += this.Q[i] * this.Q[i];
      qnorm = Math.sqrt(qnorm);
      if (this.metricQnorm) this.metricQnorm.textContent = qnorm.toFixed(3);

      // Vitesse
      if (this.metricSpeed) this.metricSpeed.textContent = `${Math.round(this.mouse.speed * 60)} px/s`;

      // Barres de répartition softmax
      this.tokens.forEach((token) => {
        const bar = document.getElementById(`bar-${token.id}`);
        const val = document.getElementById(`val-${token.id}`);
        const percent = Math.round(token.alpha * 100);
        const isMax = token === this.argmaxToken && token.alpha > 0.35;

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
