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
import { EnrichedPQRSRecord, CATEGORIAS_OFICIALES_16 } from '../types';
import { exportEnrichedExcel, exportCategoriesSummaryExcel } from '../services/excelService';

interface ExpedientesViewProps {
  records: EnrichedPQRSRecord[];
  onUpdateRecord?: (updated: EnrichedPQRSRecord) => void;
  onNavigateToReview?: () => void;
}

export const ExpedientesView: React.FC<ExpedientesViewProps> = ({ records, onUpdateRecord, onNavigateToReview }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTipoPqr, setSelectedTipoPqr] = useState<string>('TODOS');
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
  const uniqueCategories = Array.from(new Set(records.map(r => r.analisis?.motivo || r.analisis?.categoria || 'Sin procesar'))).sort();
  const uniqueGroups = Array.from(new Set(records.map(r => r.grupo_id || 'N/A'))).sort();

  // Filter records
  const filtered = records.filter(r => {
    const term = searchTerm.toLowerCase().trim();
    if (term) {
      const matchExp = r.numero_expediente.toLowerCase().includes(term);
      const matchDesc = r.descripcion_original.toLowerCase().includes(term);
      const matchRes = (r.resumen_original || '').toLowerCase().includes(term);
      const matchTipo = (r.analisis?.tipo_pqr || '').toLowerCase().includes(term);
      const matchMotivo = (r.analisis?.motivo || r.analisis?.categoria || '').toLowerCase().includes(term);
      const matchSubm = (r.analisis?.submotivo || r.analisis?.subcategoria || '').toLowerCase().includes(term);
      const matchSol = (r.analisis?.que_solicita_exactamente || r.analisis?.solicitud_cliente || '').toLowerCase().includes(term);
      const matchProd = (r.analisis?.producto || '').toLowerCase().includes(term);
      if (!matchExp && !matchDesc && !matchRes && !matchTipo && !matchMotivo && !matchSubm && !matchSol && !matchProd) {
        return false;
      }
    }

    if (selectedTipoPqr !== 'TODOS' && (r.analisis?.tipo_pqr || '') !== selectedTipoPqr) {
      return false;
    }

    if (selectedCategory !== 'TODAS' && (r.analisis?.categoria || r.analisis?.motivo || 'Sin procesar') !== selectedCategory) {
      return false;
    }

    if (selectedConfidence !== 'TODAS' && r.analisis?.nivel_confianza !== selectedConfidence) {
      return false;
    }

    if (filterInconsistency === 'SI' && !(r.analisis?.existe_inconsistencia === 'SI' || r.analisis?.posible_inconsistencia)) return false;
    if (filterInconsistency === 'NO' && (r.analisis?.existe_inconsistencia === 'SI' || r.analisis?.posible_inconsistencia)) return false;

    if (filterRequiresReview === 'SI' && !(r.analisis?.requiere_revision_humana === 'SI' || r.analisis?.requiere_revision)) return false;
    if (filterRequiresReview === 'NO' && (r.analisis?.requiere_revision_humana === 'SI' || r.analisis?.requiere_revision)) return false;

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
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 pt-2 border-t border-slate-100 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Tipo de PQR:</label>
            <select
              value={selectedTipoPqr}
              onChange={e => { setSelectedTipoPqr(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-slate-700 font-medium"
            >
              <option value="TODOS">Todos los tipos</option>
              <option value="PETICIÓN">PETICIÓN</option>
              <option value="QUEJA">QUEJA</option>
              <option value="RECLAMO">RECLAMO</option>
              <option value="SOLICITUD">SOLICITUD</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Categoría Oficial (1 de 16):</label>
            <select
              value={selectedCategory}
              onChange={e => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-slate-700 font-medium"
            >
              <option value="TODAS">Todas las 16 categorías</option>
              {CATEGORIAS_OFICIALES_16.map(c => (
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
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Revisión Humana:</label>
            <select
              value={filterRequiresReview}
              onChange={e => { setFilterRequiresReview(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-slate-700"
            >
              <option value="TODOS">Todos</option>
              <option value="SI">Requiere revisión</option>
              <option value="NO">Sin revisión</option>
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
                  <th className="py-3 px-3.5">Categoría Oficial (16)</th>
                  <th className="py-3 px-3.5">Tipo PQR</th>
                  <th className="py-3 px-3.5">Producto</th>
                  <th className="py-3 px-3.5">Descripción Detallada (Fuente Principal)</th>
                  <th className="py-3 px-3.5 text-center">Confianza</th>
                  <th className="py-3 px-3.5 text-center">Inconsistencia</th>
                  <th className="py-3 px-3.5 text-center">Revisión Humana</th>
                  <th className="py-3 px-3.5 text-right">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map(r => {
                  const a = r.analisis;
                  const tipoPqr = a?.tipo_pqr || (a?.categoria === 'DATOS / INFORMACIÓN' ? 'PETICIÓN' : 'RECLAMO');
                  const isInconsistent = a?.existe_inconsistencia === 'SI' || a?.posible_inconsistencia;
                  const needsReview = a?.requiere_revision_humana === 'SI' || a?.requiere_revision;

                  const tipoColor = 
                    tipoPqr === 'PETICIÓN' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                    tipoPqr === 'QUEJA' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    tipoPqr === 'SOLICITUD' ? 'bg-teal-50 text-teal-700 border-teal-200' :
                    'bg-rose-50 text-rose-700 border-rose-200';

                  return (
                    <tr 
                      key={r.id} 
                      onClick={() => setActiveRecord(r)}
                      className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-3.5 font-bold text-slate-900 whitespace-nowrap">
                        {r.numero_expediente}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-50 text-blue-900 border border-blue-200 inline-block">
                          {a?.categoria || 'Sin procesar'}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${tipoColor}`}>
                          {tipoPqr}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-slate-800 font-medium whitespace-nowrap">
                        {a?.producto || r.columnas_adicionales?.NOMBRE_PRODUCTO || '-'}
                      </td>
                      <td className="py-3 px-3.5 text-slate-800 max-w-sm truncate" title={r.descripcion_original}>
                        {r.descripcion_original}
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
                            {a.confianza}%
                          </span>
                        ) : '-'}
                      </td>
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        {isInconsistent ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-semibold text-[11px]">
                            <ShieldAlert className="w-3 h-3 mr-1" />
                            SÍ
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">NO</span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        {needsReview ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold text-[11px]">
                            SÍ
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-medium text-[11px]">NO</span>
                        )}
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

            {/* Section 1: Datos de Entrada según Orden de Prioridad */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  1. ENTRADA Y ORDEN DE PRIORIDAD DE INFORMACIÓN
                </h4>
                <span className="text-[11px] text-slate-500">Expediente: <strong>{activeRecord.numero_expediente}</strong></span>
              </div>
              
              {/* Prioridad 1 */}
              <div className="p-3 bg-white border-2 border-blue-200 rounded-lg space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wide">
                    1. DESC_DETALLADA (Fuente Principal)
                  </span>
                  <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-semibold">Prioridad 1</span>
                </div>
                <p className="text-xs text-slate-900 leading-relaxed font-normal whitespace-pre-wrap">
                  {activeRecord.descripcion_original}
                </p>
              </div>

              {/* Prioridad 2 y 3 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                  <span className="text-[11px] font-bold text-slate-600 block uppercase">
                    2. SUBMOTIVO (Contexto de Apoyo)
                  </span>
                  <span className="text-slate-800 font-medium">
                    {activeRecord.columnas_adicionales?.SUBMOTIVO || activeRecord.resumen_original || 'No provisto'}
                  </span>
                </div>
                <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                  <span className="text-[11px] font-bold text-slate-600 block uppercase">
                    3. NOMBRE_PRODUCTO (Contexto de Apoyo)
                  </span>
                  <span className="text-slate-800 font-medium">
                    {activeRecord.columnas_adicionales?.NOMBRE_PRODUCTO || activeRecord.analisis?.producto || 'No provisto'}
                  </span>
                </div>
              </div>
            </div>

            {/* Section 2: Análisis e Interpretación IA */}
            {activeRecord.analisis ? (
              <div className="bg-blue-50/30 rounded-xl p-4 border border-blue-100 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center">
                    <Sparkles className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                    2. RESULTADOS DE CLASIFICACIÓN E INTERPRETACIÓN
                  </h4>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    activeRecord.analisis.confianza >= 85 ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                    activeRecord.analisis.confianza >= 70 ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                    'bg-rose-100 text-rose-800 border border-rose-200'
                  }`}>
                    Nivel de Confianza: {activeRecord.analisis.confianza}/100 ({activeRecord.analisis.nivel_confianza})
                  </span>
                </div>

                {/* Official 16-Category Classification Card */}
                <div className="p-4 bg-gradient-to-r from-blue-900 to-indigo-900 rounded-xl text-white shadow-md space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-blue-200">
                        Categoría General Asignada (1 de 16 Oficiales)
                      </span>
                      <h5 className="text-lg font-black text-white tracking-wide">
                        {activeRecord.analisis.categoria}
                      </h5>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-white/15 border border-white/20 rounded-lg text-xs font-bold text-white">
                        Confianza: {activeRecord.analisis.confianza}%
                      </span>
                      <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                        activeRecord.analisis.requiere_revision_humana === 'SI' || activeRecord.analisis.requiere_revision
                          ? 'bg-amber-400 text-slate-900'
                          : 'bg-emerald-500 text-white'
                      }`}>
                        Revisión Humana: {activeRecord.analisis.requiere_revision_humana === 'SI' || activeRecord.analisis.requiere_revision ? 'SÍ' : 'NO'}
                      </span>
                    </div>
                  </div>

                  {/* Formato JSON Oficial */}
                  <div className="bg-slate-950/80 rounded-lg p-3 border border-white/10 font-mono text-xs text-blue-200">
                    <span className="text-[10px] text-slate-400 block mb-1 font-sans font-semibold">
                      FORMATO DE SALIDA EXACTO (JSON):
                    </span>
                    <pre className="text-emerald-300 overflow-x-auto text-[11px] leading-tight">
{JSON.stringify({
  expediente: activeRecord.numero_expediente,
  categoria: activeRecord.analisis.categoria,
  confianza: activeRecord.analisis.confianza,
  requiere_revision_humana: Boolean(activeRecord.analisis.requiere_revision_humana === 'SI' || activeRecord.analisis.requiere_revision)
}, null, 2)}
                    </pre>
                  </div>
                </div>

                {/* Grid con Producto, Tipo PQR, Motivo, Submotivo */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                    <span className="text-slate-500 block font-medium text-[11px]">Tipo de PQR:</span>
                    <span className="font-bold text-blue-900 text-sm">
                      {activeRecord.analisis.tipo_pqr || (activeRecord.analisis.categoria === 'DATOS / INFORMACIÓN' ? 'PETICIÓN' : 'RECLAMO')}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                    <span className="text-slate-500 block font-medium text-[11px]">Producto:</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {activeRecord.analisis.producto || 'NO IDENTIFICADO'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                    <span className="text-slate-500 block font-medium text-[11px]">Categoría Oficial:</span>
                    <span className="font-bold text-slate-900 truncate block">
                      {activeRecord.analisis.categoria}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                    <span className="text-slate-500 block font-medium text-[11px]">Submotivo / Ref:</span>
                    <span className="font-semibold text-slate-800 truncate block">
                      {activeRecord.analisis.submotivo || activeRecord.analisis.subcategoria || activeRecord.analisis.categoria}
                    </span>
                  </div>
                </div>

                {/* Detalle exacto */}
                <div className="space-y-2.5 text-xs">
                  <div className="p-3 rounded-lg bg-white border border-slate-200">
                    <span className="font-bold text-slate-700 block mb-1">
                      Qué solicita exactamente el cliente:
                    </span>
                    <p className="text-slate-900 font-medium">
                      {activeRecord.analisis.que_solicita_exactamente || activeRecord.analisis.solicitud_cliente}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-white border border-slate-200">
                    <span className="font-bold text-slate-700 block mb-1">
                      Hechos principales:
                    </span>
                    <p className="text-slate-800">
                      {activeRecord.analisis.hechos_principales || activeRecord.analisis.problema_principal}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-white border border-slate-200">
                    <span className="font-bold text-slate-700 block mb-1">
                      Palabras o frases que sustentan la clasificación:
                    </span>
                    <p className="text-slate-700 italic">
                      "{activeRecord.analisis.sustento_clasificacion || activeRecord.analisis.justificacion}"
                    </p>
                  </div>
                </div>

                {/* Inconsistencias y Revisión Humana */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                  {/* Inconsistencia */}
                  <div className={`p-3 rounded-lg border ${
                    activeRecord.analisis.existe_inconsistencia === 'SI' || activeRecord.analisis.posible_inconsistencia
                      ? 'bg-rose-50/70 border-rose-200'
                      : 'bg-emerald-50/50 border-emerald-200'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-800">Inconsistencia con clasificación original:</span>
                      <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                        activeRecord.analisis.existe_inconsistencia === 'SI' || activeRecord.analisis.posible_inconsistencia
                          ? 'bg-rose-200 text-rose-800'
                          : 'bg-emerald-200 text-emerald-800'
                      }`}>
                        {activeRecord.analisis.existe_inconsistencia === 'SI' || activeRecord.analisis.posible_inconsistencia ? 'SÍ' : 'NO'}
                      </span>
                    </div>
                    {(activeRecord.analisis.existe_inconsistencia === 'SI' || activeRecord.analisis.posible_inconsistencia) && (
                      <p className="text-rose-900 mt-1 text-[11px]">
                        {activeRecord.analisis.motivo_inconsistencia || 'Existe diferencia sustancial entre la descripción detallada y el resumen o submotivo registrado originalmente.'}
                      </p>
                    )}
                  </div>

                  {/* Revisión Humana */}
                  <div className={`p-3 rounded-lg border ${
                    activeRecord.analisis.requiere_revision_humana === 'SI' || activeRecord.analisis.requiere_revision
                      ? 'bg-amber-50/70 border-amber-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-800">Requiere Revisión Humana:</span>
                      <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                        activeRecord.analisis.requiere_revision_humana === 'SI' || activeRecord.analisis.requiere_revision
                          ? 'bg-amber-200 text-amber-900'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {activeRecord.analisis.requiere_revision_humana === 'SI' || activeRecord.analisis.requiere_revision ? 'SÍ' : 'NO'}
                      </span>
                    </div>
                    {(activeRecord.analisis.requiere_revision_humana === 'SI' || activeRecord.analisis.requiere_revision) && (
                      <p className="text-amber-950 mt-1 text-[11px]">
                        {activeRecord.analisis.motivo_de_revision || 'Caso con elementos atípicos, ambigüedad o alerta que amerita validación por un analista humano.'}
                      </p>
                    )}
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
