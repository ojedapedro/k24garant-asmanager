import { GoogleGenAI } from "@google/genai";
import { WarrantyRecord } from "../types";

const getGeminiClient = () => {
    // API KEY is sourced from environment as per strict instructions
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateAIReport = async (records: WarrantyRecord[], context: string): Promise<string> => {
    try {
        const ai = getGeminiClient();
        
        // Summarize data to avoid token limits if too large
        const summaryData = records.slice(0, 50).map(r => ({
            equipo: r.nombreEquipo,
            falla: r.falla,
            tienda: r.tienda,
            precio: r.precio
        }));

        const prompt = `
            Actúa como un analista de datos experto para una tienda de celulares llamada K24.
            Analiza los siguientes datos de garantías (muestra de hasta 50 registros):
            ${JSON.stringify(summaryData)}

            Contexto del reporte: ${context}

            Genera un resumen ejecutivo breve (máximo 2 párrafos) en español, destacando:
            1. Fallas más comunes.
            2. Tiendas con más incidencias.
            3. Recomendaciones breves para reducir garantías.
            
            Usa un tono profesional. Texto plano, sin markdown.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return response.text || "No se pudo generar el análisis.";
    } catch (error) {
        console.error("Gemini Error:", error);
        return "El servicio de IA no está disponible en este momento. Verifique su API Key.";
    }
};

export const askDataQuestion = async (records: WarrantyRecord[], question: string): Promise<string> => {
    try {
        const ai = getGeminiClient();
        
        // Simplified data representation
        const dataStr = JSON.stringify(records.slice(0, 30).map(r => `${r.nombreEquipo} (${r.marcaEquipo}): ${r.falla} en ${r.tienda}`));

        const prompt = `
            Tienes acceso a una lista de garantías de celulares:
            ${dataStr}
            
            Responde la siguiente pregunta del usuario basándote SOLAMENTE en estos datos:
            "${question}"
            
            Sé conciso y directo.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        
        return response.text || "No encontré una respuesta clara.";
    } catch (e) {
        console.error(e);
        return "Error al consultar la IA.";
    }
};