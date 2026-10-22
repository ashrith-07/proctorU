// Builds the downloadable exam report from the backend's session record.
const backend = require('./backend.cjs');
const snapshots = require('./snapshots.cjs');

const SESSION_ID = /^session-[\w-]+$/;

async function fetchSession(sessionId) {
  if (typeof sessionId !== 'string' || !SESSION_ID.test(sessionId)) throw new Error('Invalid session id');
  const res = await fetch(`${backend.getApiBase()}/exam/session/${sessionId}`);
  if (!res.ok) throw new Error('Session not found');
  return res.json();
}

function toText(s) {
  const lines = [
    'ATHENA EXAM REPORT',
    '==================',
    `Name:        ${s.name}`,
    `User ID:     ${s.userId}`,
    `Session:     ${s.sessionId}`,
    `Started:     ${s.startedAt}`,
    `Submitted:   ${s.submittedAt ?? 'not submitted'}`,
    '',
    `Attempted:   ${s.attempted}`,
    `Correct:     ${s.correct}`,
    `Wrong:       ${s.wrong}`,
    `Violations:  ${s.violations.length}`,
    '',
    'Violation log',
    '-------------',
    ...(s.violations.length ? s.violations.map((v) => `${v.at}  ${v.type}${v.detail ? ` (${v.detail})` : ''}`) : ['None']),
    '',
    `Snapshots saved in: ${snapshots.getBaseFolder()}/${s.sessionId}`,
  ];
  return `${lines.join('\n')}\n`;
}

// `.json` => full session record, anything else => readable text
async function build(sessionId, filePath) {
  const session = await fetchSession(sessionId);
  return filePath.toLowerCase().endsWith('.json') ? `${JSON.stringify(session, null, 2)}\n` : toText(session);
}

module.exports = { build, SESSION_ID };
