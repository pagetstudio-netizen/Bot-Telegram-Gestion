import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const botBansTable = pgTable("bot_bans", {
  id: serial("id").primaryKey(),
  telegramGroupId: text("telegram_group_id").notNull(),
  telegramUserId: text("telegram_user_id").notNull(),
  username: text("username"),
  firstName: text("first_name"),
  reason: text("reason"),
  bannedByUserId: text("banned_by_user_id"),
  bannedAt: timestamp("banned_at").notNull().defaultNow(),
  unbannedAt: timestamp("unbanned_at"),
});

export const insertBotBanSchema = createInsertSchema(botBansTable).omit({ id: true, bannedAt: true });
export type InsertBotBan = z.infer<typeof insertBotBanSchema>;
export type BotBan = typeof botBansTable.$inferSelect;
