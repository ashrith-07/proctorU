import { useCallback, useEffect, useRef, useState } from 'react';

// Owns the webcam stream and can grab a JPEG frame from it.
export function useCamera() {
  const [stream, setStream] = useState(null);
  const streamRef = useRef(null);
  const grabberRef = useRef(null); // hidden <video> used only for taking frames

  const start = useCallback(async () => {
    const media = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    streamRef.current = media;
    // Unplugged / revoked mid-exam: report it (main ignores this outside an exam)
    media.getVideoTracks()[0].addEventListener('ended', () => window.athena.reportViolation('camera-lost'));
    const grabber = document.createElement('video');
    grabber.muted = true;
    grabber.playsInline = true;
    grabber.srcObject = media;
    await grabber.play();
    grabberRef.current = grabber;
    setStream(media);
  }, []);

  // Draw the current frame to a canvas and return JPEG bytes (or null if the camera is off)
  const captureJpeg = useCallback(async () => {
    const video = grabberRef.current;
    const track = streamRef.current?.getVideoTracks()[0];
    if (!video || !track || track.readyState !== 'live' || !video.videoWidth) return null;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    return blob ? blob.arrayBuffer() : null;
  }, []);

  // Release the camera when the component using this hook unmounts
  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), []);

  return { stream, start, captureJpeg };
}
