const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { startServer } = require('../backend/server.cjs');

let server, base, dataDir;

before(async () => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'athena-test-'));
  server = await startServer({ dataDir });
  base = `http://127.0.0.1:${server.port}`;
});
after(async () => {
  await server.close();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

const post = (url, body) =>
  fetch(base + url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

async function newSession() {
  const res = await post('/exam/start', { userId: 'u1', name: 'Test User' });
  assert.equal(res.status, 201);
  return (await res.json()).sessionId;
}

test('questions never expose the correct answer', async () => {
  const list = await (await fetch(`${base}/exam/mcq`)).json();
  assert.ok(list.length >= 5);
  for (const q of list) assert.equal('correctAnswer' in q, false);
  const one = await (await fetch(`${base}/exam/mcq/1`)).json();
  assert.equal(one.id, 1);
  assert.equal((await fetch(`${base}/exam/mcq/9999`)).status, 404);
});

test('start validates input and creates unique sessions', async () => {
  assert.equal((await post('/exam/start', { userId: '', name: 'x' })).status, 400);
  assert.equal((await post('/exam/start', {})).status, 400);
  const [a, b] = [await newSession(), await newSession()];
  assert.notEqual(a, b);
});

test('answer flow: score, duplicates, invalid options', async () => {
  const sessionId = await newSession();
  const q = JSON.parse(fs.readFileSync(path.join(__dirname, '../backend/data/questions.json')))[0];

  assert.equal((await post('/exam/answer', { sessionId, questionId: 1, selectedAnswer: 99 })).status, 400);
  assert.equal((await post('/exam/answer', { sessionId, questionId: 1, selectedAnswer: 'abc' })).status, 400);

  const ok = await (await post('/exam/answer', { sessionId, questionId: 1, selectedAnswer: q.correctAnswer })).json();
  assert.equal(ok.isCorrect, true);
  assert.equal(ok.attempted, 1);

  assert.equal((await post('/exam/answer', { sessionId, questionId: 1, selectedAnswer: 0 })).status, 409);
  assert.equal((await post('/exam/answer', { sessionId: 'nope', questionId: 1, selectedAnswer: 0 })).status, 404);
});

test('violations are recorded and validated', async () => {
  const sessionId = await newSession();
  assert.equal((await post('/exam/violation', { sessionId, type: 'bogus' })).status, 400);
  const res = await (await post('/exam/violation', { sessionId, type: 'window-blur', detail: 'switched app' })).json();
  assert.equal(res.count, 1);
});

test('submit is idempotent and locks the session', async () => {
  const sessionId = await newSession();
  await post('/exam/answer', { sessionId, questionId: 1, selectedAnswer: 0 });
  const first = await (await post('/exam/submit', { sessionId })).json();
  const second = await (await post('/exam/submit', { sessionId })).json();
  assert.deepEqual(first.result, second.result);
  assert.equal(first.result.attempted, 1);
  assert.equal((await post('/exam/answer', { sessionId, questionId: 2, selectedAnswer: 0 })).status, 409);
  assert.equal((await post('/exam/violation', { sessionId, type: 'window-blur' })).status, 409);
  assert.equal((await post('/exam/submit', {})).status, 400);
});

test('malformed JSON gives a JSON 400, and sessions persist to disk', async () => {
  const res = await fetch(`${base}/exam/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad' });
  assert.equal(res.status, 400);
  const saved = JSON.parse(fs.readFileSync(path.join(dataDir, 'sessions.json')));
  assert.ok(saved.length >= 1);
});
