const btnListen = document.getElementById('btn-listen');
const micStatus = document.getElementById('mic-status');
const transcriptText = document.getElementById('transcript-text');
const aiResponse = document.getElementById('ai-response');

let isListening = false;
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (!SpeechRecognition) {
  alert("Browser kamu tidak mendukung Speech Recognition. Gunakan Chrome di HP/PC!");
} else {
  const recognition = new SpeechRecognition();
  recognition.continuous = true; // Dengar terus menerus
  recognition.lang = 'en-US';   // Bahasa Inggris untuk LCT
  recognition.interimResults = false;

  btnListen.addEventListener('click', () => {
    if (!isListening) {
      recognition.start();
      isListening = true;
      micStatus.innerText = "Mendengarkan (English)...";
      btnListen.innerText = "🛑 Stop Dengar";
      btnListen.style.backgroundColor = "red";
    } else {
      recognition.stop();
      isListening = false;
      micStatus.innerText = "Mati";
      btnListen.innerText = "🎤 Mulai Dengar (Live)";
      btnListen.style.backgroundColor = "#0070f3";
    }
  });

  recognition.onresult = async (event) => {
    const lastIndex = event.results.length - 1;
    const spokenText = event.results[lastIndex][0].transcript;
    
    transcriptText.innerText = spokenText;
    micStatus.innerText = "Memproses jawaban AI...";

    // Kirim soal ke Serverless Function
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: spokenText })
      });

      const data = await res.json();
      aiResponse.innerText = data.reply;
      micStatus.innerText = "Mendengarkan (English)...";
    } catch (err) {
      aiResponse.innerText = "Error mengambil jawaban.";
      micStatus.innerText = "Error!";
    }
  };

  recognition.onend = () => {
    // Auto restart mic kalau terputus sendiri
    if (isListening) recognition.start();
  };
}