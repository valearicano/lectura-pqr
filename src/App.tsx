import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { UploadView } from './components/UploadView';
import { ExpedientesView } from './components/ExpedientesView';
import { GruposSimilaresView } from './components/GruposSimilaresView';
import { RevisionHumanaView } from './components/RevisionHumanaView';
import { CategoriasView } from './components/CategoriasView';
import { EvaluacionCalidadView } from './components/EvaluacionCalidadView';
import { TestCasesView } from './components/TestCasesView';
import { ConfiguracionView } from './components/ConfiguracionView';
import { getInitialDemoState } from './services/sampleData';
import { EnrichedPQRSRecord, SemanticGroup } from './types';

export default function App() {
  const initial = getInitialDemoState();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [records, setRecords] = useState<EnrichedPQRSRecord[]>(initial.records);
  const [groups, setGroups] = useState<SemanticGroup[]>(initial.groups);
  const [supabaseConnected, setSupabaseConnected] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // Check Supabase connection on mount
  React.useEffect(() => {
    fetch('/api/supabase/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records: [] })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) setSupabaseConnected(true);
      })
      .catch(() => setSupabaseConnected(false));
  }, []);

  const showNotification = (message: string, type: 'success' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Called when UploadView finishes processing a new file or demo batch
  const handleProcessingCompleted = (newRecords: EnrichedPQRSRecord[], newGroups: SemanticGroup[]) => {
    setRecords(newRecords);
    setGroups(newGroups);
    showNotification(`¡Procesamiento finalizado! Se cargaron y analizaron ${newRecords.length} expedientes.`);
  };

  // Update a single record (from Human Review or Detail Modal)
  const handleUpdateRecord = (updatedRecord: EnrichedPQRSRecord) => {
    setRecords(prev => prev.map(r => r.id === updatedRecord.id ? updatedRecord : r));
    showNotification(`Expediente ${updatedRecord.numero_expediente} actualizado exitosamente.`);
  };

  // Handle approving a newly detected pattern into the catalog
  const handleApproveNewPattern = (patternName: string, category: string) => {
    showNotification(`Patrón "${patternName}" aprobado para ser incorporado al catálogo oficial.`);
    setCurrentTab('categorias');
  };

  // Pending reviews count
  const pendingReviewCount = records.filter(r => 
    r.analisis?.requiere_revision || 
    (r.analisis && r.analisis.confianza < 70) ||
    r.analisis?.posible_inconsistencia
  ).length;

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 font-sans flex flex-col selection:bg-blue-100 selection:text-blue-900">
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        pendingReviewCount={pendingReviewCount}
        totalRecordsCount={records.length}
        supabaseConnected={supabaseConnected}
      />

      {/* Floating Notification Toast */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center space-x-2 animate-bounce">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>{notification.message}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'dashboard' && (
          <DashboardView
            records={records}
            groups={groups}
            onNavigate={(tab) => setCurrentTab(tab)}
          />
        )}

        {currentTab === 'upload' && (
          <UploadView
            onProcessingCompleted={handleProcessingCompleted}
            onNavigate={(tab) => setCurrentTab(tab)}
          />
        )}

        {currentTab === 'expedientes' && (
          <ExpedientesView
            records={records}
            onUpdateRecord={handleUpdateRecord}
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

        {currentTab === 'evaluacion' && (
          <EvaluacionCalidadView
            records={records}
          />
        )}

        {currentTab === 'pruebas' && (
          <TestCasesView />
        )}

        {currentTab === 'configuracion' && (
          <ConfiguracionView />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white/80 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Plataforma Inteligente de Lectura, Clasificación y Agrupación de PQRS</span>
          <span className="text-slate-400 font-mono text-[11px]">
            Gemini 3.8 Flash • Embeddings Vectoriales 768d • PostgreSQL / Supabase
          </span>
        </div>
      </footer>
    </div>
  );
}
