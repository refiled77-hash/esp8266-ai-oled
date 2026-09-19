import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  // Hanya terima request POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    // Inisialisasi Gemini AI
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Pakai model gemini-3.5-flash-lite dengan System Instruction LCT
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3.5-flash-lite",
      systemInstruction: "You are an English LCT Quiz Assistant. The input is a spoken English question or multiple-choice question. Answer IMMEDIATELY with ONLY the correct option or direct answer (e.g., 'ANSWER: A' or 'ANSWER: Washington'). Keep explanation under 5 words so it fits on a tiny OLED screen."
    });

    // Generate Jawaban dari Gemini
    const result = await model.generateContent(message);
    const reply = result.response.text().trim();

    // Inisialisasi Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    // Simpan hasil ke Supabase
    const { error: dbError } = await supabase
      .from('display_messages')
      .insert([{ message: reply }]);

    if (dbError) {
      throw dbError;
    }

    return res.status(200).json({ reply });

  } catch (error) {
    console.error("Error handler:", error);
    return res.status(500).json({ error: error.message });
  }
}