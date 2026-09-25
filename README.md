# Find the Number (FInd_Number)

A tactile, minimalist number search web game. Players find numbers in sequential order (1 to 20, 1 to 50, or 1 to 100) with dynamic shuffles, audio feedback, and clean editorial visuals.

Built with pure vanilla HTML5, CSS3, and modern JavaScript (ES Modules).

---

## Features

- **Modes & Difficulties**:
  - **Easy**: 1 to 20 numbers, relaxed timer.
  - **Medium**: 1 to 50 numbers, balanced speed.
  - **Hard**: 1 to 100 numbers, intense tactical search.
- **Themes**:
  - **Dark Mode**: Charcoal chalkboard with chalk aesthetic.
  - **Light Mode**: Warm editorial paper and ink aesthetic.
- **Procedural Web Audio**:
  - High-performance, zero-dependency sound effects and ambient music synthesized via the Web Audio API.
- **Platform Ready**:
  - Native integration with the **CrazyGames SDK v3** (gameplay start/stop, happy-time events, rewarded hints, banners).
  - Robust offline fallback to `localStorage` when running outside the platform.
- **Responsive Layout**:
  - Fully adaptive interface optimized for mobile and desktop screens with safe-area insets.

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
│   ├── board.css       # Number grid layout & bubble animations
│   └── responsive.css  # Mobile and desktop responsive scaling
├── js/
│   ├── main.js         # Game coordinator & screen controller
│   ├── board.js        # Board generator & collision/click detection
│   ├── audio.js        # Web Audio API procedural synthesizer
│   ├── config.js       # Game tuning & difficulty settings
│   ├── platform.js     # CrazyGames SDK v3 adapter & fallbacks
│   ├── state.js        # Reactive game session state
│   ├── storage.js      # Local persistence for scores & settings
│   ├── strings.js      # Game UI labels and copy
│   ├── target-circle.js# Visual target indicator component
│   └── timer.js        # Millisecond-precision timer logic
└── img/                # Essential UI runtime assets (icons, logo, backgrounds)
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
