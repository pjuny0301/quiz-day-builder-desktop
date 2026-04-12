from __future__ import annotations

import json
from pathlib import Path

from .models import AppState


# Read and write the persistent JSON document used by the desktop app.
class JsonStorage:
    def __init__(self, data_file: Path) -> None:
        self.data_file = data_file
        self.data_file.parent.mkdir(parents=True, exist_ok=True)

    # Load the JSON file into application models with graceful recovery on corruption.
    def load(self) -> AppState:
        if not self.data_file.exists():
            state = AppState()
            self.save(state)
            return state
        try:
            loaded = json.loads(self.data_file.read_text(encoding="utf-8"))
        except Exception:
            state = AppState()
            self.save(state)
            return state
        return AppState.from_dict(loaded)

    # Save the current application models back to disk.
    def save(self, state: AppState) -> None:
        self.data_file.write_text(
            json.dumps(state.to_dict(), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
