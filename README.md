# codekeytype

> A modern, vibrant code typing speed trainer inspired by Monkeytype, built specifically for programmers.

![CodeKeyType Banner](https://img.shields.io/badge/CodeKeyType-Vibrant%20Code%20Typing-emerald?style=for-the-badge)
![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?style=flat-square&logo=typescript)
![Vite](https://img.shields.io/badge/Vite-8.3-purple?style=flat-square&logo=vite)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-cyan?style=flat-square&logo=tailwindcss)

---

## ✨ Features

- **🎨 Vibrant Syntax Highlighting & Visual Ergonomics**:
  - Dimmed, high-contrast untyped tokens (`text-theme-sub/65`).
  - Correctly typed code lights up in vivid, saturated syntax highlighting (emerald strings, amber keywords, sky blue functions, orange numbers, purple types/classes).
  - **Zero Red in Syntax**: Operators (`=`, `+`, `*`) and tokens are rendered in clean slate and gold tones so they are never confused with typos. Typos stand out distinctly with custom error styling.

- **💾 Custom Code & Preset Manager (`Ctrl+V`)**:
  - Quickly paste any code snippet from your clipboard with `Ctrl+V`.
  - Save custom snippets with title, language, and category directly into local browser storage.
  - Track personal best WPM, accuracy, and completions across every preset.

- **⌨️ Authentic IDE Auto-Pairing**:
  - Typing `(`, `'`, `"`, `[`, `{`, or `` ` `` automatically spawns the closing pair ahead of your cursor (`(' | ')`).
  - Press <kbd>Tab</kbd> to jump cleanly out of the active pair.
  - **Strict Syntax Integrity**: Semicolons (`;`) are strictly required and cannot be accidentally bypassed by `Enter` or `Tab`.

- **🧠 Blind Memory Training Modes**:
  - **Semi-Blind**: Random tokens and code chunks disappear from view (customizable intensity from 15% to 85%), revealing themselves as you type.
  - **Blind (Line Flash & Disappear)**: Each line flashes visible briefly for you to memorize before disappearing. Supports sub-second durations down to `100ms` (`0.1s` - `3.0s`) and flashes line 1 upon starting the test. Click the status badge to re-flash the line anytime.
  - **Fully Blind (Comment-Only Challenge)**: Only code comments remain visible as mental guidance—all code is invisible until you type it!

- **🔊 Web Audio Mechanical Sound Synthesis**:
  - Realistic key switches synthesized natively with the Web Audio API (no external audio assets required):
    - *Mechanical Click* (Cherry MX Blue profile)
    - *Thock* (Holy Panda / Lubed Linear profile)
    - *Typewriter*
    - *Electronic Beep*
  - Volume slider and one-click mute in header.

- **📊 Comprehensive Stats & SVG Analytics**:
  - Live WPM, Raw WPM, CPM, Accuracy %, Consistency %, and Char Breakdown (correct, incorrect, extra, missed).
  - Interactive SVG performance graph plotting WPM and error occurrences over time.

- **🌈 Multiple Built-in Themes**:
  - *Serika Dark*, *Carbon*, *Dracula*, *Nord*, *Catppuccin Mocha*, *Matrix*, *Monokai Pro*, and *Cyberpunk Neon*.

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) or [pnpm](https://pnpm.io/)

### Installation

```bash
# Clone the repository
git clone https://github.com/belttoast/codekeytype.git
cd codekeytype

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```

### Build & Production Preview

```bash
# Type check and build
npm run build

# Preview production build locally
npm run preview
```

---

## 🛠️ Tech Stack

- **Framework**: React 19 + TypeScript
- **Bundler & Tooling**: Vite 8, Oxlint
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Sound**: Native Web Audio API Synthesizer

---

## 📄 License

MIT © [belttoast](https://github.com/belttoast)
