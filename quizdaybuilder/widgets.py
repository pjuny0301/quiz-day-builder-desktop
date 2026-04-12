from __future__ import annotations

from pathlib import Path

from PyQt6.QtCore import QMimeData, Qt, pyqtSignal
from PyQt6.QtGui import QGuiApplication, QImage
from PyQt6.QtWidgets import (
    QApplication,
    QFrame,
    QGridLayout,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QListWidget,
    QPushButton,
    QScroller,
    QScrollerProperties,
    QSizePolicy,
    QTextBrowser,
    QTextEdit,
    QToolButton,
    QVBoxLayout,
    QWidget,
)

from .models import new_id


# Reusable elevated panel that gives the UI a consistent app-card visual language.
class SurfaceCard(QFrame):
    def __init__(self, role: str = "surface", parent=None) -> None:
        super().__init__(parent)
        self.setObjectName("SurfaceCard")
        self.setProperty("role", role)
        self.setFrameShape(QFrame.Shape.NoFrame)


# Compact metric widget used for cards, days, scores, and recent-session summaries.
class MetricBadge(SurfaceCard):
    def __init__(self, label: str, value: str = "-", tone: str = "blue", parent=None) -> None:
        super().__init__("metric", parent)
        self.setProperty("tone", tone)
        layout = QVBoxLayout(self)
        layout.setContentsMargins(16, 14, 16, 14)
        layout.setSpacing(4)

        self.label = QLabel(label)
        self.label.setObjectName("MetricLabel")
        self.value = QLabel(value)
        self.value.setObjectName("MetricValue")
        self.value.setWordWrap(True)

        layout.addWidget(self.label)
        layout.addWidget(self.value)

    # Update the visible value without rebuilding the widget.
    def set_value(self, value: str) -> None:
        self.value.setText(value)


# Rich-text editor that turns pasted images into stored local files and embeds them into the card.
class ImageTextEdit(QTextEdit):
    def __init__(self, image_dir: Path, parent=None) -> None:
        super().__init__(parent)
        self.image_dir = image_dir
        self.setAcceptRichText(True)

    # Tell Qt that image data is supported in addition to plain rich text.
    def canInsertFromMimeData(self, source: QMimeData) -> bool:
        return source.hasImage() or super().canInsertFromMimeData(source)

    # Handle Ctrl+V image paste and local image-file drops.
    def insertFromMimeData(self, source: QMimeData) -> None:
        if source.hasImage():
            image = QGuiApplication.clipboard().image()
            if image.isNull():
                super().insertFromMimeData(source)
                return
            image_path = self.save_image(image)
            self.textCursor().insertImage(str(image_path).replace("\\", "/"))
            return

        if source.hasUrls():
            inserted = False
            for url in source.urls():
                if not url.isLocalFile():
                    continue
                path = Path(url.toLocalFile())
                if path.suffix.lower() not in {".png", ".jpg", ".jpeg", ".bmp", ".gif", ".webp"}:
                    continue
                copied_path = self.copy_image_file(path)
                self.textCursor().insertImage(str(copied_path).replace("\\", "/"))
                inserted = True
            if inserted:
                return

        super().insertFromMimeData(source)

    # Save a clipboard image as a PNG asset in the app image directory.
    def save_image(self, image: QImage) -> Path:
        self.image_dir.mkdir(parents=True, exist_ok=True)
        image_path = self.image_dir / f"{new_id()}.png"
        image.save(str(image_path), "PNG")
        return image_path

    # Copy a dropped image file into the app image directory.
    def copy_image_file(self, path: Path) -> Path:
        self.image_dir.mkdir(parents=True, exist_ok=True)
        copied_path = self.image_dir / f"{new_id()}{path.suffix.lower()}"
        copied_path.write_bytes(path.read_bytes())
        return copied_path


# Read-only browser used to display question and answer HTML, including embedded images.
class HtmlCardBrowser(QTextBrowser):
    def __init__(self, parent=None) -> None:
        super().__init__(parent)
        self.setReadOnly(True)
        self.setOpenExternalLinks(False)
        self.setFrameShape(QFrame.Shape.NoFrame)
        self.setObjectName("HtmlCardBrowser")

    # Replace the currently displayed HTML body.
    def set_card_html(self, value: str) -> None:
        self.setHtml(value or "<p></p>")


# Full-panel overlay used to show a large success state or the correct answer after a miss.
class FeedbackOverlay(SurfaceCard):
    def __init__(self, parent=None) -> None:
        super().__init__("feedback", parent)
        layout = QVBoxLayout(self)
        layout.setContentsMargins(28, 28, 28, 28)
        layout.setSpacing(18)

        self.title_label = QLabel("")
        self.title_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.title_label.setWordWrap(True)
        self.title_label.setObjectName("FeedbackTitle")

        self.answer_browser = HtmlCardBrowser()
        self.answer_browser.setMinimumHeight(180)

        layout.addWidget(self.title_label)
        layout.addWidget(self.answer_browser)
        self.hide()

    # Configure the overlay for a correct answer state.
    def show_correct(self) -> None:
        self.setProperty("state", "correct")
        self.style().unpolish(self)
        self.style().polish(self)
        self.title_label.setText("O")
        self.answer_browser.hide()
        self.show()
        self.raise_()

    # Configure the overlay to show the correct answer content.
    def show_wrong(self, answer_html: str) -> None:
        self.setProperty("state", "wrong")
        self.style().unpolish(self)
        self.style().polish(self)
        self.title_label.setText("Correct Answer")
        self.answer_browser.set_card_html(answer_html)
        self.answer_browser.show()
        self.show()
        self.raise_()


# Clickable title label that emits a signal when the user double-clicks the text itself.
class DoubleClickLabel(QLabel):
    double_clicked = pyqtSignal()

    def mouseDoubleClickEvent(self, event) -> None:
        self.double_clicked.emit()
        event.accept()


# Apply smoother per-pixel scrolling and touchpad-like flicking to list widgets.
def enable_smooth_scrolling(list_widget: QListWidget) -> None:
    list_widget.setVerticalScrollMode(QListWidget.ScrollMode.ScrollPerPixel)
    QScroller.grabGesture(list_widget.viewport(), QScroller.ScrollerGestureType.LeftMouseButtonGesture)
    scroller = QScroller.scroller(list_widget.viewport())
    properties = scroller.scrollerProperties()
    properties.setScrollMetric(QScrollerProperties.ScrollMetric.VerticalOvershootPolicy, QScrollerProperties.OvershootPolicy.OvershootAlwaysOn)
    properties.setScrollMetric(QScrollerProperties.ScrollMetric.DecelerationFactor, 0.08)
    properties.setScrollMetric(QScrollerProperties.ScrollMetric.MaximumVelocity, 0.6)
    properties.setScrollMetric(QScrollerProperties.ScrollMetric.DragVelocitySmoothingFactor, 0.8)
    scroller.setScrollerProperties(properties)


# Responsive grid that reflows card widgets as the container width changes.
class ResponsiveCardGrid(QWidget):
    def __init__(self, minimum_card_width: int = 320, parent=None) -> None:
        super().__init__(parent)
        self.minimum_card_width = minimum_card_width
        self._widgets: list[QWidget] = []
        self._column_count = 0
        self.grid = QGridLayout(self)
        self.grid.setContentsMargins(0, 0, 0, 0)
        self.grid.setHorizontalSpacing(16)
        self.grid.setVerticalSpacing(16)

    # Replace the visible card widgets and trigger a full responsive reflow.
    def set_widgets(self, widgets: list[QWidget]) -> None:
        self.clear()
        self._widgets = widgets
        for widget in self._widgets:
            widget.setParent(self)
            widget.show()
        self.reflow()

    # Remove all widgets from the grid without deleting the container itself.
    def clear(self) -> None:
        while self.grid.count():
            item = self.grid.takeAt(0)
            widget = item.widget()
            if widget is not None:
                widget.setParent(None)
        self._widgets = []
        self._column_count = 0

    # Recalculate columns and reposition cards when the available width changes.
    def reflow(self) -> None:
        if not self._widgets:
            self._column_count = 0
            return

        available_width = max(1, self.width() - self.grid.contentsMargins().left() - self.grid.contentsMargins().right())
        column_count = max(1, available_width // self.minimum_card_width)
        if column_count == self._column_count and self.grid.count() == len(self._widgets):
            return

        while self.grid.count():
            self.grid.takeAt(0)

        self._column_count = column_count
        for index, widget in enumerate(self._widgets):
            row = index // column_count
            column = index % column_count
            self.grid.addWidget(widget, row, column)

        for column in range(column_count):
            self.grid.setColumnStretch(column, 1)

    # Trigger a responsive reflow whenever the grid widget itself is resized.
    def resizeEvent(self, event) -> None:
        super().resizeEvent(event)
        self.reflow()


# Deck card widget shown in the left Deck Manager rail.
class DeckListCard(SurfaceCard):
    clicked = pyqtSignal()
    rename_requested = pyqtSignal(str)
    edit_requested = pyqtSignal()
    delete_requested = pyqtSignal()
    open_requested = pyqtSignal()

    def __init__(self, title: str, subtitle: str, parent=None) -> None:
        super().__init__("soft-surface", parent)
        self.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Fixed)

        layout = QHBoxLayout(self)
        layout.setContentsMargins(16, 14, 16, 14)
        layout.setSpacing(12)

        text_column = QVBoxLayout()
        text_column.setSpacing(4)
        self.title_label = DoubleClickLabel(title)
        self.title_label.setObjectName("SectionTitle")
        self.title_label.double_clicked.connect(self.start_inline_rename)

        self.title_edit = QLineEdit(title)
        self.title_edit.hide()
        self.title_edit.returnPressed.connect(self.commit_inline_rename)
        self.title_edit.editingFinished.connect(self.finish_inline_rename)

        self.subtitle_label = QLabel(subtitle)
        self.subtitle_label.setObjectName("SectionBody")
        self.subtitle_label.setWordWrap(True)

        text_column.addWidget(self.title_label)
        text_column.addWidget(self.title_edit)
        text_column.addWidget(self.subtitle_label)

        actions = QHBoxLayout()
        actions.setSpacing(6)

        self.edit_button = QToolButton()
        self.edit_button.setText("...")
        self.edit_button.clicked.connect(self.edit_requested.emit)

        self.delete_button = QToolButton()
        self.delete_button.setText("X")
        self.delete_button.clicked.connect(self.delete_requested.emit)

        self.open_button = QPushButton("Open")
        self.open_button.clicked.connect(self.open_requested.emit)
        self.open_button.setProperty("variant", "primary")

        actions.addWidget(self.edit_button)
        actions.addWidget(self.delete_button)
        actions.addWidget(self.open_button)

        layout.addLayout(text_column, 1)
        layout.addLayout(actions)

    # Notify the parent list when the card body gets clicked so selection stays in sync.
    def mousePressEvent(self, event) -> None:
        self.clicked.emit()
        super().mousePressEvent(event)

    # Open the deck detail screen when the body is double-clicked.
    def mouseDoubleClickEvent(self, event) -> None:
        self.open_requested.emit()
        super().mouseDoubleClickEvent(event)

    # Update the visible title/subtitle content after data changes.
    def set_content(self, title: str, subtitle: str) -> None:
        self.title_label.setText(title)
        self.title_edit.setText(title)
        self.subtitle_label.setText(subtitle)

    # Enter inline rename mode for the deck title.
    def start_inline_rename(self) -> None:
        self.title_label.hide()
        self.title_edit.show()
        self.title_edit.setFocus()
        self.title_edit.selectAll()

    # Emit the rename request if the inline title changed to a non-empty value.
    def commit_inline_rename(self) -> None:
        text = self.title_edit.text().strip()
        if text:
            self.rename_requested.emit(text)
        self.finish_inline_rename()

    # Leave inline rename mode and return to the title label.
    def finish_inline_rename(self) -> None:
        self.title_edit.hide()
        self.title_label.show()


# Large visual Day card used in deck detail screens.
class DayListCard(SurfaceCard):
    open_requested = pyqtSignal()
    play_requested = pyqtSignal()

    def __init__(self, title: str, summary: str, stats: str, parent=None) -> None:
        super().__init__("surface", parent)
        layout = QVBoxLayout(self)
        layout.setContentsMargins(18, 16, 18, 16)
        layout.setSpacing(10)

        self.title_label = QLabel(title)
        self.title_label.setObjectName("SectionTitle")
        self.summary_label = QLabel(summary)
        self.summary_label.setObjectName("SectionBody")
        self.stats_label = QLabel(stats)
        self.stats_label.setObjectName("SectionBody")

        action_row = QHBoxLayout()
        action_row.addStretch(1)
        self.play_button = QPushButton("Play")
        self.open_button = QPushButton("Open")
        self.play_button.clicked.connect(self.play_requested.emit)
        self.open_button.clicked.connect(self.open_requested.emit)
        self.play_button.setProperty("variant", "accent")
        self.open_button.setProperty("variant", "primary")
        action_row.addWidget(self.play_button)
        action_row.addWidget(self.open_button)

        layout.addWidget(self.title_label)
        layout.addWidget(self.summary_label)
        layout.addWidget(self.stats_label)
        layout.addLayout(action_row)

    # Open the Day detail view when the card is double-clicked.
    def mouseDoubleClickEvent(self, event) -> None:
        self.open_requested.emit()
        super().mouseDoubleClickEvent(event)


# Large quiz-answer card used in Day detail screens.
class MatchListCard(SurfaceCard):
    play_requested = pyqtSignal()

    def __init__(self, question: str, answer: str, parent=None) -> None:
        super().__init__("surface", parent)
        layout = QVBoxLayout(self)
        layout.setContentsMargins(18, 16, 18, 16)
        layout.setSpacing(10)

        question_title = QLabel("Question")
        question_title.setObjectName("SectionEyebrow")
        self.question_label = QLabel(question)
        self.question_label.setObjectName("SectionTitle")
        self.question_label.setWordWrap(True)

        answer_title = QLabel("Answer")
        answer_title.setObjectName("SectionEyebrow")
        self.answer_label = QLabel(answer)
        self.answer_label.setObjectName("SectionBody")
        self.answer_label.setWordWrap(True)

        action_row = QHBoxLayout()
        action_row.addStretch(1)
        self.play_button = QPushButton("Play From Here")
        self.play_button.setProperty("variant", "primary")
        self.play_button.clicked.connect(self.play_requested.emit)

        action_row.addWidget(self.play_button)

        layout.addWidget(question_title)
        layout.addWidget(self.question_label)
        layout.addWidget(answer_title)
        layout.addWidget(self.answer_label)
        layout.addLayout(action_row)
