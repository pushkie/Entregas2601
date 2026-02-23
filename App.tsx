
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  UserRole, 
  Delivery, 
  Restaurant, 
  DeliveryStatus 
} from './types';
import { 
  INITIAL_RESTAURANTS, 
  STORAGE_KEYS 
} from './constants';
import { 
  Bike, 
  Calendar as CalendarIcon, 
  Store, 
  Plus, 
  Settings as SettingsIcon,
  ChevronDown,
  RotateCcw,
  Trash2,
  Filter,
  AlertTriangle,
  X,
  ListChecks,
  Check,
  Download,
  BellRing
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import DeliveryList from './components/DeliveryList';
import DeliveryForm from './components/DeliveryForm';
import StatsHeader from './components/StatsHeader';
import CalendarView from './components/CalendarView';
import RestaurantManager from './components/RestaurantManager';
import SettingsView from './components/SettingsView';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'deliveries' | 'calendar' | 'restaurants' | 'settings'>('deliveries');
  const [role, setRole] = useState<UserRole>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ROLE);
    return (saved as UserRole) || UserRole.ADMIN;
  });
  const [riderName, setRiderName] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.RIDER_NAME);
    return saved || 'Rider 1';
  });
  const [deliveries, setDeliveries] = useState<Delivery[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DELIVERIES);
    return saved ? JSON.parse(saved) : [];
  });
  const [restaurants, setRestaurants] = useState<Restaurant[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.RESTAURANTS);
    return saved ? JSON.parse(saved) : INITIAL_RESTAURANTS;
  });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState<Delivery | undefined>(undefined);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [statusFilter, setStatusFilter] = useState<DeliveryStatus | null>(null);
  const [selectedRestaurantIds, setSelectedRestaurantIds] = useState<Set<string>>(new Set());
  
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deliveryToDelete, setDeliveryToDelete] = useState<Delivery | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  
  const [lastDeletedDeliveries, setLastDeletedDeliveries] = useState<Delivery[]>([]);
  const [showUndoToast, setShowUndoToast] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showEndDayBanner, setShowEndDayBanner] = useState(false);
  
  const undoTimerRef = useRef<number | null>(null);
  const successTimerRef = useRef<number | null>(null);

  // Monitorización de la hora para el backup diario
  useEffect(() => {
    const checkTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      const today = now.toISOString().split('T')[0];
      const lastBackup = localStorage.getItem(STORAGE_KEYS.LAST_BACKUP_DATE);

      // Comprobar si hay entregas registradas hoy
      const hasDeliveriesToday = deliveries.some(d => {
        const dDate = new Date(d.date).toISOString().split('T')[0];
        return dDate === today;
      });

      // Solo mostrar si es la hora, no se ha hecho backup hoy Y hay entregas registradas hoy
      if ((timeStr === '23:15' || timeStr === '23:45') && lastBackup !== today && hasDeliveriesToday) {
        setShowEndDayBanner(true);
      }
    };

    const interval = setInterval(checkTime, 60000); // Revisar cada minuto
    checkTime(); // Revisión inicial

    return () => clearInterval(interval);
  }, [deliveries]); // Se añade deliveries como dependencia para tener datos frescos

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DELIVERIES, JSON.stringify(deliveries));
  }, [deliveries]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.RESTAURANTS, JSON.stringify(restaurants));
  }, [restaurants]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ROLE, role);
    localStorage.setItem(STORAGE_KEYS.RIDER_NAME, riderName);
  }, [role, riderName]);

  const handleImportData = (data: any) => {
    if (data.rider) setRiderName(data.rider);
    if (data.restaurants && Array.isArray(data.restaurants)) {
      setRestaurants(prev => {
        const merged = [...prev];
        data.restaurants.forEach((newR: Restaurant) => {
          const index = merged.findIndex(r => r.id === newR.id);
          if (index > -1) merged[index] = { ...merged[index], ...newR };
          else merged.push(newR);
        });
        return merged;
      });
    }
    if (data.deliveries && Array.isArray(data.deliveries)) {
      setDeliveries(prev => {
        const merged = [...prev];
        data.deliveries.forEach((newD: Delivery) => {
          const index = merged.findIndex(d => d.id === newD.id);
          if (index > -1) merged[index] = { ...merged[index], ...newD };
          else merged.push(newD);
        });
        return merged;
      });
    }
    setShowSuccessToast(true);
    if (successTimerRef.current) window.clearTimeout(successTimerRef.current);
    successTimerRef.current = window.setTimeout(() => setShowSuccessToast(false), 3000);
    setTimeout(() => setActiveTab('deliveries'), 150);
  };

  const handleSaveDelivery = (delivery: Delivery) => {
    if (editingDelivery) {
      setDeliveries(prev => prev.map(d => d.id === delivery.id ? delivery : d));
    } else {
      const deliveryWithRider = { ...delivery, riderName };
      setDeliveries(prev => [deliveryWithRider, ...prev]);
    }
    setIsFormOpen(false);
    setEditingDelivery(undefined);
  };

  const handleEditRequest = (delivery: Delivery) => {
    setEditingDelivery(delivery);
    setIsFormOpen(true);
  };

  const handleDeleteRequest = (id: string) => {
    const delivery = deliveries.find(d => d.id === id);
    if (delivery) setDeliveryToDelete(delivery);
  };

  const cancelSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  };

  const executeDelete = () => {
    if (deliveryToDelete) {
      setLastDeletedDeliveries([deliveryToDelete]);
      setDeliveries(prev => prev.filter(d => d.id !== deliveryToDelete.id));
      setDeliveryToDelete(null);
    } else if (isBulkDeleting) {
      const toDelete = deliveries.filter(d => selectedIds.has(d.id));
      setLastDeletedDeliveries(toDelete);
      setDeliveries(prev => prev.filter(d => !selectedIds.has(d.id)));
      setIsBulkDeleting(false);
      setSelectedIds(new Set());
      setIsSelectionMode(false);
    }
    setShowUndoToast(true);
    if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
    undoTimerRef.current = window.setTimeout(() => setShowUndoToast(false), 5000);
  };

  const handleUndoDelete = () => {
    if (lastDeletedDeliveries.length > 0) {
      setDeliveries(prev => [...lastDeletedDeliveries, ...prev]);
      setLastDeletedDeliveries([]);
      setShowUndoToast(false);
    }
  };

  const handleDeleteRange = (start: string, end: string) => {
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime() + (24 * 60 * 60 * 1000) - 1;
    
    const toDelete = deliveries.filter(d => {
      const time = new Date(d.date).getTime();
      return time >= startTime && time <= endTime;
    });

    if (toDelete.length > 0) {
      setLastDeletedDeliveries(toDelete);
      setDeliveries(prev => prev.filter(d => {
        const time = new Date(d.date).getTime();
        return !(time >= startTime && time <= endTime);
      }));
      setShowUndoToast(true);
      if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
      undoTimerRef.current = window.setTimeout(() => setShowUndoToast(false), 5000);
    }
  };

  const handleResetApp = () => {
    setDeliveries([]);
    setRestaurants(INITIAL_RESTAURANTS);
    setShowSuccessToast(true);
    if (successTimerRef.current) window.clearTimeout(successTimerRef.current);
    successTimerRef.current = window.setTimeout(() => setShowSuccessToast(false), 3000);
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const toggleRestaurantFilter = (id: string) => {
    const next = new Set(selectedRestaurantIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedRestaurantIds(next);
  };

  const executeExport = () => {
    try {
      const now = new Date();
      const day = now.getDate().toString().padStart(2, '0');
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const monthAbbr = months[now.getMonth()];
      
      const filename = `${riderName.trim().replace(/\s+/g, '_')}_${day}${monthAbbr}.json`;
      
      const data = {
        deliveries,
        restaurants,
        exportDate: now.toISOString(),
        rider: riderName,
        appVersion: '1.4'
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      
      // Lógica híbrida: Android vs Web
      if (Capacitor.isNativePlatform()) {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const base64data = (reader.result as string).split(',')[1];
          try {
            await Filesystem.writeFile({
              path: filename,
              data: base64data,
              directory: Directory.Documents,
            });
            alert(`Copia de seguridad guardada en Documentos: ${filename}`);
          } catch (e) {
            console.error('Error al guardar backup en Android', e);
            alert('Error al guardar la copia de seguridad.');
          }
        };
        
        // Marcar hoy como guardado
        const today = now.toISOString().split('T')[0];
        localStorage.setItem(STORAGE_KEYS.LAST_BACKUP_DATE, today);
        setShowEndDayBanner(false);
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Marcar hoy como guardado
      const today = now.toISOString().split('T')[0];
      localStorage.setItem(STORAGE_KEYS.LAST_BACKUP_DATE, today);
      setShowEndDayBanner(false);
    } catch (err) {
      console.error('Error al exportar:', err);
    }
  };

  const uniqueRestaurantsWithDeliveries = useMemo(() => {
    const ids = new Set(deliveries.map(d => d.restaurantId));
    return restaurants.filter(r => ids.has(r.id)).sort((a, b) => a.name.localeCompare(b.name));
  }, [deliveries, restaurants]);

  const filteredDeliveries = useMemo(() => {
    return deliveries.filter(d => {
      const matchesStatus = !statusFilter || d.status === statusFilter;
      const matchesRestaurant = selectedRestaurantIds.size === 0 || selectedRestaurantIds.has(d.restaurantId);
      return matchesStatus && matchesRestaurant;
    });
  }, [deliveries, statusFilter, selectedRestaurantIds]);

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-ui-bg shadow-xl overflow-hidden relative border-x border-ui-border">
      
      {/* BANNER DE NOTIFICACIÓN PUSH IN-APP (CIERRE DE JORNADA) */}
      {showEndDayBanner && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 w-[90%] max-w-[350px] bg-corp-blue text-white p-4 rounded-3xl shadow-2xl z-[100] animate-in slide-in-from-top-4 duration-500 ring-4 ring-brand-orange/20">
          <div className="flex items-start gap-4">
            <div className="bg-brand-orange p-2.5 rounded-2xl shadow-lg animate-bounce">
              <BellRing className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <h4 className="font-bold text-[13px] uppercase tracking-tight">Cierre de Jornada</h4>
                <button onClick={() => setShowEndDayBanner(false)} className="opacity-40 hover:opacity-100 transition-opacity">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[11px] opacity-70 mt-1 leading-snug">
                Has registrado entregas hoy. No olvides descargar tu copia de seguridad diaria para no perder tus registros.
              </p>
              <button 
                onClick={executeExport}
                className="mt-3 w-full bg-brand-orange hover:bg-brand-orange/90 text-white font-bold py-2.5 rounded-xl text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-brand-orange/20"
              >
                <Download className="w-3.5 h-3.5" /> Descargar Backup
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-corp-blue text-white px-5 py-3.5 flex justify-between items-center z-20 shrink-0">
        <div className="flex items-center gap-2">
          <Bike className="w-6 h-6 text-brand-orange" />
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1.5">
              <h1 className="font-bold text-lg tracking-tight leading-none">Entregas2601</h1>
              <span className="text-[10px] font-medium opacity-40">v1.4</span>
            </div>
            <span className="text-[9px] text-white/50 font-medium uppercase tracking-widest mt-0.5">{riderName}</span>
          </div>
        </div>
        
        {/* BOTÓN DE FILTRO: SOLO VISIBLE EN PESTAÑA ENTREGAS */}
        {activeTab === 'deliveries' && (
          <button 
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border transition-all ${
              selectedRestaurantIds.size > 0 
                ? 'bg-brand-orange border-brand-orange text-white' 
                : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            {selectedRestaurantIds.size > 0 ? `${selectedRestaurantIds.size} Locales` : 'Filtrar'}
            <ChevronDown className={`w-3 h-3 transition-transform ${showFilterDropdown ? 'rotate-180' : ''}`} />
          </button>
        )}
      </header>

      {showFilterDropdown && activeTab === 'deliveries' && (
        <>
          <div 
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]" 
            onClick={() => setShowFilterDropdown(false)}
          />
          <div className="absolute top-14 right-5 w-56 bg-white border border-ui-border rounded-2xl shadow-2xl z-50 p-2 animate-in fade-in slide-in-from-top-1 overflow-hidden">
            <div className="px-3 py-2 border-b border-ui-bg mb-1 flex justify-between items-center">
              <span className="text-[9px] font-black text-ui-textSec uppercase tracking-widest">Establecimientos</span>
              {selectedRestaurantIds.size > 0 && (
                <button 
                  onClick={() => setSelectedRestaurantIds(new Set())}
                  className="text-[9px] font-bold text-brand-orange uppercase"
                >
                  Limpiar
                </button>
              )}
            </div>
            <div className="max-h-64 overflow-y-auto hide-scrollbar space-y-0.5">
              {uniqueRestaurantsWithDeliveries.length === 0 ? (
                <div className="py-4 text-center text-ui-textSec text-[10px] font-medium italic">Sin entregas registradas</div>
              ) : (
                uniqueRestaurantsWithDeliveries.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => toggleRestaurantFilter(r.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-[11px] font-semibold transition-all flex items-center justify-between ${
                      selectedRestaurantIds.has(r.id) 
                        ? 'bg-brand-orangeSoft/30 text-brand-orange' 
                        : 'text-ui-textSec hover:bg-ui-bg'
                    }`}
                  >
                    <span className="truncate mr-2">{r.name}</span>
                    {selectedRestaurantIds.has(r.id) && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}

      <main className="flex-1 overflow-y-auto hide-scrollbar pb-24">
        {activeTab === 'deliveries' && (
          <div className="flex flex-col">
            <StatsHeader 
              deliveries={filteredDeliveries} 
              activeFilter={statusFilter}
              onFilterChange={setStatusFilter}
            />
            {isSelectionMode && (
              <div className="px-4 py-2 bg-brand-orange/10 border-b border-brand-orange/20 flex justify-between items-center animate-in slide-in-from-top duration-200">
                <span className="text-[10px] font-bold text-brand-orange uppercase tracking-widest flex items-center gap-2">
                  <ListChecks className="w-4 h-4" /> {selectedIds.size} seleccionados
                </span>
                <button 
                  onClick={cancelSelectionMode}
                  className="text-[10px] font-bold text-ui-textSec uppercase hover:text-ui-textMain"
                >
                  Cerrar
                </button>
              </div>
            )}
            <div className="px-4">
              <DeliveryList 
                deliveries={filteredDeliveries} 
                restaurants={restaurants} 
                onEdit={handleEditRequest}
                onDelete={handleDeleteRequest}
                isSelectionMode={isSelectionMode}
                selectedIds={selectedIds}
                onToggleSelection={toggleSelection}
              />
            </div>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="p-5">
            <h2 className="text-lg font-bold text-ui-textMain mb-4 text-center uppercase tracking-widest">DIARIO</h2>
            <CalendarView deliveries={deliveries} restaurants={restaurants} />
          </div>
        )}

        {activeTab === 'restaurants' && (
          <div className="p-5">
            <h2 className="text-lg font-bold text-ui-textMain mb-4 uppercase tracking-widest text-center">Locales</h2>
            <RestaurantManager 
              restaurants={restaurants} 
              onUpdate={setRestaurants} 
              readOnly={false}
            />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="p-5">
            <h2 className="text-lg font-bold text-ui-textMain mb-4 uppercase tracking-widest text-center">Ajustes</h2>
            <SettingsView 
              riderName={riderName}
              setRiderName={setRiderName}
              deliveries={deliveries}
              restaurants={restaurants}
              onImport={handleImportData}
              isSelectionMode={isSelectionMode}
              onEnableSelectionMode={() => {
                setIsSelectionMode(true);
                setActiveTab('deliveries');
              }}
              onManualExport={executeExport}
              onDeleteRange={handleDeleteRange}
              onResetApp={handleResetApp}
            />
          </div>
        )}
      </main>

      {/* MODAL DE CONFIRMACIÓN DE BORRADO */}
      {(deliveryToDelete || isBulkDeleting) && (
        <div className="fixed inset-0 bg-corp-blue/40 backdrop-blur-[3px] z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-t-[32px] sm:rounded-[32px] shadow-2xl p-6 pb-10 sm:pb-6 animate-in slide-in-from-bottom duration-300">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-status-error/10 text-status-error rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-ui-textMain mb-2">
                {isBulkDeleting ? `¿Eliminar ${selectedIds.size} registros?` : '¿Eliminar registro?'}
              </h3>
              <p className="text-sm text-ui-textSec mb-6 px-4">
                {isBulkDeleting 
                  ? 'Esta acción es definitiva una vez transcurrido el tiempo de deshacer.' 
                  : `Estás a punto de borrar la entrega de ${restaurants.find(r => r.id === deliveryToDelete?.restaurantId)?.name || 'este local'}.`}
              </p>
              <div className="flex flex-col w-full gap-3">
                <button 
                  onClick={executeDelete}
                  className="w-full py-4 bg-status-error text-white rounded-2xl font-bold text-sm uppercase tracking-widest shadow-lg shadow-status-error/20 active:scale-[0.98] transition-all"
                >
                  Sí, eliminar ahora
                </button>
                <button 
                  onClick={() => {
                    setDeliveryToDelete(null);
                    setIsBulkDeleting(false);
                  }}
                  className="w-full py-4 bg-ui-bg text-ui-textSec rounded-2xl font-bold text-sm uppercase tracking-widest active:scale-[0.98] transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOASTS Y BOTONES FLOTANTES */}
      {showUndoToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[90%] max-w-[340px] bg-corp-blue text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center justify-between z-[60] animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-3">
            <div className="bg-status-error p-1.5 rounded-lg">
              <Trash2 className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-medium uppercase tracking-wider opacity-60 leading-none">Borrado</span>
              <span className="text-[11px] font-semibold mt-0.5">{lastDeletedDeliveries.length} registros</span>
            </div>
          </div>
          <button 
            onClick={handleUndoDelete}
            className="flex items-center gap-1.5 bg-brand-orange hover:bg-brand-orange/90 px-3 py-2 rounded-xl transition-all shadow-md active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Deshacer</span>
          </button>
        </div>
      )}

      {isSelectionMode && activeTab === 'deliveries' && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[90%] max-w-[340px] bg-white border border-ui-border rounded-2xl shadow-2xl p-2 z-[55] flex items-center justify-between animate-in slide-in-from-bottom-2 duration-300">
          <button 
            onClick={cancelSelectionMode}
            className="flex-1 py-3 bg-ui-bg text-ui-textSec rounded-xl font-bold text-[10px] uppercase tracking-widest active:scale-95 transition-all mr-2"
          >
            Cancelar
          </button>
          <button 
            disabled={selectedIds.size === 0}
            onClick={() => setIsBulkDeleting(true)}
            className="flex-[2] flex items-center justify-center gap-2 bg-status-error text-white py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-status-error/10 active:scale-95 transition-all disabled:opacity-30"
          >
            <Trash2 className="w-3.5 h-3.5" /> Eliminar ({selectedIds.size})
          </button>
        </div>
      )}

      {!isSelectionMode && activeTab === 'deliveries' && (
        <button
          onClick={() => {
            setEditingDelivery(undefined);
            setIsFormOpen(true);
          }}
          className="fixed bottom-24 right-6 w-14 h-14 bg-brand-orange text-white rounded-full flex items-center justify-center shadow-lg hover:bg-brand-orange/90 active:scale-90 transition-all z-30"
        >
          <Plus className="w-7 h-7" />
        </button>
      )}

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto h-16 bg-white border-t border-ui-border flex items-center justify-around px-2 pb-safe z-40">
        <button 
          onClick={() => setActiveTab('deliveries')}
          className={`flex flex-col items-center gap-0.5 transition-all ${activeTab === 'deliveries' ? 'text-brand-green font-bold' : 'text-ui-textSec opacity-50'}`}
        >
          <Bike className="w-5 h-5" />
          <span className="text-[9px] font-semibold uppercase tracking-tight">Entregas</span>
        </button>
        <button 
          onClick={() => setActiveTab('calendar')}
          className={`flex flex-col items-center gap-0.5 transition-all ${activeTab === 'calendar' ? 'text-brand-green font-bold' : 'text-ui-textSec opacity-50'}`}
        >
          <CalendarIcon className="w-5 h-5" />
          <span className="text-[9px] font-semibold uppercase tracking-tight">Diario</span>
        </button>
        <button 
          onClick={() => setActiveTab('restaurants')}
          className={`flex flex-col items-center gap-0.5 transition-all ${activeTab === 'restaurants' ? 'text-brand-green font-bold' : 'text-ui-textSec opacity-50'}`}
        >
          <Store className="w-5 h-5" />
          <span className="text-[9px] font-semibold uppercase tracking-tight">Locales</span>
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center gap-0.5 transition-all ${activeTab === 'settings' ? 'text-brand-green font-bold' : 'text-ui-textSec opacity-50'}`}
        >
          <SettingsIcon className="w-5 h-5" />
          <span className="text-[9px] font-semibold uppercase tracking-tight">Ajustes</span>
        </button>
      </nav>

      {isFormOpen && (
        <DeliveryForm 
          onClose={() => setIsFormOpen(false)}
          onSave={handleSaveDelivery}
          restaurants={restaurants}
          initialData={editingDelivery}
          riderName={riderName}
        />
      )}
    </div>
  );
};

export default App;
