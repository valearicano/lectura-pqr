import React, { useState } from 'react';
import { 
  Settings, 
  Database, 
  Cpu, 
  Sliders, 
  Copy, 
  Check, 
  ExternalLink,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

export const ConfiguracionView: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [testingDb, setTestingDb] = useState(false);
  const [dbStatus, setDbStatus] = useState<string | null>(null);

  // Thresholds state
  const [minConfidence, setMinConfidence] = useState(85);
  const [reviewThreshold, setReviewThreshold] = useState(70);
  const [similarityThreshold, setSimilarityThreshold] = useState(78);
  const [batchSize, setBatchSize] = useState(10);

  const sqlSchema = `-- Schema oficial de Base de Datos PostgreSQL / Supabase para PQRS
-- Habilitar extensión vectorial para embeddings semánticos
CREATE EXTENSION IF NOT EXISTS vector;

-- Tabla de Categorías Oficiales
CREATE TABLE IF NOT EXISTS pqrs_categorias (
  id VARCHAR(32) PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de Expedientes PQRS
CREATE TABLE IF NOT EXISTS pqrs_expedientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_expediente VARCHAR(64) NOT NULL UNIQUE,
  resumen_original TEXT,
  descripcion_original TEXT NOT NULL,
  descripcion_normalizada TEXT,
  hash_descripcion VARCHAR(64) NOT NULL,
  estado_procesamiento VARCHAR(32) DEFAULT 'PENDIENTE',
  grupo_id VARCHAR(32),
  embedding vector(768),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de Análisis IA
CREATE TABLE IF NOT EXISTS pqrs_analisis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expediente_id UUID REFERENCES pqrs_expedientes(id) ON DELETE CASCADE,
  numero_expediente VARCHAR(64) NOT NULL,
  tema_principal VARCHAR(100),
  subtema VARCHAR(100),
  producto VARCHAR(100),
  problema_principal TEXT,
  solicitud_cliente TEXT,
  categoria VARCHAR(100) NOT NULL,
  subcategoria VARCHAR(100) NOT NULL,
  resumen_normalizado TEXT NOT NULL,
  justificacion TEXT NOT NULL,
  confianza INT NOT NULL,
  nivel_confianza VARCHAR(16) NOT NULL,
  requiere_revision BOOLEAN DEFAULT false,
  posible_inconsistencia BOOLEAN DEFAULT false,
  motivo_inconsistencia TEXT,
  modelo_ia VARCHAR(64) NOT NULL,
  version_prompt VARCHAR(32) DEFAULT 'v1.2.0',
  estado_revision VARCHAR(32) DEFAULT 'PENDIENTE',
  revisado_por VARCHAR(100),
  fecha_revision TIMESTAMPTZ,
  fecha_analisis TIMESTAMPTZ DEFAULT now()
);

-- Índices para búsqueda ágil
CREATE INDEX IF NOT EXISTS idx_expedientes_numero ON pqrs_expedientes(numero_expediente);
CREATE INDEX IF NOT EXISTS idx_analisis_categoria ON pqrs_analisis(categoria);
CREATE INDEX IF NOT EXISTS idx_analisis_subcategoria ON pqrs_analisis(subcategoria);
CREATE INDEX IF NOT EXISTS idx_analisis_requiere_rev ON pqrs_analisis(requiere_revision);`;

  const copySql = () => {
    navigator.clipboard.writeText(sqlSchema);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTestDb = async () => {
    setTestingDb(true);
    setDbStatus(null);
    try {
      const res = await fetch('/api/supabase/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: [] })
      });
      const data = await res.json();
      if (data.success) {
        setDbStatus('Conexión con Supabase verificada y activa.');
      } else {
        setDbStatus(`Modo local: ${data.message || 'Sin variables de entorno'}`);
      }
    } catch (e: any) {
      setDbStatus(`Error al consultar servicio: ${e.message}`);
    } finally {
      setTestingDb(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Configuración del Sistema y Base de Datos</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Ajustes de umbrales para el Lector Inteligente, parámetros de clustering y sincronización persistente
        </p>
      </div>

      {/* Model & AI Settings Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 text-slate-900 font-bold text-base pb-3 border-b border-slate-100">
          <Cpu className="w-5 h-5 text-blue-600" />
          <span>Configuración del Motor de Inteligencia Artificial</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 block font-medium">Modelo Principal:</span>
            <span className="text-sm font-bold text-slate-900 block mt-0.5 font-mono">gemini-3.8-flash</span>
            <span className="text-[11px] text-emerald-600 block mt-1">Con User-Agent: aistudio-build</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 block font-medium">Modelo de Respaldo (Fallback):</span>
            <span className="text-sm font-bold text-slate-900 block mt-0.5 font-mono">gemini-flash-latest</span>
            <span className="text-[11px] text-slate-500 block mt-1">Activación automática ante saturación</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 block font-medium">Modelo de Embeddings:</span>
            <span className="text-sm font-bold text-slate-900 block mt-0.5 font-mono">text-embedding-004</span>
            <span className="text-[11px] text-indigo-600 block mt-1">768 dimensiones vectoriales</span>
          </div>
        </div>

        {/* Sliders for Thresholds */}
        <div className="pt-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1 text-xs">
            <div className="flex justify-between font-semibold text-slate-700">
              <span>Umbral de Alta Confianza (Aprobación directa):</span>
              <span className="text-blue-600 font-bold">{minConfidence}%</span>
            </div>
            <input
              type="range"
              min="75"
              max="95"
              value={minConfidence}
              onChange={e => setMinConfidence(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg accent-blue-600"
            />
            <span className="text-[11px] text-slate-400 block">Expedientes con confianza &ge; {minConfidence}% se aprueban automáticamente.</span>
          </div>

          <div className="space-y-1 text-xs">
            <div className="flex justify-between font-semibold text-slate-700">
              <span>Umbral de Triaje Humano Obligatorio:</span>
              <span className="text-amber-600 font-bold">&lt; {reviewThreshold}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="75"
              value={reviewThreshold}
              onChange={e => setReviewThreshold(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg accent-amber-600"
            />
            <span className="text-[11px] text-slate-400 block">Casos con confianza &lt; {reviewThreshold}% se derivan a la bandeja de revisión.</span>
          </div>

          <div className="space-y-1 text-xs">
            <div className="flex justify-between font-semibold text-slate-700">
              <span>Similitud Mínima para Clustering Semántico:</span>
              <span className="text-emerald-600 font-bold">{similarityThreshold}%</span>
            </div>
            <input
              type="range"
              min="65"
              max="90"
              value={similarityThreshold}
              onChange={e => setSimilarityThreshold(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg accent-emerald-600"
            />
            <span className="text-[11px] text-slate-400 block">Distancia angular requerida para vincular dos radicaciones en un grupo común.</span>
          </div>

          <div className="space-y-1 text-xs">
            <div className="flex justify-between font-semibold text-slate-700">
              <span>Tamaño de Lote de Procesamiento:</span>
              <span className="text-purple-600 font-bold">{batchSize} casos / llamada</span>
            </div>
            <input
              type="range"
              min="5"
              max="25"
              value={batchSize}
              onChange={e => setBatchSize(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg accent-purple-600"
            />
            <span className="text-[11px] text-slate-400 block">Optimiza tiempos de espera y previene límites de tasa en la API.</span>
          </div>
        </div>
      </div>

      {/* Supabase & Cloud SQL Setup Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div className="flex items-center space-x-2 text-slate-900 font-bold text-base">
            <Database className="w-5 h-5 text-emerald-600" />
            <span>Persistencia en Supabase / PostgreSQL</span>
          </div>

          <button
            onClick={handleTestDb}
            disabled={testingDb}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center self-start sm:self-auto"
          >
            {testingDb ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
            Probar Conexión
          </button>
        </div>

        {dbStatus && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 font-medium">
            {dbStatus}
          </div>
        )}

        <div className="text-xs text-slate-600 space-y-1">
          <p>
            El sistema soporta persistencia directa en una base de datos PostgreSQL en <strong>Supabase</strong> con soporte para índices vectoriales (pgvector).
          </p>
          <p className="text-slate-500">
            Variables de entorno requeridas en <code>.env</code>: <code>SUPABASE_URL</code> y <code>SUPABASE_SERVICE_ROLE_KEY</code> (o <code>SUPABASE_ANON_KEY</code>). Si no están configuradas, el sistema almacena todos los datos en memoria y almacenamiento local sin interrumpir las operaciones.
          </p>
        </div>

        {/* SQL Schema viewer with Copy button */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700">Script DDL de Creación de Tablas (Copiar en el SQL Editor de Supabase):</span>
            <button
              onClick={copySql}
              className="px-2.5 py-1 bg-slate-800 text-white rounded-md text-[11px] font-semibold flex items-center hover:bg-slate-700 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
              {copied ? '¡Copiado!' : 'Copiar SQL'}
            </button>
          </div>

          <pre className="p-4 bg-slate-900 text-slate-200 rounded-xl text-[11px] font-mono overflow-x-auto max-h-56 leading-relaxed">
            {sqlSchema}
          </pre>
        </div>
      </div>
    </div>
  );
};
