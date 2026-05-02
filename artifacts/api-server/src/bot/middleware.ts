import { Telegraf, Context, NarrowedContext } from "telegraf";
import { Update } from "telegraf/types";
import { db } from "@workspace/db";
import {
  botGroupsTable,
  botViolationsTable,
  botWarningsTable,
  botWordFiltersTable,
  botBansTable,
} from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
import { logger } from "../lib/logger";
import { ensureGroup } from "./commands";

type MsgContext = NarrowedContext<Context, Update.MessageUpdate>;

const floodMap = new Map<string, { count: number; windowStart: number; text?: string }>();

async function getGroup(chatId: number) {
  return db
    .select()
    .from(botGroupsTable)
    .where(eq(botGroupsTable.telegramId, chatId.toString()))
    .limit(1)
    .then((r) => r[0]);
}

async function logViolation(
  groupId: string,
  userId: string,
  username: string | null,
  firstName: string,
  type: string,
  action: string,
  details?: string
) {
  await db.insert(botViolationsTable).values({
    telegramGroupId: groupId,
    telegramUserId: userId,
    username,
    firstName,
    violationType: type,
    action,
    details: details ?? null,
  });
}

async function muteUser(ctx: MsgContext, userId: number, seconds: number, groupId: string, reason: string) {
  try {
    const until = Math.floor(Date.now() / 1000) + seconds;
    await ctx.telegram.restrictChatMember(ctx.chat.id, userId, {
      permissions: { can_send_messages: false },
      until_date: until,
    });
    await logViolation(
      groupId, userId.toString(),
      (ctx as any).from?.username ?? null,
      (ctx as any).from?.first_name ?? "Inconnu",
      reason, "mute",
      `Muet auto ${Math.round(seconds / 60)} min`
    );
  } catch (err) {
    logger.error({ err }, "Auto-mute failed");
  }
}

async function deleteAndWarn(ctx: MsgContext, reason: string, groupId: string, group: any) {
  try { await ctx.deleteMessage(); } catch {}

  const userId = ctx.from!.id.toString();
  const username = ctx.from?.username ?? null;
  const firstName = ctx.from?.first_name ?? "Inconnu";

  await db.insert(botWarningsTable).values({
    telegramGroupId: groupId, telegramUserId: userId,
    username, firstName, reason, warnedByUserId: "bot",
  });

  await logViolation(groupId, userId, username, firstName, "auto_warning", "warn", reason);

  const [{ count: totalWarns }] = await db
    .select({ count: count() })
    .from(botWarningsTable)
    .where(and(eq(botWarningsTable.telegramGroupId, groupId), eq(botWarningsTable.telegramUserId, userId)));

  const maxWarnings = group.maxWarnings ?? 3;
  const msg = await ctx.reply(
    `⚠️ *${firstName}* : ${reason}\n🔢 Avertissement ${totalWarns}/${maxWarnings}`,
    { parse_mode: "Markdown" }
  );

  setTimeout(async () => {
    try { await ctx.telegram.deleteMessage(ctx.chat.id, msg.message_id); } catch {}
  }, 8000);

  if (Number(totalWarns) >= maxWarnings) {
    try {
      await ctx.telegram.banChatMember(ctx.chat.id, ctx.from!.id);
      await db.insert(botBansTable).values({
        telegramGroupId: groupId, telegramUserId: userId,
        username, firstName,
        reason: `Auto-ban après ${maxWarnings} avertissements`,
        bannedByUserId: "bot",
      });
      await logViolation(groupId, userId, username, firstName, "auto_ban", "ban",
        `Auto-ban après ${maxWarnings} avertissements`);
      await ctx.reply(`🔨 *${firstName}* a été banni après ${maxWarnings} avertissements.`, { parse_mode: "Markdown" });
    } catch (err) {
      logger.error({ err }, "Auto-ban failed");
    }
  }
}

const LINK_REGEX = /(https?:\/\/|t\.me\/|bit\.ly|tinyurl\.com)/i;

const PROFANITY_LIST = [
  "merde", "putain", "connard", "salope", "fdp", "enculé", "fils de pute",
  "bâtard", "conne", "idiot", "imbécile", "crétin",
];

export function setupMiddleware(bot: Telegraf) {
  bot.on("message", async (ctx, next) => {
    if (!ctx.chat || ctx.chat.type === "private") return next();
    if (!ctx.from || ctx.from.is_bot) return next();

    const msg = ctx.message as any;
    const text: string = msg.text ?? msg.caption ?? "";
    const groupId = ctx.chat.id.toString();
    const userId = ctx.from.id;
    const username = ctx.from.username ?? null;
    const firstName = ctx.from.first_name;

    const group = await getGroup(ctx.chat.id);
    if (!group) return next();

    // ── Si le bot est inactif, aucune modération automatique ────────────────
    if (!group.isActive) return next();

    // ── Les admins sont exemptés de toute modération ────────────────────────
    try {
      const member = await ctx.telegram.getChatMember(ctx.chat.id, userId);
      if (["administrator", "creator"].includes(member.status)) return next();
    } catch {}

    // ── Anti-flood ──────────────────────────────────────────────────────────
    if (group.antiFlood) {
      const floodKey = `${groupId}:${userId}:flood`;
      const now = Date.now();
      const flood = floodMap.get(floodKey);

      if (flood) {
        const elapsed = (now - flood.windowStart) / 1000;
        if (elapsed <= group.floodWindow) {
          flood.count++;
          if (flood.count > group.floodLimit) {
            try { await ctx.deleteMessage(); } catch {}
            if (flood.count === group.floodLimit + 1) {
              await muteUser(ctx as MsgContext, userId, group.muteDuration, groupId, "flood");
              await logViolation(groupId, userId.toString(), username, firstName, "flood", "mute",
                `Flood: ${flood.count} msgs en ${group.floodWindow}s`);
              const m = await ctx.reply(
                `🔇 *${firstName}* : Trop de messages ! Silence ${group.muteDuration / 60} min.`,
                { parse_mode: "Markdown" }
              );
              setTimeout(async () => { try { await ctx.telegram.deleteMessage(ctx.chat.id, m.message_id); } catch {} }, 8000);
            }
            return;
          }
        } else {
          floodMap.set(floodKey, { count: 1, windowStart: now });
        }
      } else {
        floodMap.set(floodKey, { count: 1, windowStart: now });
      }
    }

    // ── Anti-spam (messages dupliqués) ──────────────────────────────────────
    if (group.antiSpam && text.length > 0) {
      const spamKey = `${groupId}:${userId}:spam`;
      const last = floodMap.get(spamKey);
      if (last?.text === text) {
        try { await ctx.deleteMessage(); } catch {}
        await logViolation(groupId, userId.toString(), username, firstName, "spam", "delete", "Message dupliqué");
        const m = await ctx.reply(`🚫 *${firstName}* : Messages dupliqués interdits !`, { parse_mode: "Markdown" });
        setTimeout(async () => { try { await ctx.telegram.deleteMessage(ctx.chat.id, m.message_id); } catch {} }, 5000);
        return;
      }
      floodMap.set(spamKey, { count: 0, windowStart: Date.now(), text });
    }

    // ── Anti-liens ──────────────────────────────────────────────────────────
    if (group.antiLinks && text && LINK_REGEX.test(text)) {
      await deleteAndWarn(ctx as MsgContext, "Liens non autorisés dans ce groupe", groupId, group);
      return;
    }

    // ── Anti-profanité ──────────────────────────────────────────────────────
    if (group.antiProfanity && text) {
      const lowerText = text.toLowerCase();
      const found = PROFANITY_LIST.find((word) => lowerText.includes(word));
      if (found) {
        await deleteAndWarn(ctx as MsgContext, "Langage inapproprié", groupId, group);
        return;
      }
    }

    // ── Filtres de mots personnalisés ───────────────────────────────────────
    if (text) {
      const filters = await db
        .select()
        .from(botWordFiltersTable)
        .where(eq(botWordFiltersTable.telegramGroupId, groupId));

      const lowerText = text.toLowerCase();
      for (const filter of filters) {
        if (lowerText.includes(filter.word.toLowerCase())) {
          if (filter.action === "delete") {
            try { await ctx.deleteMessage(); } catch {}
            await logViolation(groupId, userId.toString(), username, firstName, "word_filter", "delete", `Mot interdit: ${filter.word}`);
          } else if (filter.action === "warn") {
            await deleteAndWarn(ctx as MsgContext, `Mot interdit: "${filter.word}"`, groupId, group);
          } else if (filter.action === "mute") {
            try { await ctx.deleteMessage(); } catch {}
            await muteUser(ctx as MsgContext, userId, group.muteDuration, groupId, "word_filter");
          } else if (filter.action === "ban") {
            try {
              await ctx.deleteMessage();
              await ctx.telegram.banChatMember(ctx.chat.id, userId);
              await db.insert(botBansTable).values({
                telegramGroupId: groupId, telegramUserId: userId.toString(),
                username, firstName,
                reason: `Mot interdit: ${filter.word}`, bannedByUserId: "bot",
              });
              await logViolation(groupId, userId.toString(), username, firstName, "word_filter_ban", "ban",
                `Banni pour mot interdit: ${filter.word}`);
            } catch {}
          }
          return;
        }
      }
    }

    return next();
  });

  // ── Bot ajouté au groupe — message de configuration (sans modération) ────
  bot.on("my_chat_member", async (ctx) => {
    const newStatus = ctx.myChatMember?.new_chat_member?.status;
    const oldStatus = ctx.myChatMember?.old_chat_member?.status;

    if ((newStatus === "member" || newStatus === "administrator") && ctx.chat.type !== "private") {
      const chatId = ctx.chat.id;
      const title = (ctx.chat as any).title ?? "Groupe";

      await ensureGroup(chatId, title);

      const hasAdminRights = newStatus === "administrator";

      await ctx.telegram.sendMessage(
        chatId,
        `👋 *Bonjour ! Je suis votre bot modérateur.*\n\n` +
          (hasAdminRights
            ? `✅ J'ai les droits d'administrateur.\n\n`
            : `⚠️ *Je n'ai pas encore les droits d'administrateur.*\nMerci de m'accorder les droits pour que je puisse modérer.\n\n`) +
          `🔴 *Je suis actuellement inactif.* La modération ne commencera pas tant qu'un administrateur ne m'aura pas configuré et activé.\n\n` +
          `Pour commencer, tapez /settings pour :\n` +
          `• Choisir les règles de modération\n` +
          `• Définir le message de bienvenue\n` +
          `• M'activer quand tout est prêt`,
        { parse_mode: "Markdown" }
      );

      logger.info({ chatId, title, hasAdminRights }, "Bot added to group — setup message sent (inactive)");
    }
  });

  logger.info("Bot middleware registered");
}
