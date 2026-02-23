
import React from 'react';
import { Delivery, DeliveryStatus } from '../types';
import { Clock, ShoppingBag, Landmark, ArrowUpRight } from 'lucide-react';

interface StatsHeaderProps {
  deliveries: Delivery[];
  activeFilter: DeliveryStatus | null;
  onFilterChange: (filter: DeliveryStatus | null) => void;
}

const StatsHeader: React.FC<StatsHeaderProps> = ({ deliveries, activeFilter, onFilterChange }) => {
  const totalOrders = deliveries.reduce((acc, curr) => acc + curr.ordersCount, 0);
  const totalEuros = deliveries.reduce((acc, curr) => acc + curr.totalEuros, 0);
  
  const collectedDeliveries = deliveries.filter(d => d.status === DeliveryStatus.COLLECTED);
  const pendingDeliveries = deliveries.filter(d => d.status === DeliveryStatus.PENDING);

  const collectedTotal = collectedDeliveries.reduce((acc, curr) => acc + curr.totalEuros, 0);
  const collectedOrdersCount = collectedDeliveries.reduce((acc, curr) => acc + curr.ordersCount, 0);
    
  const pendingTotal = pendingDeliveries.reduce((acc, curr) => acc + curr.totalEuros, 0);
  const pendingOrdersCount = pendingDeliveries.reduce((acc, curr) => acc + curr.ordersCount, 0);

  const toggleFilter = (filter: DeliveryStatus) => {
    onFilterChange(activeFilter === filter ? null : filter);
  };

  return (
    <div className="bg-white border-b border-ui-border shadow-sm overflow-hidden">
      <div className="grid grid-cols-2 bg-corp-blue text-white">
        <div className="px-5 py-3 flex flex-col border-r border-white/5">
          <div className="flex items-center gap-1.5 opacity-60 mb-0.5">
            <ShoppingBag className="w-3 h-3 text-brand-orange" />
            <p className="text-[10px] uppercase font-semibold tracking-wider">Pedidos</p>
          </div>
          <p className="text-xl font-bold leading-none">{totalOrders}</p>
        </div>
        <div className="px-5 py-3 flex flex-col bg-corp-blue/40">
          <div className="flex items-center gap-1.5 opacity-60 mb-0.5">
            <ArrowUpRight className="w-3 h-3 text-brand-orange" />
            <p className="text-[10px] uppercase font-semibold tracking-wider">Ingresos</p>
          </div>
          <p className="text-xl font-bold leading-none">{totalEuros.toFixed(1)}€</p>
        </div>
      </div>

      <div className="grid grid-cols-2">
        <button 
          onClick={() => toggleFilter(DeliveryStatus.COLLECTED)}
          className={`px-4 py-3 flex items-center justify-between border-r border-ui-border transition-all ${
            activeFilter === DeliveryStatus.COLLECTED 
              ? 'bg-status-success text-white' 
              : 'bg-white text-ui-textMain hover:bg-brand-greenSoft/30'
          }`}
        >
          <div className="flex items-center gap-2">
            <Landmark className={`w-3.5 h-3.5 ${activeFilter === DeliveryStatus.COLLECTED ? 'text-white' : 'text-brand-green'}`} />
            <div className="flex flex-col items-start">
              <span className="text-[11px] font-bold uppercase tracking-tight leading-none">Cobrado</span>
              <span className={`text-[10px] font-medium mt-0.5 ${activeFilter === DeliveryStatus.COLLECTED ? 'text-white/70' : 'text-ui-textSec'}`}>
                {collectedOrdersCount} ped.
              </span>
            </div>
          </div>
          <span className="text-sm font-bold">{collectedTotal.toFixed(1)}€</span>
        </button>

        <button 
          onClick={() => toggleFilter(DeliveryStatus.PENDING)}
          className={`px-4 py-3 flex items-center justify-between transition-all ${
            activeFilter === DeliveryStatus.PENDING 
              ? 'bg-status-warning text-white' 
              : 'bg-white text-ui-textMain hover:bg-brand-orangeSoft/20'
          }`}
        >
          <div className="flex items-center gap-2">
            <Clock className={`w-3.5 h-3.5 ${activeFilter === DeliveryStatus.PENDING ? 'text-white' : 'text-status-warning'}`} />
            <div className="flex flex-col items-start">
              <span className="text-[11px] font-bold uppercase tracking-tight leading-none">Pendiente</span>
              <span className={`text-[10px] font-medium mt-0.5 ${activeFilter === DeliveryStatus.PENDING ? 'text-white/70' : 'text-ui-textSec'}`}>
                {pendingOrdersCount} ped.
              </span>
            </div>
          </div>
          <span className="text-sm font-bold">{pendingTotal.toFixed(1)}€</span>
        </button>
      </div>
    </div>
  );
};

export default StatsHeader;
