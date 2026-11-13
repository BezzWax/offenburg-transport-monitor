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
