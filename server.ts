import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { analyzePQRSBatch, getEmbedding } from './server/geminiService';
import { testSupabaseConnection, saveRecordsToSupabase } from './server/supabaseService';
import { DEFAULT_CATALOG, getCatalogSummary } from './src/services/catalog';
import { CategoryItem } from './src/types';
import { MANDATORY_TEST_SUITE } from './test/mandatoryCases.test';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

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

      const catalogSummary = getCatalogSummary(activeCatalog);
      const analyses = await analyzePQRSBatch(records, catalogSummary);

      res.json({ success: true, count: analyses.length, analyses });
    } catch (error: any) {
      console.error('Error en /api/analyze-batch:', error);
      res.status(500).json({
        error: 'Error interno en el procesamiento de lote con IA',
        details: error.message
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
    const result = await testSupabaseConnection();
    res.json(result);
  });

  app.post('/api/supabase/sync', async (req, res) => {
    const { records } = req.body;
    if (!Array.isArray(records)) {
      return res.status(400).json({ error: 'Se requiere array de registros' });
    }
    const result = await saveRecordsToSupabase(records);
    res.json(result);
  });

  // 6. Mandatory Test Cases runner (41 Casos de Negocio, ITAU y Prioridades)
  app.get('/api/test-cases', async (req, res) => {
    const mandatoryTestCases = MANDATORY_TEST_SUITE.map(tc => ({
      numero_expediente: tc.expediente,
      resumen_original: tc.submotivo || tc.nombre,
      descripcion_original: tc.descripcion,
      producto_original: tc.producto,
      tipo_origen: tc.tipo_origen,
      columnas_adicionales: {
        'TIPO ORIGEN': tc.tipo_origen
      },
      esperado: tc.categoriaEsperada,
      subcategoria_esperada: tc.subcategoriaEsperada,
      producto_esperado: tc.productoEsperado,
      requiere_revision_esperada: tc.requiereRevisionEsperada
    }));

    try {
      const catalogSummary = getCatalogSummary(activeCatalog);
      const analyses = await analyzePQRSBatch(mandatoryTestCases, catalogSummary);

      const results = mandatoryTestCases.map((tc, idx) => ({
        ...tc,
        analisis: analyses[idx]
      }));

      res.json({ success: true, results, testCases: results });
    } catch (err: any) {
      res.status(500).json({ error: 'Error ejecutando casos de prueba', details: err.message });
    }
  });

  // ==========================================
  // VITE MIDDLEWARE / STATIC ASSETS
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Plataforma PQRS] Servidor corriendo en http://0.0.0.0:${PORT}`);
  });
}

startServer();
