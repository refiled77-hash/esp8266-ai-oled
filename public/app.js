const form = document.getElementById('ai-form');
const input = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');
const sendBtn = document.getElementById('send-btn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const userText = input.value.trim();
  if (!userText) return;

  appendMessage(userText, 'user-msg');
  input.value = '';
  sendBtn.disabled = true;

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: userText })
    });

    const data = await res.json();

    if (res.ok) {
      appendMessage(`[Sent to OLED]: ${data.reply}`, 'bot-msg');
    } else {
      appendMessage(`Error: ${data.error}`, 'bot-msg');
    }
  } catch (err) {
    appendMessage('Gagal terhubung ke server.', 'bot-msg');
  } finally {
    sendBtn.disabled = false;
  }
});

function appendMessage(text, className) {
  const msgDiv = document.createElement('div');
  msgDiv.className = className;
  msgDiv.textContent = text;
  chatBox.appendChild(msgDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}