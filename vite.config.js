import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Content-Security-Policy for the packaged app only (the dev server needs inline
// scripts + websockets for hot reload). Backend calls go to the local Express server.
const csp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "connect-src 'self' http://127.0.0.1:*",
].join('; ')

const cspPlugin = {
  name: 'inject-csp',
  apply: 'build',
  transformIndexHtml: (html) =>
    html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />`),
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), cspPlugin],
  // Relative asset paths so the built app also works from file:// inside Electron
  base: './',
  server: { port: 5174, strictPort: true },
})
