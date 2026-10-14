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
        resumen_original: 'Pago no aplicado tarjeta',
        descripcion_original: 'Realicé el pago de mi tarjeta de crédito el día de ayer y aún no se ve reflejado en el saldo.',
        esperado: 'PAGOS / ABONOS',
        subcategoria_esperada: 'APLICACIÓN DE PAGO',
        producto_esperado: 'TARJETA DE CRÉDITO',
        requiere_revision_esperada: false
      },
      {
        numero_expediente: 'TEST-002',
        resumen_original: 'Pago duplicado tarjeta',
        descripcion_original: 'Me cobraron dos veces el pago de la tarjeta de crédito en mi cuenta corriente.',
        esperado: 'PAGOS / ABONOS',
        subcategoria_esperada: 'APLICACIÓN DE PAGO',
        producto_esperado: 'TARJETA DE CRÉDITO',
        requiere_revision_esperada: false
      },
      {
        numero_expediente: 'TEST-003',
        resumen_original: 'Cobro intereses de mora',
        descripcion_original: 'Me están cobrando intereses de mora en mi tarjeta de crédito a pesar de haber pagado oportunamente.',
        esperado: 'COMISIONES Y COBROS',
        subcategoria_esperada: 'INTERESES',
        producto_esperado: 'TARJETA DE CRÉDITO',
        requiere_revision_esperada: false
      },
      {
        numero_expediente: 'TEST-004',
        resumen_original: 'Aumento de cupo',
        descripcion_original: 'Solicito aumento de cupo para mi tarjeta de crédito Visa.',
        esperado: 'TARJETAS',
        subcategoria_esperada: 'CUPO Y AVANCES',
        producto_esperado: 'TARJETA DE CRÉDITO',
        requiere_revision_esperada: false
      },
      {
        numero_expediente: 'TEST-005',
        resumen_original: 'Compra no reconocida',
        descripcion_original: 'No reconozco una compra realizada con mi tarjeta de crédito en una tienda virtual.',
        esperado: 'FRAUDES',
        subcategoria_esperada: 'OPERACIÓN NO RECONOCIDA',
        producto_esperado: 'TARJETA DE CRÉDITO',
        requiere_revision_esperada: false
      },
      {
        numero_expediente: 'TEST-006',
        resumen_original: 'Devolución de compra pendiente',
        descripcion_original: 'El establecimiento comercial hizo la devolución de una compra realizada con mi tarjeta de crédito, pero sigue pendiente de ingresar.',
        esperado: 'TARJETAS',
        subcategoria_esperada: 'COMPRAS Y DEVOLUCIONES',
        producto_esperado: 'TARJETA DE CRÉDITO',
        requiere_revision_esperada: false
      },
      {
        numero_expediente: 'TEST-007',
        resumen_original: 'Diferencia en extracto',
        descripcion_original: 'Presento una diferencia en el extracto de mi tarjeta de crédito con relación al saldo facturado.',
        esperado: 'INFORMACIÓN Y DOCUMENTOS',
        subcategoria_esperada: 'EXTRACTOS Y DOCUMENTOS',
        producto_esperado: 'TARJETA DE CRÉDITO',
        requiere_revision_esperada: false
      },
      {
        numero_expediente: 'TEST-008',
        resumen_original: 'Compra diferida a cuotas',
        descripcion_original: 'Deseo rediferir a 24 cuotas una compra diferida efectuada con mi tarjeta de crédito.',
        esperado: 'TARJETAS',
        subcategoria_esperada: 'DIFERIDOS Y FINANCIACIÓN',
        producto_esperado: 'TARJETA DE CRÉDITO',
        requiere_revision_esperada: false
      },
      {
        numero_expediente: 'TEST-009',
        resumen_original: 'Cobro cuota de manejo',
        descripcion_original: 'Me están cobrando cuota de manejo en mi tarjeta de crédito y solicito exoneración.',
        esperado: 'CUOTA DE MANEJO',
        subcategoria_esperada: 'COBRO',
        producto_esperado: 'TARJETA DE CRÉDITO',
        requiere_revision_esperada: false
      },
      {
        numero_expediente: 'TEST-010',
        resumen_original: 'Devolución cuota de manejo',
        descripcion_original: 'Solicito la devolución de la cuota de manejo debitada de mi tarjeta de crédito.',
        esperado: 'CUOTA DE MANEJO',
        subcategoria_esperada: 'DEVOLUCIÓN / REVERSIÓN',
        producto_esperado: 'TARJETA DE CRÉDITO',
        requiere_revision_esperada: false
      },
      {
        numero_expediente: 'TEST-011',
        resumen_original: 'Seguro asociado a tarjeta',
        descripcion_original: 'Tengo un seguro asociado a mi tarjeta de crédito que no autoricé y solicito cancelar.',
        esperado: 'SEGUROS',
        subcategoria_esperada: 'CANCELACIÓN Y DEVOLUCIÓN',
        producto_esperado: 'TARJETA DE CRÉDITO',
        requiere_revision_esperada: false
      },
      {
        numero_expediente: 'TEST-012',
        resumen_original: 'Error operación PSE',
        descripcion_original: 'Presento error al realizar el pago de mi tarjeta de crédito por medio de PSE, la pasarela rechazó la operación.',
        esperado: 'PSE',
        subcategoria_esperada: 'ERROR / FALLA PSE',
        producto_esperado: 'TARJETA DE CRÉDITO',
        requiere_revision_esperada: false
      },
      {
        numero_expediente: 'TEST-013',
        resumen_original: 'Marcación GMF',
        descripcion_original: 'Quiero marcar mi cuenta de ahorros para que no cobre el 4x1000 GMF.',
        esperado: 'GMF',
        subcategoria_esperada: 'MARCACIÓN',
        producto_esperado: 'CUENTA DE AHORROS',
        requiere_revision_esperada: false
      },
      {
        numero_expediente: 'TEST-014',
        resumen_original: 'Operación GT5',
        descripcion_original: 'Cliente presenta movimiento RECUP TRANX en su cuenta.',
        esperado: 'GT5',
        subcategoria_esperada: 'RECUP TRANX',
        producto_esperado: 'CUENTA DE AHORROS',
        requiere_revision_esperada: false
      },
      {
        numero_expediente: 'TEST-015',
        resumen_original: 'Mención aislada de tarjeta',
        descripcion_original: 'Tarjeta de crédito',
        esperado: 'REVISIÓN HUMANA',
        subcategoria_esperada: 'INFORMACIÓN INSUFICIENTE',
        producto_esperado: 'TARJETA DE CRÉDITO',
        requiere_revision_esperada: true
      },
      {
        numero_expediente: 'TEST-016',
        resumen_original: 'Descripción insuficiente',
        descripcion_original: 'revisar mi caso',
        esperado: 'REVISIÓN HUMANA',
        subcategoria_esperada: 'INFORMACIÓN INSUFICIENTE',
        producto_esperado: 'NO ESPECIFICADO',
        requiere_revision_esperada: true
      },
      {
        numero_expediente: 'TEST-017',
        resumen_original: 'Sin embargo no es embargo',
        descripcion_original: 'Realicé el pago de mi tarjeta de crédito, sin embargo no veo reflejado el saldo en mi cupo.',
        esperado: 'PAGOS / ABONOS',
        subcategoria_esperada: 'APLICACIÓN DE PAGO',
        producto_esperado: 'TARJETA DE CRÉDITO',
        requiere_revision_esperada: false
      },
      {
        numero_expediente: 'TEST-018',
        resumen_original: 'Levantamiento de embargo',
        descripcion_original: 'Radico oficio judicial emitido por el juzgado para el levantamiento de embargo y desembargo de mi cuenta.',
        esperado: 'EMBARGOS',
        subcategoria_esperada: 'DESEMBARGO',
        producto_esperado: 'CUENTA DE AHORROS',
        requiere_revision_esperada: false
      }
    ];

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
