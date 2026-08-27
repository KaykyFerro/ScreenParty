const createRoom = document.querySelector('#createRoom');
const joinRoom = document.querySelector('#joinRoom');
const roomCode = document.querySelector('#roomCode');
const status = document.querySelector('#status');

// Desenvolvimento local. Após o deploy, troque para a URL HTTPS pública.
const WEB_APP_URL = 'http://localhost:8787';

function generateRoomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part = (length) => Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
  return `${part(3)}-${part(3)}`;
}

function setStatus(message) {
  status.textContent = message;
}

function openRoom(code) {
  const normalized = code.trim().toUpperCase();
  if (!/^[A-Z2-9]{3}-[A-Z2-9]{3}$/.test(normalized)) {
    setStatus('Digite um código no formato ABC-123.');
    return;
  }
  chrome.storage.local.set({ lastRoomCode: normalized }, () => {
    chrome.tabs.create({ url: `${WEB_APP_URL}/room.html?room=${encodeURIComponent(normalized)}` });
    setStatus(`Abrindo sala ${normalized}...`);
  });
}

createRoom.addEventListener('click', () => openRoom(generateRoomCode()));
joinRoom.addEventListener('click', () => openRoom(roomCode.value));
roomCode.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') openRoom(roomCode.value);
});
roomCode.addEventListener('input', () => {
  roomCode.value = roomCode.value.toUpperCase().replace(/[^A-Z2-9-]/g, '').slice(0, 7);
});
