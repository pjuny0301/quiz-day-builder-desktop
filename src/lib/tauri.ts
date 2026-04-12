import { invoke } from "@tauri-apps/api/core";

import type { AppState, StudyMode, WindowQuery, WindowRoute } from "./types";


// Load persisted app state from the Tauri backend JSON store.
export async function loadAppState(): Promise<AppState> {
  return invoke<AppState>("load_app_state");
}


// Persist app state to disk through the Tauri backend layer.
export async function saveAppState(state: AppState): Promise<void> {
  await invoke("save_app_state", { state });
}


// Resolve the storage file path for debugging and status display.
export async function getStorageFilePath(): Promise<string> {
  return invoke<string>("storage_file_path");
}


// Build the absolute hash route used by all role-specific screens in the single main window.
export function buildWindowHash(route: WindowRoute, query: WindowQuery = {}): string {
  const params = new URLSearchParams();
  if (query.deckId) {
    params.set("deckId", query.deckId);
  }
  if (query.dayNumber != null) {
    params.set("dayNumber", String(query.dayNumber));
  }
  if (query.mode) {
    params.set("mode", query.mode);
  }
  if (query.scope) {
    params.set("scope", query.scope);
  }
  if (query.draft) {
    params.set("draft", "1");
  }
  const suffix = params.toString();
  return `/#/${route}${suffix ? `?${suffix}` : ""}`;
}


// Build the in-app hash fragment so route changes can happen without opening another window.
function buildInAppHash(route: WindowRoute, query: WindowQuery = {}): string {
  return buildWindowHash(route, query).slice(1);
}


// Navigate the single-window app to another role-specific screen without creating a new webview.
export async function openRoleWindow(
  route: WindowRoute,
  query: WindowQuery = {},
  options?: { replace?: boolean },
): Promise<void> {
  const nextHash = buildInAppHash(route, query);
  const currentHash = window.location.hash || "#/manager";

  if (currentHash === nextHash) {
    return;
  }

  if (options?.replace) {
    const nextUrl = `${window.location.pathname}${window.location.search}${nextHash}`;
    window.location.replace(nextUrl);
    return;
  }

  window.location.hash = nextHash.slice(1);
}


// Return to the manager screen and optionally keep one deck focused after a flow completes.
export async function openManager(deckId?: string, replace = false): Promise<void> {
  await openRoleWindow("manager", deckId ? { deckId } : {}, { replace });
}


// Move back through in-app history and fall back to the manager screen when no prior route exists.
export async function goBackInApp(fallbackRoute: WindowRoute = "manager", fallbackQuery: WindowQuery = {}): Promise<void> {
  const hasRouteHistory = window.history.length > 1 && window.location.hash !== "#/manager";
  if (hasRouteHistory) {
    window.history.back();
    return;
  }

  await openRoleWindow(fallbackRoute, fallbackQuery, { replace: true });
}


// Open the dedicated deck-creation screen so naming never happens inline on the manager.
export async function openDeckCreate(): Promise<void> {
  await openRoleWindow("deck-create");
}


// Open the dedicated deck-settings screen for rename, delay, and cards-per-Day values.
export async function openDeckSettings(deckId: string): Promise<void> {
  await openRoleWindow("deck-settings", { deckId });
}


// Open the dedicated card editor screen for the chosen deck and optionally start in new-card draft mode.
export async function openDeckEditor(deckId: string, options?: { draft?: boolean }): Promise<void> {
  await openRoleWindow("editor", { deckId, draft: options?.draft });
}


// Open the dedicated Day overview screen for the chosen deck.
export async function openDeckDetail(deckId: string): Promise<void> {
  await openRoleWindow("deck-detail", { deckId });
}


// Open the dedicated card-matching screen for a specific Day.
export async function openDayDetail(deckId: string, dayNumber: number): Promise<void> {
  await openRoleWindow("day-detail", { deckId, dayNumber });
}


// Open the dedicated study launcher screen with a fixed scope so the user only needs to choose the question type.
export async function openStudyLauncher(
  deckId: string,
  options?: { dayNumber?: number; scope?: "all" | "day" },
): Promise<void> {
  await openRoleWindow("study-launcher", {
    deckId,
    dayNumber: options?.dayNumber,
    scope: options?.scope ?? (options?.dayNumber != null ? "day" : "all"),
  });
}


// Open the dedicated study session screen for focused answering only.
export async function openStudySession(deckId: string, mode: StudyMode, dayNumber?: number): Promise<void> {
  await openRoleWindow("study-session", { deckId, dayNumber, mode });
}
