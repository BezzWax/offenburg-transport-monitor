import type { TransportSource } from "./types.js";

export const SOURCES: TransportSource[] = [
  {
    id: "stadtbus-offenburg",
    name: "Stadtbus Offenburg",
    url: "https://stadtbus-offenburg.de/",
    kind: "city-bus",
  },
  {
    id: "sweg",
    name: "SWEG",
    url: "https://www.sweg.de/de/",
    kind: "regional-transport",
  },
];

export const MAX_ATTEMPTS = 3;
export const REQUEST_TIMEOUT_MS = 15_000;
export const RETRY_DELAYS_MS = [2_000, 5_000];

export class TelegramPermanentError extends Error {}
