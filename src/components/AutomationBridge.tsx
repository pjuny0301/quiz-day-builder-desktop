import { useEffect } from "react";

import { runAutomationCommand, type AutomationCommand } from "../lib/automation";
import { pollAutomationCommand } from "../lib/tauri";


// Poll the desktop automation command file so child processes can drive named UI actions without screen coordinates.
export function AutomationBridge() {
  useEffect(() => {
    let disposed = false;
    let pending = false;

    // Fetch and execute the next queued automation command when one exists.
    async function tick() {
      if (disposed || pending) {
        return;
      }

      pending = true;
      try {
        const command = await pollAutomationCommand();
        if (command) {
          await runAutomationCommand(command as AutomationCommand);
        }
      } catch (error) {
        console.error("automation command failed", error);
      } finally {
        pending = false;
      }
    }

    const intervalId = window.setInterval(() => {
      void tick();
    }, 350);
    void tick();

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
    };
  }, []);

  return null;
}
