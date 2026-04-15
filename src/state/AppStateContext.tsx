import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

import { cacheState, cacheStoragePath, hasCachedStateSnapshot, loadPersistedAppState, persistAppState, readCachedState, readCachedStoragePath, replaceDeckInState } from "../store/app-state-store";
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
      const { state: loadedState, storagePath: loadedStoragePath } = await loadPersistedAppState(storagePath);
      setState(loadedState);
      setStoragePath(loadedStoragePath);
      cacheState(loadedState);
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
    clearSaveStatusTimeout();
    setSaveStatusMessage("자동 저장 중...");
    try {
      const normalized = await persistAppState(nextState);
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
      const nextState = replaceDeckInState(draft, deck);
      draft.settings = nextState.settings;
      draft.decks = nextState.decks;
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
