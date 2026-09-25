import express from 'express';
import { createServer as createViteServer } from 'vite';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

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

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Basic middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Public Auth Config endpoint
  app.get('/api/auth/config', (_req, res) => {
    const publishableKey = extractPublishableKey(
      process.env.VITE_CLERK_PUBLISHABLE_KEY,
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      process.env.CLERK_PUBLISHABLE_KEY,
      'pk_test_d2VsbC10cm91dC0zMDE4LmNsZXJrLmFjY291bnRzLmRldiQ'
    );
    res.json({
      publishableKey,
      frontendApi: 'https://well-trout-3018.clerk.accounts.dev',
      configured: Boolean(publishableKey),
    });
  });

  // Auth status endpoint
  app.get('/api/auth/status', (_req, res) => {
    const publishableKey = extractPublishableKey(
      process.env.VITE_CLERK_PUBLISHABLE_KEY,
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      process.env.CLERK_PUBLISHABLE_KEY,
      'pk_test_d2VsbC10cm91dC0zMDE4LmNsZXJrLmFjY291bnRzLmRldiQ'
    );
    res.json({
      authProvider: 'clerk',
      configured: Boolean(publishableKey),
      frontendApi: 'https://well-trout-3018.clerk.accounts.dev',
      timestamp: new Date().toISOString(),
    });
  });

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    // Mount Vite dev server in middleware mode
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running in ${isProduction ? 'production' : 'development'} on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
