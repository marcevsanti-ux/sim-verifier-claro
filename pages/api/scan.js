import { lookupSIM } from '../../lib/lookup';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { image, mimeType } = req.body;
  if (!image) return res.status(400).json({ error: 'No image provided' });

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Esta imagen contiene una o más tarjetas SIM/chip de Claro Argentina.

Cada chip tiene DOS etiquetas blancas:
- ARRIBA: un prefijo parcial del número de serie (ej: "8954318224")
- ABAJO: un número más corto que es el SUFIJO (ej: "056426839 0")

El número de serie COMPLETO = PREFIJO + SUFIJO (el "0" separado al final puede ser un dígito extra).

Ejemplo:
- Arriba: 8954318224
- Abajo: 056426839 0
- Serie completa: 8954318224056426839

Extraé para CADA chip visible el número de serie completo (prefijo + sufijo).
Respondé ÚNICAMENTE con los números completos, uno por línea, sin texto adicional.
Si el sufijo tiene un "0" separado al final, incluí la versión con y sin ese 0.`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: image, mimeType: mimeType || 'image/jpeg' } },
    ]);

    const text = result.response.text();

    // Extract all numbers starting with 8954
    const raw = text.match(/8954\d{9,}/g) || [];
    const numbers = [...new Set(raw)];

    // Look up each number
    const results = numbers.map(num => {
      const r = lookupSIM(num);
      return { detected: num, ...r };
    });

    // If no full numbers found, try extracting suffixes and matching
    if (results.length === 0) {
      const suffixes = text.match(/\b0\d{8,9}\b/g) || [];
      suffixes.forEach(suf => {
        const r = lookupSIM(suf);
        if (r.found) results.push({ detected: suf, ...r });
      });
    }

    return res.status(200).json({ results, rawText: text });
  } catch (err) {
    console.error('Gemini error:', err);
    return res.status(500).json({ error: err.message || 'Error procesando imagen' });
  }
}
