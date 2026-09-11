# Site Web d'Erreur 404 — Style Moderne & Spatial

Ce site web statique haute fidélité reproduit une interface moderne d'erreur système / ressource introuvable (404), optimisée pour tourner directement sur un conteneur Apache HTTPD (`quay.io/ocp-edge-qe/httpd`).

---

## 🎨 Fonctionnalités

- **Fidélité visuelle** : Carte sombre flottante, fond spatial profond avec halos pourpres/rouges, badge avec diode lumineuse pulsante `ERREUR SYSTÈME`.
- **404 Métallique 3D** : Typographie monumentale avec dégradé chromé et ombrage en profondeur.
- **Effet 3D Tilt interactif** : La carte réagit dynamiquement aux mouvements de la souris en perspective tridimensionnelle.
- **Fond Cosmique dynamique** : Particules d'étoiles animées avec scintillement sur `<canvas>` léger et fluide.
- **Détails techniques du conteneur** : Panneau escamotable affichant la route demandée, le serveur HTTPD, la latence et l'horodatage.
- **Bouton « Réessayer » actif** : Teste réellement la route via une requête `HEAD` HTTP et affiche une notification avec retour haptique visuel.
- **Compatibilité Apache** : Livré avec `index.html`, `404.html` et `.htaccess`.

---

## 🚀 Démarrage avec Docker

### Option 1 : Votre commande personnalisée (en montant le dossier actuel)

Depuis le dossier du projet :

```bash
# Servir la page directement à la racine (index.html)
docker run -p 80:80 -v "$(pwd)":/usr/local/apache2/htdocs/:ro -d quay.io/ocp-edge-qe/httpd

# OU avec redirection 404 native d'Apache sur n'importe quelle URL inconnue :
docker run -p 80:80 \
  -v "$(pwd)":/usr/local/apache2/htdocs/:ro \
  -v "$(pwd)/httpd.conf":/usr/local/apache2/conf/httpd.conf:ro \
  -d quay.io/ocp-edge-qe/httpd
```

### Option 2 : En montant `/tmp` (comme dans votre exemple)

Si vous copiez les fichiers dans `/tmp` :

```bash
cp -r /home/phantom/Workspaces/site_web/* /tmp/
docker run -p 80:80 -v /tmp:/usr/local/apache2/htdocs/:ro -d quay.io/ocp-edge-qe/httpd
```

### Option 3 : Avec le script fourni

```bash
chmod +x run.sh
./run.sh 8080   # Remplacez 8080 par le port désiré (ex: 80)
```

### Option 4 : Avec Docker Compose

```bash
docker compose up -d
```

---

## 🌐 Accès

Une fois le conteneur démarré :
- Page d'accueil : [http://localhost](http://localhost) (ou [http://localhost:8080](http://localhost:8080))
- Test d'une route inconnue (404) : [http://localhost/route-inexistante](http://localhost/route-inexistante)
