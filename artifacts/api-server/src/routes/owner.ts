import { Router } from "express";
import { db } from "@workspace/db";
import {
  botOwnerConfigTable,
  botUserSettingsTable,
  botGroupsTable,
  botWarningsTable,
  botBansTable,
  botViolationsTable,
} from "@workspace/db";
import type { OwnerLink } from "@workspace/db";
import { eq, count, isNull, sql, desc } from "drizzle-orm";
import { getBot, getBotInfo, restartBot } from "../bot/index";
import { logger } from "../lib/logger";

const router = Router();

async function getOrCreateConfig() {
  const [existing] = await db.select().from(botOwnerConfigTable).limit(1);
  return existing ?? null;
}

function parseLinks(raw: string | null | undefined): OwnerLink[] {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

// ─── GET /api/owner/config ────────────────────────────────────────────────
router.get("/owner/config", async (_req, res) => {
  const cfg = await getOrCreateConfig();
  res.json({ requiredLinks: parseLinks(cfg?.requiredLinks) });
});

// ─── PUT /api/owner/config ────────────────────────────────────────────────
router.put("/owner/config", async (req, res) => {
  const { requiredLinks } = req.body as { requiredLinks?: OwnerLink[] };

  const data = {
    requiredLinks: requiredLinks && requiredLinks.length > 0 ? JSON.stringify(requiredLinks) : null,
    updatedAt: new Date(),
  };

  const existing = await getOrCreateConfig();
  let result;
  if (existing) {
    [result] = await db.update(botOwnerConfigTable).set(data).where(eq(botOwnerConfigTable.id, existing.id)).returning();
  } else {
    [result] = await db.insert(botOwnerConfigTable).values(data).returning();
  }

  res.json({ requiredLinks: parseLinks(result.requiredLinks) });
});

// ─── GET /api/owner/stats ─────────────────────────────────────────────────
router.get("/owner/stats", async (_req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [totalUsers]      = await db.select({ count: count() }).from(botUserSettingsTable);
  const [totalGroups]     = await db.select({ count: count() }).from(botGroupsTable);
  const [activeGroups]    = await db.select({ count: count() }).from(botGroupsTable).where(eq(botGroupsTable.isActive, true));
  const [totalWarnings]   = await db.select({ count: count() }).from(botWarningsTable);
  const [totalBans]       = await db.select({ count: count() }).from(botBansTable).where(isNull(botBansTable.unbannedAt));
  const [totalViolations] = await db.select({ count: count() }).from(botViolationsTable);
  const [todayViolations] = await db.select({ count: count() }).from(botViolationsTable)
    .where(sql`${botViolationsTable.createdAt} >= ${today.toISOString()}`);
  const [todayWarnings]   = await db.select({ count: count() }).from(botWarningsTable)
    .where(sql`${botWarningsTable.createdAt} >= ${today.toISOString()}`);
  const [weekViolations]  = await db.select({ count: count() }).from(botViolationsTable)
    .where(sql`${botViolationsTable.createdAt} >= ${sevenDaysAgo.toISOString()}`);

  // Distribution des langues
  const langRows = await db.select({ language: botGroupsTable.language, cnt: count() })
    .from(botGroupsTable)
    .groupBy(botGroupsTable.language);

  // Top 5 groupes par violations
  const topGroups = await db.select({
    groupId: botViolationsTable.telegramGroupId,
    violations: count(),
  })
    .from(botViolationsTable)
    .groupBy(botViolationsTable.telegramGroupId)
    .orderBy(desc(count()))
    .limit(5);

  // Récupérer les titres des top groupes
  const topGroupsWithTitle = await Promise.all(
    topGroups.map(async (g) => {
      const [grp] = await db.select({ title: botGroupsTable.title })
        .from(botGroupsTable)
        .where(eq(botGroupsTable.telegramId, g.groupId))
        .limit(1);
      return { title: grp?.title ?? g.groupId, violations: Number(g.violations) };
    })
  );

  // Activité des 7 derniers jours (par jour)
  const dailyActivity = await db.select({
    day: sql<string>`DATE(${botViolationsTable.createdAt})`,
    count: count(),
  })
    .from(botViolationsTable)
    .where(sql`${botViolationsTable.createdAt} >= ${sevenDaysAgo.toISOString()}`)
    .groupBy(sql`DATE(${botViolationsTable.createdAt})`)
    .orderBy(sql`DATE(${botViolationsTable.createdAt})`);

  const { botInfo, uptime, restartCount } = getBotInfo();

  res.json({
    totalUsers:      Number(totalUsers?.count ?? 0),
    totalGroups:     Number(totalGroups?.count ?? 0),
    activeGroups:    Number(activeGroups?.count ?? 0),
    totalWarnings:   Number(totalWarnings?.count ?? 0),
    totalBans:       Number(totalBans?.count ?? 0),
    totalViolations: Number(totalViolations?.count ?? 0),
    todayViolations: Number(todayViolations?.count ?? 0),
    todayWarnings:   Number(todayWarnings?.count ?? 0),
    weekViolations:  Number(weekViolations?.count ?? 0),
    languages: langRows.map((r) => ({ language: r.language, count: Number(r.cnt) })),
    topGroups: topGroupsWithTitle,
    dailyActivity,
    botInfo,
    uptime,
    restartCount,
  });
});

// ─── POST /api/owner/restart ──────────────────────────────────────────────
router.post("/owner/restart", async (_req, res) => {
  logger.info("Bot restart requested from dashboard");
  const result = await restartBot();
  res.json(result);
});

// ─── POST /api/owner/broadcast ────────────────────────────────────────────
router.post("/owner/broadcast", async (req, res) => {
  const { message, buttonText, buttonUrl } = req.body as {
    message: string;
    buttonText?: string;
    buttonUrl?: string;
  };

  if (!message?.trim()) {
    return res.status(400).json({ error: "Message requis." });
  }

  const bot = getBot();
  if (!bot) {
    return res.status(503).json({ error: "Bot non disponible." });
  }

  const users = await db.select({ telegramUserId: botUserSettingsTable.telegramUserId })
    .from(botUserSettingsTable);

  const keyboard = buttonText && buttonUrl
    ? { inline_keyboard: [[{ text: buttonText, url: buttonUrl }]] }
    : undefined;

  const opts: any = { parse_mode: "Markdown", ...(keyboard ? { reply_markup: keyboard } : {}) };

  let sent = 0, failed = 0;
  for (const user of users) {
    try {
      await bot.telegram.sendMessage(Number(user.telegramUserId), message, opts);
      sent++;
    } catch (err) {
      failed++;
      logger.warn({ err, userId: user.telegramUserId }, "Broadcast failed for user");
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  res.json({ sent, failed, total: users.length });
});

export default router;
