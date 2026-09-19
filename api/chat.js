import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt tidak boleh kosong' });
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite" });
    const systemPrompt = "Jawablah pertanyaan berikut dengan sangat singkat, padat, dan tanpa format markdown (maksimal 15 kata), karena jawaban ini akan ditampilkan di layar kecil OLED ESP8266.";
    
    const result = await model.generateContent(`${systemPrompt}\n\nPertanyaan: ${prompt}`);
    const aiResponse = result.response.text().trim();

    const { error: dbError } = await supabase
      .from('display_messages')
      .insert([{ message: aiResponse }]);

    if (dbError) {
      throw new Error(`Supabase Error: ${dbError.message}`);
    }

    return res.status(200).json({ reply: aiResponse });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}