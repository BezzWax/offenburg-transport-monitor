import "dotenv/config";
import { collectSource } from "./collector.js";
import { buildReport } from "./report.js";
import { SOURCES } from "./sources.js";
import { sendTelegramMessage } from "./telegram.js";

async function main(): Promise<void> {
  console.log("Starting Offenburg transport check...");

  const results = await Promise.all(SOURCES.map(collectSource));

  for (const result of results) {
    if (result.error) {
      console.error(`[${result.source.name}] ${result.error}`);
    } else {
      console.log(
        `[${result.source.name}] collected ${result.notices.length} notice blocks`,
      );
    }
  }

  const report = buildReport(results);
  console.log("\n--- REPORT ---\n");
  console.log(report);

  const dryRun = process.env.DRY_RUN !== "false";
  if (dryRun) {
    console.log("\nDRY_RUN enabled: Telegram message was not sent.");
    return;
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatIds = (process.env.TELEGRAM_CHAT_IDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (!token || chatIds.length === 0) {
    throw new Error(
      "Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_IDS, or use DRY_RUN=true.",
    );
  }

  await sendTelegramMessage(report, token, chatIds);
  console.log(`Report sent to ${chatIds.length} Telegram chat(s).`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
