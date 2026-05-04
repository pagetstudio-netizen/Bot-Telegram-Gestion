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

echo "==> Build du dashboard (React)..."
BASE_PATH=/ pnpm --filter @workspace/dashboard run build

echo "==> Build du serveur (API + Bot)..."
pnpm --filter @workspace/api-server run build

echo ""
echo "✅ Build terminé !"
echo "   Dashboard : artifacts/dashboard/dist/public/"
echo "   Serveur   : artifacts/api-server/dist/index.mjs"
echo "   Démarrage : node artifacts/api-server/dist/index.mjs"
