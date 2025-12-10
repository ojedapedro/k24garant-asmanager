import React, { useState, useEffect, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fetchWarrantyData, saveWarrantyRecord, GOOGLE_SCRIPT_URL } from './services/sheetsService';
import { generateAIReport } from './services/geminiService';
import { WarrantyRecord, FilterState, Stats } from './types';
import StatsCards from './components/StatsCards';
import FilterBar from './components/FilterBar';
import DataTable from './components/DataTable';
import AIModal from './components/AIModal';
import AddWarrantyModal from './components/AddWarrantyModal';

const LOGO_URL = "https://i.ibb.co/Y4xSyf0d/Tiendas-K24.jpg";

function App() {
  const [records, setRecords] = useState<WarrantyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    startDate: '',
    endDate: '',
    imei: '',
    tienda: ''
  });
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

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
    // 1. Optimistic UI Update: Show it immediately
    setRecords(prev => [newRecord, ...prev]);

    // 2. Background Save
    if (GOOGLE_SCRIPT_URL) {
      const success = await saveWarrantyRecord(newRecord);
      if (success) {
        alert("Registro guardado exitosamente en Google Sheets.");
      } else {
        alert("El registro se guardó localmente, pero hubo un error conectando con Google Sheets. Verifique la conexión.");
      }
    } else {
      alert("Registro local exitoso. Para guardar en la Nube, configure la URL del script en services/sheetsService.ts");
    }
  };

  // Filter Logic
  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      const matchDateStart = filters.startDate ? record.fecha >= filters.startDate : true;
      const matchDateEnd = filters.endDate ? record.fecha <= filters.endDate : true;
      const matchTienda = filters.tienda ? record.tienda === filters.tienda : true;
      const searchLower = filters.imei.toLowerCase();
      const matchImei = filters.imei ? (
        record.imeiMalo.toLowerCase().includes(searchLower) ||
        record.nombreEquipo.toLowerCase().includes(searchLower) ||
        record.marcaEquipo.toLowerCase().includes(searchLower)
      ) : true;

      return matchDateStart && matchDateEnd && matchTienda && matchImei;
    });
  }, [records, filters]);

  // Derived Data: Unique Stores
  const tiendas = useMemo(() => {
    const storeSet = new Set(records.map(r => r.tienda).filter(Boolean));
    if (storeSet.size === 0) return ['K24 Central', 'K24 Norte', 'K24 Sur', 'K24 Este']; // Default fallback
    return Array.from(storeSet).sort();
  }, [records]);

  // Derived Data: Stats
  const stats: Stats = useMemo(() => {
    const totalRecords = filteredRecords.length;
    const totalValue = filteredRecords.reduce((sum, r) => sum + r.precio, 0);
    
    // Top Brand
    const brands: Record<string, number> = {};
    filteredRecords.forEach(r => { if(r.marcaEquipo) brands[r.marcaEquipo] = (brands[r.marcaEquipo] || 0) + 1; });
    const topBrand = Object.entries(brands).sort((a,b) => b[1] - a[1])[0]?.[0] || '';

    // Top Store
    const stores: Record<string, number> = {};
    filteredRecords.forEach(r => { if(r.tienda) stores[r.tienda] = (stores[r.tienda] || 0) + 1; });
    const topStore = Object.entries(stores).sort((a,b) => b[1] - a[1])[0]?.[0] || '';

    return { totalRecords, totalValue, topBrand, topStore };
  }, [filteredRecords]);

  const handleGeneratePDF = async () => {
    setGeneratingPDF(true);
    try {
      const doc = new jsPDF();
      
      let titleX = 14;

      // Try adding logo
      try {
        const response = await fetch(LOGO_URL);
        if (response.ok) {
            const buffer = await response.arrayBuffer();
            doc.addImage(new Uint8Array(buffer), 'JPEG', 14, 10, 20, 20);
            titleX = 40; 
        }
      } catch (e) {
          console.warn("Could not fetch logo for PDF", e);
      }
      
      // Header
      doc.setFontSize(18);
      doc.setTextColor(40);
      doc.text("Reporte de Garantías - Tiendas K24", titleX, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      const dateStr = new Date().toLocaleDateString();
      doc.text(`Fecha de emisión: ${dateStr}`, titleX, 28);
      
      if (filters.tienda) doc.text(`Filtro Tienda: ${filters.tienda}`, titleX, 34);
      
      // AI Summary Generation
      let startY = 45;
      try {
          const summary = await generateAIReport(filteredRecords, 
            `Reporte filtrado para tienda: ${filters.tienda || 'Todas'}, rango: ${filters.startDate || 'Inicio'} a ${filters.endDate || 'Hoy'}.`);
          
          doc.setFontSize(11);
          doc.setTextColor(0);
          doc.text("Resumen Inteligente:", 14, startY);
          doc.setFontSize(9);
          doc.setTextColor(60);
          
          const splitText = doc.splitTextToSize(summary, 180);
          doc.text(splitText, 14, startY + 6);
          
          startY += (splitText.length * 5) + 10;
      } catch (e) {
          console.log("Skipping AI summary due to error");
      }

      // Table
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
        headStyles: { fillColor: [59, 130, 246] }, // Tailwind blue-500
        columnStyles: {
            6: { cellWidth: 30 } // Limit width of Observations column
        }
      });

      // Footer Stats
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(10);
      doc.setTextColor(0);
      doc.text(`Total Registros: ${stats.totalRecords}`, 14, finalY);
      doc.text(`Valor Total Inventario: $${stats.totalValue.toLocaleString()}`, 14, finalY + 6);

      doc.save(`reporte_garantias_k24_${Date.now()}.pdf`);
    } catch (error) {
      console.error("PDF Gen Error", error);
      alert("Error generando el PDF");
    } finally {
      setGeneratingPDF(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <img 
                src={LOGO_URL}
                alt="K24 Logo"
                className="h-10 w-10 rounded-lg object-cover"
              />
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
              <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                <i className="fas fa-user"></i>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tablero de Control</h1>
            <p className="text-sm text-gray-500">Gestiona y reporta las garantías de equipos</p>
          </div>
          <div className="flex gap-3">
             <button 
                onClick={() => setIsAIModalOpen(true)}
                className="md:hidden flex items-center justify-center gap-2 text-sm font-medium text-blue-600 bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <i className="fas fa-magic"></i>
              </button>
            <button
              onClick={handleGeneratePDF}
              disabled={generatingPDF || filteredRecords.length === 0}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-white font-medium shadow-sm transition-all
                ${generatingPDF || filteredRecords.length === 0 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-gray-900 hover:bg-gray-800 hover:shadow-md'
                }`}
            >
              {generatingPDF ? (
                <>
                  <i className="fas fa-circle-notch fa-spin"></i> Generando...
                </>
              ) : (
                <>
                  <i className="fas fa-file-pdf"></i> Exportar Reporte
                </>
              )}
            </button>
          </div>
        </div>

        {/* Components */}
        <StatsCards stats={stats} />
        
        <FilterBar 
          filters={filters} 
          setFilters={setFilters} 
          tiendas={tiendas} 
        />
        
        <DataTable records={filteredRecords} isLoading={loading} />

      </main>

      <AIModal 
        isOpen={isAIModalOpen} 
        onClose={() => setIsAIModalOpen(false)} 
        records={filteredRecords} 
      />

      <AddWarrantyModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddRecord}
        tiendas={tiendas}
      />
    </div>
  );
}

export default App;