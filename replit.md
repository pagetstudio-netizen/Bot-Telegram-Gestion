# Bot Modérateur Telegram

## Vue d'ensemble

Bot Telegram de modération automatique avec tableau de bord web. Le bot gère plusieurs groupes Telegram simultanément avec des fonctionnalités complètes de modération.

## Architecture

### Monorepo pnpm
- `artifacts/api-server` — Serveur Express + bot Telegraf (port dynamique via $PORT)
- `artifacts/dashboard` — Tableau de bord React + Vite (préfixe `/`)
- `lib/db` — Schéma Drizzle ORM + migrations PostgreSQL
- `lib/api-spec` — Spec OpenAPI + codegen Orval
- `lib/api-client-react` — Hooks React Query générés
- `lib/api-zod` — Schémas Zod générés

### Base de données (PostgreSQL)
Tables :
- `bot_groups` — Groupes gérés par le bot + paramètres de modération
- `bot_warnings` — Historique des avertissements
- `bot_violations` — Journal de toutes les violations détectées
- `bot_word_filters` — Filtres de mots personnalisés par groupe
- `bot_bans` — Historique des bans

## Fonctionnalités du Bot

### Anti-modération automatique
- **Anti-spam** — Détecte les messages dupliqués
- **Anti-flood** — Limite le nombre de messages par fenêtre de temps
- **Anti-liens** — Supprime les URLs (configurable par groupe)
- **Anti-profanité** — Filtre les gros mots (liste FR)
- **Filtres de mots personnalisés** — Par groupe, avec action (delete/warn/mute/ban)

### Commandes admin (dans le groupe)
- `/warn @user [raison]` — Avertissement (auto-ban après N avertissements)
- `/unwarn @user` — Retirer le dernier avertissement
- `/ban @user [raison]` — Bannir
- `/unban @user` — Débannir
- `/kick @user` — Expulser (ban + unban immédiat)
- `/mute @user [minutes]` — Rendre muet
- `/unmute @user` — Lever le silence
- `/warnings [@user]` — Voir les avertissements
- `/rules` — Afficher les règles du groupe
- `/stats` — Statistiques du groupe
- `/help` — Aide

### Événements automatiques
- Message de bienvenue personnalisé pour les nouveaux membres
- Message d'au revoir
- Auto-ban après N avertissements (configurable)

## Tableau de Bord Web

- **/** — Vue globale : statut du bot, stats totales, activité récente
- **/groups** — Liste de tous les groupes gérés
- **/groups/:id** — Détail groupe avec onglets :
  - Settings (toggles anti-spam/flood/links/profanity, limits, message de bienvenue, règles)
  - Warnings (liste + suppression)
  - Violations (journal coloré par type)
  - Word Filters (ajout/suppression)
  - Bans (liste + déban)
- **/violations** — Journal global de violations

## Variables d'environnement requises

- `TELEGRAM_BOT_TOKEN` — Token BotFather (secret)
- `DATABASE_URL` — URL PostgreSQL (auto-provisionnée)
- `SESSION_SECRET` — Secret de session
- `PORT` — Port du serveur (injecté par Replit)

## Développement

```bash
# Build API server
pnpm --filter @workspace/api-server run build

# Push DB schema
pnpm --filter @workspace/db run push

# Codegen (après modif openapi.yaml)
pnpm --filter @workspace/api-spec run codegen
```

## Notes importantes

- Le bot Telegraf démarre automatiquement au lancement du serveur Express
- Les admins Telegram sont exemptés de toute modération automatique
- L'index `lib/api-zod/src/index.ts` n'exporte QUE depuis `./generated/api` (pas `./generated/types`) pour éviter les conflits de noms
- La config orval utilise `mode: "single"` pour le client zod (pas "split")
