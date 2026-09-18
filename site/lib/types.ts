export interface CanvasObject {
  id: string;
  type: 'rect' | 'circle' | 'line' | 'text';
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  text?: string;
  fontSize?: number;
  points?: number[];
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  createdBy: string;
  createdAt: number;
}

export interface CursorPosition {
  x: number;
  y: number;
  color: string;
  name: string;
}

export interface User {
  id: string;
  name: string;
  color: string;
  joinedAt: number;
  cursor: CursorPosition;
}

export type MessageType =
  | 'user-join'
  | 'user-leave'
  | 'user-update'
  | 'cursor-move'
  | 'object-add'
  | 'object-update'
  | 'object-delete'
  | 'sync-request'
  | 'sync-response'
  | 'heartbeat'
  | 'session-destroyed';

export interface Message {
  type: MessageType;
  userId: string;
  userName: string;
  userColor: string;
  roomId: string;
  timestamp: number;
  payload?: unknown;
}

export interface CursorMovePayload {
  x: number;
  y: number;
}

export interface ObjectPayload {
  object: CanvasObject;
}

export interface SyncResponsePayload {
  objects: CanvasObject[];
  users: User[];
}
