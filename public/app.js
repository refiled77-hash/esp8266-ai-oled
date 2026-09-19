const btnRecord = document.getElementById('btn-record');
const statusText = document.getElementById('status-text');
const transcriptText = document.getElementById('transcript-text');
const aiResponse = document.getElementById('ai-response');

let mediaRecorder;
let audioChunks = [];
let isLiveMode = false;
let streamInterval = null;
let isSending = false;

btnRecord.addEventListener('click', async () => {
  if (!isLiveMode) {
    startContinuousLive();
  } else {
    stopContinuousLive();
  }
});

async function startContinuousLive() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      } 
    });

    audioChunks = [];
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    mediaRecorder.start(1000); // Ambil sampel data tiap 1 detik
    isLiveMode = true;

    statusText.innerText = "⚡ LIVE MODE: Standby mendengarkan soal...";
    btnRecord.innerText = "🛑 Matikan Live Mode";
    btnRecord.style.backgroundColor = "#ef4444";

    // Tiap 3.5 detik, kirim akumulasi audio sejauh ini ke server
    streamInterval = setInterval(() => {
      if (isLiveMode && audioChunks.length > 0 && !isSending) {
        sendBufferToBackend();
      }
    }, 3500);

  } catch (err) {
    alert("Izin microphone ditolak!");
  }
}

function stopContinuousLive() {
  isLiveMode = false;
  if (streamInterval) clearInterval(streamInterval);
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  audioChunks = [];
  statusText.innerText = "Mati";
  btnRecord.innerText = "⚡ Aktifkan Live Mode";
  btnRecord.style.backgroundColor = "#0284c7";
}

async function sendBufferToBackend() {
  isSending = true;
  // Gabungkan semua chunk audio yang terkumpul dari awal
  const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm');

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();

    if (res.ok && data.transcript && data.transcript.length > 3) {
      transcriptText.innerText = data.transcript;

      // Jika Gemini mendeteksi soal dan memberikan jawaban
      if (data.reply && data.reply !== "Mendengarkan...") {
        aiResponse.innerText = data.reply;
        statusText.innerText = "✅ Jawaban Terdeteksi & Terkirim ke OLED!";
        
        // Reset buffer audio untuk bersiap mendengarkan soal berikutnya
        audioChunks = [];
      } else {
        statusText.innerText = "🔴 Mendengarkan pembacaan soal...";
      }
    }
  } catch (err) {
    console.log("Processing buffer...");
  } finally {
    isSending = false;
  }
}