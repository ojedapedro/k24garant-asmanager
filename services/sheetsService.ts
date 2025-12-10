import { WarrantyRecord } from '../types';
import Papa from 'papaparse';

const SHEET_ID = '1tUIWLYEbjJjnsjIvnVLN_FtS4FzliKlNjCiCeUXnSpY';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`;

// PASTE YOUR APPS SCRIPT WEB APP URL HERE
// Example: "https://script.google.com/macros/s/AKfycbx.../exec"
export const GOOGLE_SCRIPT_URL = ""; 

// Mock data
const MOCK_DATA: WarrantyRecord[] = [
  {
    id: '1',
    fecha: '2023-10-01',
    nombreEquipo: 'iPhone 13',
    marcaEquipo: 'Apple',
    imeiMalo: '354829102938475',
    tienda: 'K24 Central',
    fechaCambio: '2023-10-05',
    proveedor: 'Ingram',
    imeiEntregado: '354829102938476',
    falla: 'Pantalla no enciende',
    cantidad: 1,
    precio: 750,
    fechaRealizaCambio: '2023-10-05',
    equipoProcesado: true,
    observaciones: 'Cliente reportó daño en caja original.'
  },
  {
    id: '2',
    fecha: '2023-10-02',
    nombreEquipo: 'Galaxy S23',
    marcaEquipo: 'Samsung',
    imeiMalo: '990000112233445',
    tienda: 'K24 Norte',
    fechaCambio: '2023-10-03',
    proveedor: 'Samsung Direct',
    imeiEntregado: '990000112233446',
    falla: 'No carga',
    cantidad: 1,
    precio: 900,
    fechaRealizaCambio: '2023-10-03',
    equipoProcesado: true,
    observaciones: ''
  },
  {
    id: '3',
    fecha: '2023-10-15',
    nombreEquipo: 'Redmi Note 12',
    marcaEquipo: 'Xiaomi',
    imeiMalo: '864209123456789',
    tienda: 'K24 Sur',
    fechaCambio: '2023-10-20',
    proveedor: 'Comcel',
    imeiEntregado: '864209123456790',
    falla: 'Reinicio constante',
    cantidad: 1,
    precio: 250,
    fechaRealizaCambio: '2023-10-20',
    equipoProcesado: false,
    observaciones: 'Esperando respuesta de soporte técnico.'
  }
];

export const fetchWarrantyData = async (): Promise<WarrantyRecord[]> => {
  try {
    const response = await fetch(CSV_URL);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const csvText = await response.text();
    
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const records: WarrantyRecord[] = results.data.map((row: any, index: number) => {
            const rawProcesado = (row['EQUIPO PROCESADO'] || '').toUpperCase();
            const isProcesado = rawProcesado === 'SI' || rawProcesado === 'TRUE' || rawProcesado === 'YES' || rawProcesado.includes('PROCESADO');

            return {
              id: `row-${index}`,
              fecha: row['FECHA'] || '',
              nombreEquipo: row['NOMBRE DEL EQUIPO'] || '',
              marcaEquipo: row['MARCA DEL EQUIPO'] || '',
              imeiMalo: row['IMEI MALO'] || '',
              tienda: row['TIENDA'] || '',
              fechaCambio: row['FECHA QUE SE REALIZA EL CAMBIO'] || '',
              proveedor: row['PROVEEDOR'] || '',
              imeiEntregado: row['IMEI ENTREGADO AL CLIENTE'] || '',
              falla: row['FALLA DEL EQUIPO EN CASO DE ACCESORIO'] || row['FALLA DEL EQUIPO'] || '',
              cantidad: Number(row['CANTIDAD'] || 1),
              precio: Number((row['Precio del equipo'] || '0').replace(/[^0-9.-]+/g,"")),
              fechaRealizaCambio: row['FECHA EN QUE SE REALIZA EL CAMBIO'] || '',
              equipoProcesado: isProcesado,
              observaciones: row['OBSERVACIONES'] || ''
            };
          });
          resolve(records.reverse()); // Show newest first usually
        },
        error: (error) => {
          console.error("CSV Parse Error:", error);
          resolve(MOCK_DATA);
        }
      });
    });

  } catch (error) {
    console.warn("Could not fetch live Google Sheet. Using mock data.");
    return MOCK_DATA;
  }
};

export const saveWarrantyRecord = async (record: WarrantyRecord): Promise<boolean> => {
  if (!GOOGLE_SCRIPT_URL) {
    console.warn("Google Script URL is missing. Cannot save to cloud.");
    return false;
  }

  try {
    // We use text/plain to avoid CORS preflight OPTIONS request which Apps Script doesn't handle well
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(record)
    });

    const result = await response.json();
    if (result.result === 'success') {
      return true;
    } else {
      console.error("Script error:", result);
      return false;
    }
  } catch (error) {
    console.error("Save error:", error);
    return false;
  }
};