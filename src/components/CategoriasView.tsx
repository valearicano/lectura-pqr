import React, { useState } from 'react';
import { 
  Tag, 
  Plus, 
  Check, 
  Trash2, 
  Sparkles, 
  ListPlus, 
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { PQRSMainCategory } from '../types';
import { getOfficialCatalog } from '../services/catalog';

export const CategoriasView: React.FC = () => {
  const [categories, setCategories] = useState<PQRSMainCategory[]>(getOfficialCatalog());
  const [selectedCatId, setSelectedCatId] = useState<string>(categories[0]?.id || '');
  
  // New category modal/inputs
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newSubcatInput, setNewSubcatInput] = useState('');

  const selectedCategory = categories.find(c => c.id === selectedCatId);

  // Add new subcategory to active category
  const handleAddSubcategory = () => {
    if (!newSubcatInput.trim() || !selectedCategory) return;
    const updated = categories.map(c => {
      if (c.id === selectedCatId) {
        return {
          ...c,
          subcategorias: [...c.subcategorias, newSubcatInput.trim()]
        };
      }
      return c;
    });
    setCategories(updated);
    setNewSubcatInput('');
  };

  // Add brand new category
  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const newCat: PQRSMainCategory = {
      id: `CAT-${categories.length + 1}`.padStart(6, '0'),
      nombre: newCatName.trim().toUpperCase(),
      descripcion: newCatDesc.trim() || 'Categoría añadida por el usuario.',
      subcategorias: ['General'],
      activa: true
    };

    setCategories([...categories, newCat]);
    setSelectedCatId(newCat.id);
    setNewCatName('');
    setNewCatDesc('');
  };

  // Toggle active status
  const handleToggleActive = (catId: string) => {
    setCategories(categories.map(c => c.id === catId ? { ...c, activa: !c.activa } : c));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Catálogo Oficial de 16 Categorías PQR</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Estructura estricta y cerrada: UNA PQR = UNA CATEGORÍA GENERAL. No se crean categorías nuevas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 text-xs font-bold">
            16 Categorías Oficiales
          </span>
        </div>
      </div>

      {/* Jerarquía de Prioridad Oficial (1 al 16) */}
      <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-700" />
            Regla de Prioridad de Clasificación Oficial (Precedencia Estricta)
          </h3>
          <span className="text-[11px] font-semibold text-amber-800">1 (Mayor Prioridad) &rarr; 16 (Menor Prioridad)</span>
        </div>
        <p className="text-xs text-amber-900 leading-relaxed">
          Cuando una descripción contenga múltiples términos, conceptos o reclamaciones simultáneas, la IA resuelve obligatoriamente asignando la categoría de mayor precedencia:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-1.5 pt-1 text-[11px] font-bold">
          <span className="px-2 py-1 bg-white border border-amber-300 rounded text-amber-900 text-center">1. FRAUDE</span>
          <span className="px-2 py-1 bg-white border border-amber-300 rounded text-amber-900 text-center">2. PSE</span>
          <span className="px-2 py-1 bg-white border border-amber-300 rounded text-amber-900 text-center">3. CUOTA MANEJO</span>
          <span className="px-2 py-1 bg-white border border-amber-300 rounded text-amber-900 text-center">4. SEGUROS</span>
          <span className="px-2 py-1 bg-white border border-amber-300 rounded text-amber-900 text-center">5. GMF / 4X1000</span>
          <span className="px-2 py-1 bg-white border border-amber-300 rounded text-amber-900 text-center">6. PAGOS/ABONOS</span>
          <span className="px-2 py-1 bg-white border border-amber-300 rounded text-amber-900 text-center">7. TRANSFERENCIAS</span>
          <span className="px-2 py-1 bg-white border border-amber-300 rounded text-amber-900 text-center">8. TARJETAS</span>
          <span className="px-2 py-1 bg-white border border-amber-300 rounded text-amber-900 text-center">9. CRÉDITOS</span>
          <span className="px-2 py-1 bg-white border border-amber-300 rounded text-amber-900 text-center">10. TRANSACCIONES</span>
          <span className="px-2 py-1 bg-white border border-amber-300 rounded text-amber-900 text-center">11. CUENTAS</span>
          <span className="px-2 py-1 bg-white border border-amber-300 rounded text-amber-900 text-center">12. COBROS/CARGOS</span>
          <span className="px-2 py-1 bg-white border border-amber-300 rounded text-amber-900 text-center">13. DATOS/INFO</span>
          <span className="px-2 py-1 bg-white border border-amber-300 rounded text-amber-900 text-center">14. SERVICIO</span>
          <span className="px-2 py-1 bg-white border border-amber-300 rounded text-amber-900 text-center">15. OTRAS</span>
          <span className="px-2 py-1 bg-white border border-amber-300 rounded text-amber-900 text-center">16. REV. HUMANA</span>
        </div>
      </div>

      {/* Main Grid: Left Categories list, Right Subcategories and details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Categories List */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Categorías Principales</h3>
          </div>

          <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
            {categories.map(c => {
              const isSelected = c.id === selectedCatId;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedCatId(c.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50 text-blue-950 font-bold shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Tag className={`w-3.5 h-3.5 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span className="text-xs">{c.nombre}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600">
                      {c.subcategorias.length}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Create Category Form */}
          <form onSubmit={handleCreateCategory} className="pt-3 border-t border-slate-100 space-y-2">
            <span className="text-[11px] font-bold text-slate-700 block">Agregar Nueva Categoría:</span>
            <input
              type="text"
              placeholder="Nombre (ej: FIDUCIARIA)"
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
            />
            <input
              type="text"
              placeholder="Descripción breve..."
              value={newCatDesc}
              onChange={e => setNewCatDesc(e.target.value)}
              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
            />
            <button
              type="submit"
              disabled={!newCatName.trim()}
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors"
            >
              + Registrar en Catálogo
            </button>
          </form>
        </div>

        {/* Subcategories and Detail Inspector */}
        <div className="lg:col-span-2 space-y-4">
          {selectedCategory ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
                <div>
                  <span className="text-[11px] font-mono text-slate-400 block">{selectedCategory.id}</span>
                  <h3 className="text-xl font-bold text-slate-900">{selectedCategory.nombre}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(selectedCategory.id)}
                    className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                      selectedCategory.activa
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {selectedCategory.activa ? 'Activa para IA' : 'Inactiva'}
                  </button>
                </div>
              </div>

              <div className="text-xs text-slate-600 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <strong className="text-slate-800 block mb-0.5">Descripción institucional:</strong>
                {selectedCategory.descripcion}
              </div>

              {/* Subcategories list */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Subcategorías / Causales Válidas ({selectedCategory.subcategorias.length})
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                  {selectedCategory.subcategorias.map((sub: string, idx: number) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg border border-slate-200 bg-white flex items-center justify-between text-xs text-slate-800"
                    >
                      <span className="font-medium truncate mr-2">{sub}</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                    </div>
                  ))}
                </div>


                {/* Add Subcategory input */}
                <div className="mt-4 flex gap-2">
                  <input
                    type="text"
                    placeholder="Nueva subcategoría..."
                    value={newSubcatInput}
                    onChange={e => setNewSubcatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubcategory(); } }}
                    className="flex-1 text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  />
                  <button
                    onClick={handleAddSubcategory}
                    disabled={!newSubcatInput.trim()}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shrink-0"
                  >
                    Agregar causal
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 text-xs">
              Selecciona una categoría para ver sus subcategorías.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
