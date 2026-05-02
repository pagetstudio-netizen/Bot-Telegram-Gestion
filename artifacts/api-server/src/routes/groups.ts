import { Router } from "express";
import { db } from "@workspace/db";
import {
  botGroupsTable,
  botWarningsTable,
  botViolationsTable,
  botWordFiltersTable,
  botBansTable,
} from "@workspace/db";
import { eq, and, isNull, count, desc } from "drizzle-orm";
import { getBot } from "../bot/index";

const router = Router();

router.get("/groups", async (req, res) => {
  const groups = await db.select().from(botGroupsTable).orderBy(desc(botGroupsTable.createdAt));

  const result = await Promise.all(
    groups.map(async (g) => {
      const [warnCount] = await db
        .select({ count: count() })
        .from(botWarningsTable)
        .where(eq(botWarningsTable.telegramGroupId, g.telegramId));
      const [banCount] = await db
        .select({ count: count() })
        .from(botBansTable)
        .where(and(eq(botBansTable.telegramGroupId, g.telegramId), isNull(botBansTable.unbannedAt)));

      return {
        ...g,
        memberCount: 0,
        warningCount: Number(warnCount?.count ?? 0),
        banCount: Number(banCount?.count ?? 0),
      };
    })
  );

  res.json(result);
});

router.get("/groups/:groupId", async (req, res) => {
  const group = await db
    .select()
    .from(botGroupsTable)
    .where(eq(botGroupsTable.telegramId, req.params.groupId))
    .limit(1);

  if (!group[0]) return res.status(404).json({ error: "Groupe introuvable" });

  const [warnCount] = await db
    .select({ count: count() })
    .from(botWarningsTable)
    .where(eq(botWarningsTable.telegramGroupId, req.params.groupId));
  const [banCount] = await db
    .select({ count: count() })
    .from(botBansTable)
    .where(and(eq(botBansTable.telegramGroupId, req.params.groupId), isNull(botBansTable.unbannedAt)));

  res.json({
    ...group[0],
    memberCount: 0,
    warningCount: Number(warnCount?.count ?? 0),
    banCount: Number(banCount?.count ?? 0),
  });
});

router.put("/groups/:groupId/settings", async (req, res) => {
  const group = await db
    .select()
    .from(botGroupsTable)
    .where(eq(botGroupsTable.telegramId, req.params.groupId))
    .limit(1);

  if (!group[0]) return res.status(404).json({ error: "Groupe introuvable" });

  const {
    antiSpam, antiFlood, antiLinks, antiProfanity,
    welcomeMessage, rulesText, maxWarnings, muteDuration,
    floodLimit, floodWindow,
  } = req.body;

  const updated = await db
    .update(botGroupsTable)
    .set({
      ...(antiSpam !== undefined && { antiSpam }),
      ...(antiFlood !== undefined && { antiFlood }),
      ...(antiLinks !== undefined && { antiLinks }),
      ...(antiProfanity !== undefined && { antiProfanity }),
      ...(welcomeMessage !== undefined && { welcomeMessage }),
      ...(rulesText !== undefined && { rulesText }),
      ...(maxWarnings !== undefined && { maxWarnings }),
      ...(muteDuration !== undefined && { muteDuration }),
      ...(floodLimit !== undefined && { floodLimit }),
      ...(floodWindow !== undefined && { floodWindow }),
      updatedAt: new Date(),
    })
    .where(eq(botGroupsTable.telegramId, req.params.groupId))
    .returning();

  const [warnCount] = await db
    .select({ count: count() })
    .from(botWarningsTable)
    .where(eq(botWarningsTable.telegramGroupId, req.params.groupId));
  const [banCount] = await db
    .select({ count: count() })
    .from(botBansTable)
    .where(and(eq(botBansTable.telegramGroupId, req.params.groupId), isNull(botBansTable.unbannedAt)));

  res.json({ ...updated[0], memberCount: 0, warningCount: Number(warnCount?.count ?? 0), banCount: Number(banCount?.count ?? 0) });
});

router.get("/groups/:groupId/warnings", async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  const warnings = await db
    .select()
    .from(botWarningsTable)
    .where(eq(botWarningsTable.telegramGroupId, req.params.groupId))
    .orderBy(desc(botWarningsTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json(warnings);
});

router.delete("/groups/:groupId/warnings/:userId", async (req, res) => {
  await db
    .delete(botWarningsTable)
    .where(
      and(
        eq(botWarningsTable.telegramGroupId, req.params.groupId),
        eq(botWarningsTable.telegramUserId, req.params.userId)
      )
    );
  res.json({ success: true, message: "Avertissements supprimés" });
});

router.get("/groups/:groupId/violations", async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  const violations = await db
    .select()
    .from(botViolationsTable)
    .where(eq(botViolationsTable.telegramGroupId, req.params.groupId))
    .orderBy(desc(botViolationsTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json(violations);
});

router.get("/groups/:groupId/word-filters", async (req, res) => {
  const filters = await db
    .select()
    .from(botWordFiltersTable)
    .where(eq(botWordFiltersTable.telegramGroupId, req.params.groupId))
    .orderBy(desc(botWordFiltersTable.createdAt));

  res.json(filters);
});

router.post("/groups/:groupId/word-filters", async (req, res) => {
  const { word, action } = req.body;
  if (!word || !action) return res.status(400).json({ error: "word et action sont requis" });

  const [filter] = await db
    .insert(botWordFiltersTable)
    .values({
      telegramGroupId: req.params.groupId,
      word: word.toLowerCase().trim(),
      action,
    })
    .returning();

  res.status(201).json(filter);
});

router.delete("/groups/:groupId/word-filters/:filterId", async (req, res) => {
  await db
    .delete(botWordFiltersTable)
    .where(eq(botWordFiltersTable.id, parseInt(req.params.filterId)));
  res.json({ success: true, message: "Filtre supprimé" });
});

router.get("/groups/:groupId/bans", async (req, res) => {
  const bans = await db
    .select()
    .from(botBansTable)
    .where(and(eq(botBansTable.telegramGroupId, req.params.groupId), isNull(botBansTable.unbannedAt)))
    .orderBy(desc(botBansTable.bannedAt));

  res.json(bans.map((b) => ({ ...b, bannedAt: b.bannedAt.toISOString() })));
});

router.post("/groups/:groupId/unban/:userId", async (req, res) => {
  const bot = getBot();
  if (bot) {
    try {
      await bot.telegram.unbanChatMember(
        parseInt(req.params.groupId),
        parseInt(req.params.userId)
      );
    } catch {}
  }

  await db
    .update(botBansTable)
    .set({ unbannedAt: new Date() })
    .where(
      and(
        eq(botBansTable.telegramGroupId, req.params.groupId),
        eq(botBansTable.telegramUserId, req.params.userId),
        isNull(botBansTable.unbannedAt)
      )
    );

  res.json({ success: true, message: "Utilisateur débanni" });
});

export default router;
