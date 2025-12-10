import React, { useState } from 'react';
import { WarrantyRecord } from '../types';

interface AddWarrantyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (record: WarrantyRecord) => void;
  tiendas: string[];
}

const AddWarrantyModal: React.FC<AddWarrantyModalProps> = ({ isOpen, onClose, onAdd, tiendas }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    nombreEquipo: '',
    marcaEquipo: '',
    imeiMalo: '',
    tienda: tiendas[0] || '',
    proveedor: '',
    falla: '',
    precio: 0,
    observaciones: '',
    // Campos opcionales al ingreso
    cantidad: 1,
    fechaCambio: '',
    imeiEntregado: '',
    fechaRealizaCambio: '',
    equipoProcesado: false
  });

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const newRecord: WarrantyRecord = {
      id: `new-${Date.now()}`,
      fecha: formData.fecha,
      nombreEquipo: formData.nombreEquipo,
      marcaEquipo: formData.marcaEquipo,
      imeiMalo: formData.imeiMalo,
      tienda: formData.tienda,
      fechaCambio: formData.fechaCambio,
      proveedor: formData.proveedor,
      imeiEntregado: formData.imeiEntregado,
      falla: formData.falla,
      cantidad: Number(formData.cantidad),
      precio: Number(formData.precio),
      fechaRealizaCambio: formData.fechaRealizaCambio,
      equipoProcesado: formData.equipoProcesado,
      observaciones: formData.observaciones
    };

    // Use await if onAdd is async (which it is now in App.tsx)
    await onAdd(newRecord);
    
    setIsSubmitting(false);
    onClose();
    
    // Reset form mostly, keep date
    setFormData(prev => ({ ...prev, nombreEquipo: '', imeiMalo: '', falla: '', precio: 0, observaciones: '' }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden my-8">
        <div className="bg-gray-900 p-4 flex justify-between items-center sticky top-0 z-10">
          <h3 className="text-white font-bold flex items-center gap-2">
            <i className="fas fa-plus-circle"></i> Registrar Ingreso de Garantía
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Sección Datos Principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Fecha de Ingreso</label>
              <input required type="date" name="fecha" value={formData.fecha} onChange={handleChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Tienda</label>
               <input list="tiendas-list" required name="tienda" value={formData.tienda} onChange={handleChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Seleccione o escriba..." />
               <datalist id="tiendas-list">
                 {tiendas.map((t, i) => <option key={i} value={t} />)}
               </datalist>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Nombre del Equipo</label>
              <input required type="text" name="nombreEquipo" value={formData.nombreEquipo} onChange={handleChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ej: iPhone 13 Pro" />
            </div>
             <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Marca</label>
              <input required type="text" name="marcaEquipo" value={formData.marcaEquipo} onChange={handleChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ej: Apple" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">IMEI Malo (Ingreso)</label>
              <input required type="text" name="imeiMalo" value={formData.imeiMalo} onChange={handleChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono" placeholder="3529..." />
            </div>
             <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Proveedor</label>
              <input type="text" name="proveedor" value={formData.proveedor} onChange={handleChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ej: Ingram" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Falla Reportada</label>
              <input required type="text" name="falla" value={formData.falla} onChange={handleChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Describe la falla..." />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Precio ($)</label>
              <input required type="number" name="precio" value={formData.precio} onChange={handleChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="0.00" />
            </div>
          </div>
        
          <div className="border-t pt-4">
            <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <i className="fas fa-clipboard-check"></i> Estado y Notas
            </h4>
            <div className="space-y-3">
                 <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Observaciones</label>
                    <textarea name="observaciones" value={formData.observaciones} onChange={handleChange} rows={2} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="Detalles adicionales, estado físico, etc." />
                </div>
                 <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <input 
                        type="checkbox" 
                        id="equipoProcesado" 
                        name="equipoProcesado" 
                        checked={formData.equipoProcesado} 
                        onChange={(e) => setFormData({...formData, equipoProcesado: e.target.checked})}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="equipoProcesado" className="text-sm text-gray-700 font-medium">Marcar como Equipo Procesado (Ya regresó del proveedor)</label>
                 </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              Cancelar
            </button>
            <button 
                type="submit" 
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors flex items-center gap-2 disabled:opacity-70 disabled:cursor-wait"
            >
              {isSubmitting ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-save"></i>}
              {isSubmitting ? 'Guardando...' : 'Guardar Garantía'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default AddWarrantyModal;