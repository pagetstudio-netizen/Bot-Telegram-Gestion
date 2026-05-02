import { Telegraf } from "telegraf";
import { db } from "@workspace/db";
import { botGroupsTable, botWarningsTable, botBansTable, botViolationsTable } from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
import { logger } from "../lib/logger";

async function isAdmin(ctx: any): Promise<boolean> {
  if (!ctx.chat || ctx.chat.type === "private") return false;
  if (!ctx.from) return false;
  try {
    const member = await ctx.telegram.getChatMember(ctx.chat.id, ctx.from.id);
    return ["administrator", "creator"].includes(member.status);
  } catch {
    return false;
  }
}

function getGroupId(chatId: number): string {
  return chatId.toString();
}

function getUserId(userId: number): string {
  return userId.toString();
}

export async function ensureGroup(chatId: number, title: string) {
  await db
    .insert(botGroupsTable)
    .values({ telegramId: getGroupId(chatId), title })
    .onConflictDoNothing();

  return db
    .select()
    .from(botGroupsTable)
    .where(eq(botGroupsTable.telegramId, getGroupId(chatId)))
    .limit(1)
    .then((r) => r[0]);
}

function buildSettingsKeyboard(group: any) {
  return {
    inline_keyboard: [
      [
        {
          text: `${group.antiSpam ? "✅" : "❌"} Anti-Spam`,
          callback_data: `toggle:antiSpam:${group.telegramId}`,
        },
        {
          text: `${group.antiFlood ? "✅" : "❌"} Anti-Flood`,
          callback_data: `toggle:antiFlood:${group.telegramId}`,
        },
      ],
      [
        {
          text: `${group.antiLinks ? "✅" : "❌"} Anti-Liens`,
          callback_data: `toggle:antiLinks:${group.telegramId}`,
        },
        {
          text: `${group.antiProfanity ? "✅" : "❌"} Anti-Grossièretés`,
          callback_data: `toggle:antiProfanity:${group.telegramId}`,
        },
      ],
      [
        {
          text: `⚠️ Max avertissements: ${group.maxWarnings}`,
          callback_data: `info:maxWarnings:${group.telegramId}`,
        },
      ],
      [
        {
          text: `🔇 Durée mute: ${group.muteDuration / 60} min`,
          callback_data: `info:muteDuration:${group.telegramId}`,
        },
        {
          text: `🌊 Flood: ${group.floodLimit} msg/${group.floodWindow}s`,
          callback_data: `info:flood:${group.telegramId}`,
        },
      ],
      [
        {
          text: "✏️ Message de bienvenue",
          callback_data: `set:welcome:${group.telegramId}`,
        },
        {
          text: "📋 Règles du groupe",
          callback_data: `set:rules:${group.telegramId}`,
        },
      ],
      [
        {
          text: "🔢 Changer max avertissements",
          callback_data: `change:maxWarnings:${group.telegramId}`,
        },
      ],
      [
        {
          text: "🔇 Changer durée du mute",
          callback_data: `change:muteDuration:${group.telegramId}`,
        },
      ],
    ],
  };
}

function buildSettingsText(group: any) {
  return (
    `⚙️ *Paramètres de modération — ${group.title}*\n\n` +
    `🛡️ *Protection active :*\n` +
    `• Anti-Spam : ${group.antiSpam ? "✅ Activé" : "❌ Désactivé"}\n` +
    `• Anti-Flood : ${group.antiFlood ? "✅ Activé" : "❌ Désactivé"}\n` +
    `• Anti-Liens : ${group.antiLinks ? "✅ Activé" : "❌ Désactivé"}\n` +
    `• Anti-Grossièretés : ${group.antiProfanity ? "✅ Activé" : "❌ Désactivé"}\n\n` +
    `📊 *Limites :*\n` +
    `• Max avertissements avant ban : ${group.maxWarnings}\n` +
    `• Durée du mute automatique : ${group.muteDuration / 60} minutes\n` +
    `• Anti-flood : ${group.floodLimit} messages en ${group.floodWindow} secondes\n\n` +
    `💬 *Messages :*\n` +
    `• Bienvenue : ${group.welcomeMessage ? "✅ Configuré" : "❌ Non configuré"}\n` +
    `• Règles : ${group.rulesText ? "✅ Configurées" : "❌ Non configurées"}\n\n` +
    `_Appuyez sur un bouton pour modifier un paramètre._`
  );
}

// Store pending input awaits per user
const pendingInputs = new Map<
  string,
  { type: string; groupId: string; chatId: number; messageId?: number }
>();

export function setupCommands(bot: Telegraf) {

  // ─── /start ───────────────────────────────────────────────────────────────
  bot.command("start", async (ctx) => {
    if (ctx.chat.type === "private") {
      await ctx.reply(
        "🤖 *Bot Modérateur Telegram*\n\n" +
          "Ajoutez-moi à votre groupe et donnez-moi les droits d'administrateur pour commencer la modération.\n\n" +
          "*Commandes disponibles :*\n" +
          "/settings — ⚙️ Paramètres du groupe\n" +
          "/help — ❓ Aide complète\n" +
          "/rules — 📋 Règles du groupe\n" +
          "/stats — 📊 Statistiques\n" +
          "/warn — ⚠️ Avertir un membre\n" +
          "/ban — 🔨 Bannir un membre\n" +
          "/mute — 🔇 Rendre muet\n" +
          "/warnings — 📋 Voir les avertissements",
        { parse_mode: "Markdown" }
      );
    }
  });

  // ─── /help ────────────────────────────────────────────────────────────────
  bot.command("help", async (ctx) => {
    await ctx.reply(
      "🛡️ *Commandes du bot modérateur*\n\n" +
        "⚙️ *Configuration (admins uniquement) :*\n" +
        "/settings — Paramètres de modération du groupe\n" +
        "/setwelcome [texte] — Définir le message de bienvenue\n" +
        "/setrules [texte] — Définir les règles du groupe\n\n" +
        "👮 *Modération (admins uniquement) :*\n" +
        "/warn (en répondant) [raison] — Donner un avertissement\n" +
        "/unwarn (en répondant) — Retirer le dernier avertissement\n" +
        "/ban (en répondant) [raison] — Bannir un utilisateur\n" +
        "/unban (en répondant) — Débannir\n" +
        "/kick (en répondant) — Expulser du groupe\n" +
        "/mute (en répondant) [minutes] — Rendre muet\n" +
        "/unmute (en répondant) — Retirer le silence\n\n" +
        "📊 *Informations :*\n" +
        "/warnings (en répondant) — Voir les avertissements\n" +
        "/rules — Afficher les règles\n" +
        "/stats — Statistiques du groupe",
      { parse_mode: "Markdown" }
    );
  });

  // ─── /settings ────────────────────────────────────────────────────────────
  bot.command("settings", async (ctx) => {
    if (ctx.chat.type === "private") {
      return ctx.reply(
        "ℹ️ Utilisez /settings directement dans votre groupe pour configurer la modération."
      );
    }
    if (!(await isAdmin(ctx))) {
      return ctx.reply("❌ Seuls les administrateurs peuvent accéder aux paramètres.");
    }

    const group = await ensureGroup(ctx.chat.id, ctx.chat.title ?? "Groupe");
    if (!group) return ctx.reply("❌ Erreur lors du chargement des paramètres.");

    await ctx.reply(buildSettingsText(group), {
      parse_mode: "Markdown",
      reply_markup: buildSettingsKeyboard(group),
    });
  });

  // ─── /setwelcome ──────────────────────────────────────────────────────────
  bot.command("setwelcome", async (ctx) => {
    if (ctx.chat.type === "private") return;
    if (!(await isAdmin(ctx))) {
      return ctx.reply("❌ Seuls les administrateurs peuvent utiliser cette commande.");
    }

    const text = ctx.message.text.split(" ").slice(1).join(" ").trim();
    if (!text) {
      return ctx.reply(
        "📝 *Utilisation :* `/setwelcome Bienvenue {name} dans {group} !`\n\n" +
          "Variables : `{name}` = prénom du membre, `{group}` = nom du groupe",
        { parse_mode: "Markdown" }
      );
    }

    await ensureGroup(ctx.chat.id, ctx.chat.title ?? "Groupe");
    await db
      .update(botGroupsTable)
      .set({ welcomeMessage: text, updatedAt: new Date() })
      .where(eq(botGroupsTable.telegramId, getGroupId(ctx.chat.id)));

    await ctx.reply(
      `✅ *Message de bienvenue mis à jour !*\n\n_Aperçu :_\n${text
        .replace("{name}", "Nouveau Membre")
        .replace("{group}", ctx.chat.title ?? "ce groupe")}`,
      { parse_mode: "Markdown" }
    );
  });

  // ─── /setrules ────────────────────────────────────────────────────────────
  bot.command("setrules", async (ctx) => {
    if (ctx.chat.type === "private") return;
    if (!(await isAdmin(ctx))) {
      return ctx.reply("❌ Seuls les administrateurs peuvent utiliser cette commande.");
    }

    const text = ctx.message.text.split(" ").slice(1).join(" ").trim();
    if (!text) {
      return ctx.reply(
        "📝 *Utilisation :* `/setrules 1. Soyez respectueux\\n2. Pas de spam...`",
        { parse_mode: "Markdown" }
      );
    }

    await ensureGroup(ctx.chat.id, ctx.chat.title ?? "Groupe");
    await db
      .update(botGroupsTable)
      .set({ rulesText: text, updatedAt: new Date() })
      .where(eq(botGroupsTable.telegramId, getGroupId(ctx.chat.id)));

    await ctx.reply("✅ *Règles du groupe mises à jour !* Utilisez /rules pour les afficher.", {
      parse_mode: "Markdown",
    });
  });

  // ─── /rules ───────────────────────────────────────────────────────────────
  bot.command("rules", async (ctx) => {
    if (ctx.chat.type === "private") return;
    const group = await db
      .select()
      .from(botGroupsTable)
      .where(eq(botGroupsTable.telegramId, getGroupId(ctx.chat.id)))
      .limit(1);

    if (group[0]?.rulesText) {
      await ctx.reply(`📋 *Règles du groupe :*\n\n${group[0].rulesText}`, {
        parse_mode: "Markdown",
      });
    } else {
      await ctx.reply(
        "❌ Aucune règle définie. Un admin peut les définir avec /setrules [texte]."
      );
    }
  });

  // ─── /stats ───────────────────────────────────────────────────────────────
  bot.command("stats", async (ctx) => {
    if (ctx.chat.type === "private") return;
    const groupId = getGroupId(ctx.chat.id);

    const [warnCount] = await db
      .select({ count: count() })
      .from(botWarningsTable)
      .where(eq(botWarningsTable.telegramGroupId, groupId));

    const [banCount] = await db
      .select({ count: count() })
      .from(botBansTable)
      .where(and(eq(botBansTable.telegramGroupId, groupId), eq(botBansTable.unbannedAt, null as any)));

    const [violCount] = await db
      .select({ count: count() })
      .from(botViolationsTable)
      .where(eq(botViolationsTable.telegramGroupId, groupId));

    await ctx.reply(
      `📊 *Statistiques — ${ctx.chat.title}*\n\n` +
        `⚠️ Avertissements : ${warnCount?.count ?? 0}\n` +
        `🔨 Bans actifs : ${banCount?.count ?? 0}\n` +
        `🚨 Violations totales : ${violCount?.count ?? 0}`,
      { parse_mode: "Markdown" }
    );
  });

  // ─── Callback query (boutons inline) ─────────────────────────────────────
  bot.on("callback_query", async (ctx) => {
    const data = (ctx.callbackQuery as any).data as string;
    if (!data) return ctx.answerCbQuery();

    const [action, field, groupId] = data.split(":");

    // Only admins can interact with settings buttons
    if (ctx.chat && ctx.chat.type !== "private") {
      const member = await ctx.telegram.getChatMember(ctx.chat.id, ctx.from!.id).catch(() => null);
      if (!member || !["administrator", "creator"].includes(member.status)) {
        return ctx.answerCbQuery("❌ Seuls les administrateurs peuvent modifier les paramètres.");
      }
    }

    const group = await db
      .select()
      .from(botGroupsTable)
      .where(eq(botGroupsTable.telegramId, groupId))
      .limit(1)
      .then((r) => r[0]);

    if (!group) return ctx.answerCbQuery("❌ Groupe introuvable.");

    if (action === "toggle") {
      const current = (group as any)[field] as boolean;
      const update: Record<string, boolean | Date> = {
        [field]: !current,
        updatedAt: new Date(),
      };
      await db
        .update(botGroupsTable)
        .set(update)
        .where(eq(botGroupsTable.telegramId, groupId));

      const updated = await db
        .select()
        .from(botGroupsTable)
        .where(eq(botGroupsTable.telegramId, groupId))
        .limit(1)
        .then((r) => r[0]);

      const label: Record<string, string> = {
        antiSpam: "Anti-Spam",
        antiFlood: "Anti-Flood",
        antiLinks: "Anti-Liens",
        antiProfanity: "Anti-Grossièretés",
      };

      await ctx.answerCbQuery(
        `${!current ? "✅ Activé" : "❌ Désactivé"} : ${label[field] ?? field}`
      );

      try {
        await ctx.editMessageText(buildSettingsText(updated), {
          parse_mode: "Markdown",
          reply_markup: buildSettingsKeyboard(updated),
        });
      } catch {}
    } else if (action === "change") {
      const key = ctx.from!.id.toString() + ":" + groupId;
      pendingInputs.set(key, {
        type: field,
        groupId,
        chatId: ctx.chat?.id ?? 0,
        messageId: (ctx.callbackQuery as any).message?.message_id,
      });

      const prompts: Record<string, string> = {
        maxWarnings: "⚠️ Envoyez le nouveau nombre maximum d'avertissements avant ban (ex: 3, 5, 10)",
        muteDuration: "🔇 Envoyez la durée du mute en minutes (ex: 5, 30, 60)",
        floodLimit: "🌊 Envoyez le nombre max de messages avant flood (ex: 5, 10)",
        floodWindow: "⏱️ Envoyez la fenêtre de temps en secondes pour l'anti-flood (ex: 5, 10, 30)",
      };

      await ctx.answerCbQuery();
      await ctx.reply(
        prompts[field] ?? `Envoyez la nouvelle valeur pour ${field}`,
        { reply_to_message_id: (ctx.callbackQuery as any).message?.message_id }
      );
    } else if (action === "set") {
      const key = ctx.from!.id.toString() + ":" + groupId;
      pendingInputs.set(key, {
        type: field === "welcome" ? "welcomeMessage" : "rulesText",
        groupId,
        chatId: ctx.chat?.id ?? 0,
        messageId: (ctx.callbackQuery as any).message?.message_id,
      });

      await ctx.answerCbQuery();
      const prompt =
        field === "welcome"
          ? "✏️ Envoyez le nouveau message de bienvenue.\n\nVariables : `{name}` = prénom du membre, `{group}` = nom du groupe"
          : "📋 Envoyez les règles du groupe (vous pouvez utiliser plusieurs lignes)";
      await ctx.reply(prompt, {
        parse_mode: "Markdown",
        reply_to_message_id: (ctx.callbackQuery as any).message?.message_id,
      });
    } else if (action === "info") {
      const messages: Record<string, string> = {
        maxWarnings: `ℹ️ Max avertissements avant ban : ${group.maxWarnings}\nUtilisez le bouton "Changer max avertissements" pour modifier.`,
        muteDuration: `ℹ️ Durée du mute : ${group.muteDuration / 60} minutes\nUtilisez le bouton "Changer durée du mute" pour modifier.`,
        flood: `ℹ️ Anti-flood : max ${group.floodLimit} messages en ${group.floodWindow} secondes.`,
      };
      await ctx.answerCbQuery(messages[field] ?? "ℹ️", { show_alert: true });
    } else {
      await ctx.answerCbQuery();
    }
  });

  // ─── Handle pending text inputs (for settings changes) ────────────────────
  bot.on("text", async (ctx, next) => {
    const key = ctx.from.id.toString() + ":" + (ctx.chat as any).id?.toString();
    // Check pending inputs from any group associated with this user
    let pendingKey: string | null = null;
    let pending: { type: string; groupId: string; chatId: number; messageId?: number } | null = null;

    for (const [k, v] of pendingInputs.entries()) {
      if (k.startsWith(ctx.from.id.toString() + ":")) {
        pendingKey = k;
        pending = v;
        break;
      }
    }

    if (!pending || !pendingKey) return next();

    const value = ctx.message.text.trim();
    pendingInputs.delete(pendingKey);

    const numericFields = ["maxWarnings", "muteDuration", "floodLimit", "floodWindow"];

    if (numericFields.includes(pending.type)) {
      const num = parseInt(value, 10);
      if (isNaN(num) || num <= 0) {
        return ctx.reply("❌ Valeur invalide. Veuillez envoyer un nombre entier positif.");
      }

      const actualValue = pending.type === "muteDuration" ? num * 60 : num;

      await db
        .update(botGroupsTable)
        .set({ [pending.type]: actualValue, updatedAt: new Date() })
        .where(eq(botGroupsTable.telegramId, pending.groupId));

      const updated = await db
        .select()
        .from(botGroupsTable)
        .where(eq(botGroupsTable.telegramId, pending.groupId))
        .limit(1)
        .then((r) => r[0]);

      const labels: Record<string, string> = {
        maxWarnings: `Max avertissements : ${num}`,
        muteDuration: `Durée du mute : ${num} minutes`,
        floodLimit: `Flood limit : ${num} messages`,
        floodWindow: `Flood window : ${num} secondes`,
      };

      await ctx.reply(`✅ *Mis à jour !* ${labels[pending.type]}`, { parse_mode: "Markdown" });

      // Refresh the settings message if we have the chat
      if (updated && pending.chatId && pending.messageId) {
        try {
          await ctx.telegram.editMessageText(
            pending.chatId,
            pending.messageId,
            undefined,
            buildSettingsText(updated),
            {
              parse_mode: "Markdown",
              reply_markup: buildSettingsKeyboard(updated),
            }
          );
        } catch {}
      }
    } else if (pending.type === "welcomeMessage" || pending.type === "rulesText") {
      await db
        .update(botGroupsTable)
        .set({ [pending.type]: value, updatedAt: new Date() })
        .where(eq(botGroupsTable.telegramId, pending.groupId));

      const updated = await db
        .select()
        .from(botGroupsTable)
        .where(eq(botGroupsTable.telegramId, pending.groupId))
        .limit(1)
        .then((r) => r[0]);

      const label = pending.type === "welcomeMessage" ? "Message de bienvenue" : "Règles du groupe";
      await ctx.reply(`✅ *${label} mis à jour !*`, { parse_mode: "Markdown" });

      if (updated && pending.chatId && pending.messageId) {
        try {
          await ctx.telegram.editMessageText(
            pending.chatId,
            pending.messageId,
            undefined,
            buildSettingsText(updated),
            {
              parse_mode: "Markdown",
              reply_markup: buildSettingsKeyboard(updated),
            }
          );
        } catch {}
      }
    }
  });

  // ─── /warn ────────────────────────────────────────────────────────────────
  bot.command("warn", async (ctx) => {
    if (ctx.chat.type === "private") return;
    if (!(await isAdmin(ctx))) {
      return ctx.reply("❌ Seuls les administrateurs peuvent utiliser cette commande.");
    }

    const target = ctx.message.reply_to_message?.from;
    if (!target) {
      return ctx.reply("↩️ Répondez au message d'un utilisateur pour l'avertir.");
    }
    if (target.is_bot) return ctx.reply("❌ Impossible d'avertir un bot.");

    const args = ctx.message.text.split(" ").slice(1).join(" ");
    const reason = args || "Comportement inapproprié";
    const groupId = getGroupId(ctx.chat.id);
    const userId = getUserId(target.id);

    await ensureGroup(ctx.chat.id, ctx.chat.title ?? "Groupe");

    await db.insert(botWarningsTable).values({
      telegramGroupId: groupId,
      telegramUserId: userId,
      username: target.username ?? null,
      firstName: target.first_name,
      reason,
      warnedByUserId: getUserId(ctx.from!.id),
    });

    await db.insert(botViolationsTable).values({
      telegramGroupId: groupId,
      telegramUserId: userId,
      username: target.username ?? null,
      firstName: target.first_name,
      violationType: "warning",
      action: "warn",
      details: reason,
    });

    const [{ count: totalWarns }] = await db
      .select({ count: count() })
      .from(botWarningsTable)
      .where(and(eq(botWarningsTable.telegramGroupId, groupId), eq(botWarningsTable.telegramUserId, userId)));

    const group = await db
      .select()
      .from(botGroupsTable)
      .where(eq(botGroupsTable.telegramId, groupId))
      .limit(1);
    const maxWarnings = group[0]?.maxWarnings ?? 3;

    if (Number(totalWarns) >= maxWarnings) {
      try {
        await ctx.telegram.banChatMember(ctx.chat.id, target.id);
        await db.insert(botBansTable).values({
          telegramGroupId: groupId,
          telegramUserId: userId,
          username: target.username ?? null,
          firstName: target.first_name,
          reason: `Auto-ban après ${maxWarnings} avertissements`,
          bannedByUserId: "bot",
        });
        await db.insert(botViolationsTable).values({
          telegramGroupId: groupId,
          telegramUserId: userId,
          username: target.username ?? null,
          firstName: target.first_name,
          violationType: "auto_ban",
          action: "ban",
          details: `Banni automatiquement après ${maxWarnings} avertissements`,
        });
        await ctx.reply(
          `🔨 *${target.first_name}* a été *banni automatiquement* après ${maxWarnings} avertissements.`,
          { parse_mode: "Markdown" }
        );
      } catch (err) {
        logger.error({ err }, "Failed to auto-ban user");
      }
    } else {
      await ctx.reply(
        `⚠️ *Avertissement* pour ${target.first_name}\n` +
          `📝 Raison : ${reason}\n` +
          `🔢 Total : ${totalWarns}/${maxWarnings}`,
        { parse_mode: "Markdown" }
      );
    }
  });

  // ─── /ban ─────────────────────────────────────────────────────────────────
  bot.command("ban", async (ctx) => {
    if (ctx.chat.type === "private") return;
    if (!(await isAdmin(ctx))) {
      return ctx.reply("❌ Seuls les administrateurs peuvent utiliser cette commande.");
    }

    const target = ctx.message.reply_to_message?.from;
    if (!target) return ctx.reply("↩️ Répondez au message de l'utilisateur à bannir.");
    if (target.is_bot) return ctx.reply("❌ Impossible de bannir un bot.");

    const args = ctx.message.text.split(" ").slice(1).join(" ");
    const reason = args || "Raison non spécifiée";
    const groupId = getGroupId(ctx.chat.id);
    const userId = getUserId(target.id);

    await ensureGroup(ctx.chat.id, ctx.chat.title ?? "Groupe");

    try {
      await ctx.telegram.banChatMember(ctx.chat.id, target.id);
      await db.insert(botBansTable).values({
        telegramGroupId: groupId,
        telegramUserId: userId,
        username: target.username ?? null,
        firstName: target.first_name,
        reason,
        bannedByUserId: getUserId(ctx.from!.id),
      });
      await db.insert(botViolationsTable).values({
        telegramGroupId: groupId,
        telegramUserId: userId,
        username: target.username ?? null,
        firstName: target.first_name,
        violationType: "ban",
        action: "ban",
        details: reason,
      });
      await ctx.reply(`🔨 *${target.first_name}* a été banni.\n📝 Raison : ${reason}`, {
        parse_mode: "Markdown",
      });
    } catch (err) {
      logger.error({ err }, "Failed to ban user");
      await ctx.reply("❌ Impossible de bannir. Vérifiez que j'ai les droits d'administrateur.");
    }
  });

  // ─── /unban ───────────────────────────────────────────────────────────────
  bot.command("unban", async (ctx) => {
    if (ctx.chat.type === "private") return;
    if (!(await isAdmin(ctx))) {
      return ctx.reply("❌ Seuls les administrateurs peuvent utiliser cette commande.");
    }

    const target = ctx.message.reply_to_message?.from;
    if (!target) return ctx.reply("↩️ Répondez au message de l'utilisateur à débannir.");

    const groupId = getGroupId(ctx.chat.id);
    const userId = getUserId(target.id);

    try {
      await ctx.telegram.unbanChatMember(ctx.chat.id, target.id);
      await db
        .update(botBansTable)
        .set({ unbannedAt: new Date() })
        .where(
          and(
            eq(botBansTable.telegramGroupId, groupId),
            eq(botBansTable.telegramUserId, userId),
            eq(botBansTable.unbannedAt, null as any)
          )
        );
      await ctx.reply(`✅ *${target.first_name}* a été débanni.`, { parse_mode: "Markdown" });
    } catch (err) {
      logger.error({ err }, "Failed to unban user");
      await ctx.reply("❌ Impossible de débannir cet utilisateur.");
    }
  });

  // ─── /kick ────────────────────────────────────────────────────────────────
  bot.command("kick", async (ctx) => {
    if (ctx.chat.type === "private") return;
    if (!(await isAdmin(ctx))) {
      return ctx.reply("❌ Seuls les administrateurs peuvent utiliser cette commande.");
    }

    const target = ctx.message.reply_to_message?.from;
    if (!target) return ctx.reply("↩️ Répondez au message de l'utilisateur à expulser.");
    if (target.is_bot) return ctx.reply("❌ Impossible d'expulser un bot.");

    const groupId = getGroupId(ctx.chat.id);
    const userId = getUserId(target.id);

    await ensureGroup(ctx.chat.id, ctx.chat.title ?? "Groupe");

    try {
      await ctx.telegram.banChatMember(ctx.chat.id, target.id);
      await ctx.telegram.unbanChatMember(ctx.chat.id, target.id);
      await db.insert(botViolationsTable).values({
        telegramGroupId: groupId,
        telegramUserId: userId,
        username: target.username ?? null,
        firstName: target.first_name,
        violationType: "kick",
        action: "kick",
        details: "Expulsé du groupe",
      });
      await ctx.reply(`👢 *${target.first_name}* a été expulsé du groupe.`, { parse_mode: "Markdown" });
    } catch (err) {
      logger.error({ err }, "Failed to kick user");
      await ctx.reply("❌ Impossible d'expulser cet utilisateur.");
    }
  });

  // ─── /mute ────────────────────────────────────────────────────────────────
  bot.command("mute", async (ctx) => {
    if (ctx.chat.type === "private") return;
    if (!(await isAdmin(ctx))) {
      return ctx.reply("❌ Seuls les administrateurs peuvent utiliser cette commande.");
    }

    const target = ctx.message.reply_to_message?.from;
    if (!target) return ctx.reply("↩️ Répondez au message de l'utilisateur à rendre muet.");
    if (target.is_bot) return ctx.reply("❌ Impossible de rendre un bot muet.");

    const args = ctx.message.text.split(" ").slice(1);
    const minutes = parseInt(args[0] ?? "", 10) || 30;
    const untilDate = Math.floor(Date.now() / 1000) + minutes * 60;
    const groupId = getGroupId(ctx.chat.id);
    const userId = getUserId(target.id);

    await ensureGroup(ctx.chat.id, ctx.chat.title ?? "Groupe");

    try {
      await ctx.telegram.restrictChatMember(ctx.chat.id, target.id, {
        permissions: { can_send_messages: false },
        until_date: untilDate,
      });
      await db.insert(botViolationsTable).values({
        telegramGroupId: groupId,
        telegramUserId: userId,
        username: target.username ?? null,
        firstName: target.first_name,
        violationType: "mute",
        action: "mute",
        details: `Muet pour ${minutes} minutes`,
      });
      await ctx.reply(`🔇 *${target.first_name}* est muet pour *${minutes} minutes*.`, {
        parse_mode: "Markdown",
      });
    } catch (err) {
      logger.error({ err }, "Failed to mute user");
      await ctx.reply("❌ Impossible de rendre cet utilisateur muet. Vérifiez mes droits d'administrateur.");
    }
  });

  // ─── /unmute ──────────────────────────────────────────────────────────────
  bot.command("unmute", async (ctx) => {
    if (ctx.chat.type === "private") return;
    if (!(await isAdmin(ctx))) {
      return ctx.reply("❌ Seuls les administrateurs peuvent utiliser cette commande.");
    }

    const target = ctx.message.reply_to_message?.from;
    if (!target) return ctx.reply("↩️ Répondez au message de l'utilisateur à désilencier.");

    try {
      await ctx.telegram.restrictChatMember(ctx.chat.id, target.id, {
        permissions: {
          can_send_messages: true,
          can_send_audios: true,
          can_send_documents: true,
          can_send_photos: true,
          can_send_videos: true,
          can_send_video_notes: true,
          can_send_voice_notes: true,
          can_send_polls: true,
          can_send_other_messages: true,
          can_add_web_page_previews: true,
        },
      });
      await ctx.reply(`🔊 *${target.first_name}* peut de nouveau parler.`, { parse_mode: "Markdown" });
    } catch (err) {
      logger.error({ err }, "Failed to unmute user");
      await ctx.reply("❌ Impossible de lever le silence.");
    }
  });

  // ─── /warnings ────────────────────────────────────────────────────────────
  bot.command("warnings", async (ctx) => {
    if (ctx.chat.type === "private") return;

    const target = ctx.message.reply_to_message?.from ?? ctx.from;
    if (!target) return;

    const groupId = getGroupId(ctx.chat.id);
    const userId = getUserId(target.id);

    const warns = await db
      .select()
      .from(botWarningsTable)
      .where(and(eq(botWarningsTable.telegramGroupId, groupId), eq(botWarningsTable.telegramUserId, userId)));

    const group = await db
      .select()
      .from(botGroupsTable)
      .where(eq(botGroupsTable.telegramId, groupId))
      .limit(1);
    const maxWarnings = group[0]?.maxWarnings ?? 3;

    if (warns.length === 0) {
      await ctx.reply(`✅ *${target.first_name}* n'a aucun avertissement.`, { parse_mode: "Markdown" });
    } else {
      const list = warns
        .slice(-5)
        .map(
          (w, i) =>
            `${i + 1}. ${w.reason ?? "Sans raison"} (${new Date(w.createdAt).toLocaleDateString("fr-FR")})`
        )
        .join("\n");
      await ctx.reply(
        `⚠️ *Avertissements de ${target.first_name}* : ${warns.length}/${maxWarnings}\n\n${list}`,
        { parse_mode: "Markdown" }
      );
    }
  });

  // ─── /unwarn ──────────────────────────────────────────────────────────────
  bot.command("unwarn", async (ctx) => {
    if (ctx.chat.type === "private") return;
    if (!(await isAdmin(ctx))) {
      return ctx.reply("❌ Seuls les administrateurs peuvent utiliser cette commande.");
    }

    const target = ctx.message.reply_to_message?.from;
    if (!target) return ctx.reply("↩️ Répondez au message de l'utilisateur.");

    const groupId = getGroupId(ctx.chat.id);
    const userId = getUserId(target.id);

    const lastWarn = await db
      .select()
      .from(botWarningsTable)
      .where(and(eq(botWarningsTable.telegramGroupId, groupId), eq(botWarningsTable.telegramUserId, userId)))
      .orderBy(botWarningsTable.createdAt)
      .limit(1);

    if (lastWarn.length === 0) {
      return ctx.reply(`✅ *${target.first_name}* n'a aucun avertissement à retirer.`, {
        parse_mode: "Markdown",
      });
    }

    await db.delete(botWarningsTable).where(eq(botWarningsTable.id, lastWarn[0].id));
    await ctx.reply(`✅ Dernier avertissement de *${target.first_name}* retiré.`, { parse_mode: "Markdown" });
  });

  // ─── Nouveaux membres ─────────────────────────────────────────────────────
  bot.on("new_chat_members", async (ctx) => {
    const newMembers = ctx.message.new_chat_members;
    const group = await ensureGroup(ctx.chat.id, ctx.chat.title ?? "Groupe");

    for (const member of newMembers) {
      if (member.is_bot) continue;
      const name = member.first_name;
      const welcomeText = group?.welcomeMessage
        ? group.welcomeMessage
            .replace("{name}", name)
            .replace("{group}", ctx.chat.title ?? "ce groupe")
        : `👋 Bienvenue *${name}* dans le groupe ! Veuillez lire les règles avec /rules.`;
      await ctx.reply(welcomeText, { parse_mode: "Markdown" });
    }
  });

  // ─── Membres qui partent ──────────────────────────────────────────────────
  bot.on("left_chat_member", async (ctx) => {
    const member = ctx.message.left_chat_member;
    if (member.is_bot) return;
    await ctx.reply(`👋 Au revoir *${member.first_name}* !`, { parse_mode: "Markdown" });
  });

  logger.info("Bot commands registered");
}
