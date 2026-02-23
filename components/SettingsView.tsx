
import React, { useRef, useState } from 'react';
import { Delivery, Restaurant, DeliveryStatus } from '../types';
import { 
  User, 
  Download, 
  Upload, 
  AlertCircle, 
  FileJson, 
  CheckCircle2, 
  X, 
  ListChecks, 
  Share2, 
  FileText,
  CalendarDays,
  Send,
  RotateCcw
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
// @ts-ignore
import { jsPDF } from 'jspdf';
// @ts-ignore
import autoTable from 'jspdf-autotable';

interface SettingsViewProps {
  riderName: string;
  setRiderName: (name: string) => void;
  deliveries: Delivery[];
  restaurants: Restaurant[];
  onImport: (data: any) => void;
  isSelectionMode: boolean;
  onEnableSelectionMode: () => void;
  onManualExport: () => void;
  onDeleteRange: (start: string, end: string) => void;
  onResetApp: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ 
  riderName, 
  setRiderName, 
  deliveries, 
  restaurants,
  onImport,
  isSelectionMode,
  onEnableSelectionMode,
  onManualExport,
  onDeleteRange,
  onResetApp
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  // Estados para el rango de fechas
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('en-CA');
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toLocaleDateString('en-CA');
  
  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);
  const [isSharing, setIsSharing] = useState(false);

  const monthsAbbr = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json.deliveries || !Array.isArray(json.deliveries)) throw new Error('Formato inválido.');
        setPendingImport(json);
      } catch (err) {
        setError('Error al procesar el archivo JSON.');
      }
    };
    reader.readAsText(file);
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const getFilteredDeliveries = () => {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime() + (24 * 60 * 60 * 1000) - 1;
    return deliveries.filter(d => {
      const time = new Date(d.date).getTime();
      return time >= start && time <= end;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const shareJSON = async () => {
    setIsSharing(true);
    try {
      const filtered = getFilteredDeliveries();
      if (filtered.length === 0) throw new Error('No hay entregas en este rango.');

      const safeRiderName = riderName.trim().replace(/\s+/g, '_');
      const dStart = startDate.split('-')[2];
      const dEnd = endDate.split('-')[2];
      const mEnd = monthsAbbr[parseInt(endDate.split('-')[1]) - 1];
      const fileName = `${safeRiderName}_${dStart}-${dEnd}${mEnd}.json`;
      
      const data = {
        rider: riderName,
        range: { startDate, endDate },
        deliveries: filtered,
        exportDate: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const file = new File([blob], fileName, { type: 'application/json' });

      // Lógica híbrida: Android vs Web
      if (Capacitor.isNativePlatform()) {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const base64data = (reader.result as string).split(',')[1];
          try {
            await Filesystem.writeFile({
              path: fileName,
              data: base64data,
              directory: Directory.Documents,
            });
            alert(`Archivo guardado en Documentos: ${fileName}`);
          } catch (e) {
            console.error('Error al guardar archivo en Android', e);
            setError('Error al guardar el archivo en el dispositivo.');
          }
        };
        return;
      }

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `Entregas - ${riderName}`,
            text: `Registros del ${startDate} al ${endDate}`
          });
          return;
        } catch (shareErr) {
          console.warn('Share failed, falling back to download', shareErr);
        }
      }
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Error al compartir JSON');
    } finally {
      setIsSharing(false);
    }
  };

  const sharePDF = async () => {
    setIsSharing(true);
    try {
      const filtered = getFilteredDeliveries();
      if (filtered.length === 0) throw new Error('No hay entregas en este rango.');

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Header
      doc.setFontSize(22);
      doc.setTextColor(30, 58, 95); 
      doc.text('REPORTE DE ENTREGAS', pageWidth / 2, 22, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setTextColor(80);
      doc.text(`RIDER: ${riderName.toUpperCase()}`, 14, 32);
      doc.text(`PERIODO: ${startDate} hasta ${endDate}`, 14, 37);
      doc.text(`GENERADO: ${new Date().toLocaleString()}`, 14, 42);

      // Totales para el desglose
      const totalPedidos = filtered.reduce((a, c) => a + c.ordersCount, 0);
      const totalImporte = filtered.reduce((a, c) => a + c.totalEuros, 0);
      const totalCobrado = filtered
        .filter(d => d.status === DeliveryStatus.COLLECTED)
        .reduce((a, c) => a + c.totalEuros, 0);
      const totalPendiente = filtered
        .filter(d => d.status === DeliveryStatus.PENDING)
        .reduce((a, c) => a + c.totalEuros, 0);

      const tableData = filtered.map(d => {
        const rest = restaurants.find(r => r.id === d.restaurantId);
        return [
          new Date(d.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }),
          rest?.name || 'Local',
          d.ordersCount,
          d.status === DeliveryStatus.COLLECTED ? 'C' : 'P',
          `${d.totalEuros.toFixed(2)}€`
        ];
      });

      const half = Math.ceil(tableData.length / 2);
      const leftData = tableData.slice(0, half);
      const rightData = tableData.slice(half);

      const commonConfig: any = {
        head: [['Fecha', 'Local', 'P.', 'E', 'Imp.']],
        headStyles: { fillColor: [30, 58, 95], fontSize: 7, halign: 'center' },
        columnStyles: {
          0: { cellWidth: 15 },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 6, halign: 'center' },
          3: { cellWidth: 6, halign: 'center' },
          4: { cellWidth: 15, halign: 'right' }
        },
        styles: { fontSize: 7, cellPadding: 2 },
      };

      autoTable(doc, {
        ...commonConfig,
        startY: 48,
        body: leftData,
        margin: { left: 10, right: pageWidth / 2 + 2 },
      });

      const leftFinalY = (doc as any).lastAutoTable.finalY;

      autoTable(doc, {
        ...commonConfig,
        startY: 48,
        body: rightData,
        margin: { left: pageWidth / 2 + 2, right: 10 },
      });

      const rightFinalY = (doc as any).lastAutoTable.finalY;
      const finalY = Math.max(leftFinalY, rightFinalY);

      autoTable(doc, {
        startY: finalY + 10,
        margin: { left: 10, right: 10 },
        body: [],
        foot: [
          ['', '', totalPedidos, 'TOTAL BRUTO', `${totalImporte.toFixed(2)}€`],
          ['', '', '', 'YA COBRADO', `${totalCobrado.toFixed(2)}€`],
          ['', '', '', 'PENDIENTE', `${totalPendiente.toFixed(2)}€`]
        ],
        footStyles: { 
          fillColor: [245, 246, 248], 
          textColor: [30, 58, 95], 
          fontStyle: 'bold',
          fontSize: 9
        },
        didParseCell: function(data) {
            if (data.section === 'foot' && data.row.index === 2) {
                data.cell.styles.fillColor = [255, 122, 33];
                data.cell.styles.textColor = [255, 255, 255];
            }
        }
      });

      const safeRiderName = riderName.trim().replace(/\s+/g, '_');
      const dStart = startDate.split('-')[2];
      const dEnd = endDate.split('-')[2];
      const mEnd = monthsAbbr[parseInt(endDate.split('-')[1]) - 1];
      const fileName = `${safeRiderName}_${dStart}-${dEnd}${mEnd}.pdf`;
      const pdfBlob = doc.output('blob');
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

      // Lógica híbrida: Android vs Web
      if (Capacitor.isNativePlatform()) {
        const reader = new FileReader();
        reader.readAsDataURL(pdfBlob);
        reader.onloadend = async () => {
          const base64data = (reader.result as string).split(',')[1];
          try {
            const savedFile = await Filesystem.writeFile({
              path: fileName,
              data: base64data,
              directory: Directory.Cache,
            });
            await Share.share({
              title: `Reporte - ${riderName}`,
              text: `Informe PDF del ${startDate} al ${endDate}`,
              url: savedFile.uri,
            });
          } catch (e) {
            console.error('Error al compartir PDF en Android', e);
            setError('Error al compartir el PDF.');
          }
        };
        return;
      }

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `Reporte - ${riderName}`,
            text: `Informe PDF del ${startDate} al ${endDate}`
          });
          return;
        } catch (shareErr) {
          console.warn('Share failed, falling back to download', shareErr);
        }
      }
      
      doc.save(fileName);
    } catch (err: any) {
      setError(err.message || 'Error al generar PDF');
    } finally {
      setIsSharing(false);
    }
  };

  const handleDeleteRangeConfirm = () => {
    onDeleteRange(startDate, endDate);
    setShowDeleteConfirm(false);
  };

  const handleResetConfirm = () => {
    onResetApp();
    setShowResetConfirm(false);
  };

  const filteredCount = getFilteredDeliveries().length;

  return (
    <div className="space-y-6 pb-20">
      {/* SECCIÓN PERFIL */}
      <div className="bg-white rounded-2xl p-5 border border-ui-border shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-brand-orangeSoft flex items-center justify-center text-brand-orange">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-ui-textMain text-base">Perfil del Rider</h3>
            <p className="text-[11px] text-ui-textSec font-semibold uppercase tracking-wider">Tu identidad</p>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-ui-textSec uppercase ml-1">Nombre Completo</label>
          <input 
            type="text"
            value={riderName}
            onChange={(e) => setRiderName(e.target.value)}
            className="w-full bg-ui-bg border border-ui-border rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-brand-orange font-bold text-ui-textMain text-sm transition-all"
          />
        </div>
      </div>

      {/* REPORTES E INTERVALOS (FUSIONADO) */}
      <div className="bg-gradient-to-br from-corp-blue to-corp-blue/90 rounded-2xl p-5 shadow-lg text-white">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
            <Share2 className="w-5 h-5 text-brand-orange" />
          </div>
          <div>
            <h3 className="font-bold text-base">Reportes e Intervalos</h3>
            <p className="text-[10px] opacity-60 font-semibold uppercase tracking-widest">Gestión por rango</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5 text-corp-blue">
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold uppercase text-white/50 ml-1">Desde</label>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-white rounded-xl px-3 py-2.5 outline-none text-[11px] font-bold"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold uppercase text-white/50 ml-1">Hasta</label>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-white rounded-xl px-3 py-2.5 outline-none text-[11px] font-bold"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <button 
            disabled={isSharing}
            onClick={sharePDF}
            className="flex items-center justify-center gap-3 py-3.5 bg-brand-orange text-white rounded-xl font-bold text-[11px] uppercase tracking-widest shadow-xl active:scale-95 transition-all disabled:opacity-50"
          >
            <FileText className="w-4 h-4" /> Enviar PDF Reporte
          </button>
          <button 
            disabled={isSharing}
            onClick={shareJSON}
            className="flex items-center justify-center gap-3 py-3.5 bg-white/10 border border-white/20 text-white rounded-xl font-bold text-[11px] uppercase tracking-widest active:bg-white/20 transition-all disabled:opacity-50"
          >
            <Send className="w-4 h-4" /> Enviar JSON Rango
          </button>
          
          <div className="h-px bg-white/10 my-1"></div>
          
          <button 
            onClick={() => setShowDeleteConfirm(true)}
            disabled={filteredCount === 0}
            className="flex items-center justify-center gap-3 py-3.5 bg-status-error/20 border border-status-error/30 text-white rounded-xl font-bold text-[11px] uppercase tracking-widest active:bg-status-error/40 transition-all disabled:opacity-30"
          >
            <ListChecks className="w-4 h-4" /> Borrado por Rango ({filteredCount})
          </button>
        </div>
      </div>

      {/* HERRAMIENTAS Y RESET */}
      <div className="bg-white rounded-2xl p-5 border border-ui-border shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-brand-orange/10 flex items-center justify-center text-brand-orange">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-ui-textMain text-base">Herramientas</h3>
            <p className="text-[11px] text-ui-textSec font-semibold uppercase tracking-wider">Mantenimiento</p>
          </div>
        </div>
        
        <div className="space-y-3">
          <button 
            onClick={onEnableSelectionMode}
            disabled={deliveries.length === 0}
            className="w-full flex items-center justify-center gap-3 py-3.5 bg-ui-bg border border-ui-border text-ui-textMain rounded-xl font-bold text-xs uppercase tracking-widest active:bg-ui-border transition-all disabled:opacity-50"
          >
            <ListChecks className="w-4 h-4" /> Selección Manual
          </button>
          
          <button 
            onClick={() => setShowResetConfirm(true)}
            className="w-full flex items-center justify-center gap-3 py-3.5 bg-status-error text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-md active:scale-95 transition-all"
          >
            <RotateCcw className="w-4 h-4" /> Inicializar Aplicación
          </button>
        </div>
      </div>

      {/* COPIA SEGURIDAD COMPLETA */}
      <div className="bg-white rounded-2xl p-5 border border-ui-border shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-corp-blue/10 flex items-center justify-center text-corp-blue">
            <FileJson className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-ui-textMain text-base">Copia de Seguridad</h3>
            <p className="text-[11px] text-ui-textSec font-semibold uppercase tracking-wider">Base de datos completa</p>
          </div>
        </div>

        {pendingImport && (
          <div className="mb-4 p-4 bg-brand-greenSoft/30 border-2 border-brand-green rounded-2xl">
            <div className="flex items-start justify-between mb-3 text-brand-green">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                <h4 className="font-bold text-xs uppercase tracking-wider">Archivo listo</h4>
              </div>
              <button onClick={() => setPendingImport(null)}><X className="w-4 h-4" /></button>
            </div>
            <button 
              onClick={() => onImport(pendingImport)}
              className="w-full py-3 bg-brand-green text-white rounded-xl font-bold text-xs uppercase shadow-md transition-all"
            >
              Confirmar Importación
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-status-error/10 border border-status-error/20 rounded-xl flex items-start gap-2 text-status-error animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="text-[10px] font-bold">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3">
          <button 
            onClick={onManualExport}
            className="w-full flex items-center justify-center gap-3 py-3.5 bg-corp-blue text-white rounded-xl font-bold text-xs uppercase shadow-md active:scale-95 transition-all"
          >
            <Download className="w-4 h-4" /> Exportar Completo
          </button>
          <button 
            onClick={triggerFileInput}
            className="w-full flex items-center justify-center gap-3 py-3.5 bg-white border-2 border-corp-blue text-corp-blue rounded-xl font-bold text-xs uppercase active:bg-ui-bg transition-all"
          >
            <Upload className="w-4 h-4" /> Importar Backup
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
        </div>
      </div>

      {/* MODALES DE CONFIRMACIÓN */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-xs overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-status-error/10 text-status-error rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-ui-textMain mb-2">¿Borrar registros?</h3>
              <p className="text-xs text-ui-textSec leading-relaxed">
                Se eliminarán <span className="font-bold text-status-error">{filteredCount}</span> entregas del periodo:<br/>
                <span className="font-bold text-ui-textMain">{startDate}</span> al <span className="font-bold text-ui-textMain">{endDate}</span>
              </p>
            </div>
            <div className="flex border-t border-ui-border">
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-4 text-xs font-bold text-ui-textSec border-r border-ui-border active:bg-ui-bg transition-colors"
              >
                CANCELAR
              </button>
              <button 
                onClick={handleDeleteRangeConfirm}
                className="flex-1 py-4 text-xs font-bold text-status-error active:bg-status-error/10 transition-colors"
              >
                BORRAR TODO
              </button>
            </div>
          </div>
        </div>
      )}

      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-xs overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-status-error/10 text-status-error rounded-full flex items-center justify-center mx-auto mb-4">
                <RotateCcw className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-ui-textMain mb-2">¿Inicializar App?</h3>
              <p className="text-xs text-ui-textSec leading-relaxed">
                Esta acción <span className="font-bold text-status-error">BORRARÁ TODAS</span> las entregas y reseteará los precios de los restaurantes a los valores base (3.50€ y 1.50€).
              </p>
            </div>
            <div className="flex border-t border-ui-border">
              <button 
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-4 text-xs font-bold text-ui-textSec border-r border-ui-border active:bg-ui-bg transition-colors"
              >
                CANCELAR
              </button>
              <button 
                onClick={handleResetConfirm}
                className="flex-1 py-4 text-xs font-bold text-status-error active:bg-status-error/10 transition-colors"
              >
                RESETEAR APP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;
