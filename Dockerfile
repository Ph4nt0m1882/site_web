# Image ultra-légère multi-architecture officielle (compatible nativement ARM64 / RPi 5 & x86_64)
FROM nginx:alpine

LABEL maintainer="Phantom"
LABEL description="AI Systems Neural Hub & Static Server for Raspberry Pi 5"

# Remplacement de la configuration Nginx par défaut
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Copie des fichiers statiques du site
COPY public/ /usr/share/nginx/html/

# Vérification d'intégrité périodique
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/healthz || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
