import React, { useState } from 'react';
import {
  Trophy,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  Plus,
  Minus,
  Check,
  Palette,
  Eye,
  EyeOff,
  Type,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ScoreboardState, MatchPeriod, ScoreboardTheme, MatchEvent } from '../../types/broadcast';

interface ScoreboardOverlayPanelProps {
  scoreboard: ScoreboardState;
  setScoreboard: React.Dispatch<React.SetStateAction<ScoreboardState>>;
  onTriggerEvent: (event: Partial<MatchEvent>) => void;
}

export const ScoreboardOverlayPanel: React.FC<ScoreboardOverlayPanelProps> = ({
  scoreboard,
  setScoreboard,
  onTriggerEvent,
}) => {
  const [goalScorer, setGoalScorer] = useState('Haaland');
  const [cardPlayer, setCardPlayer] = useState('Vinicius Jr');
  const [subInPlayer, setSubInPlayer] = useState('Foden');
  const [subOutPlayer, setSubOutPlayer] = useState('Grealish');

  // Clock format
  const min = Math.floor(scoreboard.matchSeconds / 60);
  const sec = scoreboard.matchSeconds % 60;
  const timeStr = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;

  const toggleClock = () => {
    setScoreboard((prev) => ({ ...prev, isRunning: !prev.isRunning }));
  };

  const resetClock = () => {
    setScoreboard((prev) => ({ ...prev, matchSeconds: 0, isRunning: false }));
  };

  const setPeriod = (period: MatchPeriod) => {
    let defaultSeconds = 0;
    if (period === '2H') defaultSeconds = 45 * 60;
    if (period === 'ET1') defaultSeconds = 90 * 60;
    if (period === 'ET2') defaultSeconds = 105 * 60;

    setScoreboard((prev) => ({
      ...prev,
      period,
      matchSeconds: defaultSeconds,
    }));
  };

  const triggerGoal = (team: 'home' | 'away') => {
    const teamName = team === 'home' ? scoreboard.homeTeam.name : scoreboard.awayTeam.name;
    const currentMin = Math.max(1, Math.floor(scoreboard.matchSeconds / 60));

    // Fire Confetti Celebration
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });

    // Update Score
    setScoreboard((prev) => ({
      ...prev,
      homeTeam: {
        ...prev.homeTeam,
        score: team === 'home' ? prev.homeTeam.score + 1 : prev.homeTeam.score,
      },
      awayTeam: {
        ...prev.awayTeam,
        score: team === 'away' ? prev.awayTeam.score + 1 : prev.awayTeam.score,
      },
      activeBanner: {
        id: `goal_${Date.now()}`,
        type: 'goal',
        title: `⚽ GOAL! ${teamName.toUpperCase()}`,
        subtitle: `${goalScorer} (${currentMin}') • Score: ${
          team === 'home' ? prev.homeTeam.score + 1 : prev.homeTeam.score
        } - ${team === 'away' ? prev.awayTeam.score + 1 : prev.awayTeam.score}`,
        color: '#22c55e',
        expiresAt: Date.now() + 8000,
      },
    }));

    onTriggerEvent({
      type: 'goal',
      team,
      player: goalScorer,
      minute: currentMin,
    });
  };

  const triggerYellowCard = (team: 'home' | 'away') => {
    const currentMin = Math.max(1, Math.floor(scoreboard.matchSeconds / 60));
    setScoreboard((prev) => ({
      ...prev,
      activeBanner: {
        id: `card_${Date.now()}`,
        type: 'yellow-card',
        title: '🟨 YELLOW CARD',
        subtitle: `${cardPlayer} (${team === 'home' ? prev.homeTeam.shortName : prev.awayTeam.shortName}) - ${currentMin}'`,
        color: '#eab308',
        expiresAt: Date.now() + 6000,
      },
    }));

    onTriggerEvent({
      type: 'yellow-card',
      team,
      player: cardPlayer,
      minute: currentMin,
    });
  };

  const triggerRedCard = (team: 'home' | 'away') => {
    const currentMin = Math.max(1, Math.floor(scoreboard.matchSeconds / 60));
    setScoreboard((prev) => ({
      ...prev,
      activeBanner: {
        id: `red_${Date.now()}`,
        type: 'red-card',
        title: '🟥 RED CARD (SENDING OFF)',
        subtitle: `${cardPlayer} (${team === 'home' ? prev.homeTeam.shortName : prev.awayTeam.shortName}) - ${currentMin}'`,
        color: '#ef4444',
        expiresAt: Date.now() + 7000,
      },
    }));

    onTriggerEvent({
      type: 'red-card',
      team,
      player: cardPlayer,
      minute: currentMin,
    });
  };

  const triggerSubstitution = (team: 'home' | 'away') => {
    const currentMin = Math.max(1, Math.floor(scoreboard.matchSeconds / 60));
    setScoreboard((prev) => ({
      ...prev,
      activeBanner: {
        id: `sub_${Date.now()}`,
        type: 'substitution',
        title: '🔄 SUBSTITUTION',
        subtitle: `IN: 🟢 ${subInPlayer}  |  OUT: 🔴 ${subOutPlayer} (${currentMin}')`,
        color: '#06b6d4',
        expiresAt: Date.now() + 6000,
      },
    }));

    onTriggerEvent({
      type: 'substitution',
      team,
      player: subInPlayer,
      subIn: subInPlayer,
      subOut: subOutPlayer,
      minute: currentMin,
    });
  };

  const triggerVarReview = () => {
    setScoreboard((prev) => ({
      ...prev,
      activeBanner: {
        id: `var_${Date.now()}`,
        type: 'var',
        title: '🔍 VAR REVIEW IN PROGRESS',
        subtitle: 'Possible Penalty / Offside Check • Referee Reviewing On-Screen',
        color: '#f97316',
        expiresAt: Date.now() + 10000,
      },
    }));
  };

  const triggerStoppageTime = (mins: number) => {
    setScoreboard((prev) => ({
      ...prev,
      stoppageMinutes: mins,
      activeBanner: {
        id: `stoppage_${Date.now()}`,
        type: 'stoppage',
        title: `⏱️ +${mins} MINUTES ADDED TIME`,
        subtitle: `Minimum of ${mins} additional minutes to be played in this half`,
        color: '#3b82f6',
        expiresAt: Date.now() + 6000,
      },
    }));
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 shadow-2xl select-none flex flex-col gap-4">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-white uppercase tracking-tight">
            Live Scoreboard & Graphics Overlay Desk
          </h2>
        </div>

        {/* Master Overlay Visibility Toggle */}
        <button
          id="btn-toggle-scoreboard-vis"
          onClick={() => setScoreboard((p) => ({ ...p, showScoreboard: !p.showScoreboard }))}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            scoreboard.showScoreboard
              ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/50 shadow-md shadow-emerald-950/40'
              : 'bg-white/5 text-white/50 border border-white/10'
          }`}
        >
          {scoreboard.showScoreboard ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          <span>{scoreboard.showScoreboard ? 'Overlay ON' : 'Overlay OFF'}</span>
        </button>
      </div>

      {/* Row 1: Match Clock Engine */}
      <div className="bg-black/40 backdrop-blur-md p-3 rounded-xl border border-white/10 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Big Digital Clock Display */}
        <div className="flex items-center gap-3">
          <div className="bg-black/60 px-4 py-2 rounded-lg border border-white/10 flex items-center gap-2 font-mono text-2xl font-black text-sky-400 shadow-inner">
            <Clock className="w-5 h-5 text-sky-400" />
            <span>{timeStr}</span>
            {scoreboard.stoppageMinutes > 0 && (
              <span className="text-sm text-amber-300 font-bold">+{scoreboard.stoppageMinutes}</span>
            )}
          </div>

          {/* Start/Pause/Reset */}
          <div className="flex items-center gap-1.5">
            <button
              id="btn-toggle-match-clock"
              onClick={toggleClock}
              className={`p-2.5 rounded-xl font-bold transition-colors ${
                scoreboard.isRunning
                  ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/30'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30'
              }`}
            >
              {scoreboard.isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>

            <button
              id="btn-reset-match-clock"
              onClick={resetClock}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 border border-white/10 transition-colors"
              title="Reset Clock to 00:00"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Half / Period Selector */}
        <div className="flex flex-wrap items-center gap-1">
          {(['1H', 'HT', '2H', 'ET1', 'ET2', 'PEN', 'FT'] as MatchPeriod[]).map((p) => (
            <button
              key={p}
              id={`btn-period-${p}`}
              onClick={() => setPeriod(p)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors ${
                scoreboard.period === p
                  ? 'bg-red-600 text-white shadow-lg shadow-red-900/30'
                  : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/10'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Row 2: Teams & Live Score Adjusters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* HOME TEAM */}
        <div className="bg-black/40 backdrop-blur-md p-3 rounded-xl border border-white/10 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-md bg-sky-500 shadow-sm"></span>
              <input
                type="text"
                value={scoreboard.homeTeam.name}
                onChange={(e) =>
                  setScoreboard((p) => ({
                    ...p,
                    homeTeam: { ...p.homeTeam, name: e.target.value, shortName: e.target.value.substring(0, 3).toUpperCase() },
                  }))
                }
                className="bg-black/30 px-2 py-0.5 rounded border border-white/10 font-bold text-white text-sm focus:outline-none focus:border-sky-500 w-32"
              />
            </div>

            {/* Score Stepper */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() =>
                  setScoreboard((p) => ({
                    ...p,
                    homeTeam: { ...p.homeTeam, score: Math.max(0, p.homeTeam.score - 1) },
                  }))
                }
                className="p-1 rounded-lg bg-white/10 text-white/70 hover:text-white border border-white/10"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono font-black text-xl text-white w-6 text-center">
                {scoreboard.homeTeam.score}
              </span>
              <button
                onClick={() => triggerGoal('home')}
                className="px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1 shadow-lg shadow-sky-900/30"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+1 GOAL</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 pt-2 border-t border-white/10 text-xs">
            <button
              onClick={() => triggerYellowCard('home')}
              className="px-2 py-1 rounded-lg bg-amber-950/60 text-amber-300 hover:bg-amber-600 hover:text-slate-950 font-semibold border border-amber-800/60 transition-colors"
            >
              🟨 Yellow
            </button>
            <button
              onClick={() => triggerRedCard('home')}
              className="px-2 py-1 rounded-lg bg-rose-950/60 text-rose-300 hover:bg-rose-600 hover:text-white font-semibold border border-rose-800/60 transition-colors"
            >
              🟥 Red
            </button>
            <button
              onClick={() => triggerSubstitution('home')}
              className="px-2 py-1 rounded-lg bg-cyan-950/60 text-cyan-300 hover:bg-cyan-600 hover:text-white font-semibold border border-cyan-800/60 transition-colors"
            >
              🔄 Sub
            </button>
          </div>
        </div>

        {/* AWAY TEAM */}
        <div className="bg-black/40 backdrop-blur-md p-3 rounded-xl border border-white/10 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-md bg-rose-500 shadow-sm"></span>
              <input
                type="text"
                value={scoreboard.awayTeam.name}
                onChange={(e) =>
                  setScoreboard((p) => ({
                    ...p,
                    awayTeam: { ...p.awayTeam, name: e.target.value, shortName: e.target.value.substring(0, 3).toUpperCase() },
                  }))
                }
                className="bg-black/30 px-2 py-0.5 rounded border border-white/10 font-bold text-white text-sm focus:outline-none focus:border-rose-500 w-32"
              />
            </div>

            {/* Score Stepper */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() =>
                  setScoreboard((p) => ({
                    ...p,
                    awayTeam: { ...p.awayTeam, score: Math.max(0, p.awayTeam.score - 1) },
                  }))
                }
                className="p-1 rounded-lg bg-white/10 text-white/70 hover:text-white border border-white/10"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono font-black text-xl text-white w-6 text-center">
                {scoreboard.awayTeam.score}
              </span>
              <button
                onClick={() => triggerGoal('away')}
                className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1 shadow-lg shadow-rose-900/30"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+1 GOAL</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 pt-2 border-t border-white/10 text-xs">
            <button
              onClick={() => triggerYellowCard('away')}
              className="px-2 py-1 rounded-lg bg-amber-950/60 text-amber-300 hover:bg-amber-600 hover:text-slate-950 font-semibold border border-amber-800/60 transition-colors"
            >
              🟨 Yellow
            </button>
            <button
              onClick={() => triggerRedCard('away')}
              className="px-2 py-1 rounded-lg bg-rose-950/60 text-rose-300 hover:bg-rose-600 hover:text-white font-semibold border border-rose-800/60 transition-colors"
            >
              🟥 Red
            </button>
            <button
              onClick={() => triggerSubstitution('away')}
              className="px-2 py-1 rounded-lg bg-cyan-950/60 text-cyan-300 hover:bg-cyan-600 hover:text-white font-semibold border border-cyan-800/60 transition-colors"
            >
              🔄 Sub
            </button>
          </div>
        </div>
      </div>

      {/* Row 3: Special Broadcast Badges (VAR, Stoppage, Scoreboard Theme) */}
      <div className="bg-black/40 backdrop-blur-md p-3 rounded-xl border border-white/10 flex flex-wrap items-center justify-between gap-3">
        {/* Quick Popups */}
        <div className="flex items-center gap-2">
          <button
            id="btn-trigger-var"
            onClick={triggerVarReview}
            className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-orange-900/30 transition-colors"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>VAR Check</span>
          </button>

          <div className="flex items-center gap-1 bg-black/50 px-2.5 py-1 rounded-lg border border-white/10 text-xs">
            <span className="text-white/40 font-bold">Stoppage:</span>
            {[1, 2, 3, 4, 5, 6].map((m) => (
              <button
                key={m}
                onClick={() => triggerStoppageTime(m)}
                className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-bold transition-colors ${
                  scoreboard.stoppageMinutes === m
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/40'
                    : 'bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                +{m}
              </button>
            ))}
          </div>
        </div>

        {/* Scoreboard Broadcast Theme Selector */}
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-bold text-white/40">Theme:</span>
          {(
            [
              { id: 'premier', label: 'Premier League' },
              { id: 'champions', label: 'Champions League' },
              { id: 'modern-dark', label: 'Modern Dark' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setScoreboard((p) => ({ ...p, theme: t.id }))}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                scoreboard.theme === t.id
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/30'
                  : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/10'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Row 4: Interactive Lower Third Editor */}
      <div className="bg-black/40 backdrop-blur-md p-3 rounded-xl border border-white/10 flex flex-col gap-3">
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-2">
             <Type className="w-4 h-4 text-emerald-400" />
             <span className="text-xs font-bold text-white uppercase tracking-tight">Custom Lower Third Engine</span>
           </div>
           
           <button
             onClick={() => setScoreboard((p) => ({ ...p, showLowerThird: !p.showLowerThird }))}
             className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
               scoreboard.showLowerThird
                 ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
                 : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10 hover:text-white'
             }`}
           >
             {scoreboard.showLowerThird ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
             <span>{scoreboard.showLowerThird ? 'Lower Third LIVE' : 'Lower Third OFF'}</span>
           </button>
        </div>
        
        <div className="flex flex-col md:flex-row gap-3">
           <div className="flex-1 flex flex-col gap-1">
             <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Primary Title</label>
             <input
               type="text"
               value={scoreboard.customLowerThird?.title || ''}
               onChange={(e) => setScoreboard((p) => ({
                 ...p,
                 customLowerThird: { ...p.customLowerThird, title: e.target.value }
               }))}
               placeholder="e.g. JOHN SMITH"
               className="bg-black/30 border border-white/10 rounded px-2.5 py-1.5 text-sm text-white font-bold focus:outline-none focus:border-emerald-500/50 focus:bg-black/50 transition-colors"
             />
           </div>
           <div className="flex-1 flex flex-col gap-1">
             <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Secondary Subtitle</label>
             <input
               type="text"
               value={scoreboard.customLowerThird?.subtitle || ''}
               onChange={(e) => setScoreboard((p) => ({
                 ...p,
                 customLowerThird: { ...p.customLowerThird, subtitle: e.target.value }
               }))}
               placeholder="e.g. Lead Commentator"
               className="bg-black/30 border border-white/10 rounded px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:bg-black/50 transition-colors"
             />
           </div>
        </div>
      </div>
    </div>
  );
};
