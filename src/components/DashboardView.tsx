import React from 'react';
import {
  FileText,
  CheckCircle,
  AlertCircle,
  Layers,
  ShieldAlert,
  Download,
  ArrowRight,
  Smile,
  Meh
} from 'lucide-react';
import { EnrichedPQRSRecord, SemanticGroup, SentimientoPQR, TipoCasoSFC } from '../types';
import { exportEnrichedExcel, exportCategoriesSummaryExcel } from '../services/excelService';
import { inferTipoCasoSFC } from '../services/classifierEngine';

// Preserve exported helper import reference for consistency
void exportCategoriesSummaryExcel;

interface DashboardViewProps {
  records: EnrichedPQRSRecord[];
  groups: SemanticGroup[];
  onNavigate: (tab: string) => void;
  onSelectSentiment?: (sentiment: SentimientoPQR) => void;
  onSelectTipoCaso?: (tipoCaso: TipoCasoSFC) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  records,
  groups,
  onNavigate,
  onSelectSentiment,
  onSelectTipoCaso
}) => {
  void onSelectSentiment;

  const total = records.length;
  const procesados = records.filter(r => r.analisis).length;
  const pendientes = total - procesados;
  const conRevision = records.filter(r => r.analisis?.requiere_revision).length;
  const inconsistencias = records.filter(r => r.analisis?.posible_inconsistencia).length;
  const altaConfianza = records.filter(r => r.analisis?.nivel_confianza === 'Alta').length;
  const bajaConfianza = records.filter(r => r.analisis?.nivel_confianza === 'Baja').length;
  const nuevosPatrones = groups.filter(g => g.es_nuevo_patron);

  // Preserve calculations used across platform metrics
  void altaConfianza;
  void bajaConfianza;
  void nuevosPatrones;

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

  // Tipo de caso counts (Superintendencia Financiera: Solicitud vs Reclamo)
  const tipoCasoCounts: Record<TipoCasoSFC, number> = {
    Solicitud: 0,
    Reclamo: 0
  };
  records.forEach(r => {
    if (!r.analisis) return;
    const resolved = r.analisis.tipo_caso ?? inferTipoCasoSFC(r, r.analisis);
    if (resolved === 'Solicitud' || resolved === 'Reclamo') {
      tipoCasoCounts[resolved] += 1;
    }
  });

  const evaluadosTipoCaso = tipoCasoCounts.Solicitud + tipoCasoCounts.Reclamo;
  const sinClasificarTipoCaso = Math.max(0, total - evaluadosTipoCaso);

  const tipoCasoItems: {
    key: TipoCasoSFC;
    title: string;
    shortLabel: string;
    description: string;
    linkLabel: string;
    count: number;
    pct: number;
    barClass: string;
    cardHoverClass: string;
    textClass: string;
    iconBgClass: string;
    Icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      key: 'Solicitud',
      title: 'Solicitudes',
      shortLabel: 'Solicitudes',
      description: 'Piden información, documentos o un trámite, sin dinero de por medio (ajustes no monetarios).',
      linkLabel: 'Ver expedientes de solicitud',
      count: tipoCasoCounts.Solicitud,
      pct: evaluadosTipoCaso > 0 ? (tipoCasoCounts.Solicitud / evaluadosTipoCaso) * 100 : 0,
      barClass: 'bg-emerald-600',
      cardHoverClass: 'hover:border-emerald-300 hover:bg-emerald-50/35',
      textClass: 'text-emerald-700',
      iconBgClass: 'bg-emerald-50 text-emerald-700',
      Icon: Smile
    },
    {
      key: 'Reclamo',
      title: 'Reclamos',
      shortLabel: 'Reclamos',
      description: 'Cuestionan un cobro o piden devolver un valor (ajustes monetarios).',
      linkLabel: 'Ver expedientes de reclamo',
      count: tipoCasoCounts.Reclamo,
      pct: evaluadosTipoCaso > 0 ? (tipoCasoCounts.Reclamo / evaluadosTipoCaso) * 100 : 0,
      barClass: 'bg-amber-500',
      cardHoverClass: 'hover:border-amber-300 hover:bg-amber-50/35',
      textClass: 'text-amber-700',
      iconBgClass: 'bg-amber-50 text-amber-700',
      Icon: Meh
    }
  ];

  const cardSurface =
    'bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(11,19,48,0.04),0_4px_14px_rgba(11,19,48,0.03)]';

  return (
    <div className="space-y-6">
      {/* Encabezado del panel */}
      <section className="relative overflow-hidden rounded-2xl bg-[#0B1330] text-white p-6 sm:p-7 shadow-[0_8px_28px_rgba(11,19,48,0.16)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[#2F6BFF]/25 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-28 right-32 w-64 h-64 rounded-full bg-[#22D3EE]/15 blur-3xl"
        />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="max-w-2xl">
            <h1 className="text-2xl font-bold tracking-tight text-white [text-wrap:balance]">
              Resumen de solicitudes PQRS
            </h1>
            <p className="text-sm text-slate-300 mt-1.5 leading-relaxed">
              Consulta qué casos necesitan tu atención hoy, revisa si son solicitudes o reclamos y descarga el archivo Excel con los resultados.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              id="btn-dash-upload"
              type="button"
              onClick={() => onNavigate('upload')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#2F6BFF] hover:bg-[#2558DB] text-white rounded-xl text-sm font-semibold shadow-[0_4px_14px_rgba(47,107,255,0.35)] transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]"
            >
              <FileText className="w-4 h-4 shrink-0" aria-hidden="true" />
              Cargar archivo Excel
            </button>
            {total > 0 && (
              <button
                id="btn-dash-export"
                type="button"
                onClick={() => exportEnrichedExcel(records)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/16 text-white rounded-xl text-sm font-medium border border-white/15 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]"
              >
                <Download className="w-4 h-4 shrink-0" aria-hidden="true" />
                Descargar Excel con resultados
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 1) Tarjetas "Atención prioritaria" */}
      <section aria-labelledby="heading-acciones" className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
          <h2 id="heading-acciones" className="text-base font-semibold text-[#0B1330]">
            Atención prioritaria
          </h2>
          <p className="text-sm text-slate-600">
            Casos que conviene revisar antes de enviar una respuesta al cliente.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tarjeta ámbar: La IA necesita tu confirmación */}
          <div
            className={`rounded-2xl p-6 flex flex-col justify-between transition-colors shadow-[0_2px_10px_rgba(11,19,48,0.05)] border ${
              conRevision > 0
                ? 'bg-amber-50/55 border-amber-200/90'
                : 'bg-emerald-50/40 border-emerald-200/80'
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-start gap-2.5">
                    {conRevision > 0 ? (
                      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
                    ) : (
                      <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                    )}
                    <h3 className="text-base font-semibold text-[#0B1330] leading-snug">
                      La IA necesita tu confirmación
                    </h3>
                  </div>
                </div>

                <div className="text-right shrink-0 tabular-nums">
                  <span
                    className={`text-3xl font-bold tracking-tight block leading-none ${
                      conRevision > 0 ? 'text-amber-700' : 'text-emerald-700'
                    }`}
                  >
                    {conRevision}
                  </span>
                  <span className="text-xs text-slate-600 block mt-1">expedientes</span>
                </div>
              </div>

              <p className="text-sm text-slate-700 mt-3 leading-relaxed">
                La IA no está segura de la clasificación o falta información en el caso. Confírmala o corrígela antes de responder.
              </p>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Ej.: el cliente escribe poco y no queda claro qué pide.
              </p>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-900/8 flex flex-wrap items-center justify-between gap-3">
              {conRevision > 0 ? (
                <>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-800">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    Requiere confirmación
                  </span>
                  <button
                    type="button"
                    onClick={() => onNavigate('revision')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F6BFF]"
                  >
                    Revisar y confirmar
                    <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
                  </button>
                </>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                  <CheckCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  Sin casos pendientes
                </span>
              )}
            </div>
          </div>

          {/* Tarjeta roja: El motivo registrado no coincide con lo que escribió el cliente */}
          <div
            className={`rounded-2xl p-6 flex flex-col justify-between transition-colors shadow-[0_2px_10px_rgba(11,19,48,0.05)] border ${
              inconsistencias > 0
                ? 'bg-rose-50/55 border-rose-200/90'
                : 'bg-emerald-50/40 border-emerald-200/80'
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-start gap-2.5">
                    {inconsistencias > 0 ? (
                      <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
                    ) : (
                      <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                    )}
                    <h3 className="text-base font-semibold text-[#0B1330] leading-snug">
                      El motivo registrado no coincide con lo que escribió el cliente
                    </h3>
                  </div>
                </div>

                <div className="text-right shrink-0 tabular-nums">
                  <span
                    className={`text-3xl font-bold tracking-tight block leading-none ${
                      inconsistencias > 0 ? 'text-rose-700' : 'text-emerald-700'
                    }`}
                  >
                    {inconsistencias}
                  </span>
                  <span className="text-xs text-slate-600 block mt-1">expedientes</span>
                </div>
              </div>

              <p className="text-sm text-slate-700 mt-3 leading-relaxed">
                El resumen o motivo inicial dice una cosa y el detalle del cliente dice otra. Responder con el trámite equivocado puede dejar el caso mal resuelto o vencer los tiempos.
              </p>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Ej.: radicado como &lsquo;Consulta&rsquo;, pero el cliente reclama un cobro doble.
              </p>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-900/8 flex flex-wrap items-center justify-between gap-3">
              {inconsistencias > 0 ? (
                <>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-800">
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    Posible trámite equivocado
                  </span>
                  <button
                    type="button"
                    onClick={() => onNavigate('expedientes')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F6BFF]"
                  >
                    Ver expedientes
                    <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
                  </button>
                </>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                  <CheckCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  Sin casos pendientes
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 2) Bloque "Estado general del lote" — SOLO 3 indicadores */}
      <section aria-labelledby="heading-panorama" className={`${cardSurface} overflow-hidden`}>
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <h2 id="heading-panorama" className="text-base font-semibold text-[#0B1330]">
            Estado general del lote
          </h2>
          <p className="text-xs text-slate-500">
            Resumen informativo del archivo cargado actualmente
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          <div className="p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#2F6BFF] shrink-0" aria-hidden="true" />
              <span className="text-sm font-medium text-slate-600">Total expedientes</span>
            </div>
            <span className="text-2xl font-bold text-[#0B1330] tabular-nums block mt-2">{total}</span>
            <span className="text-xs text-slate-500 block mt-1">
              {pendientes > 0 ? `${pendientes} pendientes de analizar` : 'Todos los casos cargados'}
            </span>
          </div>

          <div className="p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
              <span className="text-sm font-medium text-slate-600">Analizados con IA</span>
            </div>
            <div className="flex items-baseline gap-2 mt-2 tabular-nums">
              <span className="text-2xl font-bold text-[#0B1330]">{procesados}</span>
              <span className="text-sm font-semibold text-emerald-700">
                {total > 0 ? `${((procesados / total) * 100).toFixed(0)}%` : '0%'}
              </span>
            </div>
            <span className="text-xs text-slate-500 block mt-1">Expedientes clasificados automáticamente</span>
          </div>

          <div className="p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#2F6BFF] shrink-0" aria-hidden="true" />
              <span className="text-sm font-medium text-slate-600">Grupos similares</span>
            </div>
            <span className="text-2xl font-bold text-[#0B1330] tabular-nums block mt-2">{groups.length}</span>
            <span className="text-xs text-slate-500 block mt-1">Casos agrupados por problema parecido</span>
          </div>
        </div>
      </section>

      {/* 3) Tipo de caso (Superintendencia Financiera) */}
      <section aria-label="Tipo de caso" className={`${cardSurface} p-6`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-[#0B1330]">Tipo de caso</h2>
            <p className="text-sm text-slate-600 mt-0.5">
              Clasificación de los expedientes según la Superfinanciera. Haz clic para ver los casos.
            </p>
          </div>
          <div className="text-xs text-slate-600 tabular-nums shrink-0">
            Clasificados: <span className="font-semibold text-[#0B1330]">{evaluadosTipoCaso}</span> de{' '}
            <span className="font-semibold text-[#0B1330]">{total}</span> expedientes
          </div>
        </div>

        {evaluadosTipoCaso === 0 ? (
          <div className="py-10 text-center max-w-md mx-auto">
            <p className="text-sm font-medium text-[#0B1330]">
              Todavía no hay casos clasificados por tipo
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Carga y analiza un archivo Excel para separar automáticamente las solicitudes de los reclamos.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('upload')}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2F6BFF] hover:bg-[#2558DB] text-white text-sm font-medium transition-colors"
            >
              Cargar archivo Excel
            </button>
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            {/* Barra de proporción de dos segmentos (verde y ámbar) */}
            <div>
              <div
                className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden flex gap-0.5"
                role="img"
                aria-label={`Proporción de tipo de caso: ${tipoCasoCounts.Solicitud} solicitudes (${tipoCasoItems[0].pct.toFixed(1)}%) y ${tipoCasoCounts.Reclamo} reclamos (${tipoCasoItems[1].pct.toFixed(1)}%)`}
              >
                {tipoCasoItems.map(item =>
                  item.count > 0 ? (
                    <div
                      key={item.key}
                      className={`h-full ${item.barClass} transition-all duration-300`}
                      style={{ width: `${item.pct}%` }}
                      title={`${item.title}: ${item.count} (${item.pct.toFixed(1)}%)`}
                    />
                  ) : null
                )}
              </div>
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 tabular-nums">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
                  {tipoCasoItems.map(({ key, shortLabel, pct, textClass, Icon }) => (
                    <span key={key} className="inline-flex items-center gap-1.5">
                      <Icon className={`w-3.5 h-3.5 ${textClass} shrink-0`} aria-hidden="true" />
                      <span className="font-semibold text-[#0B1330]">{shortLabel}</span>
                      <span className={`font-semibold ${textClass}`}>{pct.toFixed(1)}%</span>
                    </span>
                  ))}
                </div>
                {sinClasificarTipoCaso > 0 && (
                  <span className="text-slate-500">
                    {sinClasificarTipoCaso} {sinClasificarTipoCaso === 1 ? 'expediente en revisión humana' : 'expedientes en revisión humana'}
                  </span>
                )}
              </div>
            </div>

            {/* Dos tarjetas grandes: Solicitudes (verde + Smile) y Reclamos (ámbar + Meh) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tipoCasoItems.map(
                ({ key, title, description, linkLabel, count, pct, cardHoverClass, textClass, iconBgClass, Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onSelectTipoCaso?.(key)}
                    className={`group w-full text-left p-5 rounded-2xl border border-slate-200/90 bg-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F6BFF] ${cardHoverClass}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className={`p-2.5 rounded-xl ${iconBgClass} shrink-0`}>
                          <Icon className="w-5 h-5" aria-hidden="true" />
                        </span>
                        <span className="text-base font-semibold text-[#0B1330]">{title}</span>
                      </div>
                      <span className={`text-sm font-bold tabular-nums ${textClass}`}>
                        {pct.toFixed(1)}%
                      </span>
                    </div>

                    <div className="mt-4 flex items-baseline gap-2 tabular-nums">
                      <span className="text-3xl font-bold text-[#0B1330]">{count}</span>
                      <span className="text-xs text-slate-500">expedientes</span>
                    </div>

                    <p className="mt-2.5 text-sm text-slate-600 leading-relaxed">
                      {description}
                    </p>

                    <span className="mt-4 text-sm font-semibold text-[#2F6BFF] group-hover:underline inline-flex items-center gap-1.5">
                      {linkLabel}
                      <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
                    </span>
                  </button>
                )
              )}
            </div>
          </div>
        )}
      </section>

      {/* Distribución por categoría principal y subcategorías */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Categoría principal (2 columnas) */}
        <section className={`lg:col-span-2 ${cardSurface} p-6`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-semibold text-[#0B1330]">Distribución por categoría principal</h2>
              <p className="text-sm text-slate-600 mt-0.5">
                Categoría asignada según el motivo real descrito por cada cliente.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('categorias')}
              className="text-sm font-semibold text-[#2F6BFF] hover:text-[#2558DB] inline-flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              Ver catálogo de categorías
              <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
            </button>
          </div>

          {sortedCategories.length === 0 ? (
            <div className="py-12 text-center max-w-sm mx-auto">
              <p className="text-sm font-medium text-[#0B1330]">Sin categorías para mostrar</p>
              <p className="text-xs text-slate-500 mt-1">
                Sube un archivo Excel desde la pestaña Cargar PQRS para visualizar la distribución por categoría.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {sortedCategories.map(([cat, count]) => {
                const pct = total > 0 ? (count / total) * 100 : 0;
                return (
                  <div key={cat} className="space-y-1.5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                      <span className="font-medium text-[#0B1330]">{cat}</span>
                      <span className="text-xs text-slate-600 tabular-nums shrink-0">
                        {count} {count === 1 ? 'expediente' : 'expedientes'} · {pct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#2F6BFF] rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Subcategorías principales (1 columna) */}
        <section className={`${cardSurface} p-6`}>
          <div className="pb-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-[#0B1330]">Motivos más frecuentes</h2>
            <p className="text-sm text-slate-600 mt-0.5">
              Subcategorías con mayor volumen en este lote.
            </p>
          </div>

          {sortedSubcategories.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm font-medium text-[#0B1330]">Sin subcategorías aún</p>
              <p className="text-xs text-slate-500 mt-1">
                Aparecerán aquí una vez completes el análisis de tus expedientes.
              </p>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {sortedSubcategories.map(([sub, count]) => (
                <li
                  key={sub}
                  className="py-3 first:pt-1 last:pb-1 flex items-start justify-between gap-3 text-sm"
                >
                  <span className="font-medium text-[#0B1330] leading-snug break-words">{sub}</span>
                  <span className="text-sm font-semibold text-[#2F6BFF] tabular-nums shrink-0">
                    {count}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Tabla de grupos de casos similares */}
      <section className={`${cardSurface} overflow-hidden`}>
        <div className="p-6 pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-[#0B1330]">Grupos de solicitudes similares</h2>
            <p className="text-sm text-slate-600 mt-0.5">
              Expedientes agrupados automáticamente porque describen el mismo problema o intención.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('grupos')}
            className="text-sm font-semibold text-[#2F6BFF] hover:text-[#2558DB] inline-flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            Ver todos los grupos
            <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
          </button>
        </div>

        {groups.length === 0 ? (
          <div className="py-12 px-6 text-center max-w-md mx-auto">
            <p className="text-sm font-medium text-[#0B1330]">Todavía no hay grupos creados</p>
            <p className="text-xs text-slate-500 mt-1">
              Cuando analices un lote de solicitudes, IRIS reunirá automáticamente los casos parecidos en esta tabla.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-[#F5F7FC] text-slate-600 text-xs font-semibold border-b border-slate-200/70">
                <tr>
                  <th className="py-3 px-6 whitespace-nowrap">Grupo</th>
                  <th className="py-3 px-4 whitespace-nowrap">Categoría</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Expedientes</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Similitud</th>
                  <th className="py-3 px-4">Ejemplo del caso</th>
                  <th className="py-3 px-6 text-right whitespace-nowrap">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groups.slice(0, 5).map(g => (
                  <tr key={g.id} className="hover:bg-[#F5F7FC]/70 transition-colors">
                    <td className="py-3.5 px-6 font-semibold text-[#0B1330] whitespace-nowrap font-mono text-xs">
                      {g.id}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[#0B1330]">
                      {g.categoria_sugerida}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-[#0B1330] tabular-nums">
                      {g.cantidad_expedientes}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-emerald-700 tabular-nums">
                      {`${(g.similitud_promedio * 100).toFixed(1)}%`}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-md">
                      <p className="line-clamp-2 text-xs leading-relaxed">
                        &ldquo;{g.ejemplos_descripciones[0] || 'Sin ejemplo disponible'}&rdquo;
                      </p>
                    </td>
                    <td className="py-3.5 px-6 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onNavigate('grupos')}
                        className="text-sm font-semibold text-[#2F6BFF] hover:text-[#2558DB] inline-flex items-center gap-1"
                      >
                        Ver grupo
                        <ArrowRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
