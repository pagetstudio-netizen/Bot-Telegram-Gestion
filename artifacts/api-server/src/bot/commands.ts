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
    .values({ telegramId: getGroupId(chatId), title, isActive: false })
    .onConflictDoNothing();

  return db
    .select()
    .from(botGroupsTable)
    .where(eq(botGroupsTable.telegramId, getGroupId(chatId)))
    .limit(1)
    .then((r) => r[0]);
}

// ─── Labels & helpers ──────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
  delete: "🗑️ Supprimer",
  warn:   "⚠️ Avertir",
  mute:   "🔇 Rendre muet",
  ban:    "🔨 Bannir",
};

const ACTION_KEYS = ["delete", "warn", "mute", "ban"];

function actionRow(label: string, fieldKey: string, current: string, gid: string) {
  return ACTION_KEYS.map((a) => ({
    text: a === current ? `✅ ${ACTION_LABELS[a]}` : ACTION_LABELS[a],
    callback_data: `setact:${fieldKey}:${a}:${gid}`,
  }));
}

// ─── Main settings keyboard ────────────────────────────────────────────────

function buildSettingsKeyboard(group: any) {
  const rows: any[][] = [];

  // Activation
  rows.push([{
    text: group.isActive
      ? "🟢 Bot ACTIF — Appuyer pour désactiver"
      : "🔴 Bot INACTIF — Appuyer pour activer",
    callback_data: `toggle:isActive:${group.telegramId}`,
  }]);

  // Toggles protection
  rows.push([
    { text: `${group.antiSpam   ? "✅" : "❌"} Anti-Spam`,         callback_data: `toggle:antiSpam:${group.telegramId}` },
    { text: `${group.antiFlood  ? "✅" : "❌"} Anti-Flood`,        callback_data: `toggle:antiFlood:${group.telegramId}` },
  ]);
  rows.push([
    { text: `${group.antiLinks     ? "✅" : "❌"} Anti-Liens`,       callback_data: `toggle:antiLinks:${group.telegramId}` },
    { text: `${group.antiProfanity ? "✅" : "❌"} Anti-Grossièretés`, callback_data: `toggle:antiProfanity:${group.telegramId}` },
  ]);

  // Action buttons — visible seulement si la protection est activée
  if (group.antiLinks) {
    rows.push([{ text: `⚙️ Si lien détecté → ${ACTION_LABELS[group.antiLinksAction] ?? group.antiLinksAction}`, callback_data: `actmenu:links:${group.telegramId}` }]);
  }
  if (group.antiSpam) {
    rows.push([{ text: `⚙️ Si spam détecté → ${ACTION_LABELS[group.antiSpamAction] ?? group.antiSpamAction}`, callback_data: `actmenu:spam:${group.telegramId}` }]);
  }
  if (group.antiProfanity) {
    rows.push([{ text: `⚙️ Si grossièreté → ${ACTION_LABELS[group.antiProfanityAction] ?? group.antiProfanityAction}`, callback_data: `actmenu:profanity:${group.telegramId}` }]);
  }
  if (group.antiFlood) {
    rows.push([{ text: `⚙️ Si flood → ${ACTION_LABELS[group.antiFloodAction] ?? group.antiFloodAction}`, callback_data: `actmenu:flood:${group.telegramId}` }]);
  }

  // Limites numériques
  rows.push([
    { text: `⚠️ Max avert. : ${group.maxWarnings}`,       callback_data: `change:maxWarnings:${group.telegramId}` },
    { text: `🔇 Mute : ${group.muteDuration / 60} min`,   callback_data: `change:muteDuration:${group.telegramId}` },
  ]);
  rows.push([
    { text: `🌊 Flood : ${group.floodLimit} msg/${group.floodWindow}s`, callback_data: `change:floodLimit:${group.telegramId}` },
  ]);

  // Messages personnalisés
  rows.push([
    { text: "✏️ Message de bienvenue", callback_data: `set:welcome:${group.telegramId}` },
    { text: "📋 Règles du groupe",     callback_data: `set:rules:${group.telegramId}` },
  ]);

  // Terminer
  rows.push([{ text: "✅ Terminer", callback_data: `done:${group.telegramId}` }]);

  return { inline_keyboard: rows };
}

// ─── Action submenu keyboard ───────────────────────────────────────────────

const ACTION_MENU_META: Record<string, { label: string; field: string }> = {
  links:     { label: "lien détecté",    field: "antiLinksAction" },
  spam:      { label: "spam détecté",    field: "antiSpamAction" },
  profanity: { label: "grossièreté",     field: "antiProfanityAction" },
  flood:     { label: "flood détecté",   field: "antiFloodAction" },
};

function buildActionMenuKeyboard(menuKey: string, current: string, gid: string) {
  const rows: any[][] = [];
  rows.push([
    { text: current === "delete" ? "✅ 🗑️ Supprimer" : "🗑️ Supprimer",  callback_data: `setact:${menuKey}:delete:${gid}` },
    { text: current === "warn"   ? "✅ ⚠️ Avertir"   : "⚠️ Avertir",    callback_data: `setact:${menuKey}:warn:${gid}` },
  ]);
  rows.push([
    { text: current === "mute" ? "✅ 🔇 Rendre muet" : "🔇 Rendre muet", callback_data: `setact:${menuKey}:mute:${gid}` },
    { text: current === "ban"  ? "✅ 🔨 Bannir"       : "🔨 Bannir",      callback_data: `setact:${menuKey}:ban:${gid}` },
  ]);
  rows.push([{ text: "← Retour aux paramètres", callback_data: `back:${gid}` }]);
  return { inline_keyboard: rows };
}

function buildActionMenuText(menuKey: string, current: string) {
  const meta = ACTION_MENU_META[menuKey];
  return (
    `⚙️ *Action si ${meta?.label ?? menuKey}*\n\n` +
    `Que doit faire le bot quand un membre enfreint cette règle ?\n\n` +
    `Action actuelle : *${ACTION_LABELS[current] ?? current}*\n\n` +
    `• 🗑️ *Supprimer* — Efface uniquement le message\n` +
    `• ⚠️ *Avertir* — Supprime + donne un avertissement (auto-ban après max atteint)\n` +
    `• 🔇 *Rendre muet* — Supprime + silence temporaire\n` +
    `• 🔨 *Bannir* — Supprime + expulsion définitive`
  );
}

// ─── Settings text ─────────────────────────────────────────────────────────

function buildSettingsText(group: any) {
  const statusLine = group.isActive
    ? "🟢 *Statut : ACTIF* — La modération est en cours."
    : "🔴 *Statut : INACTIF* — La modération est en pause.\n_Activez le bot pour commencer._";

  const actionLine = (enabled: boolean, action: string) =>
    enabled ? ` → ${ACTION_LABELS[action] ?? action}` : "";

  return (
    `⚙️ *Paramètres — ${group.title}*\n\n` +
    `${statusLine}\n\n` +
    `🛡️ *Protection :*\n` +
    `• Anti-Spam : ${group.antiSpam ? "✅" : "❌"}${actionLine(group.antiSpam, group.antiSpamAction)}\n` +
    `• Anti-Flood : ${group.antiFlood ? "✅" : "❌"}${actionLine(group.antiFlood, group.antiFloodAction)}\n` +
    `• Anti-Liens : ${group.antiLinks ? "✅" : "❌"}${actionLine(group.antiLinks, group.antiLinksAction)}\n` +
    `• Anti-Grossièretés : ${group.antiProfanity ? "✅" : "❌"}${actionLine(group.antiProfanity, group.antiProfanityAction)}\n\n` +
    `📊 *Limites :*\n` +
    `• Max avertissements avant ban : ${group.maxWarnings}\n` +
    `• Durée du mute auto : ${group.muteDuration / 60} min\n` +
    `• Anti-flood : ${group.floodLimit} msg en ${group.floodWindow}s\n\n` +
    `💬 *Messages :*\n` +
    `• Bienvenue : ${group.welcomeMessage ? "✅ Configuré" : "❌ Non configuré"}\n` +
    `• Règles : ${group.rulesText ? "✅ Configurées" : "❌ Non configurées"}`
  );
}

// ─── Pending inputs store ──────────────────────────────────────────────────

const pendingInputs = new Map<
  string,
  { type: string; groupId: string; chatId: number; messageId?: number }
>();

// ─── Setup ────────────────────────────────────────────────────────────────

export function setupCommands(bot: Telegraf) {

  // /start
  bot.command("start", async (ctx) => {
    if (ctx.chat.type === "private") {
      await ctx.reply(
        "🤖 *Bot Modérateur Telegram*\n\n" +
          "Ajoutez-moi à votre groupe, donnez-moi les droits d'administrateur, puis tapez /settings pour configurer et activer la modération.\n\n" +
          "/settings — ⚙️ Paramètres & activation\n" +
          "/help — ❓ Aide complète",
        { parse_mode: "Markdown" }
      );
    }
  });

  // /help
  bot.command("help", async (ctx) => {
    await ctx.reply(
      "🛡️ *Commandes du bot modérateur*\n\n" +
        "⚙️ *Configuration (admins) :*\n" +
        "/settings — Paramètres & activer/désactiver le bot\n" +
        "/setwelcome [texte] — Message de bienvenue\n" +
        "/setrules [texte] — Règles du groupe\n\n" +
        "👮 *Modération (admins) :*\n" +
        "/warn (répondre) [raison] — Avertissement\n" +
        "/unwarn (répondre) — Retirer dernier avertissement\n" +
        "/ban (répondre) [raison] — Bannir\n" +
        "/unban (répondre) — Débannir\n" +
        "/kick (répondre) — Expulser\n" +
        "/mute (répondre) [minutes] — Rendre muet\n" +
        "/unmute (répondre) — Lever le silence\n\n" +
        "📊 *Informations :*\n" +
        "/warnings (répondre) — Voir les avertissements\n" +
        "/rules — Afficher les règles\n" +
        "/stats — Statistiques du groupe",
      { parse_mode: "Markdown" }
    );
  });

  // /settings
  bot.command("settings", async (ctx) => {
    if (ctx.chat.type === "private") {
      return ctx.reply("ℹ️ Utilisez /settings directement dans votre groupe.");
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

  // /setwelcome
  bot.command("setwelcome", async (ctx) => {
    if (ctx.chat.type === "private") return;
    if (!(await isAdmin(ctx))) return ctx.reply("❌ Réservé aux administrateurs.");
    const text = ctx.message.text.split(" ").slice(1).join(" ").trim();
    if (!text) {
      return ctx.reply(
        "📝 *Utilisation :* `/setwelcome Bienvenue {name} dans {group} !`\n\nVariables : `{name}` = prénom, `{group}` = nom du groupe",
        { parse_mode: "Markdown" }
      );
    }
    await ensureGroup(ctx.chat.id, ctx.chat.title ?? "Groupe");
    await db.update(botGroupsTable)
      .set({ welcomeMessage: text, updatedAt: new Date() })
      .where(eq(botGroupsTable.telegramId, getGroupId(ctx.chat.id)));
    await ctx.reply(
      `✅ *Message de bienvenue mis à jour !*\n\n_Aperçu :_\n${text.replace("{name}", "Nouveau Membre").replace("{group}", ctx.chat.title ?? "ce groupe")}`,
      { parse_mode: "Markdown" }
    );
  });

  // /setrules
  bot.command("setrules", async (ctx) => {
    if (ctx.chat.type === "private") return;
    if (!(await isAdmin(ctx))) return ctx.reply("❌ Réservé aux administrateurs.");
    const text = ctx.message.text.split(" ").slice(1).join(" ").trim();
    if (!text) {
      return ctx.reply("📝 *Utilisation :* `/setrules 1. Soyez respectueux\\n2. Pas de spam...`", { parse_mode: "Markdown" });
    }
    await ensureGroup(ctx.chat.id, ctx.chat.title ?? "Groupe");
    await db.update(botGroupsTable)
      .set({ rulesText: text, updatedAt: new Date() })
      .where(eq(botGroupsTable.telegramId, getGroupId(ctx.chat.id)));
    await ctx.reply("✅ *Règles mises à jour !* Tapez /rules pour les afficher.", { parse_mode: "Markdown" });
  });

  // /rules
  bot.command("rules", async (ctx) => {
    if (ctx.chat.type === "private") return;
    const group = await db.select().from(botGroupsTable)
      .where(eq(botGroupsTable.telegramId, getGroupId(ctx.chat.id))).limit(1);
    if (group[0]?.rulesText) {
      await ctx.reply(`📋 *Règles du groupe :*\n\n${group[0].rulesText}`, { parse_mode: "Markdown" });
    } else {
      await ctx.reply("❌ Aucune règle définie. Un admin peut les définir avec /setrules [texte].");
    }
  });

  // /stats
  bot.command("stats", async (ctx) => {
    if (ctx.chat.type === "private") return;
    const groupId = getGroupId(ctx.chat.id);
    const [warnCount] = await db.select({ count: count() }).from(botWarningsTable).where(eq(botWarningsTable.telegramGroupId, groupId));
    const [banCount]  = await db.select({ count: count() }).from(botBansTable).where(and(eq(botBansTable.telegramGroupId, groupId), eq(botBansTable.unbannedAt, null as any)));
    const [violCount] = await db.select({ count: count() }).from(botViolationsTable).where(eq(botViolationsTable.telegramGroupId, groupId));
    await ctx.reply(
      `📊 *Statistiques — ${ctx.chat.title}*\n\n` +
        `⚠️ Avertissements : ${warnCount?.count ?? 0}\n` +
        `🔨 Bans actifs : ${banCount?.count ?? 0}\n` +
        `🚨 Violations totales : ${violCount?.count ?? 0}`,
      { parse_mode: "Markdown" }
    );
  });

  // ─── Callback query ────────────────────────────────────────────────────────
  bot.on("callback_query", async (ctx) => {
    const data = (ctx.callbackQuery as any).data as string;
    if (!data) return ctx.answerCbQuery();

    // Vérification admin
    if (ctx.chat && ctx.chat.type !== "private") {
      const member = await ctx.telegram.getChatMember(ctx.chat.id, ctx.from!.id).catch(() => null);
      if (!member || !["administrator", "creator"].includes(member.status)) {
        return ctx.answerCbQuery("❌ Seuls les administrateurs peuvent modifier les paramètres.");
      }
    }

    // Parse : action:field:groupId  ou  action:groupId  (pour done/back)
    const parts = data.split(":");
    const action = parts[0];

    // ── Terminer ────────────────────────────────────────────────────────────
    if (action === "done") {
      await ctx.answerCbQuery("✅ Configuration enregistrée !");
      try {
        await ctx.editMessageText(
          "✅ *Configuration terminée.*\n\nTapez /settings à tout moment pour modifier les paramètres.",
          { parse_mode: "Markdown" }
        );
      } catch {}
      return;
    }

    // ── Retour au menu principal ─────────────────────────────────────────────
    if (action === "back") {
      const groupId = parts.slice(1).join(":");
      const group = await db.select().from(botGroupsTable).where(eq(botGroupsTable.telegramId, groupId)).limit(1).then((r) => r[0]);
      if (!group) return ctx.answerCbQuery("❌ Groupe introuvable.");
      await ctx.answerCbQuery();
      try {
        await ctx.editMessageText(buildSettingsText(group), {
          parse_mode: "Markdown",
          reply_markup: buildSettingsKeyboard(group),
        });
      } catch {}
      return;
    }

    // ── Ouvrir le sous-menu d'action ─────────────────────────────────────────
    if (action === "actmenu") {
      const menuKey = parts[1];
      const groupId = parts.slice(2).join(":");
      const group = await db.select().from(botGroupsTable).where(eq(botGroupsTable.telegramId, groupId)).limit(1).then((r) => r[0]);
      if (!group) return ctx.answerCbQuery("❌ Groupe introuvable.");
      const meta = ACTION_MENU_META[menuKey];
      if (!meta) return ctx.answerCbQuery();
      const current = (group as any)[meta.field] as string;
      await ctx.answerCbQuery();
      try {
        await ctx.editMessageText(buildActionMenuText(menuKey, current), {
          parse_mode: "Markdown",
          reply_markup: buildActionMenuKeyboard(menuKey, current, groupId),
        });
      } catch {}
      return;
    }

    // ── Enregistrer une action choisie ───────────────────────────────────────
    if (action === "setact") {
      const menuKey  = parts[1];
      const newAction = parts[2];
      const groupId  = parts.slice(3).join(":");
      const meta = ACTION_MENU_META[menuKey];
      if (!meta || !ACTION_KEYS.includes(newAction)) return ctx.answerCbQuery("❌ Action invalide.");

      await db.update(botGroupsTable)
        .set({ [meta.field]: newAction, updatedAt: new Date() })
        .where(eq(botGroupsTable.telegramId, groupId));

      const updated = await db.select().from(botGroupsTable).where(eq(botGroupsTable.telegramId, groupId)).limit(1).then((r) => r[0]);
      await ctx.answerCbQuery(`✅ Action : ${ACTION_LABELS[newAction]}`);
      try {
        await ctx.editMessageText(buildActionMenuText(menuKey, newAction), {
          parse_mode: "Markdown",
          reply_markup: buildActionMenuKeyboard(menuKey, newAction, groupId),
        });
      } catch {}
      return;
    }

    // ── Toggle boolean ────────────────────────────────────────────────────────
    if (action === "toggle") {
      const field   = parts[1];
      const groupId = parts.slice(2).join(":");
      const group = await db.select().from(botGroupsTable).where(eq(botGroupsTable.telegramId, groupId)).limit(1).then((r) => r[0]);
      if (!group) return ctx.answerCbQuery("❌ Groupe introuvable.");

      const current = (group as any)[field] as boolean;
      await db.update(botGroupsTable).set({ [field]: !current, updatedAt: new Date() }).where(eq(botGroupsTable.telegramId, groupId));
      const updated = await db.select().from(botGroupsTable).where(eq(botGroupsTable.telegramId, groupId)).limit(1).then((r) => r[0]);

      const labels: Record<string, string> = {
        isActive:      !current ? "🟢 Bot ACTIVÉ — La modération commence." : "🔴 Bot DÉSACTIVÉ — La modération est en pause.",
        antiSpam:      `Anti-Spam ${!current ? "activé" : "désactivé"}`,
        antiFlood:     `Anti-Flood ${!current ? "activé" : "désactivé"}`,
        antiLinks:     `Anti-Liens ${!current ? "activé" : "désactivé"}`,
        antiProfanity: `Anti-Grossièretés ${!current ? "activé" : "désactivé"}`,
      };
      await ctx.answerCbQuery(labels[field] ?? `${field} ${!current ? "activé" : "désactivé"}`);
      try {
        await ctx.editMessageText(buildSettingsText(updated), {
          parse_mode: "Markdown",
          reply_markup: buildSettingsKeyboard(updated),
        });
      } catch {}
      return;
    }

    // ── Changer une valeur numérique ──────────────────────────────────────────
    if (action === "change") {
      const field   = parts[1];
      const groupId = parts.slice(2).join(":");
      const key = ctx.from!.id.toString() + ":" + groupId;
      pendingInputs.set(key, {
        type: field,
        groupId,
        chatId: ctx.chat?.id ?? 0,
        messageId: (ctx.callbackQuery as any).message?.message_id,
      });
      const prompts: Record<string, string> = {
        maxWarnings:  "⚠️ Envoyez le nouveau nombre max d'avertissements avant ban (ex: 3, 5, 10)",
        muteDuration: "🔇 Envoyez la durée du mute en minutes (ex: 5, 30, 60)",
        floodLimit:   "🌊 Envoyez le nombre max de messages pour le flood (ex: 5, 10)",
        floodWindow:  "⏱️ Envoyez la fenêtre de temps en secondes pour le flood (ex: 5, 10, 30)",
      };
      await ctx.answerCbQuery();
      await ctx.reply(prompts[field] ?? `Envoyez la nouvelle valeur pour ${field}`);
      return;
    }

    // ── Définir un texte (bienvenue / règles) ─────────────────────────────────
    if (action === "set") {
      const field   = parts[1];
      const groupId = parts.slice(2).join(":");
      const key = ctx.from!.id.toString() + ":" + groupId;
      pendingInputs.set(key, {
        type: field === "welcome" ? "welcomeMessage" : "rulesText",
        groupId,
        chatId: ctx.chat?.id ?? 0,
        messageId: (ctx.callbackQuery as any).message?.message_id,
      });
      await ctx.answerCbQuery();
      const prompt = field === "welcome"
        ? "✏️ Envoyez le nouveau message de bienvenue.\nVariables : `{name}` = prénom, `{group}` = nom du groupe"
        : "📋 Envoyez les règles du groupe (plusieurs lignes autorisées)";
      await ctx.reply(prompt, { parse_mode: "Markdown" });
      return;
    }

    await ctx.answerCbQuery();
  });

  // ─── Réponses texte aux saisies en attente ────────────────────────────────
  bot.on("text", async (ctx, next) => {
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
        return ctx.reply("❌ Valeur invalide. Envoyez un nombre entier positif.");
      }
      const actual = pending.type === "muteDuration" ? num * 60 : num;
      await db.update(botGroupsTable)
        .set({ [pending.type]: actual, updatedAt: new Date() })
        .where(eq(botGroupsTable.telegramId, pending.groupId));

      const updated = await db.select().from(botGroupsTable).where(eq(botGroupsTable.telegramId, pending.groupId)).limit(1).then((r) => r[0]);
      const labels: Record<string, string> = {
        maxWarnings:  `Max avertissements : ${num}`,
        muteDuration: `Durée du mute : ${num} minutes`,
        floodLimit:   `Flood limit : ${num} messages`,
        floodWindow:  `Flood window : ${num} secondes`,
      };
      await ctx.reply(`✅ *Mis à jour !* ${labels[pending.type]}`, { parse_mode: "Markdown" });
      if (updated && pending.chatId && pending.messageId) {
        try {
          await ctx.telegram.editMessageText(pending.chatId, pending.messageId, undefined, buildSettingsText(updated), {
            parse_mode: "Markdown", reply_markup: buildSettingsKeyboard(updated),
          });
        } catch {}
      }

    } else if (pending.type === "welcomeMessage" || pending.type === "rulesText") {
      await db.update(botGroupsTable)
        .set({ [pending.type]: value, updatedAt: new Date() })
        .where(eq(botGroupsTable.telegramId, pending.groupId));

      const updated = await db.select().from(botGroupsTable).where(eq(botGroupsTable.telegramId, pending.groupId)).limit(1).then((r) => r[0]);
      const label = pending.type === "welcomeMessage" ? "Message de bienvenue" : "Règles du groupe";
      await ctx.reply(`✅ *${label} mis à jour !*`, { parse_mode: "Markdown" });
      if (updated && pending.chatId && pending.messageId) {
        try {
          await ctx.telegram.editMessageText(pending.chatId, pending.messageId, undefined, buildSettingsText(updated), {
            parse_mode: "Markdown", reply_markup: buildSettingsKeyboard(updated),
          });
        } catch {}
      }
    }
  });

  // ─── /warn ────────────────────────────────────────────────────────────────
  bot.command("warn", async (ctx) => {
    if (ctx.chat.type === "private") return;
    if (!(await isAdmin(ctx))) return ctx.reply("❌ Réservé aux administrateurs.");
    const target = ctx.message.reply_to_message?.from;
    if (!target) return ctx.reply("↩️ Répondez au message d'un utilisateur pour l'avertir.");
    if (target.is_bot) return ctx.reply("❌ Impossible d'avertir un bot.");

    const reason = ctx.message.text.split(" ").slice(1).join(" ") || "Comportement inapproprié";
    const groupId = getGroupId(ctx.chat.id);
    const userId  = getUserId(target.id);
    await ensureGroup(ctx.chat.id, ctx.chat.title ?? "Groupe");

    await db.insert(botWarningsTable).values({
      telegramGroupId: groupId, telegramUserId: userId,
      username: target.username ?? null, firstName: target.first_name,
      reason, warnedByUserId: getUserId(ctx.from!.id),
    });
    await db.insert(botViolationsTable).values({
      telegramGroupId: groupId, telegramUserId: userId,
      username: target.username ?? null, firstName: target.first_name,
      violationType: "warning", action: "warn", details: reason,
    });

    const [{ count: totalWarns }] = await db.select({ count: count() }).from(botWarningsTable)
      .where(and(eq(botWarningsTable.telegramGroupId, groupId), eq(botWarningsTable.telegramUserId, userId)));
    const group = await db.select().from(botGroupsTable).where(eq(botGroupsTable.telegramId, groupId)).limit(1);
    const maxWarnings = group[0]?.maxWarnings ?? 3;

    if (Number(totalWarns) >= maxWarnings) {
      try {
        await ctx.telegram.banChatMember(ctx.chat.id, target.id);
        await db.insert(botBansTable).values({
          telegramGroupId: groupId, telegramUserId: userId,
          username: target.username ?? null, firstName: target.first_name,
          reason: `Auto-ban après ${maxWarnings} avertissements`, bannedByUserId: "bot",
        });
        await ctx.reply(`🔨 *${target.first_name}* banni automatiquement après ${maxWarnings} avertissements.`, { parse_mode: "Markdown" });
      } catch (err) { logger.error({ err }, "Auto-ban failed"); }
    } else {
      await ctx.reply(
        `⚠️ *Avertissement* pour ${target.first_name}\n📝 Raison : ${reason}\n🔢 Total : ${totalWarns}/${maxWarnings}`,
        { parse_mode: "Markdown" }
      );
    }
  });

  // ─── /ban ─────────────────────────────────────────────────────────────────
  bot.command("ban", async (ctx) => {
    if (ctx.chat.type === "private") return;
    if (!(await isAdmin(ctx))) return ctx.reply("❌ Réservé aux administrateurs.");
    const target = ctx.message.reply_to_message?.from;
    if (!target) return ctx.reply("↩️ Répondez au message de l'utilisateur à bannir.");
    if (target.is_bot) return ctx.reply("❌ Impossible de bannir un bot.");

    const reason  = ctx.message.text.split(" ").slice(1).join(" ") || "Raison non spécifiée";
    const groupId = getGroupId(ctx.chat.id);
    const userId  = getUserId(target.id);
    await ensureGroup(ctx.chat.id, ctx.chat.title ?? "Groupe");
    try {
      await ctx.telegram.banChatMember(ctx.chat.id, target.id);
      await db.insert(botBansTable).values({
        telegramGroupId: groupId, telegramUserId: userId,
        username: target.username ?? null, firstName: target.first_name,
        reason, bannedByUserId: getUserId(ctx.from!.id),
      });
      await db.insert(botViolationsTable).values({
        telegramGroupId: groupId, telegramUserId: userId,
        username: target.username ?? null, firstName: target.first_name,
        violationType: "ban", action: "ban", details: reason,
      });
      await ctx.reply(`🔨 *${target.first_name}* banni.\n📝 Raison : ${reason}`, { parse_mode: "Markdown" });
    } catch (err) {
      logger.error({ err }, "Ban failed");
      await ctx.reply("❌ Impossible de bannir. Vérifiez mes droits d'administrateur.");
    }
  });

  // ─── /unban ───────────────────────────────────────────────────────────────
  bot.command("unban", async (ctx) => {
    if (ctx.chat.type === "private") return;
    if (!(await isAdmin(ctx))) return ctx.reply("❌ Réservé aux administrateurs.");
    const target = ctx.message.reply_to_message?.from;
    if (!target) return ctx.reply("↩️ Répondez au message de l'utilisateur à débannir.");
    const groupId = getGroupId(ctx.chat.id);
    const userId  = getUserId(target.id);
    try {
      await ctx.telegram.unbanChatMember(ctx.chat.id, target.id);
      await db.update(botBansTable)
        .set({ unbannedAt: new Date() })
        .where(and(eq(botBansTable.telegramGroupId, groupId), eq(botBansTable.telegramUserId, userId), eq(botBansTable.unbannedAt, null as any)));
      await ctx.reply(`✅ *${target.first_name}* débanni.`, { parse_mode: "Markdown" });
    } catch (err) {
      logger.error({ err }, "Unban failed");
      await ctx.reply("❌ Impossible de débannir.");
    }
  });

  // ─── /kick ────────────────────────────────────────────────────────────────
  bot.command("kick", async (ctx) => {
    if (ctx.chat.type === "private") return;
    if (!(await isAdmin(ctx))) return ctx.reply("❌ Réservé aux administrateurs.");
    const target = ctx.message.reply_to_message?.from;
    if (!target) return ctx.reply("↩️ Répondez au message de l'utilisateur à expulser.");
    if (target.is_bot) return ctx.reply("❌ Impossible d'expulser un bot.");
    const groupId = getGroupId(ctx.chat.id);
    const userId  = getUserId(target.id);
    await ensureGroup(ctx.chat.id, ctx.chat.title ?? "Groupe");
    try {
      await ctx.telegram.banChatMember(ctx.chat.id, target.id);
      await ctx.telegram.unbanChatMember(ctx.chat.id, target.id);
      await db.insert(botViolationsTable).values({
        telegramGroupId: groupId, telegramUserId: userId,
        username: target.username ?? null, firstName: target.first_name,
        violationType: "kick", action: "kick", details: "Expulsé du groupe",
      });
      await ctx.reply(`👢 *${target.first_name}* expulsé du groupe.`, { parse_mode: "Markdown" });
    } catch (err) {
      logger.error({ err }, "Kick failed");
      await ctx.reply("❌ Impossible d'expulser cet utilisateur.");
    }
  });

  // ─── /mute ────────────────────────────────────────────────────────────────
  bot.command("mute", async (ctx) => {
    if (ctx.chat.type === "private") return;
    if (!(await isAdmin(ctx))) return ctx.reply("❌ Réservé aux administrateurs.");
    const target = ctx.message.reply_to_message?.from;
    if (!target) return ctx.reply("↩️ Répondez au message de l'utilisateur à rendre muet.");
    if (target.is_bot) return ctx.reply("❌ Impossible de rendre un bot muet.");
    const minutes = parseInt(ctx.message.text.split(" ")[1] ?? "", 10) || 30;
    const untilDate = Math.floor(Date.now() / 1000) + minutes * 60;
    const groupId = getGroupId(ctx.chat.id);
    const userId  = getUserId(target.id);
    await ensureGroup(ctx.chat.id, ctx.chat.title ?? "Groupe");
    try {
      await ctx.telegram.restrictChatMember(ctx.chat.id, target.id, {
        permissions: { can_send_messages: false },
        until_date: untilDate,
      });
      await db.insert(botViolationsTable).values({
        telegramGroupId: groupId, telegramUserId: userId,
        username: target.username ?? null, firstName: target.first_name,
        violationType: "mute", action: "mute", details: `Muet ${minutes} min`,
      });
      await ctx.reply(`🔇 *${target.first_name}* muet pour *${minutes} minutes*.`, { parse_mode: "Markdown" });
    } catch (err) {
      logger.error({ err }, "Mute failed");
      await ctx.reply("❌ Impossible de rendre muet. Vérifiez mes droits d'administrateur.");
    }
  });

  // ─── /unmute ──────────────────────────────────────────────────────────────
  bot.command("unmute", async (ctx) => {
    if (ctx.chat.type === "private") return;
    if (!(await isAdmin(ctx))) return ctx.reply("❌ Réservé aux administrateurs.");
    const target = ctx.message.reply_to_message?.from;
    if (!target) return ctx.reply("↩️ Répondez au message de l'utilisateur à désilencier.");
    try {
      await ctx.telegram.restrictChatMember(ctx.chat.id, target.id, {
        permissions: {
          can_send_messages: true, can_send_audios: true, can_send_documents: true,
          can_send_photos: true, can_send_videos: true, can_send_video_notes: true,
          can_send_voice_notes: true, can_send_polls: true,
          can_send_other_messages: true, can_add_web_page_previews: true,
        },
      });
      await ctx.reply(`🔊 *${target.first_name}* peut de nouveau parler.`, { parse_mode: "Markdown" });
    } catch (err) {
      logger.error({ err }, "Unmute failed");
      await ctx.reply("❌ Impossible de lever le silence.");
    }
  });

  // ─── /warnings ────────────────────────────────────────────────────────────
  bot.command("warnings", async (ctx) => {
    if (ctx.chat.type === "private") return;
    const target  = ctx.message.reply_to_message?.from ?? ctx.from;
    if (!target) return;
    const groupId = getGroupId(ctx.chat.id);
    const userId  = getUserId(target.id);
    const warns = await db.select().from(botWarningsTable)
      .where(and(eq(botWarningsTable.telegramGroupId, groupId), eq(botWarningsTable.telegramUserId, userId)));
    const group = await db.select().from(botGroupsTable).where(eq(botGroupsTable.telegramId, groupId)).limit(1);
    const max = group[0]?.maxWarnings ?? 3;
    if (warns.length === 0) {
      await ctx.reply(`✅ *${target.first_name}* n'a aucun avertissement.`, { parse_mode: "Markdown" });
    } else {
      const list = warns.slice(-5).map((w, i) =>
        `${i + 1}. ${w.reason ?? "Sans raison"} (${new Date(w.createdAt).toLocaleDateString("fr-FR")})`
      ).join("\n");
      await ctx.reply(`⚠️ *Avertissements de ${target.first_name}* : ${warns.length}/${max}\n\n${list}`, { parse_mode: "Markdown" });
    }
  });

  // ─── /unwarn ──────────────────────────────────────────────────────────────
  bot.command("unwarn", async (ctx) => {
    if (ctx.chat.type === "private") return;
    if (!(await isAdmin(ctx))) return ctx.reply("❌ Réservé aux administrateurs.");
    const target = ctx.message.reply_to_message?.from;
    if (!target) return ctx.reply("↩️ Répondez au message de l'utilisateur.");
    const groupId = getGroupId(ctx.chat.id);
    const userId  = getUserId(target.id);
    const lastWarn = await db.select().from(botWarningsTable)
      .where(and(eq(botWarningsTable.telegramGroupId, groupId), eq(botWarningsTable.telegramUserId, userId)))
      .orderBy(botWarningsTable.createdAt).limit(1);
    if (lastWarn.length === 0) {
      return ctx.reply(`✅ *${target.first_name}* n'a aucun avertissement à retirer.`, { parse_mode: "Markdown" });
    }
    await db.delete(botWarningsTable).where(eq(botWarningsTable.id, lastWarn[0].id));
    await ctx.reply(`✅ Dernier avertissement de *${target.first_name}* retiré.`, { parse_mode: "Markdown" });
  });

  // ─── Nouveaux membres ─────────────────────────────────────────────────────
  bot.on("new_chat_members", async (ctx) => {
    const group = await ensureGroup(ctx.chat.id, ctx.chat.title ?? "Groupe");
    for (const member of ctx.message.new_chat_members) {
      if (member.is_bot) continue;
      const name = member.first_name;
      const welcomeText = group?.welcomeMessage
        ? group.welcomeMessage.replace("{name}", name).replace("{group}", ctx.chat.title ?? "ce groupe")
        : `👋 Bienvenue *${name}* dans le groupe !`;
      await ctx.reply(welcomeText, { parse_mode: "Markdown" });
    }
  });

  // ─── Membres qui partent ──────────────────────────────────────────────────
  bot.on("left_chat_member", async (ctx) => {
    if (ctx.message.left_chat_member.is_bot) return;
    await ctx.reply(`👋 Au revoir *${ctx.message.left_chat_member.first_name}* !`, { parse_mode: "Markdown" });
  });

  logger.info("Bot commands registered");
}
