# Find the Number (FInd_Number) — v2.0

A tactile, minimalist number search web game built for desktop and mobile web. Players find numbers in sequential order (1 to 20, 1 to 50, 1 to 100, or through 20 curated campaign stages) with dynamic shuffles, audio feedback, tactile animations, and clean editorial visuals.

Built with pure vanilla HTML5, CSS3, and modern ES Modules with **zero runtime dependencies**.

---

## What's New in v2.0 (CrazyGames Launch Edition)

### 1. 20-Level Campaign Progression
- **20 Handcrafted Levels** with progressive difficulty curves.
- Escalating mechanics:
  - **Fixed Numbers** (Levels 1–4)
  - **Dynamic Shuffling** on tap (Levels 5–9)
  - **Rotational Drift & Disorientation** (Levels 10–14)
  - **Grandmaster Combinations** up to 80 numbers (Levels 15–20)
- **Generous & Satisfying 3-Star System**: Balanced thresholds tuned for human scan speed and board shuffle delays so high performance is genuinely rewarded with 3 stars.
- **HUD Star Tracker**: Both Desktop and Mobile HUDs display active 3★ target time (e.g., `3★ < 22s`) in real time during the round.

### 2. Daily Challenge & Streak System
- Generates a unique, deterministic daily number puzzle refreshed every 24 hours based on the local calendar date.
- **Streak Tracking**: Encourages Day-1 and multi-day retention with streak counters (`🔥 X Days`) saved in persistent storage.
- Direct quick-launch hero card on the main menu.

### 3. Tactile Juice & Game Feel
- **60 FPS Canvas Confetti System**: Dynamic multi-colored confetti particles explode on 3-star campaign clears and record-breaking runs.
- **Wrong-Tap Visual & Haptic Feedback**: Tapping an incorrect number triggers an immediate localized red-shake animation on the tile, a subtle container screen-shake, and mobile vibration (`navigator.vibrate(50)`).
- **Record Fanfare**: Breaking a personal best triggers an arpeggiated major-chord audio fanfare and displays an emerald-pulsing `NEW BEST!` badge.
- **Combo Multipliers**: Sequential taps within 1.2s build a combo counter accompanied by rising pitch audio notes.

### 4. CrazyGames Player Profile & Cloud Sync Integration
- **Live Platform Identity**: Directly queries `window.CrazyGames.SDK.user.getUser()` to show the player's authentic CrazyGames avatar, username, and country code badge on the menu header and stats modal.
- **Dynamic Auth Listener**: Listens to `addAuthListener` for instant login updates without page reloads.
- **Cloud Progress Indicator**: Reassures players that campaign stars, high scores, and daily streaks are securely synced with CrazyGames Cloud Data.
- **Guest Mode Fallback**: Provides a gentle, non-intrusive "Sign In" option (`showAuthPrompt()`) for guest players.

### 5. Comprehensive Personal Bests & Stats Modal
- Live stats modal tracking:
  - **Player Account & Cloud Status**: Displays profile info and sync indicator.
  - **Campaign Stars**: Total stars earned (e.g., `15 / 60 ⭐`) and current highest unlocked stage.
  - **Daily Streak**: Current active streak and today's completion status.
  - **Classic Bests**: Formatted personal records across Easy (1–20), Medium (1–50), and Hard (1–100).

### 6. CrazyGames SDK v3 Full Lifecycle Compliance
- Seamless lifecycle management:
  - `gameplayStart()` called on first tile tap or countdown complete.
  - `gameplayStop()` called on round completion or pause.
  - `happyTime()` fired on 3-star level wins, record times, and daily completions.
  - Rewarded video ad integration for free in-game hints.
  - Responsive banner ads with dedicated containers.
  - Automatic fallback to `localStorage` when testing offline or running outside CrazyGames.

---

## Project Structure

```
├── index.html          # Core game entrypoint & DOM structure
├── package.json        # NPM package config & scripts
├── build.js            # Production bundler for dist & CrazyGames zip
├── .gitignore          # Git exclusion rules
├── css/
│   ├── main.css        # Design tokens, theme variables, base styling
│   ├── ui.css          # Screens, headers, modal dialogs, buttons
│   ├── board.css       # Number grid layout, shake animations & bubbles
│   └── responsive.css  # Mobile and desktop responsive scaling
├── js/
│   ├── main.js         # Game coordinator, HUD updates & screen controller
│   ├── board.js        # Board generator, layout math & tactile interaction
│   ├── audio.js        # Procedural Web Audio API sound synthesizer & fanfare
│   ├── config.js       # Game tuning, campaign stages & 3-star thresholds
│   ├── platform.js     # CrazyGames SDK v3 adapter & fallbacks
│   ├── state.js        # Reactive game session state
│   ├── storage.js      # Local persistence for scores, stars & daily streak
│   ├── strings.js      # Game UI labels and copy
│   ├── target-circle.js# Visual target indicator component
│   └── timer.js        # Millisecond-precision timer logic
└── img/                # UI assets (trophy, home hero, icons, backgrounds)
```

---

## Getting Started

### Prerequisites
- Node.js (v18+) or any static HTTP server (Python, http-server, Live Server).

### Run Locally
Serve the root directory using any local server:

```bash
# Using Python
python -m http.server 8080

# Or using npx
npx serve .
```

Open `http://localhost:8080` in your browser.

### Production Build
To create a production distribution in `./dist` and package a release archive:

```bash
node build.js
```

This will:
1. Bundle all runtime files into `dist/`.
2. Generate `find-the-number-crazygames.zip` ready for CrazyGames developer portal upload.

---

## License
MIT License.
