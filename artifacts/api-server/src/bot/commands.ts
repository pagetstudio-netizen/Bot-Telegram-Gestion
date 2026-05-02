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

async function ensureGroup(chatId: number, title: string) {
  const existing = await db
    .select()
    .from(botGroupsTable)
    .where(eq(botGroupsTable.telegramId, getGroupId(chatId)))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(botGroupsTable).values({
      telegramId: getGroupId(chatId),
      title,
    });
  }
  return db
    .select()
    .from(botGroupsTable)
    .where(eq(botGroupsTable.telegramId, getGroupId(chatId)))
    .limit(1)
    .then((r) => r[0]);
}

export function setupCommands(bot: Telegraf) {
  bot.command("start", async (ctx) => {
    if (ctx.chat.type === "private") {
      await ctx.reply(
        "🤖 *Bot Modérateur Telegram*\n\n" +
          "Ajoutez-moi à votre groupe et donnez-moi les droits d'administrateur pour commencer la modération.\n\n" +
          "*Commandes disponibles :*\n" +
          "/help - Aide\n" +
          "/rules - Règles du groupe\n" +
          "/stats - Statistiques\n" +
          "/warn @user [raison] - Avertir un utilisateur\n" +
          "/ban @user [raison] - Bannir un utilisateur\n" +
          "/unban @user - Débannir un utilisateur\n" +
          "/kick @user - Expulser un utilisateur\n" +
          "/mute @user [durée] - Rendre muet un utilisateur\n" +
          "/unmute @user - Retirer le silence\n" +
          "/warnings @user - Voir les avertissements\n" +
          "/settings - Paramètres du groupe",
        { parse_mode: "Markdown" }
      );
    }
  });

  bot.command("help", async (ctx) => {
    await ctx.reply(
      "🛡️ *Commandes du bot modérateur*\n\n" +
        "👮 *Modération (admins uniquement) :*\n" +
        "/warn @user [raison] - Donner un avertissement\n" +
        "/unwarn @user - Retirer le dernier avertissement\n" +
        "/ban @user [raison] - Bannir un utilisateur\n" +
        "/unban @user - Débannir un utilisateur\n" +
        "/kick @user - Expulser du groupe\n" +
        "/mute @user [minutes] - Rendre muet\n" +
        "/unmute @user - Retirer le silence\n\n" +
        "📊 *Informations :*\n" +
        "/warnings [@user] - Voir les avertissements\n" +
        "/rules - Afficher les règles\n" +
        "/stats - Statistiques du groupe",
      { parse_mode: "Markdown" }
    );
  });

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
      await ctx.reply("❌ Aucune règle n'a été définie pour ce groupe.");
    }
  });

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
      `📊 *Statistiques du groupe*\n\n` +
        `⚠️ Avertissements : ${warnCount?.count ?? 0}\n` +
        `🔨 Bans actifs : ${banCount?.count ?? 0}\n` +
        `🚨 Violations : ${violCount?.count ?? 0}`,
      { parse_mode: "Markdown" }
    );
  });

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

    await db.insert(botViolationsTable).values({
      telegramGroupId: groupId,
      telegramUserId: userId,
      username: target.username ?? null,
      firstName: target.first_name,
      violationType: "warning",
      action: "warn",
      details: reason,
    });

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
          `🔨 ${target.first_name} a été *banni automatiquement* après ${maxWarnings} avertissements.`,
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
      await ctx.reply("❌ Impossible de bannir cet utilisateur. Vérifiez mes droits d'administrateur.");
    }
  });

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
      await ctx.reply(`🔇 *${target.first_name}* est muet pour ${minutes} minutes.`, {
        parse_mode: "Markdown",
      });
    } catch (err) {
      logger.error({ err }, "Failed to mute user");
      await ctx.reply("❌ Impossible de rendre cet utilisateur muet.");
    }
  });

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
        .map((w, i) => `${i + 1}. ${w.reason ?? "Sans raison"} (${new Date(w.createdAt).toLocaleDateString("fr-FR")})`)
        .join("\n");
      await ctx.reply(
        `⚠️ *Avertissements de ${target.first_name}* : ${warns.length}/${maxWarnings}\n\n${list}`,
        { parse_mode: "Markdown" }
      );
    }
  });

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

  bot.on("new_chat_members", async (ctx) => {
    const newMembers = ctx.message.new_chat_members;
    const groupId = getGroupId(ctx.chat.id);
    const group = await ensureGroup(ctx.chat.id, ctx.chat.title ?? "Groupe");

    for (const member of newMembers) {
      if (member.is_bot) continue;
      const name = member.first_name;
      const welcomeText = group?.welcomeMessage
        ? group.welcomeMessage.replace("{name}", name).replace("{group}", ctx.chat.title ?? "ce groupe")
        : `👋 Bienvenue *${name}* dans le groupe ! Veuillez lire les règles avec /rules.`;
      await ctx.reply(welcomeText, { parse_mode: "Markdown" });
    }
  });

  bot.on("left_chat_member", async (ctx) => {
    const member = ctx.message.left_chat_member;
    if (member.is_bot) return;
    await ctx.reply(`👋 Au revoir *${member.first_name}* !`, { parse_mode: "Markdown" });
  });

  logger.info("Bot commands registered");
}
