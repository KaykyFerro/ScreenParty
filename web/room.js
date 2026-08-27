const params = new URLSearchParams(window.location.search);
const code = params.get('room') || 'DEMO-01';
const roomCode = document.querySelector('#roomCode');
const memberCount = document.querySelector('#memberCount');
const participants = document.querySelector('#participants');
const shareScreen = document.querySelector('#shareScreen');
const leaveRoom = document.querySelector('#leaveRoom');

roomCode.textContent = code.toUpperCase();

const demoParticipants = ['Você'];
function renderParticipants() {
  participants.innerHTML = '';
  for (const name of demoParticipants) {
    const item = document.createElement('div');
    item.className = 'participant';
    item.textContent = `👤 ${name}`;
    participants.appendChild(item);
  }
  memberCount.textContent = String(demoParticipants.length);
}

renderParticipants();

shareScreen.addEventListener('click', async () => {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    // WebRTC transport will be connected here in the next implementation stage.
    const [track] = stream.getVideoTracks();
    if (track) {
      track.addEventListener('ended', () => {
        shareScreen.textContent = '🖥️ Compartilhar minha tela';
      }, { once: true });
    }
    shareScreen.textContent = '🛑 Compartilhamento iniciado';
  } catch (error) {
    if (error.name !== 'NotAllowedError') {
      console.error('Falha ao capturar tela:', error);
    }
  }
});

leaveRoom.addEventListener('click', () => {
  window.location.href = 'index.html';
});
