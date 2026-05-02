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

// Détecte les @mentions dans le texte (publicité / auto-promotion)
const MENTION_REGEX = /@[a-zA-Z0-9_]{4,}/g;

// Mots-clés publicitaires courants (FR + EN)
const AD_KEYWORDS = [
  // Français
  "rejoignez", "rejoindre", "abonnez", "abonnement", "promotio", "promo",
  "solde", "réduction", "offre", "achetez", "vendez", "vente",
  "investissez", "investissement", "gagner de l'argent", "gagnez",
  "crypto", "bitcoin", "trading", "forex", "signal", "pump",
  "recrutement", "recrute", "cherche des membres", "groupe vip",
  "canal officiel", "chaîne officielle", "lien du groupe",
  "contactez", "contactez-moi", "dm me", "dm pour",
  // Anglais
  "join now", "join us", "subscribe", "click here", "buy now",
  "earn money", "make money", "invest", "profit", "discount",
  "limited offer", "free", "win", "giveaway", "airdrop",
  "check my", "visit my", "follow me", "check out",
];

const PROFANITY_LIST = [
  "merde", "putain", "connard", "salope", "fdp", "enculé", "fils de pute",
  "bâtard", "conne", "idiot", "imbécile", "crétin",
];

function isAdvertising(text: string, msg: any): { detected: boolean; reason: string } {
  const lower = text.toLowerCase();

  // 1. Message transféré depuis un canal (forward)
  if (msg.forward_from_chat?.type === "channel" || msg.forward_from?.is_bot) {
    return { detected: true, reason: "Message transféré depuis un canal (publicité)" };
  }

  // 2. Mentions @username dans le texte (auto-promotion)
  const mentions = text.match(MENTION_REGEX);
  if (mentions && mentions.length >= 1) {
    return { detected: true, reason: `Promotion de compte : ${mentions.slice(0, 2).join(", ")}` };
  }

  // 3. Mots-clés publicitaires
  const found = AD_KEYWORDS.find((kw) => lower.includes(kw.toLowerCase()));
  if (found) {
    return { detected: true, reason: `Contenu publicitaire détecté : "${found}"` };
  }

  // 4. Beaucoup de points d'exclamation / majuscules (style pub)
  const exclamations = (text.match(/!/g) ?? []).length;
  const upperRatio = text.replace(/[^A-ZÀ-Ü]/g, "").length / Math.max(text.replace(/\s/g, "").length, 1);
  if (exclamations >= 3 && text.length > 20) {
    return { detected: true, reason: "Message au style publicitaire (exclamations excessives)" };
  }
  if (upperRatio > 0.6 && text.length > 15) {
    return { detected: true, reason: "Message en majuscules (style publicitaire)" };
  }

  return { detected: false, reason: "" };
}

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

    // ── Anti-publicité ──────────────────────────────────────────────────────
    if (group.antiAdvertising) {
      const adCheck = isAdvertising(text, ctx.message);
      if (adCheck.detected) {
        await applyAction(ctx as MsgContext, group.antiAdvertisingAction ?? "warn",
          adCheck.reason, groupId, group);
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

  // ── Vérification à l'entrée (nouveaux membres) ──────────────────────────
  // Map: "groupId:userId" → { msgId, timer }
  const pendingVerifications = new Map<string, { msgId: number; timer: ReturnType<typeof setTimeout> }>();

  bot.on("chat_member", async (ctx) => {
    const update = ctx.chatMember;
    const newMember = update.new_chat_member;
    const oldMember = update.old_chat_member;

    // Seulement quand quelqu'un rejoint (pas les bots)
    const isJoining = ["left", "kicked", "restricted"].includes(oldMember.status)
      && ["member", "restricted"].includes(newMember.status);
    if (!isJoining) return;
    if (newMember.user.is_bot) return;

    const chatId = ctx.chat.id;
    const group = await getGroup(chatId);
    if (!group || !group.isActive || !group.requireVerification) return;

    const user = newMember.user;
    const name = user.first_name + (user.last_name ? ` ${user.last_name}` : "");
    const groupId = chatId.toString();
    const verKey = `${groupId}:${user.id}`;

    // 1. Mute le nouveau membre immédiatement
    try {
      await ctx.telegram.restrictChatMember(chatId, user.id, {
        permissions: {
          can_send_messages: false,
          can_send_audios: false,
          can_send_documents: false,
          can_send_photos: false,
          can_send_videos: false,
          can_send_video_notes: false,
          can_send_voice_notes: false,
          can_send_polls: false,
          can_send_other_messages: false,
          can_add_web_page_previews: false,
        },
      });
    } catch (err) {
      logger.warn({ err }, "Impossible de muter le nouveau membre");
      return;
    }

    // 2. Envoyer message de bienvenue avec bouton d'acceptation
    const rulesPreview = group.rulesText
      ? `\n\n📋 *Règles du groupe :*\n${group.rulesText.slice(0, 300)}${group.rulesText.length > 300 ? "…" : ""}`
      : "";

    const timeout = group.verificationTimeout ?? 5;
    const welcomeText = group.welcomeMessage
      ? `${group.welcomeMessage}\n\n⏱️ Vous avez *${timeout} minute(s)* pour accepter.`
      : `👋 Bienvenue *${name}* !\n\nAvant de pouvoir écrire dans ce groupe, vous devez lire et accepter nos règles.${rulesPreview}\n\n⏱️ Vous avez *${timeout} minute(s)* pour accepter.`;

    let sentMsg: any;
    try {
      sentMsg = await ctx.telegram.sendMessage(chatId, welcomeText, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[
            { text: "✅ J'accepte les règles et je rejoins le groupe", callback_data: `verify:${user.id}:${groupId}` },
          ]],
        },
      });
    } catch (err) {
      logger.error({ err }, "Impossible d'envoyer le message de vérification");
      return;
    }

    // 3. Timer d'expulsion si pas de vérification dans le délai
    const timer = setTimeout(async () => {
      pendingVerifications.delete(verKey);
      try { await ctx.telegram.deleteMessage(chatId, sentMsg.message_id); } catch {}
      try {
        await ctx.telegram.banChatMember(chatId, user.id);
        await ctx.telegram.unbanChatMember(chatId, user.id); // kick sans ban permanent
        await ctx.telegram.sendMessage(chatId,
          `⏱️ *${name}* n'a pas accepté les règles dans le délai imparti et a été retiré du groupe.`,
          { parse_mode: "Markdown" }
        );
        logger.info({ chatId, userId: user.id }, "Membre non vérifié expulsé");
      } catch (err) {
        logger.warn({ err }, "Expulsion du membre non vérifié échouée");
      }
    }, timeout * 60 * 1000);

    pendingVerifications.set(verKey, { msgId: sentMsg.message_id, timer });

    // Exposer la map pour que le callback_query puisse y accéder
    (bot as any).__pendingVerifications = pendingVerifications;

    logger.info({ chatId, userId: user.id, name }, "Vérification en attente");
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
