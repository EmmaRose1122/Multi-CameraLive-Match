import React, { useState, useEffect } from 'react';

export type VuMeterDisplayMode = 'ladder' | 'gradient';

interface DynamicVuMeterProps {
  levelL: number; // 0.0 to 1.0 (or normalized RMS)
  levelR?: number; // 0.0 to 1.0 (optional for stereo)
  peakL?: number; // 0.0 to 1.0 peak hold
  peakR?: number; // 0.0 to 1.0 peak hold
  isClipping?: boolean;
  muted?: boolean;
  orientation?: 'vertical' | 'horizontal';
  height?: string | number;
  width?: string | number;
  meterMode?: VuMeterDisplayMode;
  showLabels?: boolean;
  showNumericDb?: boolean;
  channelName?: string;
  segmentsCount?: number;
  className?: string;
  onClearClip?: () => void;
}

// Convert 0..1 linear audio amplitude to approximate dBFS (-60 to +6 dBFS)
const linearToDbfs = (val: number): number => {
  if (val <= 0.001) return -60;
  const db = 20 * Math.log10(val * 1.5);
  return Math.max(-60, Math.min(6, db));
};

export const DynamicVuMeter: React.FC<DynamicVuMeterProps> = ({
  levelL = 0,
  levelR,
  peakL,
  peakR,
  isClipping = false,
  muted = false,
  orientation = 'vertical',
  height = '100%',
  width,
  meterMode = 'ladder',
  showLabels = true,
  showNumericDb = false,
  channelName,
  segmentsCount = 18,
  className = '',
  onClearClip,
}) => {
  // Sticky clip indicator: holds clipping state for at least 1.5 seconds so operator catches momentary audio spikes
  const [stickyClip, setStickyClip] = useState(false);

  useEffect(() => {
    if (isClipping) {
      setStickyClip(true);
      const timer = setTimeout(() => {
        setStickyClip(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isClipping]);

  const hasStereo = levelR !== undefined;
  // Dynamic headroom boost for visible meter ballistics
  const effectiveLevelL = muted ? 0 : Math.min(1.0, Math.max(0, levelL * 1.6));
  const effectiveLevelR = muted ? 0 : hasStereo ? Math.min(1.0, Math.max(0, (levelR ?? 0) * 1.6)) : effectiveLevelL;

  const effectivePeakL = muted ? 0 : Math.min(1.0, Math.max(0, (peakL ?? levelL) * 1.6));
  const effectivePeakR = muted ? 0 : Math.min(1.0, Math.max(0, (peakR ?? levelR ?? levelL) * 1.6));

  const percentL = Math.min(100, Math.max(0, Math.round(effectiveLevelL * 100)));
  const percentR = Math.min(100, Math.max(0, Math.round(effectiveLevelR * 100)));
  const peakPercentL = Math.min(100, Math.max(0, Math.round(effectivePeakL * 100)));
  const peakPercentR = Math.min(100, Math.max(0, Math.round(effectivePeakR * 100)));

  const maxLevel = Math.max(effectiveLevelL, effectiveLevelR);
  const currentDb = linearToDbfs(maxLevel);

  // Dynamic CSS status color calculation
  const getLevelColor = (level: number) => {
    if (level >= 0.85 || isClipping || stickyClip) return 'text-red-500 font-bold';
    if (level >= 0.58) return 'text-amber-400 font-semibold';
    return 'text-emerald-400';
  };

  // Generate discrete LED segments with calculated color thresholds
  const segments = Array.from({ length: segmentsCount }, (_, i) => {
    const threshold = (segmentsCount - 1 - i) / segmentsCount;
    // Broadcast audio color zones:
    // Green: nominal safe zone (0% to ~58%)
    // Yellow/Amber: warning headroom zone (~58% to 82%)
    // Red: critical clipping zone (82% to 100%)
    let zone: 'green' | 'yellow' | 'red';
    let baseBg: string;
    let litBg: string;
    let litShadow: string;

    if (threshold >= 0.82) {
      zone = 'red';
      baseBg = 'bg-red-950/30';
      litBg = 'bg-red-500';
      litShadow = 'shadow-[0_0_8px_rgba(239,68,68,0.85)]';
    } else if (threshold >= 0.58) {
      zone = 'yellow';
      baseBg = 'bg-amber-950/30';
      litBg = 'bg-amber-400';
      litShadow = 'shadow-[0_0_6px_rgba(251,191,36,0.7)]';
    } else {
      zone = 'green';
      baseBg = 'bg-emerald-950/30';
      litBg = 'bg-emerald-500';
      litShadow = 'shadow-[0_0_5px_rgba(16,185,129,0.6)]';
    }

    return { index: i, threshold, zone, baseBg, litBg, litShadow };
  });

  const handleClipClick = () => {
    setStickyClip(false);
    if (onClearClip) onClearClip();
  };

  // Horizontal Multi-Stream Meter Mode
  if (orientation === 'horizontal') {
    return (
      <div className={`flex flex-col gap-1 w-full select-none ${className}`}>
        {/* Header with channel name and clipping status */}
        <div className="flex items-center justify-between text-[9px] font-mono">
          <div className="flex items-center gap-1.5 truncate">
            {channelName && <span className="text-slate-200 font-bold truncate">{channelName}</span>}
            <span className={`font-mono text-[9px] ${getLevelColor(maxLevel)}`}>
              {muted ? 'MUTED' : `${currentDb <= -55 ? '-∞' : currentDb.toFixed(1)} dBFS`}
            </span>
          </div>

          <button
            onClick={handleClipClick}
            type="button"
            className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider transition-all duration-150 ${
              stickyClip || isClipping
                ? 'bg-red-600 text-white shadow-[0_0_10px_rgba(239,68,68,0.9)] animate-pulse cursor-pointer'
                : 'bg-black/60 text-slate-600 border border-white/5'
            }`}
            title="Click to reset Clip alarm"
          >
            CLIP
          </button>
        </div>

        {/* Horizontal Dynamic Bar */}
        <div className="h-3 w-full bg-black/90 rounded p-0.5 border border-white/10 flex flex-col gap-0.5 relative overflow-hidden shadow-inner">
          {/* Channel Left */}
          <div className="flex-1 bg-slate-950 rounded-xs relative overflow-hidden">
            <div
              className="h-full transition-all duration-75 ease-out rounded-xs"
              style={{
                width: `${percentL}%`,
                background:
                  'linear-gradient(90deg, #10b981 0%, #22c55e 55%, #f59e0b 75%, #ef4444 90%, #dc2626 100%)',
              }}
            />
            {/* Peak hold ticker */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_4px_#fff] transition-all duration-150"
              style={{ left: `${Math.min(99, peakPercentL)}%` }}
            />
          </div>

          {/* Channel Right */}
          {hasStereo && (
            <div className="flex-1 bg-slate-950 rounded-xs relative overflow-hidden">
              <div
                className="h-full transition-all duration-75 ease-out rounded-xs"
                style={{
                  width: `${percentR}%`,
                  background:
                    'linear-gradient(90deg, #10b981 0%, #22c55e 55%, #f59e0b 75%, #ef4444 90%, #dc2626 100%)',
                }}
              />
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_4px_#fff] transition-all duration-150"
                style={{ left: `${Math.min(99, peakPercentR)}%` }}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Vertical High-Precision Broadcast Strip Meter
  return (
    <div
      className={`flex flex-col items-center justify-between h-full select-none relative ${className}`}
      style={{ height, width: width || '1.75rem' }}
    >
      {/* Top Clip Status Alarm LED */}
      <button
        type="button"
        onClick={handleClipClick}
        className={`w-full text-center py-0.5 mb-1 rounded text-[7px] font-mono font-black tracking-widest uppercase transition-all duration-150 ${
          stickyClip || isClipping
            ? 'bg-red-600 text-white shadow-[0_0_12px_rgba(220,38,38,1)] border border-red-400 animate-pulse cursor-pointer'
            : 'bg-black/60 text-slate-600 border border-white/5'
        }`}
        title="Clip Alarm: Click to acknowledge and clear"
      >
        CLIP
      </button>

      {/* Main Dual VU Meter Column */}
      <div className="flex-1 w-full flex items-stretch gap-[2px] bg-black/90 p-[2px] rounded-md border border-white/10 relative shadow-inner overflow-hidden">
        {meterMode === 'ladder' ? (
          <>
            {/* Left Channel LED Ladder */}
            <div className="flex-1 flex flex-col justify-between gap-[2px] bg-slate-950 rounded-xs p-[1px] relative overflow-hidden">
              {segments.map((seg) => {
                const isLit = effectiveLevelL >= seg.threshold;
                const isPeak = Math.abs(effectivePeakL - seg.threshold) < 0.055;

                return (
                  <div
                    key={`l-${seg.index}`}
                    className={`w-full flex-1 rounded-[1px] transition-all duration-75 ${
                      isLit ? `${seg.litBg} ${seg.litShadow}` : seg.baseBg
                    } ${isPeak && !isLit ? 'bg-white shadow-[0_0_4px_#fff]' : ''}`}
                  />
                );
              })}
            </div>

            {/* Right Channel LED Ladder */}
            <div className="flex-1 flex flex-col justify-between gap-[2px] bg-slate-950 rounded-xs p-[1px] relative overflow-hidden">
              {segments.map((seg) => {
                const isLit = effectiveLevelR >= seg.threshold;
                const isPeak = Math.abs(effectivePeakR - seg.threshold) < 0.055;

                return (
                  <div
                    key={`r-${seg.index}`}
                    className={`w-full flex-1 rounded-[1px] transition-all duration-75 ${
                      isLit ? `${seg.litBg} ${seg.litShadow}` : seg.baseBg
                    } ${isPeak && !isLit ? 'bg-white shadow-[0_0_4px_#fff]' : ''}`}
                  />
                );
              })}
            </div>
          </>
        ) : (
          /* Smooth Continuous Dynamic Gradient Mode */
          <>
            {/* Left Column Gradient Bar */}
            <div className="flex-1 bg-slate-950 rounded-xs relative overflow-hidden flex flex-col-reverse">
              <div
                className="w-full transition-all duration-75 ease-out rounded-xs"
                style={{
                  height: `${percentL}%`,
                  background:
                    'linear-gradient(0deg, #10b981 0%, #22c55e 58%, #f59e0b 78%, #ef4444 92%, #dc2626 100%)',
                  boxShadow:
                    percentL > 82
                      ? '0 0 10px rgba(239,68,68,0.8)'
                      : percentL > 58
                      ? '0 0 6px rgba(245,158,11,0.6)'
                      : 'none',
                }}
              />
              {/* Peak Hold Line */}
              <div
                className="absolute w-full h-[2px] bg-white shadow-[0_0_4px_#fff] pointer-events-none transition-all duration-150"
                style={{ bottom: `${peakPercentL}%` }}
              />
            </div>

            {/* Right Column Gradient Bar */}
            <div className="flex-1 bg-slate-950 rounded-xs relative overflow-hidden flex flex-col-reverse">
              <div
                className="w-full transition-all duration-75 ease-out rounded-xs"
                style={{
                  height: `${percentR}%`,
                  background:
                    'linear-gradient(0deg, #10b981 0%, #22c55e 58%, #f59e0b 78%, #ef4444 92%, #dc2626 100%)',
                  boxShadow:
                    percentR > 82
                      ? '0 0 10px rgba(239,68,68,0.8)'
                      : percentR > 58
                      ? '0 0 6px rgba(245,158,11,0.6)'
                      : 'none',
                }}
              />
              {/* Peak Hold Line */}
              <div
                className="absolute w-full h-[2px] bg-white shadow-[0_0_4px_#fff] pointer-events-none transition-all duration-150"
                style={{ bottom: `${peakPercentR}%` }}
              />
            </div>
          </>
        )}
      </div>

      {/* Numerical dBFS Readout Footer */}
      {showNumericDb && (
        <div className="mt-1 w-full text-center">
          <span
            className={`text-[8px] font-mono tracking-tighter ${
              muted ? 'text-slate-500' : getLevelColor(maxLevel)
            }`}
          >
            {muted ? 'MUTED' : `${currentDb <= -55 ? '-∞' : currentDb.toFixed(0)}dB`}
          </span>
        </div>
      )}
    </div>
  );
};
