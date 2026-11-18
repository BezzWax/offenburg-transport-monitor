
import "dotenv/config";
import { collectSource } from "./collector.js";
import { buildReport } from "./report.js";
import { SOURCES, SUBSCRIBERS_API_URL } from "./sources.js";
import { sendTelegramMessage } from "./telegram.js";


async function getSubscribers(): Promise<string[]> {
  const secret = process.env.SUBSCRIBERS_API_SECRET;

  if (!secret) {
    throw new Error("SUBSCRIBERS_API_SECRET is not configured.");
  }

  const response = await fetch(SUBSCRIBERS_API_URL, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${secret}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.text();

    throw new Error(
      `Subscribers API error ${response.status}: ${error}`,
    );
  }

  const data: unknown = await response.json();

  if (
    typeof data !== "object" ||
    data === null ||
    !("success" in data) ||
    data.success !== true ||
    !("chatIds" in data) ||
    !Array.isArray(data.chatIds)
  ) {
    throw new Error("Invalid response from subscribers API.");
  }

  const chatIds = data.chatIds;

  if (!chatIds.every((id): id is string => typeof id === "string")) {
    throw new Error("Subscribers API returned invalid chat IDs.");
  }

  return [...new Set(chatIds)];
}

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

  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured.");
  }

  console.log("\nFetching active Telegram subscribers...");

  const chatIds = await getSubscribers();

  console.log(`Found ${chatIds.length} active subscriber(s).`);

  if (chatIds.length === 0) {
    console.log("No active subscribers. Telegram message was not sent.");
    return;
  }

  await sendTelegramMessage(report, token, chatIds);

  console.log(`Report sent to ${chatIds.length} Telegram chat(s).`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
