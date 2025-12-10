import React, { useState, useEffect } from 'react';
import { WarrantyRecord } from '../types';

interface EditWarrantyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedRecord: WarrantyRecord) => void;
  record: WarrantyRecord | null;
}

const EditWarrantyModal: React.FC<EditWarrantyModalProps> = ({ isOpen, onClose, onUpdate, record }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<WarrantyRecord>>({});

  useEffect(() => {
    if (record) {
      setFormData({
        equipoProcesado: record.equipoProcesado,
        observaciones: record.observaciones || '',
        imeiEntregado: record.imeiEntregado || '',
        fechaRealizaCambio: record.fechaRealizaCambio || new Date().toISOString().split('T')[0], // Default to today if empty
      });
    }
  }, [record]);

  if (!isOpen || !record) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const updatedRecord: WarrantyRecord = {
      ...record,
      ...formData as any
    };

    await onUpdate(updatedRecord);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
        <div className="bg-orange-600 p-4 flex justify-between items-center">
          <h3 className="text-white font-bold flex items-center gap-2">
            <i className="fas fa-edit"></i> Procesar Garantía
          </h3>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="bg-orange-50 px-6 py-3 border-b border-orange-100">
            <p className="text-sm text-orange-800 font-medium">
                Equipo: {record.nombreEquipo} ({record.marcaEquipo})
            </p>
            <p className="text-xs text-orange-600 font-mono">
                IMEI: {record.imeiMalo}
            </p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
             <div className="flex-1">
                 <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                        type="checkbox"
                        name="equipoProcesado"
                        checked={formData.equipoProcesado}
                        onChange={handleChange}
                        className="w-6 h-6 text-orange-600 rounded focus:ring-orange-500 border-gray-300"
                    />
                    <div>
                        <span className="block text-sm font-bold text-gray-800">¿Equipo Procesado?</span>
                        <span className="block text-xs text-gray-500">Marcar si ya regresó del proveedor a la tienda.</span>
                    </div>
                 </label>
             </div>
          </div>

          <div>
             <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">IMEI Entregado (Nuevo/Reparado)</label>
             <input 
                type="text" 
                name="imeiEntregado" 
                value={formData.imeiEntregado} 
                onChange={handleChange} 
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none font-mono text-sm" 
                placeholder="Si se cambió, ingrese nuevo IMEI"
             />
          </div>

          <div>
             <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Fecha de Cambio / Regreso</label>
             <input 
                type="date" 
                name="fechaRealizaCambio" 
                value={formData.fechaRealizaCambio} 
                onChange={handleChange} 
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm" 
             />
          </div>

          <div>
             <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Observaciones / Notas Finales</label>
             <textarea 
                name="observaciones" 
                value={formData.observaciones} 
                onChange={handleChange} 
                rows={3} 
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm" 
                placeholder="Estado final del equipo, accesorios, etc."
             />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-sm">
              Cancelar
            </button>
            <button 
                type="submit" 
                disabled={isSubmitting}
                className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg shadow-sm transition-colors flex items-center gap-2 text-sm disabled:opacity-70"
            >
              {isSubmitting ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-save"></i>}
              Actualizar
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default EditWarrantyModal;