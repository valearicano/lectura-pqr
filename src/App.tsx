import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { UploadView } from './components/UploadView';
import { ExpedientesView } from './components/ExpedientesView';
import { GruposSimilaresView } from './components/GruposSimilaresView';
import { RevisionHumanaView } from './components/RevisionHumanaView';
import { CategoriasView } from './components/CategoriasView';
import { inferTipoCasoSFC, recordRequiresHumanReview } from './services/classifierEngine';
import { EnrichedPQRSRecord, SemanticGroup, TipoCasoSFC } from './types';

function ensureTipoCasoOnRecords(items: EnrichedPQRSRecord[]): EnrichedPQRSRecord[] {
  return items.map(rec => {
    if (!rec.analisis || rec.analisis.tipo_caso) return rec;
    const inferred = inferTipoCasoSFC(rec, rec.analisis);
    if (!inferred) return rec;
    return {
      ...rec,
      analisis: {
        ...rec.analisis,
        tipo_caso: inferred
      }
    };
  });
}

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [records, setRecords] = useState<EnrichedPQRSRecord[]>([]);
  const [groups, setGroups] = useState<SemanticGroup[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [selectedTipoCasoFilter, setSelectedTipoCasoFilter] = useState<TipoCasoSFC | 'TODOS'>('TODOS');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Called when UploadView finishes processing a new file or demo batch
  const handleProcessingCompleted = (newRecords: EnrichedPQRSRecord[], newGroups: SemanticGroup[]) => {
    setRecords(ensureTipoCasoOnRecords(newRecords));
    setGroups(newGroups);
    setHasUnsavedChanges(newRecords.length > 0);
    showNotification(`¡Procesamiento finalizado! Se cargaron y analizaron ${newRecords.length} expedientes.`);
  };

  // Update a single record (from Human Review or Detail Modal)
  const handleUpdateRecord = (updatedRecord: EnrichedPQRSRecord) => {
    setRecords(prev => prev.map(r => r.id === updatedRecord.id ? updatedRecord : r));
    setHasUnsavedChanges(true);
    showNotification(`Expediente ${updatedRecord.numero_expediente} actualizado exitosamente.`);
  };

  const handleExcelDownloaded = () => {
    setHasUnsavedChanges(false);
  };

  // Handle approving a newly detected pattern into the catalog
  const handleApproveNewPattern = (patternName: string, category: string) => {
    showNotification(`Patrón "${patternName}" aprobado para ser incorporado al catálogo oficial.`);
    setCurrentTab('categorias');
  };

  // Pending reviews count using the single shared review rule
  const pendingReviewCount = records.filter(r => recordRequiresHumanReview(r)).length;

  return (
    <div className="min-h-screen bg-[#F5F7FC] text-[#0B1330] font-sans flex flex-col selection:bg-[#2F6BFF]/15 selection:text-[#0B1330]">
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        pendingReviewCount={pendingReviewCount}
        totalRecordsCount={records.length}
        showUnsavedWarning={records.length > 0 && hasUnsavedChanges}
      />

      {/* Floating Notification Toast */}
      {notification && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 bg-[#0B1330] text-white text-sm px-4 py-3 rounded-xl shadow-[0_8px_24px_rgba(11,19,48,0.22)] border border-white/10 flex items-center gap-2.5 max-w-md"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" aria-hidden="true" />
          <span>{notification.message}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {currentTab === 'dashboard' && (
          <DashboardView
            records={records}
            groups={groups}
            onNavigate={(tab) => setCurrentTab(tab)}
            onExcelDownloaded={handleExcelDownloaded}
            onSelectTipoCaso={(tipoCaso) => {
              setSelectedTipoCasoFilter(tipoCaso);
              setCurrentTab('expedientes');
            }}
          />
        )}

        {currentTab === 'upload' && (
          <UploadView
            hasExistingRecords={records.length > 0}
            onProcessingCompleted={handleProcessingCompleted}
            onExcelDownloaded={handleExcelDownloaded}
            onNavigate={(tab) => setCurrentTab(tab)}
          />
        )}

        {currentTab === 'expedientes' && (
          <ExpedientesView
            records={records}
            initialTipoCasoFilter={selectedTipoCasoFilter}
            onTipoCasoFilterChange={setSelectedTipoCasoFilter}
            onUpdateRecord={handleUpdateRecord}
            onExcelDownloaded={handleExcelDownloaded}
            onNavigateToReview={() => setCurrentTab('revision')}
          />
        )}

        {currentTab === 'grupos' && (
          <GruposSimilaresView
            groups={groups}
            records={records}
            onApproveNewPattern={handleApproveNewPattern}
            onNavigateToExpedientes={(groupId) => setCurrentTab('expedientes')}
          />
        )}

        {currentTab === 'revision' && (
          <RevisionHumanaView
            records={records}
            onUpdateRecord={handleUpdateRecord}
          />
        )}

        {currentTab === 'categorias' && (
          <CategoriasView />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="font-medium text-[#0B1330]">IRIS</span>
          <span className="text-slate-500 text-center sm:text-right">
            Inteligencia para el reconocimiento e interpretación de solicitudes
          </span>
        </div>
      </footer>
    </div>
  );
}
