import React, { useState } from 'react';
import { 
  Layers, 
  Sparkles, 
  CheckCircle, 
  Download, 
  ChevronDown, 
  ChevronUp, 
  PlusCircle, 
  Sliders,
  ExternalLink
} from 'lucide-react';
import { SemanticGroup, EnrichedPQRSRecord } from '../types';
import { exportGroupsExcel } from '../services/excelService';

interface GruposSimilaresViewProps {
  groups: SemanticGroup[];
  records: EnrichedPQRSRecord[];
  onApproveNewPattern?: (patternName: string, category: string) => void;
  onNavigateToExpedientes?: (groupId: string) => void;
}

export const GruposSimilaresView: React.FC<GruposSimilaresViewProps> = ({
  groups,
  records,
  onApproveNewPattern,
  onNavigateToExpedientes
}) => {
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [filterNewOnly, setFilterNewOnly] = useState(false);

  const displayedGroups = filterNewOnly ? groups.filter(g => g.es_nuevo_patron) : groups;

  const toggleGroup = (id: string) => {
    setExpandedGroupId(expandedGroupId === id ? null : id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Grupos Semánticos y Detección de Patrones</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Algoritmo de clustering sobre embeddings vectoriales para consolidar quejas repetitivas y casos atípicos
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterNewOnly(!filterNewOnly)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border flex items-center transition-colors ${
              filterNewOnly
                ? 'bg-purple-100 text-purple-800 border-purple-300'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-purple-600" />
            {filterNewOnly ? 'Mostrando solo Nuevos Patrones' : 'Filtrar Nuevos Patrones'}
          </button>

          <button
            onClick={() => exportGroupsExcel(groups)}
            disabled={groups.length === 0}
            className="px-3 py-2 bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center shadow-sm"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Exportar Grupos a Excel
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 block">Total de Grupos Identificados</span>
          <span className="text-2xl font-bold text-slate-900">{groups.length}</span>
          <span className="text-xs text-slate-400 block mt-0.5">Clústeres semánticos activos</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 block">Nuevos Patrones Detectados</span>
          <span className="text-2xl font-bold text-purple-600">
            {groups.filter(g => g.es_nuevo_patron).length}
          </span>
          <span className="text-xs text-purple-700 block mt-0.5">Sin coincidencia con catálogo previo</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 block">Umbral de Similitud Mínimo</span>
          <span className="text-2xl font-bold text-emerald-600">78.0%</span>
          <span className="text-xs text-slate-400 block mt-0.5">Cosine similarity en espacio vectorial</span>
        </div>
      </div>

      {/* Groups List */}
      {displayedGroups.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
          <Layers className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <h3 className="text-base font-semibold text-slate-700">No hay grupos para mostrar</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Ejecuta el análisis sobre un archivo de PQRS en la pestaña "Cargar PQRS" para generar el agrupamiento automático.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedGroups.map(group => {
            const isExpanded = expandedGroupId === group.id;
            const groupRecords = records.filter(r => r.grupo_id === group.id);

            return (
              <div 
                key={group.id} 
                className={`bg-white rounded-xl border transition-all ${
                  group.es_nuevo_patron 
                    ? 'border-purple-200 hover:border-purple-300 shadow-xs' 
                    : 'border-slate-200 hover:border-slate-300 shadow-xs'
                }`}
              >
                {/* Header card row */}
                <div 
                  onClick={() => toggleGroup(group.id)}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                      {group.id}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">{group.nombre}</h4>
                        {group.es_nuevo_patron && (
                          <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold border border-purple-200">
                            NUEVO PATRÓN
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                        Categoría sugerida: <strong className="text-slate-700">{group.categoria_sugerida}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 self-end md:self-center text-xs">
                    <div className="text-right">
                      <span className="text-slate-500 block text-[10px]">Expedientes</span>
                      <span className="font-bold text-slate-900">{group.cantidad_expedientes}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500 block text-[10px]">Similitud</span>
                      <span className="font-bold text-emerald-600">{`${(group.similitud_promedio * 100).toFixed(1)}%`}</span>
                    </div>
                    <button className="p-1 rounded-md hover:bg-slate-100 text-slate-500">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-4 bg-slate-50 border-t border-slate-100 rounded-b-xl space-y-4">
                    {/* Examples snippet */}
                    <div>
                      <span className="text-xs font-bold text-slate-700 block mb-1">
                        Ejemplo representativo del grupo:
                      </span>
                      <p className="p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-800 italic">
                        "{group.ejemplos_descripciones[0]}"
                      </p>
                    </div>

                    {/* Member Cases List */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-700">
                          Casos que componen este grupo ({groupRecords.length}):
                        </span>
                        {onNavigateToExpedientes && (
                          <button
                            onClick={() => onNavigateToExpedientes(group.id)}
                            className="text-xs text-blue-600 hover:underline font-medium flex items-center"
                          >
                            Filtrar estos expedientes en la tabla general &rarr;
                          </button>
                        )}
                      </div>

                      <div className="space-y-1.5 max-h-56 overflow-y-auto">
                        {groupRecords.map(rec => (
                          <div key={rec.id} className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex-1">
                              <span className="font-bold text-slate-900 mr-2">{rec.numero_expediente}:</span>
                              <span className="text-slate-700">{rec.descripcion_original.substring(0, 140)}...</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium text-[11px]">
                                {rec.analisis?.subcategoria || 'N/A'}
                              </span>
                              <span className="text-emerald-700 font-bold text-[11px]">
                                {rec.similitud_grupo ? `${(rec.similitud_grupo * 100).toFixed(0)}% sim.` : ''}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action if new pattern */}
                    {group.es_nuevo_patron && onApproveNewPattern && (
                      <div className="pt-2 border-t border-purple-200 flex items-center justify-between">
                        <div className="text-xs text-purple-900">
                          ¿Deseas oficializar esta problemática en el catálogo institucional?
                        </div>
                        <button
                          onClick={() => onApproveNewPattern(group.nombre, group.categoria_sugerida)}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center shadow-sm"
                        >
                          <PlusCircle className="w-3.5 h-3.5 mr-1" />
                          Aprobar como Nueva Categoría Oficial
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
