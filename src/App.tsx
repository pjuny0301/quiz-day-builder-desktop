import { HashRouter, Navigate, Route, Routes } from "react-router-dom";

import { AppStateProvider } from "./state/AppStateContext";
import { DayDetailWindow } from "./windows/DayDetailWindow";
import { DeckCreateWindow } from "./windows/DeckCreateWindow";
import { DeckDetailWindow } from "./windows/DeckDetailWindow";
import { DeckEditorWindow } from "./windows/DeckEditorWindow";
import { DeckManagerWindow } from "./windows/DeckManagerWindow";
import { DeckSettingsWindow } from "./windows/DeckSettingsWindow";
import { StudyLauncherWindow } from "./windows/StudyLauncherWindow";
import { StudySessionWindow } from "./windows/StudySessionWindow";


// Route the shared frontend bundle into dedicated role-specific screens inside one main window.
export function App() {
  return (
    <AppStateProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/manager" replace />} />
          <Route path="/manager" element={<DeckManagerWindow />} />
          <Route path="/deck-create" element={<DeckCreateWindow />} />
          <Route path="/deck-settings" element={<DeckSettingsWindow />} />
          <Route path="/editor" element={<DeckEditorWindow />} />
          <Route path="/deck-detail" element={<DeckDetailWindow />} />
          <Route path="/day-detail" element={<DayDetailWindow />} />
          <Route path="/study-launcher" element={<StudyLauncherWindow />} />
          <Route path="/study-session" element={<StudySessionWindow />} />
        </Routes>
      </HashRouter>
    </AppStateProvider>
  );
}
