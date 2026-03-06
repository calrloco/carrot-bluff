export type GameMode = 'daily' | 'infinite';
export type FinalChoice = 'keep' | 'switch';
export type ScenarioRole = 'AI_KNOWS' | 'PLAYER_KNOWS';
export type Starter = 'ai' | 'player';

export type StartGameRequest = {
  mode: GameMode;
  session_token: string;
};

export type StartGameResponse = {
  game_id: string;
  mode: GameMode;
  day: string | null;
  role: ScenarioRole;
  starter: Starter;
  player_box_has_carrot: boolean | null;
  turn: number;
  max_turns: number;
  ai_message: string;
};

export type TurnResponse = {
  turn: number;
  max_turns: number;
  ai_message: string;
  can_finalize: boolean;
};

export type FinalResponse = {
  did_win: boolean;
  streak: number;
  role: ScenarioRole;
  starter: Starter;
  decider: Starter;
  final_choice: FinalChoice;
  ai_had_carrot: boolean;
  share_text: string;
};

export type LeaderboardRow = {
  handle: string;
  best_streak: number;
};

export type DailyStatus = {
  day: string;
  handle: string;
  has_played_today: boolean;
  result: {
    did_win: boolean;
    streak: number;
    final_choice: FinalChoice;
    share_text: string;
  } | null;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:8000';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function startGame(payload: StartGameRequest) {
  return request<StartGameResponse>('/api/game/start', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function sendTurn(gameId: string, playerMessage: string) {
  return request<TurnResponse>('/api/game/turn', {
    method: 'POST',
    body: JSON.stringify({ game_id: gameId, player_message: playerMessage }),
  });
}

export function finalizeGame(gameId: string, choice?: FinalChoice) {
  return request<FinalResponse>('/api/game/final', {
    method: 'POST',
    body: JSON.stringify({ game_id: gameId, choice }),
  });
}

export function getDailyLeaderboard(day?: string) {
  const suffix = day ? `?day=${encodeURIComponent(day)}` : '';
  return request<LeaderboardRow[]>(`/api/leaderboard/daily${suffix}`);
}

export function getInfiniteLeaderboard() {
  return request<LeaderboardRow[]>('/api/leaderboard/infinite');
}

export function getDailyStatus(sessionToken: string) {
  return request<DailyStatus>(`/api/daily/status?session_token=${encodeURIComponent(sessionToken)}`);
}

export type SessionBootstrapResponse = {
  session_token: string;
  handle: string;
};

export function bootstrapSession(sessionToken?: string) {
  return request<SessionBootstrapResponse>('/api/session/bootstrap', {
    method: 'POST',
    body: JSON.stringify({ session_token: sessionToken }),
  });
}

export function updateHandle(sessionToken: string, handle: string) {
  return request<SessionBootstrapResponse>('/api/session/handle', {
    method: 'POST',
    body: JSON.stringify({ session_token: sessionToken, handle }),
  });
}
