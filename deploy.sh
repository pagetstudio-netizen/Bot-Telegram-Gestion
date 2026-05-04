#!/bin/bash
set -e

echo "==> Vérification de pnpm..."
if ! command -v pnpm &> /dev/null; then
  echo "==> Installation de pnpm..."
  npm install -g pnpm
fi

echo "==> pnpm version: $(pnpm --version)"

echo "==> Installation des dépendances..."
pnpm install --no-frozen-lockfile

echo "==> Build du serveur..."
pnpm --filter @workspace/api-server run build

echo ""
echo "✅ Build terminé !"
echo "   Fichier de démarrage : artifacts/api-server/dist/index.mjs"
echo "   Commande de démarrage : node artifacts/api-server/dist/index.mjs"
