from __future__ import annotations

import sys

from PyQt6.QtWidgets import QApplication

from quizdaybuilder.paths import APP_TITLE, DATA_DIR, IMAGE_DIR
from quizdaybuilder.window import MainWindow


# Ensure runtime storage folders exist before the UI starts reading or writing data.
def ensure_runtime_dirs() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    IMAGE_DIR.mkdir(parents=True, exist_ok=True)


# Create the Qt application, open the main window, and enter the event loop.
def main() -> None:
    ensure_runtime_dirs()
    app = QApplication(sys.argv)
    app.setApplicationName(APP_TITLE)
    window = MainWindow()
    window.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
