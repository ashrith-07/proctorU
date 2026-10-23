# Prompt History

This project (**Athena Exam**, an Electron proctored-exam desktop app) was built in a step-by-step
conversation with Claude (Claude Code). I worked in small parts: ask for one feature, test it, review
for bugs, fix them, then move on.

> These prompts are condensed from the full conversation: _<paste chat link here>_

---

## Part 1 – Secure, modular main process

**Prompt**
> Refactor the Electron main process into modules (windows, IPC, services). Harden the window
> (context isolation, sandbox, permissions, navigation) and make it load the built app in production
> instead of only `localhost`. Fix the bugs in the class code (intervals never stopped, listener leaks,
> sending to a destroyed window).

**Outcome:** `app/` split into `windows/`, `ipc/`, `services/`; CSP for production builds;
exam clock without duplicate timers.

## Part 2 – Embedded backend

**Prompt**
> Run the Express backend inside the app so nothing needs hosting. Use a free port, store data in the OS
> app-data folder, validate input, write files atomically, and add API tests. Add endpoints I will need
> later (exam config, violations) and more questions.

**Outcome:** `backend/server.cjs` as a reusable module, 6 automated tests, UUID session ids,
10 questions, renderer connects through an IPC-provided URL.

## Part 3 – Proctoring

**Prompt**
> Make camera and screen snapshots reliable. Take screenshots in the main process with
> `desktopCapturer`, grab webcam frames from a canvas instead of `ImageCapture`, handle the macOS
> camera and screen-recording permissions, remember the snapshot folder, and start/stop proctoring
> with the exam session.

**Outcome:** per-session snapshot folders, permissions service, setup checklist, live REC counters,
native fullscreen controlled from the main process.

## Part 4 – Violation detection

**Prompt**
> Detect cheating signals while the exam runs: window focus loss, leaving full screen, a second
> monitor, computer sleep, copy/paste, right-click and DevTools shortcuts. Record each one on the
> backend, show a native notification and a banner, and auto-submit after 5 violations.

**Outcome:** `violations` service with de-duplication, banner UI, auto-submit; fullscreen exit puts the
student back into full screen.

## Part 5 – Exam features

**Prompt**
> Add a countdown timer that auto-submits when time is up, a Dock progress bar, an application menu
> (no Edit menu on purpose), confirmation dialogs for submitting and for closing mid-exam, and a result
> page that can save a report through a save dialog, open the snapshots folder and quit.

**Outcome:** countdown, `Menu`, `setProgressBar`, dialogs, report export (txt/json); I also asked the
AI to test the native dialogs itself, which it did by granting Accessibility to the tool and clicking
through them.

## Part 6 – Packaging

**Prompt**
> Package the app as a macOS `.dmg` with electron-builder. It needs an icon, camera and screen
> permission descriptions, and it must launch properly. Test the packaged app end to end, not just the
> dev build.

**Outcome:** icon, electron-builder config, ad-hoc signing (the first build had an invalid signature),
packaged app verified through a full exam run.

## Part 7 – Docs and final audit

**Prompt**
> Re-read everything for bugs and gaps, fix them, and write a README with the architecture, run and
> build steps, the Gatekeeper workaround and the API reference.

**Outcome:** fixed `npm start`, forced full screen at exam start, camera-disconnect violation,
README.

---

## What I learned

- Electron's split between the **main process** (powerful, Node), the **renderer** (the web page,
  untrusted) and the **preload** bridge between them.
- **IPC** patterns: `invoke`/`handle` for request-response, `send` for one-way messages, and events
  pushed from main to the page.
- Native desktop features: dialogs, menus, notifications, Dock progress, screen capture, power and
  display events, OS permissions.
- Packaging and code signing on macOS, and why an invalid signature shows up as "app is damaged".
