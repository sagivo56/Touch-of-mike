# Touch — Russian Bank Solitaire

A mobile-friendly, two-player competitive solitaire card game based on the classic
**Russian Bank** (known locally as **"Touch"**), styled after the timeless
Windows 95 / XP Solitaire look — casino-green felt, sharp retro cards, MS Sans Serif
typography, and classic red/blue patterned card backs.

You play the bottom hand against a built-in computer opponent up top.

## Play it

No build step, no dependencies. Just open **`index.html`** in any modern browser —
it's a single self-contained file optimized for a vertical phone screen.

```
open index.html          # macOS
xdg-open index.html      # Linux
# or drag index.html onto your phone browser / host it as a static file
```

## Goal

Be the **first player to empty your 13-card Reserve pile.**

## Components

Two standard 52-card decks (104 cards total). The screen has three zones:

- **Player 2 (top, computer):** Reserve (13 cards, top face up), Stock (draw pile), Waste.
- **Center (shared):**
  - **8 Foundations** — build **UP** by suit, Ace → King.
  - **8 Tableau** slots — the maneuvering area; build **DOWN** in alternating colors.
- **Player 1 (bottom, you):** Reserve, Stock, Waste.

## How to play (touch-friendly, tap-to-move)

1. On your turn, **tap** one of your movable cards — your Reserve top, your Waste top,
   or any Tableau top card. It highlights, and every legal destination **glows yellow**.
2. **Tap** a glowing Foundation or Tableau slot to move the card there.
3. Make as many legal moves as you like. **Undo** takes back moves made this turn.
4. Press **End Turn (Draw)** to draw a card from your Stock to your Waste — this ends
   your turn and hands play to the computer.

## Rules enforced

- **Foundations** build up by suit (A, 2, 3 … K); only an Ace may start an empty foundation.
- **Tableau** builds down in alternating colors (e.g. red 10 on black Jack).
- **Empty Tableau priority:** an empty tableau slot must be filled from your **Reserve**
  first. Only when your Reserve is empty may you fill an empty slot from your Waste or
  another Tableau column.
- Moving from Reserve → Tableau/Foundation, Waste → Tableau/Foundation,
  Tableau → Tableau/Foundation.
- Drawing (Stock → Waste) ends your turn; when your Stock runs out, your Waste is turned
  over to form a fresh Stock.
- Emptying your Reserve wins the game.

## Tech

Plain HTML/CSS/JavaScript — no frameworks, no network calls. All game state and rule
validation live in `index.html`. A tiny `window.__touch` debug hook is exposed for
automated testing.
