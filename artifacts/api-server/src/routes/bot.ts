import { Router } from "express";
import { getBotInfo } from "../bot/index";
import { db } from "@workspace/db";
import {
  botGroupsTable,
  botWarningsTable,
  botViolationsTable,
  botBansTable,
} from "@workspace/db";
import { count, eq, and, sql, isNull, desc } from "drizzle-orm";

const router = Router();

router.get("/bot/status", async (req, res) => {
  const { running, botInfo, uptime } = getBotInfo();
  res.json({
    running,
    botName: botInfo?.first_name ?? "Bot Modérateur",
    botUsername: botInfo?.username ?? "",
    uptime,
  });
});

router.get("/bot/stats", async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalGroups] = await db.select({ count: count() }).from(botGroupsTable);
  const [totalWarnings] = await db.select({ count: count() }).from(botWarningsTable);
  const [totalBans] = await db
    .select({ count: count() })
    .from(botBansTable)
    .where(isNull(botBansTable.unbannedAt));
  const [totalViolations] = await db.select({ count: count() }).from(botViolationsTable);
  const [todayViolations] = await db
    .select({ count: count() })
    .from(botViolationsTable)
    .where(sql`${botViolationsTable.createdAt} >= ${today.toISOString()}`);
  const [todayWarnings] = await db
    .select({ count: count() })
    .from(botWarningsTable)
    .where(sql`${botWarningsTable.createdAt} >= ${today.toISOString()}`);

  const recentActivity = await db
    .select()
    .from(botViolationsTable)
    .orderBy(desc(botViolationsTable.createdAt))
    .limit(10);

  res.json({
    totalGroups: Number(totalGroups?.count ?? 0),
    totalWarnings: Number(totalWarnings?.count ?? 0),
    totalBans: Number(totalBans?.count ?? 0),
    totalViolations: Number(totalViolations?.count ?? 0),
    todayViolations: Number(todayViolations?.count ?? 0),
    todayWarnings: Number(todayWarnings?.count ?? 0),
    recentActivity,
  });
});

export default router;
