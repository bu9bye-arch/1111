import React, { useState } from 'react';
import GameCanvas from './components/GameCanvas';
import { GameState, PlayerStats } from './types';
import { PLAYER_BASE_STATS } from './constants';

export default function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [score, setScore] = useState(0);
  const [stats, setStats] = useState<PlayerStats>({
    damage: PLAYER_BASE_STATS.damage,
    fireRate: PLAYER_BASE_STATS.fireRate,
    soldierCount: PLAYER_BASE_STATS.soldierCount
  });

  // Convert game fire rate (frames per shot) to UI friendly "Shots per second"
  // Assuming 60 FPS
  const shotsPerSecond = (60 / Math.max(1, stats.fireRate)).toFixed(1);
  const totalDPS = (stats.damage * (60 / Math.max(1, stats.fireRate)) * Math.floor(stats.soldierCount)).toFixed(0);

  return (
    <div className="relative w-full h-screen bg-slate-950 overflow-hidden flex font-sans text-white selection:bg-blue-500 selection:text-white">
      
      {/* Background Decor */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black" />
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

      {/* Main Container */}
      <div className="relative z-10 w-full h-full flex flex-col md:flex-row max-w-7xl mx-auto p-4 gap-4">
        
        {/* LEFT PANEL - Realtime Stats */}
        <div className="hidden md:flex flex-col w-64 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl h-fit sticky top-4">
            <h2 className="text-blue-400 text-xs font-bold tracking-widest uppercase mb-6 border-b border-white/10 pb-2">
                实时战斗数据
            </h2>
            
            <div className="space-y-6">
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-400 text-sm">单发伤害</span>
                        <span className="text-white font-mono font-bold text-lg">{Math.floor(stats.damage)}</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-red-500 h-full transition-all duration-300" style={{ width: `${Math.min(100, stats.damage)}%` }} />
                    </div>
                </div>

                <div>
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-400 text-sm">攻击速度</span>
                        <span className="text-yellow-400 font-mono font-bold text-lg">{shotsPerSecond}<span className="text-xs ml-1">/秒</span></span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-yellow-500 h-full transition-all duration-300" style={{ width: `${Math.min(100, parseFloat(shotsPerSecond) * 5)}%` }} />
                    </div>
                </div>

                <div>
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-400 text-sm">队伍规模</span>
                        <span className="text-blue-400 font-mono font-bold text-lg">{Math.floor(stats.soldierCount)}<span className="text-xs ml-1">人</span></span>
                    </div>
                     <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${Math.min(100, stats.soldierCount * 2)}%` }} />
                    </div>
                </div>

                <div className="pt-4 border-t border-white/10 mt-2">
                     <span className="text-gray-500 text-xs uppercase tracking-wider">预估每秒总伤 (DPS)</span>
                     <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mt-1 font-mono">
                        {totalDPS}
                     </div>
                </div>
            </div>
        </div>

        {/* CENTER - Game Canvas Area */}
        <div className="flex-1 relative flex items-center justify-center bg-black/40 rounded-2xl border border-white/5 overflow-hidden backdrop-blur-sm">
             <GameCanvas 
                gameState={gameState} 
                setGameState={setGameState}
                setScore={setScore}
                setStats={setStats}
             />
             
             {/* Mobile Stats Overlay (Visible only on small screens) */}
             {gameState === GameState.PLAYING && (
                 <div className="md:hidden absolute top-4 left-4 right-4 flex justify-between gap-2 pointer-events-none">
                     <div className="bg-black/60 backdrop-blur rounded p-2 text-xs text-white border border-white/10">
                         DPS: <span className="font-bold text-purple-400">{totalDPS}</span>
                     </div>
                     <div className="bg-black/60 backdrop-blur rounded p-2 text-xs text-white border border-white/10">
                         人数: <span className="font-bold text-blue-400">{Math.floor(stats.soldierCount)}</span>
                     </div>
                 </div>
             )}
        </div>

      </div>


      {/* Main Menu Overlay */}
      {gameState === GameState.MENU && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="text-center p-10 max-w-lg w-full bg-slate-900/90 border border-slate-700 shadow-2xl rounded-3xl animate-in fade-in zoom-in duration-500 relative overflow-hidden">
            {/* Decorative glimmers */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>

            <h1 className="text-6xl font-black mb-2 text-white tracking-tighter drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">
              GATE <span className="text-blue-500">RUNNER</span>
            </h1>
            <p className="text-gray-400 mb-10 text-lg font-light tracking-wide">
              构建军队 · 突破防线
            </p>
            
            <div className="grid grid-cols-1 gap-4 text-left mb-10">
              <div className="flex items-center gap-4 bg-slate-800/50 p-4 rounded-xl border border-white/5 hover:border-blue-500/30 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center text-xl">👆</div>
                <div>
                    <h3 className="font-bold text-white text-sm">滑动控制</h3>
                    <p className="text-xs text-gray-400">左右滑动屏幕控制队伍移动</p>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-slate-800/50 p-4 rounded-xl border border-white/5 hover:border-blue-500/30 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 text-green-400 flex items-center justify-center text-xl">🚪</div>
                <div>
                    <h3 className="font-bold text-white text-sm">射击增益门</h3>
                    <p className="text-xs text-gray-400">攻击传送门以提升Buff效果</p>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setGameState(GameState.PLAYING)}
              className="group relative w-full py-5 bg-blue-600 hover:bg-blue-500 transition-all rounded-xl font-bold text-2xl overflow-hidden shadow-[0_0_20px_rgba(37,99,235,0.3)] active:scale-95 duration-150"
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
              开始任务
            </button>
          </div>
        </div>
      )}

      {/* Game Over Overlay */}
      {gameState === GameState.GAME_OVER && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-red-950/90 backdrop-blur-md">
           <div className="text-center p-12 max-w-md w-full bg-black/40 border border-red-500/30 rounded-3xl animate-in fade-in zoom-in duration-300">
            <h2 className="text-6xl font-black mb-2 text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]">任务失败</h2>
            <p className="text-red-200/50 mb-8 uppercase tracking-widest text-sm">防线已被突破</p>
            
            <div className="mb-10 py-6 bg-red-500/10 rounded-xl border border-red-500/20">
               <p className="text-gray-400 uppercase text-xs tracking-widest mb-2">最终得分</p>
               <p className="text-5xl font-mono font-bold text-white">{score}</p>
            </div>
            
            <button 
              onClick={() => setGameState(GameState.PLAYING)}
              className="w-full py-4 bg-white text-black hover:bg-gray-200 transition-all rounded-xl font-bold text-lg shadow-lg mb-4"
            >
              重新开始
            </button>
            <button 
              onClick={() => setGameState(GameState.MENU)}
              className="w-full py-4 text-white/50 hover:text-white hover:bg-white/5 transition-all rounded-xl text-sm font-semibold"
            >
              返回主菜单
            </button>
          </div>
        </div>
      )}
    </div>
  );
}