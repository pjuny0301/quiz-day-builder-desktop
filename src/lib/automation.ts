export interface AutomationCommand {
  actionId: string;
  payload?: Record<string, unknown>;
}

type AutomationHandler = (payload?: Record<string, unknown>) => void | Promise<void>;

const automationHandlers = new Map<string, AutomationHandler>();


// Register one named automation action so an external command can invoke it by stable id.
export function registerAutomationAction(actionId: string, handler: AutomationHandler): () => void {
  automationHandlers.set(actionId, handler);
  return () => {
    const currentHandler = automationHandlers.get(actionId);
    if (currentHandler === handler) {
      automationHandlers.delete(actionId);
    }
  };
}


// Find a visible DOM control by its stable automation id when no custom handler was registered.
function findAutomationElement(actionId: string): HTMLElement | null {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>("[data-action-id]"));
  return candidates.find((element) => element.getAttribute("data-action-id") === actionId) ?? null;
}


// Trigger a named DOM control directly so coordinate-based clicking is unnecessary.
async function clickAutomationElement(actionId: string): Promise<boolean> {
  const element = findAutomationElement(actionId);
  if (!element) {
    return false;
  }

  element.focus();
  element.click();
  return true;
}


// Run a previously registered automation action from the external command bridge.
export async function runAutomationCommand(command: AutomationCommand): Promise<void> {
  const handler = automationHandlers.get(command.actionId);
  if (handler) {
    await handler(command.payload);
    return;
  }

  const clicked = await clickAutomationElement(command.actionId);
  if (clicked) {
    return;
  }

  throw new Error(`등록되지 않은 자동화 액션입니다: ${command.actionId}`);
}
