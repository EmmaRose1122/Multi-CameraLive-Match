import React, { useState, useEffect, useRef } from 'react';
import {
  RotateCcw,
  Play,
  Pause,
  Download,
  HardDrive,
  Cpu,
  Zap,
  Film,
  Sparkles,
  CheckCircle2,
  Share2,
  Tv,
  Maximize2,
  Eye,
} from 'lucide-react';
import { SwitcherState, ReplayClip, ScoreboardState, ReplayTransitionType } from '../../types/broadcast';
import { globalReplayBuffer } from '../../services/rollingReplayBuffer';
import { soundFxService } from '../../services/soundFxService';

interface InstantReplayDeckProps {
  switcherState: SwitcherState;
  setSwitcherState: React.Dispatch<React.SetStateAction<SwitcherState>>;
  scoreboard: ScoreboardState;
  onSaveToDrive: (clipBlob: Blob, clipName: string, metadata: any) => void;
}

export const InstantReplayDeck: React.FC<InstantReplayDeckProps> = ({
  switcherState,
  setSwitcherState,
  scoreboard,
  onSaveToDrive,
}) => {
  const [bufferStats, setBufferStats] = useState(globalReplayBuffer.getBufferStats());
  const [selectedSpeed, setSelectedSpeed] = useState<number>(0.5);
  const [replayClips, setReplayClips] = useState<ReplayClip[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const transitionAnimRef = useRef<number | null>(null);

  // Poll buffer stats
  useEffect(() => {
    const interval = setInterval(() => {
      setBufferStats(globalReplayBuffer.getBufferStats());
    }, 400);
    return () => clearInterval(interval);
  }, []);

  // Cleanup anim on unmount
  useEffect(() => {
    return () => {
      if (transitionAnimRef.current) {
        cancelAnimationFrame(transitionAnimRef.current);
      }
    };
  }, []);

  const handleSpeedChange = (spd: number) => {
    setSelectedSpeed(spd);
    if (switcherState.isReplayActive) {
      globalReplayBuffer.setReplaySpeed(spd);
      setSwitcherState((prev) => ({
        ...prev,
        replaySpeed: spd,
      }));
    }
  };

  /**
   * Execute Replay Transition In (Live -> Replay Clip)
   */
  const handleTriggerReplay = (durationSec: number, speed: number = selectedSpeed) => {
    if (transitionAnimRef.current) {
      cancelAnimationFrame(transitionAnimRef.current);
    }

    const transitionType = switcherState.replayTransitionType || 'glitch';
    const durationMs = switcherState.replayTransitionDurationMs || 450;
    const startTime = performance.now();

    // Trigger crisp Web Audio broadcast sound effect
    soundFxService.playReplayStinger(transitionType);

    setSwitcherState((prev) => ({
      ...prev,
      isReplayTransitioning: true,
      replayTransitionProgress: 0,
      replayTransitionDirection: 'in',
    }));

    let bufferTriggered = false;

    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / durationMs);

      // At transition apex (50%), engage the RAM replay buffer playback
      if (progress >= 0.5 && !bufferTriggered) {
        bufferTriggered = true;
        const success = globalReplayBuffer.triggerInstantReplay(durationSec, speed, () => {
          // On replay buffer playback complete: transition back to live program feed
          handleTransitionToLive();
        });

        if (success) {
          setSwitcherState((prev) => ({
            ...prev,
            isReplayActive: true,
            replaySpeed: speed,
            replayProgress: 0,
          }));
        }
      }

      setSwitcherState((prev) => ({
        ...prev,
        replayTransitionProgress: progress,
      }));

      if (progress < 1) {
        transitionAnimRef.current = requestAnimationFrame(step);
      } else {
        setSwitcherState((prev) => ({
          ...prev,
          isReplayTransitioning: false,
          replayTransitionProgress: 0,
        }));
      }
    };

    transitionAnimRef.current = requestAnimationFrame(step);
  };

  /**
   * Execute Replay Transition Out (Replay Clip -> Live Program)
   */
  const handleTransitionToLive = () => {
    if (transitionAnimRef.current) {
      cancelAnimationFrame(transitionAnimRef.current);
    }

    const transitionType = switcherState.replayTransitionType || 'glitch';
    const durationMs = switcherState.replayTransitionDurationMs || 450;
    const startTime = performance.now();

    // Trigger audio stinger
    soundFxService.playReplayStinger(transitionType);

    setSwitcherState((prev) => ({
      ...prev,
      isReplayTransitioning: true,
      replayTransitionProgress: 0,
      replayTransitionDirection: 'out',
    }));

    let liveCutDone = false;

    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / durationMs);

      if (progress >= 0.5 && !liveCutDone) {
        liveCutDone = true;
        globalReplayBuffer.stopReplay();
        setSwitcherState((prev) => ({
          ...prev,
          isReplayActive: false,
          replayProgress: 0,
        }));
      }

      setSwitcherState((prev) => ({
        ...prev,
        replayTransitionProgress: progress,
      }));

      if (progress < 1) {
        transitionAnimRef.current = requestAnimationFrame(step);
      } else {
        setSwitcherState((prev) => ({
          ...prev,
          isReplayTransitioning: false,
          replayTransitionProgress: 0,
        }));
      }
    };

    transitionAnimRef.current = requestAnimationFrame(step);
  };

  const handleStopReplayDirect = () => {
    handleTransitionToLive();
  };

  /**
   * Test/Preview Stinger Transition on Program Monitor
   */
  const handlePreviewTransition = () => {
    if (transitionAnimRef.current) {
      cancelAnimationFrame(transitionAnimRef.current);
    }

    const transitionType = switcherState.replayTransitionType || 'glitch';
    const durationMs = switcherState.replayTransitionDurationMs || 500;
    const startTime = performance.now();

    soundFxService.playReplayStinger(transitionType);

    setSwitcherState((prev) => ({
      ...prev,
      isReplayTransitioning: true,
      replayTransitionProgress: 0,
      replayTransitionDirection: prev.isReplayActive ? 'out' : 'in',
    }));

    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / durationMs);

      setSwitcherState((prev) => ({
        ...prev,
        replayTransitionProgress: progress,
      }));

      if (progress < 1) {
        transitionAnimRef.current = requestAnimationFrame(step);
      } else {
        setSwitcherState((prev) => ({
          ...prev,
          isReplayTransitioning: false,
          replayTransitionProgress: 0,
        }));
      }
    };

    transitionAnimRef.current = requestAnimationFrame(step);
  };

  const handleExportClip = async (durationSec: number = 10, saveToDrive: boolean = false) => {
    try {
      setIsExporting(true);
      const currentMin = Math.max(1, Math.floor(scoreboard.matchSeconds / 60));
      const res = await globalReplayBuffer.exportReplayClipBlob(durationSec);

      const clipTitle = `Replay_Min${currentMin}_${Date.now()}`;
      const newClip: ReplayClip = {
        id: `clip_${Date.now()}`,
        title: `${scoreboard.homeTeam.shortName} vs ${scoreboard.awayTeam.shortName} - Min ${currentMin}' Replay`,
        cameraAngle: 'Program Composite',
        durationSec,
        playbackSpeed: selectedSpeed,
        recordedAt: Date.now(),
        matchMinute: currentMin,
        blobUrl: res.url,
      };

      setReplayClips((prev) => [newClip, ...prev]);

      if (saveToDrive) {
        onSaveToDrive(res.blob, `${clipTitle}.webm`, {
          matchTitle: `${scoreboard.homeTeam.name} vs ${scoreboard.awayTeam.name}`,
          minute: currentMin,
          eventType: 'Instant Replay Highlight',
          cameraAngle: 'Program Multi-Cam',
        });
      } else {
        // Direct local download
        const a = document.createElement('a');
        a.href = res.url;
        a.download = `${clipTitle}.webm`;
        a.click();
      }
    } catch (err) {
      console.error('Replay export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 shadow-2xl select-none flex flex-col gap-3.5">
      {/* Title & Buffer Health */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <RotateCcw className="w-4 h-4 text-red-400" />
          <h2 className="text-sm font-semibold text-white uppercase tracking-tight">
            RAM Rolling Instant Replay Deck (Zero Flash Wear)
          </h2>
          {switcherState.isReplayTransitioning && (
            <span className="px-2 py-0.5 rounded-full bg-red-600/90 text-white font-mono text-[10px] font-bold animate-pulse">
              TRANSITIONING: {switcherState.replayTransitionType.toUpperCase()}
            </span>
          )}
        </div>

        {/* RAM Footprint Telemetry */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 text-white/80 font-mono">
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            <span>RAM Buffer: {bufferStats.memoryMB} MB</span>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold">
            <Zap className="w-3 h-3" />
            <span>{bufferStats.durationSeconds}s / {bufferStats.maxDurationSeconds}s Ready</span>
          </div>
        </div>
      </div>

      {/* Broadcast Replay Transition Effect Stinger Control Bar */}
      <div className="bg-gradient-to-r from-red-950/40 via-black/50 to-sky-950/40 p-3 rounded-xl border border-white/10 flex flex-col sm:flex-row flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Replay Transition:
          </span>

          {/* Transition Effect Mode Selector */}
          <div className="flex items-center gap-1 bg-black/50 p-1 rounded-lg border border-white/10">
            <button
              id="btn-replay-trans-glitch"
              onClick={() => setSwitcherState((p) => ({ ...p, replayTransitionType: 'glitch' }))}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-colors flex items-center gap-1.5 ${
                switcherState.replayTransitionType === 'glitch'
                  ? 'bg-red-600 text-white shadow-md shadow-red-900/40'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
              title="Digital chromatic scanline glitch effect with RGB slice displacement"
            >
              <Zap className="w-3 h-3" />
              <span>Glitch</span>
            </button>

            <button
              id="btn-replay-trans-zoom"
              onClick={() => setSwitcherState((p) => ({ ...p, replayTransitionType: 'zoom' }))}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-colors flex items-center gap-1.5 ${
                switcherState.replayTransitionType === 'zoom'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-900/40'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
              title="High-velocity optical zoom impact with radial motion burst"
            >
              <Maximize2 className="w-3 h-3" />
              <span>Zoom</span>
            </button>

            <button
              id="btn-replay-trans-stinger"
              onClick={() => setSwitcherState((p) => ({ ...p, replayTransitionType: 'stinger-flash' }))}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-colors flex items-center gap-1.5 ${
                switcherState.replayTransitionType === 'stinger-flash'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-900/40'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
              title="Sports broadcast chevron wipe stinger with gold accents"
            >
              <Sparkles className="w-3 h-3" />
              <span>Stinger</span>
            </button>
          </div>
        </div>

        {/* Transition Duration & Test Trigger */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-black/50 p-1 rounded-lg border border-white/10">
            <span className="text-[10px] text-white/40 font-mono px-1">Dur:</span>
            {[350, 450, 700].map((ms) => (
              <button
                key={ms}
                onClick={() => setSwitcherState((p) => ({ ...p, replayTransitionDurationMs: ms }))}
                className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                  switcherState.replayTransitionDurationMs === ms
                    ? 'bg-white/20 text-white font-bold'
                    : 'text-white/40 hover:text-white hover:bg-white/5'
                }`}
              >
                {ms}ms
              </button>
            ))}
          </div>

          <button
            id="btn-preview-replay-transition"
            onClick={handlePreviewTransition}
            disabled={switcherState.isReplayTransitioning}
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/10 flex items-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
            title="Preview stinger transition effect on Program monitor"
          >
            <Eye className="w-3.5 h-3.5 text-sky-400" />
            <span>Test Stinger</span>
          </button>
        </div>
      </div>

      {/* Main Control Row */}
      <div className="bg-black/40 backdrop-blur-md p-3.5 rounded-xl border border-white/10 flex flex-col sm:flex-row flex-wrap items-center justify-between gap-3">
        {/* Speed Controls */}
        <div className="flex flex-col gap-1 w-full lg:w-auto">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-white/40 mr-1">Speed:</span>
            {[0.25, 0.5, 0.75, 1.0].map((spd) => (
              <button
                key={spd}
                id={`btn-speed-${spd}`}
                onClick={() => handleSpeedChange(spd)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors ${
                  selectedSpeed === spd
                    ? 'bg-red-600 text-white shadow-lg shadow-red-900/30'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-1 px-1">
            <span className="text-[10px] text-white/40 font-mono">0.25x</span>
            <input
              type="range"
              min="0.25"
              max="1"
              step="0.05"
              value={selectedSpeed}
              onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
              className="flex-1 accent-red-600 h-1.5 bg-white/10 rounded-full appearance-none outline-none"
            />
            <span className="text-[10px] text-white/40 font-mono">1.0x</span>
            <span className="text-xs font-bold text-white w-8 text-right">{selectedSpeed.toFixed(2)}x</span>
          </div>
        </div>

        {/* Instant Trigger Quick Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-center">
          <button
            id="btn-replay-5s"
            onClick={() => handleTriggerReplay(5, selectedSpeed)}
            disabled={switcherState.isReplayTransitioning}
            className="px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-red-900/30 active:scale-95 transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>5s Replay</span>
          </button>

          <button
            id="btn-replay-10s"
            onClick={() => handleTriggerReplay(10, selectedSpeed)}
            disabled={switcherState.isReplayTransitioning}
            className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-blue-900/30 active:scale-95 transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>10s Replay</span>
          </button>

          <button
            id="btn-replay-15s"
            onClick={() => handleTriggerReplay(15, selectedSpeed)}
            disabled={switcherState.isReplayTransitioning}
            className="px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-amber-900/30 active:scale-95 transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>15s Replay</span>
          </button>

          {switcherState.isReplayActive && (
            <button
              id="btn-stop-replay"
              onClick={handleStopReplayDirect}
              disabled={switcherState.isReplayTransitioning}
              className="px-3.5 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-bold uppercase tracking-wider border border-white/20 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Pause className="w-3.5 h-3.5 text-amber-400" />
              <span>Cut to Live</span>
            </button>
          )}
        </div>

        {/* Clip Export Actions */}
        <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
          <button
            id="btn-export-local-clip"
            disabled={isExporting}
            onClick={() => handleExportClip(10, false)}
            className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors border border-white/10 flex items-center gap-1.5 disabled:opacity-50"
            title="Download Instant Replay WebM Video"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>{isExporting ? 'Generating...' : 'Save WebM'}</span>
          </button>

          <button
            id="btn-export-drive-clip"
            disabled={isExporting}
            onClick={() => handleExportClip(10, true)}
            className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/30 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            title="Upload Highlight Clip to Google Drive"
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Save to Drive</span>
          </button>
        </div>
      </div>

      {/* Replay Clips Highlight Reel */}
      {replayClips.length > 0 && (
        <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
          <span className="text-xs font-bold text-white/40 uppercase tracking-wider flex items-center gap-1">
            <Film className="w-3.5 h-3.5 text-sky-400" />
            Generated Match Replay Clips ({replayClips.length})
          </span>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {replayClips.map((c, idx) => (
              <div
                key={`replay-clip-${c.id}-${idx}`}
                className="bg-black/40 backdrop-blur-md p-2 rounded-lg border border-white/10 flex items-center gap-2.5 shrink-0 text-xs text-white/80"
              >
                <div className="w-8 h-8 rounded bg-red-950/60 border border-red-500/30 flex items-center justify-center text-red-400 font-bold">
                  {c.durationSec}s
                </div>
                <div>
                  <p className="font-bold text-white text-[11px] truncate max-w-[150px]">
                    {c.title}
                  </p>
                  <p className="text-[10px] text-white/40">Min {c.matchMinute}' • {c.playbackSpeed}x</p>
                </div>
                {c.blobUrl && (
                  <a
                    href={c.blobUrl}
                    download={`${c.title}.webm`}
                    className="p-1 rounded bg-white/10 hover:bg-white/20 text-sky-400 border border-white/10"
                  >
                    <Download className="w-3 h-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
