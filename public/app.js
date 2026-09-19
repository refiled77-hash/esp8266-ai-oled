const btnRecord = document.getElementById('btn-record');
const statusText = document.getElementById('status-text');
const transcriptText = document.getElementById('transcript-text');
const aiResponse = document.getElementById('ai-response');

let mediaRecorder;
let audioChunks = [];
let isRecording = false;

// Minta izin mic saat halaman pertama kali dimuat
navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => {
  console.log("Izin mic belum diberikan");
});

btnRecord.addEventListener('click', async () => {
  if (!isRecording) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        await sendAudioToBackend(audioBlob);
      };

      mediaRecorder.start();
      isRecording = true;
      statusText.innerText = "🔴 Merekam Suara Guru...";
      btnRecord.innerText = "🛑 Stop & Proses Jawaban";
      btnRecord.style.backgroundColor = "#ef4444";
    } catch (err) {
      alert("Izin Microphone ditolak!");
    }
  } else {
    mediaRecorder.stop();
    isRecording = false;
    statusText.innerText = "⏳ Memproses Whisper AI...";
    btnRecord.innerText = "🎙️ Rekam Soal Berikutnya";
    btnRecord.style.backgroundColor = "#0284c7";
  }
});

async function sendAudioToBackend(audioBlob) {
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm');

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || "Gagal memproses");

    transcriptText.innerText = data.transcript;
    aiResponse.innerText = data.reply;
    statusText.innerText = "✅ Selesai! Jawaban terkirim ke OLED.";
  } catch (err) {
    statusText.innerText = "Error: " + err.message;
    transcriptText.innerText = "Gagal memproses audio.";
  }
}