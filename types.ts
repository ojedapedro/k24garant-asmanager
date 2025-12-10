export interface WarrantyRecord {
  id: string;
  fecha: string;
  nombreEquipo: string;
  marcaEquipo: string;
  imeiMalo: string;
  tienda: string;
  fechaCambio: string;
  proveedor: string;
  imeiEntregado: string;
  falla: string;
  cantidad: number;
  precio: number;
  fechaRealizaCambio: string;
  equipoProcesado: boolean; // Nuevo campo: Regreso de proveedor a tienda
  observaciones: string;    // Nuevo campo: Notas adicionales
}

export interface FilterState {
  startDate: string;
  endDate: string;
  imei: string;
  tienda: string;
  status: string; // Nuevo filtro de estado
}

export interface Stats {
  totalRecords: number;
  totalValue: number;
  topBrand: string;
  topStore: string;
}