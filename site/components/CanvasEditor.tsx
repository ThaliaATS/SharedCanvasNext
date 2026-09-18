'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Stage, Layer, Rect, Circle, Line, Transformer } from 'react-konva';
import type Konva from 'konva';
import {
  MousePointer2,
  Square,
  Circle as CircleIcon,
  Pencil,
  Trash2,
} from 'lucide-react';
import { NetworkSession } from '@/lib/network';
import {
  getStoredName,
  getStoredUserId,
  getRandomColor,
  generateUserId,
  setStoredUserId,
} from '@/lib/utils';
import type {
  CanvasObject,
  User,
  Message,
  CursorMovePayload,
  ObjectPayload,
  SyncResponsePayload,
} from '@/lib/types';
import styles from '@/app/canvas/[roomId]/page.module.css';

type Tool = 'select' | 'rect' | 'circle' | 'draw' | 'delete';

interface RemoteCursor {
  userId: string;
  userName: string;
  userColor: string;
  x: number;
  y: number;
  lastSeen: number;
}

interface CanvasEditorProps {
  roomId: string;
  isHost: boolean;
  onSessionDestroyed: () => void;
  onReady: (name: string, userId: string, userColor: string) => void;
  initialName?: string;
}

export default function CanvasEditor({
  roomId,
  isHost,
  onSessionDestroyed,
  onReady,
  initialName,
}: CanvasEditorProps) {
  const [name, setName] = useState<string>(initialName || '');
  const [userColor, setUserColor] = useState<string>('#3b82f6');
  const [userId, setUserId] = useState<string>('');
  const [ready, setReady] = useState(false);

  const [tool, setTool] = useState<Tool>('select');
  const [currentColor, setCurrentColor] = useState('#3b82f6');
  const [objects, setObjects] = useState<CanvasObject[]>([]);
  const [users, setUsers] = useState<Map<string, User>>(new Map());
  const [remoteCursors, setRemoteCursors] = useState<Map<string, RemoteCursor>>(
    new Map(),
  );
  const [stageSize, setStageSize] = useState({ width: 1200, height: 800 });
  const lastCursorBroadcastRef = useRef<number>(0);

  const stageRef = useRef<Konva.Stage>(null);
  const sessionRef = useRef<NetworkSession | null>(null);
  const isDrawingRef = useRef(false);
  const drawingLineRef = useRef<CanvasObject | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const drawingShapeRef = useRef<CanvasObject | null>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const selectedRef = useRef<Konva.Node | null>(null);

  const colors = [
    '#3b82f6',
    '#06b6d4',
    '#22c55e',
    '#eab308',
    '#f97316',
    '#ef4444',
    '#ec4899',
    '#8b5cf6',
  ];

  useEffect(() => {
    const updateSize = () => {
      setStageSize({ width: window.innerWidth, height: window.innerHeight });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    let storedUserId = getStoredUserId();
    if (!storedUserId) {
      storedUserId = generateUserId();
      setStoredUserId(storedUserId);
    }
    setUserId(storedUserId);
    setUserColor(getRandomColor());
    if (initialName) {
      setName(initialName);
      setReady(true);
      onReady(initialName, storedUserId, getRandomColor());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialName, onReady]);

  useEffect(() => {
    if (!ready || !name || !userId) return;

    const session = new NetworkSession(
      roomId,
      userId,
      name,
      userColor,
      isHost,
    );
    sessionRef.current = session;

    const unsubscribe = session.onMessage((msg: Message) => {
      handleMessage(msg);
    });

    session.connect();

    return () => {
      unsubscribe();
      session.disconnect();
      sessionRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, roomId, isHost]);

  const handleMessage = useCallback((msg: Message) => {
    if (msg.type === 'session-destroyed') {
      onSessionDestroyed();
      return;
    }

    if (msg.userId === sessionRef.current?.userId && msg.type !== 'sync-response') return;

    switch (msg.type) {
      case 'cursor-move': {
        const payload = msg.payload as CursorMovePayload;
        setRemoteCursors((prev) => {
          const next = new Map(prev);
          next.set(msg.userId, {
            userId: msg.userId,
            userName: msg.userName,
            userColor: msg.userColor,
            x: payload.x,
            y: payload.y,
            lastSeen: Date.now(),
          });
          return next;
        });
        break;
      }
      case 'user-join': {
        setUsers((prev) => {
          const next = new Map(prev);
          next.set(msg.userId, {
            id: msg.userId,
            name: msg.userName,
            color: msg.userColor,
            joinedAt: msg.timestamp,
            cursor: {
              x: 0,
              y: 0,
              color: msg.userColor,
              name: msg.userName,
            },
          });
          return next;
        });
        break;
      }
      case 'user-leave': {
        setUsers((prev) => {
          const next = new Map(prev);
          next.delete(msg.userId);
          return next;
        });
        setRemoteCursors((prev) => {
          const next = new Map(prev);
          next.delete(msg.userId);
          return next;
        });
        break;
      }
      case 'object-add': {
        const payload = msg.payload as ObjectPayload;
        setObjects((prev) => {
          if (prev.some((o) => o.id === payload.object.id)) return prev;
          return [...prev, payload.object];
        });
        break;
      }
      case 'object-update': {
        const payload = msg.payload as ObjectPayload;
        setObjects((prev) =>
          prev.map((o) => (o.id === payload.object.id ? payload.object : o)),
        );
        break;
      }
      case 'object-delete': {
        const payload = msg.payload as { id: string };
        setObjects((prev) => prev.filter((o) => o.id !== payload.id));
        break;
      }
      case 'sync-response': {
        const payload = msg.payload as SyncResponsePayload;
        setObjects(payload.objects || []);
        setUsers((prev) => {
          const next = new Map(prev);
          (payload.users || []).forEach((u) => {
            if (u.id !== sessionRef.current?.userId) {
              next.set(u.id, u);
            }
          });
          return next;
        });
        break;
      }
    }
  }, [onSessionDestroyed]);

  const objectsRef = useRef(objects);
  objectsRef.current = objects;
  const usersRef = useRef(users);
  usersRef.current = users;

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setRemoteCursors((prev) => {
        const next = new Map(prev);
        for (const [key, cursor] of next) {
          if (now - cursor.lastSeen > 5000) {
            next.delete(key);
          }
        }
        if (next.size === prev.size) return prev;
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const broadcastCursor = useCallback(
    (x: number, y: number) => {
      const now = Date.now();
      if (now - lastCursorBroadcastRef.current < 30) return;
      lastCursorBroadcastRef.current = now;
      sessionRef.current?.broadcast({
        type: 'cursor-move',
        userId: sessionRef.current.userId,
        userName: sessionRef.current.userName,
        userColor: sessionRef.current.userColor,
        roomId: sessionRef.current.roomId,
        timestamp: Date.now(),
        payload: { x, y } as CursorMovePayload,
      });
    },
    [],
  );

  const broadcastObjectAdd = useCallback((obj: CanvasObject) => {
    sessionRef.current?.broadcast({
      type: 'object-add',
      userId: sessionRef.current.userId,
      userName: sessionRef.current.userName,
      userColor: sessionRef.current.userColor,
      roomId: sessionRef.current.roomId,
      timestamp: Date.now(),
      payload: { object: obj } as ObjectPayload,
    });
  }, []);

  const broadcastObjectUpdate = useCallback((obj: CanvasObject) => {
    sessionRef.current?.broadcast({
      type: 'object-update',
      userId: sessionRef.current.userId,
      userName: sessionRef.current.userName,
      userColor: sessionRef.current.userColor,
      roomId: sessionRef.current.roomId,
      timestamp: Date.now(),
      payload: { object: obj } as ObjectPayload,
    });
  }, []);

  const broadcastObjectDelete = useCallback((id: string) => {
    sessionRef.current?.broadcast({
      type: 'object-delete',
      userId: sessionRef.current.userId,
      userName: sessionRef.current.userName,
      userColor: sessionRef.current.userColor,
      roomId: sessionRef.current.roomId,
      timestamp: Date.now(),
      payload: { id },
    });
  }, []);

  const genId = () => `o-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const handleStageMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    broadcastCursor(pointer.x, pointer.y);

    if (tool === 'draw' && isDrawingRef.current && drawingLineRef.current) {
      const line = drawingLineRef.current;
      const newPoints = [...(line.points || []), pointer.x, pointer.y];
      const updated = { ...line, points: newPoints };
      drawingLineRef.current = updated;
      setObjects((prev) =>
        prev.map((o) => (o.id === line.id ? updated : o)),
      );
    } else if (
      (tool === 'rect' || tool === 'circle') &&
      isDrawingRef.current &&
      drawingShapeRef.current &&
      dragStartRef.current
    ) {
      const shape = drawingShapeRef.current;
      const start = dragStartRef.current;
      if (tool === 'rect') {
        const updated: CanvasObject = {
          ...shape,
          x: Math.min(start.x, pointer.x),
          y: Math.min(start.y, pointer.y),
          width: Math.abs(pointer.x - start.x),
          height: Math.abs(pointer.y - start.y),
        };
        drawingShapeRef.current = updated;
        setObjects((prev) =>
          prev.map((o) => (o.id === shape.id ? updated : o)),
        );
      } else if (tool === 'circle') {
        const dx = pointer.x - start.x;
        const dy = pointer.y - start.y;
        const updated: CanvasObject = {
          ...shape,
          radius: Math.sqrt(dx * dx + dy * dy),
        };
        drawingShapeRef.current = updated;
        setObjects((prev) =>
          prev.map((o) => (o.id === shape.id ? updated : o)),
        );
      }
    }
  };

  const handleStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    if (tool === 'select') {
      const clickedOnEmpty = e.target === stage;
      if (clickedOnEmpty) {
        selectedRef.current = null;
        if (trRef.current) trRef.current.nodes([]);
      }
      return;
    }

    if (tool === 'delete') {
      return;
    }

    if (tool === 'draw') {
      isDrawingRef.current = true;
      const line: CanvasObject = {
        id: genId(),
        type: 'line',
        x: 0,
        y: 0,
        points: [pointer.x, pointer.y],
        stroke: currentColor,
        strokeWidth: 3,
        createdBy: userId,
        createdAt: Date.now(),
      };
      drawingLineRef.current = line;
      setObjects((prev) => [...prev, line]);
      return;
    }

    if (tool === 'rect') {
      isDrawingRef.current = true;
      dragStartRef.current = { x: pointer.x, y: pointer.y };
      const rect: CanvasObject = {
        id: genId(),
        type: 'rect',
        x: pointer.x,
        y: pointer.y,
        width: 0,
        height: 0,
        fill: currentColor,
        stroke: currentColor,
        strokeWidth: 0,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        createdBy: userId,
        createdAt: Date.now(),
      };
      drawingShapeRef.current = rect;
      setObjects((prev) => [...prev, rect]);
      return;
    }

    if (tool === 'circle') {
      isDrawingRef.current = true;
      dragStartRef.current = { x: pointer.x, y: pointer.y };
      const circle: CanvasObject = {
        id: genId(),
        type: 'circle',
        x: pointer.x,
        y: pointer.y,
        radius: 0,
        fill: currentColor,
        stroke: currentColor,
        strokeWidth: 0,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        createdBy: userId,
        createdAt: Date.now(),
      };
      drawingShapeRef.current = circle;
      setObjects((prev) => [...prev, circle]);
      return;
    }
  };

  const handleStageMouseUp = () => {
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      if (drawingLineRef.current) {
        broadcastObjectAdd(drawingLineRef.current);
        drawingLineRef.current = null;
      }
      if (drawingShapeRef.current) {
        const s = drawingShapeRef.current;
        if (
          (s.type === 'rect' && (s.width ?? 0) > 2 && (s.height ?? 0) > 2) ||
          (s.type === 'circle' && (s.radius ?? 0) > 2)
        ) {
          broadcastObjectAdd(s);
        } else {
          setObjects((prev) => prev.filter((o) => o.id !== s.id));
        }
        drawingShapeRef.current = null;
      }
      dragStartRef.current = null;
    }
  };

  const handleShapeDragEnd = (obj: CanvasObject, e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const updated: CanvasObject = {
      ...obj,
      x: node.x(),
      y: node.y(),
      rotation: node.rotation(),
      scaleX: node.scaleX(),
      scaleY: node.scaleY(),
    };
    setObjects((prev) => prev.map((o) => (o.id === obj.id ? updated : o)));
    broadcastObjectUpdate(updated);
  };

  const handleShapeTransformEnd = (obj: CanvasObject, e: Konva.KonvaEventObject<Event>) => {
    const node = e.target;
    const updated: CanvasObject = {
      ...obj,
      x: node.x(),
      y: node.y(),
      rotation: node.rotation(),
      scaleX: node.scaleX(),
      scaleY: node.scaleY(),
    };
    setObjects((prev) => prev.map((o) => (o.id === obj.id ? updated : o)));
    broadcastObjectUpdate(updated);
  };

  const handleShapeClick = (obj: CanvasObject, e: Konva.KonvaEventObject<MouseEvent>) => {
    if (tool === 'delete') {
      setObjects((prev) => prev.filter((o) => o.id !== obj.id));
      broadcastObjectDelete(obj.id);
      return;
    }
    if (tool === 'select') {
      e.cancelBubble = true;
      selectedRef.current = e.target;
      if (trRef.current) {
        trRef.current.nodes([e.target]);
        trRef.current.getLayer()?.batchDraw();
      }
    }
  };

  const currentUserCount = users.size + (ready ? 1 : 0);

  if (!ready) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.canvasWrap}>
        <div className={styles.topBar}>
          <a href="/" className={styles.homeLink}>
            Início
          </a>
          <div className={styles.roomInfo}>
            <span>Sala:</span>
            <span className={styles.roomCode}>{roomId}</span>
            <span className={styles.separator}>·</span>
            <span>{currentUserCount} online</span>
            {isHost && <span className={styles.hostBadge}>HOST</span>}
          </div>
        </div>

        <div className={styles.usersPanel}>
          {Array.from(users.values())
            .filter((u) => u.id !== userId)
            .map((u) => (
              <div key={u.id} className={styles.userChip}>
                <span
                  className={styles.userDot}
                  style={{ backgroundColor: u.color }}
                />
                {u.name}
              </div>
            ))}
        </div>

        <div className={styles.canvasContainer}>
          {objects.length === 0 && (
            <div className={styles.emptyState}>
              <div className={styles.emptyTitle}>Canvas vazio</div>
              <div className={styles.emptyHint}>
                Escolha uma ferramenta abaixo e comece a desenhar
              </div>
            </div>
          )}
          <Stage
            ref={stageRef}
            width={stageSize.width}
            height={stageSize.height}
            onMouseMove={handleStageMouseMove}
            onMouseDown={handleStageMouseDown}
            onMouseUp={handleStageMouseUp}
            onMouseLeave={handleStageMouseUp}
            style={{
              cursor:
                tool === 'select'
                  ? 'default'
                  : tool === 'delete'
                    ? 'not-allowed'
                    : 'crosshair',
            }}
          >
            <Layer>
              {objects.map((obj) => {
                if (obj.type === 'rect') {
                  return (
                    <Rect
                      key={obj.id}
                      id={obj.id}
                      x={obj.x}
                      y={obj.y}
                      width={obj.width}
                      height={obj.height}
                      fill={obj.fill}
                      rotation={obj.rotation || 0}
                      scaleX={obj.scaleX || 1}
                      scaleY={obj.scaleY || 1}
                      draggable={tool === 'select'}
                      onClick={(e) => handleShapeClick(obj, e)}
                      onTap={(e) => handleShapeClick(obj, e as unknown as Konva.KonvaEventObject<MouseEvent>)}
                      onDragEnd={(e) => handleShapeDragEnd(obj, e)}
                      onTransformEnd={(e) => handleShapeTransformEnd(obj, e)}
                    />
                  );
                }
                if (obj.type === 'circle') {
                  return (
                    <Circle
                      key={obj.id}
                      id={obj.id}
                      x={obj.x}
                      y={obj.y}
                      radius={obj.radius || 0}
                      fill={obj.fill}
                      rotation={obj.rotation || 0}
                      scaleX={obj.scaleX || 1}
                      scaleY={obj.scaleY || 1}
                      draggable={tool === 'select'}
                      onClick={(e) => handleShapeClick(obj, e)}
                      onTap={(e) => handleShapeClick(obj, e as unknown as Konva.KonvaEventObject<MouseEvent>)}
                      onDragEnd={(e) => handleShapeDragEnd(obj, e)}
                      onTransformEnd={(e) => handleShapeTransformEnd(obj, e)}
                    />
                  );
                }
                if (obj.type === 'line') {
                  return (
                    <Line
                      key={obj.id}
                      id={obj.id}
                      points={obj.points}
                      stroke={obj.stroke}
                      strokeWidth={obj.strokeWidth || 3}
                      tension={0.4}
                      lineCap="round"
                      lineJoin="round"
                      globalCompositeOperation="source-over"
                    />
                  );
                }
                return null;
              })}
              {tool === 'select' && (
                <Transformer
                  ref={trRef}
                  rotateEnabled={true}
                  borderStroke="#3b82f6"
                  anchorStroke="#3b82f6"
                  anchorFill="#ffffff"
                  anchorSize={8}
                />
              )}
            </Layer>
          </Stage>
        </div>

        <div className={styles.cursorLayer}>
          {Array.from(remoteCursors.values()).map((cursor) => (
            <div
              key={cursor.userId}
              className={styles.remoteCursor}
              style={{
                transform: `translate(${cursor.x - 2}px, ${cursor.y - 2}px)`,
              }}
            >
              <svg
                className={styles.cursorSvg}
                width="20"
                height="22"
                viewBox="0 0 20 22"
                fill="none"
              >
                <path
                  d="M2 1L18 11.5L9.5 12.5L6 21L2 1Z"
                  fill={cursor.userColor}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
              <div
                className={styles.cursorLabel}
                style={{ background: cursor.userColor }}
              >
                {cursor.userName}
              </div>
            </div>
          ))}
        </div>

        <div className={styles.toolbar}>
          <button
            className={`${styles.tool} ${tool === 'select' ? styles.toolActive : ''}`}
            onClick={() => setTool('select')}
            title="Selecionar (V)"
          >
            <MousePointer2 size={18} strokeWidth={2} />
          </button>
          <button
            className={`${styles.tool} ${tool === 'rect' ? styles.toolActive : ''}`}
            onClick={() => setTool('rect')}
            title="Retângulo (R)"
          >
            <Square size={18} strokeWidth={2} />
          </button>
          <button
            className={`${styles.tool} ${tool === 'circle' ? styles.toolActive : ''}`}
            onClick={() => setTool('circle')}
            title="Círculo (C)"
          >
            <CircleIcon size={18} strokeWidth={2} />
          </button>
          <button
            className={`${styles.tool} ${tool === 'draw' ? styles.toolActive : ''}`}
            onClick={() => setTool('draw')}
            title="Lápis (P)"
          >
            <Pencil size={18} strokeWidth={2} />
          </button>
          <button
            className={`${styles.tool} ${tool === 'delete' ? styles.toolActive : ''}`}
            onClick={() => setTool('delete')}
            title="Excluir (X)"
          >
            <Trash2 size={18} strokeWidth={2} />
          </button>

          <div className={styles.toolSep} />

          {colors.map((c) => (
            <button
              key={c}
              className={`${styles.colorSwatch} ${currentColor === c ? styles.colorSelected : ''}`}
              onClick={() => setCurrentColor(c)}
              title={c}
            >
              <div className={styles.colorInner} style={{ background: c }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}