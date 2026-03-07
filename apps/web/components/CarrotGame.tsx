'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, RotateCcw, Send, Loader2 } from 'lucide-react';
import {
  finalizeGame,
  getDailyLeaderboard,
  getInfiniteLeaderboard,
  sendTurn,
  type FinalChoice,
  type GameMode,
  type LeaderboardRow,
  type ScenarioRole,
  type Starter,
} from '@/lib/api';
import { clearActiveGame, loadActiveGame } from '@/lib/active-game';

type GameState = 'CHATTING' | 'REVEAL';

type Message = {
  role: 'user' | 'model';
  text: string;
};

export default function CarrotGame() {
  const router = useRouter();
  const [gameState, setGameState] = useState<GameState>('CHATTING');
  const [mode, setMode] = useState<GameMode>('daily');
  const [gameId, setGameId] = useState<string | null>(null);
  const [role, setRole] = useState<ScenarioRole | null>(null);
  const [starter, setStarter] = useState<Starter | null>(null);
  const [playerBoxHasCarrot, setPlayerBoxHasCarrot] = useState<boolean | null>(null);
  const [maxTurns, setMaxTurns] = useState(3);
  const [turn, setTurn] = useState(0);
  const [showSwapAnimation, setShowSwapAnimation] = useState(false);
  const [isStreamingReply, setIsStreamingReply] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    didWin: boolean;
    aiHadCarrot: boolean;
    streak: number;
    shareText: string;
    role: ScenarioRole;
    starter: Starter;
    decider: Starter;
    finalChoice: FinalChoice;
  } | null>(null);
  const [dailyBoard, setDailyBoard] = useState<LeaderboardRow[]>([]);
  const [infiniteBoard, setInfiniteBoard] = useState<LeaderboardRow[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isAiTyping, isStreamingReply]);

  useEffect(() => {
    void loadLeaderboards();
    void initFromSnapshot();
  }, []);

  async function initFromSnapshot() {
    const snapshot = loadActiveGame();
    if (!snapshot) {
      router.replace('/');
      return;
    }

    setMode(snapshot.mode);
    setGameId(snapshot.gameId);
    setRole(snapshot.role);
    setStarter(snapshot.starter);
    setPlayerBoxHasCarrot(snapshot.playerBoxHasCarrot);
    setMaxTurns(snapshot.maxTurns);
    setTurn(snapshot.turn);
    setMessages([]);

    if (snapshot.initialAiMessage) {
      await streamAssistantMessage(snapshot.initialAiMessage);
    }
  }

  async function loadLeaderboards() {
    try {
      const [daily, infinite] = await Promise.all([getDailyLeaderboard(), getInfiniteLeaderboard()]);
      setDailyBoard(daily);
      setInfiniteBoard(infinite);
    } catch {
      // Keep UI usable even if leaderboard fetch fails.
    }
  }

  async function onSendMessage() {
    if (!gameId || !input.trim() || isAiTyping || isStreamingReply || turn >= maxTurns) return;

    const playerText = input.trim();
    setMessages((prev) => [...prev, { role: 'user', text: playerText }]);
    setInput('');
    setIsAiTyping(true);
    setError(null);

    try {
      const res = await sendTurn(gameId, playerText);
      setTurn(res.turn);
      await streamAssistantMessage(res.ai_message);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Turn failed');
    } finally {
      setIsAiTyping(false);
    }
  }

  async function streamAssistantMessage(fullText: string) {
    setIsStreamingReply(true);
    setMessages((prev) => [...prev, { role: 'model', text: '' }]);
    for (let i = 1; i <= fullText.length; i += 1) {
      const nextText = fullText.slice(0, i);
      setMessages((prev) => {
        const next = [...prev];
        if (next.length > 0) {
          next[next.length - 1] = { role: 'model', text: nextText };
        }
        return next;
      });
      await new Promise((resolve) => setTimeout(resolve, 14));
    }
    setIsStreamingReply(false);
  }

  async function onFinalize(choice?: FinalChoice) {
    if (!gameId) return;

    setIsLoading(true);
    setError(null);
    try {
      if (choice === 'switch' && role === 'AI_KNOWS') {
        setShowSwapAnimation(true);
        await new Promise((resolve) => setTimeout(resolve, 650));
      }

      const res = await finalizeGame(gameId, choice);
      setResult({
        didWin: res.did_win,
        aiHadCarrot: res.ai_had_carrot,
        streak: res.streak,
        shareText: res.share_text,
        role: res.role,
        starter: res.starter,
        decider: res.decider,
        finalChoice: res.final_choice,
      });
      setGameState('REVEAL');
      setGameId(null);
      clearActiveGame();
      await loadLeaderboards();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Finalize failed');
    } finally {
      setShowSwapAnimation(false);
      setIsLoading(false);
    }
  }

  function backToLobby() {
    clearActiveGame();
    router.push('/');
  }

  const board = mode === 'daily' ? dailyBoard : infiniteBoard;
  const aiBoxIndicator = role === 'AI_KNOWS' ? '🔒' : '📦';
  const playerBoxIndicator = role === 'PLAYER_KNOWS' ? (playerBoxHasCarrot ? '🥕' : '🕳️') : '📦';
  const finalAiHasCarrot =
    result && (result.finalChoice === 'switch' ? !result.aiHadCarrot : result.aiHadCarrot);
  const outcomeSummary =
    result &&
    (() => {
      const actor = result.decider === 'ai' ? 'AI' : 'You';
      const action = result.finalChoice === 'switch' ? 'switched' : 'kept';
      const whoHasCarrot = finalAiHasCarrot ? 'AI' : 'you';
      const winLoss = result.didWin ? 'You won.' : 'You lost.';
      return `${actor} ${action}. Final carrot owner: ${whoHasCarrot}. ${winLoss}`;
    })();

  return (
    <main className="min-h-screen flex flex-col md:flex-row bg-white font-sans">
      <section className="flex-1 border-r-0 md:border-r-4 border-black p-6 md:p-12 flex flex-col justify-between relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-6xl md:text-8xl font-display font-black leading-none uppercase tracking-tighter">Carrot<br />Bluff</h1>
              <div className="mt-4 inline-block bg-[#00FF00] px-4 py-1 border-2 border-black font-mono text-sm font-bold uppercase">Game</div>
            </div>
            <div className="text-right">
              <div className="text-xs font-mono font-bold uppercase opacity-50">Status</div>
              <div className="text-xl font-display font-bold uppercase">{gameState}</div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center py-8">
          <AnimatePresence mode="wait">
            {gameState === 'CHATTING' && (
              <motion.div key="chatting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-2xl flex flex-col h-[500px] relative">
                <div className="mb-3 border-2 border-black bg-white p-2">
                  <div className="font-mono text-[11px] uppercase font-bold mb-2">
                    Role: {role ?? '-'} | Starter: {starter ?? '-'} | {role === 'PLAYER_KNOWS' ? `Your box is ${playerBoxHasCarrot ? 'CARROT' : 'EMPTY'} | AI decides keep/switch` : 'You decide keep/switch'} | Turn limit: {maxTurns}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center font-mono text-[11px] font-bold uppercase">
                    <div className="border border-black p-2"><div className="opacity-60 mb-1">AI Box</div><div className="text-2xl">{aiBoxIndicator}</div></div>
                    <div className="border border-black p-2"><div className="opacity-60 mb-1">Your Box</div><div className="text-2xl">{playerBoxIndicator}</div></div>
                  </div>
                </div>

                <AnimatePresence>
                  {showSwapAnimation && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-20 bg-black/20 flex items-center justify-center pointer-events-none">
                      <div className="bg-white border-4 border-black p-4">
                        <div className="font-mono text-xs font-bold uppercase text-center mb-2">Swapping...</div>
                        <div className="relative w-56 h-16">
                          <motion.div initial={{ x: 0 }} animate={{ x: 160 }} transition={{ duration: 0.55, ease: 'easeInOut' }} className="absolute left-0 top-0 text-4xl">📦</motion.div>
                          <motion.div initial={{ x: 160 }} animate={{ x: 0 }} transition={{ duration: 0.55, ease: 'easeInOut' }} className="absolute left-0 top-0 text-4xl">📦</motion.div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex-1 border-4 border-black bg-stone-50 overflow-hidden flex flex-col mb-4">
                  <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-4 font-mono text-sm">
                    {messages.map((m, i) => (
                      <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-3 border-2 border-black ${m.role === 'user' ? 'bg-[#00FF00] text-black' : 'bg-black text-white'}`}>
                          <div className="text-[8px] uppercase font-bold mb-1 opacity-70">{m.role === 'user' ? 'You' : 'AI'}</div>
                          {m.text}
                        </div>
                      </div>
                    ))}
                    {(isAiTyping || isStreamingReply) && (
                      <div className="flex justify-start">
                        <div className="bg-black text-white p-3 border-2 border-black flex items-center gap-2">
                          <Loader2 size={14} className="animate-spin" />
                          <span className="text-[8px] uppercase font-bold">{isStreamingReply ? 'AI is typing...' : 'AI is thinking...'}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="border-t-4 border-black p-2 flex gap-2 bg-white">
                    <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void onSendMessage()} placeholder={turn >= maxTurns ? 'No more turns left...' : 'Type your bluff...'} disabled={isAiTyping || isStreamingReply || turn >= maxTurns || isLoading} className="flex-1 px-3 py-2 border-2 border-black font-mono text-sm focus:outline-none focus:bg-stone-50 disabled:opacity-50" />
                    <button onClick={() => void onSendMessage()} disabled={isAiTyping || isStreamingReply || turn >= maxTurns || isLoading || !input.trim()} className="p-2 bg-black text-white border-2 border-black hover:bg-[#00FF00] hover:text-black transition-all disabled:opacity-50"><Send size={20} /></button>
                  </div>
                </div>

                <div className="flex justify-between items-center px-4">
                  <div className="text-[10px] font-mono font-bold uppercase">Turns: {turn} / {maxTurns}</div>
                  {role === 'AI_KNOWS' ? (
                    <div className="flex gap-2">
                      <button onClick={() => void onFinalize('keep')} disabled={isLoading || isAiTyping || isStreamingReply || showSwapAnimation} className="px-4 py-2 bg-black text-white font-display font-black uppercase text-xs border-2 border-black hover:bg-white hover:text-black transition-all disabled:opacity-50">Keep Mine</button>
                      <button onClick={() => void onFinalize('switch')} disabled={isLoading || isAiTyping || isStreamingReply || showSwapAnimation} className="px-4 py-2 bg-[#00FF00] text-black font-display font-black uppercase text-xs border-2 border-black hover:bg-black hover:text-white transition-all disabled:opacity-50">{showSwapAnimation ? 'Switching...' : 'Switch'}</button>
                    </div>
                  ) : (
                    <button onClick={() => void onFinalize()} disabled={isLoading || isAiTyping || isStreamingReply || showSwapAnimation} className="px-4 py-2 bg-black text-white font-display font-black uppercase text-xs border-2 border-black hover:bg-white hover:text-black transition-all disabled:opacity-50">Let AI Decide</button>
                  )}
                </div>
              </motion.div>
            )}

            {gameState === 'REVEAL' && result && (
              <motion.div key="reveal" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center w-full max-w-2xl">
                <div className={`text-4xl md:text-6xl font-display font-black uppercase mb-8 p-4 border-4 border-black inline-block ${result.didWin ? 'bg-[#00FF00]' : 'bg-red-500 text-white'}`}>{result.didWin ? 'You Won!' : 'AI Won!'}</div>
                <div className="grid grid-cols-2 gap-8 mb-8">
                  <div className="flex flex-col items-center"><div className="text-xs font-mono font-bold uppercase mb-2">AI&apos;s Box</div><div className={`w-full aspect-square border-4 border-black flex items-center justify-center text-8xl ${finalAiHasCarrot ? 'bg-orange-50' : 'bg-stone-200'}`}>{finalAiHasCarrot ? '🥕' : '🕳️'}</div></div>
                  <div className="flex flex-col items-center"><div className="text-xs font-mono font-bold uppercase mb-2">Your Box</div><div className={`w-full aspect-square border-4 border-black flex items-center justify-center text-8xl ${!finalAiHasCarrot ? 'bg-orange-50' : 'bg-stone-200'}`}>{!finalAiHasCarrot ? '🥕' : '🕳️'}</div></div>
                </div>
                <div className="mb-8 border-2 border-black bg-stone-50 p-4 font-mono text-xs text-left">
                  <p className="font-bold uppercase mb-2">What Happened</p>
                  <p className="mb-3">{outcomeSummary}</p>
                  <p className="font-bold uppercase mb-2">Share</p>
                  <p>{result.shareText}</p>
                  <p className="mt-2">Streak: {result.streak}</p>
                  <p className="mt-2">Role: {result.role} | Starter: {result.starter}</p>
                  <p className="mt-2">Decider: {result.decider} | Choice: {result.finalChoice.toUpperCase()}</p>
                </div>
                <button onClick={backToLobby} className="px-12 py-4 bg-black text-white font-display font-black uppercase hover:bg-[#00FF00] hover:text-black transition-all border-4 border-black flex items-center gap-3 mx-auto"><RotateCcw size={24} /> Back To Lobby</button>
              </motion.div>
            )}
          </AnimatePresence>
          {error && <div className="mt-4 border-2 border-red-500 bg-red-50 p-2 font-mono text-xs text-red-700">{error}</div>}
        </div>

        <div className="border-t-2 border-black pt-4 flex justify-between items-center font-mono text-[10px] uppercase font-bold opacity-40">
          <div>© 2026 NEON_CARROT_SYSTEMS</div>
          <div>STABILITY: NOMINAL</div>
        </div>
      </section>

      <aside className="w-full md:w-[400px] bg-[#00FF00] p-8 flex flex-col border-t-4 md:border-t-0 border-black">
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6"><Trophy size={32} className="text-black" /><h2 className="text-4xl font-display font-black uppercase tracking-tighter">Leaderboard</h2></div>
          <div className="bg-white border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="text-xs font-mono font-bold uppercase mb-2">{mode === 'daily' ? 'Daily' : 'Infinite'} Top</div>
            <div className="space-y-2 font-mono text-sm">
              {board.slice(0, 8).map((row, i) => (
                <div key={`${row.handle}-${i}`} className="flex justify-between border-b border-black/20 pb-1"><span>{i + 1}. {row.handle}</span><span>{row.best_streak}</span></div>
              ))}
              {board.length === 0 && <div className="opacity-60">No scores yet.</div>}
            </div>
          </div>
        </div>
      </aside>
    </main>
  );
}
