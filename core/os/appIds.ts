export const APP_IDS = [
  "file-explorer",
  "notes",
  "ai-assistant",
  "system-monitor",
  "terminal",
  "settings",
] as const;

export type AppId = (typeof APP_IDS)[number];
