# ScreenParty

> Salas simples para compartilhar tela e assistir em grupo.

O ScreenParty é um projeto de extensão para Google Chrome + aplicação web para criação de salas de compartilhamento de tela em tempo real.

## Visão do produto

- Criar uma sala e gerar um código/link de convite.
- Permitir que várias pessoas entrem e saiam da sala.
- Exibir os participantes conectados.
- Permitir que um participante compartilhe sua tela.
- Preparar a arquitetura para áudio, câmera, chat e múltiplas transmissões.

## Arquitetura inicial

```text
extension/   Extensão Chrome
web/         Interface web das salas
server/      Sinalização e gerenciamento de salas
```

## Próximas etapas

1. Criar a interface da extensão.
2. Criar salas com códigos únicos.
3. Implementar entrada e saída de participantes.
4. Implementar compartilhamento de tela com WebRTC.
5. Adicionar permissões de host e recursos sociais.
