const createRoom = document.querySelector('#createRoom');
const joinRoom = document.querySelector('#joinRoom');
const roomCode = document.querySelector('#roomCode');
const status = document.querySelector('#status');

function generateRoomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part = (length) => Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
  return `${part(3)}-${part(3)}`;
}

function setStatus(message) {
  status.textContent = message;
}

createRoom.addEventListener('click', () => {
  const code = generateRoomCode();
  chrome.storage.local.set({ lastRoomCode: code }, () => {
    setStatus(`Sala ${code} criada. Backend será conectado na próxima etapa.`);
  });
});

joinRoom.addEventListener('click', () => {
  const code = roomCode.value.trim().toUpperCase();
  if (!/^[A-Z2-9]{3}-[A-Z2-9]{3}$/.test(code)) {
    setStatus('Digite um código no formato ABC-123.');
    return;
  }

  chrome.storage.local.set({ lastRoomCode: code }, () => {
    setStatus(`Entrando na sala ${code}...`);
  });
});
