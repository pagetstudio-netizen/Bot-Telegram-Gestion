import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const botViolationsTable = pgTable("bot_violations", {
  id: serial("id").primaryKey(),
  telegramGroupId: text("telegram_group_id").notNull(),
  telegramUserId: text("telegram_user_id").notNull(),
  username: text("username"),
  firstName: text("first_name"),
  violationType: text("violation_type").notNull(),
  action: text("action").notNull(),
  details: text("details"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBotViolationSchema = createInsertSchema(botViolationsTable).omit({ id: true, createdAt: true });
export type InsertBotViolation = z.infer<typeof insertBotViolationSchema>;
export type BotViolation = typeof botViolationsTable.$inferSelect;
