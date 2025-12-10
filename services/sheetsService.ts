import { WarrantyRecord } from '../types';
import Papa from 'papaparse';

const SHEET_ID = '1tUIWLYEbjJjnsjIvnVLN_FtS4FzliKlNjCiCeUXnSpY';
const SHEET_NAME = 'BD';

// URL directa a la API de visualización de Google Sheets
const BASE_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${SHEET_NAME}`;

// ==========================================
// INSTRUCCIONES PARA GUARDAR EN GOOGLE SHEETS:
// Pega aquí la URL de tu Web App de Google Apps Script
// ==========================================
export const GOOGLE_SCRIPT_URL = ""; 

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

// Helper para limpiar las claves del objeto
const normalizeKey = (key: string) => key ? key.trim().toUpperCase() : '';

const parseCSV = (csvText: string): Promise<WarrantyRecord[]> => {
    return new Promise((resolve) => {
        Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            transformHeader: normalizeKey,
            complete: (results) => {
                if (results.data.length === 0) {
                    resolve([]);
                    return;
                }

                const records: WarrantyRecord[] = results.data
                    .filter((row: any) => row['FECHA'] || row['NOMBRE DEL EQUIPO'])
                    .map((row: any, index: number) => {
                        const rawProcesado = (row['EQUIPO PROCESADO'] || '').toString().toUpperCase();
                        const isProcesado = ['SI', 'TRUE', 'YES', 'S'].includes(rawProcesado);

                        // Manejo flexible de nombres de columnas
                        const falla = row['FALLA DEL EQUIPO EN CASO DE ACCESORIO'] || 
                                      row['FALLA DEL EQUIPO'] || 
                                      row['FALLA'] || '';
                        
                        const precioStr = row['PRECIO DEL EQUIPO'] || row['PRECIO'] || '0';
                        const precio = Number(precioStr.toString().replace(/[^0-9.-]+/g, ""));

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
                            falla: falla,
                            cantidad: Number(row['CANTIDAD'] || 1),
                            precio: isNaN(precio) ? 0 : precio,
                            fechaRealizaCambio: row['FECHA EN QUE SE REALIZA EL CAMBIO'] || '',
                            equipoProcesado: isProcesado,
                            observaciones: row['OBSERVACIONES'] || ''
                        };
                    });
                resolve(records.reverse());
            },
            error: () => resolve(MOCK_DATA)
        });
    });
};

export const fetchWarrantyData = async (): Promise<WarrantyRecord[]> => {
  try {
    console.log("Intentando conectar a hoja BD...");
    
    let csvText = '';
    
    try {
        // Intento 1: Fetch directo (Funciona si está Publicado en la Web)
        const response = await fetch(BASE_URL);
        if (!response.ok) throw new Error('Direct fetch failed');
        csvText = await response.text();
    } catch (directError) {
        console.warn("Conexión directa falló (posible CORS). Intentando vía Proxy...");
        
        // Intento 2: Usar un Proxy CORS seguro para saltar la restricción del navegador
        // 'corsproxy.io' es un servicio público gratuito comúnmente usado para esto
        const proxyUrl = `https://corsproxy.io/?` + encodeURIComponent(BASE_URL);
        const response = await fetch(proxyUrl);
        
        if (!response.ok) throw new Error(`Proxy fetch failed: ${response.status}`);
        csvText = await response.text();
    }

    return await parseCSV(csvText);

  } catch (error) {
    console.error("Error crítico conectando a Google Sheets:", error);
    console.info("TIP: Para mejor rendimiento, vaya a Archivo > Compartir > Publicar en la web > CSV");
    return MOCK_DATA;
  }
};

export const saveWarrantyRecord = async (record: WarrantyRecord): Promise<boolean> => {
  if (!GOOGLE_SCRIPT_URL) {
    console.warn("URL de Google Apps Script no configurada.");
    return false;
  }

  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(record)
    });

    const result = await response.json();
    return result.result === 'success';
  } catch (error) {
    console.error("Error guardando registro:", error);
    return false;
  }
}