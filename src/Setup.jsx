// Pre-exam checklist: camera, fullscreen, screen recording permission, snapshot folder.
import { useCallback, useEffect, useState } from 'react';
import CameraPreview from './CameraPreview';

export default function Setup({ camera, onReady }) {
  const [permissions, setPermissions] = useState({ camera: 'unknown', screen: 'unknown' });
  const [fullScreen, setFullScreen] = useState(false);
  const [folder, setFolder] = useState('');
  const [error, setError] = useState('');

  const refreshPermissions = useCallback(async () => {
    setPermissions(await window.athena.getPermissionStatus());
  }, []);

  useEffect(() => {
    // Load initial state from the OS; every setState here happens after an await
    (async () => {
      setPermissions(await window.athena.getPermissionStatus());
      setFullScreen(await window.athena.isFullScreen());
      setFolder(await window.athena.getSnapshotFolder());
    })();
    // Keep the fullscreen tick in sync if the student leaves fullscreen manually
    return window.athena.onFullScreenChange(setFullScreen);
  }, []);

  const cameraEnabled = Boolean(camera.stream);
  const screenEnabled = permissions.screen === 'granted';
  const screenBlocked = permissions.screen === 'denied' || permissions.screen === 'restricted';

  async function enableCamera() {
    setError('');
    try {
      await window.athena.requestCameraAccess();
      await camera.start();
    } catch {
      setError('Cannot access the camera. Allow it in System Settings → Privacy & Security → Camera.');
    }
    refreshPermissions();
  }

  async function enableScreen() {
    setError('');
    setPermissions(await window.athena.requestScreenAccess());
  }

  async function chooseFolder() {
    setFolder(await window.athena.selectSnapshotFolder());
  }

  async function goToTest() {
    setError('');
    const { buttonIndex, checkboxChecked } = await window.athena.showCheckboxDialog();
    if (buttonIndex !== 0) return;
    if (!checkboxChecked) {
      setError('You must agree to the exam rules before starting.');
      return;
    }
    onReady();
  }

  return (
    <div className="page-container">
      <div className="card-container">
        <div className="permission-item">
          <div className="permission-content">
            <h3>Configure Camera</h3>
            <p>Your webcam takes periodic snapshots while you attempt the exam.</p>
            <div className="action-row">
              <button className="btn btn-black" disabled={cameraEnabled} onClick={enableCamera}>
                {cameraEnabled ? 'Camera Connected' : 'Get Camera Access'}
              </button>
              {cameraEnabled && <CameraPreview stream={camera.stream} className="video-preview" />}
            </div>
          </div>
        </div>

        <div className="divider" />

        <div className="permission-item">
          <div className="permission-content">
            <h3>Switch to Full Screen</h3>
            <p>The exam must run in full screen. Leaving it is recorded as a violation.</p>
            <button
              className="btn btn-primary"
              disabled={fullScreen}
              onClick={async () => setFullScreen(await window.athena.setFullScreen(true))}
            >
              {fullScreen ? 'Full Screen Enabled' : 'Enter Full Screen'}
            </button>
          </div>
        </div>

        <div className="divider" />

        <div className="permission-item">
          <div className="permission-content">
            <h3>Screen Recording</h3>
            <p>Periodic screenshots are saved so your screen can be reviewed.</p>
            <div className="action-row">
              <button className="btn btn-black" disabled={screenEnabled} onClick={enableScreen}>
                {screenEnabled ? 'Screen Recording Allowed' : 'Allow Screen Recording'}
              </button>
              {screenBlocked && (
                <button className="btn btn-ghost" onClick={() => window.athena.openPrivacySettings('screen')}>
                  Open System Settings
                </button>
              )}
              {!screenEnabled && (
                <button className="btn btn-ghost" onClick={refreshPermissions}>Re-check</button>
              )}
            </div>
            {screenBlocked && (
              <p className="hint">
                Turn on “Athena Exam” under Privacy &amp; Security → Screen Recording, then quit and reopen the app.
              </p>
            )}
          </div>
        </div>

        <div className="divider" />

        <div className="permission-item">
          <div className="permission-content">
            <h3>Snapshot Folder</h3>
            <p className="path-text" title={folder}>{folder || '…'}</p>
            <div className="action-row">
              <button className="btn btn-ghost" onClick={chooseFolder}>Change…</button>
              <button className="btn btn-ghost" onClick={() => window.athena.openSnapshotFolder()}>Open</button>
              <button className="btn btn-ghost" onClick={() => window.athena.showRules()}>View Rules</button>
            </div>
          </div>
        </div>
      </div>

      <div className="bottom-actions">
        {error && <p className="me-error" role="alert">{error}</p>}
        <button
          className="btn btn-primary"
          disabled={!cameraEnabled || !fullScreen || !screenEnabled}
          onClick={goToTest}
        >
          Go To Test
        </button>
      </div>
    </div>
  );
}
