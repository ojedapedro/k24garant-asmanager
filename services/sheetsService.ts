import { WarrantyRecord } from '../types';
import Papa from 'papaparse';

const SHEET_ID = '1tUIWLYEbjJjnsjIvnVLN_FtS4FzliKlNjCiCeUXnSpY';
const SHEET_NAME = 'BD_GARANTIA'; // Actualizado para usar la nueva hoja

// Estrategia de URLs para intentar conectar
// 1. GVIZ con nombre de hoja (Mejor opción)
const URL_GVIZ_BD = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${SHEET_NAME}`;
// 2. Export directo (Fallback)
const URL_EXPORT = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&sheet=${SHEET_NAME}`;

// ==========================================
// INSTRUCCIONES PARA GUARDAR EN GOOGLE SHEETS:
// 1. Crea un script en tu Google Sheet (Extensiones > Apps Script)
// 2. Pega el código del servidor (doPost)
// 3. Implementar > Nueva implementación > Web App > Acceso: Cualquier usuario
// 4. Copia la URL generada y pégala abajo entre las comillas
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
                    console.warn("CSV descargado pero vacío.");
                    resolve([]);
                    return;
                }

                console.log(`Filas crudas encontradas: ${results.data.length}`);
                
                const records: WarrantyRecord[] = results.data
                    .filter((row: any) => {
                        // Filtrar filas vacías o basura
                        const hasDate = row['FECHA'] && row['FECHA'].length > 2;
                        const hasName = row['NOMBRE DEL EQUIPO'] && row['NOMBRE DEL EQUIPO'].length > 1;
                        return hasDate || hasName;
                    })
                    .map((row: any, index: number) => {
                        const rawProcesado = (row['EQUIPO PROCESADO'] || '').toString().toUpperCase();
                        const isProcesado = ['SI', 'TRUE', 'YES', 'S', '1'].includes(rawProcesado);

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
                
                console.log(`Registros procesados válidos: ${records.length}`);
                resolve(records.reverse());
            },
            error: (err) => {
                console.error("Error parseando CSV:", err);
                resolve(MOCK_DATA);
            }
        });
    });
};

const fetchWithTimeout = async (url: string, timeout = 5000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return response;
};

export const fetchWarrantyData = async (): Promise<WarrantyRecord[]> => {
  console.log("Iniciando conexión a Google Sheets...");
  
  // Lista de intentos en orden de prioridad
  const attempts = [
    { name: "Directo (GVIZ)", url: URL_GVIZ_BD },
    { name: "Proxy 1 (AllOrigins)", url: `https://api.allorigins.win/raw?url=${encodeURIComponent(URL_GVIZ_BD)}` },
    { name: "Proxy 2 (CorsProxy)", url: `https://corsproxy.io/?${encodeURIComponent(URL_GVIZ_BD)}` },
    // Fallback con formato de exportación tradicional
    { name: "Fallback Export", url: `https://api.allorigins.win/raw?url=${encodeURIComponent(URL_EXPORT)}` }
  ];

  for (const attempt of attempts) {
    try {
        console.log(`Intentando conectar vía: ${attempt.name}...`);
        const response = await fetchWithTimeout(attempt.url, 8000);
        
        if (!response.ok) {
            throw new Error(`Status ${response.status}`);
        }
        
        const csvText = await response.text();
        
        // Verificación básica de que es un CSV y no un HTML de error
        if (csvText.trim().startsWith("<!DOCTYPE html") || csvText.includes("<html")) {
             throw new Error("La respuesta parece ser HTML, no CSV.");
        }

        const data = await parseCSV(csvText);
        
        if (data.length > 0) {
            console.log(`¡Éxito con ${attempt.name}!`);
            return data;
        } else {
            console.warn(`${attempt.name} devolvió 0 datos válidos.`);
        }

    } catch (error) {
        console.warn(`Fallo ${attempt.name}:`, error);
        // Continúa al siguiente intento
    }
  }

  console.error("Todos los intentos de conexión fallaron.");
  return MOCK_DATA;
};

export const saveWarrantyRecord = async (record: WarrantyRecord): Promise<boolean> => {
  if (!GOOGLE_SCRIPT_URL) {
    console.warn("URL de Google Apps Script no configurada en services/sheetsService.ts");
    return false;
  }

  try {
    // IMPORTANTE: Usamos 'Content-Type': 'text/plain' para evitar que el navegador
    // envíe una solicitud OPTIONS (Preflight) que Google Apps Script no soporta bien.
    // El script en el backend debe usar JSON.parse(e.postData.contents).
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', 
      },
      body: JSON.stringify(record)
    });

    const result = await response.json();
    return result.result === 'success';
  } catch (error) {
    console.error("Error guardando registro en la nube:", error);
    return false;
  }
}