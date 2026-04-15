import { Component, type ErrorInfo, type ReactNode } from "react";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  errorMessage: string;
}


// Catch unexpected render failures so the app never collapses into a blank white window.
export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    errorMessage: "",
  };

  // Convert a thrown render error into a visible fallback state for the user.
  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      errorMessage: error.message || String(error),
    };
  }

  // Keep a console trace for debugging while the UI shows a readable fallback screen.
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("App render failure", error, errorInfo);
  }

  // Render either the normal app tree or the fallback error shell.
  render() {
    if (!this.state.errorMessage) {
      return this.props.children;
    }

    return (
      <div className="app-crash-shell">
        <div className="app-crash-shell__panel">
          <p className="window-shell__eyebrow">오류</p>
          <h1 className="window-shell__title">화면을 열지 못했습니다</h1>
          <p className="window-shell__description">빈 화면으로 두지 않고 오류를 직접 보여줍니다.</p>
          <pre className="app-crash-shell__message">{this.state.errorMessage}</pre>
        </div>
      </div>
    );
  }
}
