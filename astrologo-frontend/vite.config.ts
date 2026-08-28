import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    license: {
      fileName: 'legal/BUNDLED-LICENSES.md',
    },
    rolldownOptions: {
      output: {
        postBanner: '/* Third-party browser-bundle licenses: /legal/BUNDLED-LICENSES.md */',
      },
    },
  },
});
