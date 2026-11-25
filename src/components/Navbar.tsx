import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  UploadCloud,
  FolderKanban,
  Layers,
  UserCheck,
  Tag,
  AlertTriangle
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  pendingReviewCount: number;
  totalRecordsCount: number;
  showUnsavedWarning: boolean;
}

const IRIS_LOGO_VIDEO_SRC = '/assets/aistudio/ezgif-528addcef8daed10_519cdb5d.mp4';

const IrisStaticLogoMark: React.FC = () => (
  <svg
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="w-12 h-12 shrink-0 rounded-[12px]"
    aria-label="IRIS"
    role="img"
  >
    <defs>
      <linearGradient id="iris-bg" x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#162356" />
        <stop offset="100%" stopColor="#0B1330" />
      </linearGradient>
      <linearGradient id="iris-ring" x1="8" y1="20" x2="32" y2="20" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#22D3EE" />
        <stop offset="52%" stopColor="#2F6BFF" />
        <stop offset="100%" stopColor="#8B5CF6" />
      </linearGradient>
      <radialGradient id="iris-core" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#22D3EE" />
        <stop offset="60%" stopColor="#2F6BFF" />
        <stop offset="100%" stopColor="#1D4ED8" />
      </radialGradient>
    </defs>
    <rect x="1" y="1" width="38" height="38" rx="11" fill="url(#iris-bg)" stroke="#2F6BFF" strokeOpacity="0.35" strokeWidth="1.2" />
    {/* Outer eye contour */}
    <path
      d="M7.5 20C10.5 14.3 15 11.5 20 11.5C25 11.5 29.5 14.3 32.5 20C29.5 25.7 25 28.5 20 28.5C15 28.5 10.5 25.7 7.5 20Z"
      stroke="url(#iris-ring)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Iris ring */}
    <circle cx="20" cy="20" r="5.2" stroke="#22D3EE" strokeWidth="1.6" fill="url(#iris-core)" fillOpacity="0.28" />
    {/* Pupil */}
    <circle cx="20" cy="20" r="2.3" fill="#FFFFFF" />
    {/* Specular glint */}
    <circle cx="22.1" cy="18.1" r="0.9" fill="#22D3EE" />
  </svg>
);

const IrisLogoMark: React.FC = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  const [videoReady, setVideoReady] = useState<boolean>(false);
  const [videoError, setVideoError] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };
    setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  if (prefersReducedMotion || videoError) {
    return <IrisStaticLogoMark />;
  }

  return (
    <div className="relative w-12 h-12 shrink-0 rounded-[12px] overflow-hidden">
      {!videoReady && (
        <div className="absolute inset-0">
          <IrisStaticLogoMark />
        </div>
      )}
      <video
        src={IRIS_LOGO_VIDEO_SRC}
        autoPlay
        loop
        muted
        playsInline
        aria-label="IRIS"
        onLoadedData={() => setVideoReady(true)}
        onCanPlay={() => setVideoReady(true)}
        onError={() => setVideoError(true)}
        className={`w-12 h-12 rounded-[12px] object-cover transition-opacity duration-200 ${
          videoReady ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
};

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  pendingReviewCount,
  totalRecordsCount,
  showUnsavedWarning
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Resumen', icon: LayoutDashboard },
    { id: 'upload', label: 'Cargar PQRS', icon: UploadCloud },
    { id: 'expedientes', label: 'Expedientes', icon: FolderKanban, badge: totalRecordsCount > 0 ? totalRecordsCount : undefined },
    { id: 'grupos', label: 'Grupos similares', icon: Layers },
    { id: 'revision', label: 'Revisión humana', icon: UserCheck, alertBadge: pendingReviewCount > 0 ? pendingReviewCount : undefined },
    { id: 'categorias', label: 'Categorías', icon: Tag },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0B1330] text-white border-b border-white/10 shadow-[0_2px_12px_rgba(11,19,48,0.18)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Row: Brand & Unsaved Session Notice */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
          <button
            type="button"
            onClick={() => setCurrentTab('dashboard')}
            className="flex items-center gap-3 text-left min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE] rounded-xl"
          >
            <IrisLogoMark />
            <div className="min-w-0">
              <span className="text-lg font-bold tracking-tight text-white block leading-tight">
                IRIS
              </span>
              <span className="text-xs text-slate-300 block leading-snug">
                Inteligencia para el reconocimiento e interpretación de solicitudes
              </span>
            </div>
          </button>

          {showUnsavedWarning && (
            <div className="flex items-center gap-1.5 text-xs text-amber-200/90 shrink-0">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-300 shrink-0" aria-hidden="true" />
              <span>Sin guardado: descarga el Excel antes de cerrar</span>
            </div>
          )}
        </div>

        {/* Navigation Tabs Bar */}
        <div className="relative border-t border-white/10">
          <nav
            aria-label="Navegación principal"
            className="flex items-center gap-1 overflow-x-auto pb-2.5 pt-2 pr-6 scroll-smooth [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.22)_transparent]"
          >
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-btn-${item.id}`}
                  type="button"
                  onClick={() => setCurrentTab(item.id)}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE] ${
                    isActive
                      ? 'bg-[#2F6BFF] text-white shadow-[0_2px_8px_rgba(47,107,255,0.35)]'
                      : 'text-slate-300 hover:text-white hover:bg-white/8'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0 opacity-90" aria-hidden="true" />
                  <span>{item.label}</span>
                  {item.alertBadge !== undefined && (
                    <span className="ml-0.5 px-1.5 py-0.5 text-xs font-semibold rounded-md bg-amber-400 text-[#0B1330] tabular-nums shrink-0">
                      {item.alertBadge}
                    </span>
                  )}
                  {item.badge !== undefined && (
                    <span
                      className={`ml-0.5 text-xs font-semibold tabular-nums shrink-0 ${
                        isActive ? 'text-white/90' : 'text-slate-400'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l from-[#0B1330] to-transparent lg:hidden"
          />
        </div>
      </div>
    </header>
  );
};
