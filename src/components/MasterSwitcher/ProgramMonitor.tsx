import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Mic, MicOff, Headphones } from 'lucide-react';
import { CameraNode, SwitcherState, ScoreboardState } from '../../types/broadcast';
import { graphicsCompositor } from '../../services/graphicsCompositor';
import { matchSimulator } from '../../services/simulationData';
import { audioMixerService } from '../../services/audioMixerService';

interface ProgramMonitorProps {
  cameras: CameraNode[];
  switcherState: SwitcherState;
  scoreboard?: ScoreboardState;
}

export const ProgramMonitor: React.FC<ProgramMonitorProps> = ({ cameras, switcherState, scoreboard }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [monitorVolume, setMonitorVolume] = useState(1.0);
  const [audioStarted, setAudioStarted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const pipVideoRef = useRef<HTMLVideoElement>(null);

  const programCamera = cameras.find(c => c.id === switcherState.programCameraId);
  const pipCamera = switcherState.pipEnabled ? cameras.find(c => c.id === switcherState.pipCameraId) : null;

  const hasAudioTrack = !!(programCamera?.stream && programCamera.stream.getAudioTracks().some(t => t.readyState === 'live' || t.enabled)) || !!(programCamera && audioMixerService.getChannelState(programCamera.id)?.isAudioPresent);

  const handleToggleAudio = async () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    setAudioStarted(true);

    await audioMixerService.resumeContext();
    if (!nextMuted) {
      audioMixerService.setMasterMute(false);
      audioMixerService.setMasterGain(monitorVolume, 20 * Math.log10(Math.max(0.001, monitorVolume)));
      if (programCamera) {
        audioMixerService.registerCameraNode(programCamera.id, programCamera.name, programCamera.angle, programCamera.stream);
        audioMixerService.updateActiveProgramCamera(programCamera.id);
      }
    } else {
      audioMixerService.setMasterMute(true);
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setMonitorVolume(newVol);
    audioMixerService.setMasterGain(newVol, 20 * Math.log10(Math.max(0.001, newVol)));
  };

  // Sync active program camera with mixer
  useEffect(() => {
    if (programCamera) {
      audioMixerService.registerCameraNode(programCamera.id, programCamera.name, programCamera.angle, programCamera.stream);
      audioMixerService.updateActiveProgramCamera(programCamera.id);
      if (!isMuted) {
        audioMixerService.resumeContext();
      }
    }
  }, [programCamera?.stream, programCamera?.id, isMuted, monitorVolume]);

  // Handle Main PGM Video Stream
  useEffect(() => {
    console.log('[DEBUG] ProgramMonitor useEffect PGM. camera:', programCamera?.id, 'stream:', !!programCamera?.stream);
    if (programCamera?.stream && videoRef.current) {
      if (videoRef.current.srcObject !== programCamera.stream) {
        console.log('[DEBUG] Binding PGM videoRef');
        videoRef.current.srcObject = programCamera.stream;
        videoRef.current.play().catch(e => console.error('PGM play error:', e));
      }
    }
  }, [programCamera?.stream, programCamera?.id]);

  // Handle PiP Video Stream
  useEffect(() => {
    if (pipCamera?.stream && pipVideoRef.current) {
      if (pipVideoRef.current.srcObject !== pipCamera.stream) {
        pipVideoRef.current.srcObject = pipCamera.stream;
        pipVideoRef.current.play().catch(e => console.error('PiP play error:', e));
      }
    }
  }, [pipCamera?.stream, pipCamera?.id]);

  // Scoreboard rendering loop
  useEffect(() => {
    let animFrame: number;
    const renderOverlays = () => {
      const canvas = overlayCanvasRef.current;
      if (canvas && scoreboard) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          if (scoreboard.showScoreboard) {
            graphicsCompositor.drawScoreboard(ctx, canvas.width, canvas.height, scoreboard);
          }
          if (scoreboard.activeBanner && scoreboard.activeBanner.expiresAt > Date.now()) {
            graphicsCompositor.drawEventBanner(ctx, canvas.width, canvas.height, scoreboard.activeBanner);
          } else if (scoreboard.showLowerThird && scoreboard.customLowerThird) {
            graphicsCompositor.drawCustomLowerThird(ctx, canvas.width, canvas.height, scoreboard.customLowerThird, scoreboard.theme);
          }
        }
      }
      animFrame = requestAnimationFrame(renderOverlays);
    };
    animFrame = requestAnimationFrame(renderOverlays);
    return () => cancelAnimationFrame(animFrame);
  }, [scoreboard]);

  return (
    <div className="bg-black/80 border-2 border-red-500/50 rounded-xl overflow-hidden shadow-2xl flex flex-col mb-4">
      <div className="px-3 py-2 bg-gradient-to-r from-red-950/70 via-red-900/40 to-slate-950 border-b border-red-500/30 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
          <span className="text-red-100 font-bold text-xs uppercase tracking-widest">Program Output (Live)</span>
        </div>
        
        {programCamera && (
          <div className="flex items-center gap-3">
            <span className="text-white/70 font-mono text-[10px] uppercase truncate max-w-[140px] bg-black/40 px-2 py-0.5 rounded border border-white/10">
              {programCamera.name}
            </span>

            {/* Audio Signal Status Badge */}
            <span className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded ${
              hasAudioTrack ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
            }`}>
              {hasAudioTrack ? <Mic className="w-3 h-3 text-emerald-400" /> : <MicOff className="w-3 h-3 text-amber-400" />}
              <span>{hasAudioTrack ? 'MIC LIVE' : 'NO MIC'}</span>
            </span>

            {/* Volume Slider & Main Audio Monitor Toggle */}
            <div className="flex items-center gap-2 bg-black/40 px-2 py-1 rounded-lg border border-white/10">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : monitorVolume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  handleVolumeChange(val);
                  if (isMuted && val > 0) {
                    setIsMuted(false);
                  }
                }}
                className="w-16 h-1.5 accent-emerald-500 bg-slate-700 rounded-lg cursor-pointer"
                title={`Monitor Volume: ${Math.round(monitorVolume * 100)}%`}
              />
              <button
                onClick={handleToggleAudio}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition shadow-sm ${
                  !isMuted 
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/50' 
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                }`}
                title="Toggle Live Audio Monitoring on Main Screen"
              >
                {!isMuted ? (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-white animate-pulse" />
                    <span>AUDIO ON</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                    <span>UNMUTE</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="relative aspect-video bg-black w-full overflow-hidden group">
        {programCamera ? (
          programCamera.isPhysical ? (
            <>
            {programCamera.fallbackFrame && (
              <img src={programCamera.fallbackFrame} className="absolute inset-0 w-full h-full object-contain" style={{ zIndex: (!programCamera.stream || !videoRef.current || videoRef.current.readyState < 2) ? 10 : -1 }} />
            )}
            <video
              ref={(el) => {
                videoRef.current = el;
                if (el && programCamera?.stream && el.srcObject !== programCamera.stream) {
                  console.log('[DEBUG] Immediate binding PGM ref callback');
                  el.srcObject = programCamera.stream;
                  el.play().catch(e => console.error('PGM play error:', e));
                }
              }}
              className="absolute inset-0 w-full h-full object-contain"
              autoPlay
              playsInline
              muted
            />
            </>
          ) : (
             <canvas
              ref={(el) => {
                if (el) {
                  (window as any)[`pgm-canvas-${programCamera.id}`] = el;
                  const ctx = el.getContext('2d');
                  if (ctx) {
                    ctx.fillStyle = '#000';
                    ctx.fillRect(0, 0, el.width, el.height);
                    ctx.fillStyle = '#fff';
                    ctx.font = '20px monospace';
                    ctx.fillText('Simulated PGM ' + programCamera.id, 20, 50);
                  }
                }
              }}
              width={640}
              height={360}
              className="absolute inset-0 w-full h-full object-contain"
             />
          )
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-white/20 font-mono text-sm">
            NO SIGNAL
          </div>
        )}

        {/* Floating Quick Unmute Banner if audio is muted */}
        {isMuted && programCamera && (
          <div 
            onClick={handleToggleAudio}
            className="absolute bottom-3 left-3 z-30 cursor-pointer bg-slate-950/80 hover:bg-slate-900 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 text-white text-xs flex items-center gap-2 shadow-lg transition"
          >
            <VolumeX className="w-3.5 h-3.5 text-amber-400" />
            <span>Click to enable speaker audio</span>
          </div>
        )}

        {/* PIP */}
        {pipCamera && pipCamera.isPhysical && (
          <div className={`absolute w-1/3 aspect-video bg-black rounded-lg overflow-hidden border-2 border-blue-500/50 shadow-2xl z-10 
            ${switcherState.pipPosition === 'bottom-right' ? 'bottom-4 right-4' : ''}
            ${switcherState.pipPosition === 'bottom-left' ? 'bottom-4 left-4' : ''}
            ${switcherState.pipPosition === 'top-right' ? 'top-4 right-4' : ''}
            ${switcherState.pipPosition === 'top-left' ? 'top-4 left-4' : ''}
          `}>
             <video
              ref={pipVideoRef}
              className="absolute inset-0 w-full h-full object-contain"
              autoPlay
              playsInline
              muted
            />
          </div>
        )}

        <canvas
          ref={overlayCanvasRef}
          width={1280}
          height={720}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none z-20"
        />
      </div>
    </div>
  );
};
