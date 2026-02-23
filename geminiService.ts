
import { GoogleGenAI } from "@google/genai";
import { Delivery } from "./types";

export const getAIInsights = async (deliveries: Delivery[]): Promise<string> => {
  // Initialize AI client using the environment variable directly as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  // Fixed property name from distancePlus to distanceUnits on line 9
  const statsText = deliveries.map(d => 
    `Fecha: ${d.date}, Pedidos: ${d.ordersCount}, Unidades de Distancia: ${d.distanceUnits}, Total: ${d.totalEuros}€`
  ).join('\n');

  const prompt = `
    Actúa como un experto consultor de logística. Analiza los siguientes registros de entregas de un rider y proporciona un resumen ejecutivo breve (máximo 3 frases) en español.
    Incluye un consejo para mejorar las ganancias o la eficiencia.
    
    Datos:
    ${statsText}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    // Access the .text property of GenerateContentResponse (do not use .text())
    return response.text || "No se pudo generar el análisis en este momento.";
  } catch (error) {
    console.error("Error generating insights:", error);
    return "Error al conectar con la IA.";
  }
};
