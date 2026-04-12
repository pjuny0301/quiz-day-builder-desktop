from __future__ import annotations

import html
import random

from PyQt6.QtGui import QTextDocument


# Generate a minimal HTML fragment from plain text input.
def plain_to_html(text: str) -> str:
    escaped = html.escape(text or "").replace("\n", "<br>")
    return f"<p>{escaped}</p>"


# Extract plain text from HTML for search, preview, and short-answer checking.
def html_to_plain(value: str) -> str:
    document = QTextDocument()
    document.setHtml(value or "")
    return document.toPlainText().strip()


# Normalize answer text so whitespace and case differences do not break matching.
def normalize_text(text: str) -> str:
    return " ".join((text or "").strip().casefold().split())


# Build multiple-choice options from the correct answer and other deck answers.
def build_choices(correct_answer: str, other_answers: list[str], target_count: int = 4) -> list[str]:
    seen = {normalize_text(correct_answer)}
    pool: list[str] = []
    for answer in other_answers:
        normalized = normalize_text(answer)
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        pool.append(answer)
    count = min(max(target_count - 1, 0), len(pool))
    choices = random.sample(pool, count)
    choices.append(correct_answer)
    random.shuffle(choices)
    return choices


# Clip long plain-text previews so dense tables remain readable.
def preview_text(value: str, limit: int = 72) -> str:
    text = html_to_plain(value)
    if len(text) <= limit:
        return text
    return f"{text[: limit - 1].rstrip()}…"


# Parse bulk-import text into question/answer pairs while reporting skipped line numbers.
def parse_bulk_cards(raw_text: str) -> tuple[list[tuple[str, str]], list[int]]:
    cards: list[tuple[str, str]] = []
    skipped: list[int] = []
    for index, line in enumerate(raw_text.splitlines(), start=1):
        stripped = line.strip()
        if not stripped:
            continue
        if "\t" in stripped:
            question, answer = stripped.split("\t", 1)
        elif "|" in stripped:
            question, answer = stripped.split("|", 1)
        elif "::" in stripped:
            question, answer = stripped.split("::", 1)
        else:
            skipped.append(index)
            continue
        question = question.strip()
        answer = answer.strip()
        if not question or not answer:
            skipped.append(index)
            continue
        cards.append((question, answer))
    return cards, skipped

