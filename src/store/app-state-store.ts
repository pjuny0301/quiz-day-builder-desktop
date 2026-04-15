import { createEmptyState, normalizeDeck, normalizeState } from "../domain/quiz-state";
import { getStorageFilePath, loadAppState, saveAppState } from "../lib/tauri";
import type { AppState, Deck } from "../lib/types";

const APP_STATE_CACHE_KEY = "quizdaybuilder:app-state";
const STORAGE_PATH_CACHE_KEY = "quizdaybuilder:storage-path";

// Return whether a cached state snapshot already exists for instant window boot.
export function hasCachedStateSnapshot(): boolean {
  try {
    return window.localStorage.getItem(APP_STATE_CACHE_KEY) != null;
  } catch {
    return false;
  }
}

// Read the latest cached app state so newly opened windows can render without waiting for Tauri IO.
export function readCachedState(): AppState {
  try {
    const raw = window.localStorage.getItem(APP_STATE_CACHE_KEY);
    if (!raw) {
      return createEmptyState();
    }
    return normalizeState(JSON.parse(raw));
  } catch {
    return createEmptyState();
  }
}

// Read the last known storage path so status text does not wait on another backend round trip.
export function readCachedStoragePath(): string {
  try {
    return window.localStorage.getItem(STORAGE_PATH_CACHE_KEY) ?? "";
  } catch {
    return "";
  }
}

// Store the normalized app state locally so every new window can start from the latest snapshot.
export function cacheState(state: AppState): void {
  try {
    window.localStorage.setItem(APP_STATE_CACHE_KEY, JSON.stringify(state));
  } catch {
    // Ignore cache write failures because disk persistence still happens through Tauri.
  }
}

// Store the resolved storage path locally because it is stable across windows in one install.
export function cacheStoragePath(storagePath: string): void {
  try {
    window.localStorage.setItem(STORAGE_PATH_CACHE_KEY, storagePath);
  } catch {
    // Ignore cache write failures because the UI can still function without the path hint.
  }
}

// Read the current persisted state and storage path from the backend, then normalize both.
export async function loadPersistedAppState(currentStoragePath = ""): Promise<{ state: AppState; storagePath: string }> {
  const [loadedState, loadedStoragePath] = await Promise.all([
    loadAppState(),
    currentStoragePath ? Promise.resolve(currentStoragePath) : getStorageFilePath(),
  ]);
  return {
    state: normalizeState(loadedState),
    storagePath: loadedStoragePath,
  };
}

// Persist one normalized app-state snapshot through the backend API.
export async function persistAppState(nextState: AppState): Promise<AppState> {
  const normalized = normalizeState(nextState);
  await saveAppState(normalized);
  return normalized;
}

// Replace one deck record in a cloned state while keeping the rest of the store intact.
export function replaceDeckInState(state: AppState, deck: Deck): AppState {
  const nextState = structuredClone(state);
  const existingIndex = nextState.decks.findIndex((entry) => entry.id === deck.id);
  const normalizedDeck = normalizeDeck(deck);
  if (existingIndex >= 0) {
    nextState.decks[existingIndex] = normalizedDeck;
  } else {
    nextState.decks.push(normalizedDeck);
  }
  return nextState;
}
