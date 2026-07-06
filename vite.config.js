import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// For GitHub Pages, the site lives at https://<user>.github.io/<repo>/,
// so assets must be requested from /<repo>/. Locally we still use '/'.
const base = process.env.GITHUB_ACTIONS ? '/element-calculator/' : '/';

export default defineConfig({
  base,
  plugins: [react()],
  server: { port: 5173, open: false }
});
