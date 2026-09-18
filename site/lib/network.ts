import { Peer, DataConnection } from 'peerjs';
import type { Message, CanvasObject, User } from './types';

export type MessageHandler = (message: Message) => void;
export type SessionStatus = 'connecting' | 'connected' | 'host' | 'disconnected' | 'destroyed';

export class NetworkSession {
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map();
  private handlers: Set<MessageHandler> = new Set();
  private status: SessionStatus = 'connecting';
  private inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly INACTIVITY_TIMEOUT = 100; // 100ms

  public readonly roomId: string;
  public readonly userId: string;
  public readonly userName: string;
  public readonly userColor: string;
  public readonly isHost: boolean;

  private objects: CanvasObject[] = [];
  private users: Map<string, User> = new Map();

  constructor(
    roomId: string,
    userId: string,
    userName: string,
    userColor: string,
    isHost: boolean
  ) {
    this.roomId = roomId;
    this.userId = userId;
    this.userName = userName;
    this.userColor = userColor;
    this.isHost = isHost;
  }

  connect() {
    if (typeof window === 'undefined') return;

    const peerId = this.isHost ? `sc-h-${this.roomId}` : undefined;
    
    this.peer = new Peer(peerId, {
      debug: 0,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    });

    this.peer.on('open', (id) => {
      this.status = this.isHost ? 'host' : 'connected';
      console.log(`[NetworkSession] Conectado como ${this.isHost ? 'HOST' : 'CLIENT'} com ID: ${id}`);
      
      if (!this.isHost) {
        this.connectToHost();
      }
      
      this.resetInactivityTimer();
    });

    this.peer.on('connection', (conn) => {
      if (!this.isHost) {
        conn.close();
        return;
      }
      this.setupConnection(conn);
    });

    this.peer.on('error', (err) => {
      console.error('[NetworkSession] Erro:', err);
      if (err.type === 'unavailable-id' && this.isHost) {
        console.warn('Host já existe. A sala pode já estar em uso por outro criador.');
      }
    });

    this.peer.on('disconnected', () => {
      this.status = 'disconnected';
      this.notifyHandlers({
        type: 'session-destroyed',
        userId: this.userId,
        userName: this.userName,
        userColor: this.userColor,
        roomId: this.roomId,
        timestamp: Date.now(),
      });
    });

    this.peer.on('close', () => {
      this.status = 'destroyed';
    });
  }

  private connectToHost() {
    const hostId = `sc-h-${this.roomId}`;
    const conn = this.peer!.connect(hostId, { reliable: true });
    this.setupConnection(conn);
  }

  private setupConnection(conn: DataConnection) {
    this.connections.set(conn.peer, conn);

    conn.on('open', () => {
      console.log(`[NetworkSession] Conexão aberta com ${conn.peer}`);
      if (this.isHost) {
        conn.send({
          type: 'sync-response',
          userId: this.userId,
          userName: this.userName,
          userColor: this.userColor,
          roomId: this.roomId,
          timestamp: Date.now(),
          payload: {
            objects: this.objects,
            users: Array.from(this.users.values()),
          },
        });
      } else {
        this.sendToHost({
          type: 'user-join',
          userId: this.userId,
          userName: this.userName,
          userColor: this.userColor,
          roomId: this.roomId,
          timestamp: Date.now(),
        });
      }
    });

    conn.on('data', (data: any) => {
      this.resetInactivityTimer();
      this.handleMessage(data as Message, conn.peer);
    });

    conn.on('close', () => {
      this.connections.delete(conn.peer);
      if (this.isHost) {
        const user = this.users.get(conn.peer);
        if (user) {
          this.users.delete(conn.peer);
          this.broadcastToAll({
            type: 'user-leave',
            userId: conn.peer,
            userName: user.name,
            userColor: user.color,
            roomId: this.roomId,
            timestamp: Date.now(),
          });
        }
        this.checkInactivity();
      } else {
        this.status = 'disconnected';
        this.notifyHandlers({
          type: 'session-destroyed',
          userId: this.userId,
          userName: this.userName,
          userColor: this.userColor,
          roomId: this.roomId,
          timestamp: Date.now(),
        });
      }
    });

    conn.on('error', (err) => {
      console.error('[NetworkSession] Erro na conexão:', err);
      this.connections.delete(conn.peer);
    });
  }

  private handleMessage(data: Message, senderId: string) {
    if (this.isHost) {
      if (data.type === 'user-join') {
        this.users.set(senderId, {
          id: senderId,
          name: data.userName,
          color: data.userColor,
          joinedAt: data.timestamp,
          cursor: { x: 0, y: 0, color: data.userColor, name: data.userName },
        });
        this.broadcastToAll(data);
      } else if (data.type === 'cursor-move' || data.type === 'object-add' || data.type === 'object-update' || data.type === 'object-delete') {
        this.broadcastToAll(data);
      }
    } else {
      if (data.type === 'sync-response') {
        this.objects = (data.payload as any).objects || [];
        this.users = new Map(((data.payload as any).users || []).map((u: User) => [u.id, u]));
      }
    }
    
    this.notifyHandlers(data);
  }

  private broadcastToAll(message: Message) {
    this.connections.forEach((conn) => {
      if (conn.open) {
        conn.send(message);
      }
    });
  }

  private sendToHost(message: Message) {
    const hostConn = Array.from(this.connections.values())[0];
    if (hostConn && hostConn.open) {
      hostConn.send(message);
    }
  }

  public broadcast(message: Message) {
    this.resetInactivityTimer();
    if (this.isHost) {
      if (message.type === 'object-add') {
        const obj = (message.payload as any).object;
        this.objects = [...this.objects, obj];
      } else if (message.type === 'object-update') {
        const obj = (message.payload as any).object;
        this.objects = this.objects.map(o => o.id === obj.id ? obj : o);
      } else if (message.type === 'object-delete') {
        const id = (message.payload as any).id;
        this.objects = this.objects.filter(o => o.id !== id);
      }
      this.broadcastToAll(message);
    } else {
      this.sendToHost(message);
    }
    this.notifyHandlers(message);
  }

  private resetInactivityTimer() {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }
    this.inactivityTimer = setTimeout(() => {
      this.checkInactivity();
    }, this.INACTIVITY_TIMEOUT);
  }

  private checkInactivity() {
    if (this.isHost && this.connections.size === 0) {
      console.log('[NetworkSession] Sem usuários ativos. Sessão será encerrada.');
      this.disconnect();
    }
  }

  public onMessage(handler: MessageHandler) {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  private notifyHandlers(message: Message) {
    this.handlers.forEach((handler) => handler(message));
  }

  public disconnect() {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }
    
    if (this.isHost) {
      this.broadcastToAll({
        type: 'session-destroyed',
        userId: this.userId,
        userName: this.userName,
        userColor: this.userColor,
        roomId: this.roomId,
        timestamp: Date.now(),
      });
    } else {
      this.sendToHost({
        type: 'user-leave',
        userId: this.userId,
        userName: this.userName,
        userColor: this.userColor,
        roomId: this.roomId,
        timestamp: Date.now(),
      });
    }

    this.connections.forEach((conn) => conn.close());
    this.connections.clear();
    
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.status = 'destroyed';
  }

  public getStatus() {
    return this.status;
  }
}
