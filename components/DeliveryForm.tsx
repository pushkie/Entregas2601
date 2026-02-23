
import React, { useState, useEffect, useMemo } from 'react';
import { Delivery, Restaurant, DeliveryStatus } from '../types';
import { X, Save, Plus, Minus, Calendar, Store, ClipboardCheck, MapPin } from 'lucide-react';

interface DeliveryFormProps {
  onClose: () => void;
  onSave: (delivery: Delivery) => void;
  restaurants: Restaurant[];
  initialData?: Delivery;
  riderName: string;
}

const DeliveryForm: React.FC<DeliveryFormProps> = ({ onClose, onSave, restaurants, initialData, riderName }) => {
  const sortedRestaurants = useMemo(() => {
    return [...restaurants].sort((a, b) => {
      if (a.isFavorite === b.isFavorite) return a.name.localeCompare(b.name);
      return a.isFavorite ? -1 : 1;
    });
  }, [restaurants]);

  const [date, setDate] = useState(initialData?.date.split('T')[0] || new Date().toLocaleDateString('en-CA'));
  const [restaurantId, setRestaurantId] = useState(initialData?.restaurantId || sortedRestaurants[0]?.id || '');
  const [ordersCount, setOrdersCount] = useState(initialData?.ordersCount || 1);
  const [distanceUnits, setDistanceUnits] = useState(initialData?.distanceUnits || 0);
  const [status, setStatus] = useState<DeliveryStatus>(initialData?.status || DeliveryStatus.PENDING);

  const currentRestaurant = sortedRestaurants.find(r => r.id === restaurantId);
  const baseRate = currentRestaurant?.baseRate || 3.5;
  const distanceRate = currentRestaurant?.distanceRate || 1.5;
  
  useEffect(() => {
    if (distanceUnits > ordersCount) setDistanceUnits(ordersCount);
  }, [ordersCount, distanceUnits]);

  const totalEuros = (ordersCount * baseRate) + (distanceUnits * distanceRate);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const delivery: Delivery = {
      id: initialData?.id || Math.random().toString(36).substr(2, 9),
      date: new Date(date).toISOString(),
      restaurantId,
      ordersCount,
      distanceUnits,
      totalEuros,
      status,
      riderId: initialData?.riderId || 'rider-' + Math.random().toString(16).slice(2, 6),
      riderName: riderName,
    };
    onSave(delivery);
  };

  return (
    <div className="fixed inset-0 bg-corp-blue/30 backdrop-blur-[2px] z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
        
        <div className="px-6 py-4 border-b border-ui-border flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-bold text-ui-textMain">
              {initialData ? 'Editar Registro' : 'Nueva Entrega'}
            </h2>
            <p className="text-[10px] text-ui-textSec font-semibold uppercase tracking-widest">Rider: {riderName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-ui-bg rounded-full text-ui-textSec transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-6 hide-scrollbar">
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-ui-textSec uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-brand-orange" /> Fecha
              </label>
              <input 
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-ui-bg border border-ui-border rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-brand-orange outline-none transition-all font-semibold text-ui-textMain text-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-ui-textSec uppercase tracking-wider flex items-center gap-1.5">
                <Store className="w-3 h-3 text-brand-orange" /> Local
              </label>
              <select 
                value={restaurantId}
                onChange={(e) => setRestaurantId(e.target.value)}
                className="w-full bg-ui-bg border border-ui-border rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-brand-orange outline-none transition-all font-semibold text-ui-textMain text-sm appearance-none cursor-pointer"
              >
                {sortedRestaurants.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.isFavorite ? '★ ' : ''}{r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* EXTRAS A LA IZQUIERDA */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-ui-textSec uppercase tracking-wider flex items-center gap-1">
                <MapPin className="w-3 h-3 text-brand-orange" /> Extras
              </label>
              <div className="flex items-center justify-between bg-ui-bg border border-ui-border rounded-xl p-0.5">
                <button type="button" onClick={() => setDistanceUnits(Math.max(0, distanceUnits - 1))} className="w-9 h-9 flex items-center justify-center text-corp-blue hover:bg-white rounded-lg transition-all"><Minus className="w-5 h-5" /></button>
                <span className="font-black text-lg text-ui-textMain">{distanceUnits}</span>
                <button type="button" onClick={() => setDistanceUnits(Math.min(ordersCount, distanceUnits + 1))} className="w-9 h-9 flex items-center justify-center text-corp-blue hover:bg-white rounded-lg transition-all" disabled={distanceUnits >= ordersCount}><Plus className="w-5 h-5" /></button>
              </div>
            </div>

            {/* PEDIDOS A LA DERECHA */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-ui-textSec uppercase tracking-wider flex items-center gap-1">
                <Plus className="w-3 h-3 text-brand-orange" /> Pedidos
              </label>
              <div className="flex items-center justify-between bg-ui-bg border border-ui-border rounded-xl p-0.5">
                <button type="button" onClick={() => setOrdersCount(Math.max(1, ordersCount - 1))} className="w-9 h-9 flex items-center justify-center text-corp-blue hover:bg-white rounded-lg transition-all"><Minus className="w-5 h-5" /></button>
                <span className="font-black text-lg text-ui-textMain">{ordersCount}</span>
                <button type="button" onClick={() => setOrdersCount(ordersCount + 1)} className="w-9 h-9 flex items-center justify-center text-corp-blue hover:bg-white rounded-lg transition-all"><Plus className="w-5 h-5" /></button>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-ui-textSec uppercase tracking-wider flex items-center gap-1.5">
              <ClipboardCheck className="w-3 h-3 text-brand-orange" /> Estado del Cobro
            </label>
            <div className="grid grid-cols-2 gap-2 bg-ui-bg p-1.5 rounded-2xl border border-ui-border">
              <button 
                type="button" 
                onClick={() => setStatus(DeliveryStatus.PENDING)} 
                className={`py-3.5 rounded-xl text-[11px] font-black uppercase transition-all ${status === DeliveryStatus.PENDING ? 'bg-status-warning text-white shadow-md' : 'text-ui-textSec'}`}
              >
                Pendiente
              </button>
              <button 
                type="button" 
                onClick={() => setStatus(DeliveryStatus.COLLECTED)} 
                className={`py-3.5 rounded-xl text-[11px] font-black uppercase transition-all ${status === DeliveryStatus.COLLECTED ? 'bg-brand-green text-white shadow-md' : 'text-ui-textSec'}`}
              >
                Cobrado
              </button>
            </div>
          </div>

          <div className="bg-corp-blue rounded-[24px] p-6 text-white text-center shadow-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-brand-orange/5 pointer-events-none"></div>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-1">Ganancia Calculada</p>
            <div className="text-4xl font-black text-brand-orange tracking-tight">{totalEuros.toFixed(1)}€</div>
          </div>
        </form>

        <div className="p-5 bg-white border-t border-ui-border shrink-0">
          <button 
            onClick={handleSubmit}
            className="w-full bg-brand-orange hover:bg-brand-orange/90 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 uppercase text-[12px] tracking-[0.15em]"
          >
            <Save className="w-5 h-5" />
            Guardar Entrega
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeliveryForm;
