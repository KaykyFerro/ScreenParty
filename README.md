# 🖥️ ScreenParty

> Salas rápidas para compartilhar tela e assistir em grupo.

O **ScreenParty** é uma extensão para Google Chrome + aplicação web de salas multiplayer. A proposta é permitir que pessoas criem uma sala, compartilhem um link/código e entrem ou saiam livremente enquanto uma ou mais telas são transmitidas em tempo real.

## ✨ Status

**MVP em desenvolvimento.** A base de salas, participantes, sinalização WebSocket e transporte WebRTC já está no projeto. O servidor também pode servir a aplicação web, facilitando o deploy em uma única aplicação Node.js.

### Já implementado

- [x] Extensão Chrome Manifest V3
- [x] Criação de código de sala
- [x] Entrada por código
- [x] Lista de participantes em tempo real
- [x] Entrada e saída de participantes
- [x] Servidor WebSocket para sinalização
- [x] WebRTC ponto a ponto
- [x] Captura de tela com `getDisplayMedia()`
- [x] STUN para descoberta de candidatos ICE
- [x] Endpoint `/health`
- [x] Aplicação web preparada para HTTPS/WSS
- [x] Dockerfile para deploy
- [x] Blueprint de deploy para Render

### Próximos recursos

- [ ] Nome/apelido antes de entrar
- [ ] Copiar link da sala
- [ ] Chat
- [ ] Microfone
- [ ] Câmera
- [ ] Controle de host
- [ ] Permitir/tirar permissão de compartilhamento
- [ ] Múltiplas telas simultâneas com layout em grade
- [ ] TURN server para redes onde conexão P2P direta falhar
- [ ] Autenticação opcional
- [ ] Limite e expiração de salas
- [ ] Página pública de landing
- [ ] Publicação na Chrome Web Store

## 🧱 Arquitetura

```text
ScreenParty/
├── extension/          # Extensão Chrome
│   ├── manifest.json
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
│
├── web/                # Aplicação web
│   ├── index.html
│   ├── room.html
│   ├── room.js
│   └── style.css
│
├── server/             # Node.js + Express + WebSocket
│   ├── package.json
│   └── server.js
│
├── Dockerfile          # Imagem de produção
├── render.yaml         # Configuração de deploy no Render
└── README.md
```

## 🔌 Como funciona

```text
                    ┌─────────────────────┐
                    │ ScreenParty Server  │
                    │ Express + WebSocket │
                    └──────────┬──────────┘
                               │
                 sinalização   │   sinalização
                               │
              ┌────────────────┴────────────────┐
              │                                 │
        ┌─────▼─────┐                     ┌─────▼─────┐
        │ Navegador A│◄────── WebRTC ────►│ Navegador B│
        │ compartilha│                     │ assiste    │
        └────────────┘                     └────────────┘
```

O servidor **não precisa transportar o vídeo** no fluxo normal. Ele coordena a sinalização inicial e o WebRTC tenta estabelecer a conexão diretamente entre os navegadores.

## 🚀 Rodando localmente

### Requisitos

- Node.js 20+
- Google Chrome ou Chromium

### Servidor

```bash
cd server
npm install
npm start
```

O servidor ficará em:

```text
http://localhost:8787
```

Health check:

```text
http://localhost:8787/health
```

A aplicação web é servida pelo próprio servidor.

### Testar duas pessoas

Abra duas janelas/navegadores em:

```text
http://localhost:8787
```

Crie uma sala em uma janela e use o mesmo código na outra. Depois clique em **Compartilhar minha tela**.

> Para testar a experiência multiplayer, o ideal é usar dois perfis/janelas separados do navegador.

## 🧩 Instalar a extensão no Chrome

1. Abra `chrome://extensions/`.
2. Ative **Modo do desenvolvedor**.
3. Clique em **Carregar sem compactação**.
4. Selecione a pasta `extension/`.
5. Abra a extensão ScreenParty.

A extensão atualmente usa o servidor local como padrão. Depois do deploy, a URL pública do servidor deve ser configurada na extensão.

## 🌍 Deploy

O projeto inclui `Dockerfile` e `render.yaml` para facilitar o deploy em serviços que suportem Node.js/WebSockets.

Depois que o servidor estiver publicado com HTTPS, a aplicação deve usar:

```text
https://seu-dominio.com
wss://seu-dominio.com
```

**Importante:** GitHub armazena o código, mas não mantém um servidor WebSocket permanentemente executando. É necessário publicar o servidor em uma plataforma de hospedagem.

## 🔐 Produção

Antes de abrir o serviço ao público, recomenda-se adicionar:

- autenticação ou tokens de sala;
- rate limiting;
- validação mais rígida das mensagens WebSocket;
- expiração automática de salas;
- TURN server;
- logs e monitoramento;
- política de privacidade;
- proteção contra abuso.

## 🗺️ Roadmap

### Fase 1 · MVP

- Salas
- Participantes
- WebSocket
- WebRTC
- Compartilhamento de tela

### Fase 2 · Experiência

- Link de convite
- Apelido
- Chat
- Microfone
- Câmera
- Layout de participantes

### Fase 3 · Controle

- Host
- Permissões
- Expulsar participante
- Bloquear sala
- Múltiplos compartilhamentos

### Fase 4 · Produção

- TURN
- Segurança
- Limites
- Observabilidade
- Domínio próprio
- Chrome Web Store

## 📄 Licença

A licença será definida antes da primeira publicação pública.
