import React, { useState } from 'react';
import { 
  UserCheck, 
  AlertCircle, 
  Check, 
  CheckCircle2, 
  Edit3, 
  XCircle, 
  Sparkles, 
  ShieldAlert, 
  Save, 
  ArrowRight,
  Download
} from 'lucide-react';
import { EnrichedPQRSRecord, PQRSAnalysis } from '../types';
import { getOfficialCatalog } from '../services/catalog';
import { exportEnrichedExcel } from '../services/excelService';

interface RevisionHumanaViewProps {
  records: EnrichedPQRSRecord[];
  onUpdateRecord: (updated: EnrichedPQRSRecord) => void;
}

export const RevisionHumanaView: React.FC<RevisionHumanaViewProps> = ({ records, onUpdateRecord }) => {
  const catalog = getOfficialCatalog();
  
  // Pending review records
  const reviewQueue = records.filter(r => 
    r.analisis?.requiere_revision || 
    r.analisis?.posible_inconsistencia ||
    (r.analisis && r.analisis.confianza < 70) ||
    r.analisis?.estado_revision === 'PENDIENTE'
  );

  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(
    reviewQueue.length > 0 ? reviewQueue[0].id : null
  );

  const currentRecord = records.find(r => r.id === selectedRecordId);

  // Edit form state
  const [editedCategory, setEditedCategory] = useState<string>('');
  const [editedSubcategory, setEditedSubcategory] = useState<string>('');
  const [editedSummary, setEditedSummary] = useState<string>('');
  const [analystNotes, setAnalystNotes] = useState<string>('');

  // When selectedRecord changes, populate edit form
  React.useEffect(() => {
    if (currentRecord?.analisis) {
      setEditedCategory(currentRecord.analisis.categoria);
      setEditedSubcategory(currentRecord.analisis.subcategoria);
      setEditedSummary(currentRecord.analisis.resumen_normalizado);
      setAnalystNotes('');
    }
  }, [selectedRecordId]);

  // Handle Approve without changes
  const handleApproveAsIs = () => {
    if (!currentRecord || !currentRecord.analisis) return;

    const updated: EnrichedPQRSRecord = {
      ...currentRecord,
      analisis: {
        ...currentRecord.analisis,
        requiere_revision: false,
        estado_revision: 'APROBADO',
        justificacion: `${currentRecord.analisis.justificacion} [Validado y aprobado por analista humano]`,
        revisado_por: 'Analista PQRS',
        fecha_revision: new Date().toISOString()
      }
    };
    onUpdateRecord(updated);

    // Advance to next in queue
    const remaining = reviewQueue.filter(r => r.id !== currentRecord.id);
    if (remaining.length > 0) {
      setSelectedRecordId(remaining[0].id);
    }
  };

  // Handle Save with adjustments
  const handleSaveAdjustments = () => {
    if (!currentRecord || !currentRecord.analisis) return;

    const updated: EnrichedPQRSRecord = {
      ...currentRecord,
      analisis: {
        ...currentRecord.analisis,
        categoria: editedCategory,
        subcategoria: editedSubcategory,
        resumen_normalizado: editedSummary,
        requiere_revision: false,
        estado_revision: 'AJUSTADO',
        justificacion: `Ajuste manual: ${analystNotes || 'Reclasificación validada por analista humano.'}`,
        revisado_por: 'Analista PQRS',
        fecha_revision: new Date().toISOString()
      }
    };
    onUpdateRecord(updated);

    // Advance to next in queue
    const remaining = reviewQueue.filter(r => r.id !== currentRecord.id);
    if (remaining.length > 0) {
      setSelectedRecordId(remaining[0].id);
    }
  };

  // Available subcategories for chosen category
  const selectedCatObj = catalog.find(c => c.nombre === editedCategory);
  const availableSubcategories = selectedCatObj ? selectedCatObj.subcategorias : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Bandeja de Revisión Humana</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Triaje de casos con baja confianza, discrepancias entre resumen y hechos, o clasificaciones atípicas
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
            {reviewQueue.length} casos pendientes de triaje
          </span>
          <button
            onClick={() => exportEnrichedExcel(records, 'PQRS_EN_REVISION.xlsx', true)}
            disabled={reviewQueue.length === 0}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center shadow-sm"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Descargar Pendientes
          </button>
        </div>
      </div>

      {reviewQueue.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
          <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 mb-3" />
          <h3 className="text-lg font-bold text-slate-900">¡Bandeja al día!</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            No hay radicaciones pendientes de revisión humana. Todos los expedientes analizados cumplen con los umbrales de alta confianza y consistencia.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Queue List */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Expedientes en Cola ({reviewQueue.length})
            </h3>

            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {reviewQueue.map(item => {
                const isSelected = item.id === selectedRecordId;
                const a = item.analisis;

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedRecordId(item.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">{item.numero_expediente}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        (a?.confianza || 0) < 70 ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {a?.confianza}% conf.
                      </span>
                    </div>

                    <div className="mt-1 text-[11px] text-slate-600 truncate">
                      {item.descripcion_original}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1">
                      {a?.posible_inconsistencia && (
                        <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-semibold">
                          Inconsistencia
                        </span>
                      )}
                      {a?.categoria && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px]">
                          {a.categoria}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Active Inspection & Decision Workspace (2 Cols) */}
          <div className="lg:col-span-2 space-y-4">
            {currentRecord && currentRecord.analisis ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
                {/* Header of active inspection */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                      Inspección de Expediente
                    </span>
                    <h3 className="text-xl font-bold text-slate-900">
                      {currentRecord.numero_expediente}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {currentRecord.analisis.posible_inconsistencia && (
                      <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold flex items-center">
                        <ShieldAlert className="w-3.5 h-3.5 mr-1" />
                        Inconsistencia Detectada
                      </span>
                    )}
                  </div>
                </div>

                {/* Hechos Reales vs Resumen Original */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Resumen Original Radicado:
                    </span>
                    <p className="text-slate-700 font-medium">
                      {currentRecord.resumen_original || 'Sin resumen registrado'}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-200">
                    <span className="font-bold text-blue-900 uppercase tracking-wider block mb-1">
                      Descripción Completa (Hechos Reales):
                    </span>
                    <p className="text-slate-800 leading-relaxed font-normal">
                      {currentRecord.descripcion_original}
                    </p>
                  </div>
                </div>

                {/* AI Findings */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 uppercase tracking-wider">
                      Interpretación del Lector Inteligente:
                    </span>
                    <span className="text-slate-500 font-mono text-[11px]">
                      Modelo: {currentRecord.analisis.modelo_ia}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div>
                      <strong className="text-slate-600">Problema identificado:</strong>
                      <p className="text-slate-900">{currentRecord.analisis.problema_principal}</p>
                    </div>
                    <div>
                      <strong className="text-slate-600">Solicitud real:</strong>
                      <p className="text-slate-900">{currentRecord.analisis.solicitud_cliente}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/80">
                    <strong className="text-slate-600">Justificación dada por la IA:</strong>
                    <p className="text-slate-700 italic">"{currentRecord.analisis.justificacion}"</p>
                  </div>
                </div>

                {/* Reclassification Workspace Form */}
                <div className="p-4 rounded-xl border-2 border-blue-200 bg-blue-50/20 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-blue-950 flex items-center">
                    <Edit3 className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                    Decisión del Analista Humano (Ajustar o Validar)
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Categoría Institucional:
                      </label>
                      <select
                        value={editedCategory}
                        onChange={e => {
                          setEditedCategory(e.target.value);
                          const matched = catalog.find(c => c.nombre === e.target.value);
                          if (matched && matched.subcategorias.length > 0) {
                            setEditedSubcategory(matched.subcategorias[0]);
                          }
                        }}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg font-medium text-slate-800"
                      >
                        {catalog.map(c => (
                          <option key={c.id} value={c.nombre}>{c.nombre}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Subcategoría / Causal:
                      </label>
                      <select
                        value={editedSubcategory}
                        onChange={e => setEditedSubcategory(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg font-medium text-slate-800"
                      >
                        {availableSubcategories.map((sub: string) => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}

                      </select>
                    </div>
                  </div>

                  <div className="text-xs">
                    <label className="block font-semibold text-slate-700 mb-1">
                      Resumen Normalizado (Editable):
                    </label>
                    <textarea
                      rows={2}
                      value={editedSummary}
                      onChange={e => setEditedSummary(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-800"
                      placeholder="Redacción estandarizada del caso..."
                    />
                  </div>

                  <div className="text-xs">
                    <label className="block font-semibold text-slate-700 mb-1">
                      Notas u Observaciones del Analista:
                    </label>
                    <input
                      type="text"
                      value={analystNotes}
                      onChange={e => setAnalystNotes(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-800"
                      placeholder="Ej: Se aclara que corresponde a cobro indebido según soportes anexos..."
                    />
                  </div>
                </div>

                {/* Decision Buttons */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2.5">
                  <button
                    onClick={handleApproveAsIs}
                    className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow"
                  >
                    <Check className="w-4 h-4" />
                    Aprobar Análisis Tal Cual (Sin Modificar)
                  </button>
                  <button
                    onClick={handleSaveAdjustments}
                    className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow"
                  >
                    <Save className="w-4 h-4" />
                    Guardar Ajustes y Pasar al Siguiente
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 bg-slate-50 border border-slate-200 rounded-2xl text-center text-slate-400 text-xs">
                Selecciona un expediente de la cola para inspeccionarlo.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
