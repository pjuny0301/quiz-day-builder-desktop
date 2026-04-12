from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
import uuid

from .utils import html_to_plain, plain_to_html


# Generate stable ids for decks, cards, and local assets.
def new_id() -> str:
    return uuid.uuid4().hex


@dataclass
class AppSettings:
    delay_ms: int = 1500
    default_day_size: int = 30

    # Build settings from a JSON-compatible dictionary.
    @classmethod
    def from_dict(cls, value: dict[str, Any] | None) -> "AppSettings":
        source = value or {}
        return cls(
            delay_ms=int(source.get("delay_ms", 1500) or 1500),
            default_day_size=int(source.get("default_day_size", 30) or 30),
        )

    # Convert settings back into a JSON-compatible dictionary.
    def to_dict(self) -> dict[str, Any]:
        return {
            "delay_ms": self.delay_ms,
            "default_day_size": self.default_day_size,
        }


@dataclass
class Card:
    id: str = field(default_factory=new_id)
    question_html: str = ""
    answer_html: str = ""

    # Build a card from saved JSON while migrating older plain-text fields.
    @classmethod
    def from_dict(cls, value: dict[str, Any]) -> "Card":
        question_html = value.get("question_html") or plain_to_html(value.get("question", ""))
        answer_html = value.get("answer_html") or plain_to_html(value.get("answer", ""))
        return cls(
            id=value.get("id", new_id()),
            question_html=question_html,
            answer_html=answer_html,
        )

    # Convert a card into a JSON-compatible dictionary.
    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "question_html": self.question_html,
            "answer_html": self.answer_html,
        }

    # Report whether the question side has visible text or an image reference.
    def has_question_content(self) -> bool:
        return bool(html_to_plain(self.question_html) or "<img" in self.question_html.lower())

    # Report whether the answer side has visible text or an image reference.
    def has_answer_content(self) -> bool:
        return bool(html_to_plain(self.answer_html) or "<img" in self.answer_html.lower())


@dataclass
class DayBucket:
    day: int
    name: str
    card_ids: list[str]

    # Build a Day bucket from JSON.
    @classmethod
    def from_dict(cls, value: dict[str, Any]) -> "DayBucket":
        day_number = int(value.get("day", 1) or 1)
        return cls(
            day=day_number,
            name=value.get("name", f"Day {day_number:03d}"),
            card_ids=list(value.get("card_ids", [])),
        )

    # Convert a Day bucket into a JSON-compatible dictionary.
    def to_dict(self) -> dict[str, Any]:
        return {
            "day": self.day,
            "name": self.name,
            "card_ids": list(self.card_ids),
        }


@dataclass
class DayStats:
    total_correct: int = 0
    total_wrong: int = 0
    last_correct: int = 0
    last_wrong: int = 0
    last_total: int = 0
    last_mode: str = ""

    # Build Day stats from JSON.
    @classmethod
    def from_dict(cls, value: dict[str, Any] | None) -> "DayStats":
        source = value or {}
        return cls(
            total_correct=int(source.get("total_correct", 0) or 0),
            total_wrong=int(source.get("total_wrong", 0) or 0),
            last_correct=int(source.get("last_correct", 0) or 0),
            last_wrong=int(source.get("last_wrong", 0) or 0),
            last_total=int(source.get("last_total", 0) or 0),
            last_mode=str(source.get("last_mode", "")),
        )

    # Convert Day stats into a JSON-compatible dictionary.
    def to_dict(self) -> dict[str, Any]:
        return {
            "total_correct": self.total_correct,
            "total_wrong": self.total_wrong,
            "last_correct": self.last_correct,
            "last_wrong": self.last_wrong,
            "last_total": self.last_total,
            "last_mode": self.last_mode,
        }

    # Register one completed session into the cumulative and recent counters.
    def register_session(self, correct: int, wrong: int, total: int, mode: str) -> None:
        self.total_correct += correct
        self.total_wrong += wrong
        self.last_correct = correct
        self.last_wrong = wrong
        self.last_total = total
        self.last_mode = mode


@dataclass
class Deck:
    id: str = field(default_factory=new_id)
    name: str = "Untitled Deck"
    delay_ms: int = 1500
    day_size: int = 30
    cards: list[Card] = field(default_factory=list)
    days: list[DayBucket] = field(default_factory=list)
    day_stats: dict[int, DayStats] = field(default_factory=dict)

    # Build a deck from JSON.
    @classmethod
    def from_dict(cls, value: dict[str, Any]) -> "Deck":
        deck = cls(
            id=value.get("id", new_id()),
            name=value.get("name", "Untitled Deck"),
            delay_ms=int(value.get("delay_ms", 1500) or 1500),
            day_size=int(value.get("day_size", 30) or 30),
            cards=[Card.from_dict(card) for card in value.get("cards", [])],
            days=[DayBucket.from_dict(day) for day in value.get("days", [])],
            day_stats={
                int(day_number): DayStats.from_dict(stats)
                for day_number, stats in (value.get("day_stats", {}) or {}).items()
            },
        )
        deck.cards = [card for card in deck.cards if card.has_question_content() or card.has_answer_content()]
        deck.sync_day_stats()
        return deck

    # Convert a deck into a JSON-compatible dictionary.
    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "delay_ms": self.delay_ms,
            "day_size": self.day_size,
            "cards": [card.to_dict() for card in self.cards],
            "days": [day.to_dict() for day in self.days],
            "day_stats": {str(day_number): stats.to_dict() for day_number, stats in self.day_stats.items()},
        }

    # Rebuild sequential Day buckets using the current deck order and configured day size.
    def rebuild_days(self) -> None:
        size = self.day_size if self.day_size > 0 else 30
        self.days = []
        for start in range(0, len(self.cards), size):
            number = len(self.days) + 1
            self.days.append(
                DayBucket(
                    day=number,
                    name=f"Day {number:03d}",
                    card_ids=[card.id for card in self.cards[start : start + size]],
                )
            )
        self.sync_day_stats()

    # Remove Day stats for buckets that no longer exist after a split or card deletion.
    def sync_day_stats(self) -> None:
        valid_days = {bucket.day for bucket in self.days}
        self.day_stats = {day_number: stats for day_number, stats in self.day_stats.items() if day_number in valid_days}

    # Get or create the Day stats object for a bucket.
    def ensure_day_stats(self, day_number: int) -> DayStats:
        if day_number not in self.day_stats:
            self.day_stats[day_number] = DayStats()
        return self.day_stats[day_number]

    # Resolve the card objects that belong to a specific Day bucket.
    def cards_for_day(self, day_number: int | None) -> list[Card]:
        if day_number is None:
            return list(self.cards)
        bucket = next((day for day in self.days if day.day == day_number), None)
        if not bucket:
            return []
        card_map = {card.id: card for card in self.cards}
        return [card_map[card_id] for card_id in bucket.card_ids if card_id in card_map]

    # Report how many cards the deck currently contains.
    def card_count(self) -> int:
        return len(self.cards)

    # Report how many Day buckets the deck currently contains.
    def day_count(self) -> int:
        return len(self.days)


@dataclass
class AppState:
    settings: AppSettings = field(default_factory=AppSettings)
    decks: list[Deck] = field(default_factory=list)

    # Build full app state from JSON.
    @classmethod
    def from_dict(cls, value: dict[str, Any] | None) -> "AppState":
        source = value or {}
        return cls(
            settings=AppSettings.from_dict(source.get("settings")),
            decks=[Deck.from_dict(deck) for deck in source.get("decks", [])],
        )

    # Convert full app state into a JSON-compatible dictionary.
    def to_dict(self) -> dict[str, Any]:
        return {
            "settings": self.settings.to_dict(),
            "decks": [deck.to_dict() for deck in self.decks],
        }

    # Look up a deck by id.
    def get_deck(self, deck_id: str | None) -> Deck | None:
        if not deck_id:
            return None
        for deck in self.decks:
            if deck.id == deck_id:
                return deck
        return None

    # Remove a deck from the app state by id.
    def delete_deck(self, deck_id: str) -> None:
        self.decks = [deck for deck in self.decks if deck.id != deck_id]


@dataclass
class SessionState:
    deck_id: str | None = None
    day_number: int | None = None
    selected_mode: str = "Short Answer"
    current_mode: str = "Short Answer"
    cards: list[Card] = field(default_factory=list)
    index: int = 0
    correct: int = 0
    wrong: int = 0

    # Reset the session to a new card list and mode selection.
    def start(self, deck_id: str, day_number: int | None, mode: str, cards: list[Card]) -> None:
        self.deck_id = deck_id
        self.day_number = day_number
        self.selected_mode = mode
        self.current_mode = mode
        self.cards = list(cards)
        self.index = 0
        self.correct = 0
        self.wrong = 0

    # Return the card currently being shown, if any remain.
    def current_card(self) -> Card | None:
        if self.index < 0 or self.index >= len(self.cards):
            return None
        return self.cards[self.index]

    # Return whether the session has consumed all available cards.
    def is_finished(self) -> bool:
        return self.index >= len(self.cards)

    # Advance the session pointer to the next card.
    def advance(self) -> None:
        self.index += 1

    # Return the total number of cards in the current session.
    def total_cards(self) -> int:
        return len(self.cards)
