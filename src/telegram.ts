import {
  MAX_ATTEMPTS,
  REQUEST_TIMEOUT_MS,
  RETRY_DELAYS_MS,
  TelegramPermanentError,
} from "./sources.js";
import { TelegramResponse } from "./types.js";

function isTelegramResponse(value: unknown): value is TelegramResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "ok" in value &&
    typeof value.ok === "boolean"
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

export async function sendTelegramMessage(
  text: string,
  botToken: string,
  chatIds: string[],
): Promise<void> {
  for (const chatId of chatIds) {
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        console.log(
          `[Telegram] Sending message to chat ${chatId}, attempt ${attempt}/${MAX_ATTEMPTS}`,
        );

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
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          },
        );

        const result: unknown = await response.json();

        if (!isTelegramResponse(result)) {
          throw new Error("Telegram returned an invalid response");
        }

        if (response.ok && result.ok) {
          console.log(`[Telegram] Message sent to chat ${chatId}`);
          lastError = undefined;
          break;
        }

        const errorMessage = result.description ?? `HTTP ${response.status}`;

        if (!isRetryableStatus(response.status)) {
          throw new TelegramPermanentError(
            `Telegram sendMessage failed for chat ${chatId}: ${errorMessage}`,
          );
        }

        if (attempt === MAX_ATTEMPTS) {
          throw new Error(
            `Telegram sendMessage failed for chat ${chatId}: ${errorMessage}`,
          );
        }

        const retryAfter = result.parameters?.retry_after;
        const delay =
          response.status === 429 && retryAfter
            ? retryAfter * 1000
            : RETRY_DELAYS_MS[attempt - 1];

        console.warn(
          `[Telegram] Temporary error: ${errorMessage}. Retrying in ${delay / 1000}s`,
        );

        await sleep(delay);
      } catch (error: unknown) {
        lastError = error;

        if (error instanceof TelegramPermanentError) {
          throw error;
        }

        if (attempt === MAX_ATTEMPTS) {
          break;
        }

        console.warn(
          `[Telegram] Attempt ${attempt} failed. Retrying in ${
            RETRY_DELAYS_MS[attempt - 1] / 1000
          }s`,
          error,
        );

        await sleep(RETRY_DELAYS_MS[attempt - 1]);
      }
    }

    if (lastError !== undefined) {
      throw new Error(
        `Failed to send Telegram message to chat ${chatId} after ${MAX_ATTEMPTS} attempts`,
        { cause: lastError },
      );
    }
  }
}
