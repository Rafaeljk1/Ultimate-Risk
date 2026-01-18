
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Trophy, RotateCcw, Play, HandCoins, AlertCircle, ChevronUp, Zap, BarChart3 } from 'lucide-react';
import { GameStatus, GameState } from './types';
import { INITIAL_COINS, STORAGE_KEY, TOWER_CONFIG, MAX_FLOORS, MIN_BET } from './constants';

const App: React.FC = () => {
  const [state, setState] = useState<GameState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
    return {
      totalCoins: INITIAL_COINS,
      currentPot: 0,
      currentFloor: 0,
      status: GameStatus.IDLE,
      lastBet: MIN_BET
    };
  });

  const [maxWin, setMaxWin] = useState<number>(() => {
    return Number(localStorage.getItem('tower_max_win') || '0');
  });

  const [isSplash, setIsSplash] = useState(true);
  const [betInput, setBetInput] = useState<number>(MIN_BET);
  const [selectedBlock, setSelectedBlock] = useState<number | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [screenEffect, setScreenEffect] = useState<'shake' | 'flash' | null>(null);
  const towerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsSplash(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    if (state.currentFloor > 0 && towerRef.current) {
      const activeFloor = document.getElementById(`floor-${state.currentFloor}`);
      activeFloor?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [state.currentFloor]);

  const vibrate = (pattern: number | number[]) => {
    if (navigator.vibrate) navigator.vibrate(pattern);
  };

  const playSound = (type: 'win' | 'lose' | 'click' | 'cashout' | 'step') => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === 'win') {
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.2);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      } else if (type === 'lose') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(40, now + 0.4);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      } else if (type === 'step') {
        osc.frequency.setValueAtTime(600 + (state.currentFloor * 50), now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      } else {
        osc.frequency.setValueAtTime(800, now);
        gain.gain.setValueAtTime(0.02, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      }

      osc.start();
      osc.stop(now + 0.5);
    } catch (e) {}
  };

  const triggerEffect = (type: 'shake' | 'flash') => {
    setScreenEffect(type);
    setTimeout(() => setScreenEffect(null), 500);
  };

  const startGame = () => {
    if (betInput > state.totalCoins || betInput < MIN_BET) return;
    vibrate(10);
    playSound('click');
    setState(prev => ({
      ...prev,
      totalCoins: prev.totalCoins - betInput,
      currentPot: betInput,
      currentFloor: 1,
      status: GameStatus.PLAYING,
      lastBet: betInput
    }));
    setResultMessage(null);
  };

  const handleBlockSelection = (blockIndex: number) => {
    if (state.status !== GameStatus.PLAYING || selectedBlock !== null) return;

    vibrate(5);
    setSelectedBlock(blockIndex);
    const floorConfig = TOWER_CONFIG[state.currentFloor];
    const safeBlock = Math.floor(Math.random() * floorConfig.blocks);

    setTimeout(() => {
      if (blockIndex === safeBlock) {
        playSound('step');
        const nextMultiplier = TOWER_CONFIG[state.currentFloor].multiplier;
        const newPot = state.lastBet * nextMultiplier;

        if (state.currentFloor === MAX_FLOORS) {
          handleWin(newPot);
        } else {
          setState(prev => ({ ...prev, currentPot: newPot, currentFloor: prev.currentFloor + 1 }));
        }
      } else {
        handleLoss();
      }
      setSelectedBlock(null);
    }, 400);
  };

  const handleWin = (amount: number) => {
    vibrate([50, 50, 100]);
    playSound('win');
    triggerEffect('flash');
    if (amount > maxWin) {
      setMaxWin(amount);
      localStorage.setItem('tower_max_win', amount.toString());
    }
    setState(prev => ({
      ...prev,
      totalCoins: prev.totalCoins + amount,
      currentPot: 0,
      currentFloor: 0,
      status: GameStatus.CASHED_OUT
    }));
    setResultMessage(`JACKPOT! +${amount.toFixed(0)}`);
  };

  const handleLoss = () => {
    vibrate([200, 100, 200]);
    playSound('lose');
    triggerEffect('shake');
    setState(prev => ({
      ...prev,
      currentPot: 0,
      currentFloor: 0,
      status: GameStatus.GAMEOVER
    }));
    setResultMessage("EXPLODIU! Perdeu tudo.");
  };

  const cashOut = () => {
    if (state.status !== GameStatus.PLAYING) return;
    const amount = state.currentPot;
    vibrate([20, 20]);
    playSound('cashout');
    if (amount > maxWin) {
      setMaxWin(amount);
      localStorage.setItem('tower_max_win', amount.toString());
    }
    setState(prev => ({
      ...prev,
      totalCoins: prev.totalCoins + amount,
      currentPot: 0,
      currentFloor: 0,
      status: GameStatus.CASHED_OUT
    }));
    setResultMessage(`COLETADO: ${amount.toFixed(0)}`);
  };

  const resetGame = () => {
    vibrate(10);
    playSound('click');
    if (state.totalCoins < MIN_BET) {
      setState({ totalCoins: INITIAL_COINS, currentPot: 0, currentFloor: 0, status: GameStatus.IDLE, lastBet: MIN_BET });
    } else {
      setState(prev => ({ ...prev, currentPot: 0, currentFloor: 0, status: GameStatus.IDLE }));
    }
    setResultMessage(null);
  };

  if (isSplash) {
    return (
      <div className="h-screen w-full bg-black flex flex-col items-center justify-center">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center"
        >
          <div className="w-24 h-24 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-[0_0_50px_rgba(79,70,229,0.5)] mb-6">
            <Zap className="w-12 h-12 text-white fill-current" />
          </div>
          <h1 className="text-4xl font-rajdhani font-bold text-white tracking-tighter">TOWER CLIMBER</h1>
          <p className="text-indigo-400 font-bold tracking-[0.3em] text-xs mt-2 uppercase">Ultimate Risk</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-screen max-w-md mx-auto bg-black border-x border-zinc-900 shadow-2xl relative overflow-hidden transition-all duration-300 ${screenEffect === 'shake' ? 'animate-shake' : ''}`}>
      
      {screenEffect === 'flash' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: [0, 0.4, 0] }} className="absolute inset-0 bg-emerald-500 z-[60] pointer-events-none" />
      )}

      {/* Header */}
      <header className="p-6 safe-area-top glass border-b border-zinc-800 flex justify-between items-center z-20">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-500/20 rounded-xl border border-yellow-500/30">
            <Coins className="w-6 h-6 text-yellow-500" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-black">Carteira</p>
            <p className="text-2xl font-rajdhani font-bold text-yellow-400 tabular-nums">
              {state.totalCoins.toLocaleString('pt-BR')}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-1 text-zinc-500 mb-1">
            <BarChart3 className="w-3 h-3" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Max Win: {maxWin.toFixed(0)}</span>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-black">Pot</p>
            <p className="text-2xl font-rajdhani font-bold text-emerald-400 tabular-nums">{state.currentPot.toFixed(0)}</p>
          </div>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="flex-1 overflow-y-auto relative px-6 flex flex-col-reverse items-center scroll-smooth bg-[#050505]" ref={towerRef}>
        <div className="w-full flex flex-col-reverse gap-4 pb-40 pt-10">
          {Array.from({ length: MAX_FLOORS }).map((_, i) => {
            const floorNum = i + 1;
            const config = TOWER_CONFIG[floorNum];
            const isCurrent = state.currentFloor === floorNum;
            const isPassed = state.currentFloor > floorNum;

            return (
              <motion.div
                key={floorNum}
                id={`floor-${floorNum}`}
                initial={false}
                animate={{ 
                  opacity: isCurrent ? 1 : isPassed ? 0.4 : 0.1, 
                  scale: isCurrent ? 1.02 : 1,
                  x: isCurrent ? 0 : 0
                }}
                className={`w-full flex flex-col gap-3 p-5 rounded-3xl border-2 transition-colors duration-500 ${
                  isCurrent ? 'bg-zinc-900 border-indigo-600 neon-border' : 'bg-transparent border-zinc-900'
                }`}
              >
                <div className="flex justify-between items-center px-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isCurrent ? 'text-indigo-400' : 'text-zinc-700'}`}>
                      Andar {floorNum}
                    </span>
                    {isCurrent && <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                  </div>
                  <span className={`font-rajdhani text-lg font-bold ${isCurrent ? 'text-emerald-400' : 'text-zinc-700'}`}>
                    {config.multiplier}x
                  </span>
                </div>
                
                <div className="flex gap-3">
                  {Array.from({ length: config.blocks }).map((_, bIdx) => (
                    <button
                      key={bIdx}
                      disabled={!isCurrent || selectedBlock !== null}
                      onClick={() => handleBlockSelection(bIdx)}
                      className={`flex-1 h-16 rounded-2xl border-2 transition-all active:scale-90 flex items-center justify-center ${
                        isCurrent 
                          ? selectedBlock === bIdx 
                            ? 'bg-indigo-600 border-indigo-400'
                            : 'bg-zinc-800 border-zinc-700 active:border-indigo-500 active:bg-zinc-700 shadow-lg shadow-black/50'
                          : 'bg-zinc-950 border-zinc-900 cursor-not-allowed'
                      }`}
                    >
                      {isCurrent && selectedBlock === null && <ChevronUp className="w-5 h-5 text-indigo-400 opacity-30" />}
                      {isCurrent && selectedBlock === bIdx && <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, ease: 'linear' }} className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full" />}
                    </button>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </main>

      {/* Feedback Overlay */}
      <AnimatePresence>
        {resultMessage && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] z-50 pointer-events-none"
          >
            <div className={`p-8 rounded-[40px] border-2 shadow-[0_30px_60px_rgba(0,0,0,0.8)] backdrop-blur-2xl text-center ${
              state.status === GameStatus.GAMEOVER 
                ? 'bg-red-950/40 border-red-500/50 text-red-100' 
                : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-100'
            }`}>
              <div className="mb-4 flex justify-center">
                <div className={`p-4 rounded-full ${state.status === GameStatus.GAMEOVER ? 'bg-red-500/20' : 'bg-emerald-500/20'}`}>
                  {state.status === GameStatus.GAMEOVER ? <AlertCircle className="w-12 h-12" /> : <Trophy className="w-12 h-12" />}
                </div>
              </div>
              <p className="font-rajdhani font-bold text-3xl tracking-tight leading-none mb-2">{resultMessage}</p>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-[0.2em]">Toque para continuar</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Control Panel */}
      <footer className="p-6 safe-area-bottom glass border-t border-zinc-800 z-30 flex flex-col gap-4">
        {state.status === GameStatus.IDLE ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-black border-2 border-zinc-800 focus-within:border-indigo-600 transition-colors rounded-3xl p-4 flex items-center justify-between">
                <div>
                  <span className="block text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Aposta</span>
                  <input 
                    type="number"
                    value={betInput}
                    onChange={(e) => setBetInput(Math.max(MIN_BET, parseInt(e.target.value) || 0))}
                    className="bg-transparent font-rajdhani font-bold text-3xl outline-none text-white w-full h-8"
                  />
                </div>
                <div className="flex flex-col gap-1 pl-4 border-l border-zinc-800">
                  <button onClick={() => setBetInput(prev => Math.min(state.totalCoins, prev * 2))} className="text-[10px] font-bold text-zinc-500 bg-zinc-900 px-3 py-1 rounded-lg">2X</button>
                  <button onClick={() => setBetInput(Math.max(MIN_BET, Math.floor(betInput / 2)))} className="text-[10px] font-bold text-zinc-500 bg-zinc-900 px-3 py-1 rounded-lg">1/2</button>
                </div>
              </div>
            </div>
            
            <button 
              onClick={startGame}
              disabled={state.totalCoins < betInput}
              className="w-full py-6 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-900 disabled:text-zinc-600 text-white rounded-[32px] font-black text-lg flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-indigo-600/20"
            >
              <Play className="w-6 h-6 fill-current" />
              SUBIR TORRE
            </button>
          </div>
        ) : state.status === GameStatus.PLAYING ? (
          <div className="grid grid-cols-2 gap-4">
             <div className="col-span-2 p-3 bg-indigo-500/5 rounded-2xl text-center border border-indigo-500/10 mb-2">
               <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-0.5">Próximo Multiplicador</p>
               <p className="text-2xl font-rajdhani font-bold text-indigo-400">
                {TOWER_CONFIG[state.currentFloor].multiplier}x
               </p>
             </div>
             <button 
              onClick={cashOut}
              className="py-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[32px] font-black text-lg flex flex-col items-center justify-center transition-all active:scale-95 shadow-xl shadow-emerald-600/20"
            >
              <HandCoins className="w-6 h-6 mb-1" />
              <span className="text-xs">COLETAR</span>
            </button>
            <button 
              onClick={() => {
                if(confirm("Desistir do andar atual?")) resetGame();
              }}
              className="py-6 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-[32px] font-black flex flex-col items-center justify-center transition-all active:scale-95 border border-zinc-700"
            >
              <RotateCcw className="w-6 h-6 mb-1 text-zinc-500" />
              <span className="text-xs">PARAR</span>
            </button>
          </div>
        ) : (
          <button 
            onClick={resetGame}
            className="w-full py-6 bg-zinc-900 hover:bg-zinc-800 text-white rounded-[32px] font-black text-lg flex items-center justify-center gap-3 transition-all active:scale-95 border border-zinc-700 shadow-2xl"
          >
            <RotateCcw className="w-6 h-6" />
            {state.totalCoins < MIN_BET ? "RESTARECER (1.000)" : "JOGAR NOVAMENTE"}
          </button>
        )}
      </footer>

      {/* Styles for shake effect */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          50% { transform: translateX(8px); }
          75% { transform: translateX(-4px); }
        }
        .animate-shake {
          animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}</style>
    </div>
  );
};

export default App;
