import { Route } from "react-router-dom";

import { StudyLauncherWindow, StudySessionWindow } from "./screens";

// Assemble the study routes at the feature boundary so app-level files only import a single public API.
export function renderStudyRoutes() {
  return (
    <>
      <Route path="/study-launcher" element={<StudyLauncherWindow />} />
      <Route path="/study-session" element={<StudySessionWindow />} />
    </>
  );
}
