import { useEffect } from "react";
import { HashRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";

import { renderDesktopBuilderRoutes } from "@apps/desktop-builder";
import { renderMobileQuizRoutes } from "@apps/mobile-quiz";
import { AppErrorBoundary } from "@components/AppErrorBoundary";
import { AutomationBridge } from "@components/AutomationBridge";
import { RouteAutomationBridge } from "@components/RouteAutomationBridge";
import { AppStateProvider } from "@state/AppStateContext";

// Reset scroll on every in-app route change so a previous screen's scroll position cannot hide the next screen.
function RouteScrollReset() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [location.pathname, location.search]);

  return null;
}

// Route the shared frontend bundle through desktop-builder and mobile-quiz app boundaries.
export function App() {
  return (
    <AppErrorBoundary>
      <AppStateProvider>
        <HashRouter>
          <RouteScrollReset />
          <AutomationBridge />
          <RouteAutomationBridge />
          <Routes>
            <Route path="/" element={<Navigate to="/manager" replace />} />
            {renderDesktopBuilderRoutes()}
            {renderMobileQuizRoutes()}
          </Routes>
        </HashRouter>
      </AppStateProvider>
    </AppErrorBoundary>
  );
}
