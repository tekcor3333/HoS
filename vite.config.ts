import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function extractPublishableKey(...candidates: Array<string | undefined>): string {
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'string') continue;
    const match = candidate.match(/(pk_test_[^\s"';\n]+|pk_live_[^\s"';\n]+)/);
    if (match && match[1]) {
      return match[1];
    }
    const trimmed = candidate.trim();
    if (trimmed.startsWith('pk_test_') || trimmed.startsWith('pk_live_')) {
      return trimmed;
    }
  }
  return '';
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const clerkPublishableKey = extractPublishableKey(
    process.env.VITE_CLERK_PUBLISHABLE_KEY,
    env.VITE_CLERK_PUBLISHABLE_KEY,
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    process.env.CLERK_PUBLISHABLE_KEY,
    env.CLERK_PUBLISHABLE_KEY,
    'pk_test_d2VsbC10cm91dC0zMDE4LmNsZXJrLmFjY291bnRzLmRldiQ'
  );

  return {
    define: {
      'import.meta.env.VITE_CLERK_PUBLISHABLE_KEY': JSON.stringify(clerkPublishableKey),
      'import.meta.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY': JSON.stringify(clerkPublishableKey),
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
