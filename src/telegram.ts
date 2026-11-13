export async function sendTelegramMessage(
  text: string,
  botToken: string,
  chatIds: string[],
): Promise<void> {
  for (const chatId of chatIds) {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
        signal: AbortSignal.timeout(15_000),
      },
    );

    const result: unknown = await response.json();

    if (!response.ok) {
      throw new Error(
        `Telegram sendMessage failed for chat ${chatId}: ${JSON.stringify(result)}`,
      );
    }
  }
}
