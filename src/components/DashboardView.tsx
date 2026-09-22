import React from 'react';
import { 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Layers, 
  ShieldAlert, 
  Sparkles, 
  Download,
  AlertTriangle,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { EnrichedPQRSRecord, SemanticGroup } from '../types';
import { exportEnrichedExcel, exportCategoriesSummaryExcel } from '../services/excelService';

interface DashboardViewProps {
  records: EnrichedPQRSRecord[];
  groups: SemanticGroup[];
  onNavigate: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ records, groups, onNavigate }) => {
  const total = records.length;
  const procesados = records.filter(r => r.analisis).length;
  const pendientes = total - procesados;
  const conRevision = records.filter(r => r.analisis?.requiere_revision).length;
  const inconsistencias = records.filter(r => r.analisis?.posible_inconsistencia).length;
  const altaConfianza = records.filter(r => r.analisis?.nivel_confianza === 'Alta').length;
  const bajaConfianza = records.filter(r => r.analisis?.nivel_confianza === 'Baja').length;
  const nuevosPatrones = groups.filter(g => g.es_nuevo_patron);

  // Category counts
  const categoryStats: Record<string, number> = {};
  records.forEach(r => {
    const cat = r.analisis?.categoria || 'Sin procesar';
    categoryStats[cat] = (categoryStats[cat] || 0) + 1;
  });

  const sortedCategories = Object.entries(categoryStats).sort((a, b) => b[1] - a[1]);

  // Subcategory counts
  const subcategoryStats: Record<string, number> = {};
  records.forEach(r => {
    if (r.analisis?.subcategoria && r.analisis.subcategoria !== 'NO IDENTIFICADO') {
      const sub = r.analisis.subcategoria;
      subcategoryStats[sub] = (subcategoryStats[sub] || 0) + 1;
    }
  });

  const sortedSubcategories = Object.entries(subcategoryStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 text-white border border-slate-700/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Centro de Control de PQRS</h1>
          <p className="text-slate-300 text-sm mt-1 max-w-2xl">
            Lectura automatizada de descripciones, inferencia semántica con IA, detección de discrepancias y agrupamiento inteligente de expedientes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            id="btn-dash-upload"
            onClick={() => onNavigate('upload')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium shadow transition-colors flex items-center"
          >
            <FileText className="w-4 h-4 mr-2" />
            Cargar o Analizar
          </button>
          {total > 0 && (
            <button
              id="btn-dash-export"
              onClick={() => exportEnrichedExcel(records)}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium border border-slate-600 transition-colors flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Descargar Excel
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Expedientes</span>
            <span className="p-2 rounded-lg bg-blue-50 text-blue-600"><FileText className="w-5 h-5" /></span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900">{total}</span>
            <span className="text-xs text-slate-500 ml-2">radicaciones</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Procesados con IA</span>
            <span className="p-2 rounded-lg bg-emerald-50 text-emerald-600"><CheckCircle className="w-5 h-5" /></span>
          </div>
          <div className="mt-3 flex items-baseline">
            <span className="text-2xl font-bold text-slate-900">{procesados}</span>
            <span className="text-xs text-emerald-600 font-medium ml-2">
              {total > 0 ? `${((procesados / total) * 100).toFixed(0)}%` : '0%'}
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Requieren Revisión</span>
            <span className="p-2 rounded-lg bg-amber-50 text-amber-600"><AlertCircle className="w-5 h-5" /></span>
          </div>
          <div className="mt-3 flex items-baseline">
            <span className="text-2xl font-bold text-amber-600">{conRevision}</span>
            <button 
              onClick={() => onNavigate('revision')}
              className="text-xs text-blue-600 hover:underline ml-2 font-medium"
            >
              Revisar bandeja &rarr;
            </button>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Inconsistencias</span>
            <span className="p-2 rounded-lg bg-rose-50 text-rose-600"><ShieldAlert className="w-5 h-5" /></span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-rose-600">{inconsistencias}</span>
            <span className="text-xs text-slate-500 ml-2">resumen vs detalle</span>
          </div>
        </div>
      </div>

      {/* Second KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 block">Alta Confianza (&ge;85%)</span>
          <span className="text-xl font-bold text-slate-800">{altaConfianza}</span>
          <span className="text-xs text-slate-400 block mt-0.5">
            {procesados > 0 ? `${((altaConfianza / procesados) * 100).toFixed(0)}% del total` : 'N/A'}
          </span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 block">Baja Confianza (&lt;70%)</span>
          <span className="text-xl font-bold text-slate-800">{bajaConfianza}</span>
          <span className="text-xs text-slate-400 block mt-0.5">Requieren triaje humano</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 block">Grupos Semánticos</span>
          <span className="text-xl font-bold text-indigo-600">{groups.length}</span>
          <span className="text-xs text-slate-400 block mt-0.5">Clústeres identificados</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 block">Nuevos Patrones</span>
          <span className="text-xl font-bold text-purple-600">{nuevosPatrones.length}</span>
          <span className="text-xs text-slate-400 block mt-0.5">Fuera de catálogo estándar</span>
        </div>
      </div>

      {/* New Patterns Alert Banner */}
      {nuevosPatrones.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-purple-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-purple-900">
              NUEVOS PATRONES DETECTADOS ({nuevosPatrones.length})
            </h4>
            <p className="text-xs text-purple-800 mt-0.5">
              Se detectaron grupos con alta similitud semántica que no encajan en el catálogo oficial. Requieren validación del administrador.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {nuevosPatrones.map(np => (
                <span key={np.id} className="inline-flex items-center px-2.5 py-1 rounded-md bg-purple-100 text-purple-900 text-xs font-medium">
                  {np.id}: {np.nombre} ({np.cantidad_expedientes} casos)
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={() => onNavigate('grupos')}
            className="px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-lg hover:bg-purple-700"
          >
            Ver Grupos
          </button>
        </div>
      )}

      {/* Main Charts & Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Distribución por Categoría Principal</h3>
              <p className="text-xs text-slate-500">Clasificación asignada a partir de la descripción completa de la radicación</p>
            </div>
            <button
              onClick={() => onNavigate('categorias')}
              className="text-xs text-blue-600 hover:underline font-medium flex items-center"
            >
              Ver catálogo &rarr;
            </button>
          </div>

          {sortedCategories.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              No hay datos analizados todavía. Carga un archivo Excel para ver métricas.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {sortedCategories.map(([cat, count]) => {
                const pct = total > 0 ? (count / total) * 100 : 0;
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-slate-800">{cat}</span>
                      <span className="text-slate-500">
                        {count} exp. ({pct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Subcategories (1 Col) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900 pb-2 border-b border-slate-100">
            Subcategorías Principales
          </h3>
          <p className="text-xs text-slate-500 mb-4">Motivos específicos detectados por la IA</p>

          {sortedSubcategories.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              Sin datos aún.
            </div>
          ) : (
            <div className="space-y-2.5">
              {sortedSubcategories.map(([sub, count]) => (
                <div key={sub} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                  <span className="font-medium text-slate-800 truncate max-w-[180px]">{sub}</span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold shrink-0">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Semantic Groups Quick Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Grupos de Casos Semánticamente Similares</h3>
            <p className="text-xs text-slate-500">Expedientes agrupados por intención o problemática similar mediante embeddings</p>
          </div>
          <button
            onClick={() => onNavigate('grupos')}
            className="text-xs font-semibold text-blue-600 hover:underline flex items-center"
          >
            Explorar todos los grupos &rarr;
          </button>
        </div>

        {groups.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-sm">
            No se han generado grupos todavía. Ejecuta el análisis de un archivo para agrupar semánticamente los casos.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Grupo ID</th>
                  <th className="py-2.5 px-3">Categoría Asignada</th>
                  <th className="py-2.5 px-3 text-center">Expedientes</th>
                  <th className="py-2.5 px-3 text-center">Similitud Promedio</th>
                  <th className="py-2.5 px-3">Ejemplo de Hechos</th>
                  <th className="py-2.5 px-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groups.slice(0, 5).map(g => (
                  <tr key={g.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{g.id}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">
                        {g.categoria_sugerida}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-800">{g.cantidad_expedientes}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="text-emerald-700 font-semibold">{`${(g.similitud_promedio * 100).toFixed(1)}%`}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 italic truncate max-w-xs">
                      "{g.ejemplos_descripciones[0] || 'N/A'}"
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => onNavigate('grupos')}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Inspeccionar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
