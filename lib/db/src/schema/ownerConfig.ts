import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const botOwnerConfigTable = pgTable("bot_owner_config", {
  id: serial("id").primaryKey(),
  requiredChannel: text("required_channel"),
  requiredChannelTitle: text("required_channel_title"),
  requiredChannelMsg: text("required_channel_msg"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type BotOwnerConfig = typeof botOwnerConfigTable.$inferSelect;
