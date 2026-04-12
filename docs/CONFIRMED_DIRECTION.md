# Confirmed Direction

## Source Of Truth

This document captures the product direction explicitly stated by the user across the collaboration. It is the implementation baseline unless the user changes direction again.

## Stack Direction

- The desktop app should move away from PyQt.
- The new primary stack should be `React + Tauri`.
- Development and delivery should target Windows desktop usage first.

## Product Direction

- The application is a deck-based quiz and memorization app.
- The app must support deck creation and management.
- Each deck must be split into `Day` buckets automatically based on `cards per day`.
- Every deck should keep `Day 1` by default, even before any cards are added.
- Question content and answer content must be stored separately.
- Cards must support image paste with `Ctrl+V`.
- Data must autosave to file.
- Study modes must include at least:
  - Multiple Choice
  - Short Answer
  - Mixed
- Random multiple-choice distractors should come from answers of other cards in the same deck.
- Study feedback must show:
  - large blue `O` when correct
  - large centered correct answer when wrong
  - automatic advance after a configurable delay
- After a session completes, the user should be able to:
  - review only the wrong cards
  - restart the whole studied scope

## Screen Direction

- The UI should use one main desktop window with in-app screen transitions instead of spawning many blank-loading OS windows.
- One screen should serve one role only.
- Screens should be visually differentiated as much as practical.
- Study should run on its own dedicated screen.
- Deck creation should happen on its own dedicated screen.
- Deck settings such as name, delay, and cards-per-Day should happen on their own dedicated screen.
- Value-setting should not happen inline on the main screen.
- Reducing the blank delay from repeated window creation is now an explicit product goal.
- Completion screens should keep the number of next-step choices small and clear.

## Required Screen Roles

- `Deck Manager`
- `Deck Create`
- `Deck Settings`
- `Deck Detail`
- `Day Detail`
- `Study Launcher`
- `Study Session`

## Presentation Direction

- The interface should feel closer to a commercial app than a utility prototype.
- Text must be readable.
- Screens should avoid the feeling of too much information crammed into one surface.
- The user prefers a screen to emphasize one core purpose instead of mixing many equal-priority functions together.
- That core function should feel visually emphasized and obvious.
- The user does not require an extreme one-feature-only rule if the screen still feels concise and clear.
- Each deck card should stay visually concise and should not expose extra deck-level metrics like `Day` count on the outer card face.
- The main deck screen should be simplified further by removing extra metrics and secondary action clutter.
- The app UI should be presented in Korean for the user-facing copy.
- Deck name inputs should not be visible directly on the main screen.
- Deck deletion should live inside the deck card overflow menu instead of appearing as a separate always-visible action.

## Documentation Direction

- The implementation should be driven by written product documents.
- User-confirmed direction and inferred user intent should be documented separately.
- Future implementation work must read the project guidance documents first, not skip straight to code.
- Function-purpose comments are required for every new function.
- Changes should favor extensible refactoring, not one-off patching.
