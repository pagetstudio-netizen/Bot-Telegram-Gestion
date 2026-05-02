import { Router } from "express";
import { db } from "@workspace/db";
import { botOwnerConfigTable, botGroupsTable } from "@workspace/db";
import { eq, isNotNull } from "drizzle-orm";
import { getBot } from "../bot/index";
import { logger } from "../lib/logger";

const router = Router();

// ─── GET /api/owner/config ────────────────────────────────────────────────
router.get("/owner/config", async (_req, res) => {
  const [config] = await db.select().from(botOwnerConfigTable).limit(1);
  res.json(config ?? { requiredChannel: null, requiredChannelTitle: null, requiredChannelMsg: null });
});

// ─── PUT /api/owner/config ────────────────────────────────────────────────
router.put("/owner/config", async (req, res) => {
  const { requiredChannel, requiredChannelTitle, requiredChannelMsg } = req.body as {
    requiredChannel?: string | null;
    requiredChannelTitle?: string | null;
    requiredChannelMsg?: string | null;
  };

  const [existing] = await db.select().from(botOwnerConfigTable).limit(1);

  const data = {
    requiredChannel: requiredChannel?.trim() || null,
    requiredChannelTitle: requiredChannelTitle?.trim() || null,
    requiredChannelMsg: requiredChannelMsg?.trim() || null,
    updatedAt: new Date(),
  };

  let result;
  if (existing) {
    [result] = await db.update(botOwnerConfigTable).set(data).where(eq(botOwnerConfigTable.id, existing.id)).returning();
  } else {
    [result] = await db.insert(botOwnerConfigTable).values(data).returning();
  }

  res.json(result);
});

// ─── POST /api/owner/broadcast ────────────────────────────────────────────
router.post("/owner/broadcast", async (req, res) => {
  const { message, buttonText, buttonUrl, photoFileId } = req.body as {
    message: string;
    buttonText?: string;
    buttonUrl?: string;
    photoFileId?: string;
  };

  if (!message?.trim()) {
    return res.status(400).json({ error: "Message requis." });
  }

  const bot = getBot();
  if (!bot) {
    return res.status(503).json({ error: "Bot non disponible." });
  }

  const groups = await db.select({ telegramId: botGroupsTable.telegramId, title: botGroupsTable.title })
    .from(botGroupsTable)
    .where(isNotNull(botGroupsTable.telegramId));

  const keyboard = buttonText && buttonUrl
    ? { inline_keyboard: [[{ text: buttonText, url: buttonUrl }]] }
    : undefined;

  const opts: any = { parse_mode: "Markdown", ...(keyboard ? { reply_markup: keyboard } : {}) };

  let sent = 0;
  let failed = 0;

  for (const group of groups) {
    try {
      if (photoFileId) {
        await bot.telegram.sendPhoto(Number(group.telegramId), photoFileId, { ...opts, caption: message });
      } else {
        await bot.telegram.sendMessage(Number(group.telegramId), message, opts);
      }
      sent++;
    } catch (err) {
      failed++;
      logger.warn({ err, groupId: group.telegramId }, "Broadcast failed for group");
    }
    // Rate limit : 1 msg/s pour éviter le flood Telegram
    await new Promise((r) => setTimeout(r, 1000));
  }

  res.json({ sent, failed, total: groups.length });
});

export default router;
