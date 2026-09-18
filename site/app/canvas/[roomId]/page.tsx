'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { getStoredName, getStoredUserId, generateUserId, setStoredUserId } from '@/lib/utils';
import NameModal from '@/components/NameModal';
import styles from './page.module.css';

// Importação dinâmica com SSR desativado para evitar erro do Konva no servidor
const CanvasEditor = dynamic(() => import('@/components/CanvasEditor'), {
  ssr: false,
  loading: () => (
    <div className={styles.loadingContainer}>
      <div className={styles.loadingSpinner} />
      <p>Carregando canvas...</p>
    </div>
  ),
});

export default function CanvasPage() {
  const params = useParams<{ roomId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomId = params.roomId;
  const isHost = searchParams.get('host') === 'true';

  const [name, setName] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [showNameModal, setShowNameModal] = useState(false);
  const [ready, setReady] = useState(false);
  const [sessionDestroyed, setSessionDestroyed] = useState(false);

  useEffect(() => {
    const storedName = getStoredName();
    let storedUserId = getStoredUserId();
    if (!storedUserId) {
      storedUserId = generateUserId();
      setStoredUserId(storedUserId);
    }
    setUserId(storedUserId);
    
    if (!storedName) {
      setShowNameModal(true);
    } else {
      setName(storedName);
      setReady(true);
    }
  }, []);

  const handleNameConfirm = (newName: string) => {
    setName(newName);
    localStorage.setItem('shared-canvas-user-name', newName);
    setShowNameModal(false);
    setReady(true);
  };

  const handleSessionDestroyed = () => {
    setSessionDestroyed(true);
    setTimeout(() => {
      router.push('/');
    }, 2000);
  };

  if (sessionDestroyed) {
    return (
      <div className={styles.container}>
        <div className={styles.destroyedOverlay}>
          <h2>Sessão Encerrada</h2>
          <p>Todos os usuários saíram. A sessão foi apagada.</p>
          <p>Redirecionando para a página inicial...</p>
        </div>
      </div>
    );
  }

  if (!ready) {
    return showNameModal ? (
      <NameModal
        initialValue=""
        onConfirm={handleNameConfirm}
        onCancel={() => router.push('/')}
      />
    ) : null;
  }

  return (
    <CanvasEditor
      roomId={roomId}
      isHost={isHost}
      initialName={name}
      onSessionDestroyed={handleSessionDestroyed}
      onReady={() => {}}
    />
  );
}