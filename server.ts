import express from 'express';
import http from 'http';
import path from 'path';
import dotenv from 'dotenv';
import { DEFAULT_CATALOG, getCatalogSummary } from './src/services/catalog';
import { CategoryItem } from './src/types';

dotenv.config({ quiet: true });

function resolveServerBinding(): { port: number; host: string } {
  const args = process.argv.slice(2);
  let cliPort: number | undefined;
  let cliHost: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--port' && args[i + 1]) {
      const parsed = Number(args[i + 1]);
      if (Number.isFinite(parsed) && parsed > 0) cliPort = parsed;
      i++;
    } else if (arg.startsWith('--port=')) {
      const parsed = Number(arg.slice('--port='.length));
      if (Number.isFinite(parsed) && parsed > 0) cliPort = parsed;
    } else if (arg === '--host' && args[i + 1]) {
      cliHost = args[i + 1];
      i++;
    } else if (arg.startsWith('--host=')) {
      cliHost = arg.slice('--host='.length);
    }
  }

  const isProd = process.env.NODE_ENV === 'production';
  const envPort = Number(process.env.PORT);
  const nginxPort = Number(process.env.NGINX_PORT);
  const defaultAppPort = Number(process.env.DEFAULT_APP_PORT) || 3000;

  let port: number;
  if (cliPort) {
    port = cliPort;
  } else if (!isProd) {
    // In dev mode, never collide with Nginx's listener port if PORT was inherited from the container.
    port =
      Number.isFinite(envPort) && envPort > 0 && envPort !== nginxPort
        ? envPort
        : defaultAppPort;
  } else {
    port = Number.isFinite(envPort) && envPort > 0 ? envPort : 3000;
  }

  const host = cliHost || '0.0.0.0';
  return { port, host };
}

let geminiServicePromise: Promise<typeof import('./server/geminiService')> | null = null;
function loadGeminiService() {
  if (!geminiServicePromise) {
    geminiServicePromise = import('./server/geminiService');
  }
  return geminiServicePromise;
}

let supabaseServicePromise: Promise<typeof import('./server/supabaseService')> | null = null;
function loadSupabaseService() {
  if (!supabaseServicePromise) {
    supabaseServicePromise = import('./server/supabaseService');
  }
  return supabaseServicePromise;
}

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  const { port: PORT, host: HOST } = resolveServerBinding();

  // Middleware for JSON parsing with ample limit for batches
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // In-memory catalog state that can be edited by admin
  let activeCatalog: CategoryItem[] = [...DEFAULT_CATALOG];

  // ==========================================
  // API ROUTES (Mounted before Vite)
  // ==========================================

  // 1. Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Plataforma Inteligente PQRS',
      geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
      supabaseConfigured: Boolean(process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)),
      timestamp: new Date().toISOString()
    });
  });

  // 2. Catalog management
  app.get('/api/categories', (req, res) => {
    res.json({ categories: activeCatalog });
  });

  app.post('/api/categories', (req, res) => {
    const { categories } = req.body;
    if (Array.isArray(categories)) {
      activeCatalog = categories;
      return res.json({ success: true, count: activeCatalog.length });
    }
    res.status(400).json({ error: 'Formato de categorías inválido' });
  });

  // 3. Batch Analysis via Gemini API
  app.post('/api/analyze-batch', async (req, res) => {
    try {
      const { records } = req.body;
      if (!Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ error: 'Se requiere una lista de registros no vacía' });
      }

      const { analyzePQRSBatchWithMetrics } = await loadGeminiService();
      const catalogSummary = getCatalogSummary(activeCatalog);
      const { analyses, telemetry } = await analyzePQRSBatchWithMetrics(records, catalogSummary);

      res.json({ success: true, count: analyses.length, analyses, telemetry });
    } catch (error: any) {
      const rawMessage = String(error?.message || 'Error desconocido');
      let readableDetail = rawMessage;
      let statusCode = 500;

      try {
        const parsed = JSON.parse(rawMessage);
        if (parsed?.error?.message) {
          readableDetail = parsed.error.message;
        }
        if (typeof parsed?.error?.code === 'number') {
          statusCode = parsed.error.code;
        }
      } catch {
        if (rawMessage.toLowerCase().includes('timeout')) {
          statusCode = 504;
        } else if (rawMessage.includes('503') || rawMessage.toLowerCase().includes('unavailable')) {
          statusCode = 503;
        } else if (rawMessage.includes('429') || rawMessage.toLowerCase().includes('quota')) {
          statusCode = 429;
        }
      }

      console.error('Error en /api/analyze-batch:', error);
      res.status(statusCode).json({
        error: 'Error interno en el procesamiento de lote con IA',
        details: readableDetail
      });
    }
  });

  // 4. Batch Embeddings via Gemini API
  app.post('/api/embeddings-batch', async (req, res) => {
    try {
      const { texts } = req.body;
      if (!Array.isArray(texts)) {
        return res.status(400).json({ error: 'Se requiere array de textos' });
      }

      const { getEmbedding } = await loadGeminiService();
      // Process embeddings sequentially or in small parallel slices to respect rate limits
      const embeddings: number[][] = [];
      for (const text of texts) {
        if (!text || typeof text !== 'string') {
          embeddings.push([]);
          continue;
        }
        const vec = await getEmbedding(text.trim());
        embeddings.push(vec);
      }

      res.json({ success: true, embeddings });
    } catch (error: any) {
      console.error('Error en /api/embeddings-batch:', error);
      res.status(500).json({
        error: 'Error al generar embeddings',
        details: error.message
      });
    }
  });

  // 5. Supabase connection status & Sync
  app.get('/api/supabase/status', async (req, res) => {
    const { testSupabaseConnection } = await loadSupabaseService();
    const result = await testSupabaseConnection();
    res.json(result);
  });

  app.post('/api/supabase/sync', async (req, res) => {
    const { records } = req.body;
    if (!Array.isArray(records)) {
      return res.status(400).json({ error: 'Se requiere array de registros' });
    }
    const { saveRecordsToSupabase } = await loadSupabaseService();
    const result = await saveRecordsToSupabase(records);
    res.json(result);
  });

  // ==========================================
  // VITE MIDDLEWARE / STATIC ASSETS
  // ==========================================
  let viteServerPromise: Promise<{ middlewares: express.RequestHandler; close: () => Promise<void> }> | null = null;

  if (process.env.NODE_ENV !== 'production') {
    const disableHmr = process.env.DISABLE_HMR === 'true';
    viteServerPromise = import('vite').then(({ createServer: createViteServer }) =>
      createViteServer({
        server: {
          middlewareMode: true,
          hmr: disableHmr ? false : { server: httpServer },
          ...(disableHmr ? { ws: false } : {}),
        },
        appType: 'spa',
      })
    );

    viteServerPromise.catch(err => {
      console.error('[Plataforma PQRS] Error inicializando Vite middleware:', err);
    });

    app.use(async (req, res, next) => {
      try {
        const vite = await viteServerPromise!;
        vite.middlewares(req, res, next);
      } catch (err) {
        next(err);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.on('error', (err: NodeJS.ErrnoException) => {
    console.error(`[Plataforma PQRS] Error en servidor HTTP (${HOST}:${PORT}):`, err);
    process.exit(1);
  });

  httpServer.listen(PORT, HOST, () => {
    console.log(`[Plataforma PQRS] Servidor corriendo en http://${HOST}:${PORT}`);
  });

  const shutdown = async (signal: string) => {
    console.log(`[Plataforma PQRS] Recibida señal ${signal}, cerrando servidor...`);
    try {
      if (viteServerPromise) {
        const vite = await viteServerPromise.catch(() => null);
        if (vite) await vite.close();
      }
    } finally {
      httpServer.close(() => process.exit(0));
      setTimeout(() => process.exit(0), 2000).unref();
    }
  };

  process.once('SIGTERM', () => { void shutdown('SIGTERM'); });
  process.once('SIGINT', () => { void shutdown('SIGINT'); });
}

startServer().catch(err => {
  console.error('[Plataforma PQRS] Error fatal al iniciar el servidor:', err);
  process.exit(1);
});
