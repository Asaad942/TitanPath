# TitanPath

A minimal Electron + React (Vite + TypeScript) desktop MVP for tracking weekly habits with a local SQLite database.

## Features
- Two screens: Habit Tracker (interactive weekly grid) and Dashboard (weekly completion and simple chart)
- Local SQLite database seeded with 3 example habits and sample logs
- Live toggling of habit completions with instant dashboard updates

## Getting started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Run the app in development** (starts Vite and Electron together)
   ```bash
   npm run dev
   ```
   The Electron window will open automatically once the renderer is ready.

3. **Build the renderer bundle** (optional)
   ```bash
   npm run build
   ```

Notes:
- The SQLite database is stored in Electron's `userData` directory (typically under your OS user profile) and seeds itself with sample data on first run.
- If you want to reset the data, delete the `habits.sqlite` file from the `userData` folder while the app is closed.
