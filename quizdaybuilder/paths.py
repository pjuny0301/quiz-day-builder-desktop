from __future__ import annotations

import sys
from pathlib import Path


APP_TITLE = "Quiz Day Builder"


# Resolve the runtime root so both source runs and frozen builds share one storage layout.
def base_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent.parent


BASE_DIR = base_dir()
DATA_DIR = BASE_DIR / "data"
IMAGE_DIR = DATA_DIR / "images"
DATA_FILE = DATA_DIR / "app_data.json"

