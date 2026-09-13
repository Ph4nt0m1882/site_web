# Ph4nt0m // AI & Systems Engineer — Neural Hub

Page d'accueil moderne pour serveur d'ingénierie en Intelligence Artificielle, dotée d'une carte centrale en verre dépoli (glassmorphism 3D réagissant au curseur) et d'un arrière-plan interactif **Attention Heatmap** simulant en temps réel le calcul d'attention d'un **Transformer** :

$$\text{Scores} = \frac{Q \cdot K^T}{\sqrt{d_k}}$$

La page d'erreur système originale reste active sur [`404.html`](404.html) pour intercepter toute route invalide.

---

## 🧠 Mécanique Visuelle & Mathématique

1. **Curseur = Query ($Q$)** :
   - Projette un vecteur latent dynamique en dimension $d_k = 32$.
   - Combine les coordonnées d'écran normalisées $(u, v)$, la vélocité $(\Delta x, \Delta y)$, un **Positional Encoding sinusoïdal** 2D et des harmoniques temporelles.
2. **Éléments Interactifs & Grille = Keys ($K$) et Values ($V$)** :
   - Les boutons et blocs du Hub (Portfolio, Lab IA, GitHub, Nœud Serveur) possèdent chacun leur embedding caractéristique.
   - Une grille de patchs spatiaux (style Vision Transformer / ViT) couvre le fond d'écran.
3. **Calcul d'Attention & Softmax à 60 FPS** :
   - Évaluation instantanée du produit scalaire mis à l'échelle : $\text{Scores} = \frac{Q \cdot K^T}{\sqrt{d_k}}$.
   - Normalisation Softmax : $\alpha_i = \frac{\exp(s_i / \tau)}{\sum_j \exp(s_j / \tau)}$.
   - Affichage d'une **heatmap thermique Cyberpunk/Inferno**, de **faisceaux synaptiques lumineux** reliant $Q$ aux cibles actives, et de jauges d'attention $\alpha$ en temps réel sur chaque carte.
   - **Inspecteur de Tenseurs repliable** pour examiner la distribution Softmax et basculer entre différentes têtes d'attention (Spatial, Sémantique, Vélocité).

---

## 📁 Structure des Fichiers

```
/home/phantom/Workspaces/site_web/
├── index.html        # Hub d'accueil IA (Attention Heatmap, carte 3D, tokens K_i)
├── style.css         # Styles modernes pour le hub IA, la heatmap et les jauges
├── script.js         # Moteur mathématique d'Attention (Q, K, Softmax, Canvas 60 FPS)
├── 404.html          # Page d'erreur système 404 (indépendante)
├── 404.css           # Styles dédiés pour la page 404
├── 404.js            # Script dédié pour la page 404
├── httpd.conf        # Configuration Apache avec routage ErrorDocument 404
├── .htaccess         # Directives Apache
├── .nojekyll         # Compatibilité GitHub Pages
├── .github/
│   └── workflows/
│       └── deploy.yml # Déploiement automatique GitHub Pages
├── docker-compose.yml # Fichier Docker Compose
├── run.sh            # Script de lancement rapide
└── README.md         # Documentation
```

---

## 🚀 Démarrage avec Docker

### Option 1 : Votre commande personnalisée (en montant `/tmp`)

Les fichiers ont déjà été synchronisés dans `/tmp` :

```bash
docker run -p 80:80 -v /tmp:/usr/local/apache2/htdocs/:ro -d quay.io/ocp-edge-qe/httpd
```

### Option 2 : Depuis le dossier du projet (avec redirection 404 native)

```bash
docker run -p 80:80 \
  -v "$(pwd)":/usr/local/apache2/htdocs/:ro \
  -v "$(pwd)/httpd.conf":/usr/local/apache2/conf/httpd.conf:ro \
  -d quay.io/ocp-edge-qe/httpd
```

### Option 3 : Avec le script fourni ou Docker Compose

```bash
./run.sh 80
# OU
docker compose up -d
```

---

## 🌐 Déploiement GitHub Pages

Le workflow automatique [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) est préconfiguré :
1. Poussez vers GitHub : `git push origin main`
2. Dans **Settings** > **Pages** sur GitHub, choisissez la source **GitHub Actions**.
3. Votre hub sera en ligne sur `https://<compte>.github.io/site_web/`.
