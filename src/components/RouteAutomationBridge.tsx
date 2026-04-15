import { useEffect } from "react";

import { registerAutomationAction } from "../lib/automation";
import { openRoleWindow } from "../lib/tauri";
import type { StudyMode, WindowQuery, WindowRoute } from "../lib/types";

const VALID_ROUTES: WindowRoute[] = [
  "manager",
  "deck-create",
  "deck-settings",
  "bulk-import",
  "editor",
  "deck-detail",
  "day-detail",
  "study-launcher",
  "study-session",
];

const VALID_MODES: StudyMode[] = ["Short Answer", "Multiple Choice", "Mixed"];

// Register route-level automation so verification scripts can jump to a known screen before deeper actions run.
export function RouteAutomationBridge() {
  useEffect(() => {
    return registerAutomationAction("app.navigate", async (payload) => {
      const route = VALID_ROUTES.includes(payload?.route as WindowRoute)
        ? (payload?.route as WindowRoute)
        : "manager";

      const query: WindowQuery = {
        deckId: typeof payload?.deckId === "string" ? payload.deckId : undefined,
        dayNumber: Number.isFinite(Number(payload?.dayNumber)) ? Number(payload?.dayNumber) : undefined,
        mode: VALID_MODES.includes(payload?.mode as StudyMode) ? (payload?.mode as StudyMode) : undefined,
        scope: payload?.scope === "day" || payload?.scope === "all" ? payload.scope : undefined,
        draft: payload?.draft === true,
      };

      await openRoleWindow(route, query, { replace: payload?.replace === true });
    });
  }, []);

  return null;
}
