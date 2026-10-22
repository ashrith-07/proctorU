// Small Express backend for the exam. JSON files act as the database:
//   questions.json (read-only, bundled)  and  <dataDir>/sessions.json (read/write)
// It is started by the Electron main process (see app/services/backend.cjs),
// but can also run on its own with `npm run backend`.
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const EXAM_CONFIG = {
  durationSeconds: 10 * 60, // total exam time
  maxViolations: 5, // exam is auto-submitted after this many violations
};

const VIOLATION_TYPES = [
  'window-blur',
  'fullscreen-exit',
  'multiple-displays',
  'system-suspend',
  'copy-paste',
  'devtools-shortcut',
];

// Pages that may call the API: the packaged app (file:// => Origin "null") and the Vite dev server
const ALLOWED_ORIGINS = new Set(['null', 'http://localhost:5174', 'http://127.0.0.1:5174']);

function createApp({ dataDir }) {
  const questionsPath = path.join(__dirname, 'data', 'questions.json');
  const sessionsPath = path.join(dataDir, 'sessions.json');
  fs.mkdirSync(dataDir, { recursive: true });

  const readQuestions = () => JSON.parse(fs.readFileSync(questionsPath, 'utf-8'));

  function readSessions() {
    try {
      return JSON.parse(fs.readFileSync(sessionsPath, 'utf-8'));
    } catch (error) {
      if (error.code !== 'ENOENT') {
        // Corrupt file: keep a copy for debugging and start fresh instead of crashing
        try { fs.renameSync(sessionsPath, `${sessionsPath}.corrupt-${Date.now()}`); } catch { /* ignore */ }
      }
      return [];
    }
  }

  // Write to a temp file then rename, so a crash can never leave half a JSON file
  function saveSessions(sessions) {
    const tmp = `${sessionsPath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(sessions, null, 2));
    fs.renameSync(tmp, sessionsPath);
  }

  // Never send the correct answer to the frontend
  const questionForStudent = ({ id, question, options }) => ({ id, question, options });

  const findSession = (sessions, sessionId) =>
    typeof sessionId === 'string' ? sessions.find((s) => s.sessionId === sessionId) : undefined;

  const resultOf = (session) => ({
    attempted: session.attempted,
    correct: session.correct,
    wrong: session.wrong,
    violations: session.violations.length,
  });

  const app = express();
  app.use(cors({ origin: (origin, cb) => cb(null, !origin || ALLOWED_ORIGINS.has(origin)) }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/', (_req, res) => res.json({ message: 'Exam backend is running' }));

  app.get('/exam/config', (_req, res) =>
    res.json({ ...EXAM_CONFIG, totalQuestions: readQuestions().length }));

  // Start a new exam session
  app.post('/exam/start', (req, res) => {
    const userId = String(req.body?.userId ?? '').trim();
    const name = String(req.body?.name ?? '').trim();
    if (!userId || !name) {
      return res.status(400).json({ message: 'userId and name are required' });
    }
    if (userId.length > 50 || name.length > 80) {
      return res.status(400).json({ message: 'userId or name is too long' });
    }

    const sessions = readSessions();
    const session = {
      sessionId: `session-${crypto.randomUUID()}`,
      userId,
      name,
      startedAt: new Date().toISOString(),
      submittedAt: null,
      status: 'in-progress',
      attempted: 0,
      correct: 0,
      wrong: 0,
      answers: [],
      violations: [],
    };
    sessions.push(session);
    saveSessions(sessions);

    res.status(201).json({ message: 'Exam session started', sessionId: session.sessionId });
  });

  app.get('/exam/mcq/:id', (req, res) => {
    const question = readQuestions().find((item) => item.id === Number(req.params.id));
    if (!question) return res.status(404).json({ message: 'Question not found' });
    res.json(questionForStudent(question));
  });

  app.get('/exam/mcq', (_req, res) => res.json(readQuestions().map(questionForStudent)));

  // Submit one answer
  app.post('/exam/answer', (req, res) => {
    const { sessionId, questionId, selectedAnswer } = req.body ?? {};
    if (!sessionId || questionId === undefined || selectedAnswer === undefined) {
      return res.status(400).json({ message: 'sessionId, questionId and selectedAnswer are required' });
    }

    const question = readQuestions().find((item) => item.id === Number(questionId));
    if (!question) return res.status(404).json({ message: 'Question not found' });

    const choice = Number(selectedAnswer);
    if (!Number.isInteger(choice) || choice < 0 || choice >= question.options.length) {
      return res.status(400).json({ message: 'selectedAnswer is not a valid option' });
    }

    const sessions = readSessions();
    const session = findSession(sessions, sessionId);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (session.status !== 'in-progress') {
      return res.status(409).json({ message: 'Exam is already submitted' });
    }
    if (session.answers.some((a) => a.questionId === question.id)) {
      return res.status(409).json({ message: 'Question already answered' });
    }

    const isCorrect = choice === question.correctAnswer;
    session.answers.push({
      questionId: question.id,
      selectedAnswer: choice,
      isCorrect,
      answeredAt: new Date().toISOString(),
    });
    session.attempted += 1;
    if (isCorrect) session.correct += 1;
    else session.wrong += 1;
    saveSessions(sessions);

    res.json({
      message: 'Answer saved',
      isCorrect,
      attempted: session.attempted,
      correct: session.correct,
      wrong: session.wrong,
    });
  });

  // Record a proctoring violation (focus lost, left fullscreen, ...)
  app.post('/exam/violation', (req, res) => {
    const { sessionId, type, detail } = req.body ?? {};
    if (!sessionId || !VIOLATION_TYPES.includes(type)) {
      return res.status(400).json({ message: 'sessionId and a valid violation type are required' });
    }

    const sessions = readSessions();
    const session = findSession(sessions, sessionId);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (session.status !== 'in-progress') {
      return res.status(409).json({ message: 'Exam is already submitted' });
    }

    session.violations.push({
      type,
      detail: typeof detail === 'string' ? detail.slice(0, 200) : '',
      at: new Date().toISOString(),
    });
    saveSessions(sessions);

    res.status(201).json({
      message: 'Violation recorded',
      count: session.violations.length,
      maxViolations: EXAM_CONFIG.maxViolations,
    });
  });

  // Current session progress
  app.get('/exam/session/:sessionId', (req, res) => {
    const session = findSession(readSessions(), req.params.sessionId);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    res.json(session);
  });

  // Submit the whole exam (calling it again returns the same result)
  app.post('/exam/submit', (req, res) => {
    const { sessionId } = req.body ?? {};
    if (!sessionId) return res.status(400).json({ message: 'sessionId is required' });

    const sessions = readSessions();
    const session = findSession(sessions, sessionId);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    if (session.status !== 'submitted') {
      session.status = 'submitted';
      session.submittedAt = new Date().toISOString();
      saveSessions(sessions);
    }

    res.json({ message: 'Exam submitted successfully', result: resultOf(session) });
  });

  // JSON error for malformed bodies etc.
  // eslint-disable-next-line no-unused-vars
  app.use((error, _req, res, _next) => {
    const status = error.status || 500;
    res.status(status).json({ message: status === 500 ? 'Internal server error' : error.message });
  });

  return app;
}

// Start listening on loopback only (not reachable from other machines).
// port 0 = let the OS pick a free port.
function startServer({ dataDir, port = 0 }) {
  const app = createApp({ dataDir });
  return new Promise((resolve, reject) => {
    const server = app.listen(port, '127.0.0.1', () => {
      resolve({
        port: server.address().port,
        close: () => new Promise((done) => server.close(done)),
      });
    });
    server.on('error', reject);
  });
}

module.exports = { createApp, startServer, EXAM_CONFIG, VIOLATION_TYPES };

// `npm run backend` => stand-alone on a fixed port
if (require.main === module) {
  startServer({ dataDir: path.join(__dirname, 'data'), port: 3000 }).then(({ port }) =>
    console.log(`Exam backend running at http://127.0.0.1:${port}`));
}
