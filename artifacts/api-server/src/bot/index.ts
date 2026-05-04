import { Telegraf, Context } from "telegraf";
import { logger } from "../lib/logger";
import { setupCommands } from "./commands";
import { setupMiddleware } from "./middleware";

let bot: Telegraf | null = null;
let botStartTime = Date.now();
let botInfo: { first_name: string; username: string } | null = null;
let botRestartCount = 0;

export function getBot(): Telegraf | null {
  return bot;
}

export function getBotInfo() {
  return {
    botInfo,
    uptime: Math.floor((Date.now() - botStartTime) / 1000),
    running: bot !== null,
    restartCount: botRestartCount,
  };
}

export async function restartBot(): Promise<{ success: boolean; message: string }> {
  try {
    if (bot) {
      bot.stop("RESTART");
      bot = null;
    }
    await new Promise((r) => setTimeout(r, 1500));
    await startBot();
    botRestartCount++;
    return { success: true, message: "Bot redémarré avec succès." };
  } catch (err) {
    logger.error({ err }, "Bot restart failed");
    return { success: false, message: "Erreur lors du redémarrage." };
  }
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

    // Enregistre le menu de commandes visible dans Telegram (traduit par langue)
    const commandsByLang: Record<string, { command: string; description: string }[]> = {
      fr: [
        { command: "settings",   description: "⚙️ Paramètres & activation du bot" },
        { command: "language",   description: "🌍 Changer la langue du bot" },
        { command: "help",       description: "❓ Liste de toutes les commandes" },
        { command: "support",    description: "💬 Contacter le support" },
        { command: "rules",      description: "📋 Afficher les règles du groupe" },
        { command: "stats",      description: "📊 Statistiques du groupe" },
        { command: "warn",       description: "⚠️ Avertir un membre (répondre au msg)" },
        { command: "unwarn",     description: "✅ Retirer le dernier avertissement" },
        { command: "warnings",   description: "🔢 Voir les avertissements d'un membre" },
        { command: "mute",       description: "🔇 Rendre muet (répondre au msg) [minutes]" },
        { command: "unmute",     description: "🔊 Lever le silence (répondre au msg)" },
        { command: "kick",       description: "👢 Expulser un membre (répondre au msg)" },
        { command: "ban",        description: "🔨 Bannir un membre (répondre au msg)" },
        { command: "unban",      description: "🔓 Débannir un membre (répondre au msg)" },
        { command: "setwelcome", description: "✏️ Définir le message de bienvenue" },
        { command: "setrules",   description: "📝 Définir les règles du groupe" },
        { command: "filter",     description: "🔤 Ajouter un mot interdit" },
        { command: "filters",    description: "🔤 Voir et gérer les filtres de mots" },
      ],
      en: [
        { command: "settings",   description: "⚙️ Bot settings & activation" },
        { command: "language",   description: "🌍 Change bot language" },
        { command: "help",       description: "❓ List all commands" },
        { command: "support",    description: "💬 Contact support" },
        { command: "rules",      description: "📋 Show group rules" },
        { command: "stats",      description: "📊 Group statistics" },
        { command: "warn",       description: "⚠️ Warn a member (reply to msg)" },
        { command: "unwarn",     description: "✅ Remove last warning" },
        { command: "warnings",   description: "🔢 View member warnings" },
        { command: "mute",       description: "🔇 Mute member (reply to msg) [minutes]" },
        { command: "unmute",     description: "🔊 Unmute member (reply to msg)" },
        { command: "kick",       description: "👢 Kick member (reply to msg)" },
        { command: "ban",        description: "🔨 Ban member (reply to msg)" },
        { command: "unban",      description: "🔓 Unban member (reply to msg)" },
        { command: "setwelcome", description: "✏️ Set welcome message" },
        { command: "setrules",   description: "📝 Set group rules" },
        { command: "filter",     description: "🔤 Add a banned word" },
        { command: "filters",    description: "🔤 View and manage word filters" },
      ],
      es: [
        { command: "settings",   description: "⚙️ Ajustes y activación del bot" },
        { command: "language",   description: "🌍 Cambiar idioma del bot" },
        { command: "help",       description: "❓ Lista de todos los comandos" },
        { command: "support",    description: "💬 Contactar soporte" },
        { command: "rules",      description: "📋 Ver reglas del grupo" },
        { command: "stats",      description: "📊 Estadísticas del grupo" },
        { command: "warn",       description: "⚠️ Advertir a un miembro (responder msg)" },
        { command: "unwarn",     description: "✅ Quitar último aviso" },
        { command: "warnings",   description: "🔢 Ver avisos de un miembro" },
        { command: "mute",       description: "🔇 Silenciar miembro (responder msg) [min]" },
        { command: "unmute",     description: "🔊 Quitar silencio (responder msg)" },
        { command: "kick",       description: "👢 Expulsar miembro (responder msg)" },
        { command: "ban",        description: "🔨 Banear miembro (responder msg)" },
        { command: "unban",      description: "🔓 Desbanear miembro (responder msg)" },
        { command: "setwelcome", description: "✏️ Definir mensaje de bienvenida" },
        { command: "setrules",   description: "📝 Definir reglas del grupo" },
        { command: "filter",     description: "🔤 Añadir palabra prohibida" },
        { command: "filters",    description: "🔤 Ver y gestionar filtros de palabras" },
      ],
      pt: [
        { command: "settings",   description: "⚙️ Configurações e ativação do bot" },
        { command: "language",   description: "🌍 Mudar idioma do bot" },
        { command: "help",       description: "❓ Lista de todos os comandos" },
        { command: "support",    description: "💬 Contatar suporte" },
        { command: "rules",      description: "📋 Ver regras do grupo" },
        { command: "stats",      description: "📊 Estatísticas do grupo" },
        { command: "warn",       description: "⚠️ Avisar membro (responder msg)" },
        { command: "unwarn",     description: "✅ Remover último aviso" },
        { command: "warnings",   description: "🔢 Ver avisos de um membro" },
        { command: "mute",       description: "🔇 Silenciar membro (responder msg) [min]" },
        { command: "unmute",     description: "🔊 Remover silêncio (responder msg)" },
        { command: "kick",       description: "👢 Expulsar membro (responder msg)" },
        { command: "ban",        description: "🔨 Banir membro (responder msg)" },
        { command: "unban",      description: "🔓 Desbanir membro (responder msg)" },
        { command: "setwelcome", description: "✏️ Definir mensagem de boas-vindas" },
        { command: "setrules",   description: "📝 Definir regras do grupo" },
        { command: "filter",     description: "🔤 Adicionar palavra proibida" },
        { command: "filters",    description: "🔤 Ver e gerir filtros de palavras" },
      ],
      ar: [
        { command: "settings",   description: "⚙️ إعدادات البوت وتفعيله" },
        { command: "language",   description: "🌍 تغيير لغة البوت" },
        { command: "help",       description: "❓ قائمة جميع الأوامر" },
        { command: "support",    description: "💬 التواصل مع الدعم" },
        { command: "rules",      description: "📋 عرض قواعد المجموعة" },
        { command: "stats",      description: "📊 إحصائيات المجموعة" },
        { command: "warn",       description: "⚠️ تحذير عضو (رد على رسالته)" },
        { command: "unwarn",     description: "✅ إزالة آخر تحذير" },
        { command: "warnings",   description: "🔢 عرض تحذيرات عضو" },
        { command: "mute",       description: "🔇 كتم عضو (رد على رسالته) [دقائق]" },
        { command: "unmute",     description: "🔊 رفع الكتم (رد على رسالته)" },
        { command: "kick",       description: "👢 طرد عضو (رد على رسالته)" },
        { command: "ban",        description: "🔨 حظر عضو (رد على رسالته)" },
        { command: "unban",      description: "🔓 رفع الحظر عن عضو (رد على رسالته)" },
        { command: "setwelcome", description: "✏️ تعيين رسالة الترحيب" },
        { command: "setrules",   description: "📝 تعيين قواعد المجموعة" },
        { command: "filter",     description: "🔤 إضافة كلمة محظورة" },
        { command: "filters",    description: "🔤 عرض وإدارة فلاتر الكلمات" },
      ],
    };

    // Enregistrer pour chaque langue + fallback par défaut (français)
    await Promise.all([
      bot.telegram.setMyCommands(commandsByLang["fr"]!),
      ...["en", "es", "pt", "ar"].map((lc) =>
        bot.telegram.setMyCommands(commandsByLang[lc]!, { language_code: lc } as any)
      ),
    ]);
    logger.info("Bot commands menu registered with Telegram");

    bot.catch((err: unknown, ctx: Context) => {
      logger.error({ err, update: ctx.update }, "Bot error");
    });

    bot.launch({ dropPendingUpdates: true }).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("409")) {
        logger.warn("Bot 409: une autre instance tourne déjà (ex: Render). Bot désactivé ici.");
      } else {
        logger.error({ err }, "Bot launch error");
      }
      bot = null;
    });
    logger.info({ username: botInfo.username }, "Telegram bot started");

    process.once("SIGINT", () => bot?.stop("SIGINT"));
    process.once("SIGTERM", () => bot?.stop("SIGTERM"));
  } catch (err) {
    logger.error({ err }, "Failed to start Telegram bot");
    bot = null;
  }
}
