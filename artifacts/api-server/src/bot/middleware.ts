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
  groupId: string, userId: string, username: string | null,
  firstName: string, type: string, action: string, details?: string
) {
  await db.insert(botViolationsTable).values({
    telegramGroupId: groupId, telegramUserId: userId,
    username, firstName, violationType: type, action, details: details ?? null,
  });
}

// ─── Appliquer une action (delete / warn / mute / ban) ────────────────────

async function applyAction(
  ctx: MsgContext,
  actionType: string,
  reason: string,
  groupId: string,
  group: any
) {
  const userId    = ctx.from!.id;
  const userIdStr = userId.toString();
  const username  = ctx.from?.username ?? null;
  const firstName = ctx.from?.first_name ?? "Inconnu";

  // Toujours supprimer le message
  try { await ctx.deleteMessage(); } catch {}

  if (actionType === "delete") {
    await logViolation(groupId, userIdStr, username, firstName, "auto_delete", "delete", reason);
    return;
  }

  if (actionType === "warn") {
    await db.insert(botWarningsTable).values({
      telegramGroupId: groupId, telegramUserId: userIdStr,
      username, firstName, reason, warnedByUserId: "bot",
    });
    await logViolation(groupId, userIdStr, username, firstName, "auto_warning", "warn", reason);

    const [{ count: totalWarns }] = await db
      .select({ count: count() })
      .from(botWarningsTable)
      .where(and(eq(botWarningsTable.telegramGroupId, groupId), eq(botWarningsTable.telegramUserId, userIdStr)));

    const maxWarnings = group.maxWarnings ?? 3;
    const msg = await ctx.reply(
      `⚠️ *${firstName}* : ${reason}\n🔢 Avertissement ${totalWarns}/${maxWarnings}`,
      { parse_mode: "Markdown" }
    );
    setTimeout(async () => { try { await ctx.telegram.deleteMessage(ctx.chat.id, msg.message_id); } catch {} }, 8000);

    if (Number(totalWarns) >= maxWarnings) {
      try {
        await ctx.telegram.banChatMember(ctx.chat.id, userId);
        await db.insert(botBansTable).values({
          telegramGroupId: groupId, telegramUserId: userIdStr,
          username, firstName,
          reason: `Auto-ban après ${maxWarnings} avertissements`, bannedByUserId: "bot",
        });
        await logViolation(groupId, userIdStr, username, firstName, "auto_ban", "ban",
          `Auto-ban après ${maxWarnings} avertissements`);
        await ctx.reply(`🔨 *${firstName}* banni après ${maxWarnings} avertissements.`, { parse_mode: "Markdown" });
      } catch (err) { logger.error({ err }, "Auto-ban failed"); }
    }
    return;
  }

  if (actionType === "mute") {
    try {
      const until = Math.floor(Date.now() / 1000) + (group.muteDuration ?? 300);
      await ctx.telegram.restrictChatMember(ctx.chat.id, userId, {
        permissions: { can_send_messages: false },
        until_date: until,
      });
      await logViolation(groupId, userIdStr, username, firstName, "auto_mute", "mute",
        `Muet auto ${Math.round((group.muteDuration ?? 300) / 60)} min — ${reason}`);
      const m = await ctx.reply(
        `🔇 *${firstName}* : ${reason} — Silence ${Math.round((group.muteDuration ?? 300) / 60)} min.`,
        { parse_mode: "Markdown" }
      );
      setTimeout(async () => { try { await ctx.telegram.deleteMessage(ctx.chat.id, m.message_id); } catch {} }, 8000);
    } catch (err) { logger.error({ err }, "Auto-mute failed"); }
    return;
  }

  if (actionType === "ban") {
    try {
      await ctx.telegram.banChatMember(ctx.chat.id, userId);
      await db.insert(botBansTable).values({
        telegramGroupId: groupId, telegramUserId: userIdStr,
        username, firstName, reason: `Banni automatiquement : ${reason}`, bannedByUserId: "bot",
      });
      await logViolation(groupId, userIdStr, username, firstName, "auto_ban", "ban",
        `Banni : ${reason}`);
      await ctx.reply(`🔨 *${firstName}* banni : ${reason}`, { parse_mode: "Markdown" });
    } catch (err) { logger.error({ err }, "Auto-ban failed"); }
    return;
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

    const msg  = ctx.message as any;
    const text: string = msg.text ?? msg.caption ?? "";
    const groupId   = ctx.chat.id.toString();
    const userId    = ctx.from.id;
    const username  = ctx.from.username ?? null;
    const firstName = ctx.from.first_name;

    const group = await getGroup(ctx.chat.id);
    if (!group) return next();

    // Si le bot est inactif, aucune modération automatique
    if (!group.isActive) return next();

    // Les admins sont exemptés
    try {
      const member = await ctx.telegram.getChatMember(ctx.chat.id, userId);
      if (["administrator", "creator"].includes(member.status)) return next();
    } catch {}

    // ── Anti-flood ──────────────────────────────────────────────────────────
    if (group.antiFlood) {
      const floodKey = `${groupId}:${userId}:flood`;
      const now  = Date.now();
      const flood = floodMap.get(floodKey);

      if (flood) {
        const elapsed = (now - flood.windowStart) / 1000;
        if (elapsed <= group.floodWindow) {
          flood.count++;
          if (flood.count > group.floodLimit) {
            if (flood.count === group.floodLimit + 1) {
              await applyAction(ctx as MsgContext, group.antiFloodAction ?? "mute",
                `Flood : ${flood.count} messages en ${group.floodWindow}s`, groupId, group);
            } else {
              try { await ctx.deleteMessage(); } catch {}
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
        await applyAction(ctx as MsgContext, group.antiSpamAction ?? "delete",
          "Message dupliqué (spam)", groupId, group);
        return;
      }
      floodMap.set(spamKey, { count: 0, windowStart: Date.now(), text });
    }

    // ── Anti-liens ──────────────────────────────────────────────────────────
    if (group.antiLinks && text && LINK_REGEX.test(text)) {
      await applyAction(ctx as MsgContext, group.antiLinksAction ?? "warn",
        "Lien non autorisé dans ce groupe", groupId, group);
      return;
    }

    // ── Anti-profanité ──────────────────────────────────────────────────────
    if (group.antiProfanity && text) {
      const found = PROFANITY_LIST.find((word) => text.toLowerCase().includes(word));
      if (found) {
        await applyAction(ctx as MsgContext, group.antiProfanityAction ?? "warn",
          "Langage inapproprié", groupId, group);
        return;
      }
    }

    // ── Filtres de mots personnalisés ───────────────────────────────────────
    if (text) {
      const filters = await db.select().from(botWordFiltersTable)
        .where(eq(botWordFiltersTable.telegramGroupId, groupId));
      const lower = text.toLowerCase();
      for (const filter of filters) {
        if (lower.includes(filter.word.toLowerCase())) {
          await applyAction(ctx as MsgContext, filter.action ?? "delete",
            `Mot interdit : "${filter.word}"`, groupId, group);
          return;
        }
      }
    }

    return next();
  });

  // ── Bot ajouté au groupe ─────────────────────────────────────────────────
  bot.on("my_chat_member", async (ctx) => {
    const newStatus = ctx.myChatMember?.new_chat_member?.status;
    if ((newStatus === "member" || newStatus === "administrator") && ctx.chat.type !== "private") {
      const chatId = ctx.chat.id;
      const title  = (ctx.chat as any).title ?? "Groupe";
      await ensureGroup(chatId, title);
      const hasAdminRights = newStatus === "administrator";
      const groupId = chatId.toString();

      await ctx.telegram.sendMessage(
        chatId,
        `👋 *Bonjour ! Je suis votre bot modérateur.*\n\n` +
          (hasAdminRights
            ? `✅ J'ai les droits d'administrateur.\n\n`
            : `⚠️ *Je n'ai pas encore les droits d'administrateur.*\nMerci de m'en accorder pour pouvoir modérer.\n\n`) +
          `🔴 *Je suis actuellement inactif.*\n` +
          `La modération ne commencera pas tant qu'un administrateur ne m'aura pas configuré et activé.\n\n` +
          `*Par où commencer ?*\n` +
          `• Appuyez sur *"📋 Définir les règles"* pour écrire les règles du groupe maintenant\n` +
          `• Ou appuyez sur *"⚙️ Paramètres"* pour tout configurer`,
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "📋 Définir les règles du groupe", callback_data: `set:rules:${groupId}` },
              ],
              [
                { text: "⚙️ Ouvrir les paramètres",        callback_data: `open:settings:${groupId}` },
              ],
            ],
          },
        }
      );
      logger.info({ chatId, title, hasAdminRights }, "Bot added to group");
    }
  });

  logger.info("Bot middleware registered");
}
