// HireMatch.AI — Gemini API proxy with automatic model fallback
// Tries each model in order until one succeeds. No more 404/429 dead-ends.

const MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-flash-latest'
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = req.body;
  const prompt = typeof body === 'string' ? body : body?.prompt;

  if (!prompt) return res.status(400).json({ error: 'No prompt provided' });
  if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY not configured in Vercel environment variables' });

  let lastError = 'Unknown error';

  for (const model of MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: String(prompt) }] }]
        })
      });

      const data = await response.json();

      if (response.ok) {
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (text) return res.status(200).json({ text, model });
      }

      // Model not found (404) or quota exhausted (429) → try next model
      lastError = data.error?.message || `${model} failed with status ${response.status}`;

    } catch (err) {
      lastError = err.message;
    }
  }

  return res.status(500).json({
    error: 'All models unavailable. Last error: ' + lastError
  });
}
