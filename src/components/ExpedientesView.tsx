import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  ShieldAlert, 
  AlertCircle, 
  CheckCircle, 
  X,
  Layers,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { EnrichedPQRSRecord } from '../types';
import { exportEnrichedExcel, exportCategoriesSummaryExcel } from '../services/excelService';

interface ExpedientesViewProps {
  records: EnrichedPQRSRecord[];
  onUpdateRecord?: (updated: EnrichedPQRSRecord) => void;
  onNavigateToReview?: () => void;
}

export const ExpedientesView: React.FC<ExpedientesViewProps> = ({ records, onUpdateRecord, onNavigateToReview }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('TODAS');
  const [selectedConfidence, setSelectedConfidence] = useState<string>('TODAS');
  const [filterInconsistency, setFilterInconsistency] = useState<string>('TODOS');
  const [filterRequiresReview, setFilterRequiresReview] = useState<string>('TODOS');
  const [filterGroup, setFilterGroup] = useState<string>('TODOS');
  
  // Selected record for modal
  const [activeRecord, setActiveRecord] = useState<EnrichedPQRSRecord | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Extract unique filter options
  const uniqueCategories = Array.from(new Set(records.map(r => r.analisis?.categoria || 'Sin procesar'))).sort();
  const uniqueGroups = Array.from(new Set(records.map(r => r.grupo_id || 'N/A'))).sort();

  // Filter records
  const filtered = records.filter(r => {
    const term = searchTerm.toLowerCase().trim();
    if (term) {
      const matchExp = r.numero_expediente.toLowerCase().includes(term);
      const matchDesc = r.descripcion_original.toLowerCase().includes(term);
      const matchRes = (r.resumen_original || '').toLowerCase().includes(term);
      const matchNorm = (r.analisis?.resumen_normalizado || '').toLowerCase().includes(term);
      const matchProb = (r.analisis?.problema_principal || '').toLowerCase().includes(term);
      const matchProd = (r.analisis?.producto || '').toLowerCase().includes(term);
      if (!matchExp && !matchDesc && !matchRes && !matchNorm && !matchProb && !matchProd) {
        return false;
      }
    }

    if (selectedCategory !== 'TODAS' && (r.analisis?.categoria || 'Sin procesar') !== selectedCategory) {
      return false;
    }

    if (selectedConfidence !== 'TODAS' && r.analisis?.nivel_confianza !== selectedConfidence) {
      return false;
    }

    if (filterInconsistency === 'SI' && !r.analisis?.posible_inconsistencia) return false;
    if (filterInconsistency === 'NO' && r.analisis?.posible_inconsistencia) return false;

    if (filterRequiresReview === 'SI' && !r.analisis?.requiere_revision) return false;
    if (filterRequiresReview === 'NO' && r.analisis?.requiere_revision) return false;

    if (filterGroup !== 'TODOS' && r.grupo_id !== filterGroup) return false;

    return true;
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Find similar cases for active record modal
  const similarInGroup = activeRecord?.grupo_id
    ? records.filter(r => r.id !== activeRecord.id && r.grupo_id === activeRecord.grupo_id).slice(0, 3)
    : [];

  return (
    <div className="space-y-6">
      {/* Header & Export Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Explorador de Expedientes PQRS</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Total en inventario: <strong>{records.length}</strong> | Mostrando: <strong>{filtered.length}</strong> filtrados
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportEnrichedExcel(records, 'PQRS_ANALIZADAS.xlsx', false)}
            disabled={records.length === 0}
            className="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center shadow-sm"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Descargar Excel Completo
          </button>
          <button
            onClick={() => exportEnrichedExcel(records, 'PQRS_REQUIEREN_REVISION.xlsx', true)}
            disabled={records.length === 0}
            className="px-3 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center shadow-sm"
          >
            <AlertCircle className="w-3.5 h-3.5 mr-1.5" />
            Solo en Revisión
          </button>
          <button
            onClick={() => exportCategoriesSummaryExcel(records)}
            disabled={records.length === 0}
            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center shadow-sm"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Resumen Categorías
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por expediente, hechos, solicitud, problema o producto..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Quick Clear */}
          {(searchTerm || selectedCategory !== 'TODAS' || selectedConfidence !== 'TODAS' || filterInconsistency !== 'TODOS' || filterRequiresReview !== 'TODOS' || filterGroup !== 'TODOS') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('TODAS');
                setSelectedConfidence('TODAS');
                setFilterInconsistency('TODOS');
                setFilterRequiresReview('TODOS');
                setFilterGroup('TODOS');
                setCurrentPage(1);
              }}
              className="text-xs text-slate-500 hover:text-slate-800 underline font-medium shrink-0"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Dropdown Filters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2 border-t border-slate-100 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Categoría:</label>
            <select
              value={selectedCategory}
              onChange={e => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-slate-700"
            >
              <option value="TODAS">Todas las categorías</option>
              {uniqueCategories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Confianza IA:</label>
            <select
              value={selectedConfidence}
              onChange={e => { setSelectedConfidence(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-slate-700"
            >
              <option value="TODAS">Todas</option>
              <option value="Alta">Alta (&ge;85%)</option>
              <option value="Media">Media (70-84%)</option>
              <option value="Baja">Baja (&lt;70%)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Inconsistencia:</label>
            <select
              value={filterInconsistency}
              onChange={e => { setFilterInconsistency(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-slate-700"
            >
              <option value="TODOS">Todas</option>
              <option value="SI">Solo inconsistentes</option>
              <option value="NO">Sin inconsistencia</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Requiere Revisión:</label>
            <select
              value={filterRequiresReview}
              onChange={e => { setFilterRequiresReview(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-slate-700"
            >
              <option value="TODOS">Todos</option>
              <option value="SI">Requiere revisión humana</option>
              <option value="NO">Sin revisión requerida</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Grupo Semántico:</label>
            <select
              value={filterGroup}
              onChange={e => { setFilterGroup(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-slate-700"
            >
              <option value="TODOS">Todos los grupos</option>
              {uniqueGroups.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            No se encontraron expedientes con los criterios seleccionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3.5">Expediente</th>
                  <th className="py-3 px-3.5">Resumen Original</th>
                  <th className="py-3 px-3.5">Descripción de Radicación</th>
                  <th className="py-3 px-3.5">Categoría IA</th>
                  <th className="py-3 px-3.5">Subcategoría</th>
                  <th className="py-3 px-3.5 text-center">Confianza</th>
                  <th className="py-3 px-3.5 text-center">Inconsistencia</th>
                  <th className="py-3 px-3.5 text-center">Grupo</th>
                  <th className="py-3 px-3.5 text-right">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map(r => {
                  const a = r.analisis;
                  return (
                    <tr 
                      key={r.id} 
                      onClick={() => setActiveRecord(r)}
                      className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-3.5 font-bold text-slate-900 whitespace-nowrap">
                        {r.numero_expediente}
                      </td>
                      <td className="py-3 px-3.5 text-slate-600 max-w-[140px] truncate" title={r.resumen_original}>
                        {r.resumen_original || '-'}
                      </td>
                      <td className="py-3 px-3.5 text-slate-800 max-w-xs truncate" title={r.descripcion_original}>
                        {r.descripcion_original}
                      </td>
                      <td className="py-3 px-3.5">
                        <span className="px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-800 border border-blue-200/60 whitespace-nowrap">
                          {a?.categoria || 'Sin procesar'}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-slate-600 max-w-[150px] truncate">
                        {a?.subcategoria || '-'}
                      </td>
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        {a ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                            a.nivel_confianza === 'Alta' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : a.nivel_confianza === 'Media' 
                              ? 'bg-amber-100 text-amber-800' 
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {a.confianza}% ({a.nivel_confianza})
                          </span>
                        ) : '-'}
                      </td>
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        {a?.posible_inconsistencia ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-semibold text-[11px]">
                            <ShieldAlert className="w-3 h-3 mr-1" />
                            Detectada
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-center whitespace-nowrap font-mono text-slate-600">
                        {r.grupo_id || 'N/A'}
                      </td>
                      <td className="py-3 px-3.5 text-right">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setActiveRecord(r); }}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="Ver ficha completa"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
            <span>Página {currentPage} de {totalPages}</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-md border border-slate-200 bg-white disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-md border border-slate-200 bg-white disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Expediente Detail Modal (Section 26) */}
      {activeRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl p-6 space-y-6 my-8 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-200">
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Ficha de Expediente</span>
                <h3 className="text-xl font-bold text-slate-900">
                  Expediente: {activeRecord.numero_expediente}
                </h3>
              </div>
              <button 
                onClick={() => setActiveRecord(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Section 1: Datos Originales */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                1. DATOS ORIGINALES DEL EXPEDIENTE
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="font-semibold text-slate-500 block">Número de expediente:</span>
                  <span className="font-bold text-slate-900">{activeRecord.numero_expediente}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 block">Resumen original:</span>
                  <span className="text-slate-800">{activeRecord.resumen_original || 'Sin resumen'}</span>
                </div>
              </div>
              <div className="text-xs pt-1">
                <span className="font-semibold text-slate-500 block mb-0.5">Descripción completa de la radicación:</span>
                <p className="p-2.5 rounded-lg bg-white border border-slate-200 text-slate-800 leading-relaxed">
                  {activeRecord.descripcion_original}
                </p>
              </div>
            </div>

            {/* Section 2: Análisis IA (Lector Inteligente) */}
            {activeRecord.analisis ? (
              <div className="bg-blue-50/40 rounded-xl p-4 border border-blue-100 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center">
                    <Sparkles className="w-3.5 h-3.5 mr-1 text-blue-600" />
                    2. ANÁLISIS DEL LECTOR INTELIGENTE PQRS
                  </h4>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    activeRecord.analisis.nivel_confianza === 'Alta' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    Confianza: {activeRecord.analisis.confianza}% ({activeRecord.analisis.nivel_confianza})
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-2 rounded bg-white border border-blue-100">
                    <span className="text-slate-500 block font-medium">Categoría IA:</span>
                    <span className="font-bold text-blue-950">{activeRecord.analisis.categoria}</span>
                  </div>
                  <div className="p-2 rounded bg-white border border-blue-100">
                    <span className="text-slate-500 block font-medium">Subcategoría IA:</span>
                    <span className="font-bold text-slate-900">{activeRecord.analisis.subcategoria}</span>
                  </div>
                  <div className="p-2 rounded bg-white border border-blue-100">
                    <span className="text-slate-500 block font-medium">Producto detectado:</span>
                    <span className="font-semibold text-slate-800">{activeRecord.analisis.producto}</span>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="font-semibold text-slate-600 block">Problema principal identificado:</span>
                    <p className="text-slate-800 p-2 rounded bg-white border border-slate-200">
                      {activeRecord.analisis.problema_principal}
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-600 block">Solicitud real del cliente:</span>
                    <p className="text-slate-800 p-2 rounded bg-white border border-slate-200">
                      {activeRecord.analisis.solicitud_cliente}
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold text-blue-900 block">Resumen normalizado IA:</span>
                    <p className="text-blue-950 font-medium p-2 rounded bg-blue-100/50 border border-blue-200">
                      {activeRecord.analisis.resumen_normalizado}
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-600 block">Justificación de la clasificación:</span>
                    <p className="text-slate-700 italic p-2 rounded bg-white border border-slate-200">
                      "{activeRecord.analisis.justificacion}"
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
                Este expediente aún no ha sido analizado por el Lector Inteligente.
              </div>
            )}

            {/* Section 3: Similitud y Grupo */}
            <div className="bg-indigo-50/40 rounded-xl p-4 border border-indigo-100 space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center">
                <Layers className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                3. SIMILITUD Y AGRUPACIÓN SEMÁNTICA
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="font-medium text-slate-500 block">Grupo asignado:</span>
                  <span className="font-bold text-indigo-950 font-mono">{activeRecord.grupo_id || 'Sin grupo'}</span>
                </div>
                <div>
                  <span className="font-medium text-slate-500 block">Similitud con centroide de grupo:</span>
                  <span className="font-semibold text-emerald-700">
                    {activeRecord.similitud_grupo ? `${(activeRecord.similitud_grupo * 100).toFixed(1)}%` : 'N/A'}
                  </span>
                </div>
              </div>

              {similarInGroup.length > 0 && (
                <div className="text-xs pt-1">
                  <span className="font-semibold text-slate-600 block mb-1">Otros casos en el mismo grupo semántico:</span>
                  <div className="space-y-1">
                    {similarInGroup.map(sim => (
                      <div key={sim.id} className="p-2 rounded bg-white border border-indigo-100 text-slate-700 text-[11px]">
                        <strong>{sim.numero_expediente}:</strong> {sim.descripcion_original.substring(0, 120)}...
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Section 4: Validación y Revisión */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2 text-xs">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                4. VALIDACIÓN DE INCONSISTENCIAS Y ESTADO
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500 block">Posible inconsistencia:</span>
                  <span className={`font-bold ${activeRecord.analisis?.posible_inconsistencia ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {activeRecord.analisis?.posible_inconsistencia ? 'SÍ (El resumen original difiere de los hechos reales)' : 'NO'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Requiere revisión humana:</span>
                  <span className={`font-bold ${activeRecord.analisis?.requiere_revision ? 'text-amber-600' : 'text-slate-700'}`}>
                    {activeRecord.analisis?.requiere_revision ? 'SÍ (Enviado a bandeja de triaje)' : 'NO'}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions in Modal */}
            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setActiveRecord(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Cerrar
              </button>
              {activeRecord.analisis?.requiere_revision && onNavigateToReview && (
                <button
                  onClick={() => {
                    setActiveRecord(null);
                    onNavigateToReview();
                  }}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
                >
                  Ir a Bandeja de Revisión Humana &rarr;
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
