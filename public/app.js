const btnRecord = document.getElementById('btn-record');
const statusText = document.getElementById('status-text');
const transcriptText = document.getElementById('transcript-text');
const aiResponse = document.getElementById('ai-response');

let mediaRecorder;
let audioChunks = [];
let isLiveMode = false;
let audioContext;
let analyser;
let microphone;
let silenceTimer;
let isProcessing = false;

// Minta izin mic sejak awal
navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => {
  console.log("Izin mic belum diberikan");
});

btnRecord.addEventListener('click', async () => {
  if (!isLiveMode) {
    startLiveListening();
  } else {
    stopLiveListening();
  }
});

async function startLiveListening() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Setup Audio Analyzer untuk deteksi Hening / Suara
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    microphone = audioContext.createMediaStreamSource(stream);
    microphone.connect(analyser);
    analyser.fftSize = 512;

    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      if (audioChunks.length > 0 && !isProcessing) {
        isProcessing = true;
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        await sendAudioToBackend(audioBlob);
        audioChunks = [];
        isProcessing = false;

        // Restart perekaman otomatis untuk soal berikutnya jika masih di Live Mode
        if (isLiveMode) {
          mediaRecorder.start();
          detectSilence();
        }
      }
    };

    mediaRecorder.start();
    isLiveMode = true;
    statusText.innerText = "🎙️ LIVE MODE: Mendengarkan terus-menerus...";
    btnRecord.innerText = "🛑 Matikan Live Mode";
    btnRecord.style.backgroundColor = "#ef4444";

    detectSilence();

  } catch (err) {
    alert("Gagal mengaktifkan Microphone!");
  }
}

function stopLiveListening() {
  isLiveMode = false;
  clearTimeout(silenceTimer);
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  if (audioContext) audioContext.close();
  
  statusText.innerText = "Mati";
  btnRecord.innerText = "🎙️ Aktifkan Live Mode";
  btnRecord.style.backgroundColor = "#0284c7";
}

// Fungsi mendeteksi kapan pembaca soal berhenti bicara (jeda 1.8 detik)
function detectSilence() {
  if (!isLiveMode || isProcessing) return;

  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(dataArray);

  // Hitung rata-rata volume suara
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    sum += dataArray[i];
  }
  let averageVolume = sum / dataArray.length;

  // Jika volume di bawah ambang batas hening (suara berhenti)
  if (averageVolume < 12) { 
    if (!silenceTimer) {
      silenceTimer = setTimeout(() => {
        // Jika sudah diam selama 1.8 detik dan ada rekaman suara yang masuk
        if (isLiveMode && mediaRecorder.state === 'recording' && audioChunks.length > 0) {
          statusText.innerText = "⚡ Soal selesai dibaca! Memproses Jawaban AI...";
          mediaRecorder.stop(); // Ini otomatis memicu kirim data ke backend
        }
      }, 1800); // 1.8 detik jeda
    }
  } else {
    // Jika masih ada suara bicara, reset timer
    clearTimeout(silenceTimer);
    silenceTimer = null;
    statusText.innerText = "🔴 Mendengarkan suara soal...";
  }

  if (isLiveMode) {
    requestAnimationFrame(detectSilence);
  }
}

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
    statusText.innerText = "✅ Jawaban terkirim ke OLED! Menunggu soal berikutnya...";
  } catch (err) {
    console.log("Abaikan jika suara hanya noise:", err.message);
    statusText.innerText = "🎙️ Menunggu soal dibacakan...";
  }
}