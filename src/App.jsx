// App.jsx — owns everything that must outlive a screen: OS theme, the camera stream,
// proctoring events from the main process. Screens: Setup checklist -> MainExam.
import { useEffect, useState } from 'react';
import './App.css';
import MainExam from './MainExam';
import Setup from './Setup';
import { useCamera } from './hooks/useCamera';

function App() {
  const [view, setView] = useState('setup'); // 'setup' | 'exam'
  const [elapsed, setElapsed] = useState(0);
  const [counts, setCounts] = useState({ camera: 0, screen: 0 });
  const camera = useCamera();
  const { captureJpeg } = camera;

  // ─── Apply OS theme on mount and follow changes
  useEffect(() => {
    window.athena.getTheme().then((theme) => document.documentElement.setAttribute('data-theme', theme));
    return window.athena.onThemeChange((theme) => document.documentElement.setAttribute('data-theme', theme));
  }, []);

  // ─── Block copy/paste/cut/select-all shortcuts
  useEffect(() => {
    const blocked = ['c', 'v', 'x', 'a'];
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && blocked.includes(e.key.toLowerCase())) e.preventDefault();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ─── Proctoring events pushed by the main process
  useEffect(() => {
    const offTimer = window.athena.onTimerTick(setElapsed);
    const offSaved = window.athena.onSnapshotSaved(({ counts }) => setCounts(counts));
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
      offError();
      offCamera();
    };
  }, [captureJpeg]);

  // Leaving the exam (submitted): stop the loop and give the student their screen back
  function handleSessionEnd() {
    window.athena.stopProctoring();
    window.athena.setFullScreen(false);
  }

  if (view === 'exam') {
    return (
      <MainExam
        stream={camera.stream}
        elapsed={elapsed}
        counts={counts}
        onSessionStart={(sessionId) => window.athena.startProctoring(sessionId)}
        onSessionEnd={handleSessionEnd}
      />
    );
  }

  return <Setup camera={camera} onReady={() => setView('exam')} />;
}

export default App;
