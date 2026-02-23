
import React, { useState, useMemo } from 'react';
import { Restaurant } from '../types';
import { Store, Plus, Trash2, Edit3, Euro, Star, X, AlertTriangle, Check } from 'lucide-react';

interface RestaurantManagerProps {
  restaurants: Restaurant[];
  onUpdate: (restaurants: Restaurant[]) => void;
  readOnly?: boolean;
}

const RestaurantManager: React.FC<RestaurantManagerProps> = ({ restaurants, onUpdate, readOnly = false }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    baseRate: 3.5,
    distanceRate: 1.5
  });

  const sortedRestaurants = useMemo(() => {
    return [...restaurants].sort((a, b) => {
      if (a.isFavorite === b.isFavorite) return a.name.localeCompare(b.name);
      return a.isFavorite ? -1 : 1;
    });
  }, [restaurants]);

  const resetForm = () => {
    setFormData({ name: '', baseRate: 3.5, distanceRate: 1.5 });
    setEditingId(null);
    setIsAdding(false);
    setDeletingId(null);
  };

  const handleEdit = (restaurant: Restaurant) => {
    setEditingId(restaurant.id);
    setDeletingId(null);
    setFormData({
      name: restaurant.name,
      baseRate: restaurant.baseRate,
      distanceRate: restaurant.distanceRate || 0
    });
    setIsAdding(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdate(restaurants.map(r => r.id === id ? { ...r, isFavorite: !r.isFavorite } : r));
  };

  const handleSave = () => {
    if (!formData.name.trim()) return;
    if (editingId) {
      onUpdate(restaurants.map(r => r.id === editingId ? { ...r, ...formData } : r));
    } else {
      const newRest: Restaurant = {
        id: Math.random().toString(36).substr(2, 9),
        ...formData,
        isFavorite: false
      };
      onUpdate([...restaurants, newRest]);
    }
    resetForm();
  };

  const confirmDelete = (id: string) => {
    onUpdate(restaurants.filter(r => r.id !== id));
    setDeletingId(null);
  };

  return (
    <div className="space-y-4">
      {/* SECCIÓN DE ENCABEZADO Y BOTÓN AÑADIR */}
      <div className="bg-white rounded-2xl p-5 border border-ui-border shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-orangeSoft flex items-center justify-center text-brand-orange">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-ui-textMain text-base">Establecimientos</h3>
              <p className="text-[11px] text-ui-textSec font-semibold uppercase tracking-wider">Configura tus tarifas</p>
            </div>
          </div>
          {!readOnly && !isAdding && !editingId && (
            <button 
              onClick={() => setIsAdding(true)}
              className="w-10 h-10 bg-brand-orange text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all"
            >
              <Plus className="w-6 h-6" />
            </button>
          )}
        </div>
        
        {!readOnly && !isAdding && !editingId && (
          <button 
            onClick={() => setIsAdding(true)}
            className="w-full py-3 bg-ui-bg border border-dashed border-ui-border rounded-xl text-ui-textSec font-bold text-[12px] uppercase flex items-center justify-center gap-2 hover:border-brand-orange hover:text-brand-orange transition-all"
          >
            <Plus className="w-4 h-4" /> Nuevo Local
          </button>
        )}

        {(isAdding || editingId) && (
          <div className="space-y-4 p-4 border-2 border-brand-orange/20 bg-brand-orangeSoft/10 rounded-xl animate-in fade-in slide-in-from-top-2">
            <div className="flex justify-between items-center mb-1">
              <h4 className="text-[10px] font-bold text-brand-orange uppercase tracking-widest">
                {editingId ? 'Editando Local' : 'Nuevo Local'}
              </h4>
              <button onClick={resetForm} className="text-ui-textSec">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-ui-textSec uppercase">Nombre del Establecimiento</label>
              <input 
                autoFocus
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nombre del local..."
                className="w-full px-3 py-2.5 bg-white border border-ui-border rounded-lg outline-none focus:ring-1 focus:ring-brand-orange font-semibold text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-ui-textSec uppercase">Tarifa Base (€)</label>
                <div className="relative">
                  <input 
                    type="number"
                    step="0.05"
                    value={formData.baseRate}
                    onChange={(e) => setFormData({ ...formData, baseRate: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-7 pr-2 py-2.5 bg-white border border-ui-border rounded-lg outline-none text-sm font-semibold"
                  />
                  <Euro className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-ui-textSec" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-ui-textSec uppercase">Plus Extra (€)</label>
                <div className="relative">
                  <input 
                    type="number"
                    step="0.05"
                    value={formData.distanceRate}
                    onChange={(e) => setFormData({ ...formData, distanceRate: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-7 pr-2 py-2.5 bg-white border border-ui-border rounded-lg outline-none text-sm font-semibold"
                  />
                  <Euro className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-ui-textSec" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button 
                onClick={handleSave}
                className="flex-1 bg-brand-orange text-white py-3 rounded-lg font-bold text-[12px] uppercase shadow-md active:scale-95 transition-all"
              >
                {editingId ? 'Actualizar' : 'Guardar Local'}
              </button>
              <button 
                onClick={resetForm}
                className="flex-1 bg-white border border-ui-border text-ui-textSec py-3 rounded-lg font-bold text-[12px] uppercase active:bg-ui-bg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* LISTADO DE LOCALES */}
      <div className="space-y-1.5 px-1 pb-4">
        {sortedRestaurants.map(r => (
          <div key={r.id} className={`bg-white px-4 py-3 rounded-xl border transition-all flex items-center justify-between relative overflow-hidden shadow-sm ${editingId === r.id ? 'border-brand-orange bg-brand-orangeSoft/5' : 'border-ui-border'} ${deletingId === r.id ? 'border-status-error bg-status-error/5' : ''}`}>
            
            {/* VISTA DE CONFIRMACIÓN DE BORRADO */}
            {deletingId === r.id ? (
              <div className="flex items-center justify-between w-full animate-in slide-in-from-right-4 duration-200">
                <div className="flex items-center gap-2 text-status-error">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-[11px] font-bold uppercase tracking-tight">¿Eliminar {r.name}?</span>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => confirmDelete(r.id)}
                    className="bg-status-error text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase flex items-center gap-1 shadow-sm active:scale-95"
                  >
                    <Check className="w-3 h-3" /> Sí
                  </button>
                  <button 
                    onClick={() => setDeletingId(null)}
                    className="bg-ui-bg text-ui-textSec px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase active:bg-ui-border"
                  >
                    No
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={(e) => handleToggleFavorite(r.id, e)}
                    className={`transition-colors p-1 -ml-1 ${r.isFavorite ? 'text-status-warning' : 'text-ui-border hover:text-status-warning/40'}`}
                  >
                    <Star className={`w-5 h-5 ${r.isFavorite ? 'fill-current' : ''}`} />
                  </button>
                  <div>
                    <h4 className="font-semibold text-ui-textMain text-[15px] leading-tight">{r.name}</h4>
                    <div className="flex gap-2 mt-1">
                      <p className="text-[10px] font-bold text-corp-blue uppercase px-2 py-0.5 bg-ui-bg rounded-md">Base {r.baseRate.toFixed(2)}€</p>
                      <p className="text-[10px] font-bold text-brand-green uppercase px-2 py-0.5 bg-brand-greenSoft rounded-md">Extra {r.distanceRate?.toFixed(2) || '0.00'}€</p>
                    </div>
                  </div>
                </div>
                
                {!readOnly && (
                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={() => handleEdit(r)}
                      className="p-2.5 text-ui-textSec hover:text-corp-blue bg-ui-bg rounded-lg transition-colors active:bg-corp-blue/10"
                      title="Editar"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setDeletingId(r.id)}
                      className="p-2.5 text-ui-textSec hover:text-status-error bg-ui-bg rounded-lg transition-colors active:bg-status-error/10"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
        {sortedRestaurants.length === 0 && (
          <div className="text-center py-10 opacity-30">
            <Store className="w-10 h-10 mx-auto mb-2" />
            <p className="text-xs font-bold uppercase">No hay locales registrados</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantManager;
