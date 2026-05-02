import { Telegraf, Context } from "telegraf";
import { logger } from "../lib/logger";
import { setupCommands } from "./commands";
import { setupMiddleware } from "./middleware";

let bot: Telegraf | null = null;
let botStartTime = Date.now();
let botInfo: { first_name: string; username: string } | null = null;

export function getBot(): Telegraf | null {
  return bot;
}

export function getBotInfo() {
  return { botInfo, uptime: Math.floor((Date.now() - botStartTime) / 1000), running: bot !== null };
}

export async function startBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    logger.warn("TELEGRAM_BOT_TOKEN not set, bot will not start");
    return;
  }

  try {
    bot = new Telegraf(token);

    const info = await bot.telegram.getMe();
    botInfo = { first_name: info.first_name, username: info.username ?? "" };
    botStartTime = Date.now();

    setupMiddleware(bot);
    setupCommands(bot);

    // Enregistre le menu de commandes visible dans Telegram
    await bot.telegram.setMyCommands([
      { command: "settings",  description: "⚙️ Paramètres & activation du bot" },
      { command: "language",  description: "🌍 Changer la langue du bot" },
      { command: "help",      description: "❓ Liste de toutes les commandes" },
      { command: "rules",     description: "📋 Afficher les règles du groupe" },
      { command: "stats",     description: "📊 Statistiques du groupe" },
      { command: "warn",      description: "⚠️ Avertir un membre (répondre au msg)" },
      { command: "unwarn",    description: "✅ Retirer le dernier avertissement" },
      { command: "warnings",  description: "🔢 Voir les avertissements d'un membre" },
      { command: "mute",      description: "🔇 Rendre muet (répondre au msg) [minutes]" },
      { command: "unmute",    description: "🔊 Lever le silence (répondre au msg)" },
      { command: "kick",      description: "👢 Expulser un membre (répondre au msg)" },
      { command: "ban",       description: "🔨 Bannir un membre (répondre au msg)" },
      { command: "unban",     description: "🔓 Débannir un membre (répondre au msg)" },
      { command: "setwelcome", description: "✏️ Définir le message de bienvenue" },
      { command: "setrules",  description: "📝 Définir les règles du groupe" },
      { command: "filter",    description: "🔤 Ajouter un mot interdit" },
      { command: "filters",   description: "🔤 Voir et gérer les filtres de mots" },
    ]);
    logger.info("Bot commands menu registered with Telegram");

    bot.catch((err: unknown, ctx: Context) => {
      logger.error({ err, update: ctx.update }, "Bot error");
    });

    bot.launch({ dropPendingUpdates: true });
    logger.info({ username: botInfo.username }, "Telegram bot started");

    process.once("SIGINT", () => bot?.stop("SIGINT"));
    process.once("SIGTERM", () => bot?.stop("SIGTERM"));
  } catch (err) {
    logger.error({ err }, "Failed to start Telegram bot");
    bot = null;
  }
}
