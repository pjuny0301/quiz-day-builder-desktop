from __future__ import annotations

from PyQt6.QtWidgets import QLabel, QPushButton, QVBoxLayout, QWidget


# Apply a design variant to a button so the shared stylesheet can skin it correctly.
def set_button_variant(button: QPushButton, variant: str) -> None:
    button.setProperty("variant", variant)
    button.style().unpolish(button)
    button.style().polish(button)


# Build a reusable section heading block with eyebrow, title, and supporting body text.
def build_section_heading(eyebrow: str, title: str, body: str) -> QWidget:
    wrapper = QWidget()
    layout = QVBoxLayout(wrapper)
    layout.setContentsMargins(0, 0, 0, 0)
    layout.setSpacing(4)

    eyebrow_label = QLabel(eyebrow)
    eyebrow_label.setObjectName("SectionEyebrow")
    title_label = QLabel(title)
    title_label.setObjectName("SectionTitle")
    body_label = QLabel(body)
    body_label.setObjectName("SectionBody")
    body_label.setWordWrap(True)

    layout.addWidget(eyebrow_label)
    layout.addWidget(title_label)
    layout.addWidget(body_label)
    return wrapper
