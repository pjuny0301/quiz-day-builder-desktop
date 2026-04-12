interface WindowShellProps {
  role: string;
  eyebrow: string;
  title: string;
  description: string;
  status?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}


// Wrap each role-specific screen in a visually distinct shell with one emphasized purpose.
export function WindowShell({ role, eyebrow, title, description, status, actions, children }: WindowShellProps) {
  return (
    <div className={`window-shell window-shell--${role}`}>
      <header className="window-shell__header">
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
      <main className="window-shell__body">{children}</main>
    </div>
  );
}
