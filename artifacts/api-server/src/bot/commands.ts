import { Telegraf } from "telegraf";
import { db } from "@workspace/db";
import { botGroupsTable, botWarningsTable, botBansTable, botViolationsTable, botWordFiltersTable, botUserSettingsTable, botOwnerConfigTable } from "@workspace/db";
import type { OwnerLink } from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
import { logger } from "../lib/logger";
import { t, SUPPORTED_LANGUAGES } from "./translations";

async function getUserLang(userId: number): Promise<string> {
  const row = await db.select().from(botUserSettingsTable)
    .where(eq(botUserSettingsTable.telegramUserId, userId.toString()))
    .limit(1).then((r) => r[0]);
  return row?.language ?? "fr";
}

async function setUserLang(userId: number, lang: string) {
  await db.insert(botUserSettingsTable)
    .values({ telegramUserId: userId.toString(), language: lang })
    .onConflictDoUpdate({ target: botUserSettingsTable.telegramUserId, set: { language: lang, updatedAt: new Date() } });
}

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
    { text: `${group.antiLinks        ? "✅" : "❌"} Anti-Liens`,       callback_data: `toggle:antiLinks:${group.telegramId}` },
    { text: `${group.antiProfanity    ? "✅" : "❌"} Anti-Grossièretés`, callback_data: `toggle:antiProfanity:${group.telegramId}` },
  ]);
  rows.push([
    { text: `${group.antiAdvertising    ? "✅" : "❌"} Anti-Publicité`,       callback_data: `toggle:antiAdvertising:${group.telegramId}` },
    { text: `${group.requireVerification ? "✅" : "❌"} Vérification entrée`, callback_data: `toggle:requireVerification:${group.telegramId}` },
  ]);
  if (group.requireVerification) {
    rows.push([{ text: `⏱️ Délai vérification : ${group.verificationTimeout} min`, callback_data: `change:verificationTimeout:${group.telegramId}` }]);
  }

  // Action buttons — visible seulement si la protection est activée
  if (group.antiLinks) {
    rows.push([{ text: `⚙️ Si lien → ${ACTION_LABELS[group.antiLinksAction] ?? group.antiLinksAction}`, callback_data: `actmenu:links:${group.telegramId}` }]);
  }
  if (group.antiSpam) {
    rows.push([{ text: `⚙️ Si spam → ${ACTION_LABELS[group.antiSpamAction] ?? group.antiSpamAction}`, callback_data: `actmenu:spam:${group.telegramId}` }]);
  }
  if (group.antiProfanity) {
    rows.push([{ text: `⚙️ Si grossièreté → ${ACTION_LABELS[group.antiProfanityAction] ?? group.antiProfanityAction}`, callback_data: `actmenu:profanity:${group.telegramId}` }]);
  }
  if (group.antiFlood) {
    rows.push([{ text: `⚙️ Si flood → ${ACTION_LABELS[group.antiFloodAction] ?? group.antiFloodAction}`, callback_data: `actmenu:flood:${group.telegramId}` }]);
  }
  if (group.antiAdvertising) {
    rows.push([{ text: `⚙️ Si publicité → ${ACTION_LABELS[group.antiAdvertisingAction] ?? group.antiAdvertisingAction}`, callback_data: `actmenu:advertising:${group.telegramId}` }]);
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
  const wHas = [
    group.welcomeMessage ? "📝" : null,
    group.welcomePhoto   ? "🖼️" : null,
    group.welcomeButtons ? "🔘" : null,
  ].filter(Boolean).join(" ") || "non configuré";
  rows.push([
    { text: `✉️ Bienvenue (${wHas}) →`, callback_data: `welcomemenu:${group.telegramId}` },
    { text: "📋 Règles du groupe",       callback_data: `set:rules:${group.telegramId}` },
  ]);

  // Langue du groupe
  const curLang = SUPPORTED_LANGUAGES[group.language as string] ?? SUPPORTED_LANGUAGES["fr"];
  rows.push([{
    text: `🌍 Langue du groupe : ${curLang.flag} ${curLang.label}`,
    callback_data: `langmenu:${group.telegramId}`,
  }]);

  // Terminer
  rows.push([{ text: "✅ Terminer", callback_data: `done:${group.telegramId}` }]);

  return { inline_keyboard: rows };
}

// ─── Action submenu keyboard ───────────────────────────────────────────────

const ACTION_MENU_META: Record<string, { label: string; field: string }> = {
  links:       { label: "lien détecté",       field: "antiLinksAction" },
  spam:        { label: "spam détecté",        field: "antiSpamAction" },
  profanity:   { label: "grossièreté",         field: "antiProfanityAction" },
  flood:       { label: "flood détecté",       field: "antiFloodAction" },
  advertising: { label: "publicité détectée",  field: "antiAdvertisingAction" },
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

// ─── Welcome sub-menu ──────────────────────────────────────────────────────

function buildWelcomeMenuText(group: any) {
  const hasText    = group.welcomeMessage ? "✅ Texte configuré" : "❌ Pas de texte (message par défaut)";
  const hasPhoto   = group.welcomePhoto   ? "✅ Photo configurée" : "❌ Pas de photo";
  const rawButtons = group.welcomeButtons ? (() => {
    try {
      const btns = JSON.parse(group.welcomeButtons) as Array<{text: string; url: string}>;
      return `✅ ${btns.length} bouton(s) : ${btns.map(b => b.text).join(", ")}`;
    } catch { return "⚠️ Boutons invalides"; }
  })() : "❌ Pas de boutons";

  return (
    `✉️ *Message de bienvenue*\n\n` +
    `📝 Texte : ${hasText}\n` +
    `🖼️ Photo : ${hasPhoto}\n` +
    `🔘 Boutons : ${rawButtons}\n\n` +
    `_Variables disponibles : {name} = prénom du membre, {group} = nom du groupe_`
  );
}

function buildWelcomeMenuKeyboard(gid: string) {
  return {
    inline_keyboard: [
      [
        { text: "📝 Modifier le texte",  callback_data: `set:welcomeText:${gid}` },
        { text: "🖼️ Modifier la photo",  callback_data: `set:welcomePhoto:${gid}` },
      ],
      [{ text: "🔘 Modifier les boutons", callback_data: `set:welcomeButtons:${gid}` }],
      [{ text: "🗑️ Tout effacer",         callback_data: `set:welcomeClear:${gid}` }],
      [{ text: "← Retour aux paramètres", callback_data: `back:${gid}` }],
    ],
  };
}

// ─── Helper : envoyer le message de bienvenue (photo + texte + boutons) ────

export async function sendWelcomeMessage(
  telegram: any,
  chatId: number,
  group: any,
  name: string,
  extraButton?: { text: string; callback_data?: string; url?: string }
) {
  const groupName = group.title ?? "ce groupe";
  const text = (group.welcomeMessage ?? "")
    .replace("{name}", name)
    .replace("{group}", groupName);

  // Boutons URL définis par l'admin
  const urlButtons: any[][] = [];
  if (group.welcomeButtons) {
    try {
      const btns = JSON.parse(group.welcomeButtons) as Array<{text: string; url: string}>;
      for (const btn of btns) {
        if (btn.text && btn.url) urlButtons.push([{ text: btn.text, url: btn.url }]);
      }
    } catch {}
  }

  // Bouton extra (vérification, etc.)
  const extraRow = extraButton ? [extraButton] : [];
  const keyboard = urlButtons.length > 0 || extraRow.length > 0
    ? { inline_keyboard: [...urlButtons, ...(extraRow.length ? [extraRow] : [])] }
    : undefined;

  const options: any = { parse_mode: "Markdown", ...(keyboard ? { reply_markup: keyboard } : {}) };

  if (group.welcomePhoto) {
    return telegram.sendPhoto(chatId, group.welcomePhoto, {
      ...options,
      caption: text || undefined,
    });
  }
  return telegram.sendMessage(chatId, text || `👋 Bienvenue *${name}* !`, options);
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
    `• Anti-Grossièretés : ${group.antiProfanity ? "✅" : "❌"}${actionLine(group.antiProfanity, group.antiProfanityAction)}\n` +
    `• Anti-Publicité : ${group.antiAdvertising ? "✅" : "❌"}${actionLine(group.antiAdvertising, group.antiAdvertisingAction)}\n\n` +
    `👤 *Accès au groupe :*\n` +
    `• Langue : ${(SUPPORTED_LANGUAGES[group.language as string] ?? SUPPORTED_LANGUAGES["fr"]).flag} ${(SUPPORTED_LANGUAGES[group.language as string] ?? SUPPORTED_LANGUAGES["fr"]).label}\n` +
    `• Vérification à l'entrée : ${group.requireVerification ? `✅ (délai : ${group.verificationTimeout} min)` : "❌"}\n` +
    `  _${group.requireVerification ? "Les nouveaux membres doivent accepter les règles avant de pouvoir écrire." : "Les nouveaux membres peuvent écrire immédiatement."}_\n\n` +
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

// ─── Owner panel helpers ───────────────────────────────────────────────────

const pendingOwnerInputs = new Map<number, { step: string; data: Record<string, string> }>();

async function getOwnerLinks(): Promise<OwnerLink[]> {
  const [cfg] = await db.select().from(botOwnerConfigTable).limit(1);
  if (!cfg?.requiredLinks) return [];
  try { return JSON.parse(cfg.requiredLinks); } catch { return []; }
}

async function saveOwnerLinks(links: OwnerLink[]): Promise<void> {
  const [existing] = await db.select().from(botOwnerConfigTable).limit(1);
  const json = links.length > 0 ? JSON.stringify(links) : null;
  if (existing) {
    await db.update(botOwnerConfigTable).set({ requiredLinks: json, updatedAt: new Date() }).where(eq(botOwnerConfigTable.id, existing.id));
  } else {
    await db.insert(botOwnerConfigTable).values({ requiredLinks: json });
  }
}

function buildOwnerMenuText(): string {
  return "🔧 *Panel Propriétaire*\n\nBienvenue dans le panneau d'administration de votre bot. Choisissez une option :";
}

function buildOwnerMenuKeyboard(): any {
  return {
    inline_keyboard: [
      [{ text: "🔗 Liens obligatoires", callback_data: "owner:links" }],
      [{ text: "📡 Diffusion globale",  callback_data: "owner:broadcast" }],
      [{ text: "📊 Statistiques",       callback_data: "owner:stats" }],
    ],
  };
}

function buildOwnerLinksText(links: OwnerLink[]): string {
  if (links.length === 0) {
    return "🔗 *Liens obligatoires*\n\n_Aucun lien configuré._ Les membres peuvent écrire librement dans tous les groupes.";
  }
  const list = links.map((l, i) =>
    `${i + 1}. ${l.type === "channel" ? "📢" : "🌐"} *${l.title}*  —  \`${l.value}\``
  ).join("\n");
  return `🔗 *Liens obligatoires* (${links.length})\n\nLes membres doivent rejoindre tous les canaux 📢 pour pouvoir écrire :\n\n${list}`;
}

function buildOwnerLinksKeyboard(links: OwnerLink[]): any {
  const rows: any[][] = [];
  links.forEach((l, i) => {
    rows.push([
      { text: `${l.type === "channel" ? "📢" : "🌐"} ${l.title}`, callback_data: "owner:noop" },
      { text: "🗑️ Supprimer", callback_data: `owner:removelink:${i}` },
    ]);
  });
  rows.push([
    { text: "📢 + Canal Telegram", callback_data: "owner:addlink:channel" },
    { text: "🌐 + Site Web",       callback_data: "owner:addlink:website"  },
  ]);
  rows.push([{ text: "← Menu principal", callback_data: "owner:menu" }]);
  return { inline_keyboard: rows };
}

// ─── Setup ────────────────────────────────────────────────────────────────

export function setupCommands(bot: Telegraf) {

  // /start
  bot.command("start", async (ctx) => {
    if (ctx.chat.type === "private") {
      const lang = await getUserLang(ctx.from!.id);
      await ctx.reply(t(lang, "start_private"), { parse_mode: "Markdown" });
    }
  });

  // /language
  bot.command("language", async (ctx) => {
    const lang = ctx.chat.type === "private"
      ? await getUserLang(ctx.from!.id)
      : "fr";

    const isGroupAdmin = ctx.chat.type !== "private" && await isAdmin(ctx);

    if (ctx.chat.type !== "private" && !isGroupAdmin) {
      // Utilisateur normal en groupe : ouvrir en DM
      return ctx.reply("🌍 Utilisez `/language` en message privé avec le bot pour changer votre langue.", { parse_mode: "Markdown" });
    }

    if (ctx.chat.type === "private") {
      // Langue personnelle
      const rows = Object.entries(SUPPORTED_LANGUAGES).map(([code, info]) => [{
        text: `${code === lang ? "✅ " : ""}${info.flag} ${info.label}`,
        callback_data: `setuserlang:${code}`,
      }]);
      await ctx.reply(t(lang, "lang_select_title"), {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: rows },
      });
    } else {
      // Admin en groupe : changer la langue du groupe
      const groupId = ctx.chat.id.toString();
      const group = await ensureGroup(ctx.chat.id, (ctx.chat as any).title ?? "Groupe");
      const glang = group?.language ?? "fr";
      const rows = Object.entries(SUPPORTED_LANGUAGES).map(([code, info]) => [{
        text: `${code === glang ? "✅ " : ""}${info.flag} ${info.label}`,
        callback_data: `setgrouplang:${code}:${groupId}`,
      }]);
      await ctx.reply(t(glang, "lang_group_select_title", {
        lang: `${SUPPORTED_LANGUAGES[glang]?.flag ?? "🇫🇷"} ${SUPPORTED_LANGUAGES[glang]?.label ?? "Français"}`,
      }), {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: rows },
      });
    }
  });

  // /owner — Panel propriétaire (privé uniquement, nécessite BOT_OWNER_ID)
  bot.command("owner", async (ctx) => {
    if (ctx.chat.type !== "private") {
      return ctx.reply("🔒 Utilisez /owner en message privé avec le bot.");
    }
    const ownerId = parseInt(process.env["BOT_OWNER_ID"] ?? "0");
    if (!ownerId || ctx.from!.id !== ownerId) {
      return ctx.reply("❌ Accès refusé.");
    }
    await ctx.reply(buildOwnerMenuText(), {
      parse_mode: "Markdown",
      reply_markup: buildOwnerMenuKeyboard(),
    });
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
        "🔤 *Filtres de mots (admins) :*\n" +
        "/filter mot [action] — Ajouter un mot interdit (actions : delete, warn, mute, ban)\n" +
        "/filters — Voir et gérer tous les filtres\n\n" +
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
    const glang = group[0]?.language ?? "fr";
    if (group[0]?.rulesText) {
      await ctx.reply(t(glang, "rules_header", { rules: group[0].rulesText }), { parse_mode: "Markdown" });
    } else {
      await ctx.reply(t(glang, "rules_not_set"), { parse_mode: "Markdown" });
    }
  });

  // /stats
  bot.command("stats", async (ctx) => {
    if (ctx.chat.type === "private") return;
    if (!(await isAdmin(ctx))) return ctx.reply("❌ Réservé aux administrateurs.");
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

    // Parse : action:field:groupId  ou  action:groupId  (pour done/back)
    const parts = data.split(":");
    const action = parts[0];
    const field  = parts[1];

    // ── Vérification nouveau membre (accepter les règles) ─────────────────
    // Ce callback est public : n'importe quel membre peut cliquer sur "J'accepte"
    if (action === "verify") {
      const targetUserId = parts[1];
      const groupId      = parts.slice(2).join(":");
      const clickerId    = ctx.from!.id.toString();

      // Seul l'utilisateur concerné peut cliquer
      if (clickerId !== targetUserId) {
        return ctx.answerCbQuery("❌ Ce bouton n'est pas pour vous.", { show_alert: true });
      }

      const groupObj = await db.select().from(botGroupsTable)
        .where(eq(botGroupsTable.telegramId, groupId)).limit(1).then((r) => r[0]);
      const verLang = groupObj?.language ?? "fr";
      await ctx.answerCbQuery(t(verLang, "verify_welcome_btn"));

      // Lever la restriction
      try {
        await ctx.telegram.restrictChatMember(Number(groupId), ctx.from!.id, {
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
      } catch {}

      // Annuler le timer d'expulsion
      const verKey = `${groupId}:${targetUserId}`;
      const pending = (bot as any).__pendingVerifications?.get(verKey);
      if (pending) {
        clearTimeout(pending.timer);
        (bot as any).__pendingVerifications.delete(verKey);
      }

      // Remplacer le message de vérification par un message de confirmation
      const firstName = ctx.from!.first_name;
      const groupObjForMsg = await db.select().from(botGroupsTable)
        .where(eq(botGroupsTable.telegramId, groupId)).limit(1).then((r) => r[0]);
      const confirmLang = groupObjForMsg?.language ?? "fr";
      try {
        await ctx.editMessageText(
          t(confirmLang, "verify_success", { name: firstName }),
          { parse_mode: "Markdown" }
        );
      } catch {}

      // Auto-supprimer la confirmation après 10 secondes
      const msgId = (ctx.callbackQuery as any).message?.message_id;
      const chatId = ctx.chat?.id;
      if (msgId && chatId) {
        setTimeout(async () => {
          try { await ctx.telegram.deleteMessage(chatId, msgId); } catch {}
        }, 10000);
      }

      return;
    }

    // ── Callbacks du panel propriétaire (privé uniquement) ────────────────────
    if (action === "owner") {
      const ownerId = parseInt(process.env["BOT_OWNER_ID"] ?? "0");
      if (!ownerId || ctx.from!.id !== ownerId) {
        return ctx.answerCbQuery("❌ Accès refusé.", { show_alert: true });
      }
      const sub = parts[1];

      if (sub === "noop") return ctx.answerCbQuery();

      if (sub === "menu") {
        await ctx.answerCbQuery();
        try { await ctx.editMessageText(buildOwnerMenuText(), { parse_mode: "Markdown", reply_markup: buildOwnerMenuKeyboard() }); } catch {}
        return;
      }

      if (sub === "links") {
        const links = await getOwnerLinks();
        await ctx.answerCbQuery();
        try { await ctx.editMessageText(buildOwnerLinksText(links), { parse_mode: "Markdown", reply_markup: buildOwnerLinksKeyboard(links) }); } catch {}
        return;
      }

      if (sub === "addlink") {
        const linkType = parts[2] as "channel" | "website";
        pendingOwnerInputs.set(ctx.from!.id, { step: `ownerLinkValue:${linkType}`, data: { type: linkType } });
        await ctx.answerCbQuery();
        const prompt = linkType === "channel"
          ? "📢 Envoyez le *@username* ou l'*ID numérique* du canal \\(ex: `@moncanal` ou `-1001234567890`\\)\n\nPour annuler, tapez /owner"
          : "🌐 Envoyez l'*URL* du site web \\(ex: `https://monsite.com`\\)\n\nPour annuler, tapez /owner";
        await ctx.reply(prompt, { parse_mode: "MarkdownV2" });
        return;
      }

      if (sub === "removelink") {
        const idx = parseInt(parts[2] ?? "", 10);
        const links = await getOwnerLinks();
        if (isNaN(idx) || idx < 0 || idx >= links.length) return ctx.answerCbQuery("❌ Lien introuvable.");
        const removed = links.splice(idx, 1)[0];
        await saveOwnerLinks(links);
        await ctx.answerCbQuery(`🗑️ "${removed.title}" supprimé.`);
        try { await ctx.editMessageText(buildOwnerLinksText(links), { parse_mode: "Markdown", reply_markup: buildOwnerLinksKeyboard(links) }); } catch {}
        return;
      }

      if (sub === "broadcast") {
        pendingOwnerInputs.set(ctx.from!.id, { step: "ownerBroadcastMsg", data: {} });
        await ctx.answerCbQuery();
        await ctx.reply(
          "📡 *Diffusion globale*\n\nRédigez votre message \\(Markdown supporté\\)\\.\n\nPour ajouter un bouton, ajoutez en *dernière ligne* : `[Texte \\| https://url\\.com]`\n\nPour annuler : /owner",
          { parse_mode: "MarkdownV2" }
        );
        return;
      }

      if (sub === "stats") {
        const [totalGroups]   = await db.select({ count: count() }).from(botGroupsTable);
        const [totalWarnings] = await db.select({ count: count() }).from(botWarningsTable);
        const [totalBans]     = await db.select({ count: count() }).from(botBansTable).where(eq(botBansTable.unbannedAt, null as any));
        const links = await getOwnerLinks();
        await ctx.answerCbQuery();
        try {
          await ctx.editMessageText(
            `📊 *Statistiques globales*\n\n` +
            `👥 Groupes : *${totalGroups?.count ?? 0}*\n` +
            `⚠️ Avertissements : *${totalWarnings?.count ?? 0}*\n` +
            `🔨 Bans actifs : *${totalBans?.count ?? 0}*\n\n` +
            `🔗 Liens obligatoires : *${links.length}*`,
            { parse_mode: "Markdown", reply_markup: { inline_keyboard: [[{ text: "← Retour", callback_data: "owner:menu" }]] } }
          );
        } catch {}
        return;
      }

      return ctx.answerCbQuery();
    }

    // ── Guard admin pour tous les autres callbacks (paramètres, modération) ──
    if (ctx.chat && ctx.chat.type !== "private") {
      const member = await ctx.telegram.getChatMember(ctx.chat.id, ctx.from!.id).catch(() => null);
      if (!member || !["administrator", "creator"].includes(member.status)) {
        return ctx.answerCbQuery("❌ Seuls les administrateurs peuvent modifier les paramètres.", { show_alert: true });
      }
    }

    // ── Ouvrir les paramètres depuis le message de bienvenue ─────────────────
    if (action === "open" && field === "settings") {
      const groupId = parts.slice(2).join(":");
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
        isActive:             !current ? "🟢 Bot ACTIVÉ — La modération commence." : "🔴 Bot DÉSACTIVÉ — La modération est en pause.",
        antiSpam:             `Anti-Spam ${!current ? "activé" : "désactivé"}`,
        antiFlood:            `Anti-Flood ${!current ? "activé" : "désactivé"}`,
        antiLinks:            `Anti-Liens ${!current ? "activé" : "désactivé"}`,
        antiProfanity:        `Anti-Grossièretés ${!current ? "activé" : "désactivé"}`,
        antiAdvertising:      `Anti-Publicité ${!current ? "activé" : "désactivé"} — ${!current ? "Les admins peuvent toujours poster librement." : ""}`,
        requireVerification:  !current ? "✅ Vérification activée — Les nouveaux membres devront accepter les règles." : "❌ Vérification désactivée.",
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
        maxWarnings:          "⚠️ Envoyez le nouveau nombre max d'avertissements avant ban (ex: 3, 5, 10)",
        muteDuration:         "🔇 Envoyez la durée du mute en minutes (ex: 5, 30, 60)",
        floodLimit:           "🌊 Envoyez le nombre max de messages pour le flood (ex: 5, 10)",
        floodWindow:          "⏱️ Envoyez la fenêtre de temps en secondes pour le flood (ex: 5, 10, 30)",
        verificationTimeout:  "⏱️ Envoyez le délai de vérification en minutes (ex: 3, 5, 10) — passé ce délai, le membre sera expulsé automatiquement s'il n'a pas accepté les règles",
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
      const msgId = (ctx.callbackQuery as any).message?.message_id;
      const pending = { groupId, chatId: ctx.chat?.id ?? 0, messageId: msgId };

      // ── Sous-menu bienvenue : texte
      if (field === "welcomeText" || field === "welcome") {
        pendingInputs.set(key, { ...pending, type: "welcomeMessage" });
        await ctx.answerCbQuery();
        await ctx.reply(
          "📝 Envoyez le texte du message de bienvenue.\n_Variables : `{name}` = prénom, `{group}` = nom du groupe_",
          { parse_mode: "Markdown" }
        );
        return;
      }

      // ── Sous-menu bienvenue : photo
      if (field === "welcomePhoto") {
        pendingInputs.set(key, { ...pending, type: "welcomePhoto" });
        await ctx.answerCbQuery();
        await ctx.reply("🖼️ Envoyez la photo à utiliser comme image de bienvenue (envoyez juste la photo).");
        return;
      }

      // ── Sous-menu bienvenue : boutons
      if (field === "welcomeButtons") {
        pendingInputs.set(key, { ...pending, type: "welcomeButtons" });
        await ctx.answerCbQuery();
        await ctx.reply(
          "🔘 Envoyez vos boutons, un par ligne, au format :\n`Texte du bouton | https://url.com`\n\nExemple :\n`Notre canal | https://t.me/mon_canal\nSite web | https://monsite.com`",
          { parse_mode: "Markdown" }
        );
        return;
      }

      // ── Sous-menu bienvenue : tout effacer
      if (field === "welcomeClear") {
        await db.update(botGroupsTable)
          .set({ welcomeMessage: null, welcomePhoto: null, welcomeButtons: null, updatedAt: new Date() })
          .where(eq(botGroupsTable.telegramId, groupId));
        const updated = await db.select().from(botGroupsTable).where(eq(botGroupsTable.telegramId, groupId)).limit(1).then((r) => r[0]);
        await ctx.answerCbQuery("🗑️ Message de bienvenue effacé.");
        if (updated && msgId) {
          try {
            await ctx.telegram.editMessageText(ctx.chat?.id ?? 0, msgId, undefined, buildWelcomeMenuText(updated), {
              parse_mode: "Markdown", reply_markup: buildWelcomeMenuKeyboard(groupId),
            });
          } catch {}
        }
        return;
      }

      // ── Règles du groupe
      if (field === "rules") {
        pendingInputs.set(key, { ...pending, type: "rulesText" });
        await ctx.answerCbQuery();
        await ctx.reply("📋 Envoyez les règles du groupe (plusieurs lignes autorisées).");
        return;
      }

      await ctx.answerCbQuery();
      return;
    }

    // ── Ouvrir le sous-menu bienvenue ─────────────────────────────────────────
    if (action === "welcomemenu") {
      if (!(await isAdmin(ctx))) return ctx.answerCbQuery("❌ Réservé aux administrateurs.");
      const groupId = parts.slice(1).join(":");
      const group = await db.select().from(botGroupsTable).where(eq(botGroupsTable.telegramId, groupId)).limit(1).then((r) => r[0]);
      if (!group) return ctx.answerCbQuery("❌ Groupe introuvable.");
      await ctx.answerCbQuery();
      try {
        await ctx.editMessageText(buildWelcomeMenuText(group), {
          parse_mode: "Markdown", reply_markup: buildWelcomeMenuKeyboard(groupId),
        });
      } catch {}
      return;
    }

    await ctx.answerCbQuery();
  });

  // ─── Réponses texte aux saisies en attente ────────────────────────────────
  bot.on("text", async (ctx, next) => {

    // ── Owner panel pending inputs (privé, prioritaire) ────────────────────
    const ownerId = parseInt(process.env["BOT_OWNER_ID"] ?? "0");
    if (ctx.chat.type === "private" && ownerId && ctx.from.id === ownerId) {
      const ownerPending = pendingOwnerInputs.get(ctx.from.id);
      if (ownerPending) {
        const val = ctx.message.text.trim();
        const { step, data } = ownerPending;

        // Étape 1 : valeur du lien (canal ou site)
        if (step.startsWith("ownerLinkValue:")) {
          const linkType = step.split(":")[1] as "channel" | "website";
          const isValid = linkType === "channel"
            ? (val.startsWith("@") || val.startsWith("-"))
            : val.startsWith("http");
          if (!isValid) {
            const hint = linkType === "channel"
              ? "❌ Format invalide. Envoyez `@username` ou un ID numérique (ex: `-1001234567890`)"
              : "❌ Format invalide. L'URL doit commencer par `https://`";
            return ctx.reply(hint, { parse_mode: "Markdown" });
          }
          pendingOwnerInputs.set(ctx.from.id, { step: "ownerLinkTitle", data: { ...data, value: val } });
          const prompt = linkType === "channel"
            ? `✅ Canal : \`${val}\`\n\nMaintenant envoyez le *nom affiché* dans le bouton (ex: "Mon Canal Officiel")`
            : `✅ URL : \`${val}\`\n\nMaintenant envoyez le *nom affiché* dans le bouton (ex: "Notre Site Web")`;
          return ctx.reply(prompt, { parse_mode: "Markdown" });
        }

        // Étape 2 : titre du lien
        if (step === "ownerLinkTitle") {
          pendingOwnerInputs.delete(ctx.from.id);
          const links = await getOwnerLinks();
          const newLink: OwnerLink = { type: data.type as "channel" | "website", value: data.value, title: val };
          links.push(newLink);
          await saveOwnerLinks(links);
          await ctx.reply(
            `✅ *Lien ajouté !*\n\n${newLink.type === "channel" ? "📢 Canal" : "🌐 Site"} : *${val}*\n\`${newLink.value}\`\n\nTotal : ${links.length} lien(s) configuré(s).\n\nTapez /owner pour voir le panel.`,
            { parse_mode: "Markdown" }
          );
          return;
        }

        // Étape broadcast : message
        if (step === "ownerBroadcastMsg") {
          pendingOwnerInputs.delete(ctx.from.id);
          const lines = val.split("\n");
          const lastLine = lines[lines.length - 1]?.trim() ?? "";
          let message = val;
          let btnText: string | undefined;
          let btnUrl: string | undefined;
          const btnMatch = lastLine.match(/^\[(.+?)\s*\|\s*(https?:\/\/.+?)\]$/);
          if (btnMatch) {
            lines.pop();
            message = lines.join("\n").trim();
            btnText = btnMatch[1].trim();
            btnUrl  = btnMatch[2].trim();
          }
          const keyboard = btnText && btnUrl
            ? { inline_keyboard: [[{ text: btnText, url: btnUrl }]] }
            : undefined;
          const opts: any = { parse_mode: "Markdown", ...(keyboard ? { reply_markup: keyboard } : {}) };
          // Envoyer en PRIVÉ aux utilisateurs qui ont écrit au bot (marchands)
          const users = await db.select({ telegramUserId: botUserSettingsTable.telegramUserId }).from(botUserSettingsTable);
          let sent = 0, failed = 0;
          const statusMsg = await ctx.reply(`📡 Diffusion en cours… 0/${users.length}`);
          for (let i = 0; i < users.length; i++) {
            try {
              await ctx.telegram.sendMessage(Number(users[i].telegramUserId), message, opts);
              sent++;
            } catch { failed++; }
            if ((i + 1) % 5 === 0 || i === users.length - 1) {
              try { await ctx.telegram.editMessageText(ctx.chat.id, statusMsg.message_id, undefined, `📡 Diffusion en cours… ${i + 1}/${users.length}`); } catch {}
            }
            await new Promise((r) => setTimeout(r, 300));
          }
          await ctx.reply(
            `✅ *Diffusion terminée !*\n\n📨 Envoyé : *${sent}* personne(s)\n❌ Échecs : *${failed}*\n📊 Total : *${users.length}*`,
            { parse_mode: "Markdown" }
          );
          return;
        }

        pendingOwnerInputs.delete(ctx.from.id);
        return next();
      }
    }

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

    } else if (pending.type === "welcomeMessage") {
      await db.update(botGroupsTable)
        .set({ welcomeMessage: value, updatedAt: new Date() })
        .where(eq(botGroupsTable.telegramId, pending.groupId));
      const updated = await db.select().from(botGroupsTable).where(eq(botGroupsTable.telegramId, pending.groupId)).limit(1).then((r) => r[0]);
      await ctx.reply("✅ *Texte de bienvenue mis à jour !*", { parse_mode: "Markdown" });
      if (updated && pending.chatId && pending.messageId) {
        try {
          await ctx.telegram.editMessageText(pending.chatId, pending.messageId, undefined, buildWelcomeMenuText(updated), {
            parse_mode: "Markdown", reply_markup: buildWelcomeMenuKeyboard(pending.groupId),
          });
        } catch {}
      }

    } else if (pending.type === "welcomeButtons") {
      // Parser les lignes "Texte | URL"
      const lines = value.split("\n").map((l) => l.trim()).filter(Boolean);
      const buttons: Array<{text: string; url: string}> = [];
      const errors: string[] = [];
      for (const line of lines) {
        const sep = line.indexOf("|");
        if (sep === -1) { errors.push(line); continue; }
        const btnText = line.slice(0, sep).trim();
        const btnUrl  = line.slice(sep + 1).trim();
        if (!btnText || !btnUrl.match(/^https?:\/\//i)) { errors.push(line); continue; }
        buttons.push({ text: btnText, url: btnUrl });
      }
      if (errors.length > 0 && buttons.length === 0) {
        return ctx.reply(`❌ Format invalide. Utilisez :\n\`Texte | https://url.com\`\n\nLignes ignorées :\n${errors.map(e => `• ${e}`).join("\n")}`, { parse_mode: "Markdown" });
      }
      await db.update(botGroupsTable)
        .set({ welcomeButtons: JSON.stringify(buttons), updatedAt: new Date() })
        .where(eq(botGroupsTable.telegramId, pending.groupId));
      const updated = await db.select().from(botGroupsTable).where(eq(botGroupsTable.telegramId, pending.groupId)).limit(1).then((r) => r[0]);
      await ctx.reply(
        `✅ *${buttons.length} bouton(s) enregistré(s) !*${errors.length > 0 ? `\n⚠️ ${errors.length} ligne(s) ignorée(s) (format invalide).` : ""}`,
        { parse_mode: "Markdown" }
      );
      if (updated && pending.chatId && pending.messageId) {
        try {
          await ctx.telegram.editMessageText(pending.chatId, pending.messageId, undefined, buildWelcomeMenuText(updated), {
            parse_mode: "Markdown", reply_markup: buildWelcomeMenuKeyboard(pending.groupId),
          });
        } catch {}
      }

    } else if (pending.type === "rulesText") {
      await db.update(botGroupsTable)
        .set({ rulesText: value, updatedAt: new Date() })
        .where(eq(botGroupsTable.telegramId, pending.groupId));
      const updated = await db.select().from(botGroupsTable).where(eq(botGroupsTable.telegramId, pending.groupId)).limit(1).then((r) => r[0]);
      await ctx.reply("✅ *Règles du groupe mises à jour !*", { parse_mode: "Markdown" });
      if (updated && pending.chatId && pending.messageId) {
        try {
          await ctx.telegram.editMessageText(pending.chatId, pending.messageId, undefined, buildSettingsText(updated), {
            parse_mode: "Markdown", reply_markup: buildSettingsKeyboard(updated),
          });
        } catch {}
      }
    }
  });

  // ─── Réception de photo (bienvenue) ───────────────────────────────────────
  bot.on("photo", async (ctx, next) => {
    let pendingKey: string | null = null;
    let pending: { type: string; groupId: string; chatId: number; messageId?: number } | null = null;

    for (const [k, v] of pendingInputs.entries()) {
      if (k.startsWith(ctx.from!.id.toString() + ":") && v.type === "welcomePhoto") {
        pendingKey = k;
        pending = v;
        break;
      }
    }

    if (!pending || !pendingKey) return next();
    pendingInputs.delete(pendingKey);

    // Prendre la plus grande résolution de la photo
    const photos = (ctx.message as any).photo as Array<{ file_id: string; file_unique_id: string; width: number; height: number }>;
    const fileId = photos[photos.length - 1]?.file_id;
    if (!fileId) return ctx.reply("❌ Photo introuvable, réessayez.");

    await db.update(botGroupsTable)
      .set({ welcomePhoto: fileId, updatedAt: new Date() })
      .where(eq(botGroupsTable.telegramId, pending.groupId));

    const updated = await db.select().from(botGroupsTable).where(eq(botGroupsTable.telegramId, pending.groupId)).limit(1).then((r) => r[0]);
    await ctx.reply("✅ *Photo de bienvenue enregistrée !*", { parse_mode: "Markdown" });

    if (updated && pending.chatId && pending.messageId) {
      try {
        await ctx.telegram.editMessageText(pending.chatId, pending.messageId, undefined, buildWelcomeMenuText(updated), {
          parse_mode: "Markdown", reply_markup: buildWelcomeMenuKeyboard(pending.groupId),
        });
      } catch {}
    }
  });

  // ─── /warn ────────────────────────────────────────────────────────────────
  bot.command("warn", async (ctx) => {
    if (ctx.chat.type === "private") return;
    if (!(await isAdmin(ctx))) return ctx.reply("❌ Réservé aux administrateurs.");
    const target = ctx.message.reply_to_message?.from;
    if (!target) return ctx.reply("↩️ Répondez au message d'un utilisateur pour l'avertir.");
    if (target.is_bot) return ctx.reply("❌ Impossible d'avertir un bot.");

    const reason  = ctx.message.text.split(" ").slice(1).join(" ") || "Comportement inapproprié";
    const groupId = getGroupId(ctx.chat.id);
    const userId  = getUserId(target.id);
    await ensureGroup(ctx.chat.id, ctx.chat.title ?? "Groupe");

    const group = await db.select().from(botGroupsTable).where(eq(botGroupsTable.telegramId, groupId)).limit(1);
    const maxWarnings = group[0]?.maxWarnings ?? 3;

    // Compter AVANT d'insérer
    const [{ count: existingWarns }] = await db.select({ count: count() }).from(botWarningsTable)
      .where(and(eq(botWarningsTable.telegramGroupId, groupId), eq(botWarningsTable.telegramUserId, userId)));
    const existing = Number(existingWarns);

    // Déjà au max → ban direct sans ajouter un nouvel avertissement
    if (existing >= maxWarnings) {
      try {
        await ctx.telegram.banChatMember(ctx.chat.id, target.id);
        await db.insert(botBansTable).values({
          telegramGroupId: groupId, telegramUserId: userId,
          username: target.username ?? null, firstName: target.first_name,
          reason: `Banni par admin après ${maxWarnings} avertissements`, bannedByUserId: getUserId(ctx.from!.id),
        });
        await ctx.reply(`🔨 *${target.first_name}* banni (max d'avertissements déjà atteint).`, { parse_mode: "Markdown" });
      } catch (err) {
        logger.error({ err }, "Manual ban failed");
        await ctx.reply(`⚠️ Impossible de bannir *${target.first_name}*. Vérifiez que le bot a le droit *"Bannir des membres"*.`, { parse_mode: "Markdown" });
      }
      return;
    }

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

    const totalWarns = existing + 1;

    if (totalWarns >= maxWarnings) {
      await ctx.reply(`⚠️ *Avertissement* pour *${target.first_name}*\n📝 ${reason}\n🔢 ${totalWarns}/${maxWarnings} — *Ban automatique en cours...*`, { parse_mode: "Markdown" });
      try {
        await ctx.telegram.banChatMember(ctx.chat.id, target.id);
        await db.insert(botBansTable).values({
          telegramGroupId: groupId, telegramUserId: userId,
          username: target.username ?? null, firstName: target.first_name,
          reason: `Auto-ban après ${maxWarnings} avertissements`, bannedByUserId: "bot",
        });
        await ctx.reply(`🔨 *${target.first_name}* banni après ${maxWarnings} avertissements.`, { parse_mode: "Markdown" });
      } catch (err) {
        logger.error({ err }, "Auto-ban after warn failed");
        await ctx.reply(`⚠️ Impossible de bannir *${target.first_name}* automatiquement. Vérifiez que le bot a le droit *"Bannir des membres"*.`, { parse_mode: "Markdown" });
      }
    } else {
      await ctx.reply(
        `⚠️ *Avertissement* pour *${target.first_name}*\n📝 Raison : ${reason}\n🔢 Total : ${totalWarns}/${maxWarnings}`,
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
    if (!(await isAdmin(ctx))) return ctx.reply("❌ Réservé aux administrateurs.");
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

  // ─── /filter ─────────────────────────────────────────────────────────────
  // Usage: /filter mot [delete|warn|mute|ban]
  bot.command("filter", async (ctx) => {
    if (ctx.chat.type === "private") return;
    if (!(await isAdmin(ctx))) return ctx.reply("❌ Réservé aux administrateurs.");

    const args   = ctx.message.text.trim().split(/\s+/).slice(1);
    const word   = args[0]?.toLowerCase();
    const rawAction = args[1]?.toLowerCase();
    const validActions = ["delete", "warn", "mute", "ban"];
    const action = validActions.includes(rawAction ?? "") ? rawAction! : "delete";

    if (!word) {
      return ctx.reply(
        "📝 *Ajouter un mot interdit*\n\n" +
        "Usage : `/filter mot [action]`\n\n" +
        "Actions disponibles :\n" +
        "• `delete` — Supprimer le message (défaut)\n" +
        "• `warn` — Avertir l'utilisateur\n" +
        "• `mute` — Rendre muet\n" +
        "• `ban` — Bannir\n\n" +
        "Exemples :\n" +
        "`/filter arnaque`\n" +
        "`/filter casino ban`",
        { parse_mode: "Markdown" }
      );
    }

    const groupId = getGroupId(ctx.chat.id);
    await ensureGroup(ctx.chat.id, ctx.chat.title ?? "Groupe");

    // Vérifier si le mot existe déjà
    const existing = await db.select().from(botWordFiltersTable)
      .where(and(eq(botWordFiltersTable.telegramGroupId, groupId), eq(botWordFiltersTable.word, word)));
    if (existing.length > 0) {
      // Mettre à jour l'action
      await db.update(botWordFiltersTable)
        .set({ action })
        .where(and(eq(botWordFiltersTable.telegramGroupId, groupId), eq(botWordFiltersTable.word, word)));
      const actionLabels: Record<string, string> = { delete: "🗑️ Supprimer", warn: "⚠️ Avertir", mute: "🔇 Rendre muet", ban: "🔨 Bannir" };
      return ctx.reply(`✅ Mot *"${word}"* mis à jour — Action : ${actionLabels[action]}`, { parse_mode: "Markdown" });
    }

    await db.insert(botWordFiltersTable).values({ telegramGroupId: groupId, word, action });
    const actionLabels: Record<string, string> = { delete: "🗑️ Supprimer", warn: "⚠️ Avertir", mute: "🔇 Rendre muet", ban: "🔨 Bannir" };
    await ctx.reply(`✅ Mot *"${word}"* ajouté aux filtres.\nAction : ${actionLabels[action]}`, { parse_mode: "Markdown" });
  });

  // ─── /filters ────────────────────────────────────────────────────────────
  bot.command("filters", async (ctx) => {
    if (ctx.chat.type === "private") return;
    if (!(await isAdmin(ctx))) return ctx.reply("❌ Réservé aux administrateurs.");

    const groupId = getGroupId(ctx.chat.id);
    await ensureGroup(ctx.chat.id, ctx.chat.title ?? "Groupe");

    const filters = await db.select().from(botWordFiltersTable)
      .where(eq(botWordFiltersTable.telegramGroupId, groupId))
      .orderBy(botWordFiltersTable.createdAt);

    if (filters.length === 0) {
      return ctx.reply(
        "📋 *Aucun filtre de mots configuré.*\n\nAjoutez des mots avec `/filter mot [action]`.",
        { parse_mode: "Markdown" }
      );
    }

    const actionLabels: Record<string, string> = { delete: "🗑️", warn: "⚠️", mute: "🔇", ban: "🔨" };

    // Afficher chaque filtre avec boutons d'action et suppression
    const rows: any[][] = filters.map((f) => [
      { text: `${actionLabels[f.action] ?? "🗑️"} "${f.word}"`, callback_data: `wfinfo:${f.id}:${groupId}` },
      { text: "✏️ Action", callback_data: `wfmenu:${f.id}:${groupId}` },
      { text: "🗑️ Supprimer", callback_data: `wfdel:${f.id}:${groupId}` },
    ]);

    const header = `📋 *Filtres de mots — ${filters.length} mot(s)*\n\n` +
      filters.map((f) => `• \`${f.word}\` → ${actionLabels[f.action] ?? "🗑️"} ${f.action}`).join("\n");

    await ctx.reply(header, {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: rows },
    });
  });

  // ─── Callbacks filtres de mots ────────────────────────────────────────────
  // Ces callbacks sont interceptés AVANT le handler global callback_query dans setupCommands
  // On les branche directement sur bot.action
  bot.action(/^wfmenu:(\d+):(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const filterId = parseInt(ctx.match[1], 10);
    const groupId  = ctx.match[2];
    const filter = await db.select().from(botWordFiltersTable).where(eq(botWordFiltersTable.id, filterId)).limit(1).then((r) => r[0]);
    if (!filter) return;
    const cur = filter.action;
    const actionLabels: Record<string, string> = { delete: "🗑️ Supprimer", warn: "⚠️ Avertir", mute: "🔇 Rendre muet", ban: "🔨 Bannir" };
    await ctx.editMessageText(
      `✏️ *Action pour le mot "${filter.word}"*\n\nAction actuelle : *${actionLabels[cur] ?? cur}*\n\nChoisissez la nouvelle action :`,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              { text: cur === "delete" ? "✅ 🗑️ Supprimer" : "🗑️ Supprimer", callback_data: `wfact:${filterId}:delete:${groupId}` },
              { text: cur === "warn"   ? "✅ ⚠️ Avertir"   : "⚠️ Avertir",   callback_data: `wfact:${filterId}:warn:${groupId}` },
            ],
            [
              { text: cur === "mute" ? "✅ 🔇 Muet" : "🔇 Muet",  callback_data: `wfact:${filterId}:mute:${groupId}` },
              { text: cur === "ban"  ? "✅ 🔨 Bannir" : "🔨 Bannir", callback_data: `wfact:${filterId}:ban:${groupId}` },
            ],
          ],
        },
      }
    );
  });

  bot.action(/^wfact:(\d+):(\w+):(.+)$/, async (ctx) => {
    const filterId  = parseInt(ctx.match[1], 10);
    const newAction = ctx.match[2];
    const groupId   = ctx.match[3];
    const validActions = ["delete", "warn", "mute", "ban"];
    if (!validActions.includes(newAction)) return ctx.answerCbQuery("❌ Action invalide.");
    await db.update(botWordFiltersTable).set({ action: newAction }).where(eq(botWordFiltersTable.id, filterId));
    const filter = await db.select().from(botWordFiltersTable).where(eq(botWordFiltersTable.id, filterId)).limit(1).then((r) => r[0]);
    const actionLabels: Record<string, string> = { delete: "🗑️ Supprimer", warn: "⚠️ Avertir", mute: "🔇 Rendre muet", ban: "🔨 Bannir" };
    await ctx.answerCbQuery(`✅ Action mise à jour : ${actionLabels[newAction]}`);
    try {
      await ctx.editMessageText(
        `✅ *Mot "${filter?.word ?? "?"}"* — Action mise à jour : *${actionLabels[newAction]}*\n\nFermez ce menu ou relancez /filters pour voir tous les filtres.`,
        { parse_mode: "Markdown" }
      );
    } catch {}
  });

  bot.action(/^wfdel:(\d+):(.+)$/, async (ctx) => {
    const filterId = parseInt(ctx.match[1], 10);
    const filter = await db.select().from(botWordFiltersTable).where(eq(botWordFiltersTable.id, filterId)).limit(1).then((r) => r[0]);
    if (!filter) return ctx.answerCbQuery("❌ Filtre introuvable.");
    await db.delete(botWordFiltersTable).where(eq(botWordFiltersTable.id, filterId));
    await ctx.answerCbQuery(`🗑️ Mot "${filter.word}" supprimé.`);
    try {
      await ctx.editMessageText(`✅ Mot *"${filter.word}"* supprimé des filtres.`, { parse_mode: "Markdown" });
    } catch {}
  });

  // ─── Sélection langue utilisateur (privé) ────────────────────────────────
  bot.action(/^setuserlang:(\w+)$/, async (ctx) => {
    const code = ctx.match[1];
    if (!SUPPORTED_LANGUAGES[code]) return ctx.answerCbQuery("❌ Langue invalide.");
    await setUserLang(ctx.from!.id, code);
    const info = SUPPORTED_LANGUAGES[code];
    await ctx.answerCbQuery(t(code, "lang_saved", { lang: `${info.flag} ${info.label}` }));
    try {
      // Rafraîchir le menu avec la nouvelle sélection
      const rows = Object.entries(SUPPORTED_LANGUAGES).map(([c, inf]) => [{
        text: `${c === code ? "✅ " : ""}${inf.flag} ${inf.label}`,
        callback_data: `setuserlang:${c}`,
      }]);
      await ctx.editMessageReplyMarkup({ inline_keyboard: rows });
    } catch {}
  });

  // ─── Sélection langue groupe (admin) ─────────────────────────────────────
  bot.action(/^setgrouplang:(\w+):(.+)$/, async (ctx) => {
    const code = ctx.match[1];
    const groupId = ctx.match[2];
    if (!SUPPORTED_LANGUAGES[code]) return ctx.answerCbQuery("❌ Langue invalide.");
    if (!(await isAdmin(ctx))) return ctx.answerCbQuery("❌ Réservé aux administrateurs.");

    await db.update(botGroupsTable)
      .set({ language: code, updatedAt: new Date() })
      .where(eq(botGroupsTable.telegramId, groupId));

    const info = SUPPORTED_LANGUAGES[code];
    await ctx.answerCbQuery(t(code, "lang_saved", { lang: `${info.flag} ${info.label}` }));
    try {
      const rows = Object.entries(SUPPORTED_LANGUAGES).map(([c, inf]) => [{
        text: `${c === code ? "✅ " : ""}${inf.flag} ${inf.label}`,
        callback_data: `setgrouplang:${c}:${groupId}`,
      }]);
      await ctx.editMessageReplyMarkup({ inline_keyboard: rows });
    } catch {}
  });

  // ─── Menu langue depuis settings ─────────────────────────────────────────
  bot.action(/^langmenu:(.+)$/, async (ctx) => {
    if (!(await isAdmin(ctx))) return ctx.answerCbQuery("❌ Réservé aux administrateurs.");
    const groupId = ctx.match[1];
    const group = await db.select().from(botGroupsTable)
      .where(eq(botGroupsTable.telegramId, groupId)).limit(1).then((r) => r[0]);
    if (!group) return ctx.answerCbQuery("❌ Groupe introuvable.");
    const glang = group.language ?? "fr";
    await ctx.answerCbQuery();
    const rows = Object.entries(SUPPORTED_LANGUAGES).map(([code, info]) => [{
      text: `${code === glang ? "✅ " : ""}${info.flag} ${info.label}`,
      callback_data: `setgrouplang:${code}:${groupId}`,
    }]);
    rows.push([{ text: "← Retour aux paramètres", callback_data: `back:${groupId}` }]);
    try {
      await ctx.editMessageText(
        t(glang, "lang_group_select_title", {
          lang: `${SUPPORTED_LANGUAGES[glang]?.flag ?? "🇫🇷"} ${SUPPORTED_LANGUAGES[glang]?.label ?? "Français"}`,
        }),
        { parse_mode: "Markdown", reply_markup: { inline_keyboard: rows } }
      );
    } catch {}
  });

  // ─── Nouveaux membres ─────────────────────────────────────────────────────
  bot.on("new_chat_members", async (ctx) => {
    const group = await ensureGroup(ctx.chat.id, ctx.chat.title ?? "Groupe");
    if (!group?.requireVerification) {
      // Pas de vérification : envoyer le message de bienvenue enrichi
      for (const member of ctx.message.new_chat_members) {
        if (member.is_bot) continue;
        const name = member.first_name;
        const glang = group?.language ?? "fr";
        // Si aucun message configuré, utiliser la traduction par défaut
        const effectiveGroup = group?.welcomeMessage || group?.welcomePhoto
          ? group
          : { ...group, welcomeMessage: t(glang, "welcome_default", { name }) };
        try {
          await sendWelcomeMessage(ctx.telegram, ctx.chat.id, effectiveGroup, name);
        } catch (err) {
          logger.error({ err }, "Failed to send welcome message");
        }
      }
    }
    // Si vérification activée, le handler chat_member dans middleware.ts gère tout
  });

  // ─── Membres qui partent ──────────────────────────────────────────────────
  bot.on("left_chat_member", async (ctx) => {
    if (ctx.message.left_chat_member.is_bot) return;
    const group = await ensureGroup(ctx.chat.id, ctx.chat.title ?? "Groupe");
    const glang = group?.language ?? "fr";
    const name = ctx.message.left_chat_member.first_name;
    await ctx.reply(t(glang, "goodbye_default", { name }), { parse_mode: "Markdown" });
  });

  logger.info("Bot commands registered");
}
