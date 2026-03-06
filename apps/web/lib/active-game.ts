export type ActiveGameSnapshot = {
  gameId: string;
  mode: 'daily' | 'infinite';
  role: 'AI_KNOWS' | 'PLAYER_KNOWS';
  starter: 'ai' | 'player';
  playerBoxHasCarrot: boolean | null;
  maxTurns: number;
  turn: number;
  initialAiMessage: string;
};

const KEY = 'carrot_active_game';

export function saveActiveGame(snapshot: ActiveGameSnapshot) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(snapshot));
}

export function loadActiveGame(): ActiveGameSnapshot | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ActiveGameSnapshot;
  } catch {
    return null;
  }
}

export function clearActiveGame() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEY);
}
