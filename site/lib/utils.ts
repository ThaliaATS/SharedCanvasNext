const COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f43f5e', // rose
];

export function getRandomColor(): string {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

const NAME_KEY = 'shared-canvas-user-name';
const USER_ID_KEY = 'shared-canvas-user-id';

export function getStoredName(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(NAME_KEY);
}

export function setStoredName(name: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(NAME_KEY, name);
}

export function clearStoredName(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(NAME_KEY);
}

export function getStoredUserId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(USER_ID_KEY);
}

export function setStoredUserId(id: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_ID_KEY, id);
}

export function generateUserId(): string {
  // Simple unique ID without nanoid (fallback)
  return `u-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function generateRoomId(): string {
  return `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}
