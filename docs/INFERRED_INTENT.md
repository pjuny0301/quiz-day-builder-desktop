# Inferred Intent

## Purpose

This document captures the likely product intent inferred from the user's repeated feedback. These points are not direct quotes, but they are strong implementation signals and should guide design decisions.

## Product Intent

- The user wants a memorization tool that feels structured and serious enough for daily study, not a toy flashcard app.
- The user values completion and practical usefulness more than preserving the current tech stack.
- The user wants the app to reduce friction during repeated study sessions.
- The user wants large, clear reading surfaces because the app is for memorization, not dense data entry alone.
- The user wants completion flows to lead directly into the next useful study action instead of making them reconfigure everything.

## UX Intent

- The user dislikes mixed-purpose screens that make one window do too many jobs.
- The user prefers a screen to present one strongly emphasized primary function rather than several competing functions.
- The user is still pragmatic: a screen may contain nearby supporting actions as long as the overall view remains concise.
- The user wants the main screen to behave more like a launcher or browser than an editor or settings form.
- The user dislikes direct inline value entry on overview screens and prefers dedicated setup surfaces for that work.
- The user dislikes the visible blank pause caused by opening new OS windows and prefers in-app screen transitions when they feel faster.
- The user prefers distinct contexts:
  - manage decks in one place
  - create a deck in a dedicated naming screen
  - change deck settings in a separate dedicated settings screen
  - edit cards in a separate dedicated editor screen
  - inspect deck/day structure in another dedicated screen
  - launch study from a dedicated setup screen
  - focus on answering inside a separate session screen
- The user wants the screen system itself to communicate mode changes, not just tabs or small layout shifts.
- The user expects key statistics to be visible at the right level:
  - deck outer cards should stay concise
  - day-level recent score should stay visible where Day context exists
  - session-level correct and wrong counts should stay visible during study
- The user prefers destructive actions like deck deletion to stay behind an overflow menu instead of sitting on the main card face.
- The user benefits when post-study choices stay limited to a very small set of obvious actions.
- The user wants the visual language localized enough that the interface reads naturally in Korean, while still tolerating domain words like `Deck` and `Day` when useful.

## Interaction Intent

- Starting a study session should feel deliberate, almost like entering a focused mode.
- Reviewing a deck or a day should feel like browsing rich cards rather than reading thin lists.
- Autosave should be invisible and dependable.
- Image support should feel native instead of like an afterthought.

## Technical Intent

- The user is open to a rebuild if it results in a cleaner long-term architecture.
- The user wants a codebase that can keep expanding without collapsing into a monolithic file.
- State, persistence, and window routing should be organized explicitly enough that later features can be added without major rewrites.
- The user expects future contributors to respect written project rules instead of improvising from the current screen alone.
- The user values explicit function-purpose comments because they make later extension and maintenance faster.

## Implementation Consequences

- In-app screen routing should be first-class, not bolted on later.
- Card editing should live on its own dedicated screen because it is a separate primary task from deck browsing.
- Shared application state should be persisted centrally and available instantly across screen transitions.
- The frontend should separate screen shells, domain state, and reusable UI primitives.
- The first serious milestone is not feature parity with the PyQt version alone, but a strong React + Tauri foundation that already respects the user's role-based screen model.
