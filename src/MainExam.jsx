// MainExam.jsx
// Login → Exam (one question at a time) → Result

import { useState } from 'react';

const API = 'http://localhost:3000';

function MainExam() {
  const [view, setView] = useState('login');

  // Login
  const [name, setName] = useState('');
  const [userId, setUserId] = useState('');
  const [loginError, setLoginError] = useState('');

  // Exam
  const [sessionId, setSessionId] = useState('');
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});   // { [questionId]: optionIndex }
  const [attempted, setAttempted] = useState(0);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Result
  const [result, setResult] = useState(null);

  // ── Start session ──────────────────────────────
  async function handleStartExam() {
    setLoginError('');
    if (!name.trim() || !userId.trim()) {
      setLoginError('Both Name and User ID are required.');
      return;
    }
    try {
      const res = await fetch(`${API}/exam/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userId.trim(), name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setLoginError(data.message); return; }
      setSessionId(data.sessionId);
      await loadQuestions();
      setView('exam');
    } catch {
      setLoginError('Could not connect to the exam server. Make sure it is running.');
    }
  }

  // ── Fetch questions ────────────────────────────
  async function loadQuestions() {
    setLoadingQuestions(true);
    try {
      const res = await fetch(`${API}/exam/mcq`);
      const data = await res.json();
      setQuestions(data);
    } catch {
      alert('Failed to load questions.');
    } finally {
      setLoadingQuestions(false);
    }
  }

  // ── Submit one answer ──────────────────────────
  async function handleAnswer(questionId, selectedAnswer) {
    if (answers[questionId] !== undefined) return;
    setAnswers(prev => ({ ...prev, [questionId]: selectedAnswer }));
    try {
      const res = await fetch(`${API}/exam/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, questionId, selectedAnswer }),
      });
      const data = await res.json();
      if (res.ok) setAttempted(data.attempted);
    } catch {
      console.error('Failed to submit answer.');
    }
  }

  // ── Submit exam ────────────────────────────────
  async function handleSubmitExam() {
    try {
      const res = await fetch(`${API}/exam/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (res.ok) { setResult(data.result); setView('result'); }
    } catch {
      alert('Failed to submit exam. Please try again.');
    }
  }

  // ══════════════════════════════════════════════
  //  LOGIN
  // ══════════════════════════════════════════════
  if (view === 'login') {
    return (
      <div className="me-center-page">
        <div className="me-login-card">
          <div className="me-login-header">
            <div className="me-brand-dot" />
            <span className="me-brand-label">Athena Exam</span>
          </div>

          <h1 className="me-login-title">Ready to begin?</h1>
          <p className="me-login-sub">Enter your details to start the exam.</p>

          <div className="me-form">
            <div className="me-field">
              <label className="me-label">Full Name</label>
              <input
                className="me-input"
                type="text"
                placeholder="e.g. Aditya Kumar"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>

            <div className="me-field">
              <label className="me-label">User ID</label>
              <input
                className="me-input"
                type="text"
                placeholder="e.g. student-101"
                value={userId}
                onChange={e => setUserId(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleStartExam()}
              />
            </div>

            {loginError && <p className="me-error">{loginError}</p>}

            <button className="me-btn-primary" onClick={handleStartExam}>
              Start Exam →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════
  //  EXAM  (one question at a time)
  // ══════════════════════════════════════════════
  if (view === 'exam') {
    const total = questions.length;
    const q = questions[currentIndex];
    const isAnswered = q ? answers[q.id] !== undefined : false;
    const isFirst = currentIndex === 0;
    const isLast = currentIndex === total - 1;

    return (
      <div className="me-exam-page">
        {/* Top bar */}
        <div className="me-exam-topbar">
          <span className="me-exam-title">Athena Exam</span>
          <span className="me-exam-attempted">Attempted: {attempted} / {total}</span>
        </div>

        {/* Progress dots */}
        <div className="me-dots">
          {questions.map((_, i) => (
            <button
              key={i}
              className={`me-dot ${i === currentIndex ? 'active' : ''} ${answers[questions[i]?.id] !== undefined ? 'done' : ''}`}
              onClick={() => setCurrentIndex(i)}
            />
          ))}
        </div>

        {/* Question card */}
        {loadingQuestions ? (
          <p className="me-loading">Loading questions…</p>
        ) : q ? (
          <div className="me-question-card">
            <p className="me-q-counter">Question {currentIndex + 1} of {total}</p>
            <p className="me-q-text">{q.question}</p>

            <div className="me-options">
              {q.options.map((option, optIndex) => {
                const isSelected = answers[q.id] === optIndex;
                return (
                  <button
                    key={optIndex}
                    className={`me-option ${isSelected ? 'me-option-selected' : ''} ${isAnswered ? 'me-option-locked' : ''}`}
                    onClick={() => handleAnswer(q.id, optIndex)}
                    disabled={isAnswered}
                  >
                    <span className="me-option-letter">{String.fromCharCode(65 + optIndex)}</span>
                    <span className="me-option-text">{option}</span>
                    {isSelected && <span className="me-option-check">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Navigation */}
        <div className="me-nav-row">
          <button
            className="me-btn-nav"
            disabled={isFirst}
            onClick={() => setCurrentIndex(i => i - 1)}
          >
            ← Prev
          </button>

          {isLast ? (
            <button
              className="me-btn-submit"
              disabled={attempted === 0}
              onClick={handleSubmitExam}
            >
              Submit Exam
            </button>
          ) : (
            <button
              className="me-btn-nav me-btn-next"
              onClick={() => setCurrentIndex(i => i + 1)}
            >
              Next →
            </button>
          )}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════
  //  RESULT
  // ══════════════════════════════════════════════
  if (view === 'result') {
    const skipped = questions.length - (result?.attempted ?? 0);
    return (
      <div className="me-center-page">
        <div className="me-result-card">
          <div className="me-result-icon">🎉</div>
          <h1 className="me-result-title">Exam Submitted</h1>
          <p className="me-result-sub">Well done, {name}!</p>

          <div className="me-result-grid">
            <div className="me-stat me-stat-neutral">
              <span className="me-stat-val">{result?.attempted ?? 0}</span>
              <span className="me-stat-label">Attempted</span>
            </div>
            <div className="me-stat me-stat-correct">
              <span className="me-stat-val">{result?.correct ?? 0}</span>
              <span className="me-stat-label">Correct</span>
            </div>
            <div className="me-stat me-stat-wrong">
              <span className="me-stat-val">{result?.wrong ?? 0}</span>
              <span className="me-stat-label">Wrong</span>
            </div>
            <div className="me-stat me-stat-skipped">
              <span className="me-stat-val">{skipped}</span>
              <span className="me-stat-label">Skipped</span>
            </div>
          </div>

          <p className="me-session-id">Session: {sessionId}</p>
        </div>
      </div>
    );
  }
}

export default MainExam;
