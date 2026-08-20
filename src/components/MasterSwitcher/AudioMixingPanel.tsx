import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Sliders,
  Radio,
  Sparkles,
  RefreshCw,
  Zap,
  Mic,
  MicOff,
  Headphones,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Activity,
  Layers,
  Wand2,
} from 'lucide-react';
import { CameraNode, SwitcherState, ChannelAudioState, MasterAudioState } from '../../types/broadcast';
import { audioMixerService, dbToLinear, linearToDb } from '../../services/audioMixerService';

interface AudioMixingPanelProps {
  cameras: CameraNode[];
  switcherState: SwitcherState;
  isCompact?: boolean;
  onToggleCompact?: () => void;
}

export const AudioMixingPanel: React.FC<AudioMixingPanelProps> = ({
  cameras,
  switcherState,
  isCompact = false,
  onToggleCompact,
}) => {
  const [channels, setChannels] = useState<ChannelAudioState[]>([]);
  const [master, setMaster] = useState<MasterAudioState>(audioMixerService.getMasterState());
  const [activeEqNodeId, setActiveEqNodeId] = useState<string | null>(null);
  const [showAdvancedMaster, setShowAdvancedMaster] = useState(false);

  // Sync cameras into audioMixerService
  useEffect(() => {
    cameras.forEach((cam) => {
      audioMixerService.registerCameraNode(cam.id, cam.name, cam.angle, cam.stream);
    });
  }, [cameras]);

  // Sync active program camera for Audio-Follows-Video (AFV)
  useEffect(() => {
    audioMixerService.updateActiveProgramCamera(switcherState.programCameraId);
  }, [switcherState.programCameraId]);

  // Subscribe to real-time audio meters (60fps VU loop)
  useEffect(() => {
    const unsubscribe = audioMixerService.subscribeMeters((updatedChannels, updatedMaster) => {
      setChannels([...updatedChannels]);
      setMaster({ ...updatedMaster });
    });
    return () => unsubscribe();
  }, []);

  const handleGainChange = (nodeId: string, dbVal: number) => {
    const linear = dbToLinear(dbVal);
    audioMixerService.setChannelGain(nodeId, linear, dbVal);
  };

  const handleMasterGainChange = (dbVal: number) => {
    const linear = dbToLinear(dbVal);
    audioMixerService.setMasterGain(linear, dbVal);
  };

  const handlePresetResetUnity = () => {
    channels.forEach((c) => {
      audioMixerService.setChannelGain(c.nodeId, 1.0, 0);
      audioMixerService.setChannelPan(c.nodeId, 0);
      audioMixerService.setChannelMute(c.nodeId, false);
      audioMixerService.setChannelSolo(c.nodeId, false);
      audioMixerService.setChannelEq(c.nodeId, 0, 0, 0);
    });
    audioMixerService.setMasterGain(1.0, 0);
    audioMixerService.setMasterMute(false);
  };

  const handlePresetEnableAllAfv = () => {
    channels.forEach((c) => {
      audioMixerService.setChannelAfv(c.nodeId, true);
    });
  };

  const handlePresetMuteNonProgram = () => {
    channels.forEach((c) => {
      const isPgm = c.nodeId === switcherState.programCameraId;
      audioMixerService.setChannelMute(c.nodeId, !isPgm);
    });
  };

  return (
    <div className="bg-[#10131A]/95 border border-white/10 rounded-xl overflow-hidden shadow-2xl backdrop-blur-xl flex flex-col text-slate-100 select-none">
      {/* Mixer Console Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 px-4 py-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-inner">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Multi-Node Broadcast Audio Console
              </h3>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono border border-indigo-500/30">
                DSP 48kHz 32-bit Float
              </span>
            </div>
            <p className="text-[10px] text-white/50">
              Individual channel faders, 3-band EQ, AFV tracking & Master Limiter
            </p>
          </div>
        </div>

        {/* Quick Presets & Utility Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePresetResetUnity}
            className="flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 transition-colors"
            title="Reset all channels to Unity (0.0 dB)"
          >
            <RefreshCw className="w-3 h-3" />
            <span className="hidden sm:inline">0 dB Unity</span>
          </button>

          <button
            onClick={handlePresetEnableAllAfv}
            className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-colors"
            title="Enable Audio Follows Video across all channels"
          >
            <Zap className="w-3 h-3" />
            <span>All AFV</span>
          </button>

          <button
            onClick={handlePresetMuteNonProgram}
            className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-colors"
            title="Mute all feeds except active Program camera"
          >
            <VolumeX className="w-3 h-3" />
            <span>Solo PGM</span>
          </button>

          {onToggleCompact && (
            <button
              onClick={onToggleCompact}
              className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            >
              {isCompact ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {!isCompact && (
        <div className="p-3 sm:p-4 flex flex-col gap-4">
          {/* Main Fader Channel Strip Bay */}
          <div className="flex flex-row overflow-x-auto pb-2 pt-1 gap-3 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
            {/* Render Individual Camera Node Strips */}
            {channels.map((chan) => {
              const isPgm = chan.nodeId === switcherState.programCameraId;
              const isPvw = chan.nodeId === switcherState.previewCameraId;

              return (
                <div
                  key={chan.nodeId}
                  className={`w-[130px] sm:w-[140px] flex-shrink-0 rounded-xl p-2.5 border flex flex-col justify-between transition-all relative ${
                    isPgm
                      ? 'bg-red-950/20 border-red-500/50 shadow-lg shadow-red-950/40'
                      : isPvw
                      ? 'bg-emerald-950/15 border-emerald-500/40'
                      : 'bg-slate-900/60 border-white/10 hover:border-white/20'
                  }`}
                >
                  {/* Channel Header / Tally Light */}
                  <div className="flex flex-col gap-1 pb-2 border-b border-white/10">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded tracking-tighter uppercase ${
                          isPgm
                            ? 'bg-red-600 text-white animate-pulse'
                            : isPvw
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white/10 text-white/60'
                        }`}
                      >
                        {isPgm ? 'ON AIR' : isPvw ? 'PREVIEW' : 'STANDBY'}
                      </span>
                      <div className="flex items-center gap-1">
                        {chan.isAudioPresent ? (
                          <Mic className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <span className="text-[8px] font-mono text-white/40">SIM</span>
                        )}
                      </div>
                    </div>

                    <div className="truncate font-bold text-xs text-white" title={chan.name}>
                      {chan.name}
                    </div>
                    <div className="text-[9px] font-mono text-white/50 uppercase tracking-tight">
                      {chan.angle}
                    </div>
                  </div>

                  {/* Channel Controls: AFV, EQ, Pan */}
                  <div className="py-2 flex flex-col gap-2">
                    {/* AFV Button */}
                    <button
                      onClick={() => audioMixerService.setChannelAfv(chan.nodeId, !chan.afv)}
                      className={`w-full py-1 rounded text-[10px] font-bold flex items-center justify-center gap-1 border transition-all ${
                        chan.afv
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-sm shadow-amber-900/20'
                          : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70'
                      }`}
                      title="Audio Follows Video: Auto-ducks audio when camera is off-air"
                    >
                      <Zap className="w-2.5 h-2.5" />
                      <span>AFV {chan.afv ? 'ON' : 'OFF'}</span>
                    </button>

                    {/* Pan Rotary Slider */}
                    <div className="flex flex-col gap-0.5 bg-black/40 p-1.5 rounded-lg border border-white/5">
                      <div className="flex justify-between text-[8px] font-mono text-white/50">
                        <span>PAN</span>
                        <span className="text-indigo-400 font-bold">
                          {chan.pan === 0
                            ? 'CENTER'
                            : chan.pan < 0
                            ? `L ${Math.abs(Math.round(chan.pan * 100))}%`
                            : `R ${Math.round(chan.pan * 100)}%`}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="-1"
                        max="1"
                        step="0.05"
                        value={chan.pan}
                        onChange={(e) => audioMixerService.setChannelPan(chan.nodeId, parseFloat(e.target.value))}
                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                    </div>

                    {/* 3-Band EQ Popover Toggle */}
                    <button
                      onClick={() => setActiveEqNodeId(activeEqNodeId === chan.nodeId ? null : chan.nodeId)}
                      className={`w-full py-1 px-1.5 rounded text-[9px] font-mono flex items-center justify-between border ${
                        activeEqNodeId === chan.nodeId || chan.eqLow !== 0 || chan.eqMid !== 0 || chan.eqHigh !== 0
                          ? 'bg-indigo-950/60 border-indigo-500/40 text-indigo-300'
                          : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                      }`}
                    >
                      <span>EQ (LOW/MID/HI)</span>
                      <SlidersHorizontal className="w-2.5 h-2.5" />
                    </button>

                    {/* Expandable Mini EQ panel */}
                    {activeEqNodeId === chan.nodeId && (
                      <div className="bg-black/80 p-2 rounded-lg border border-indigo-500/40 flex flex-col gap-1.5 text-[8px] font-mono">
                        <div className="flex justify-between items-center text-white/70">
                          <span>HI (6.5k)</span>
                          <span className="text-indigo-400">{chan.eqHigh > 0 ? `+${chan.eqHigh}` : chan.eqHigh}dB</span>
                        </div>
                        <input
                          type="range"
                          min="-12"
                          max="12"
                          step="1"
                          value={chan.eqHigh}
                          onChange={(e) =>
                            audioMixerService.setChannelEq(
                              chan.nodeId,
                              chan.eqLow,
                              chan.eqMid,
                              parseFloat(e.target.value)
                            )
                          }
                          className="w-full h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-indigo-400"
                        />

                        <div className="flex justify-between items-center text-white/70">
                          <span>MID (1.2k)</span>
                          <span className="text-indigo-400">{chan.eqMid > 0 ? `+${chan.eqMid}` : chan.eqMid}dB</span>
                        </div>
                        <input
                          type="range"
                          min="-12"
                          max="12"
                          step="1"
                          value={chan.eqMid}
                          onChange={(e) =>
                            audioMixerService.setChannelEq(
                              chan.nodeId,
                              chan.eqLow,
                              parseFloat(e.target.value),
                              chan.eqHigh
                            )
                          }
                          className="w-full h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-indigo-400"
                        />

                        <div className="flex justify-between items-center text-white/70">
                          <span>LOW (150Hz)</span>
                          <span className="text-indigo-400">{chan.eqLow > 0 ? `+${chan.eqLow}` : chan.eqLow}dB</span>
                        </div>
                        <input
                          type="range"
                          min="-12"
                          max="12"
                          step="1"
                          value={chan.eqLow}
                          onChange={(e) =>
                            audioMixerService.setChannelEq(
                              chan.nodeId,
                              parseFloat(e.target.value),
                              chan.eqMid,
                              chan.eqHigh
                            )
                          }
                          className="w-full h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-indigo-400"
                        />

                        <button
                          onClick={() => audioMixerService.setChannelEq(chan.nodeId, 0, 0, 0)}
                          className="mt-1 text-[8px] py-0.5 text-center bg-white/10 hover:bg-white/20 rounded text-white/60"
                        >
                          Flat EQ
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Fader & Dual Stereo Meter Section */}
                  <div className="flex items-center justify-between gap-2 h-44 bg-black/50 p-2 rounded-xl border border-white/5 relative">
                    {/* dB Scale Markings */}
                    <div className="flex flex-col justify-between h-full text-[8px] font-mono text-white/30 py-1">
                      <span>+10</span>
                      <span className="text-white/60 font-bold">0</span>
                      <span>-6</span>
                      <span>-12</span>
                      <span>-24</span>
                      <span>-40</span>
                      <span>-∞</span>
                    </div>

                    {/* Vertical Gain Fader */}
                    <div className="h-full flex items-center justify-center relative w-7">
                      {/* Fader track line */}
                      <div className="absolute inset-y-2 w-1.5 bg-slate-800 rounded-full border border-white/10 pointer-events-none" />
                      <input
                        type="range"
                        min="-58"
                        max="10"
                        step="0.5"
                        value={chan.gainDb}
                        onChange={(e) => handleGainChange(chan.nodeId, parseFloat(e.target.value))}
                        onDoubleClick={() => handleGainChange(chan.nodeId, 0)} // Double-click reset to 0dB Unity
                        className="w-36 h-6 -rotate-90 origin-center absolute appearance-none bg-transparent cursor-pointer z-10 
                          [&::-webkit-slider-thumb]:appearance-none 
                          [&::-webkit-slider-thumb]:w-6 
                          [&::-webkit-slider-thumb]:h-4 
                          [&::-webkit-slider-thumb]:bg-gradient-to-b 
                          [&::-webkit-slider-thumb]:from-slate-200 
                          [&::-webkit-slider-thumb]:to-slate-400 
                          [&::-webkit-slider-thumb]:border 
                          [&::-webkit-slider-thumb]:border-white 
                          [&::-webkit-slider-thumb]:rounded-sm 
                          [&::-webkit-slider-thumb]:shadow-md"
                        title="Double-click to reset to 0 dB Unity"
                      />
                    </div>

                    {/* Dual Stereo LED Meter Bars */}
                    <div className="flex gap-1 h-full w-5 bg-black rounded p-0.5 border border-white/10 relative overflow-hidden">
                      {/* Left Channel Meter */}
                      <div className="flex-1 bg-slate-900 rounded-xs relative overflow-hidden flex flex-col-reverse">
                        <div
                          className="w-full transition-all duration-75"
                          style={{
                            height: `${Math.min(100, Math.max(0, chan.meterL * 180))}%`,
                            background:
                              chan.meterL > 0.8
                                ? '#ef4444'
                                : chan.meterL > 0.6
                                ? '#eab308'
                                : '#22c55e',
                          }}
                        />
                        {/* Peak hold marker */}
                        <div
                          className="absolute w-full h-0.5 bg-white shadow-xs pointer-events-none transition-all duration-150"
                          style={{
                            bottom: `${Math.min(100, Math.max(0, chan.peakL * 180))}%`,
                          }}
                        />
                      </div>

                      {/* Right Channel Meter */}
                      <div className="flex-1 bg-slate-900 rounded-xs relative overflow-hidden flex flex-col-reverse">
                        <div
                          className="w-full transition-all duration-75"
                          style={{
                            height: `${Math.min(100, Math.max(0, chan.meterR * 180))}%`,
                            background:
                              chan.meterR > 0.8
                                ? '#ef4444'
                                : chan.meterR > 0.6
                                ? '#eab308'
                                : '#22c55e',
                          }}
                        />
                        {/* Peak hold marker */}
                        <div
                          className="absolute w-full h-0.5 bg-white shadow-xs pointer-events-none transition-all duration-150"
                          style={{
                            bottom: `${Math.min(100, Math.max(0, chan.peakR * 180))}%`,
                          }}
                        />
                      </div>

                      {/* Clip LED indicator */}
                      {chan.isClipping && (
                        <div className="absolute top-0.5 inset-x-0.5 h-1 bg-red-600 animate-ping rounded" />
                      )}
                    </div>
                  </div>

                  {/* Fader Readout Badge */}
                  <div className="text-center py-1 font-mono font-bold text-[10px]">
                    <span className={chan.gainDb > 0 ? 'text-amber-400' : 'text-slate-300'}>
                      {chan.gainDb <= -55 ? '-∞' : chan.gainDb > 0 ? `+${chan.gainDb.toFixed(1)}` : `${chan.gainDb.toFixed(1)}`} dB
                    </span>
                  </div>

                  {/* Channel MUTE & SOLO Buttons */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-white/10">
                    <button
                      onClick={() => audioMixerService.setChannelMute(chan.nodeId, !chan.muted)}
                      className={`py-1.5 rounded text-[10px] font-bold border transition-colors ${
                        chan.muted
                          ? 'bg-red-600 border-red-500 text-white shadow-md shadow-red-900/50'
                          : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      MUTE
                    </button>

                    <button
                      onClick={() => audioMixerService.setChannelSolo(chan.nodeId, !chan.solo)}
                      className={`py-1.5 rounded text-[10px] font-bold border transition-colors ${
                        chan.solo
                          ? 'bg-amber-500 border-amber-400 text-black shadow-md shadow-amber-900/50'
                          : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      SOLO
                    </button>
                  </div>
                </div>
              );
            })}

            {/* MASTER BROADCAST OUTPUT CHANNEL STRIP */}
            <div className="w-[150px] sm:w-[160px] flex-shrink-0 rounded-xl p-2.5 border border-amber-500/40 bg-gradient-to-b from-amber-950/20 via-slate-900/80 to-black flex flex-col justify-between shadow-2xl shadow-amber-950/30">
              {/* Master Header */}
              <div className="flex flex-col gap-1 pb-2 border-b border-amber-500/30">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono font-black px-1.5 py-0.5 rounded bg-amber-500 text-black uppercase tracking-wider">
                    MASTER OUT
                  </span>
                  <div className="flex items-center gap-1">
                    <Radio className="w-3 h-3 text-red-500 animate-pulse" />
                    <span className="text-[8px] font-mono text-red-400 font-bold">PGM BUS</span>
                  </div>
                </div>

                <div className="font-bold text-xs text-amber-200">Broadcast Output</div>
                <div className="text-[9px] font-mono text-white/50">RTMP Live Stream</div>
              </div>

              {/* Master Features: Limiter, Test Tone, Delay */}
              <div className="py-2 flex flex-col gap-2">
                {/* Master Limiter Toggle */}
                <button
                  onClick={() => audioMixerService.setMasterLimiter(!master.limiterEnabled)}
                  className={`w-full py-1 rounded text-[10px] font-bold flex items-center justify-center gap-1 border transition-all ${
                    master.limiterEnabled
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                      : 'bg-white/5 border-white/10 text-white/40'
                  }`}
                  title="Broadcast Dynamics Limiter prevents digital audio distortion"
                >
                  <Activity className="w-2.5 h-2.5" />
                  <span>LIMITER {master.limiterEnabled ? 'ACTIVE' : 'BYPASS'}</span>
                </button>

                {/* Test Tone & Ambience Toggle */}
                <div className="grid grid-cols-2 gap-1">
                  <button
                    onClick={() => audioMixerService.toggleTestTone()}
                    className={`py-1 px-1 rounded text-[9px] font-mono border text-center transition-all ${
                      master.testTone
                        ? 'bg-rose-600 border-rose-500 text-white shadow-md shadow-rose-900/40 animate-pulse font-bold'
                        : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
                    }`}
                    title="1 kHz Sine Reference Calibration Tone"
                  >
                    1kHz TONE
                  </button>

                  <button
                    onClick={() => audioMixerService.toggleStadiumAmbience()}
                    className={`py-1 px-1 rounded text-[9px] font-mono border text-center transition-all ${
                      master.stadiumAmbience
                        ? 'bg-sky-600/30 border-sky-500/50 text-sky-300 font-bold'
                        : 'bg-white/5 border-white/10 text-white/40 hover:text-white'
                    }`}
                    title="Synthesized Stadium Crowd Acoustic Atmosphere Bed"
                  >
                    CROWD BED
                  </button>
                </div>

                {/* Lip Sync Delay */}
                <div className="flex flex-col gap-0.5 bg-black/40 p-1.5 rounded-lg border border-white/5">
                  <div className="flex justify-between text-[8px] font-mono text-white/50">
                    <span>LIP-SYNC DELAY</span>
                    <span className="text-amber-400 font-bold">{master.delayMs} ms</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="500"
                    step="10"
                    value={master.delayMs}
                    onChange={(e) => audioMixerService.setMasterDelay(parseInt(e.target.value))}
                    className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                </div>
              </div>

              {/* Master Fader & Master VU Meter */}
              <div className="flex items-center justify-between gap-2 h-44 bg-black/60 p-2 rounded-xl border border-amber-500/20 relative">
                {/* dB Scale Markings */}
                <div className="flex flex-col justify-between h-full text-[8px] font-mono text-amber-200/40 py-1">
                  <span>+10</span>
                  <span className="text-amber-400 font-bold">0</span>
                  <span>-6</span>
                  <span>-12</span>
                  <span>-24</span>
                  <span>-40</span>
                  <span>-∞</span>
                </div>

                {/* Vertical Master Gain Fader */}
                <div className="h-full flex items-center justify-center relative w-7">
                  <div className="absolute inset-y-2 w-1.5 bg-amber-950/80 rounded-full border border-amber-500/30 pointer-events-none" />
                  <input
                    type="range"
                    min="-58"
                    max="10"
                    step="0.5"
                    value={master.masterGainDb}
                    onChange={(e) => handleMasterGainChange(parseFloat(e.target.value))}
                    onDoubleClick={() => handleMasterGainChange(0)}
                    className="w-36 h-6 -rotate-90 origin-center absolute appearance-none bg-transparent cursor-pointer z-10 
                      [&::-webkit-slider-thumb]:appearance-none 
                      [&::-webkit-slider-thumb]:w-7 
                      [&::-webkit-slider-thumb]:h-4 
                      [&::-webkit-slider-thumb]:bg-gradient-to-b 
                      [&::-webkit-slider-thumb]:from-amber-300 
                      [&::-webkit-slider-thumb]:to-amber-500 
                      [&::-webkit-slider-thumb]:border 
                      [&::-webkit-slider-thumb]:border-white 
                      [&::-webkit-slider-thumb]:rounded-sm 
                      [&::-webkit-slider-thumb]:shadow-lg"
                    title="Double-click to reset Master to 0 dB Unity"
                  />
                </div>

                {/* Master Stereo VU Meter */}
                <div className="flex gap-1 h-full w-6 bg-black rounded p-0.5 border border-amber-500/30 relative overflow-hidden">
                  <div className="flex-1 bg-slate-900 rounded-xs relative overflow-hidden flex flex-col-reverse">
                    <div
                      className="w-full transition-all duration-75"
                      style={{
                        height: `${Math.min(100, Math.max(0, master.meterL * 180))}%`,
                        background:
                          master.meterL > 0.85
                            ? '#ef4444'
                            : master.meterL > 0.65
                            ? '#eab308'
                            : '#22c55e',
                      }}
                    />
                    <div
                      className="absolute w-full h-0.5 bg-amber-200 shadow-xs pointer-events-none transition-all duration-150"
                      style={{
                        bottom: `${Math.min(100, Math.max(0, master.peakL * 180))}%`,
                      }}
                    />
                  </div>

                  <div className="flex-1 bg-slate-900 rounded-xs relative overflow-hidden flex flex-col-reverse">
                    <div
                      className="w-full transition-all duration-75"
                      style={{
                        height: `${Math.min(100, Math.max(0, master.meterR * 180))}%`,
                        background:
                          master.meterR > 0.85
                            ? '#ef4444'
                            : master.meterR > 0.65
                            ? '#eab308'
                            : '#22c55e',
                      }}
                    />
                    <div
                      className="absolute w-full h-0.5 bg-amber-200 shadow-xs pointer-events-none transition-all duration-150"
                      style={{
                        bottom: `${Math.min(100, Math.max(0, master.peakR * 180))}%`,
                      }}
                    />
                  </div>

                  {master.isClipping && (
                    <div className="absolute top-0.5 inset-x-0.5 h-1 bg-red-600 animate-ping rounded" />
                  )}
                </div>
              </div>

              {/* Master Readout Badge */}
              <div className="text-center py-1 font-mono font-bold text-[10px]">
                <span className="text-amber-300">
                  {master.masterGainDb <= -55 ? '-∞' : master.masterGainDb > 0 ? `+${master.masterGainDb.toFixed(1)}` : `${master.masterGainDb.toFixed(1)}`} dB
                </span>
              </div>

              {/* Master Mute Button */}
              <button
                onClick={() => audioMixerService.setMasterMute(!master.masterMuted)}
                className={`w-full py-1.5 rounded text-[10px] font-black border transition-all ${
                  master.masterMuted
                    ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-900/60 animate-pulse'
                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                {master.masterMuted ? 'MASTER MUTED (OFF AIR)' : 'MASTER ON AIR'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
