import { ArrowLeft } from "lucide-react";
import type { ButtonHTMLAttributes, MouseEventHandler, ReactNode } from "react";

interface BackActionButtonProps {
  onClick: MouseEventHandler<HTMLButtonElement>;
  actionId?: string;
  label?: string;
  className?: string;
  children?: ReactNode;
}


// Render one shared back-action button so every previous-flow control uses the same icon-led affordance.
export function BackActionButton({ onClick, actionId, label = "이전", className = "", children }: BackActionButtonProps) {
  const classes = ["button", "button--ghost", "button--back", className].filter(Boolean).join(" ");

  return (
    <button type="button" className={classes} data-action-id={actionId} onClick={onClick}>
      <ArrowLeft size={16} />
      <span>{children ?? label}</span>
    </button>
  );
}
