import React from 'react';
import { Stats } from '../types';

interface StatsCardsProps {
  stats: Stats;
}

const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
        <div className="p-3 rounded-full bg-blue-50 text-blue-600 mr-4">
          <i className="fas fa-clipboard-list text-xl"></i>
        </div>
        <div>
          <p className="text-sm text-gray-500 font-medium">Total Garantías</p>
          <p className="text-2xl font-bold text-gray-800">{stats.totalRecords}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
        <div className="p-3 rounded-full bg-green-50 text-green-600 mr-4">
          <i className="fas fa-dollar-sign text-xl"></i>
        </div>
        <div>
          <p className="text-sm text-gray-500 font-medium">Valor Total</p>
          <p className="text-2xl font-bold text-gray-800">${stats.totalValue.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
        <div className="p-3 rounded-full bg-orange-50 text-orange-600 mr-4">
          <i className="fas fa-store text-xl"></i>
        </div>
        <div>
          <p className="text-sm text-gray-500 font-medium">Tienda Crítica</p>
          <p className="text-xl font-bold text-gray-800 truncate">{stats.topStore || 'N/A'}</p>
        </div>
      </div>
    </div>
  );
};

export default StatsCards;