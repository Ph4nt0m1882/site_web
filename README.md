# Phantom // AI & Systems Engineer — Neural Hub (Raspberry Pi 5 Edition)

Portail personnel et serveur d'accueil pour projets d'Intelligence Artificielle, optimisé pour un déploiement ultra-léger et économe en ressources sur **Raspberry Pi 5 (ARM64, 3 Go de RAM)** aux côtés de **Pi-hole** et d'un **reverse proxy Nginx**.

Comprend un fond interactif **Attention Heatmap dynamique** simulant en temps réel le calcul d'un Transformer :

$$\text{Scores} = \frac{Q \cdot K^T}{\sqrt{d_k}} \quad \xrightarrow{\text{Softmax}} \quad \alpha_i$$

---

## 🚀 Spécifications pour Raspberry Pi 5

- **Image de base** : `nginx:alpine` officielle multi-architecture (native `linux/arm64` pour RPi 5).
- **Empreinte mémoire** : **~5 à 20 Mo de RAM** seulement (avec un plafond strict `mem_limit: 64m` dans Docker Compose).
- **Cohabitation Pi-hole & Nginx** : Écoute locale par défaut sur `127.0.0.1:8085` pour ne pas entrer en conflit avec le port `80` utilisé par Pi-hole ou votre reverse proxy Nginx.
- **Performances** : Compression Gzip native activée et mise en cache des assets statiques pour un chargement instantané.
- **Page 404 native** : Routage Nginx renvoyant la page d'erreur système [`public/404.html`](public/404.html) avec le code HTTP 404 réel.

---

## 📁 Structure du Projet

```
/home/phantom/Workspaces/site_web/
├── public/                 # Assets statiques du site
│   ├── index.html          # Hub d'accueil IA (Attention Heatmap)
│   ├── style.css           # Styles modernes du hub
│   ├── script.js           # Moteur mathématique Canvas 60 FPS
│   ├── 404.html            # Page d'erreur 404 autonome
│   ├── 404.css             # Styles de la page 404
│   ├── 404.js              # Scripts de la page 404
│   └── .nojekyll           # Compatibilité GitHub Pages
├── nginx/
│   └── default.conf        # Configuration Nginx (Gzip, 404 native, cache)
├── .github/
│   └── workflows/
│       └── deploy.yml      # Pipeline CI/CD GitHub Pages
├── Dockerfile              # Image autonome de production (nginx:alpine)
├── docker-compose.yml      # Orchestration Docker Compose
├── .env                    # Variables d'environnement (PORT=8085)
├── .env.example            # Modèle d'environnement
└── README.md               # Documentation
```

---

## ⚡ Démarrage Rapide

### 1. Démarrer avec Docker Compose

```bash
docker compose up -d
```

Accédez localement à votre hub : [http://127.0.0.1:8085](http://127.0.0.1:8085)  
Tester une route 404 : [http://127.0.0.1:8085/route-inconnue](http://127.0.0.1:8085/route-inconnue)

### 2. Personnaliser le Port

Modifiez la variable `PORT` dans le fichier `.env` :

```bash
PORT=8088
```

Puis redémarrez :

```bash
docker compose up -d
```

---

## 🛡️ Intégration avec votre Nginx Reverse Proxy (Hôte / NPM)

Si vous utilisez un Nginx ou Nginx Proxy Manager en frontal pour gérer vos domaines et certificats SSL (HTTPS Let's Encrypt), voici la configuration recommandée :

### Option A : Configuration Nginx Host standard

Dans `/etc/nginx/sites-available/hub.votredomaine.fr` :

```nginx
server {
    listen 80;
    server_name hub.votredomaine.fr;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name hub.votredomaine.fr;

    ssl_certificate /etc/letsencrypt/live/hub.votredomaine.fr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/hub.votredomaine.fr/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8085;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Option B : Avec Nginx Proxy Manager (NPM)
- **Domain Names** : `hub.votredomaine.fr`
- **Scheme** : `http`
- **Forward Hostname / IP** : `127.0.0.1` (ou l'IP locale de votre Pi 5)
- **Forward Port** : `8085`
- **SSL** : Request a new SSL Certificate (Force SSL, HTTP/2 Support, HSTS)

---

## 🌐 Déploiement GitHub Pages

Le workflow automatisé [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) déploie le contenu du dossier `public/` :
1. Poussez sur GitHub : `git push origin main`
2. Dans **Settings** > **Pages** de votre dépôt GitHub, sélectionnez **GitHub Actions**.
3. Votre site est accessible mondialement sur `https://<votre-compte>.github.io/site_web/`.
