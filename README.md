# 🎨 SharedCanvasNext

> **Um canvas colaborativo em tempo real, direto do navegador.**

O **SharedCanvasNext** é um experimento de colaboração em tempo real onde várias pessoas podem entrar na mesma sala e desenhar simultaneamente em um canvas compartilhado.

A ideia é simples:

**crie uma sala → compartilhe o link → desenhe junto.**

O projeto utiliza **WebRTC através do PeerJS** para comunicação entre os navegadores e **React + Konva** para renderização e interação com o canvas.

---

## ✨ Funcionalidades

Atualmente o SharedCanvasNext possui:

* 🖱️ Seleção e movimentação de objetos
* ⬛ Retângulos
* ⚪ Círculos
* ✏️ Desenho livre
* 🎨 Alteração de cores
* 🗑️ Exclusão de objetos
* 👥 Participantes da sala
* 🖱️ Cursores dos participantes em tempo real
* 🔄 Sincronização dos objetos do canvas
* ⚡ Comunicação em tempo real entre navegadores
* 🌐 Comunicação entre computadores através da Internet
* 🏠 Arquitetura baseada em **Host + Clients**
* 🔗 Salas identificadas por `roomId`

---

# 🧠 Como funciona?

O SharedCanvasNext não utiliza um servidor central para transmitir cada movimento do canvas.

A comunicação utiliza **WebRTC**, com o PeerJS fornecendo uma API mais simples para estabelecer conexões entre os navegadores. O PeerJS utiliza um servidor de sinalização para que os peers possam se encontrar; depois que a conexão WebRTC é estabelecida, os dados podem trafegar diretamente entre os navegadores.

A arquitetura atual pode ser representada assim:

```text
                         PeerJS / PeerServer
                          Sinalização
                               │
                               │
                      ┌────────▼────────┐
                      │      HOST       │
                      │                 │
                      │ Estado da sala  │
                      │ Objetos         │
                      │ Usuários        │
                      └───────┬─────────┘
                              │
                     WebRTC DataChannels
                              │
               ┌──────────────┼──────────────┐
               │              │              │
          ┌────▼────┐    ┌────▼────┐    ┌────▼────┐
          │ Client  │    │ Client  │    │ Client  │
          │    A    │    │    B    │    │    C    │
          └─────────┘    └─────────┘    └─────────┘
```

### Host

Cada sala possui um navegador responsável pelo estado principal da sessão.

O Host mantém:

* objetos do canvas;
* usuários conectados;
* associações entre conexões WebRTC e usuários;
* estado atual da sala.

### Clients

Os demais navegadores entram como clientes.

Quando um cliente entra:

1. cria seu próprio Peer;
2. encontra o Host da sala;
3. estabelece uma conexão WebRTC;
4. envia suas informações para o Host;
5. recebe o estado atual do canvas;
6. passa a receber atualizações em tempo real.

O PeerJS disponibiliza `DataConnection` sobre o WebRTC DataChannel, permitindo enviar objetos e outros dados serializáveis entre os navegadores.

---

# 🌐 Funciona entre computadores diferentes?

**Sim.**

O projeto atual não depende de `BroadcastChannel`.

Uma implementação antiga utilizava a API `BroadcastChannel`, que era limitada aos contextos do navegador dentro do mesmo ambiente/origem.

A implementação atual utiliza **PeerJS + WebRTC**, permitindo conexões entre navegadores diferentes e, em muitos casos, entre computadores diferentes através da Internet.

O projeto atualmente utiliza servidores **STUN** para auxiliar na descoberta de caminhos de conexão.

```text
Browser A
    │
    │
    ├──────────────► PeerJS / sinalização
    │
    │
    └══════════════════════════╗
                               ║
                              WebRTC
                               ║
    ┌────────────────────────══╝
    │
Browser B
```

O PeerJS documenta que, após a sinalização, os dados normalmente fluem diretamente entre os navegadores. Em determinados tipos de NAT, entretanto, uma conexão direta pode não ser possível e um servidor TURN pode ser necessário para retransmitir o tráfego.

---

# 🛰️ STUN e TURN

Atualmente o projeto utiliza servidores STUN:

```ts
iceServers: [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' }
]
```

O STUN ajuda o WebRTC a descobrir informações necessárias para tentar estabelecer uma conexão direta.

Porém, **STUN não garante conectividade em todas as redes**.

Alguns ambientes possuem NAT ou firewalls mais restritivos. Nesses casos, um servidor **TURN** pode atuar como relay.

A própria documentação do PeerJS destaca que determinados cenários de NAT podem exigir TURN.

### Estado atual

```text
                    ┌─────────────┐
                    │   STUN      │
                    │             │
                    │ Descoberta  │
                    └──────┬──────┘
                           │
                           ▼
                    Conexão direta?
                       /        \
                     SIM        NÃO
                      │          │
                      ▼          ▼
                   WebRTC      TURN
                   direto      relay
```

Uma das evoluções planejadas do projeto é adicionar um servidor TURN próprio ou um serviço TURN dedicado.

---

# 🧩 Stack

| Tecnologia      | Função                      |
| --------------- | --------------------------- |
| **Next.js**     | Framework da aplicação web  |
| **React**       | Interface e componentes     |
| **TypeScript**  | Tipagem estática            |
| **react-konva** | Integração React + canvas   |
| **Konva**       | Renderização e interação 2D |
| **PeerJS**      | Comunicação P2P/WebRTC      |
| **Lucide**      | Ícones                      |
| **nanoid**      | Geração de identificadores  |

O Next.js fornece a estrutura da aplicação React, incluindo roteamento baseado em arquivos e recursos de desenvolvimento para aplicações web.

O `react-konva` fornece componentes React declarativos para objetos do Konva, permitindo trabalhar com elementos como `Rect`, `Circle`, `Line` e outros objetos gráficos.

---

# 📁 Estrutura do projeto

A aplicação principal está dentro de `site/`.

```text
SharedCanvasNext/
│
├── site/
│   │
│   ├── app/
│   │   └── canvas/
│   │       └── [roomId]/
│   │           └── page.tsx
│   │
│   ├── components/
│   │   └── CanvasEditor.tsx
│   │
│   ├── lib/
│   │   ├── network.ts
│   │   ├── types.ts
│   │   ├── utils.ts
│   │   └── broadcast.ts.bak
│   │
│   ├── public/
│   │
│   ├── package.json
│   └── ...
│
└── README.md
```

---

# 🧱 Principais arquivos

## `site/app/canvas/[roomId]/page.tsx`

Responsável pela página de uma sala.

O `roomId` faz parte da URL:

```text
/canvas/minha-sala
```

A página também determina se o navegador está entrando como Host ou Client.

---

## `site/components/CanvasEditor.tsx`

É o editor visual principal.

É responsável por funcionalidades como:

* renderização do canvas;
* criação de objetos;
* movimentação;
* seleção;
* desenho;
* interação com o mouse;
* atualização dos objetos;
* cursores remotos.

A camada visual utiliza `react-konva`.

---

## `site/lib/network.ts`

É o coração da comunicação em tempo real.

Responsabilidades:

* criação do Peer;
* conexão com o Host;
* gerenciamento das conexões;
* envio de mensagens;
* recebimento de mensagens;
* sincronização do estado;
* entrada e saída de usuários;
* transmissão de cursores;
* sincronização de objetos.

Algumas mensagens utilizadas atualmente:

```text
user-join
user-leave
cursor-move

object-add
object-update
object-delete

sync-response

session-destroyed
```

---

# 🔄 Fluxo de entrada em uma sala

Um fluxo simplificado é:

```text
                    Usuário abre a sala
                            │
                            ▼
                    Cria NetworkSession
                            │
                            ▼
                     Cria PeerJS Peer
                            │
                            ▼
                     Peer está aberto?
                            │
                            ▼
                    ┌───────────────┐
                    │ É o Host?    │
                    └───────┬───────┘
                         SIM│ NÃO
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
        Aguarda clientes            Conecta ao Host
                                          │
                                          ▼
                                   Envia user-join
                                          │
                                          ▼
                                   Host envia estado
                                          │
                                          ▼
                                  Canvas sincronizado
```

---

# 📨 Sincronização

As alterações do canvas são transformadas em mensagens.

Por exemplo:

```text
object-add
```

é utilizado quando um novo objeto é criado.

```text
object-update
```

é utilizado quando um objeto existente é alterado.

```text
object-delete
```

é utilizado quando um objeto é removido.

O Host recebe essas alterações e as distribui para as conexões abertas.

Isso cria o fluxo:

```text
Client
   │
   │ object-update
   ▼
 Host
   │
   ├──────────► Client A
   │
   ├──────────► Client B
   │
   └──────────► Client C
```

---

# 🛠️ Rodando localmente

## 1. Clone o repositório

```bash
git clone https://github.com/ThaliaATS/SharedCanvasNext.git
```

## 2. Entre no projeto

```bash
cd SharedCanvasNext/site
```

## 3. Instale as dependências

```bash
npm install
```

## 4. Inicie o servidor de desenvolvimento

```bash
npm run dev
```

O Next.js utiliza o servidor de desenvolvimento para executar a aplicação localmente.

Depois abra:

```text
http://localhost:3000
```

---

# 🧪 Testando a colaboração

Para testar a comunicação em tempo real:

### Opção 1 — dois navegadores

Abra a aplicação em:

```text
Chrome
Firefox
```

ou em duas janelas diferentes.

### Opção 2 — dois computadores

Execute a aplicação em um ambiente acessível pelos dois computadores ou utilize a versão publicada do projeto.

Depois:

1. abra a mesma sala;
2. entre com usuários diferentes;
3. desenhe em um navegador;
4. observe a alteração no outro.

---

# 🔐 Arquitetura de comunicação

Uma característica importante do projeto é que **o canvas não precisa enviar cada atualização para um**
