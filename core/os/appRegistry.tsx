"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { Activity, Bot, FileText, Folder, Settings, Terminal, MonitorIcon as MonitorCog } from "lucide-react";

import type { AppId } from "@/core/os/appIds";

export type AppComponentProps = { windowId: string };

export type AppDefinition = {
  id: AppId;
  title: string;
  icon: ComponentType<{ className?: string }>;
  component: ComponentType<AppComponentProps>;
  singleton?: boolean;
};

const FileExplorerApp = dynamic(
  () => import("@/apps/file-explorer/FileExplorerApp").then((m) => m.FileExplorerApp),
  { ssr: false }
);
const NotesApp = dynamic(
  () => import("@/apps/notes/NotesApp").then((m) => m.NotesApp),
  { ssr: false }
);
const AIAssistantApp = dynamic(
  () =>
    import("@/apps/ai-assistant/AIAssistantApp").then((m) => m.AIAssistantApp),
  { ssr: false }
);
const SystemMonitorApp = dynamic(
  () =>
    import("@/apps/system-monitor/SystemMonitorApp").then(
      (m) => m.SystemMonitorApp
    ),
  { ssr: false }
);
const TerminalApp = dynamic(
  () => import("@/apps/terminal/TerminalApp").then((m) => m.TerminalApp),
  { ssr: false }
);
const SettingsApp = dynamic(
  () => import("@/apps/settings/SettingsApp").then((m) => m.SettingsApp),
  { ssr: false }
);

export const appRegistry: Record<AppId, AppDefinition> = {
  "file-explorer": {
    id: "file-explorer",
    title: "File Explorer",
    icon: Folder,
    component: FileExplorerApp,
  },
  notes: {
    id: "notes",
    title: "Notes",
    icon: FileText,
    component: NotesApp,
  },
  "ai-assistant": {
    id: "ai-assistant",
    title: "AI Assistant",
    icon: Bot,
    component: AIAssistantApp,
  },
  "system-monitor": {
    id: "system-monitor",
    title: "System Monitor",
    icon: Activity,
    component: SystemMonitorApp,
    singleton: true,
  },
  terminal: {
    id: "terminal",
    title: "Terminal",
    icon: Terminal,
    component: TerminalApp,
  },
  settings: {
    id: "settings",
    title: "Settings",
    icon: Settings,
    component: SettingsApp,
    singleton: true,
  },
};

export const installedApps: AppDefinition[] = Object.values(appRegistry);
