import { WarrantyRecord } from '../types';
import Papa from 'papaparse';

const SHEET_ID = '1tUIWLYEbjJjnsjIvnVLN_FtS4FzliKlNjCiCeUXnSpY';
const SHEET_NAME = 'BD_GARANTIA';

// ==========================================
// CONFIGURACIÓN CRÍTICA
// Pega aquí la URL de tu "Web App" de Google Apps Script.
// Ejemplo: "https://script.google.com/macros/s/AKfycbx.../exec"
// ==========================================
export const GOOGLE_SCRIPT_URL = ""; 

// Fallback URLs (Solo funcionan si la hoja es Pública en la web)
const URL_GVIZ_BD = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${SHEET_NAME}`;
const URL_EXPORT = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&sheet=${SHEET_NAME}`;

// Mock data para cuando todo falla
const MOCK_DATA: WarrantyRecord[] = [
  {
    id: 'mock-1',
    fecha: new Date().toISOString().split('T')[0],
    nombreEquipo: 'Ejemplo de Datos (Sin Conexión)',
    marcaEquipo: 'Sistema',
    imeiMalo: '0000000000',
    tienda: 'Local',
    fechaCambio: '',
    proveedor: '',
    imeiEntregado: '',
    falla: 'No se pudo conectar a Google Sheets. Verifique la URL del Script.',
    cantidad: 1,
    precio: 0,
    fechaRealizaCambio: '',
    equipoProcesado: false,
    observaciones: 'Configure GOOGLE_SCRIPT_URL en services/sheetsService.ts'
  }
];

// --- HELPERS DE PARSEO ROBUSTO ---

/**
 * Busca el valor en un objeto fila (row) usando múltiples posibles nombres de columna (keys).
 * Es insensible a mayúsculas/minúsculas y espacios.
 */
const getRowValue = (row: any, possibleKeys: string[]): string => {
    if (!row) return '';
    const rowKeys = Object.keys(row);
    
    for (const key of possibleKeys) {
        const foundKey = rowKeys.find(k => k.trim().toUpperCase() === key);
        if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
            return String(row[foundKey]).trim();
        }
    }
    return '';
};

/**
 * Transforma una fila cruda (ya sea de JSON o CSV) en un objeto WarrantyRecord limpio
 */
const transformRow = (row: any, index: number): WarrantyRecord | null => {
    // Validar que la fila tenga al menos fecha o nombre
    const fecha = getRowValue(row, ['FECHA']);
    const nombre = getRowValue(row, ['NOMBRE DEL EQUIPO', 'NOMBRE', 'EQUIPO']);
    
    if (!fecha && !nombre) return null;

    const rawProcesado = getRowValue(row, ['EQUIPO PROCESADO', 'PROCESADO']).toUpperCase();
    const isProcesado = ['SI', 'TRUE', 'YES', 'S', '1'].includes(rawProcesado);

    const precioStr = getRowValue(row, ['PRECIO', 'PRECIO DEL EQUIPO']);
    const precio = Number(precioStr.replace(/[^0-9.-]+/g, ""));

    return {
        id: `row-${index}-${Math.random().toString(36).substr(2, 9)}`,
        fecha: fecha,
        nombreEquipo: nombre,
        marcaEquipo: getRowValue(row, ['MARCA DEL EQUIPO', 'MARCA']),
        imeiMalo: getRowValue(row, ['IMEI MALO', 'IMEI']),
        tienda: getRowValue(row, ['TIENDA', 'SUCURSAL']),
        fechaCambio: getRowValue(row, ['FECHA QUE SE REALIZA EL CAMBIO', 'FECHA CAMBIO']),
        proveedor: getRowValue(row, ['PROVEEDOR']),
        imeiEntregado: getRowValue(row, ['IMEI ENTREGADO AL CLIENTE', 'IMEI ENTREGADO']),
        falla: getRowValue(row, ['FALLA DEL EQUIPO EN CASO DE ACCESORIO', 'FALLA DEL EQUIPO', 'FALLA']),
        cantidad: Number(getRowValue(row, ['CANTIDAD']) || 1),
        precio: isNaN(precio) ? 0 : precio,
        fechaRealizaCambio: getRowValue(row, ['FECHA EN QUE SE REALIZA EL CAMBIO', 'FECHA REALIZA']),
        equipoProcesado: isProcesado,
        observaciones: getRowValue(row, ['OBSERVACIONES', 'OBS', 'NOTAS'])
    };
};

// --- FUNCIONES PRINCIPALES ---

const fetchWithTimeout = async (url: string, timeout = 8000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (e) {
        clearTimeout(id);
        throw e;
    }
};

export const fetchWarrantyData = async (): Promise<WarrantyRecord[]> => {
  console.log("Iniciando carga de datos...");
  let records: WarrantyRecord[] = [];

  // 1. INTENTO PRINCIPAL: Google Apps Script (JSON)
  // Este es el método más robusto para hojas privadas o con problemas de CORS
  if (GOOGLE_SCRIPT_URL) {
    try {
        console.log("Intentando conectar vía Google Apps Script...");
        const response = await fetchWithTimeout(GOOGLE_SCRIPT_URL);
        if (!response.ok) throw new Error(`Script error ${response.status}`);
        
        const json = await response.json();
        if (Array.isArray(json)) {
            records = json.map(transformRow).filter((r): r is WarrantyRecord => r !== null);
            console.log(`¡Éxito vía Script! ${records.length} registros.`);
            return records.reverse();
        }
    } catch (e) {
        console.warn("Fallo conexión con Apps Script:", e);
    }
  } else {
      console.warn("GOOGLE_SCRIPT_URL no está configurada. Saltando intento principal.");
  }

  // 2. INTENTOS SECUNDARIOS: CSV via Proxies (Solo hojas públicas)
  const attempts = [
    { name: "Directo GVIZ", url: URL_GVIZ_BD },
    { name: "Proxy AllOrigins", url: `https://api.allorigins.win/raw?url=${encodeURIComponent(URL_GVIZ_BD)}` },
    { name: "Proxy CorsProxy", url: `https://corsproxy.io/?${encodeURIComponent(URL_GVIZ_BD)}` }
  ];

  for (const attempt of attempts) {
    try {
        console.log(`Intentando conectar vía: ${attempt.name}...`);
        const response = await fetchWithTimeout(attempt.url);
        if (!response.ok) throw new Error(`Status ${response.status}`);
        
        const csvText = await response.text();
        if (csvText.trim().startsWith("<")) throw new Error("Respuesta no es CSV");

        // Parsear CSV
        const parsed = await new Promise<any[]>((resolve) => {
            Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => resolve(results.data),
                error: () => resolve([])
            });
        });

        if (parsed.length > 0) {
            records = parsed.map(transformRow).filter((r): r is WarrantyRecord => r !== null);
            console.log(`¡Éxito con ${attempt.name}! ${records.length} registros.`);
            return records.reverse();
        }
    } catch (error) {
        console.warn(`Fallo ${attempt.name}:`, error);
    }
  }

  console.error("Todos los intentos de conexión fallaron.");
  return MOCK_DATA;
};

export const saveWarrantyRecord = async (record: WarrantyRecord): Promise<boolean> => {
  if (!GOOGLE_SCRIPT_URL) {
    console.warn("No se puede guardar: GOOGLE_SCRIPT_URL no configurada.");
    return false;
  }

  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(record)
    });

    const result = await response.json();
    return result.result === 'success';
  } catch (error) {
    console.error("Error guardando registro:", error);
    return false;
  }
}