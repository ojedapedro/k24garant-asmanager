import React from 'react';
import { WarrantyRecord } from '../types';

interface DataTableProps {
  records: WarrantyRecord[];
  isLoading: boolean;
  onEdit: (record: WarrantyRecord) => void;
}

const DataTable: React.FC<DataTableProps> = ({ records, isLoading, onEdit }) => {
  if (isLoading) {
    return (
      <div className="w-full h-64 flex items-center justify-center bg-white rounded-xl shadow-sm">
        <div className="flex flex-col items-center gap-2">
          <i className="fas fa-circle-notch fa-spin text-3xl text-blue-500"></i>
          <span className="text-gray-500 text-sm">Cargando datos...</span>
        </div>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="w-full h-48 flex items-center justify-center bg-white rounded-xl shadow-sm border border-gray-100">
        <p className="text-gray-500">No se encontraron registros con los filtros actuales.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold tracking-wider">
              <th className="px-6 py-4">Acción</th>
              <th className="px-6 py-4">Fecha</th>
              <th className="px-6 py-4">Equipo / IMEI</th>
              <th className="px-6 py-4">Tienda</th>
              <th className="px-6 py-4">Proveedor</th>
              <th className="px-6 py-4">Falla</th>
              <th className="px-6 py-4">Precio</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4">Observaciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {records.map((record) => {
               // Logic for status display
               let statusContent;
               let statusClass;

               if (record.imeiEntregado) {
                   statusContent = (
                       <>
                         <i className="fas fa-check-circle text-green-500"></i>
                         <span>Entregado</span>
                       </>
                   );
                   statusClass = "bg-green-50 text-green-700 border-green-100";
               } else if (record.equipoProcesado) {
                   statusContent = (
                       <>
                         <i className="fas fa-box-open text-blue-500"></i>
                         <span>Procesado</span>
                       </>
                   );
                   statusClass = "bg-blue-50 text-blue-700 border-blue-100";
               } else {
                   statusContent = (
                       <>
                         <i className="fas fa-clock text-yellow-500"></i>
                         <span>Pendiente</span>
                       </>
                   );
                   statusClass = "bg-yellow-50 text-yellow-700 border-yellow-100";
               }

               return (
                <tr key={record.id} className="hover:bg-blue-50/50 transition-colors text-sm text-gray-700">
                  <td className="px-6 py-4">
                     <button 
                        onClick={() => onEdit(record)}
                        className="text-gray-400 hover:text-orange-600 transition-colors p-2 rounded-full hover:bg-orange-50"
                        title="Editar / Procesar"
                     >
                        <i className="fas fa-edit text-lg"></i>
                     </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs">{record.fecha}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900">{record.nombreEquipo}</span>
                      <span className="text-xs text-gray-500">{record.marcaEquipo}</span>
                      <span className="font-mono text-xs text-gray-400 mt-1">{record.imeiMalo}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {record.tienda}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-gray-600 text-xs uppercase font-medium">
                      {record.proveedor || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 max-w-xs truncate" title={record.falla}>{record.falla}</td>
                  <td className="px-6 py-4 font-medium text-gray-900">${record.precio.toLocaleString()}</td>
                  <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusClass}`}>
                          {statusContent}
                      </div>
                  </td>
                  <td className="px-6 py-4 max-w-[200px]">
                      {record.observaciones ? (
                        <p className="truncate text-xs text-gray-500 italic" title={record.observaciones}>
                            {record.observaciones}
                        </p>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 text-xs text-gray-500">
        Mostrando {records.length} registros
      </div>
    </div>
  );
};

export default DataTable;