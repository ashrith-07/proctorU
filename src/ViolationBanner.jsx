// Red warning bar shown for a few seconds after each violation.
import { useEffect, useState } from 'react';

export default function ViolationBanner({ violation }) {
  const [hiddenId, setHiddenId] = useState(0);

  useEffect(() => {
    if (!violation.id) return undefined;
    const timer = setTimeout(() => setHiddenId(violation.id), 6000);
    return () => clearTimeout(timer);
  }, [violation.id]);

  if (!violation.id || hiddenId === violation.id) return null;

  return (
    <div className="violation-banner" role="alert">
      <strong>Warning {violation.count}/{violation.max}:</strong> {violation.message}
      {violation.count >= violation.max
        ? ' The exam is being submitted.'
        : ' Further violations may end your exam.'}
    </div>
  );
}
