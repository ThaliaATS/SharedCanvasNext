'use client';

import { useState, useEffect, useRef } from 'react';
import { Check, User } from 'lucide-react';
import styles from './NameModal.module.css';

interface NameModalProps {
  initialValue: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

export default function NameModal({
  initialValue,
  onConfirm,
  onCancel,
}: NameModalProps) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onConfirm(value.trim());
    }
  };

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <form
        className={styles.modal}
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.iconWrap}>
          <User size={20} strokeWidth={2} />
        </div>
        <h2 className={styles.title}>Escolha seu nome</h2>
        <p className={styles.hint}>
          Você precisa de um nome para participar da sessão. Ele aparecerá ao
          lado do seu cursor para os outros participantes.
        </p>
        <input
          ref={inputRef}
          type="text"
          className={styles.input}
          placeholder="Digite seu nome"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={30}
        />
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancel}
            onClick={onCancel}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className={styles.confirm}
            disabled={!value.trim()}
          >
            <Check size={16} strokeWidth={2.5} />
            Confirmar
          </button>
        </div>
      </form>
    </div>
  );
}