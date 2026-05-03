import { Router } from "express";
import { db } from "@workspace/db";
import { botOwnerConfigTable, botGroupsTable } from "@workspace/db";
import type { OwnerLink } from "@workspace/db";
import { eq, isNotNull } from "drizzle-orm";
import { getBot } from "../bot/index";
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
  res.json({
    requiredLinks: parseLinks(cfg?.requiredLinks),
  });
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

  const groups = await db.select({ telegramId: botGroupsTable.telegramId })
    .from(botGroupsTable)
    .where(isNotNull(botGroupsTable.telegramId));

  const keyboard = buttonText && buttonUrl
    ? { inline_keyboard: [[{ text: buttonText, url: buttonUrl }]] }
    : undefined;

  const opts: any = { parse_mode: "Markdown", ...(keyboard ? { reply_markup: keyboard } : {}) };

  let sent = 0, failed = 0;
  for (const group of groups) {
    try {
      await bot.telegram.sendMessage(Number(group.telegramId), message, opts);
      sent++;
    } catch (err) {
      failed++;
      logger.warn({ err, groupId: group.telegramId }, "Broadcast failed for group");
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  res.json({ sent, failed, total: groups.length });
});

export default router;
