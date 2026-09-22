import React from 'react';
import { 
  LayoutDashboard, 
  UploadCloud, 
  FolderKanban, 
  Layers, 
  UserCheck, 
  Tag, 
  Sparkles, 
  Settings, 
  BarChart3,
  CheckCircle2,
  Database
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  pendingReviewCount: number;
  totalRecordsCount: number;
  supabaseConnected: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  pendingReviewCount,
  totalRecordsCount,
  supabaseConnected
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'upload', label: 'Cargar PQRS', icon: UploadCloud },
    { id: 'expedientes', label: 'Expedientes', icon: FolderKanban, badge: totalRecordsCount > 0 ? totalRecordsCount : undefined },
    { id: 'grupos', label: 'Grupos Similares', icon: Layers },
    { id: 'revision', label: 'Revisión Humana', icon: UserCheck, alertBadge: pendingReviewCount > 0 ? pendingReviewCount : undefined },
    { id: 'categorias', label: 'Categorías', icon: Tag },
    { id: 'evaluacion', label: 'Evaluación Calidad', icon: BarChart3 },
    { id: 'pruebas', label: 'Casos de Prueba', icon: Sparkles },
    { id: 'configuracion', label: 'Configuración & BD', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-900 border-b border-slate-800 text-slate-100 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentTab('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-inner">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-semibold tracking-tight text-white block">
                Plataforma Inteligente PQRS
              </span>
              <span className="text-xs text-slate-400 block -mt-0.5">
                Clasificación Semántica & Agrupación
              </span>
            </div>
          </div>

          {/* System Status Indicators */}
          <div className="hidden md:flex items-center space-x-3 text-xs">
            <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
              IA Gemini Conectada
            </div>
            <div className={`inline-flex items-center px-2.5 py-1 rounded-full border ${
              supabaseConnected 
                ? 'bg-blue-950/80 border-blue-700/60 text-blue-300' 
                : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}>
              <Database className="w-3 h-3 mr-1" />
              {supabaseConnected ? 'Supabase Sync Activo' : 'Almacenamiento Local'}
            </div>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex space-x-1 overflow-x-auto pb-2 pt-1 border-t border-slate-800/80 scrollbar-none">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-btn-${item.id}`}
                onClick={() => setCurrentTab(item.id)}
                className={`inline-flex items-center px-3.5 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4 mr-2 opacity-80" />
                {item.label}
                {item.alertBadge !== undefined && (
                  <span className="ml-2 px-1.5 py-0.5 text-xs font-semibold rounded-full bg-amber-500 text-slate-950">
                    {item.alertBadge}
                  </span>
                )}
                {item.badge !== undefined && (
                  <span className="ml-2 px-1.5 py-0.5 text-xs font-semibold rounded-full bg-slate-700 text-slate-200">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
