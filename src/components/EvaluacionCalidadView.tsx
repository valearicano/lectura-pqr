import React from 'react';
import { 
  BarChart3, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  TrendingUp, 
  Info,
  Download
} from 'lucide-react';
import { EnrichedPQRSRecord } from '../types';

interface EvaluacionCalidadViewProps {
  records: EnrichedPQRSRecord[];
}

export const EvaluacionCalidadView: React.FC<EvaluacionCalidadViewProps> = ({ records }) => {
  const processed = records.filter(r => r.analisis);
  
  // Calculate average confidence
  const avgConfidence = processed.length > 0
    ? Math.round(processed.reduce((acc, r) => acc + (r.analisis?.confianza || 0), 0) / processed.length)
    : 0;

  const highConfidenceCount = processed.filter(r => r.analisis?.nivel_confianza === 'Alta').length;
  const inconsistenciesCount = processed.filter(r => r.analisis?.posible_inconsistencia).length;
  const reviewCount = processed.filter(r => r.analisis?.requiere_revision).length;

  // Check if records have original human category to compare (resumen_original or similar)
  const categoryDistribution: Record<string, number> = {};
  processed.forEach(r => {
    const cat = r.analisis?.categoria || 'OTROS';
    categoryDistribution[cat] = (categoryDistribution[cat] || 0) + 1;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Evaluación de Calidad y Rendimiento del Modelo</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Métricas de confiabilidad, consistencia entre hechos y resúmenes, y análisis de distribución de categorías
          </p>
        </div>
      </div>

      {/* KPI metrics cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold uppercase text-slate-500 block">Confiabilidad Promedio</span>
          <span className="text-3xl font-bold text-blue-600 mt-2 block">{avgConfidence}%</span>
          <span className="text-xs text-slate-400 mt-1 block">Score de certeza semántica</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold uppercase text-slate-500 block">Alta Confianza (&ge;85%)</span>
          <span className="text-3xl font-bold text-emerald-600 mt-2 block">
            {processed.length > 0 ? `${((highConfidenceCount / processed.length) * 100).toFixed(0)}%` : '0%'}
          </span>
          <span className="text-xs text-slate-400 mt-1 block">{highConfidenceCount} radicaciones seguras</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold uppercase text-slate-500 block">Tasa de Inconsistencias</span>
          <span className="text-3xl font-bold text-rose-600 mt-2 block">
            {processed.length > 0 ? `${((inconsistenciesCount / processed.length) * 100).toFixed(1)}%` : '0%'}
          </span>
          <span className="text-xs text-slate-400 mt-1 block">Hechos difieren del resumen</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold uppercase text-slate-500 block">Tasa de Triaje Humano</span>
          <span className="text-3xl font-bold text-amber-600 mt-2 block">
            {processed.length > 0 ? `${((reviewCount / processed.length) * 100).toFixed(1)}%` : '0%'}
          </span>
          <span className="text-xs text-slate-400 mt-1 block">Casos con revisión requerida</span>
        </div>
      </div>

      {/* Discrepancy & Consistency Matrix */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900">Análisis de Consistencia Semántica: Resumen vs Hechos</h3>
        <p className="text-xs text-slate-500">
          Una de las fuentes principales de error en la gestión de PQRS bancarias es registrar un resumen genérico que contradice o enmascara el reclamo real.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
            <div className="flex items-center space-x-2 text-emerald-900 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Casos Consistentes ({processed.length - inconsistenciesCount})</span>
            </div>
            <p className="text-xs text-emerald-800 mt-1">
              El resumen original coincide con la problemática explicada en la descripción. El modelo pudo clasificar sin contradicciones.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200">
            <div className="flex items-center space-x-2 text-rose-900 font-bold text-sm">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Inconsistencias Resueltas ({inconsistenciesCount})</span>
            </div>
            <p className="text-xs text-rose-800 mt-1">
              El resumen original apuntaba a un concepto erróneo (ej: "Extracto"), pero los hechos revelaron otra causa (ej: "Cobro de intereses"). La IA corrigió la causal a partir de los hechos.
            </p>
          </div>
        </div>
      </div>

      {/* Category Bias & Over-assignment Inspection */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900">Distribución de Asignaciones y Control de Sesgo</h3>
        <p className="text-xs text-slate-500">
          Permite verificar que el modelo no esté concentrando indebidamente casos en una sola categoría o enviando demasiados casos a "OTROS".
        </p>

        <div className="space-y-3 pt-2">
          {Object.entries(categoryDistribution).map(([cat, count]) => {
            const pct = processed.length > 0 ? (count / processed.length) * 100 : 0;
            const isOthers = cat === 'OTROS';
            return (
              <div key={cat} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className={isOthers && pct > 15 ? 'text-rose-600 font-bold' : 'text-slate-800'}>
                    {cat} {isOthers && pct > 15 && '(Advertencia: Alta concentración en Otros)'}
                  </span>
                  <span className="text-slate-500 font-mono">
                    {count} casos ({pct.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isOthers && pct > 15 ? 'bg-rose-500' : 'bg-blue-600'
                    }`}
                    style={{ width: `${pct}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Benchmark Note */}
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3 text-xs text-slate-600">
        <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
        <div>
          <strong className="text-slate-800">Nota sobre el Benchmark de Accuracy:</strong>
          <p className="mt-0.5">
            Para calcular matrices de confusión completas (Precision, Recall y F1-Score formales), el archivo cargado debe incluir una columna de etiqueta de verdad fundamental (Ground Truth). Al procesar inventarios sin etiqueta previa, el sistema evalúa la coherencia interna, el score de incertidumbre del LLM y la distancia angular en el espacio de embeddings.
          </p>
        </div>
      </div>
    </div>
  );
};
