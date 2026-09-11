#!/bin/bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${1:-80}"

echo "🚀 Démarrage du serveur Apache httpd (quay.io/ocp-edge-qe/httpd)..."
echo "📁 Répertoire servi : $DIR"
echo "🌐 Port HTTP        : $PORT"

docker run --rm -p "${PORT}:80" \
  -v "${DIR}:/usr/local/apache2/htdocs/:ro" \
  -v "${DIR}/httpd.conf:/usr/local/apache2/conf/httpd.conf:ro" \
  quay.io/ocp-edge-qe/httpd
