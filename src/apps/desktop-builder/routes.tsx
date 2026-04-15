import { Route } from "react-router-dom";

import {
  BulkImportWindow,
  DayDetailWindow,
  DeckCreateWindow,
  DeckDetailWindow,
  DeckEditorWindow,
  DeckManagerWindow,
  DeckSettingsWindow,
} from "@features/builder/screens";

// Return only Route elements so the app shell can inline desktop-builder routes directly inside Routes.
export function renderDesktopBuilderRoutes() {
  return (
    <>
      <Route path="/manager" element={<DeckManagerWindow />} />
      <Route path="/deck-create" element={<DeckCreateWindow />} />
      <Route path="/deck-settings" element={<DeckSettingsWindow />} />
      <Route path="/bulk-import" element={<BulkImportWindow />} />
      <Route path="/editor" element={<DeckEditorWindow />} />
      <Route path="/deck-detail" element={<DeckDetailWindow />} />
      <Route path="/day-detail" element={<DayDetailWindow />} />
    </>
  );
}
