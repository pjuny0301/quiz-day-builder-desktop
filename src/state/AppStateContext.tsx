import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

import { createEmptyState, normalizeDeck, normalizeState } from "../lib/state-utils";
import { getStorageFilePath, loadAppState, saveAppState } from "../lib/tauri";
import type { AppState, Deck } from "../lib/types";

interface AppStateContextValue {
  state: AppState;
  storagePath: string;
  isLoading: boolean;
  loadError: string;
  saveStatusMessage: string;
  refresh: () => Promise<void>;
  saveWithMutation: (mutate: (draft: AppState) => void) => Promise<void>;
  replaceDeck: (deck: Deck) => Promise<void>;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);
const APP_STATE_CACHE_KEY = "quizdaybuilder:app-state";
const STORAGE_PATH_CACHE_KEY = "quizdaybuilder:storage-path";


// Return whether a cached state snapshot already exists for instant window boot.
function hasCachedStateSnapshot(): boolean {
  try {
    return window.localStorage.getItem(APP_STATE_CACHE_KEY) != null;
  } catch {
    return false;
  }
}


// Read the latest cached app state so newly opened windows can render without waiting for Tauri IO.
function readCachedState(): AppState {
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
function readCachedStoragePath(): string {
  try {
    return window.localStorage.getItem(STORAGE_PATH_CACHE_KEY) ?? "";
  } catch {
    return "";
  }
}


// Store the normalized app state locally so every new window can start from the latest snapshot.
function cacheState(state: AppState): void {
  try {
    window.localStorage.setItem(APP_STATE_CACHE_KEY, JSON.stringify(state));
  } catch {
    // Ignore cache write failures because disk persistence still happens through Tauri.
  }
}


// Store the resolved storage path locally because it is stable across windows in one install.
function cacheStoragePath(storagePath: string): void {
  try {
    window.localStorage.setItem(STORAGE_PATH_CACHE_KEY, storagePath);
  } catch {
    // Ignore cache write failures because the UI can still function without the path hint.
  }
}


// Provide shared app state to all role-specific screens inside the single-window app shell.
export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(() => readCachedState());
  const [storagePath, setStoragePath] = useState(() => readCachedStoragePath());
  const [isLoading, setIsLoading] = useState(() => !hasCachedStateSnapshot());
  const [loadError, setLoadError] = useState("");
  const [saveStatusMessage, setSaveStatusMessage] = useState("자동 저장 준비");
  const saveStatusTimeoutRef = useRef<number | null>(null);

  // Clear the temporary save-status timeout before scheduling a newer one.
  function clearSaveStatusTimeout() {
    if (saveStatusTimeoutRef.current == null) {
      return;
    }
    window.clearTimeout(saveStatusTimeoutRef.current);
    saveStatusTimeoutRef.current = null;
  }

  // Show one temporary save result message and then return to the idle autosave hint.
  function setTemporarySaveStatus(message: string) {
    clearSaveStatusTimeout();
    setSaveStatusMessage(message);
    saveStatusTimeoutRef.current = window.setTimeout(() => {
      setSaveStatusMessage("자동 저장 준비");
      saveStatusTimeoutRef.current = null;
    }, 2200);
  }

  // Refresh the full shared state and surface any load failure instead of leaving the UI in a spinner forever.
  async function refresh() {
    try {
      const [loadedState, loadedStoragePath] = await Promise.all([
        loadAppState(),
        storagePath ? Promise.resolve(storagePath) : getStorageFilePath(),
      ]);
      const normalizedState = normalizeState(loadedState);
      setState(normalizedState);
      setStoragePath(loadedStoragePath);
      cacheState(normalizedState);
      cacheStoragePath(loadedStoragePath);
      setLoadError("");
      setSaveStatusMessage("자동 저장 준비");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setLoadError(message);
      setSaveStatusMessage(`불러오기 실패: ${message}`);
    } finally {
      setIsLoading(false);
    }
  }

  // Persist one normalized app-state snapshot and keep the local cache in sync with disk.
  async function persist(nextState: AppState) {
    const normalized = normalizeState(nextState);
    clearSaveStatusTimeout();
    setSaveStatusMessage("자동 저장 중...");
    try {
      await saveAppState(normalized);
      setState(normalized);
      cacheState(normalized);
      setTemporarySaveStatus("자동 저장됨");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setSaveStatusMessage(`저장 실패: ${message}`);
      throw error;
    }
  }

  // Apply a mutation callback against a cloned state tree before saving it as one atomic write.
  async function saveWithMutation(mutate: (draft: AppState) => void) {
    const draft = structuredClone(state);
    mutate(draft);
    await persist(draft);
  }

  // Replace one deck record in the shared state while keeping the rest of the store intact.
  async function replaceDeck(deck: Deck) {
    await saveWithMutation((draft) => {
      const existingIndex = draft.decks.findIndex((entry) => entry.id === deck.id);
      const normalizedDeck = normalizeDeck(deck);
      if (existingIndex >= 0) {
        draft.decks[existingIndex] = normalizedDeck;
      } else {
        draft.decks.push(normalizedDeck);
      }
    });
  }

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    return () => {
      clearSaveStatusTimeout();
    };
  }, []);

  const value = useMemo<AppStateContextValue>(
    () => ({
      state,
      storagePath,
      isLoading,
      loadError,
      saveStatusMessage,
      refresh,
      saveWithMutation,
      replaceDeck,
    }),
    [isLoading, loadError, saveStatusMessage, state, storagePath],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}


// Read the synchronized app state and save helpers inside any routed screen component.
export function useAppState() {
  const value = useContext(AppStateContext);
  if (!value) {
    throw new Error("useAppState must be used inside AppStateProvider");
  }
  return value;
}
