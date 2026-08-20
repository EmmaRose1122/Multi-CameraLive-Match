import React, { useEffect, useRef } from 'react';
import {
  Camera,
  Radio,
  Eye,
  Layers,
  Flame,
  Zap,
  Moon,
  Check,
  LayoutGrid,
  AlertTriangle,
  WifiOff,
} from 'lucide-react';
import { useState } from 'react';
import { webrtcService } from '../../services/webrtcService';
import { CameraNode, SwitcherState, ScoreboardState } from '../../types/broadcast';
import { graphicsCompositor } from '../../services/graphicsCompositor';
import { matchSimulator } from '../../services/simulationData';
import { BroadcastAudioMeter } from './BroadcastAudioMeter';

interface MultiviewGridProps {
  cameras: CameraNode[];
  switcherState: SwitcherState;
  scoreboard?: ScoreboardState;
  onSelectPreview: (cameraId: string) => void;
  onCutToProgram: (cameraId: string) => void;
  onToggleTorch?: (cameraId: string) => void;
  onToggleDimScreen?: (cameraId: string) => void;
  onTogglePip?: () => void;
  onSelectPipSource?: (cameraId: string) => void;
  onSelectPipPosition?: (position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left') => void;
  onToggleLatencySim?: (cameraId: string) => void;
}

export const MultiviewGrid: React.FC<MultiviewGridProps> = ({
  cameras,
  switcherState,
  scoreboard,
  onSelectPreview,
  onCutToProgram,
  onToggleTorch,
  onToggleDimScreen,
  onTogglePip,
  onSelectPipSource,
  onSelectPipPosition,
  onToggleLatencySim,
}) => {
  const canvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const overlayCanvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const [cameraStats, setCameraStats] = useState<Record<string, any>>({});

  useEffect(() => {
    const interval = setInterval(async () => {
      const statsMap: Record<string, any> = {};
      for (const cam of cameras) {
        if (cam.isPhysical) {
          const stats = await webrtcService.getPeerStats(cam.id);
          if (stats) {
            statsMap[cam.id] = stats;
          }
        }
      }
      setCameraStats(statsMap);
    }, 1000);
    return () => clearInterval(interval);
  }, [cameras]);

  // Attach MediaStreams to video elements when they become available
  useEffect(() => {
    console.log('[DEBUG] MultiviewGrid useEffect[cameras] triggered. Total cameras:', cameras.length);
    cameras.forEach(cam => {
      console.log('[DEBUG] Checking camera binding:', { id: cam.id, isPhysical: cam.isPhysical, hasStream: !!cam.stream });
      if (cam.stream && cam.isPhysical) {
        const videoEl = videoRefs.current.get(cam.id);
        console.log('[DEBUG] Found video element for', cam.id, '?', !!videoEl);
        if (videoEl && videoEl.srcObject !== cam.stream) {
          console.log('[DEBUG] Binding new stream to video element for', cam.id);
          videoEl.srcObject = cam.stream;
          videoEl.play().catch(e => console.error("Video play failed:", e));
        }
      }
    });
  }, [cameras]);

  // Scoreboard rendering loop for PGM camera
  useEffect(() => {
    let animFrame: number;
    const renderOverlays = () => {
      if (scoreboard && switcherState.programCameraId) {
        const overlayCanvas = overlayCanvasRefs.current.get(switcherState.programCameraId);
        if (overlayCanvas) {
          const ctx = overlayCanvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
            
            // Draw scoreboard
            if (scoreboard.showScoreboard) {
              graphicsCompositor.drawScoreboard(ctx, overlayCanvas.width, overlayCanvas.height, scoreboard);
            }
            // Draw lower third / banners
            if (scoreboard.activeBanner && scoreboard.activeBanner.expiresAt > Date.now()) {
              graphicsCompositor.drawEventBanner(ctx, overlayCanvas.width, overlayCanvas.height, scoreboard.activeBanner);
            } else if (scoreboard.showLowerThird && scoreboard.customLowerThird) {
              graphicsCompositor.drawCustomLowerThird(ctx, overlayCanvas.width, overlayCanvas.height, scoreboard.customLowerThird, scoreboard.theme);
            }
          }
        }
      }
      animFrame = requestAnimationFrame(renderOverlays);
    };
    animFrame = requestAnimationFrame(renderOverlays);
    
    return () => cancelAnimationFrame(animFrame);
  }, [scoreboard, switcherState.programCameraId]);

  useEffect(() => {
    // Register simulated camera canvases with simulation engine
    cameras.forEach((cam) => {
      const el = canvasRefs.current.get(cam.id);
      if (el && !cam.isPhysical) {
        matchSimulator.registerCanvas(cam.id, el);
      }
    });

    matchSimulator.start();

    return () => {
      cameras.forEach((cam) => {
        if (!cam.isPhysical) {
          matchSimulator.unregisterCanvas(cam.id);
        }
      });
    };
  }, [cameras]);

  const activePipCamera = cameras.find((c) => c.id === switcherState.pipCameraId) || cameras[0];
  const degradedCameras = cameras.filter((c) => c.latencyMs > 100);

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 shadow-2xl select-none flex flex-col gap-3.5">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-sky-400" />
          <h2 className="text-sm font-semibold text-white uppercase tracking-tight">
            Multi-Camera Production Feeds ({cameras.length} Angles Online)
          </h2>
          {degradedCameras.length > 0 && (
            <div
              id="multiview-degradation-alert"
              className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 font-bold text-[11px] flex items-center gap-1.5 animate-pulse shadow-sm"
              title="One or more camera feeds have latency exceeding the 100ms broadcast tolerance limit"
            >
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              <span>{degradedCameras.length} Feed{degradedCameras.length > 1 ? 's' : ''} High Latency (&gt;100ms)</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-white/70">
            <span className="w-2 h-2 rounded-full bg-red-600"></span>
            <span>PGM Live</span>
          </div>
          <div className="flex items-center gap-1.5 text-white/70">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>PVW Queue</span>
          </div>
          <div className="flex items-center gap-1.5 text-blue-400">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            <span>PiP Inset</span>
          </div>
          <div className="flex items-center gap-1.5 text-amber-400 font-medium">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            <span>&gt;100ms Alert</span>
          </div>
          <div className="flex items-center gap-1.5 text-white/40">
            <span className="w-2 h-2 rounded-full bg-white/20"></span>
            <span>Standby</span>
          </div>
        </div>
      </div>

      {/* Picture-in-Picture (PIP) Master Control Overlay Bar */}
      <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-3 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 shadow-inner">
        {/* Left: PiP Toggle & Status */}
        <div className="flex items-center gap-3">
          <button
            id="btn-multiview-toggle-pip"
            onClick={onTogglePip}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-150 flex items-center gap-2 active:scale-95 ${
              switcherState.pipEnabled
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/40 ring-2 ring-blue-400/30'
                : 'bg-white/10 hover:bg-white/15 text-white/70 hover:text-white border border-white/10'
            }`}
          >
            <Layers className={`w-4 h-4 ${switcherState.pipEnabled ? 'animate-pulse' : ''}`} />
            <span>{switcherState.pipEnabled ? 'PiP Overlay ON' : 'PiP Overlay OFF'}</span>
          </button>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-white/40 font-medium">Source:</span>
            <span className="px-2 py-0.5 rounded-md bg-blue-950/60 border border-blue-500/30 text-blue-300 font-semibold font-mono text-[11px]">
              {activePipCamera?.name || 'None'}
            </span>
          </div>
        </div>

        {/* Center: Inset Camera Source Selector */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-white/40 font-medium mr-1">Select Inset Source:</span>
          {cameras.map((cam, idx) => {
            const isSelectedPip = switcherState.pipCameraId === cam.id;
            return (
              <button
                key={`pip-opt-${cam.id}-${idx}`}
                id={`btn-select-pip-source-${cam.id}`}
                onClick={() => onSelectPipSource && onSelectPipSource(cam.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  isSelectedPip
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30 ring-1 ring-blue-400/40'
                    : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10 border border-white/10'
                }`}
                title={`Route ${cam.name} to PiP inset`}
              >
                <span className="font-mono text-[10px] opacity-70">CAM {idx + 1}</span>
                <span className="truncate max-w-[80px] sm:max-w-none">{cam.name.split('•')[1]?.trim() || cam.name}</span>
                {isSelectedPip && <Check className="w-3 h-3 text-white" />}
              </button>
            );
          })}
        </div>

        {/* Right: PiP Inset Corner Position Selector */}
        <div className="flex items-center gap-1.5 self-start lg:self-auto">
          <span className="text-xs text-white/40 font-medium mr-1 flex items-center gap-1">
            <LayoutGrid className="w-3 h-3" /> Position:
          </span>
          {(
            [
              { id: 'top-right', label: 'TR' },
              { id: 'top-left', label: 'TL' },
              { id: 'bottom-right', label: 'BR' },
              { id: 'bottom-left', label: 'BL' },
            ] as const
          ).map((pos) => (
            <button
              key={pos.id}
              id={`btn-pip-pos-${pos.id}`}
              onClick={() => onSelectPipPosition && onSelectPipPosition(pos.id)}
              className={`px-2 py-1 rounded-md text-[11px] font-mono font-bold uppercase transition-colors ${
                switcherState.pipPosition === pos.id
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/40'
                  : 'bg-white/5 text-white/50 hover:text-white hover:bg-white/10 border border-white/10'
              }`}
              title={`Position inset at ${pos.id}`}
            >
              {pos.label}
            </button>
          ))}
        </div>
      </div>

      {/* Multiview Tiles Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-3.5">
        {cameras.map((cam, idx) => {
          const isPgm = switcherState.programCameraId === cam.id;
          const isPvw = switcherState.previewCameraId === cam.id;
          const isPip = switcherState.pipCameraId === cam.id;
          const isDegraded = cam.latencyMs > 100;

          let borderClass = isDegraded
            ? 'border-amber-500/70 shadow-lg shadow-amber-950/40 ring-1 ring-amber-500/30'
            : 'border-white/10 hover:border-white/20';
          let tallyBadge = null;

          if (isPgm) {
            borderClass = 'border-2 border-red-500 shadow-xl shadow-red-950/50 ring-2 ring-red-500/20';
            tallyBadge = (
              <span className="px-2 py-0.5 rounded bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-lg shadow-red-900/40 animate-pulse">
                <Radio className="w-3 h-3" /> PGM LIVE
              </span>
            );
          } else if (isPvw) {
            borderClass = 'border-2 border-emerald-500 shadow-xl shadow-emerald-950/40 ring-2 ring-emerald-500/20';
            tallyBadge = (
              <span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-lg shadow-emerald-900/40">
                <Eye className="w-3 h-3" /> PVW QUEUE
              </span>
            );
          } else if (isPip) {
            borderClass = switcherState.pipEnabled
              ? 'border-2 border-blue-500 shadow-xl shadow-blue-950/40 ring-2 ring-blue-500/20'
              : 'border border-blue-500/40';
            tallyBadge = (
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                  switcherState.pipEnabled
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 animate-pulse'
                    : 'bg-blue-950/80 text-blue-300 border border-blue-800/60'
                }`}
              >
                <Layers className="w-3 h-3" /> {switcherState.pipEnabled ? 'PiP ACTIVE' : 'PiP SOURCE'}
              </span>
            );
          }

          return (
            <div
              key={`cam-tile-${cam.id}-${idx}`}
              className={`min-w-[85vw] snap-center md:min-w-0 bg-black/40 backdrop-blur-md rounded-xl overflow-hidden flex flex-col transition-all duration-200 border ${borderClass}`}
            >
              {/* Tile Header */}
              <div className="flex items-center justify-between px-3 py-1.5 bg-black/40 border-b border-white/10 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-white/10 text-white/80 font-mono font-bold flex items-center justify-center text-[10px] border border-white/10">
                    {idx + 1}
                  </span>
                  <span className="font-semibold text-white truncate max-w-[130px] sm:max-w-none">
                    {cam.name}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* High Latency Warning Badge */}
                  {isDegraded && (
                    <span
                      id={`feed-degradation-badge-${cam.id}`}
                      className="px-2 py-0.5 rounded bg-amber-500 text-black text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 shadow-md shadow-amber-950/50 animate-pulse"
                      title={`Network Degradation Alert: Latency is ${cam.latencyMs}ms (exceeds 100ms threshold). Risk of frame drops or sync drift.`}
                    >
                      <AlertTriangle className="w-3 h-3 text-black fill-black/20" />
                      LAG &gt;100ms
                    </span>
                  )}
                  {tallyBadge}
                  {cam.isPhysical && (
                    <span className="px-1.5 py-0.5 rounded bg-sky-950/80 text-sky-400 font-mono text-[9px] border border-sky-800/60">
                      LAN PHONE
                    </span>
                  )}
                </div>
              </div>

              {/* Video Surface */}
              <div className="relative aspect-video bg-black overflow-hidden group">
                {/* Debug Stats Overlay */}
                {cam.isPhysical && (
                   <div className="absolute top-1 left-1 bg-black/70 rounded px-1.5 py-1 text-[10px] font-mono text-white/80 pointer-events-none z-30 flex flex-col gap-0.5">
                     <div className="flex justify-between gap-3">
                       <span className="text-white/50">RES:</span>
                       <span className="text-emerald-400 font-bold">
                         {cameraStats[cam.id]?.frameWidth || 0}x{cameraStats[cam.id]?.frameHeight || 0}
                       </span>
                     </div>
                     <div className="flex justify-between gap-3">
                       <span className="text-white/50">FPS:</span>
                       <span className="text-blue-400 font-bold">
                         {Math.round(cameraStats[cam.id]?.frameRate || 0)}
                       </span>
                     </div>
                     <div className="flex justify-between gap-3">
                       <span className="text-white/50">RX:</span>
                       <span className="text-amber-400 font-bold">
                         {((cameraStats[cam.id]?.bytesReceived || 0) / 1024).toFixed(1)} KB
                       </span>
                     </div>
                     {cam.fallbackFrame && !cam.stream && (
                        <div className="text-red-400 font-bold text-[9px] mt-0.5 border-t border-white/10 pt-0.5">MJPEG FALLBACK</div>
                     )}
                   </div>
                )}
                
                <canvas
                  id={`feed-canvas-${cam.id}`}
                  ref={(el) => {
                    if (el) canvasRefs.current.set(cam.id, el);
                  }}
                  width={640}
                  height={360}
                  className={`w-full h-full object-contain cursor-pointer absolute inset-0 ${cam.isPhysical && cam.stream ? 'hidden' : ''}`}
                  onClick={() => onSelectPreview(cam.id)}
                />
                {cam.isPhysical && cam.fallbackFrame && (
                  <img
                    src={cam.fallbackFrame}
                    className="w-full h-full object-contain cursor-pointer absolute inset-0 z-10"
                    style={{ display: (cam.stream && (cameraStats[cam.id]?.bytesReceived || 0) > 0) ? 'none' : 'block' }}
                    onClick={() => onSelectPreview(cam.id)}
                    alt={cam.name}
                  />
                )}
                {cam.isPhysical && (
                  <video
                    ref={(el) => {
                      if (el) {
                        videoRefs.current.set(cam.id, el);
                        if (cam.stream && el.srcObject !== cam.stream) {
                          el.srcObject = cam.stream;
                          el.play().catch(e => console.error("Video play failed:", e));
                        }
                      }
                    }}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-contain cursor-pointer absolute inset-0 z-0"
                    onClick={() => onSelectPreview(cam.id)}
                  />
                )}
                {/* Overlay Canvas for Scoreboard (Only active on PGM) */}
                {isPgm && scoreboard && (
                  <canvas
                    ref={(el) => {
                      if (el) overlayCanvasRefs.current.set(cam.id, el);
                    }}
                    width={640}
                    height={360}
                    className="w-full h-full object-contain pointer-events-none absolute inset-0 z-10"
                  />
                )}

                {/* Prominent High Latency Video Overlay Warning */}
                {isDegraded && (
                  <div
                    id={`feed-warning-overlay-${cam.id}`}
                    className="absolute top-2 left-2 z-10 flex items-center gap-1.5 bg-amber-500/95 text-black px-2 py-0.5 rounded font-mono text-[10px] font-extrabold shadow-xl shadow-black/80 border border-amber-300 animate-pulse pointer-events-none"
                    title={`Network Degradation Warning: ${cam.latencyMs}ms latency (>100ms)`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-black shrink-0" />
                    <span>NETWORK DEGRADED ({cam.latencyMs}ms)</span>
                  </div>
                )}

                {/* Real-time Decibel Audio Peak Meter */}
                <BroadcastAudioMeter cameraId={cam.id} audioLevel={cam.audioLevel || 0} />

                {/* Overlaid Telemetry Capsule (Battery / Temp / Latency) */}
                <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-[10px] text-white/80 font-mono border border-white/10">
                  <span>{cam.resolution}</span>
                  <span className="text-white/30">•</span>
                  <span>{cam.fps} FPS</span>
                  <span className="text-white/30">•</span>
                  <span
                    className={`flex items-center gap-1 px-1 py-0.2 rounded ${
                      isDegraded
                        ? 'text-amber-300 bg-amber-950/90 border border-amber-500/60 font-bold animate-pulse'
                        : cam.latencyMs > 70
                        ? 'text-amber-400 font-semibold'
                        : 'text-emerald-400'
                    }`}
                    title={
                      isDegraded
                        ? `High Latency Alert: ${cam.latencyMs}ms (>100ms threshold)`
                        : `Latency: ${cam.latencyMs}ms`
                    }
                  >
                    {isDegraded && <AlertTriangle className="w-2.5 h-2.5 text-amber-400 shrink-0" />}
                    {cam.latencyMs}ms
                  </span>
                  {cam.temperatureC > 38 && (
                    <span className="flex items-center gap-0.5 text-rose-400 font-bold">
                      <Flame className="w-2.5 h-2.5" />
                      {cam.temperatureC}°C
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="px-2.5 py-2 bg-black/40 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 overflow-hidden">
                <div className="flex items-center gap-1">
                  {/* Remote Flashlight / Torch */}
                  <button
                    onClick={() => onToggleTorch && onToggleTorch(cam.id)}
                    className={`p-1.5 rounded-lg text-xs transition-colors ${
                      cam.torchOn
                        ? 'bg-amber-500 text-black font-bold shadow-sm shadow-amber-500/50'
                        : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/10'
                    }`}
                    title="Toggle Flashlight / Torch"
                  >
                    <Zap className="w-3.5 h-3.5" />
                  </button>

                  {/* Remote Screen Dim (Thermal Optimization) */}
                  <button
                    onClick={() => onToggleDimScreen && onToggleDimScreen(cam.id)}
                    className={`p-1.5 rounded-lg text-xs transition-colors ${
                      cam.screenDimmed
                        ? 'bg-indigo-600 text-white font-bold shadow-sm shadow-indigo-600/50'
                        : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/10'
                    }`}
                    title="Remote Screen Dimmer (Saves 70% Battery & Heat)"
                  >
                    <Moon className="w-3.5 h-3.5" />
                  </button>

                  {/* Set as PiP Source Button */}
                  <button
                    id={`btn-set-pip-${cam.id}`}
                    onClick={() => onSelectPipSource && onSelectPipSource(cam.id)}
                    className={`px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                      isPip
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                        : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/10'
                    }`}
                    title={`Set ${cam.name} as PiP Inset Video`}
                  >
                    <Layers className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-[11px]">PiP</span>
                  </button>

                  {/* Latency Jitter Simulation Toggle */}
                  {onToggleLatencySim && (
                    <button
                      id={`btn-sim-latency-${cam.id}`}
                      onClick={() => onToggleLatencySim(cam.id)}
                      className={`p-1.5 rounded-lg text-xs transition-colors ${
                        isDegraded
                          ? 'bg-amber-500 text-black font-bold shadow-sm shadow-amber-500/50 animate-pulse'
                          : 'bg-white/5 text-white/40 hover:text-white hover:bg-white/10 border border-white/10'
                      }`}
                      title={
                        isDegraded
                          ? `Clear Latency Spike on ${cam.name}`
                          : `Simulate Network Latency Spike (>100ms) on ${cam.name}`
                      }
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    id={`btn-queue-${cam.id}`}
                    onClick={() => onSelectPreview(cam.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      isPvw
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                        : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                    }`}
                  >
                    Queue PVW
                  </button>

                  <button
                    id={`btn-cut-${cam.id}`}
                    onClick={() => onCutToProgram(cam.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      isPgm
                        ? 'bg-red-600 text-white shadow-lg shadow-red-900/40'
                        : 'bg-red-950/60 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/30'
                    }`}
                  >
                    Take LIVE
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

