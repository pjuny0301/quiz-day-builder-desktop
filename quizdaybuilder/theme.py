from __future__ import annotations

from PyQt6.QtGui import QFont, QFontDatabase
from PyQt6.QtWidgets import QApplication


PRIMARY_FONT_CANDIDATES = [
    "Segoe UI Variable Text",
    "Segoe UI",
    "Malgun Gothic",
]

DISPLAY_FONT_CANDIDATES = [
    "Bahnschrift SemiBold",
    "Bahnschrift",
    "Segoe UI Variable Display",
    "Segoe UI",
]


# Pick the first installed font from a preferred list so the UI remains polished but robust.
def choose_font(app: QApplication, candidates: list[str]) -> str:
    installed = set(QFontDatabase.families())
    for candidate in candidates:
        if candidate in installed:
            return candidate
    return app.font().family()


# Apply typography defaults before the stylesheet gets layered on top.
def apply_app_font(app: QApplication) -> tuple[str, str]:
    primary = choose_font(app, PRIMARY_FONT_CANDIDATES)
    display = choose_font(app, DISPLAY_FONT_CANDIDATES)
    base_font = QFont(primary, 10)
    app.setFont(base_font)
    return primary, display


# Build the main application stylesheet with distinct management, detail, and Study surfaces.
def build_stylesheet(primary_font: str, display_font: str) -> str:
    return f"""
    QWidget {{
        background: #eef4f8;
        color: #0f2236;
        font-family: "{primary_font}";
    }}

    QMainWindow {{
        background: #eef4f8;
    }}

    QLabel#HeroTitle {{
        font-family: "{display_font}";
        font-size: 30px;
        font-weight: 800;
        color: #0b2239;
    }}

    QLabel#HeroSubtitle {{
        font-size: 13px;
        color: #597289;
    }}

    QTabWidget::pane {{
        border: 0;
    }}

    QTabBar::tab {{
        background: #dbe6ee;
        color: #34506a;
        min-width: 150px;
        padding: 12px 18px;
        margin-right: 8px;
        border-radius: 16px;
        font-weight: 800;
    }}

    QTabBar::tab:selected {{
        background: #0f2236;
        color: white;
    }}

    QFrame#SurfaceCard[role="hero"] {{
        background: qlineargradient(x1:0, y1:0, x2:1, y2:1,
            stop:0 #fdfefe, stop:0.55 #f5f9fc, stop:1 #e4eef6);
        border: 1px solid #d7e3ec;
        border-radius: 26px;
    }}

    QFrame#SurfaceCard[role="sidebar"] {{
        background: #0f2236;
        border: 0;
        border-radius: 28px;
    }}

    QFrame#SurfaceCard[role="sidebar"] QLabel {{
        background: transparent;
        color: #ecf4fb;
    }}

    QFrame#SurfaceCard[role="surface"] {{
        background: rgba(255, 255, 255, 0.96);
        border: 1px solid #d9e5ee;
        border-radius: 24px;
    }}

    QFrame#SurfaceCard[role="soft-surface"] {{
        background: #f7fbff;
        border: 1px solid #d7e7f5;
        border-radius: 22px;
    }}

    QFrame#SurfaceCard[role="soft-surface"][selected="true"] {{
        background: #e9f2ff;
        border: 2px solid #8db8ea;
    }}

    QFrame#SurfaceCard[role="soft-surface"][selected="true"] QLabel#SectionTitle {{
        color: #0d3156;
    }}

    QFrame#SurfaceCard[role="soft-surface"][selected="true"] QLabel#SectionBody {{
        color: #365872;
    }}

    QFrame#SurfaceCard[role="phone-shell"] {{
        background: #f9fff9;
        border: 1px solid #dbe9dd;
        border-radius: 34px;
    }}

    QFrame#SurfaceCard[role="question-card"] {{
        background: #ffffff;
        border: 1px solid #d9e9dd;
        border-radius: 26px;
    }}

    QFrame#SurfaceCard[role="metric"] {{
        border-radius: 18px;
        border: 1px solid #d9e5ee;
        background: #ffffff;
    }}

    QFrame#SurfaceCard[role="metric"][tone="blue"] {{
        background: #eef5ff;
        border-color: #d6e7ff;
    }}

    QFrame#SurfaceCard[role="metric"][tone="green"] {{
        background: #eefaf4;
        border-color: #d7efdf;
    }}

    QFrame#SurfaceCard[role="metric"][tone="gold"] {{
        background: #fff7ea;
        border-color: #f6dfb3;
    }}

    QFrame#SurfaceCard[role="metric"][tone="rose"] {{
        background: #fff0ef;
        border-color: #f5d4cf;
    }}

    QLabel#MetricLabel {{
        font-size: 11px;
        font-weight: 700;
        color: #5d748a;
        letter-spacing: 0.2px;
    }}

    QLabel#MetricValue {{
        font-family: "{display_font}";
        font-size: 20px;
        font-weight: 800;
        color: #0f2236;
    }}

    QLabel#SidebarTitle {{
        font-family: "{display_font}";
        font-size: 22px;
        font-weight: 800;
        color: #f6fbff;
    }}

    QLabel#SidebarSubtitle {{
        font-size: 12px;
        color: #a9bfd2;
    }}

    QLabel#SectionEyebrow {{
        color: #5a7590;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.5px;
        text-transform: uppercase;
    }}

    QLabel#SectionTitle {{
        font-family: "{display_font}";
        color: #11283f;
        font-size: 22px;
        font-weight: 800;
    }}

    QLabel#SectionBody {{
        color: #62798f;
        font-size: 12px;
    }}

    QLabel#StudyDeckLabel {{
        color: #2f6b4d;
        font-size: 12px;
        font-weight: 800;
    }}

    QLabel#StudyModeLabel {{
        color: #47685c;
        font-size: 12px;
        font-weight: 700;
    }}

    QLabel#FeedbackTitle {{
        font-family: "{display_font}";
        font-size: 56px;
        font-weight: 900;
        color: #0d5fd3;
        background: transparent;
    }}

    QFrame#SurfaceCard[role="feedback"] {{
        border-radius: 30px;
        padding: 4px;
    }}

    QFrame#SurfaceCard[role="feedback"][state="correct"] {{
        background: rgba(227, 240, 255, 0.98);
        border: 5px solid #0d5fd3;
    }}

    QFrame#SurfaceCard[role="feedback"][state="wrong"] {{
        background: rgba(255, 244, 231, 0.98);
        border: 5px solid #d97706;
    }}

    QFrame#SurfaceCard[role="feedback"][state="wrong"] QLabel#FeedbackTitle {{
        color: #b15a04;
        font-size: 34px;
    }}

    QPushButton {{
        min-height: 38px;
        padding: 8px 14px;
        border-radius: 12px;
        border: 1px solid #d0dce7;
        background: #ffffff;
        color: #10263d;
        font-weight: 700;
    }}

    QPushButton:hover {{
        background: #f4f8fc;
    }}

    QPushButton:pressed {{
        background: #e8eef5;
    }}

    QPushButton[variant="primary"] {{
        background: #0f2236;
        border-color: #0f2236;
        color: white;
    }}

    QPushButton[variant="primary"]:hover {{
        background: #183148;
    }}

    QPushButton[variant="accent"] {{
        background: #1b8f58;
        border-color: #1b8f58;
        color: white;
        min-height: 46px;
        border-radius: 16px;
        font-size: 14px;
        font-weight: 800;
    }}

    QPushButton[variant="accent"]:hover {{
        background: #16784a;
    }}

    QPushButton[variant="ghost"] {{
        background: transparent;
        border-color: #38526d;
        color: #ebf4fc;
    }}

    QPushButton[variant="ghost"]:hover {{
        background: rgba(255, 255, 255, 0.08);
    }}

    QPushButton[variant="choice"] {{
        background: #ffffff;
        border: 2px solid #d6e3db;
        border-radius: 18px;
        min-height: 58px;
        font-size: 15px;
        font-weight: 800;
        color: #163623;
        text-align: left;
        padding: 12px 18px;
    }}

    QPushButton[variant="choice"]:hover {{
        background: #f1fbf4;
        border-color: #a9d6b8;
    }}

    QPushButton:disabled {{
        background: #c5d1db;
        border-color: #c5d1db;
        color: #eff4f8;
    }}

    QToolButton {{
        min-width: 34px;
        min-height: 34px;
        padding: 4px 8px;
        border-radius: 10px;
        border: 1px solid #c7d8e8;
        background: #ffffff;
        color: #173650;
        font-weight: 800;
    }}

    QToolButton:hover {{
        background: #eef5fd;
        border-color: #aecaeb;
    }}

    QToolButton:pressed {{
        background: #ddeafa;
    }}

    QListWidget {{
        background: transparent;
        border: 0;
        outline: none;
        padding: 4px;
    }}

    QListWidget::item {{
        background: transparent;
        border: 0;
        border-radius: 16px;
        margin-bottom: 8px;
        padding: 2px;
        color: #ebf4fc;
    }}

    QListWidget::item:selected {{
        background: transparent;
        border: 0;
    }}

    QListWidget#DayList::item {{
        background: #f8fbff;
        border: 1px solid #dbe8f2;
        border-radius: 14px;
        margin-bottom: 8px;
        padding: 10px 12px;
        color: #17304a;
    }}

    QListWidget#DayList::item:selected {{
        background: #eaf4ff;
        border-color: #b8d6f6;
    }}

    QComboBox, QLineEdit, QTextEdit, QTableWidget, QSpinBox {{
        background: #ffffff;
        border: 1px solid #d1deea;
        border-radius: 14px;
        padding: 8px 10px;
        selection-background-color: #0f2236;
        selection-color: white;
    }}

    QComboBox {{
        min-height: 38px;
        padding-right: 18px;
    }}

    QLineEdit {{
        min-height: 42px;
        font-size: 15px;
    }}

    QTextEdit {{
        padding: 12px;
    }}

    QSpinBox {{
        min-height: 38px;
    }}

    QTableWidget {{
        gridline-color: #edf2f6;
        font-size: 13px;
    }}

    QHeaderView::section {{
        background: #f4f8fb;
        border: 0;
        border-bottom: 1px solid #dfe8ef;
        padding: 10px 8px;
        font-weight: 800;
        color: #45617d;
    }}

    QTextBrowser#HtmlCardBrowser {{
        background: transparent;
        color: #12385d;
        border: 0;
    }}

    QScrollArea {{
        border: 0;
        background: transparent;
    }}

    QProgressBar {{
        min-height: 10px;
        background: #dfe9e3;
        border: 0;
        border-radius: 5px;
        text-align: center;
    }}

    QProgressBar::chunk {{
        border-radius: 5px;
        background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
            stop:0 #1b8f58, stop:1 #59c17e);
    }}
    """
