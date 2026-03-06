'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trophy } from 'lucide-react';
import {
  bootstrapSession,
  getDailyLeaderboard,
  getDailyStatus,
  getInfiniteLeaderboard,
  startGame,
  updateHandle,
  type FinalChoice,
  type LeaderboardRow,
} from '@/lib/api';
import { saveActiveGame } from '@/lib/active-game';

type StartStage = 'READY' | 'DAILY_DONE';

export default function CarrotLobby() {
  const router = useRouter();
  const [stage, setStage] = useState<StartStage>('READY');
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [handle, setHandle] = useState('');
  const [handleDraft, setHandleDraft] = useState('');
  const [isEditingHandle, setIsEditingHandle] = useState(false);
  const [dailyStatusResult, setDailyStatusResult] = useState<{
    did_win: boolean;
    streak: number;
    final_choice: FinalChoice;
    share_text: string;
  } | null>(null);
  const [dailyBoard, setDailyBoard] = useState<LeaderboardRow[]>([]);
  const [infiniteBoard, setInfiniteBoard] = useState<LeaderboardRow[]>([]);
  const [boardMode, setBoardMode] = useState<'daily' | 'infinite'>('daily');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void init();
  }, []);

  async function init() {
    setError(null);
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('carrot_session_token') : null;
      const [session, daily, infinite] = await Promise.all([
        bootstrapSession(stored || undefined),
        getDailyLeaderboard(),
        getInfiniteLeaderboard(),
      ]);

      if (typeof window !== 'undefined') {
        localStorage.setItem('carrot_session_token', session.session_token);
      }

      setSessionToken(session.session_token);
      setHandle(session.handle);
      setHandleDraft(session.handle);
      setDailyBoard(daily);
      setInfiniteBoard(infinite);
      setStage('READY');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to initialize');
      setStage('READY');
    }
  }

  async function saveHandleNow() {
    if (!sessionToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await updateHandle(sessionwToken, handleDraft);
      setHandle(res.handle);
      setHandleDraft(res.handle);
      setIsEditingHandle(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update handle');
    } finally {
      setIsLoading(false);
    }
  }

  async function startMode(mode: 'daily' | 'infinite') {
    if (!sessionToken) {
      setError('Session not ready');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await startGame({ mode, session_token: sessionToken });
      saveActiveGame({
        gameId: res.game_id,
        mode: res.mode,
        role: res.role,
        starter: res.starter,
        playerBoxHasCarrot: res.player_box_has_carrot,
        maxTurns: res.max_turns,
        turn: res.turn,
        initialAiMessage: res.ai_message,
      });
      router.push('/game');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start game');
    } finally {
      setIsLoading(false);
    }
  }

  async function continueFlow() {
    if (!sessionToken) {
      setError('Session not ready');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const status = await getDailyStatus(sessionToken);
      setHandle(status.handle);
      setHandleDraft(status.handle);

      if (!status.has_played_today) {
        await startMode('daily');
        return;
      }

      setDailyStatusResult(status.result);
      setStage('DAILY_DONE');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to check daily');
    } finally {
      setIsLoading(false);
    }
  }

  const board = boardMode === 'daily' ? dailyBoard : infiniteBoard;

  return (
    <main className="min-h-screen flex flex-col md:flex-row bg-white font-sans">
      <section className="flex-1 border-r-0 md:border-r-4 border-black p-6 md:p-12 flex flex-col justify-between relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-6xl md:text-8xl font-display font-black leading-none uppercase tracking-tighter">Carrot<br />Bluff</h1>
          <div className="mt-4 inline-block bg-[#00FF00] px-4 py-1 border-2 border-black font-mono text-sm font-bold uppercase">Lobby</div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center py-8">
          <div className="text-center w-full max-w-xl">
            <div className="text-7xl mb-8">📦 🥕 📦</div>

            <div className="grid gap-3 mb-4 text-left">
              <div className="border-2 border-black bg-white p-3">
                <div className="text-xs font-mono font-bold uppercase mb-2">Session Handle</div>
                {isEditingHandle ? (
                  <div className="flex gap-2">
                    <input value={handleDraft} onChange={(e) => setHandleDraft(e.target.value)} className="flex-1 px-3 py-2 border-2 border-black font-mono" />
                    <button onClick={() => void saveHandleNow()} disabled={isLoading} className="px-3 py-2 border-2 border-black bg-[#00FF00] font-display font-black uppercase text-xs disabled:opacity-50">Save</button>
                    <button onClick={() => { setHandleDraft(handle); setIsEditingHandle(false); }} className="px-3 py-2 border-2 border-black bg-white font-display font-black uppercase text-xs">Cancel</button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="font-mono text-sm">{handle || 'loading...'}</div>
                    <button onClick={() => setIsEditingHandle(true)} className="px-3 py-2 border-2 border-black bg-white font-display font-black uppercase text-xs">Edit</button>
                  </div>
                )}
              </div>
            </div>

            {stage === 'READY' ? (
              <button
                onClick={() => void continueFlow()}
                disabled={isLoading || !sessionToken}
                className="px-12 py-6 bg-black text-white text-2xl font-display font-black uppercase hover:bg-[#00FF00] hover:text-black transition-all border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
              >
                {isLoading ? 'Checking Daily...' : 'Continue'}
              </button>
            ) : (
              <div className="border-2 border-black bg-white p-4 text-left">
                <div className="font-mono text-xs font-bold uppercase mb-2">Daily already completed today</div>
                {dailyStatusResult && (
                  <div className="font-mono text-xs space-y-1 mb-4">
                    <p>{dailyStatusResult.did_win ? 'Result: WIN' : 'Result: LOSS'}</p>
                    <p>Choice: {dailyStatusResult.final_choice.toUpperCase()}</p>
                    <p>Streak: {dailyStatusResult.streak}</p>
                    <p>{dailyStatusResult.share_text}</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => void startMode('infinite')}
                    disabled={isLoading || !sessionToken}
                    className="px-6 py-3 bg-[#00FF00] text-black font-display font-black uppercase border-2 border-black hover:bg-black hover:text-white transition-all disabled:opacity-50"
                  >
                    {isLoading ? 'Starting...' : 'Play Infinite'}
                  </button>
                  <button
                    onClick={() => setStage('READY')}
                    disabled={isLoading}
                    className="px-6 py-3 bg-white text-black font-display font-black uppercase border-2 border-black hover:bg-black hover:text-white transition-all disabled:opacity-50"
                  >
                    Back
                  </button>
                </div>
              </div>
            )}

            {error && <div className="mt-4 border-2 border-red-500 bg-red-50 p-2 font-mono text-xs text-red-700">{error}</div>}
          </div>
        </div>
      </section>

      <aside className="w-full md:w-[400px] bg-[#00FF00] p-8 flex flex-col border-t-4 md:border-t-0 border-black">
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <Trophy size={32} className="text-black" />
            <h2 className="text-4xl font-display font-black uppercase tracking-tighter">Leaderboard</h2>
          </div>
          <div className="flex gap-2 mb-3">
            <button onClick={() => setBoardMode('daily')} className={`px-3 py-2 border-2 border-black font-display font-black uppercase text-xs ${boardMode === 'daily' ? 'bg-black text-white' : 'bg-white text-black'}`}>Daily</button>
            <button onClick={() => setBoardMode('infinite')} className={`px-3 py-2 border-2 border-black font-display font-black uppercase text-xs ${boardMode === 'infinite' ? 'bg-black text-white' : 'bg-white text-black'}`}>Infinite</button>
          </div>
          <div className="bg-white border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="space-y-2 font-mono text-sm">
              {board.slice(0, 8).map((row, i) => (
                <div key={`${row.handle}-${i}`} className="flex justify-between border-b border-black/20 pb-1">
                  <span>{i + 1}. {row.handle}</span>
                  <span>{row.best_streak}</span>
                </div>
              ))}
              {board.length === 0 && <div className="opacity-60">No scores yet.</div>}
            </div>
          </div>
        </div>

        <div className="mt-auto">
          <div className="bg-white/30 border-2 border-black p-4 font-mono text-xs leading-relaxed">
            <p className="font-bold mb-2 uppercase underline">Flow:</p>
            <p>• Enter app - auto-check Daily.</p>
            <p>• Not played: starts Daily immediately.</p>
            <p>• Played: shows result + Infinite CTA.</p>
            <p>• Identity is session token + editable global handle.</p>
          </div>
        </div>
      </aside>
    </main>
  );
}
