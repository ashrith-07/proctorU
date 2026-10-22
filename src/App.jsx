// App.jsx — owns everything that must outlive a screen: OS theme, the camera stream,
// proctoring events from the main process. Screens: Setup checklist -> MainExam.
import { useEffect, useState } from 'react';
import './App.css';
import MainExam from './MainExam';
import Setup from './Setup';
import ViolationBanner from './ViolationBanner';
import { useCamera } from './hooks/useCamera';

function App() {
  const [view, setView] = useState('setup'); // 'setup' | 'exam'
  const [elapsed, setElapsed] = useState(0);
  const [counts, setCounts] = useState({ camera: 0, screen: 0 });
  const [violation, setViolation] = useState({ id: 0, count: 0, max: 5, message: '' });
  const camera = useCamera();
  const { captureJpeg } = camera;

  // ─── Apply OS theme on mount and follow changes
  useEffect(() => {
    window.athena.getTheme().then((theme) => document.documentElement.setAttribute('data-theme', theme));
    return window.athena.onThemeChange((theme) => document.documentElement.setAttribute('data-theme', theme));
  }, []);

  // ─── Block clipboard, context menu and dev-tools shortcuts; each attempt is a violation
  useEffect(() => {
    const clipboardKeys = ['c', 'v', 'x', 'a'];
    function handleKeyDown(e) {
      const key = e.key.toLowerCase();
      const mod = e.ctrlKey || e.metaKey;
      const devTools =
        key === 'f12' || (mod && e.shiftKey && ['i', 'j', 'c'].includes(key)) || (e.metaKey && e.altKey && key === 'i');
      if (devTools) {
        e.preventDefault();
        window.athena.reportViolation('devtools-shortcut');
      } else if (mod && clipboardKeys.includes(key)) {
        e.preventDefault();
        if (key !== 'a') window.athena.reportViolation('copy-paste');
      }
    }
    function block(e) {
      e.preventDefault();
      window.athena.reportViolation('copy-paste');
    }
    window.addEventListener('keydown', handleKeyDown);
    ['copy', 'cut', 'paste', 'contextmenu'].forEach((name) => window.addEventListener(name, block));
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      ['copy', 'cut', 'paste', 'contextmenu'].forEach((name) => window.removeEventListener(name, block));
    };
  }, []);

  // ─── Proctoring events pushed by the main process
  useEffect(() => {
    const offTimer = window.athena.onTimerTick(setElapsed);
    const offSaved = window.athena.onSnapshotSaved(({ counts }) => setCounts(counts));
    const offViolation = window.athena.onViolation((v) => setViolation((prev) => ({ ...v, id: prev.id + 1 })));
    const offError = window.athena.onProctorError(({ kind, message }) =>
      console.error(`Proctoring (${kind}):`, message));
    // Main asks for a webcam frame every few seconds; only the page can read the camera
    const offCamera = window.athena.onCameraShotRequest(async () => {
      try {
        const jpeg = await captureJpeg();
        if (jpeg) await window.athena.saveCameraSnap(jpeg);
      } catch (error) {
        console.error('Failed to save camera snapshot:', error);
      }
    });
    return () => {
      offTimer();
      offSaved();
      offViolation();
      offError();
      offCamera();
    };
  }, [captureJpeg]);

  function handleSessionStart(sessionId) {
    setViolation((prev) => ({ ...prev, count: 0, message: '', id: prev.id }));
    return window.athena.startProctoring(sessionId);
  }

  // Leaving the exam (submitted): stop the loop and give the student their screen back
  async function handleSessionEnd() {
    await window.athena.stopProctoring(); // first stop, otherwise leaving fullscreen is a violation
    await window.athena.setFullScreen(false);
  }

  if (view === 'exam') {
    return (
      <>
        <ViolationBanner violation={violation} />
        <MainExam
          stream={camera.stream}
          elapsed={elapsed}
          counts={counts}
          violation={violation}
          onSessionStart={handleSessionStart}
          onSessionEnd={handleSessionEnd}
        />
      </>
    );
  }

  return <Setup camera={camera} onReady={() => setView('exam')} />;
}

export default App;
