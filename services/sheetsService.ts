import { WarrantyRecord } from '../types';
import Papa from 'papaparse';

const SHEET_ID = '1tUIWLYEbjJjnsjIvnVLN_FtS4FzliKlNjCiCeUXnSpY';
// Usamos gviz/tq para poder seleccionar la hoja por nombre ("BD") en lugar de GID
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=BD`;

// ==========================================
// INSTRUCCIONES PARA GUARDAR EN GOOGLE SHEETS:
// 1. Despliega el Apps Script como se indicó anteriormente.
// 2. Copia la URL de la aplicación web (ej: https://script.google.com/macros/s/.../exec).
// 3. Pégala DENTRO de las comillas en la variable de abajo.
// ==========================================
export const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxZgN04PtCnm2z3XgQXt3Q9rOw9Pu0uFZ4kE0oRS2nvYXbZZkF93A4bfSxZuhyfS38nTg/exec"; 

// Mock data para fallback
const MOCK_DATA: WarrantyRecord[] = [
  {
    id: '1',
    fecha: '2023-10-01',
    nombreEquipo: 'iPhone 13 (Ejemplo)',
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
  }
];

// Helper para limpiar las claves del objeto (quita espacios extra y normaliza)
const normalizeKey = (key: string) => key.trim().toUpperCase();

export const fetchWarrantyData = async (): Promise<WarrantyRecord[]> => {
  try {
    console.log("Intentando conectar a hoja BD:", CSV_URL);
    const response = await fetch(CSV_URL);
    
    if (!response.ok) {
      throw new Error(`Error de red: ${response.status}`);
    }
    
    const csvText = await response.text();
    
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => normalizeKey(header), // Normaliza cabeceras automáticamente
        complete: (results) => {
          console.log("Filas crudas encontradas:", results.data.length);
          
          if (results.data.length === 0) {
            console.warn("La hoja parece vacía.");
            resolve([]);
            return;
          }

          const records: WarrantyRecord[] = results.data
            .filter((row: any) => row['FECHA'] || row['NOMBRE DEL EQUIPO']) // Filtrar filas vacías
            .map((row: any, index: number) => {
            
            // Lógica robusta para detectar bools
            const rawProcesado = (row['EQUIPO PROCESADO'] || '').toString().toUpperCase();
            const isProcesado = rawProcesado === 'SI' || rawProcesado === 'TRUE' || rawProcesado === 'YES';

            return {
              id: `row-${index}`,
              fecha: row['FECHA'] || '',
              nombreEquipo: row['NOMBRE DEL EQUIPO'] || '',
              marcaEquipo: row['MARCA DEL EQUIPO'] || '',
              imeiMalo: row['IMEI MALO'] || '',
              tienda: row['TIENDA'] || '',
              fechaCambio: row['FECHA QUE SE REALIZA EL CAMBIO'] || '',
              proveedor: row['PROVEEDOR'] || '', // El transformHeader quita espacios extra automáticamente
              imeiEntregado: row['IMEI ENTREGADO AL CLIENTE'] || '',
              falla: row['FALLA DEL EQUIPO EN CASO DE ACCESORIO'] || row['FALLA DEL EQUIPO'] || row['FALLA'] || '',
              cantidad: Number(row['CANTIDAD'] || 1),
              precio: Number((row['PRECIO DEL EQUIPO'] || row['PRECIO'] || '0').replace(/[^0-9.-]+/g,"")),
              fechaRealizaCambio: row['FECHA EN QUE SE REALIZA EL CAMBIO'] || '',
              equipoProcesado: isProcesado,
              observaciones: row['OBSERVACIONES'] || ''
            };
          });
          
          console.log("Registros procesados:", records.length);
          resolve(records.reverse()); 
        },
        error: (error) => {
          console.error("Error parseando CSV:", error);
          resolve(MOCK_DATA);
        }
      });
    });

  } catch (error) {
    console.warn("No se pudo conectar a Google Sheets. Usando datos de ejemplo.", error);
    return MOCK_DATA;
  }
};

export const saveWarrantyRecord = async (record: WarrantyRecord): Promise<boolean> => {
  if (!GOOGLE_SCRIPT_URL) {
    console.warn("URL de Google Apps Script no configurada en services/sheetsService.ts");
    return false;
  }

  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(record)
    });

    const result = await response.json();
    if (result.result === 'success') {
      return true;
    } else {
      console.error("Error del Script:", result);
      return false;
    }
  } catch (error) {
    console.error("Error de conexión al guardar:", error);
    return false;
  }
};

export const deleteWarrantyRecord = async (id: string): Promise<boolean> => {
  if (!GOOGLE_SCRIPT_URL) {
    console.warn("URL de Google Apps Script no configurada en services/sheetsService.ts");
    return false;
  }

  try {
    const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=delete&id=${id}`, {
      method: 'GET'
    });

    const result = await response.json();
    if (result.result === 'success') {
      return true;
    } else {
      console.error("Error del Script:", result);
      return false;
    }
  } catch (error) {
    console.error("Error de conexión al eliminar:", error);
    return false;
  }
};