const params = new URLSearchParams(window.location.search);
const code = (params.get('room') || '').toUpperCase();
const name = (params.get('name') || `Convidado-${Math.floor(Math.random() * 1000)}`).slice(0, 32);
const SIGNALING_URL = window.SCREENPARTY_SIGNALING_URL || 'ws://localhost:8787';

const roomCode = document.querySelector('#roomCode');
const memberCount = document.querySelector('#memberCount');
const participantsEl = document.querySelector('#participants');
const shareScreen = document.querySelector('#shareScreen');
const leaveRoom = document.querySelector('#leaveRoom');
const stage = document.querySelector('#stage');
const emptyState = document.querySelector('#emptyState');

if (!code) {
  window.location.href = 'index.html';
  throw new Error('Código de sala ausente');
}

roomCode.textContent = code;
const socket = new WebSocket(SIGNALING_URL);
const peers = new Map();
const participants = new Map();
let selfId = null;
let screenStream = null;

const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' }
  ]
};

function send(payload) {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(payload));
}

function renderParticipants() {
  participantsEl.innerHTML = '';
  for (const participant of participants.values()) {
    const item = document.createElement('div');
    item.className = 'participant';
    item.textContent = `${participant.id === selfId ? '🟢' : '👤'} ${participant.name}`;
    participantsEl.appendChild(item);
  }
  memberCount.textContent = String(participants.size);
}

function addVideo(stream, participant) {
  let video = document.querySelector(`[data-peer="${participant.id}"]`);
  if (!video) {
    video = document.createElement('video');
    video.autoplay = true;
    video.playsInline = true;
    video.dataset.peer = participant.id;
    video.title = participant.name;
    video.className = 'remote-video';
    stage.appendChild(video);
  }
  video.srcObject = stream;
  emptyState?.remove();
}

function removeVideo(id) {
  document.querySelector(`[data-peer="${id}"]`)?.remove();
  if (!stage.querySelector('video')) {
    const placeholder = document.createElement('div');
    placeholder.id = 'emptyState';
    placeholder.className = 'placeholder';
    placeholder.innerHTML = '<div class="screen-icon">▣</div><h1>Nenhuma tela sendo compartilhada</h1><p>Quando alguém iniciar uma transmissão, ela aparecerá aqui.</p>';
    stage.appendChild(placeholder);
  }
}

async function createPeer(participant, initiator) {
  if (peers.has(participant.id)) return peers.get(participant.id);

  const pc = new RTCPeerConnection(rtcConfig);
  peers.set(participant.id, pc);

  if (screenStream) {
    for (const track of screenStream.getTracks()) pc.addTrack(track, screenStream);
  } else {
    pc.addTransceiver('video', { direction: 'recvonly' });
  }

  pc.onicecandidate = ({ candidate }) => {
    if (candidate) send({ type: 'ice-candidate', target: participant.id, candidate });
  };

  pc.ontrack = ({ streams }) => {
    if (streams[0]) addVideo(streams[0], participant);
  };

  pc.onconnectionstatechange = () => {
    if (['failed', 'closed'].includes(pc.connectionState)) {
      pc.close();
      peers.delete(participant.id);
      removeVideo(participant.id);
    }
  };

  if (initiator) {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    send({ type: 'offer', target: participant.id, offer: pc.localDescription });
  }
  return pc;
}

async function negotiateWith(id) {
  const pc = peers.get(id);
  if (!pc) return;
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  send({ type: 'offer', target: id, offer: pc.localDescription });
}

async function startSharing() {
  try {
    screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    shareScreen.textContent = '🛑 Parar compartilhamento';

    for (const [id, participant] of participants) {
      if (id === selfId) continue;
      const pc = peers.get(id) || await createPeer(participant, false);
      const videoTrack = screenStream.getVideoTracks()[0];
      const videoSender = pc.getSenders().find(sender => sender.track?.kind === 'video');
      if (videoSender) {
        await videoSender.replaceTrack(videoTrack);
      } else {
        pc.addTrack(videoTrack, screenStream);
      }
      const audioTrack = screenStream.getAudioTracks()[0];
      if (audioTrack && !pc.getSenders().some(sender => sender.track?.kind === 'audio')) {
        pc.addTrack(audioTrack, screenStream);
      }
      await negotiateWith(id);
    }

    screenStream.getVideoTracks()[0]?.addEventListener('ended', stopSharing, { once: true });
  } catch (error) {
    if (error.name !== 'NotAllowedError') console.error('Falha ao capturar tela:', error);
  }
}

async function stopSharing() {
  if (!screenStream) return;
  screenStream.getTracks().forEach(track => track.stop());
  screenStream = null;
  shareScreen.textContent = '🖥️ Compartilhar minha tela';
  for (const [id, pc] of peers) {
    if (id === selfId) continue;
    for (const sender of pc.getSenders()) {
      if (sender.track) await sender.replaceTrack(null);
    }
    await negotiateWith(id);
  }
}

socket.addEventListener('open', () => send({ type: 'join', room: code, name }));

socket.addEventListener('message', async ({ data }) => {
  const message = JSON.parse(data);

  if (message.type === 'joined') {
    selfId = message.selfId;
    participants.clear();
    message.participants.forEach(p => participants.set(p.id, p));
    renderParticipants();
    for (const participant of message.participants) {
      if (participant.id !== selfId) await createPeer(participant, false);
    }
    return;
  }

  if (message.type === 'participant-joined') {
    participants.set(message.participant.id, message.participant);
    renderParticipants();
    await createPeer(message.participant, true);
    return;
  }

  if (message.type === 'participant-left') {
    const id = message.participantId;
    participants.delete(id);
    peers.get(id)?.close();
    peers.delete(id);
    removeVideo(id);
    renderParticipants();
    return;
  }

  if (message.type === 'offer') {
    const participant = participants.get(message.sender) || { id: message.sender, name: 'Participante' };
    const pc = peers.get(message.sender) || await createPeer(participant, false);
    await pc.setRemoteDescription(message.offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    send({ type: 'answer', target: message.sender, answer: pc.localDescription });
    return;
  }

  if (message.type === 'answer') {
    const pc = peers.get(message.sender);
    if (pc) await pc.setRemoteDescription(message.answer);
    return;
  }

  if (message.type === 'ice-candidate') {
    const pc = peers.get(message.sender);
    if (pc && message.candidate) await pc.addIceCandidate(message.candidate).catch(console.error);
  }

  if (message.type === 'error') console.error(message.message);
});

socket.addEventListener('close', () => {
  shareScreen.disabled = true;
  shareScreen.textContent = 'Servidor desconectado';
});

shareScreen.addEventListener('click', () => screenStream ? stopSharing() : startSharing());

leaveRoom.addEventListener('click', () => {
  stopSharing();
  socket.close();
  window.location.href = 'index.html';
});

window.addEventListener('beforeunload', () => socket.close());
