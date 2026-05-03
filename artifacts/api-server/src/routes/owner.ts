import { Router } from "express";
import { db } from "@workspace/db";
import { botOwnerConfigTable, botUserSettingsTable } from "@workspace/db";
import type { OwnerLink } from "@workspace/db";
import { eq } from "drizzle-orm";
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

// ─── POST /api/owner/broadcast ────────────────────────────────────────────
// Envoie un message en PRIVÉ à toutes les personnes qui ont écrit au bot
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

  // Récupérer tous les utilisateurs privés (marchands / propriétaires de groupes)
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
    await new Promise((r) => setTimeout(r, 300)); // 300ms entre chaque message privé
  }

  res.json({ sent, failed, total: users.length });
});

export default router;
