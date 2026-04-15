import { Route } from "react-router-dom";

import {
  BulkImportWindow,
  DayDetailWindow,
  DeckCreateWindow,
  DeckDetailWindow,
  DeckEditorWindow,
  DeckManagerWindow,
  DeckSettingsWindow,
} from "./screens";

// Assemble every builder route from the feature boundary so app-level files do not depend on screen filenames.
export function renderBuilderRoutes() {
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
