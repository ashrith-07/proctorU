// Camera / screen-recording permission handling (macOS requires explicit consent).
const { systemPreferences, desktopCapturer, shell } = require('electron');

const isMac = process.platform === 'darwin';

// 'granted' | 'denied' | 'not-determined' | 'restricted' | 'unknown'
function getStatus() {
  if (!isMac) return { camera: 'granted', screen: 'granted' };
  return {
    camera: systemPreferences.getMediaAccessStatus('camera'),
    screen: systemPreferences.getMediaAccessStatus('screen'),
  };
}

async function requestCamera() {
  if (isMac) await systemPreferences.askForMediaAccess('camera'); // shows the OS prompt once
  return getStatus();
}

// There is no direct "ask for screen recording" API: the OS prompt appears the first
// time we try to capture the screen.
async function requestScreen() {
  if (isMac && getStatus().screen !== 'granted') {
    await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1, height: 1 } });
  }
  return getStatus();
}

function openPrivacySettings(kind) {
  const pane = kind === 'camera' ? 'Privacy_Camera' : 'Privacy_ScreenCapture';
  if (isMac) return shell.openExternal(`x-apple.systempreferences:com.apple.preference.security?${pane}`);
  return undefined;
}

module.exports = { getStatus, requestCamera, requestScreen, openPrivacySettings };
