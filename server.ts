import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { analyzePQRSBatch, getEmbedding } from './server/geminiService';
import { testSupabaseConnection, saveRecordsToSupabase } from './server/supabaseService';
import { DEFAULT_CATALOG, getCatalogSummary } from './src/services/catalog';
import { CategoryItem } from './src/types';

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

  // 6. Mandatory Test Cases runner (16 Categorías Oficiales y Regla de Prioridad)
  app.get('/api/test-cases', async (req, res) => {
    const mandatoryTestCases = [
      {
        numero_expediente: 'TEST-001',
        resumen_original: 'Abono realizado',
        descripcion_original: 'Cliente realizó pago y no se refleja.',
        esperado: 'PAGOS / ABONOS'
      },
      {
        numero_expediente: 'TEST-002',
        resumen_original: 'Extracto mensual',
        descripcion_original: 'Cliente manifiesta que le cobraron intereses que considera incorrectos.',
        esperado: 'COBROS / CARGOS'
      },
      {
        numero_expediente: 'TEST-003',
        resumen_original: 'Consulta general',
        descripcion_original: 'Cliente solicita información sobre una póliza de seguro de vida.',
        esperado: 'SEGUROS'
      },
      {
        numero_expediente: 'TEST-004',
        resumen_original: 'Tarjeta de crédito',
        descripcion_original: 'Cliente reclama cobro de cuota de manejo que prometieron no cobrar.',
        esperado: 'CUOTA DE MANEJO'
      },
      {
        numero_expediente: 'TEST-005',
        resumen_original: 'Problema técnico',
        descripcion_original: 'Cliente no puede ingresar a la aplicación por bloqueo de usuario.',
        esperado: 'SERVICIO / ATENCIÓN'
      },
      {
        numero_expediente: 'TEST-006',
        resumen_original: 'Movimiento bancario',
        descripcion_original: 'Cliente no reconoce una compra por $500.000 con su tarjeta.',
        esperado: 'FRAUDE / TRANSACCIÓN NO RECONOCIDA'
      },
      {
        numero_expediente: 'TEST-007',
        resumen_original: 'Comunicación escrita',
        descripcion_original: 'Cliente presenta formalmente derecho de petición solicitando copias de contratos y extractos.',
        esperado: 'DATOS / INFORMACIÓN'
      },
      {
        numero_expediente: 'TEST-008',
        resumen_original: 'Revisión',
        descripcion_original: 'Solicito revisar mi caso.',
        esperado: 'REVISIÓN HUMANA'
      },
      {
        numero_expediente: 'TEST-009',
        resumen_original: 'Pago electrónico',
        descripcion_original: 'Transacción PSE rechazada con débito en cuenta de ahorros.',
        esperado: 'PSE'
      },
      {
        numero_expediente: 'TEST-010',
        resumen_original: 'Gravamen tributario',
        descripcion_original: 'Solicito marcación de mi cuenta de ahorros como exenta de 4x1000 GMF.',
        esperado: 'GMF / 4X1000'
      }
    ];

    try {
      const catalogSummary = getCatalogSummary(activeCatalog);
      const analyses = await analyzePQRSBatch(mandatoryTestCases, catalogSummary);

      const results = mandatoryTestCases.map((tc, idx) => ({
        ...tc,
        analisis: analyses[idx]
      }));

      res.json({ success: true, testCases: results });
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
