'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, LogIn } from 'lucide-react';
import {
  generateRoomId,
  generateUserId,
  getStoredName,
  setStoredName,
  setStoredUserId,
  getStoredUserId,
} from '@/lib/utils';
import styles from './page.module.css';
import NameModal from '@/components/NameModal';

export default function HomePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [showNameModal, setShowNameModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    'create' | { action: 'join'; code: string } | null
  >(null);

  useEffect(() => {
    const storedName = getStoredName();
    if (storedName) {
      setName(storedName);
    }
    if (!getStoredUserId()) {
      setStoredUserId(generateUserId());
    }
  }, []);

  const ensureName = (): boolean => {
    if (!name.trim()) {
      setShowNameModal(true);
      return false;
    }
    return true;
  };

  const handleCreate = () => {
    if (!ensureName()) {
      setPendingAction('create');
      return;
    }
    setStoredName(name.trim());
    const roomId = generateRoomId();
    router.push(`/canvas/${roomId}?host=true`);
  };

  const handleJoin = () => {
    if (!joinCode.trim()) return;
    if (!ensureName()) {
      setPendingAction({ action: 'join', code: joinCode.trim() });
      return;
    }
    setStoredName(name.trim());
    router.push(`/canvas/${joinCode.trim()}`);
  };

  const handleNameConfirm = (newName: string) => {
    setName(newName);
    setStoredName(newName);
    setShowNameModal(false);
    if (pendingAction === 'create') {
      const roomId = generateRoomId();
      router.push(`/canvas/${roomId}?host=true`);
    } else if (pendingAction && typeof pendingAction === 'object') {
      router.push(`/canvas/${pendingAction.code}`);
    }
    setPendingAction(null);
  };

  return (
    <div className={styles.container}>
      <div className={styles.brand}>
        <div className={styles.logo}>
          <span className={styles.logoMark} />
          <span>Shared Canvas</span>
        </div>
        <h1 className={styles.title}>Edite junto, em tempo real.</h1>
        <p className={styles.subtitle}>
          Um canvas compartilhado P2P. Compartilhe o link ou o código
          com seus amigos e vejam os ponteiros e desenhos uns dos outros
          instantaneamente, sem servidor central.
        </p>
      </div>

      <div className={styles.card}>
        <div>
          <label className={styles.label} htmlFor="name">
            Seu nome
          </label>
          <input
            id="name"
            type="text"
            className={styles.input}
            placeholder="Como você quer aparecer?"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={30}
          />
        </div>

        <div style={{ marginTop: 20 }}>
          <button
            className={styles.primaryButton}
            onClick={handleCreate}
            disabled={!name.trim()}
          >
            <Plus size={18} strokeWidth={2.5} />
            Iniciar uma sessão
          </button>
        </div>

        <div className={styles.divider}>ou</div>

        <div>
          <label className={styles.label} htmlFor="joinCode">
            Código da sala
          </label>
          <input
            id="joinCode"
            type="text"
            className={styles.input}
            placeholder="Cole o código da sala aqui"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
          />
        </div>

        <div style={{ marginTop: 14 }}>
          <button
            className={styles.secondaryButton}
            onClick={handleJoin}
            disabled={!name.trim() || !joinCode.trim()}
          >
            <LogIn size={18} strokeWidth={2.5} />
            Entrar na sessão
          </button>
        </div>
      </div>

      <p className={styles.footer}>
        Funciona 100% no seu navegador via WebRTC P2P. <strong>Sem servidor, sem banco de dados.</strong>
        <br />
        Se todos saírem, a sessão se perde em 100ms e tudo é apagado.
      </p>

      {showNameModal && (
        <NameModal
          initialValue={name}
          onConfirm={handleNameConfirm}
          onCancel={() => {
            setShowNameModal(false);
            setPendingAction(null);
          }}
        />
      )}
    </div>
  );
}