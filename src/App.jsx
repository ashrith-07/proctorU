// App.jsx
// Handles: OS theme detection, setup screen (camera + fullscreen + screen share), then renders MainExam.

import { useEffect, useRef, useState } from 'react';
import './App.css';
import MainExam from './MainExam';

function App() {
  const [view, setView] = useState('setup'); // 'setup' | 'exam'
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  const [screenEnabled, setScreenEnabled] = useState(false);
  const [timer, setTimer] = useState('');
  const videoRef = useRef(null);
  const screenStreamRef = useRef(null);

  // ─── Apply OS theme on mount and listen for changes
  useEffect(() => {
    async function applyTheme() {
      const theme = await window.athena.getTheme();
      document.documentElement.setAttribute('data-theme', theme);
    }
    applyTheme();

    const removeThemeListener = window.athena.onThemeChange((theme) => {
      document.documentElement.setAttribute('data-theme', theme);
    });

    return () => removeThemeListener();
  }, []);

  // ─── Block copy/paste/cut/select-all shortcuts
  useEffect(() => {
    const blocked = ['c', 'v', 'x', 'a'];
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && blocked.includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);


  async function saveVideoScreenShots() {
    if (!videoRef.current || !videoRef.current.srcObject) return;
    try {
      const track = videoRef.current.srcObject.getVideoTracks()[0];
      if (!track) return;
      const imageCapture = new ImageCapture(track);
      const blob = await imageCapture.takePhoto();
      const arrayBuffer = await blob.arrayBuffer();
      window.athena.storeCameraSnapImageOnDisk(arrayBuffer);
    } catch (error) {
      console.error('Failed to capture camera image:', error);
    }
  }

  async function saveScreenShot() {
    const stream = screenStreamRef.current;
    if (!stream) return;
    try {
      const track = stream.getVideoTracks()[0];
      if (!track) return;
      const canvas = document.createElement('canvas');
      const video = document.createElement('video');
      video.srcObject = new MediaStream([track]);
      await video.play();
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      video.pause();
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
      const arrayBuffer = await blob.arrayBuffer();
      window.athena.storeScreenSnapImageOnDisk(arrayBuffer);
    } catch (err) {
      console.error('Screen capture failed:', err);
    }
  }

  useEffect(() => {
    const removeTimerListener = window.athena.registerListenerForTimerTickFromMain(setTimer);
    const removeCameraListener = window.athena.registerListenerForCameraSnapFromMain(saveVideoScreenShots);
    const removeScreenListener = window.athena.registerListenerForScreenShotFromMain(saveScreenShot);
    return () => {
      removeTimerListener();
      removeCameraListener();
      removeScreenListener();
    };
  }, []);

  async function getCameraAccess() {
    try {
      const videoData = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = videoData;
      setCameraEnabled(true);
    } catch {
      alert('Cannot access Camera');
    }
  }

  async function enableFullScreen() {
    try {
      await document.documentElement.requestFullscreen();
      setFullScreen(true);
    } catch {
      alert('Cannot access full screen');
    }
  }

  // ─── Called when user clicks "Enable Screen Share" in setup
  async function enableScreenShare() {
    try {
      const sourceId = await window.athena.getScreenSource();
      if (!sourceId) { alert('No screen source found.'); return; }
      // Use the user's actual display resolution (accounts for Retina/HiDPI)
      const w = Math.round(window.screen.width * window.devicePixelRatio);
      const h = Math.round(window.screen.height * window.devicePixelRatio);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId,
            maxWidth: w,
            maxHeight: h
          }
        }
      });
      screenStreamRef.current = stream;
      setScreenEnabled(true);
    } catch {
      alert('Cannot access Screen Share');
    }
  }

  // ─── Render MainExam once setup is done
  if (view === 'exam') {
    return <MainExam />;
  }

  // ─── Setup View
  return (
    <div className="page-container">
      <div className="card-container">
        {/* Camera */}
        <div className="permission-item">
          <div className="permission-content">
            <h3>Configure Camera</h3>
            <p>Kindly configure Camera to attempt quiz/contests.</p>
            <div className="action-row">
              <button
                className="btn btn-black"
                disabled={cameraEnabled}
                onClick={getCameraAccess}
              >
                {cameraEnabled ? 'Camera Connected' : 'Get Camera Access'}
              </button>
              <video ref={videoRef} autoPlay playsInline className="video-preview" />
            </div>
          </div>
        </div>

        <div className="divider"></div>

        {/* Fullscreen */}
        <div className="permission-item">
          <div className="permission-content">
            <h3>Switch to Full Screen</h3>
            <button
              className="btn btn-primary"
              disabled={fullScreen}
              onClick={enableFullScreen}
            >
              {fullScreen ? 'Full Screen Enabled' : 'Give Full Screen Permissions'}
            </button>
          </div>
        </div>

        <div className="divider"></div>

        {/* Screen Share */}
        <div className="permission-item">
          <div className="permission-content">
            <h3>Enable Screen Share</h3>
            <p>Required to monitor your screen during the exam.</p>
            <button
              className="btn btn-black"
              disabled={screenEnabled}
              onClick={enableScreenShare}
            >
              {screenEnabled ? 'Screen Share Enabled' : 'Enable Screen Share'}
            </button>
          </div>
        </div>
      </div>

      {/* Go To Test */}
      <div className="bottom-actions">
        <button
          className="btn btn-primary"
          disabled={!cameraEnabled || !fullScreen || !screenEnabled}
          onClick={async () => {
            try { await window.athena.startTimerOnMain(); } catch (error) { console.error(error); }
            setView('exam');
          }}
        >
          Go To Test
        </button>
      </div>

      {timer !== '' && (
        <div className="muted" style={{ marginTop: '8px', fontSize: '13px' }}>
          {timer} (s) elapsed
        </div>
      )}
    </div>
  );
}

export default App;