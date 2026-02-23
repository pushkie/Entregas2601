
import React, { useState, useRef } from 'react';
import { Delivery, Restaurant, DeliveryStatus } from '../types';
import { Edit2, Trash2, Check, Navigation, Bike } from 'lucide-react';

interface DeliveryListProps {
  deliveries: Delivery[];
  restaurants: Restaurant[];
  onEdit: (delivery: Delivery) => void;
  onDelete: (id: string) => void;
  isSelectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelection?: (id: string) => void;
}

const SwipeableItem: React.FC<{
  delivery: Delivery;
  restaurant?: Restaurant;
  onEdit: (delivery: Delivery) => void;
  onDelete: (id: string) => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggle?: () => void;
}> = ({ delivery, restaurant, onEdit, onDelete, isSelectionMode, isSelected, onToggle }) => {
  const [startX, setStartX] = useState<number | null>(null);
  const [startY, setStartY] = useState<number | null>(null);
  const [translateX, setTranslateX] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLongPressing, setIsLongPressing] = useState(false);
  
  const isScrollingRef = useRef(false);
  const longPressTimer = useRef<number | null>(null);
  
  // UMBRALES AJUSTADOS PARA MAYOR SENSIBILIDAD
  const ACTION_THRESHOLD = 55; // Reducido de 75 para facilitar la activación
  const SCROLL_THRESHOLD = 14; // Aumentado para tolerar mejor el scroll vertical durante el swipe
  const tapThreshold = 5;

  const onPointerDown = (e: React.PointerEvent) => {
    // Iniciar el seguimiento
    setStartX(e.clientX);
    setStartY(e.clientY);
    isScrollingRef.current = false;
    setIsAnimating(false);
    
    if (isSelectionMode) return;
    if ((e.target as HTMLElement).closest('button')) return;
    
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
    longPressTimer.current = window.setTimeout(() => {
      if (Math.abs(translateX) < 5 && !isScrollingRef.current) {
        setIsLongPressing(true);
        if (window.navigator.vibrate) window.navigator.vibrate(50);
        setTimeout(() => {
          onEdit(delivery);
          setIsLongPressing(false);
        }, 120);
      }
    }, 600);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (startX === null || startY === null || isScrollingRef.current) return;
    
    const diffX = e.clientX - startX;
    const diffY = e.clientY - startY;

    // Detectar si el usuario está haciendo scroll vertical
    if (Math.abs(diffY) > SCROLL_THRESHOLD && Math.abs(diffY) > Math.abs(diffX)) {
      isScrollingRef.current = true;
      if (longPressTimer.current) {
        window.clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      if (!isSelectionMode) setTranslateX(0);
      return;
    }

    if (isSelectionMode) return;

    // Movimiento horizontal suave
    if (Math.abs(diffX) > 5) { // Un poco de zona muerta para evitar jitter
      if (longPressTimer.current) {
        window.clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      
      // Aplicar resistencia elástica si superamos el umbral
      let finalX = diffX;
      if (Math.abs(diffX) > ACTION_THRESHOLD) {
        const extra = Math.abs(diffX) - ACTION_THRESHOLD;
        finalX = (diffX > 0 ? 1 : -1) * (ACTION_THRESHOLD + extra * 0.3);
      }
      
      setTranslateX(finalX);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (startX === null || startY === null) return;

    const diffX = e.clientX - startX;
    const diffY = e.clientY - startY;
    const isTap = Math.sqrt(diffX * diffX + diffY * diffY) < tapThreshold;

    if (isSelectionMode) {
      if (isTap && !isScrollingRef.current) {
        onToggle?.();
      }
      setStartX(null);
      setStartY(null);
      return;
    }

    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    // Verificar si hemos superado el umbral para disparar la acción
    if (!isScrollingRef.current && Math.abs(translateX) >= ACTION_THRESHOLD) {
      translateX > 0 ? triggerEdit() : triggerDelete();
    } else {
      snapBack();
    }
    
    setStartX(null);
    setStartY(null);
  };

  const snapBack = () => {
    setIsAnimating(true);
    setTranslateX(0);
    // Transición fluida
    setTimeout(() => setIsAnimating(false), 500);
  };

  const triggerEdit = () => {
    setIsAnimating(true);
    setTranslateX(200);
    setTimeout(() => {
      onEdit(delivery);
      setTranslateX(0);
      setIsAnimating(false);
    }, 200);
  };

  const triggerDelete = () => {
    setIsAnimating(true);
    setTranslateX(-200);
    setTimeout(() => {
      onDelete(delivery.id);
      setTranslateX(0);
      setIsAnimating(false);
    }, 200);
  };

  const isCollected = delivery.status === DeliveryStatus.COLLECTED;

  return (
    <div className={`relative overflow-hidden rounded-xl mb-1 select-none touch-pan-y group transition-all duration-300 ${isSelectionMode ? 'pl-2' : ''}`}>
      {/* CAPA DE ACCIONES (FONDO) */}
      {!isSelectionMode && (
        <div className="absolute inset-0 flex items-center justify-between px-6 bg-ui-bg">
          <div className={`flex items-center gap-2 text-status-success font-bold text-[12px] uppercase transition-all duration-200 ${translateX > 20 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
            <div className="bg-status-success p-2 rounded-full shadow-lg text-white">
              <Edit2 className="w-4 h-4" />
            </div>
            <span>Editar</span>
          </div>
          <div className={`flex items-center gap-2 text-status-error font-bold text-[12px] uppercase transition-all duration-200 ${translateX < -20 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}>
            <span>Borrar</span>
            <div className="bg-status-error p-2 rounded-full shadow-lg text-white">
              <Trash2 className="w-4 h-4" />
            </div>
          </div>
        </div>
      )}

      {/* TARJETA INTERACTIVA (FRENTE) */}
      <div 
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => {
           if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
           if (!isSelectionMode && translateX !== 0) snapBack();
           setStartX(null);
           setStartY(null);
        }}
        style={{ 
          transform: isSelectionMode ? 'none' : `translateX(${translateX}px) scale(${isLongPressing ? 0.98 : 1})`,
          transition: isAnimating ? 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)' : 'none'
        }}
        className={`px-3 py-2 rounded-xl border border-ui-border shadow-sm relative z-10 border-b-2 transition-all flex items-center gap-3 ${
          isCollected ? 'border-b-status-success' : 'border-b-status-warning'
        } ${isSelected ? 'bg-brand-orangeSoft/20 border-brand-orange/40' : (isLongPressing ? 'bg-ui-bg' : 'bg-white')}`}
      >
        {isSelectionMode && (
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
            isSelected ? 'bg-brand-orange border-brand-orange text-white' : 'border-ui-border bg-white'
          }`}>
            {isSelected && <Check className="w-3.5 h-3.5" />}
          </div>
        )}

        <div className="flex items-center justify-between w-full min-w-0">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-9 h-9 border-[1px] border-corp-blue rounded-full flex items-center justify-center text-corp-blue font-black text-[16px]">
                {delivery.ordersCount}
              </div>
            </div>

            <div className="flex items-center gap-2 truncate min-w-0 flex-1">
              <h4 className="font-bold text-ui-textMain text-[14px] truncate">
                {restaurant?.name || 'Local'}
              </h4>
              {delivery.distanceUnits > 0 && (
                <div className="flex items-center gap-0.5 bg-brand-orangeSoft text-brand-orange px-1.5 py-0.5 rounded-md font-black text-[10px] shrink-0">
                  <Navigation className="w-2.5 h-2.5 fill-brand-orange" />
                  {delivery.distanceUnits}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3 ml-3 shrink-0">
            <div className="text-right">
              <span className="text-[16px] font-medium text-ui-textMain">{delivery.totalEuros.toFixed(1)}€</span>
            </div>

            <div className={`w-7 h-7 flex items-center justify-center rounded-lg shadow-sm ${
              isCollected ? 'bg-brand-green text-white' : 'bg-status-warning text-white'
            }`}>
              {isCollected ? <Check className="w-4 h-4" /> : <span className="text-[8px] font-black uppercase">PTE</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DeliveryList: React.FC<DeliveryListProps> = ({ 
  deliveries, 
  restaurants, 
  onEdit, 
  onDelete,
  isSelectionMode,
  selectedIds,
  onToggleSelection
}) => {
  const sortedDeliveries = [...deliveries].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  if (sortedDeliveries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-ui-textSec">
        <div className="w-14 h-14 bg-white border border-ui-border rounded-full flex items-center justify-center mb-3 opacity-30">
          <Bike className="w-7 h-7" />
        </div>
        <p className="font-semibold text-[12px] uppercase tracking-widest">Sin registros</p>
      </div>
    );
  }

  const groupedDeliveries: { [key: string]: Delivery[] } = {};
  sortedDeliveries.forEach(d => {
    const dateObj = new Date(d.date);
    const dateStr = dateObj.toLocaleDateString('es-ES', { 
      day: '2-digit', month: 'short' 
    }).replace('.', '');

    if (!groupedDeliveries[dateStr]) groupedDeliveries[dateStr] = [];
    groupedDeliveries[dateStr].push(d);
  });

  return (
    <div className="space-y-2 mt-2 pb-8">
      {Object.entries(groupedDeliveries).map(([date, items]) => {
        const dayTotalOrders = items.reduce((acc, curr) => acc + curr.ordersCount, 0);
        
        return (
          <div key={date} className="space-y-0.5">
            <div className="text-center pt-3 pb-1">
              <span className="text-brand-green font-black text-[12px] uppercase tracking-[0.2em] inline-flex items-baseline gap-1.5">
                {date} 
                <span className="text-[10px] font-medium opacity-50 tracking-normal normal-case text-ui-textSec">
                  ({dayTotalOrders} ped.)
                </span>
              </span>
            </div>
            {items.map((delivery) => (
              <SwipeableItem 
                key={delivery.id}
                delivery={delivery}
                restaurant={restaurants.find(r => r.id === delivery.restaurantId)}
                onEdit={onEdit}
                onDelete={onDelete}
                isSelectionMode={isSelectionMode}
                isSelected={selectedIds?.has(delivery.id)}
                onToggle={() => onToggleSelection?.(delivery.id)}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
};

export default DeliveryList;
