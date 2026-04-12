from __future__ import annotations

from collections.abc import Callable

from PyQt6.QtCore import Qt
from PyQt6.QtWidgets import (
    QDialog,
    QDialogButtonBox,
    QFrame,
    QFormLayout,
    QHBoxLayout,
    QLabel,
    QPushButton,
    QScrollArea,
    QSpinBox,
    QVBoxLayout,
    QWidget,
    QLineEdit,
)

from .models import Deck
from .utils import preview_text
from .widgets import DayListCard, MatchListCard, MetricBadge, ResponsiveCardGrid, SurfaceCard


# Build a compact heading block for popup dialogs and detail screens.
def build_dialog_heading(eyebrow: str, title: str, body: str) -> QWidget:
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


# Popup editor that adjusts deck naming, answer delay, and cards-per-day splitting.
class DeckSettingsDialog(QDialog):
    def __init__(self, deck: Deck, parent=None) -> None:
        super().__init__(parent)
        self.deck = deck
        self.setWindowTitle("Deck Settings")
        self.resize(540, 360)

        root = QVBoxLayout(self)
        root.setContentsMargins(24, 24, 24, 24)
        root.setSpacing(18)

        root.addWidget(
            build_dialog_heading(
                "EDIT DECK",
                deck.name,
                "Rename the deck, choose the answer delay, and control how many cards each Day contains.",
            )
        )

        form_card = SurfaceCard("surface")
        form_layout = QFormLayout(form_card)
        form_layout.setContentsMargins(18, 18, 18, 18)
        form_layout.setSpacing(14)

        self.name_edit = QLineEdit(deck.name)
        self.delay_spin = QSpinBox()
        self.delay_spin.setRange(0, 30000)
        self.delay_spin.setSingleStep(100)
        self.delay_spin.setSuffix(" ms")
        self.delay_spin.setValue(deck.delay_ms)

        self.day_size_spin = QSpinBox()
        self.day_size_spin.setRange(1, 9999)
        self.day_size_spin.setValue(deck.day_size or 30)
        self.day_size_spin.valueChanged.connect(self.update_split_preview)

        self.preview_label = QLabel("")
        self.preview_label.setObjectName("SectionBody")
        self.preview_label.setWordWrap(True)

        form_layout.addRow("Deck Name", self.name_edit)
        form_layout.addRow("Answer Delay", self.delay_spin)
        form_layout.addRow("Cards Per Day", self.day_size_spin)
        form_layout.addRow("", self.preview_label)

        buttons = QDialogButtonBox(QDialogButtonBox.StandardButton.Save | QDialogButtonBox.StandardButton.Cancel)
        self.save_button = buttons.button(QDialogButtonBox.StandardButton.Save)
        if self.save_button:
            self.save_button.setText("Save And Split")
            self.save_button.setProperty("variant", "primary")
        cancel_button = buttons.button(QDialogButtonBox.StandardButton.Cancel)
        if cancel_button:
            cancel_button.setProperty("variant", "ghost")
        buttons.accepted.connect(self.accept)
        buttons.rejected.connect(self.reject)

        root.addWidget(form_card)
        root.addWidget(buttons)
        self.update_split_preview()

    # Refresh the split summary so the user can see how many Day buckets will be created.
    def update_split_preview(self) -> None:
        size = max(1, self.day_size_spin.value())
        card_count = len(self.deck.cards)
        day_count = max(1, (card_count + size - 1) // size) if card_count else 0
        self.preview_label.setText(
            f"{card_count} cards with {size} cards per Day will create {day_count} Day buckets."
        )

    # Return the edited popup values after the dialog is accepted.
    def values(self) -> tuple[str, int, int]:
        return self.name_edit.text().strip(), self.delay_spin.value(), self.day_size_spin.value()


# Detail popup that shows large Day cards with recent results and play/open actions.
class DeckDetailDialog(QDialog):
    def __init__(
        self,
        deck: Deck,
        play_day_callback: Callable[[int], None],
        open_day_callback: Callable[[int], None],
        parent=None,
    ) -> None:
        super().__init__(parent)
        self.deck = deck
        self.play_day_callback = play_day_callback
        self.open_day_callback = open_day_callback
        self.setWindowTitle(f"{deck.name} Details")
        self.resize(1180, 780)

        root = QVBoxLayout(self)
        root.setContentsMargins(24, 24, 24, 24)
        root.setSpacing(18)

        header_row = QHBoxLayout()
        header_row.setSpacing(16)
        header_row.addWidget(
            build_dialog_heading(
                "DECK DETAIL",
                deck.name,
                "Each Day stays large and readable. Double-click or use Open to inspect quiz-to-answer matching cards.",
            ),
            1,
        )

        metrics = QHBoxLayout()
        metrics.setSpacing(12)
        metrics.addWidget(MetricBadge("Cards", str(deck.card_count()), "gold"))
        metrics.addWidget(MetricBadge("Days", str(deck.day_count()), "green"))
        metrics.addWidget(MetricBadge("Delay", f"{deck.delay_ms} ms", "blue"))
        header_row.addLayout(metrics)
        root.addLayout(header_row)

        info_label = QLabel("Use Play on a Day card to jump directly into Study. The grid reflows as the window changes size.")
        info_label.setObjectName("SectionBody")
        info_label.setWordWrap(True)
        root.addWidget(info_label)

        self.grid = ResponsiveCardGrid(340)
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setFrameShape(QFrame.Shape.NoFrame)
        scroll.setWidget(self.grid)
        root.addWidget(scroll, 1)

        close_button = QPushButton("Close")
        close_button.setProperty("variant", "primary")
        close_button.clicked.connect(self.accept)
        footer = QHBoxLayout()
        footer.addStretch(1)
        footer.addWidget(close_button)
        root.addLayout(footer)

        self.refresh_cards()

    # Rebuild the large Day cards shown inside the detail popup.
    def refresh_cards(self) -> None:
        cards: list[QWidget] = []
        for bucket in self.deck.days:
            stats = self.deck.day_stats.get(bucket.day)
            recent = f"Recent {stats.last_correct}/{stats.last_total}" if stats and stats.last_total else "Recent -"
            totals = (
                f"Total O {stats.total_correct}  X {stats.total_wrong}"
                if stats
                else "Total O 0  X 0"
            )
            widget = DayListCard(
                bucket.name,
                f"{len(bucket.card_ids)} cards ready to study",
                f"{recent}  |  {totals}",
            )
            widget.play_requested.connect(lambda checked=False, day=bucket.day: self.play_day(day))
            widget.open_requested.connect(lambda checked=False, day=bucket.day: self.open_day(day))
            cards.append(widget)
        if not cards:
            empty_card = SurfaceCard("surface")
            empty_layout = QVBoxLayout(empty_card)
            empty_layout.setContentsMargins(24, 24, 24, 24)
            empty_layout.setSpacing(8)
            empty_layout.addWidget(build_dialog_heading("EMPTY DECK", "No Days Yet", "Add cards to this deck and save them once to generate Day buckets automatically."))
            cards.append(empty_card)
        self.grid.set_widgets(cards)

    # Launch Study for the chosen Day and close the detail popup.
    def play_day(self, day_number: int) -> None:
        self.play_day_callback(day_number)
        self.accept()

    # Open the Day detail popup for the chosen Day and close the current popup.
    def open_day(self, day_number: int) -> None:
        self.accept()
        self.open_day_callback(day_number)


# Detail popup that shows large quiz-to-answer matching cards for one Day.
class DayDetailDialog(QDialog):
    def __init__(self, deck: Deck, day_number: int, play_day_callback: Callable[[int], None], parent=None) -> None:
        super().__init__(parent)
        self.deck = deck
        self.day_number = day_number
        self.play_day_callback = play_day_callback
        self.setWindowTitle(f"{deck.name} - Day {day_number:03d}")
        self.resize(1180, 780)

        root = QVBoxLayout(self)
        root.setContentsMargins(24, 24, 24, 24)
        root.setSpacing(18)

        bucket = next((entry for entry in deck.days if entry.day == day_number), None)
        card_count = len(bucket.card_ids) if bucket else 0
        stats = deck.day_stats.get(day_number)
        recent = f"{stats.last_correct}/{stats.last_total}" if stats and stats.last_total else "-"

        header_row = QHBoxLayout()
        header_row.setSpacing(16)
        header_row.addWidget(
            build_dialog_heading(
                "DAY DETAIL",
                f"Day {day_number:03d}",
                "Quiz and answer pairs stay large so the screen reads like study material instead of a thin list.",
            ),
            1,
        )

        metrics = QHBoxLayout()
        metrics.setSpacing(12)
        metrics.addWidget(MetricBadge("Cards", str(card_count), "gold"))
        metrics.addWidget(MetricBadge("Recent", recent, "blue"))
        header_row.addLayout(metrics)
        root.addLayout(header_row)

        action_row = QHBoxLayout()
        action_row.addStretch(1)
        self.play_button = QPushButton("Play Day")
        self.play_button.setProperty("variant", "accent")
        self.play_button.clicked.connect(self.play_day)
        self.play_button.setEnabled(card_count > 0)
        action_row.addWidget(self.play_button)
        root.addLayout(action_row)

        self.grid = ResponsiveCardGrid(420)
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setFrameShape(QFrame.Shape.NoFrame)
        scroll.setWidget(self.grid)
        root.addWidget(scroll, 1)

        close_button = QPushButton("Close")
        close_button.setProperty("variant", "primary")
        close_button.clicked.connect(self.accept)
        footer = QHBoxLayout()
        footer.addStretch(1)
        footer.addWidget(close_button)
        root.addLayout(footer)

        self.refresh_cards()

    # Rebuild the large quiz-answer cards for the currently selected Day.
    def refresh_cards(self) -> None:
        widgets: list[QWidget] = []
        for card in self.deck.cards_for_day(self.day_number):
            question = preview_text(card.question_html, 180) or "[Image question]"
            answer = preview_text(card.answer_html, 180) or "[Image answer]"
            widget = MatchListCard(question, answer)
            widget.play_button.hide()
            widgets.append(widget)
        if not widgets:
            empty_card = SurfaceCard("surface")
            empty_layout = QVBoxLayout(empty_card)
            empty_layout.setContentsMargins(24, 24, 24, 24)
            empty_layout.setSpacing(8)
            empty_layout.addWidget(build_dialog_heading("EMPTY DAY", "No Cards In This Day", "Change the Day split or add more cards if you want this Day to be study-ready."))
            widgets.append(empty_card)
        self.grid.set_widgets(widgets)

    # Launch Study for this Day and close the detail popup.
    def play_day(self) -> None:
        self.play_day_callback(self.day_number)
        self.accept()
