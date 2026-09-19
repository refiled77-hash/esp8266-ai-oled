const btnRecord = document.getElementById('btn-record');
const statusText = document.getElementById('status-text');
const transcriptText = document.getElementById('transcript-text');
const aiResponse = document.getElementById('ai-response');

let mediaRecorder;
let isLiveMode = false;
let intervalId = null;

btnRecord.addEventListener('click', async () => {
  if (!isLiveMode) {
    startFastLiveMode();
  } else {
    stopFastLiveMode();
  }
});

async function startFastLiveMode() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    isLiveMode = true;
    
    statusText.innerText = "⚡ LIVE FAST MODE: Standby mendengarkan soal...";
    btnRecord.innerText = "🛑 Matikan Live Mode";
    btnRecord.style.backgroundColor = "#ef4444";

    // Mulai siklus perekaman instan (setiap 3,5 detik)
    recordAndProcessChunk(stream);
    intervalId = setInterval(() => {
      if (isLiveMode) {
        recordAndProcessChunk(stream);
      }
    }, 3500);

  } catch (err) {
    alert("Izin microphone ditolak!");
  }
}

function stopFastLiveMode() {
  isLiveMode = false;
  if (intervalId) clearInterval(intervalId);
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  statusText.innerText = "Mati";
  btnRecord.innerText = "⚡ Aktifkan Fast Live Mode";
  btnRecord.style.backgroundColor = "#0284c7";
}

function recordAndProcessChunk(stream) {
  let chunks = [];
  mediaRecorder = new MediaRecorder(stream);

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  mediaRecorder.onstop = async () => {
    if (chunks.length > 0 && isLiveMode) {
      const audioBlob = new Blob(chunks, { type: 'audio/webm' });
      await sendChunkToBackend(audioBlob);
    }
  };

  mediaRecorder.start();

  // Berhenti merekam tiap 3 detik untuk langsung dikirim
  setTimeout(() => {
    if (mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
  }, 3000);
}

async function sendChunkToBackend(audioBlob) {
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm');

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();
    if (!res.ok || data.error) return; // Abaikan jika error/suara kosong

    // Tampilkan jika ada teks yang terdeteksi
    if (data.transcript && data.transcript.length > 3) {
      transcriptText.innerText = data.transcript;
      aiResponse.innerText = data.reply;
      statusText.innerText = "⚡ Jawaban Terdeteksi & Terkirim!";
    }
  } catch (err) {
    // Silent fail untuk potongan suara kosong/noise
  }
}