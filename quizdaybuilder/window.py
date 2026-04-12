from __future__ import annotations

import random

from PyQt6.QtCore import QSize, Qt, QTimer
from PyQt6.QtWidgets import (
    QApplication,
    QComboBox,
    QGridLayout,
    QHBoxLayout,
    QHeaderView,
    QInputDialog,
    QLabel,
    QLineEdit,
    QListWidget,
    QListWidgetItem,
    QMainWindow,
    QMessageBox,
    QProgressBar,
    QPushButton,
    QSplitter,
    QStackedWidget,
    QTableWidget,
    QTableWidgetItem,
    QTabWidget,
    QTextEdit,
    QVBoxLayout,
    QWidget,
)

from .dialogs import DayDetailDialog, DeckDetailDialog, DeckSettingsDialog
from .models import Card, Deck, SessionState
from .paths import APP_TITLE, DATA_FILE, IMAGE_DIR
from .storage import JsonStorage
from .theme import apply_app_font, build_stylesheet
from .utils import build_choices, html_to_plain, normalize_text, parse_bulk_cards, plain_to_html, preview_text
from .widgets import (
    DeckListCard,
    FeedbackOverlay,
    HtmlCardBrowser,
    ImageTextEdit,
    MetricBadge,
    SurfaceCard,
    enable_smooth_scrolling,
)


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


# Main application window that coordinates deck management, detail screens, and study sessions.
class MainWindow(QMainWindow):
    def __init__(self) -> None:
        super().__init__()
        self.storage = JsonStorage(DATA_FILE)
        self.state = self.storage.load()
        self.session = SessionState()

        self.current_deck_id: str | None = None
        self.current_card_id: str | None = None

        self.setWindowTitle(APP_TITLE)
        self.resize(1520, 980)
        self.build_ui()
        self.apply_theme()
        self.refresh_all_views()

    # Create the top-level shell, product hero, and the two major work surfaces.
    def build_ui(self) -> None:
        self.setObjectName("MainWindow")
        central = QWidget()
        self.setCentralWidget(central)
        root = QVBoxLayout(central)
        root.setContentsMargins(24, 24, 24, 24)
        root.setSpacing(18)

        hero = SurfaceCard("hero")
        hero_layout = QVBoxLayout(hero)
        hero_layout.setContentsMargins(28, 24, 28, 24)
        hero_layout.setSpacing(6)

        title = QLabel(APP_TITLE)
        title.setObjectName("HeroTitle")
        subtitle = QLabel(
            "README-first deck management with smooth Deck cards, large Day detail views, desktop Study, autosave, and image paste."
        )
        subtitle.setObjectName("HeroSubtitle")
        subtitle.setWordWrap(True)

        self.storage_label = QLabel("")
        self.storage_label.setObjectName("HeroSubtitle")
        self.storage_label.setWordWrap(True)

        hero_layout.addWidget(title)
        hero_layout.addWidget(subtitle)
        hero_layout.addWidget(self.storage_label)
        root.addWidget(hero)

        self.tabs = QTabWidget()
        self.tabs.setDocumentMode(True)
        self.deck_tab = QWidget()
        self.study_tab = QWidget()
        self.tabs.addTab(self.deck_tab, "Deck Manager")
        self.tabs.addTab(self.study_tab, "Study")
        root.addWidget(self.tabs, 1)

        self.build_deck_tab()
        self.build_study_tab()

    # Apply fonts and the shared visual theme after the widget tree exists.
    def apply_theme(self) -> None:
        primary_font, display_font = apply_app_font(QApplication.instance())
        self.setStyleSheet(build_stylesheet(primary_font, display_font))

    # Build the README-style Deck Manager with a custom left rail and a roomy editing workspace.
    def build_deck_tab(self) -> None:
        layout = QVBoxLayout(self.deck_tab)
        layout.setContentsMargins(0, 0, 0, 0)

        splitter = QSplitter(Qt.Orientation.Horizontal)
        splitter.setChildrenCollapsible(False)
        splitter.setHandleWidth(10)
        layout.addWidget(splitter, 1)

        sidebar = SurfaceCard("sidebar")
        sidebar_layout = QVBoxLayout(sidebar)
        sidebar_layout.setContentsMargins(22, 22, 22, 22)
        sidebar_layout.setSpacing(16)

        sidebar_title = QLabel("Deck Manager")
        sidebar_title.setObjectName("SidebarTitle")
        sidebar_subtitle = QLabel(
            "Double-click a deck name to rename it, use the edit popup for delay and split settings, and open large Day views from here."
        )
        sidebar_subtitle.setObjectName("SidebarSubtitle")
        sidebar_subtitle.setWordWrap(True)

        self.deck_list = QListWidget()
        self.deck_list.itemSelectionChanged.connect(self.on_deck_list_changed)
        enable_smooth_scrolling(self.deck_list)

        button_row = QHBoxLayout()
        button_row.setSpacing(10)
        self.new_deck_button = QPushButton("New Deck")
        self.open_deck_button = QPushButton("Open Detail")
        self.new_deck_button.clicked.connect(self.create_deck)
        self.open_deck_button.clicked.connect(self.open_deck_detail)
        set_button_variant(self.new_deck_button, "ghost")
        set_button_variant(self.open_deck_button, "ghost")
        button_row.addWidget(self.new_deck_button)
        button_row.addWidget(self.open_deck_button)

        metric_row = QHBoxLayout()
        metric_row.setSpacing(10)
        self.total_decks_badge = MetricBadge("Decks", "0", "blue")
        self.total_cards_badge = MetricBadge("Cards", "0", "gold")
        self.total_days_badge = MetricBadge("Days", "0", "green")
        metric_row.addWidget(self.total_decks_badge)
        metric_row.addWidget(self.total_cards_badge)
        metric_row.addWidget(self.total_days_badge)

        autosave_label = QLabel("Every change is written straight to disk, including card edits, imports, split changes, and study results.")
        autosave_label.setObjectName("SidebarSubtitle")
        autosave_label.setWordWrap(True)

        sidebar_layout.addWidget(sidebar_title)
        sidebar_layout.addWidget(sidebar_subtitle)
        sidebar_layout.addWidget(self.deck_list, 1)
        sidebar_layout.addLayout(button_row)
        sidebar_layout.addLayout(metric_row)
        sidebar_layout.addWidget(autosave_label)
        splitter.addWidget(sidebar)

        workspace = QWidget()
        workspace_layout = QVBoxLayout(workspace)
        workspace_layout.setContentsMargins(0, 0, 0, 0)
        workspace_layout.setSpacing(16)

        workspace_header = SurfaceCard("surface")
        workspace_header_layout = QVBoxLayout(workspace_header)
        workspace_header_layout.setContentsMargins(24, 22, 24, 22)
        workspace_header_layout.setSpacing(16)

        header_row = QHBoxLayout()
        header_row.setSpacing(16)
        header_row.addWidget(
            build_section_heading(
                "DESKTOP WORKSPACE",
                "Deck Studio",
                "Select one deck from the left rail, then edit cards on the right without crowding the screen.",
            ),
            1,
        )

        header_actions = QHBoxLayout()
        header_actions.setSpacing(10)
        self.deck_settings_button = QPushButton("Deck Settings")
        self.deck_detail_button = QPushButton("Deck Detail")
        self.deck_settings_button.clicked.connect(self.open_deck_settings)
        self.deck_detail_button.clicked.connect(self.open_deck_detail)
        set_button_variant(self.deck_settings_button, "primary")
        set_button_variant(self.deck_detail_button, "ghost")
        header_actions.addWidget(self.deck_settings_button)
        header_actions.addWidget(self.deck_detail_button)
        header_row.addLayout(header_actions)

        self.active_deck_title = QLabel("Select or create a deck")
        self.active_deck_title.setObjectName("SectionTitle")
        self.active_deck_meta = QLabel("Deck details will appear here once a deck is selected.")
        self.active_deck_meta.setObjectName("SectionBody")
        self.active_deck_meta.setWordWrap(True)

        header_metrics = QHBoxLayout()
        header_metrics.setSpacing(12)
        self.active_cards_badge = MetricBadge("Cards", "0", "gold")
        self.active_days_badge = MetricBadge("Days", "0", "green")
        self.active_delay_badge = MetricBadge("Delay", "0 ms", "blue")
        self.active_split_badge = MetricBadge("Cards/Day", "0", "rose")
        header_metrics.addWidget(self.active_cards_badge)
        header_metrics.addWidget(self.active_days_badge)
        header_metrics.addWidget(self.active_delay_badge)
        header_metrics.addWidget(self.active_split_badge)

        workspace_header_layout.addLayout(header_row)
        workspace_header_layout.addWidget(self.active_deck_title)
        workspace_header_layout.addWidget(self.active_deck_meta)
        workspace_header_layout.addLayout(header_metrics)
        workspace_layout.addWidget(workspace_header)

        workspace_splitter = QSplitter(Qt.Orientation.Vertical)
        workspace_splitter.setChildrenCollapsible(False)
        workspace_splitter.setHandleWidth(10)

        table_card = SurfaceCard("surface")
        table_layout = QVBoxLayout(table_card)
        table_layout.setContentsMargins(20, 18, 20, 20)
        table_layout.setSpacing(14)
        table_layout.addWidget(
            build_section_heading(
                "CARD TABLE",
                "Deck Contents",
                "Questions and answers stay stored separately and render as quick previews here.",
            )
        )

        self.card_table = QTableWidget(0, 3)
        self.card_table.setHorizontalHeaderLabels(["#", "Question Preview", "Answer Preview"])
        self.card_table.horizontalHeader().setSectionResizeMode(0, QHeaderView.ResizeMode.ResizeToContents)
        self.card_table.horizontalHeader().setSectionResizeMode(1, QHeaderView.ResizeMode.Stretch)
        self.card_table.horizontalHeader().setSectionResizeMode(2, QHeaderView.ResizeMode.Stretch)
        self.card_table.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
        self.card_table.setEditTriggers(QTableWidget.EditTrigger.NoEditTriggers)
        self.card_table.itemSelectionChanged.connect(self.load_selected_card)
        table_layout.addWidget(self.card_table, 1)
        workspace_splitter.addWidget(table_card)

        studio_card = SurfaceCard("surface")
        studio_layout = QVBoxLayout(studio_card)
        studio_layout.setContentsMargins(20, 18, 20, 20)
        studio_layout.setSpacing(14)
        studio_tabs = QTabWidget()

        editor_tab = QWidget()
        editor_layout = QVBoxLayout(editor_tab)
        editor_layout.setContentsMargins(6, 6, 6, 6)
        editor_layout.setSpacing(16)
        editor_layout.addWidget(
            build_section_heading(
                "CARD STUDIO",
                "Question and Answer",
                "Paste images into either side with Ctrl+V. Each pasted asset is copied into the app data folder automatically.",
            )
        )

        editor_splitter = QSplitter(Qt.Orientation.Horizontal)
        editor_splitter.setChildrenCollapsible(False)

        question_card = SurfaceCard("soft-surface")
        question_layout = QVBoxLayout(question_card)
        question_layout.setContentsMargins(16, 16, 16, 16)
        question_layout.setSpacing(10)
        question_label = QLabel("Question")
        question_label.setObjectName("SectionTitle")
        self.question_edit = ImageTextEdit(IMAGE_DIR)
        self.question_edit.setPlaceholderText("Write the quiz prompt here. You can paste text or images.")
        question_layout.addWidget(question_label)
        question_layout.addWidget(self.question_edit, 1)

        answer_card = SurfaceCard("soft-surface")
        answer_layout = QVBoxLayout(answer_card)
        answer_layout.setContentsMargins(16, 16, 16, 16)
        answer_layout.setSpacing(10)
        answer_label = QLabel("Answer")
        answer_label.setObjectName("SectionTitle")
        self.answer_edit = ImageTextEdit(IMAGE_DIR)
        self.answer_edit.setPlaceholderText("Write the answer here. Text and image answers both persist.")
        answer_layout.addWidget(answer_label)
        answer_layout.addWidget(self.answer_edit, 1)

        editor_splitter.addWidget(question_card)
        editor_splitter.addWidget(answer_card)

        editor_actions = QHBoxLayout()
        editor_actions.addStretch(1)
        self.clear_card_button = QPushButton("Clear")
        self.remove_card_button = QPushButton("Remove Selected")
        self.save_card_button = QPushButton("Save Card")
        self.clear_card_button.clicked.connect(self.clear_card_form)
        self.remove_card_button.clicked.connect(self.remove_selected_card)
        self.save_card_button.clicked.connect(self.save_card)
        set_button_variant(self.save_card_button, "primary")
        editor_actions.addWidget(self.clear_card_button)
        editor_actions.addWidget(self.remove_card_button)
        editor_actions.addWidget(self.save_card_button)

        editor_layout.addWidget(editor_splitter, 1)
        editor_layout.addLayout(editor_actions)

        import_tab = QWidget()
        import_layout = QVBoxLayout(import_tab)
        import_layout.setContentsMargins(10, 10, 10, 10)
        import_layout.setSpacing(14)
        import_layout.addWidget(
            build_section_heading(
                "BULK IMPORT",
                "Paste Many Cards",
                "One card per line. Supported separators are TAB, |, and ::.",
            )
        )
        self.bulk_edit = QTextEdit()
        self.bulk_edit.setPlaceholderText("Example: capital of France\tParis")
        self.bulk_import_button = QPushButton("Import Cards")
        self.bulk_import_button.clicked.connect(self.import_cards)
        set_button_variant(self.bulk_import_button, "primary")
        import_layout.addWidget(self.bulk_edit, 1)
        import_layout.addWidget(self.bulk_import_button, 0, Qt.AlignmentFlag.AlignRight)

        studio_tabs.addTab(editor_tab, "Card Studio")
        studio_tabs.addTab(import_tab, "Bulk Import")
        studio_layout.addWidget(studio_tabs)
        workspace_splitter.addWidget(studio_card)

        workspace_splitter.setSizes([420, 390])
        workspace_layout.addWidget(workspace_splitter, 1)
        splitter.addWidget(workspace)
        splitter.setSizes([360, 1160])

    # Build the desktop Study screen with a large question surface and a right-side control column.
    def build_study_tab(self) -> None:
        layout = QVBoxLayout(self.study_tab)
        layout.setContentsMargins(0, 0, 0, 0)

        splitter = QSplitter(Qt.Orientation.Horizontal)
        splitter.setChildrenCollapsible(False)
        splitter.setHandleWidth(10)
        layout.addWidget(splitter, 1)

        self.study_surface = SurfaceCard("surface")
        study_layout = QVBoxLayout(self.study_surface)
        study_layout.setContentsMargins(24, 24, 24, 24)
        study_layout.setSpacing(16)

        study_header = QHBoxLayout()
        study_header.setSpacing(12)
        title_block = QVBoxLayout()
        title_block.setSpacing(4)
        self.study_deck_label = QLabel("No deck selected")
        self.study_deck_label.setObjectName("SectionTitle")
        self.study_mode_label = QLabel("Ready")
        self.study_mode_label.setObjectName("StudyModeLabel")
        self.study_context_label = QLabel("Choose a deck and a Day from the control panel.")
        self.study_context_label.setObjectName("SectionBody")
        self.study_context_label.setWordWrap(True)
        title_block.addWidget(self.study_deck_label)
        title_block.addWidget(self.study_mode_label)
        title_block.addWidget(self.study_context_label)
        study_header.addLayout(title_block, 1)

        self.progress_label = QLabel("Ready")
        self.progress_label.setObjectName("SectionBody")
        study_header.addWidget(self.progress_label, 0, Qt.AlignmentFlag.AlignTop)

        self.progress_bar = QProgressBar()
        self.progress_bar.setRange(0, 100)
        self.progress_bar.setValue(0)

        question_card = SurfaceCard("question-card")
        question_layout = QVBoxLayout(question_card)
        question_layout.setContentsMargins(22, 22, 22, 22)
        question_layout.setSpacing(12)
        question_layout.addWidget(
            build_section_heading(
                "QUESTION",
                "Current Card",
                "Study stays in a desktop layout again, with large type and a wide content area that grows with the window.",
            )
        )
        self.question_browser = HtmlCardBrowser()
        self.question_browser.setMinimumHeight(320)
        question_layout.addWidget(self.question_browser, 1)

        answer_card = SurfaceCard("soft-surface")
        answer_layout = QVBoxLayout(answer_card)
        answer_layout.setContentsMargins(20, 20, 20, 20)
        answer_layout.setSpacing(12)
        answer_layout.addWidget(
            build_section_heading(
                "ANSWER",
                "Solve The Card",
                "Use short answer or multiple choice depending on the selected study mode.",
            )
        )
        self.answer_stack = QStackedWidget()
        self.answer_stack.addWidget(self.build_short_answer_page())
        self.answer_stack.addWidget(self.build_multiple_choice_page())
        answer_layout.addWidget(self.answer_stack)

        study_layout.addLayout(study_header)
        study_layout.addWidget(self.progress_bar)
        study_layout.addWidget(question_card, 1)
        study_layout.addWidget(answer_card)

        self.feedback_overlay = FeedbackOverlay(self.study_surface)
        splitter.addWidget(self.study_surface)

        control_panel = SurfaceCard("soft-surface")
        control_layout = QVBoxLayout(control_panel)
        control_layout.setContentsMargins(22, 22, 22, 22)
        control_layout.setSpacing(16)

        control_layout.addWidget(
            build_section_heading(
                "STUDY SETUP",
                "Session Controls",
                "Pick a deck, choose a Day if needed, select the question type, and start from here.",
            )
        )

        controls_grid = QGridLayout()
        controls_grid.setHorizontalSpacing(12)
        controls_grid.setVerticalSpacing(12)
        self.study_deck_combo = QComboBox()
        self.study_day_combo = QComboBox()
        self.study_mode_combo = QComboBox()
        self.study_mode_combo.addItems(["Short Answer", "Multiple Choice", "Mixed"])
        self.study_deck_combo.currentIndexChanged.connect(self.on_study_deck_changed)
        self.study_day_combo.currentIndexChanged.connect(self.refresh_study_insights)
        self.study_mode_combo.currentIndexChanged.connect(self.refresh_study_insights)
        self.start_button = QPushButton("Start Session")
        self.start_button.clicked.connect(self.start_session)
        set_button_variant(self.start_button, "accent")

        controls_grid.addWidget(QLabel("Deck"), 0, 0)
        controls_grid.addWidget(self.study_deck_combo, 0, 1)
        controls_grid.addWidget(QLabel("Day"), 1, 0)
        controls_grid.addWidget(self.study_day_combo, 1, 1)
        controls_grid.addWidget(QLabel("Mode"), 2, 0)
        controls_grid.addWidget(self.study_mode_combo, 2, 1)
        controls_grid.addWidget(self.start_button, 3, 0, 1, 2)
        control_layout.addLayout(controls_grid)

        badge_grid = QGridLayout()
        badge_grid.setHorizontalSpacing(12)
        badge_grid.setVerticalSpacing(12)
        self.day_badge = MetricBadge("Selected Day", "-", "green")
        self.correct_badge = MetricBadge("Correct", "0", "blue")
        self.wrong_badge = MetricBadge("Wrong", "0", "rose")
        self.recent_badge = MetricBadge("Recent", "-", "gold")
        badge_grid.addWidget(self.day_badge, 0, 0)
        badge_grid.addWidget(self.recent_badge, 0, 1)
        badge_grid.addWidget(self.correct_badge, 1, 0)
        badge_grid.addWidget(self.wrong_badge, 1, 1)
        control_layout.addLayout(badge_grid)

        history_card = SurfaceCard("surface")
        history_layout = QVBoxLayout(history_card)
        history_layout.setContentsMargins(18, 18, 18, 18)
        history_layout.setSpacing(10)
        history_layout.addWidget(
            build_section_heading(
                "DAY HISTORY",
                "Recent Results",
                "The selected Day shows the most recent score and cumulative correct or wrong counts here.",
            )
        )
        self.history_label = QLabel("Choose a deck to see Day history.")
        self.history_label.setObjectName("SectionBody")
        self.history_label.setWordWrap(True)
        history_layout.addWidget(self.history_label)

        self.restart_button = QPushButton("Restart Day")
        self.restart_button.clicked.connect(self.restart_session)
        self.restart_button.hide()
        set_button_variant(self.restart_button, "primary")

        control_layout.addWidget(history_card)
        control_layout.addWidget(self.restart_button)
        control_layout.addStretch(1)
        splitter.addWidget(control_panel)
        splitter.setSizes([1080, 420])

    # Build the short-answer page used when the session expects typed answers.
    def build_short_answer_page(self) -> QWidget:
        page = QWidget()
        layout = QVBoxLayout(page)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(12)

        self.answer_input = QLineEdit()
        self.answer_input.setPlaceholderText("Type the answer and press Enter")
        self.answer_input.returnPressed.connect(self.submit_typed_answer)

        self.submit_button = QPushButton("Submit Answer")
        self.submit_button.clicked.connect(self.submit_typed_answer)
        set_button_variant(self.submit_button, "accent")

        layout.addWidget(self.answer_input)
        layout.addWidget(self.submit_button, 0, Qt.AlignmentFlag.AlignRight)
        return page

    # Build the multiple-choice page with large answer buttons that stay readable.
    def build_multiple_choice_page(self) -> QWidget:
        page = QWidget()
        layout = QVBoxLayout(page)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(12)

        self.choice_buttons: list[QPushButton] = []
        for _ in range(4):
            button = QPushButton("-")
            button.clicked.connect(lambda _checked=False, current=button: self.submit_choice_answer(current))
            set_button_variant(button, "choice")
            self.choice_buttons.append(button)
            layout.addWidget(button)
        return page

    # Keep the large feedback overlay aligned with the desktop Study surface after resizes.
    def resizeEvent(self, event) -> None:
        super().resizeEvent(event)
        self.resize_feedback_overlay()

    # Recompute the feedback overlay geometry whenever the Study surface changes size.
    def resize_feedback_overlay(self) -> None:
        if not hasattr(self, "feedback_overlay"):
            return
        margin_x = 56
        margin_y = 56
        self.feedback_overlay.setGeometry(
            margin_x,
            margin_y,
            max(240, self.study_surface.width() - (margin_x * 2)),
            max(220, self.study_surface.height() - (margin_y * 2)),
        )

    # Persist the current in-memory state to the JSON store.
    def save_state(self) -> None:
        self.storage.save(self.state)

    # Return the deck currently selected in the management rail.
    def active_deck(self) -> Deck | None:
        return self.state.get_deck(self.current_deck_id)

    # Return the deck currently selected in the Study setup controls.
    def selected_study_deck(self) -> Deck | None:
        return self.state.get_deck(self.current_combo_data(self.study_deck_combo))

    # Read a combo-box itemData value safely.
    def current_combo_data(self, combo: QComboBox) -> str | int | None:
        index = combo.currentIndex()
        if index < 0:
            return None
        return combo.itemData(index)

    # Set a combo-box selection by itemData while preserving a graceful fallback.
    def set_combo_selection(self, combo: QComboBox, target_value: str | int | None) -> None:
        if combo.count() == 0:
            return
        if target_value is None:
            combo.setCurrentIndex(0)
            return
        for index in range(combo.count()):
            if combo.itemData(index) == target_value:
                combo.setCurrentIndex(index)
                return
        combo.setCurrentIndex(0)

    # Rebuild the visible application state after a structural change such as save, delete, or split.
    def refresh_all_views(self) -> None:
        self.storage_label.setText(f"Autosave file: {DATA_FILE}")
        self.refresh_deck_list()
        self.refresh_deck_workspace()
        self.refresh_study_controls()

    # Build the one-line subtitle used inside each custom Deck card.
    def describe_deck(self, deck: Deck) -> str:
        studied_days = [stats for stats in deck.day_stats.values() if stats.last_total]
        recent = f"Recent {studied_days[-1].last_correct}/{studied_days[-1].last_total}" if studied_days else "Recent -"
        return f"{deck.card_count()} cards  |  {deck.day_count()} days  |  {recent}  |  Delay {deck.delay_ms} ms"

    # Rebuild the management-side Deck list using custom card widgets.
    def refresh_deck_list(self) -> None:
        self.deck_list.blockSignals(True)
        self.deck_list.clear()

        total_cards = 0
        total_days = 0
        for deck in self.state.decks:
            total_cards += deck.card_count()
            total_days += deck.day_count()

            item = QListWidgetItem()
            item.setData(Qt.ItemDataRole.UserRole, deck.id)
            item.setSizeHint(QSize(0, 118))
            self.deck_list.addItem(item)

            widget = DeckListCard(deck.name, self.describe_deck(deck))
            widget.clicked.connect(lambda deck_id=deck.id: self.select_deck(deck_id))
            widget.rename_requested.connect(lambda name, deck_id=deck.id: self.rename_deck(deck_id, name))
            widget.edit_requested.connect(lambda deck_id=deck.id: self.open_deck_settings(deck_id))
            widget.delete_requested.connect(lambda deck_id=deck.id: self.delete_deck(deck_id))
            widget.open_requested.connect(lambda deck_id=deck.id: self.open_deck_detail(deck_id))
            self.deck_list.setItemWidget(item, widget)

        self.deck_list.blockSignals(False)

        self.total_decks_badge.set_value(str(len(self.state.decks)))
        self.total_cards_badge.set_value(str(total_cards))
        self.total_days_badge.set_value(str(total_days))

        if self.current_deck_id and not self.state.get_deck(self.current_deck_id):
            self.current_deck_id = None
        if not self.current_deck_id and self.state.decks:
            self.current_deck_id = self.state.decks[0].id

        self.select_deck(self.current_deck_id, trigger_refresh=False)
        self.sync_deck_card_selection_styles()

    # Update the visual selected state for each custom Deck card widget.
    def sync_deck_card_selection_styles(self) -> None:
        for index in range(self.deck_list.count()):
            item = self.deck_list.item(index)
            widget = self.deck_list.itemWidget(item)
            if not isinstance(widget, DeckListCard):
                continue
            is_selected = item.data(Qt.ItemDataRole.UserRole) == self.current_deck_id
            widget.setProperty("selected", "true" if is_selected else "false")
            widget.style().unpolish(widget)
            widget.style().polish(widget)

    # Programmatically select a Deck by id and keep the right workspace in sync.
    def select_deck(self, deck_id: str | None, trigger_refresh: bool = True) -> None:
        self.current_deck_id = deck_id
        matched_index = -1
        for index in range(self.deck_list.count()):
            item = self.deck_list.item(index)
            if item.data(Qt.ItemDataRole.UserRole) == deck_id:
                matched_index = index
                break

        self.deck_list.blockSignals(True)
        if matched_index >= 0:
            self.deck_list.setCurrentRow(matched_index)
        else:
            self.deck_list.clearSelection()
        self.deck_list.blockSignals(False)

        self.sync_deck_card_selection_styles()
        if trigger_refresh:
            self.refresh_deck_workspace()
            self.refresh_study_controls()

    # React to left-rail selection changes coming from the QListWidget itself.
    def on_deck_list_changed(self) -> None:
        current_item = self.deck_list.currentItem()
        self.current_deck_id = current_item.data(Qt.ItemDataRole.UserRole) if current_item else None
        self.sync_deck_card_selection_styles()
        self.refresh_deck_workspace()
        self.refresh_study_controls()

    # Refresh the right-hand editing workspace using the currently selected Deck.
    def refresh_deck_workspace(self) -> None:
        deck = self.active_deck()
        self.card_table.setRowCount(0)
        self.clear_card_form()

        has_deck = deck is not None
        self.open_deck_button.setEnabled(has_deck)
        self.deck_settings_button.setEnabled(has_deck)
        self.deck_detail_button.setEnabled(has_deck)

        if not deck:
            self.active_deck_title.setText("Select or create a deck")
            self.active_deck_meta.setText("The selected Deck will show card count, Day split, delay, and editing actions here.")
            self.active_cards_badge.set_value("0")
            self.active_days_badge.set_value("0")
            self.active_delay_badge.set_value(f"{self.state.settings.delay_ms} ms")
            self.active_split_badge.set_value(str(self.state.settings.default_day_size))
            return

        self.active_deck_title.setText(deck.name)
        self.active_deck_meta.setText(
            f"{deck.card_count()} cards currently split into {deck.day_count()} Day buckets. "
            f"Use Deck Settings for rename, delay, and split changes."
        )
        self.active_cards_badge.set_value(str(deck.card_count()))
        self.active_days_badge.set_value(str(deck.day_count()))
        self.active_delay_badge.set_value(f"{deck.delay_ms} ms")
        self.active_split_badge.set_value(str(deck.day_size))

        self.card_table.setRowCount(len(deck.cards))
        for row, card in enumerate(deck.cards):
            number_item = QTableWidgetItem(str(row + 1))
            number_item.setData(Qt.ItemDataRole.UserRole, card.id)
            question_item = QTableWidgetItem(preview_text(card.question_html))
            answer_item = QTableWidgetItem(preview_text(card.answer_html))
            self.card_table.setItem(row, 0, number_item)
            self.card_table.setItem(row, 1, question_item)
            self.card_table.setItem(row, 2, answer_item)

    # Format the Day label used in combos and other compact selectors.
    def format_day_label(self, deck: Deck, day_number: int) -> str:
        bucket = next((day for day in deck.days if day.day == day_number), None)
        if not bucket:
            return f"Day {day_number:03d}"
        stats = deck.day_stats.get(day_number)
        recent = f"Recent {stats.last_correct}/{stats.last_total}" if stats and stats.last_total else "Recent -"
        return f"{bucket.name}  |  {len(bucket.card_ids)} cards  |  {recent}"

    # Build the history paragraph for the currently selected Day.
    def format_day_history(self, deck: Deck, day_number: int | None) -> str:
        if day_number is None:
            return "All Cards is selected. Pick a specific Day to see recent and cumulative Day history."
        stats = deck.day_stats.get(day_number)
        if stats and stats.last_total:
            return (
                f"Day {day_number:03d} most recently scored {stats.last_correct}/{stats.last_total} in {stats.last_mode or 'Unknown'} mode. "
                f"Cumulative totals are O {stats.total_correct} and X {stats.total_wrong}."
            )
        return f"Day {day_number:03d} has no recorded study history yet."

    # Create a new Deck and switch focus to it immediately.
    def create_deck(self) -> None:
        name, accepted = QInputDialog.getText(self, "Create Deck", "Deck name")
        if not accepted or not name.strip():
            return
        deck = Deck(
            name=name.strip(),
            day_size=self.state.settings.default_day_size,
            delay_ms=self.state.settings.delay_ms,
        )
        self.state.decks.append(deck)
        self.current_deck_id = deck.id
        self.save_state()
        self.refresh_all_views()

    # Rename a Deck either from the inline title editor or from a popup input.
    def rename_deck(self, deck_id: str | None = None, new_name: str | None = None) -> None:
        deck = self.state.get_deck(deck_id or self.current_deck_id)
        if not deck:
            return

        candidate_name = new_name
        if candidate_name is None:
            candidate_name, accepted = QInputDialog.getText(self, "Rename Deck", "Deck name", text=deck.name)
            if not accepted:
                return

        if not candidate_name or not candidate_name.strip():
            return

        deck.name = candidate_name.strip()
        self.save_state()
        self.refresh_all_views()

    # Open the Deck settings popup used for renaming, delay, and Day splitting.
    def open_deck_settings(self, deck_id: str | None = None) -> None:
        deck = self.state.get_deck(deck_id or self.current_deck_id)
        if not deck:
            return

        self.select_deck(deck.id)
        dialog = DeckSettingsDialog(deck, self)
        if dialog.exec() != dialog.DialogCode.Accepted:
            return

        name, delay_ms, day_size = dialog.values()
        if not name:
            QMessageBox.warning(self, "Invalid Name", "Deck name cannot be empty.")
            return

        deck.name = name
        deck.delay_ms = delay_ms
        deck.day_size = day_size
        deck.rebuild_days()
        self.state.settings.delay_ms = delay_ms
        self.state.settings.default_day_size = day_size
        self.save_state()
        self.refresh_all_views()

    # Open the large Day-card detail popup for the selected Deck.
    def open_deck_detail(self, deck_id: str | None = None) -> None:
        deck = self.state.get_deck(deck_id or self.current_deck_id)
        if not deck:
            return

        self.select_deck(deck.id)
        dialog = DeckDetailDialog(
            deck,
            play_day_callback=lambda day_number, current_deck=deck.id: self.launch_study(current_deck, day_number),
            open_day_callback=lambda day_number, current_deck=deck.id: self.open_day_detail(current_deck, day_number),
            parent=self,
        )
        dialog.exec()

    # Open the large quiz-to-answer detail popup for one specific Day.
    def open_day_detail(self, deck_id: str, day_number: int) -> None:
        deck = self.state.get_deck(deck_id)
        if not deck:
            return

        self.select_deck(deck.id)
        dialog = DayDetailDialog(
            deck,
            day_number,
            play_day_callback=lambda chosen_day, current_deck=deck.id: self.launch_study(current_deck, chosen_day),
            parent=self,
        )
        dialog.exec()

    # Delete a Deck after confirmation and move selection to another Deck if one remains.
    def delete_deck(self, deck_id: str | None = None) -> None:
        deck = self.state.get_deck(deck_id or self.current_deck_id)
        if not deck:
            return

        choice = QMessageBox.question(
            self,
            "Delete Deck",
            f"Delete '{deck.name}' and all of its cards?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
        )
        if choice != QMessageBox.StandardButton.Yes:
            return

        self.state.delete_deck(deck.id)
        self.current_deck_id = self.state.decks[0].id if self.state.decks else None
        self.current_card_id = None
        self.save_state()
        self.refresh_all_views()

    # Load the selected table row into the question and answer editors.
    def load_selected_card(self) -> None:
        deck = self.active_deck()
        if not deck:
            return

        items = self.card_table.selectedItems()
        if not items:
            return

        row = items[0].row()
        if row < 0 or row >= len(deck.cards):
            return

        card = deck.cards[row]
        self.current_card_id = card.id
        self.question_edit.setHtml(card.question_html)
        self.answer_edit.setHtml(card.answer_html)
        self.save_card_button.setText("Update Card")

    # Clear the editor so the next save creates a new card instead of updating an old one.
    def clear_card_form(self) -> None:
        self.current_card_id = None
        if hasattr(self, "question_edit"):
            self.question_edit.clear()
        if hasattr(self, "answer_edit"):
            self.answer_edit.clear()
        if hasattr(self, "card_table"):
            self.card_table.clearSelection()
        if hasattr(self, "save_card_button"):
            self.save_card_button.setText("Save Card")

    # Save the current card editor contents back into the active Deck.
    def save_card(self) -> None:
        deck = self.active_deck()
        if not deck:
            QMessageBox.information(self, "No Deck", "Create or select a deck first.")
            return

        question_html = self.question_edit.toHtml()
        answer_html = self.answer_edit.toHtml()
        candidate = Card(id=self.current_card_id or "", question_html=question_html, answer_html=answer_html)
        if not candidate.has_question_content():
            QMessageBox.warning(self, "Missing Question", "Question content is empty.")
            return
        if not candidate.has_answer_content():
            QMessageBox.warning(self, "Missing Answer", "Answer content is empty.")
            return

        if self.current_card_id:
            for card in deck.cards:
                if card.id == self.current_card_id:
                    card.question_html = question_html
                    card.answer_html = answer_html
                    break
        else:
            deck.cards.append(Card(question_html=question_html, answer_html=answer_html))

        deck.rebuild_days()
        self.save_state()
        self.refresh_all_views()

    # Remove the selected card and rebuild Day buckets afterwards.
    def remove_selected_card(self) -> None:
        deck = self.active_deck()
        if not deck or not self.current_card_id:
            return

        deck.cards = [card for card in deck.cards if card.id != self.current_card_id]
        deck.rebuild_days()
        self.current_card_id = None
        self.save_state()
        self.refresh_all_views()

    # Import a batch of plain-text cards into the active Deck.
    def import_cards(self) -> None:
        deck = self.active_deck()
        if not deck:
            QMessageBox.information(self, "No Deck", "Create or select a deck first.")
            return

        cards, skipped = parse_bulk_cards(self.bulk_edit.toPlainText())
        if not cards and not skipped:
            return

        for question, answer in cards:
            deck.cards.append(Card(question_html=plain_to_html(question), answer_html=plain_to_html(answer)))

        deck.rebuild_days()
        self.bulk_edit.clear()
        self.save_state()
        self.refresh_all_views()

        message = f"Imported {len(cards)} cards."
        if skipped:
            message += f"\nSkipped lines: {', '.join(map(str, skipped[:10]))}"
            if len(skipped) > 10:
                message += " ..."
        QMessageBox.information(self, "Import Result", message)

    # Rebuild the Study Deck selector while preserving the current selection when possible.
    def refresh_study_controls(self) -> None:
        previous_deck_id = self.current_combo_data(self.study_deck_combo) if hasattr(self, "study_deck_combo") else None
        self.study_deck_combo.blockSignals(True)
        self.study_deck_combo.clear()
        for deck in self.state.decks:
            self.study_deck_combo.addItem(deck.name, deck.id)
        self.study_deck_combo.blockSignals(False)
        self.set_combo_selection(self.study_deck_combo, previous_deck_id or self.current_deck_id)
        self.refresh_study_days()

    # Rebuild the Study Day selector from the currently selected Study Deck.
    def refresh_study_days(self) -> None:
        deck = self.selected_study_deck()
        previous_day = self.current_combo_data(self.study_day_combo) if hasattr(self, "study_day_combo") else None

        self.study_day_combo.blockSignals(True)
        self.study_day_combo.clear()
        self.study_day_combo.addItem("All Cards", None)
        if deck:
            for day in deck.days:
                self.study_day_combo.addItem(self.format_day_label(deck, day.day), day.day)
        self.study_day_combo.blockSignals(False)

        self.set_combo_selection(self.study_day_combo, previous_day)
        self.refresh_study_insights()

    # React to Study Deck changes by rebuilding the available Day list.
    def on_study_deck_changed(self) -> None:
        self.refresh_study_days()

    # Refresh the visible Study metrics and the history text for the selected Day.
    def refresh_study_insights(self) -> None:
        deck = self.selected_study_deck()
        day_number = self.current_combo_data(self.study_day_combo)

        self.day_badge.set_value(f"Day {day_number:03d}" if isinstance(day_number, int) else "All Cards")
        self.correct_badge.set_value(str(self.session.correct))
        self.wrong_badge.set_value(str(self.session.wrong))
        self.study_mode_label.setText(self.study_mode_combo.currentText() if deck else "Ready")

        if deck:
            self.study_deck_label.setText(deck.name)
            if isinstance(day_number, int):
                stats = deck.day_stats.get(day_number)
                self.recent_badge.set_value(f"{stats.last_correct}/{stats.last_total}" if stats and stats.last_total else "-")
                self.history_label.setText(self.format_day_history(deck, day_number))
                self.study_context_label.setText(f"{self.format_day_label(deck, day_number)}  |  Delay {deck.delay_ms} ms")
            else:
                self.recent_badge.set_value("-")
                self.history_label.setText(self.format_day_history(deck, None))
                self.study_context_label.setText(f"All {deck.card_count()} cards available in this Deck  |  Delay {deck.delay_ms} ms")
        else:
            self.study_deck_label.setText("No deck selected")
            self.recent_badge.set_value("-")
            self.history_label.setText("Create a deck first, then come back to Study.")
            self.study_context_label.setText("Choose a deck and a Day from the control panel.")

    # Jump to the Study tab for a specific Deck and Day, then begin the session immediately.
    def launch_study(self, deck_id: str, day_number: int | None = None) -> None:
        self.tabs.setCurrentWidget(self.study_tab)
        self.set_combo_selection(self.study_deck_combo, deck_id)
        self.refresh_study_days()
        self.set_combo_selection(self.study_day_combo, day_number)
        self.refresh_study_insights()
        self.start_session()

    # Decide which question input method should be used for the next card.
    def choose_question_mode(self) -> str:
        return random.choice(["Short Answer", "Multiple Choice"]) if self.session.selected_mode == "Mixed" else self.session.selected_mode

    # Start a new Study session using the selected Deck, Day, and question mode.
    def start_session(self) -> None:
        deck = self.selected_study_deck()
        if not deck:
            QMessageBox.information(self, "No Deck", "Create or select a deck first.")
            return

        day_number = self.current_combo_data(self.study_day_combo)
        if not isinstance(day_number, int):
            day_number = None

        cards = deck.cards_for_day(day_number)
        if not cards:
            QMessageBox.information(self, "No Cards", "No cards are available for this selection.")
            return

        shuffled_cards = list(cards)
        random.shuffle(shuffled_cards)
        self.session.start(deck.id, day_number, self.study_mode_combo.currentText(), shuffled_cards)
        self.restart_button.hide()
        self.feedback_overlay.hide()
        self.update_study_screen()
        self.show_current_card()

    # Apply session counters and progress to the desktop Study controls.
    def update_study_screen(self) -> None:
        total = self.session.total_cards()
        index = min(self.session.index, total)
        progress = int((index / total) * 100) if total else 0
        self.progress_bar.setValue(progress)
        self.progress_label.setText(f"Card {min(index + 1, total)}/{total}" if total else "Ready")
        self.correct_badge.set_value(str(self.session.correct))
        self.wrong_badge.set_value(str(self.session.wrong))
        self.refresh_study_insights()

    # Show the current card and swap in the right answer-entry widget for the chosen mode.
    def show_current_card(self) -> None:
        if self.session.is_finished():
            self.finish_session()
            return

        current_card = self.session.current_card()
        if current_card is None:
            self.finish_session()
            return

        self.answer_input.clear()
        self.answer_input.setEnabled(True)
        self.submit_button.setEnabled(True)
        self.feedback_overlay.hide()
        self.restart_button.hide()

        self.session.current_mode = self.choose_question_mode()
        self.study_mode_label.setText(self.session.current_mode)
        self.progress_label.setText(f"Card {self.session.index + 1}/{self.session.total_cards()}  |  {self.session.current_mode}")
        self.progress_bar.setValue(int((self.session.index / max(self.session.total_cards(), 1)) * 100))
        self.question_browser.set_card_html(current_card.question_html)

        for button in self.choice_buttons:
            button.setEnabled(True)
            button.show()

        if self.session.current_mode == "Short Answer":
            self.answer_stack.setCurrentIndex(0)
            self.answer_input.setFocus()
        else:
            self.answer_stack.setCurrentIndex(1)
            self.populate_choice_buttons(current_card)

    # Fill the multiple-choice buttons using other answers from the same Deck as distractors.
    def populate_choice_buttons(self, current_card: Card) -> None:
        deck = self.state.get_deck(self.session.deck_id)
        if not deck:
            return

        correct_answer = html_to_plain(current_card.answer_html)
        other_answers = [html_to_plain(card.answer_html) for card in deck.cards if card.id != current_card.id]
        options = build_choices(correct_answer, other_answers, len(self.choice_buttons))
        for index, button in enumerate(self.choice_buttons):
            if index < len(options):
                button.setText(options[index] or "[Image answer]")
                button.show()
                button.setEnabled(True)
            else:
                button.hide()

    # Validate a typed answer against the current card answer.
    def submit_typed_answer(self) -> None:
        current_card = self.session.current_card()
        if current_card is None:
            return

        expected = html_to_plain(current_card.answer_html)
        is_correct = normalize_text(self.answer_input.text()) == normalize_text(expected)
        self.handle_answer_result(is_correct, current_card.answer_html)

    # Validate a clicked multiple-choice answer against the current card answer.
    def submit_choice_answer(self, button: QPushButton) -> None:
        current_card = self.session.current_card()
        if current_card is None:
            return

        expected = html_to_plain(current_card.answer_html)
        is_correct = normalize_text(button.text()) == normalize_text(expected)
        self.handle_answer_result(is_correct, current_card.answer_html)

    # Show grading feedback, update counters, and schedule the next card after the configured delay.
    def handle_answer_result(self, is_correct: bool, answer_html: str) -> None:
        self.answer_input.setEnabled(False)
        self.submit_button.setEnabled(False)
        for button in self.choice_buttons:
            button.setEnabled(False)

        if is_correct:
            self.session.correct += 1
            self.feedback_overlay.show_correct()
        else:
            self.session.wrong += 1
            self.feedback_overlay.show_wrong(answer_html)

        self.update_study_screen()
        self.resize_feedback_overlay()
        QTimer.singleShot(self.current_delay_ms(), self.advance_session)

    # Resolve the answer delay currently active for the selected Deck.
    def current_delay_ms(self) -> int:
        deck = self.state.get_deck(self.session.deck_id)
        if deck:
            return deck.delay_ms
        return self.state.settings.delay_ms

    # Move the Study session forward one card after the feedback delay completes.
    def advance_session(self) -> None:
        self.feedback_overlay.hide()
        self.session.advance()
        self.show_current_card()

    # Finish the session, record Day stats, and show the final restart action.
    def finish_session(self) -> None:
        deck = self.state.get_deck(self.session.deck_id)
        if deck and self.session.day_number is not None:
            deck.ensure_day_stats(self.session.day_number).register_session(
                self.session.correct,
                self.session.wrong,
                self.session.total_cards(),
                self.session.selected_mode,
            )
            self.save_state()
            self.refresh_all_views()

        total = self.session.total_cards()
        self.progress_bar.setValue(100 if total else 0)
        self.progress_label.setText("Session Complete")
        self.study_mode_label.setText(self.session.selected_mode)
        self.study_context_label.setText(f"Finished with {self.session.correct} correct and {self.session.wrong} wrong.")
        self.question_browser.set_card_html(
            f"<h1 style='text-align:center; color:#113556;'>Session Complete</h1>"
            f"<p style='text-align:center; font-size:20px;'>Score: {self.session.correct} / {total}</p>"
            f"<p style='text-align:center; font-size:16px;'>Wrong answers: {self.session.wrong}</p>"
        )
        self.answer_input.clear()
        self.answer_input.setEnabled(False)
        self.submit_button.setEnabled(False)
        for button in self.choice_buttons:
            button.setEnabled(False)
        self.restart_button.show()
        self.update_study_screen()

    # Restart the most recently selected Day as a fresh Study session.
    def restart_session(self) -> None:
        if not self.session.deck_id:
            return
        self.launch_study(self.session.deck_id, self.session.day_number)
