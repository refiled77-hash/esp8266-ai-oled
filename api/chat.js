import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import formidable from "formidable";
import fs from "fs";
import fetch from "node-fetch";
import FormData from "form-data";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const form = formidable({ keepExtensions: true });

  try {
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    const fileList = files.file;
    const audioFile = Array.isArray(fileList) ? fileList[0] : fileList;

    if (!audioFile || !audioFile.filepath) {
      return res.status(400).json({ error: "File audio tidak ditemukan." });
    }

    // 1. Transkripsi via Groq Whisper AI
    const formData = new FormData();
    formData.append("file", fs.createReadStream(audioFile.filepath), "audio.webm");
    formData.append("model", "whisper-large-v3");
    formData.append("language", "en");

    const whisperRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        ...formData.getHeaders()
      },
      body: formData
    });

    const whisperData = await whisperRes.json();

    if (!whisperRes.ok) {
      return res.status(500).json({ error: whisperData.error?.message || "Gagal transkripsi audio di Groq." });
    }

    const spokenText = whisperData.text;
    if (!spokenText || !spokenText.trim()) {
      return res.status(200).json({ transcript: "", reply: "Mendengarkan..." });
    }

    // 2. Tanya Gemini 3.5 Flash Lite
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3.5-flash-lite",
      systemInstruction: "You are an English LCT Quiz Assistant. The input is live audio transcription. IF the input contains a valid English question or multiple-choice question (A, B, C, D), answer IMMEDIATELY with ONLY the option or short answer (e.g., 'ANSWER: A' or 'ANSWER: Washington'). IF the input is just background noise, greetings, or incomplete sentence, reply strictly with 'NO_QUESTION'."
    });

    const result = await model.generateContent(spokenText);
    const reply = result.response.text().trim();

    // 3. Jika bukan soal, jangan kirim ke OLED / Supabase
    if (reply.includes("NO_QUESTION")) {
      return res.status(200).json({ 
        transcript: spokenText, 
        reply: "Mendengarkan..." 
      });
    }

    // 4. Jika ada jawaban valid, kirim ke Supabase untuk ditampilkan di OLED
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    await supabase.from('display_messages').insert([{ message: reply }]);

    return res.status(200).json({ 
      transcript: spokenText, 
      reply: reply 
    });

  } catch (error) {
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}