// Tiny client for the local exam backend (Express, started by the Electron main process).
let basePromise = null;

function getBase() {
  basePromise ??= window.athena.getApiBase();
  return basePromise;
}

// Returns the parsed JSON body; throws Error(message) for network errors and non-2xx responses
export async function api(path, { method = 'GET', body } = {}) {
  const base = await getBase();
  let res;
  try {
    res = await fetch(`${base}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Could not connect to the exam server.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data;
}
