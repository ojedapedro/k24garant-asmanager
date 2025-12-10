import React, { useState, useEffect, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fetchWarrantyData, saveWarrantyRecord, updateWarrantyRecord, deleteWarrantyRecord, GOOGLE_SCRIPT_URL } from './services/sheetsService';
import { generateAIReport } from './services/geminiService';
import { WarrantyRecord, FilterState, Stats } from './types';
import StatsCards from './components/StatsCards';
import FilterBar from './components/FilterBar';
import DataTable from './components/DataTable';
import AIModal from './components/AIModal';
import AddWarrantyModal from './components/AddWarrantyModal';
import EditWarrantyModal from './components/EditWarrantyModal';

const LOGO_URL = "https://i.ibb.co/Y4xSyf0d/Tiendas-K24.jpg";

function App() {
  const [records, setRecords] = useState<WarrantyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    startDate: '',
    endDate: '',
    imei: '',
    tienda: '',
    status: ''
  });
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  
  // Modals state
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<WarrantyRecord | null>(null);
  
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const data = await fetchWarrantyData();
      setRecords(data);
      setLoading(false);
    };
    loadData();
  }, []);

  const handleAddRecord = async (newRecord: WarrantyRecord) => {
    // Optimistic UI Update
    setRecords(prev => [newRecord, ...prev]);

    if (GOOGLE_SCRIPT_URL) {
      const success = await saveWarrantyRecord(newRecord);
      if (success) {
        alert("Registro guardado exitosamente en Google Sheets.");
      } else {
        alert("El registro se guardó localmente, pero hubo un error conectando con Google Sheets.");
      }
    } else {
      alert("Registro local exitoso. Configure el Script para persistencia.");
    }
  };

  const handleEditClick = (record: WarrantyRecord) => {
      setSelectedRecord(record);
      setIsEditModalOpen(true);
  };

  const handleDeleteRecord = async (record: WarrantyRecord) => {
    const confirmMessage = `¿Estás seguro de que quieres ELIMINAR el registro de ${record.nombreEquipo} (${record.imeiMalo})?\n\nEsta acción no se puede deshacer.`;
    if (!window.confirm(confirmMessage)) return;

    // Optimistic UI Update (Remove immediately from view)
    setRecords(prev => prev.filter(r => r.id !== record.id));

    if (GOOGLE_SCRIPT_URL) {
        const success = await deleteWarrantyRecord(record);
        if (success) {
            alert("Registro eliminado correctamente de Google Sheets.");
        } else {
            alert("El registro se eliminó de la vista, pero hubo un error al eliminarlo en Google Sheets. Verifique el script.");
        }
    }
  };

  const handleUpdateRecord = async (updatedRecord: WarrantyRecord) => {
      // Optimistic Update
      setRecords(prev => prev.map(r => r.id === updatedRecord.id ? updatedRecord : r));
      
      if (GOOGLE_SCRIPT_URL) {
          const success = await updateWarrantyRecord(updatedRecord);
          if (success) {
              alert("Registro actualizado correctamente en Google Sheets.");
          } else {
              alert("Actualización local. Error al conectar con Google Sheets (Verifique que el script soporte 'update').");
          }
      }
  };

  // 1. Separate Active vs Archived (History) records based on 'isArchived' flag
  // 'isArchived' is set by the sheetsService based on which sheet the data came from (BD_GARANTIA vs EQUIPOS_PROCESADOS)
  const activeRecords = useMemo(() => records.filter(r => !r.isArchived), [records]);
  const historyRecords = useMemo(() => records.filter(r => r.isArchived), [records]);

  // 2. Select which dataset to filter based on Active Tab
  const currentDataset = activeTab === 'active' ? activeRecords : historyRecords;

  // 3. Apply Filters to the current dataset
  const filteredRecords = useMemo(() => {
    return currentDataset.filter(record => {
      const matchDateStart = filters.startDate ? record.fecha >= filters.startDate : true;
      const matchDateEnd = filters.endDate ? record.fecha <= filters.endDate : true;
      const matchTienda = filters.tienda ? record.tienda === filters.tienda : true;
      
      // Logic for Status Filter
      const matchStatus = filters.status ? (() => {
          if (filters.status === 'entregado') return !!record.imeiEntregado;
          // Processed but NOT yet delivered
          if (filters.status === 'procesado') return record.equipoProcesado && !record.imeiEntregado;
          // Not processed AND not delivered
          if (filters.status === 'pendiente') return !record.equipoProcesado && !record.imeiEntregado;
          return true;
      })() : true;

      const searchLower = filters.imei.toLowerCase();
      const matchImei = filters.imei ? (
        record.imeiMalo.toLowerCase().includes(searchLower) ||
        record.nombreEquipo.toLowerCase().includes(searchLower) ||
        record.marcaEquipo.toLowerCase().includes(searchLower)
      ) : true;

      return matchDateStart && matchDateEnd && matchTienda && matchStatus && matchImei;
    });
  }, [currentDataset, filters]);

  // Derived Data (Stats) - Calculated from filtered records of the current view
  const tiendas = useMemo(() => {
    const storeSet = new Set(records.map(r => r.tienda).filter(Boolean));
    if (storeSet.size === 0) return ['K24 Central', 'K24 Norte', 'K24 Sur', 'K24 Este'];
    return Array.from(storeSet).sort();
  }, [records]);

  const stats: Stats = useMemo(() => {
    const totalRecords = filteredRecords.length;
    const totalValue = filteredRecords.reduce((sum, r) => sum + r.precio, 0);
    
    // Top Store Calculation
    const stores: Record<string, number> = {};
    filteredRecords.forEach(r => { if(r.tienda) stores[r.tienda] = (stores[r.tienda] || 0) + 1; });
    const topStore = Object.entries(stores).sort((a,b) => b[1] - a[1])[0]?.[0] || '';

    return { totalRecords, totalValue, topStore };
  }, [filteredRecords]);

  const handleGeneratePDF = async () => {
    setGeneratingPDF(true);
    try {
      const doc = new jsPDF();
      let titleX = 14;

      try {
        const response = await fetch(LOGO_URL);
        if (response.ok) {
            const buffer = await response.arrayBuffer();
            doc.addImage(new Uint8Array(buffer), 'JPEG', 14, 10, 20, 20);
            titleX = 40; 
        }
      } catch (e) {
          console.warn("Could not fetch logo for PDF");
      }
      
      const isFiltered = filteredRecords.length !== currentDataset.length || Object.values(filters).some(Boolean);
      const viewName = activeTab === 'active' ? 'Garantías Activas' : 'Historial Procesados';
      const reportTitle = isFiltered ? `Reporte ${viewName} (Filtrado)` : `Reporte General ${viewName} - K24`;

      doc.setFontSize(18);
      doc.setTextColor(40);
      doc.text(reportTitle, titleX, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      const dateStr = new Date().toLocaleDateString();
      
      // Dynamic Header Positioning
      let yPos = 28;
      doc.text(`Fecha de emisión: ${dateStr}`, titleX, yPos);
      yPos += 5;
      
      if (filters.tienda) {
        doc.text(`Filtro Tienda: ${filters.tienda}`, titleX, yPos);
        yPos += 5;
      }
      if (filters.status) {
        doc.text(`Filtro Estado: ${filters.status.toUpperCase()}`, titleX, yPos);
        yPos += 5;
      }
      if (filters.startDate || filters.endDate) {
         doc.text(`Período: ${filters.startDate || 'Inicio'} a ${filters.endDate || 'Presente'}`, titleX, yPos);
         yPos += 5;
      }
      
      let startY = yPos + 8;
      
      // AI Summary
      try {
          const summary = await generateAIReport(filteredRecords, 
            `Reporte filtrado para tienda: ${filters.tienda || 'Todas'}. Estado: ${filters.status || 'Todos'}. Vista: ${viewName}. Fecha: ${dateStr}`);
          
          doc.setFontSize(11);
          doc.setTextColor(0);
          doc.text("Resumen Inteligente (AI):", 14, startY);
          
          doc.setFontSize(9);
          doc.setTextColor(60);
          const splitText = doc.splitTextToSize(summary, 180);
          doc.text(splitText, 14, startY + 6);
          
          startY += (splitText.length * 5) + 12;
      } catch (e) { console.log("Skipping AI summary"); }

      // Data Table
      autoTable(doc, {
        startY: startY,
        head: [['Fecha', 'Equipo', 'Tienda', 'IMEI Malo', 'Estado', 'Procesado', 'Obs', 'Precio']],
        body: filteredRecords.map(r => [
          r.fecha,
          r.nombreEquipo,
          r.tienda,
          r.imeiMalo,
          r.imeiEntregado ? 'Entregado' : 'Pendiente',
          r.equipoProcesado ? 'SI' : 'NO',
          r.observaciones,
          `$${r.precio}`
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] },
        columnStyles: { 6: { cellWidth: 30 } }
      });

      // Type assertion fix for lastAutoTable property
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(10);
      doc.setTextColor(0);
      doc.text(`Registros en este reporte: ${filteredRecords.length}`, 14, finalY);
      doc.text(`Valor Inventario (Filtrado): $${stats.totalValue.toLocaleString()}`, 14, finalY + 6);

      const fileName = isFiltered ? `reporte_k24_${activeTab}_filtrado_${Date.now()}.pdf` : `reporte_k24_${activeTab}_general_${Date.now()}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error("PDF Gen Error", error);
      alert("Error generando el PDF");
    } finally {
      setGeneratingPDF(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              {!logoError ? (
                <img 
                  src={LOGO_URL}
                  alt="K24 Logo"
                  className="h-10 w-10 rounded-lg object-cover"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">K</div>
              )}
              <span className="text-xl font-bold text-gray-800 tracking-tight hidden sm:block">K24 Garantías</span>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 text-sm font-medium text-white bg-green-600 px-3 py-2 rounded-lg hover:bg-green-700 transition-colors shadow-sm"
              >
                <i className="fas fa-plus"></i> <span className="hidden sm:inline">Registrar</span>
              </button>
              <button 
                onClick={() => setIsAIModalOpen(true)}
                className="hidden md:flex items-center gap-2 text-sm font-medium text-blue-600 bg-blue-50 px-3 py-2 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <i className="fas fa-magic"></i> Consultar AI
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tablero de Control</h1>
            <p className="text-sm text-gray-500">Gestiona y reporta las garantías de equipos</p>
          </div>
          <div className="flex gap-3">
             <button onClick={() => setIsAIModalOpen(true)} className="md:hidden flex items-center justify-center gap-2 text-sm font-medium text-blue-600 bg-blue-50 px-4 py-2 rounded-lg">
                <i className="fas fa-magic"></i>
              </button>
            <button
              onClick={handleGeneratePDF}
              disabled={generatingPDF || filteredRecords.length === 0}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-white font-medium shadow-sm transition-all ${generatingPDF || filteredRecords.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-gray-900 hover:bg-gray-800'}`}
            >
              {generatingPDF ? (
                <><i className="fas fa-circle-notch fa-spin"></i> Generando...</>
              ) : (
                <><i className="fas fa-file-pdf"></i> Exportar Vista PDF ({filteredRecords.length})</>
              )}
            </button>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex space-x-1 rounded-xl bg-gray-200 p-1 mb-6 max-w-md">
            <button
              onClick={() => setActiveTab('active')}
              className={`w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-all
                ${activeTab === 'active' 
                  ? 'bg-white text-blue-700 shadow'
                  : 'text-gray-600 hover:bg-white/[0.12] hover:text-gray-800'
                }`}
            >
              <i className="fas fa-clipboard-list mr-2"></i> Garantías Activas
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-all
                ${activeTab === 'history' 
                  ? 'bg-white text-blue-700 shadow'
                  : 'text-gray-600 hover:bg-white/[0.12] hover:text-gray-800'
                }`}
            >
              <i className="fas fa-archive mr-2"></i> Historial Procesados
            </button>
        </div>

        <StatsCards stats={stats} />
        <FilterBar filters={filters} setFilters={setFilters} tiendas={tiendas} />
        
        {/* Dynamic Title for Table */}
        <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-700">
                {activeTab === 'active' ? 'Listado de Garantías en Curso' : 'Archivo de Equipos Procesados'}
            </h2>
        </div>

        <DataTable records={filteredRecords} isLoading={loading} onEdit={handleEditClick} onDelete={handleDeleteRecord} />

      </main>

      <AIModal isOpen={isAIModalOpen} onClose={() => setIsAIModalOpen(false)} records={filteredRecords} />
      
      <AddWarrantyModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddRecord}
        tiendas={tiendas}
      />

      <EditWarrantyModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onUpdate={handleUpdateRecord}
        record={selectedRecord}
      />
    </div>
  );
}

export default App;