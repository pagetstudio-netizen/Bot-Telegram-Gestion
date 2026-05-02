import { Telegraf, Context } from "telegraf";
import { logger } from "../lib/logger";
import { setupCommands } from "./commands";
import { setupMiddleware } from "./middleware";

let bot: Telegraf | null = null;
let botStartTime = Date.now();
let botInfo: { first_name: string; username: string } | null = null;

export function getBot(): Telegraf | null {
  return bot;
}

export function getBotInfo() {
  return { botInfo, uptime: Math.floor((Date.now() - botStartTime) / 1000), running: bot !== null };
}

export async function startBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    logger.warn("TELEGRAM_BOT_TOKEN not set, bot will not start");
    return;
  }

  try {
    bot = new Telegraf(token);

    const info = await bot.telegram.getMe();
    botInfo = { first_name: info.first_name, username: info.username ?? "" };
    botStartTime = Date.now();

    setupMiddleware(bot);
    setupCommands(bot);

    bot.catch((err: unknown, ctx: Context) => {
      logger.error({ err, update: ctx.update }, "Bot error");
    });

    bot.launch({ dropPendingUpdates: true });
    logger.info({ username: botInfo.username }, "Telegram bot started");

    process.once("SIGINT", () => bot?.stop("SIGINT"));
    process.once("SIGTERM", () => bot?.stop("SIGTERM"));
  } catch (err) {
    logger.error({ err }, "Failed to start Telegram bot");
    bot = null;
  }
}
