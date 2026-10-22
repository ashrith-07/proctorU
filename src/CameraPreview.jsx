import { useEffect, useRef } from 'react';

// Shows a live webcam stream (muted, no controls)
export default function CameraPreview({ stream, className }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return <video ref={ref} autoPlay muted playsInline className={className} />;
}
