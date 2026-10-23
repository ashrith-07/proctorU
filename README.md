# Athena Exam

A proctored exam **desktop application** built with **Electron**, **React** and **Express**.
A student configures their camera and screen, takes a timed multiple-choice exam, and the app
watches for cheating signals (leaving the window, leaving full screen, extra monitors, sleep, copy/paste,
camera unplugged) while saving camera and screen snapshots.

Built for the "Desktop Application" assignment: it focuses on **desktop APIs, windows, IPC and
system-level interactions**.

## Features

| Area | What it does | Electron APIs used |
|---|---|---|
| Secure window | Sandboxed page, no Node access in the UI, no DevTools in the packaged app, blocked navigation, only camera + fullscreen permissions allowed, CSP in production | `BrowserWindow`, `webPreferences`, `session` permission handlers |
| IPC bridge | The UI talks to the main process only through a small `window.athena` API | `ipcMain`, `ipcRenderer`, `contextBridge` |
| Embedded backend | Express server started inside the app on a free local port; data kept in the OS app-data folder | `app.getPath('userData')` |
| Setup checklist | Camera, native full screen, screen-recording permission, snapshot folder, rules, consent dialog | `systemPreferences`, `dialog`, `shell` |
| Proctoring | Camera snapshot every 5 s (from the page), screenshot every 10 s (taken in the main process) | `desktopCapturer`, `screen`, `fs` |
| Violations | Window blur, leaving full screen (student is put back), second monitor, system sleep, copy/paste/right-click, DevTools shortcuts, camera lost. Native notification + banner; **5 violations auto-submit** | `BrowserWindow` events, `screen`, `powerMonitor`, `Notification` |
| Exam | 10 questions, 10-minute countdown with auto-submit on timeout, scores computed on the server (answers never reach the UI) | |
| Native touches | Dock/taskbar progress bar, application menu, submit & quit confirmations, report export with a save dialog, OS dark/light theme | `setProgressBar`, `Menu`, `dialog`, `nativeTheme` |
| Packaging | macOS `.dmg` with icon and permission descriptions | electron-builder |

## Architecture

```
┌────────────────────────── Electron main process (Node) ──────────────────────────┐
│  app/main.cjs        lifecycle, single instance, close confirmation              │
│  app/windows/        BrowserWindow creation + hardening                          │
│  app/ipc/            ipcMain handlers (backend, proctor, system, theme, dialogs, │
│                      exam)                                                       │
│  app/services/       proctor loop, snapshots, violations, permissions, settings, │
│                      screen capture, report, embedded backend                    │
│  app/menu.cjs        application menu                                            │
│  backend/server.cjs  Express API (JSON files as database)                        │
└───────────────▲──────────────────────────────────────────────────────────────────┘
                │ IPC (invoke / send / events)         HTTP on 127.0.0.1:<free port>
┌───────────────┴────────── preload.cjs (contextBridge) ────────────────────────────┐
│  window.athena = { getApiBase, startProctoring, onViolation, setFullScreen, ... } │
└───────────────▲──────────────────────────────────────────────────────────────────┘
                │
┌───────────────┴────────── Renderer (React, sandboxed) ────────────────────────────┐
│  src/App.jsx  Setup.jsx  MainExam.jsx  ViolationBanner.jsx  hooks/useCamera.js    │
└───────────────────────────────────────────────────────────────────────────────────┘
```

**Why this split?** The renderer (web page) can do anything a web page can, so it is kept
untrusted: it has no Node access and can only call the functions the preload script exposes.
Everything powerful (files, screenshots, dialogs, window control) lives in the main process.

### Typical flow

```
Setup screen ──► consent dialog ──► login ──► POST /exam/start ──► startProctoring(sessionId)
                                                              │
        main process: every 5 s  "camera-shot" ──► page grabs a webcam frame ──► saveCameraSnap
                      every 10 s desktopCapturer screenshot ──► saved to disk
                      on any violation ──► backend + notification + banner (5th = auto-submit)
                                                              │
Submit / time up / 5 violations ──► POST /exam/submit ──► stopProctoring ──► result + report
```

## Project structure

```
app/            Electron main process, preload, IPC handlers, services
backend/        Express API + question bank (backend/data/questions.json)
src/            React UI
test/           Backend API tests (node:test)
build/          App icon used by electron-builder
public/         Favicon
```

## Requirements

- Node.js 20+ and npm
- macOS for the `.dmg` build and the camera / screen-recording permission flow
  (the app itself also runs from source on other platforms)

## Run from source

```bash
npm install

# Development (hot reload) – use two terminals
npm run dev          # terminal 1: React dev server on :5174
npm run electron     # terminal 2: the desktop app

# Or run the production build locally in one command
npm start
```

### macOS permissions

- **Camera** – macOS asks the first time you click *Get Camera Access*.
- **Screen Recording** – click *Allow Screen Recording*, enable the app in
  *System Settings → Privacy & Security → Screen Recording*, then **quit and reopen the app**
  (macOS only applies this permission after a restart). When running from source the permission
  belongs to "Electron" / your terminal, not to "Athena Exam".

## Tests and lint

```bash
npm test        # 6 backend API tests
npm run lint
```

## Build the macOS app (.dmg)

```bash
npm run dist
```

Output: `release/Athena-Exam-<version>-arm64.dmg` (Apple Silicon).

The app is **ad-hoc signed, not notarized** (no paid Apple Developer account). If macOS says the
app "cannot be opened" or "is damaged" after downloading it, either right-click the app and choose
**Open**, or run:

```bash
xattr -cr "/Applications/Athena Exam.app"
```

## Where data is stored

`~/Library/Application Support/Athena Exam/` (macOS)

| File | Content |
|---|---|
| `sessions.json` | Exam sessions: answers, score, violations |
| `settings.json` | Chosen snapshot folder |
| `snapshots/<sessionId>/camera`, `.../screen` | JPEG snapshots (folder can be changed in the setup screen) |

## Backend API

The backend listens on `127.0.0.1` only (random free port, passed to the UI over IPC).

| Method & path | Purpose |
|---|---|
| `GET /exam/config` | Exam duration, violation limit, question count |
| `POST /exam/start` | Create a session `{ userId, name }` |
| `GET /exam/mcq` · `GET /exam/mcq/:id` | Questions (without the correct answer) |
| `POST /exam/answer` | Save one answer `{ sessionId, questionId, selectedAnswer }` |
| `POST /exam/violation` | Record a violation `{ sessionId, type, detail }` |
| `GET /exam/session/:id` | Session progress |
| `POST /exam/submit` | Finish the exam (idempotent) |

Run it on its own with `npm run backend` (port 3000, data in `backend/data/`).

## Configuration

| Setting | Where |
|---|---|
| Exam length (10 min), violation limit (5) | `EXAM_CONFIG` in `backend/server.cjs` |
| Snapshot intervals | `app/config.cjs` |
| `ATHENA_EXAM_SECONDS=30` | Shorten the exam for testing |
| `ATHENA_PROD=1` | Make `npm run electron` load the built `dist/` instead of the dev server |

## Known limitations

- Screen capture covers the primary display only.
- The `.dmg` is built for Apple Silicon; it is not notarized.
- Questions are fixed in `backend/data/questions.json`; sessions are stored in a JSON file, not a database.
- No student authentication – the name and ID are self-declared.
