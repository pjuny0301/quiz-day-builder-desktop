import { Route } from "react-router-dom";

import { StudyLauncherWindow, StudySessionWindow } from "@features/study/screens";

// Return only Route elements so the app shell can inline mobile-quiz routes directly inside Routes.
export function renderMobileQuizRoutes() {
  return (
    <>
      <Route path="/study-launcher" element={<StudyLauncherWindow />} />
      <Route path="/study-session" element={<StudySessionWindow />} />
    </>
  );
}
