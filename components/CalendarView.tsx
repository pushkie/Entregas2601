
import React, { useState, useMemo } from 'react';
import { Delivery, Restaurant, DeliveryStatus } from '../types';
import { 
  ChevronLeft, 
  ChevronRight, 
  ShoppingBag, 
  ListChecks, 
  Calendar,
  Navigation,
  Clock,
  RotateCcw,
  Eye
} from 'lucide-react';

interface CalendarViewProps {
  deliveries: Delivery[];
  restaurants: Restaurant[];
}

const CalendarView: React.FC<CalendarViewProps> = ({ deliveries, restaurants }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());
  const [filterPending, setFilterPending] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonthRaw = new Date(year, month, 1).getDay();
  const firstDayOfMonth = (firstDayOfMonthRaw + 6) % 7;
  
  const monthName = currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  const todayStr = new Date().toLocaleDateString('en-CA');

  const getLocalDateString = (y: number, m: number, d: number) => {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };

  const toggleDay = (day: number) => {
    const dateStr = getLocalDateString(year, month, day);
    const newSelected = new Set(selectedDays);
    if (newSelected.has(dateStr)) {
      newSelected.delete(dateStr);
    } else {
      newSelected.add(dateStr);
    }
    setSelectedDays(newSelected);
  };

  const handleResetAll = () => {
    setSelectedDays(new Set());
    setFilterPending(false);
  };

  const handleClearFilter = () => {
    setFilterPending(false);
  };

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const padding = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const selectedDeliveries = useMemo(() => {
    return deliveries.filter(d => {
      const dDate = new Date(d.date);
      const dStr = dDate.toLocaleDateString('en-CA');
      const isInSelectedDays = selectedDays.has(dStr);
      const passesFilter = !filterPending || d.status === DeliveryStatus.PENDING;
      return isInSelectedDays && passesFilter;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [deliveries, selectedDays, filterPending]);

  const stats = useMemo(() => {
    const totalEuros = selectedDeliveries.reduce((acc, curr) => acc + curr.totalEuros, 0);
    const totalOrders = selectedDeliveries.reduce((acc, curr) => acc + curr.ordersCount, 0);
    const daysCount = selectedDays.size || 1;
    const averageEuros = totalEuros / daysCount;
    return { totalEuros, totalOrders, averageEuros, daysCount };
  }, [selectedDeliveries, selectedDays]);

  const groupedSummary = useMemo(() => {
    const grouped = selectedDeliveries.reduce<Record<string, { ordersCount: number, totalEuros: number, ordersWithExtras: number }>>((acc, delivery) => {
      const restId = delivery.restaurantId;
      if (!acc[restId]) {
        acc[restId] = { ordersCount: 0, totalEuros: 0, ordersWithExtras: 0 };
      }
      acc[restId].ordersCount += delivery.ordersCount;
      acc[restId].totalEuros += delivery.totalEuros;
      acc[restId].ordersWithExtras += (delivery.distanceUnits || 0);
      return acc;
    }, {});

    return (Object.entries(grouped) as [string, { ordersCount: number, totalEuros: number, ordersWithExtras: number }][]).map(([id, data]) => ({
      id,
      ordersCount: data.ordersCount,
      totalEuros: data.totalEuros,
      ordersWithExtras: data.ordersWithExtras,
      restaurant: restaurants.find(r => r.id === id)
    })).sort((a, b) => (b.totalEuros - a.totalEuros));
  }, [selectedDeliveries, restaurants]);

  const getDayDeliveries = (day: number) => {
    const dateStr = getLocalDateString(year, month, day);
    return deliveries.filter(d => {
      const dDate = new Date(d.date);
      return dDate.toLocaleDateString('en-CA') === dateStr;
    });
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl p-5 border border-ui-border shadow-sm">
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-bold text-ui-textMain capitalize flex items-center gap-1.5 text-base">
            <Calendar className="w-5 h-5 text-brand-orange" /> {monthName}
          </h3>
          <div className="flex gap-2">
            <button 
              onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
              className="p-2 rounded-lg bg-ui-bg text-ui-textSec active:scale-90 transition-transform"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
              className="p-2 rounded-lg bg-ui-bg text-ui-textSec active:scale-90 transition-transform"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1.5 text-center">
          {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
            <div key={d} className="text-[11px] font-bold text-ui-textSec py-1">{d}</div>
          ))}
          {padding.map(p => <div key={`p-${p}`} className="h-14"></div>)}
          {days.map(day => {
            const dayDeliveries = getDayDeliveries(day);
            const totalEuros = dayDeliveries.reduce((acc, curr) => acc + curr.totalEuros, 0);
            const totalOrders = dayDeliveries.reduce((acc, curr) => acc + curr.ordersCount, 0);
            const hasDeliveries = dayDeliveries.length > 0;
            const dateStr = getLocalDateString(year, month, day);
            const isSelected = selectedDays.has(dateStr);
            const isToday = dateStr === todayStr;

            return (
              <button 
                key={day} 
                onClick={() => toggleDay(day)}
                className={`h-14 flex flex-col items-center justify-center rounded-lg relative transition-all border-2 ${
                  isSelected 
                    ? 'bg-corp-blue text-white border-corp-blue shadow-md scale-[0.97]' 
                    : isToday
                      ? 'border-brand-orange bg-white shadow-sm'
                      : hasDeliveries 
                        ? 'bg-brand-orangeSoft text-brand-orange border-brand-orangeSoft' 
                        : 'text-ui-textSec border-transparent hover:bg-ui-bg'
                }`}
              >
                <span className={`text-[11px] absolute top-1.5 ${
                  isSelected 
                    ? 'text-white font-bold' 
                    : isToday 
                      ? 'text-brand-orange font-bold' 
                      : 'text-corp-blue font-semibold opacity-70'
                }`}>
                  {day}
                </span>

                {isToday && !isSelected && (
                  <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-brand-orange rounded-full animate-pulse" />
                )}
                
                {hasDeliveries && (
                  <div className={`flex flex-col items-center mt-3.5 leading-none font-light ${isSelected ? 'text-white' : 'text-brand-orange'}`}>
                    <span className="text-[9px] font-bold">{totalOrders}p</span>
                    <span className="text-[9px]">{totalEuros.toFixed(1)}€</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDays.size > 0 ? (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 pb-8">
          <div className={`bg-corp-blue rounded-2xl p-5 text-white shadow-lg relative overflow-hidden transition-all ${filterPending ? 'ring-2 ring-status-warning ring-inset' : ''}`}>
            {filterPending && (
              <div className="absolute top-0 right-0 bg-status-warning text-white text-[8px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-widest flex items-center gap-1 shadow-sm">
                <Clock className="w-2.5 h-2.5" /> Solo Pendientes
              </div>
            )}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[9px] font-bold uppercase opacity-50 tracking-wider">Total</p>
                <p className="text-xl font-bold text-brand-orange leading-tight">{stats.totalEuros.toFixed(2)}€</p>
              </div>
              <div className="border-x border-white/5">
                <p className="text-[9px] font-bold uppercase opacity-50 tracking-wider">Pedidos</p>
                <p className="text-xl font-bold leading-tight">{stats.totalOrders}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase opacity-50 tracking-wider">MEDIA/DÍA</p>
                <p className="text-xl font-bold text-brand-green leading-tight">{stats.averageEuros.toFixed(1)}€</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-ui-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-ui-textMain text-[11px] tracking-widest uppercase flex items-center gap-1.5">
                <ListChecks className="w-4 h-4 text-brand-orange" /> Resumen Locales
              </h4>
              <div className="flex gap-1.5">
                <button 
                  onClick={() => setFilterPending(!filterPending)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-all text-[10px] font-bold uppercase ${
                    filterPending 
                      ? 'bg-status-warning text-white shadow-md' 
                      : 'bg-ui-bg text-ui-textSec'
                  }`}
                  title="Ver pendientes"
                >
                  <Clock className="w-3 h-3" />
                  {filterPending ? 'PTE' : 'Filtrar'}
                </button>
                {filterPending && (
                  <button 
                    onClick={handleClearFilter}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-ui-bg text-corp-blue text-[10px] font-bold uppercase transition-all active:scale-95"
                    title="Ver todos"
                  >
                    <Eye className="w-3 h-3" />
                    Todo
                  </button>
                )}
                <button 
                  onClick={handleResetAll} 
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-ui-bg text-ui-textSec text-[10px] font-bold uppercase transition-all active:bg-ui-border"
                  title="Limpiar todo"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              {groupedSummary.length === 0 ? (
                <div className="flex flex-col items-center py-6">
                   <p className="text-[12px] text-ui-textSec text-center italic leading-tight">
                    {filterPending ? 'No hay entregas pendientes en los días seleccionados' : 'Selecciona días en el calendario para ver el resumen'}
                  </p>
                </div>
              ) : (
                groupedSummary.map((item) => (
                  <div key={item.id} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-ui-bg border border-ui-border animate-in fade-in duration-200">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-[13px] font-bold text-ui-textMain truncate shrink-0 max-w-[40%]">
                        {item.restaurant?.isFavorite ? '★ ' : ''}{item.restaurant?.name || 'Local'}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-0.5 text-corp-blue font-bold text-[11px]">
                          <ShoppingBag className="w-3 h-3" />
                          {item.ordersCount}
                        </div>
                        {item.ordersWithExtras > 0 && (
                          <div className="flex items-center gap-0.5 text-brand-orange font-bold text-[10px] uppercase">
                            <Navigation className="w-3 h-3 fill-brand-orange" />
                            x{item.ordersWithExtras}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="text-[14px] font-bold text-ui-textMain ml-2 shrink-0">
                      {item.totalEuros.toFixed(2)}€
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 opacity-30">
          <Calendar className="w-12 h-12 mb-3 text-ui-textSec" />
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-ui-textSec text-center px-8 leading-relaxed">
            Toca los días en el calendario para generar informes detallados
          </p>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
