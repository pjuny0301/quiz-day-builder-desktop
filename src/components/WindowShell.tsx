interface WindowShellProps {
  role: string;
  eyebrow: string;
  title: string;
  description: string;
  status?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}


// Return whether the shell should render the top header instead of leaving a large empty panel.
function hasShellHeader(eyebrow: string, title: string, description: string, status?: string, actions?: React.ReactNode): boolean {
  return Boolean(eyebrow || title || description || status || actions);
}


// Wrap each role-specific screen in a visually distinct shell with one emphasized purpose.
export function WindowShell({ role, eyebrow, title, description, status, actions, children }: WindowShellProps) {
  const showHeader = hasShellHeader(eyebrow, title, description, status, actions);

  return (
    <div className={`window-shell window-shell--${role} ${showHeader ? "" : "window-shell--no-header"}`.trim()}>
      {showHeader ? (
        <header className={`window-shell__header ${!eyebrow && !title && !description ? "window-shell__header--compact" : ""}`.trim()}>
          <div className="window-shell__heading">
            {eyebrow ? <p className="window-shell__eyebrow">{eyebrow}</p> : null}
            {title ? <h1 className="window-shell__title">{title}</h1> : null}
            {description ? <p className="window-shell__description">{description}</p> : null}
          </div>
          {status || actions ? (
            <div className="window-shell__aside">
              {status ? <div className="window-shell__status">{status}</div> : null}
              {actions}
            </div>
          ) : null}
        </header>
      ) : null}
      <main className="window-shell__body">{children}</main>
    </div>
  );
}

