import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { CameraNode, SwitcherState, ScoreboardState } from '../../types/broadcast';
import { graphicsCompositor } from '../../services/graphicsCompositor';
import { matchSimulator } from '../../services/simulationData';

interface ProgramMonitorProps {
  cameras: CameraNode[];
  switcherState: SwitcherState;
  scoreboard?: ScoreboardState;
}

export const ProgramMonitor: React.FC<ProgramMonitorProps> = ({ cameras, switcherState, scoreboard }) => {
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const pipVideoRef = useRef<HTMLVideoElement>(null);

  const programCamera = cameras.find(c => c.id === switcherState.programCameraId);
  const pipCamera = switcherState.pipEnabled ? cameras.find(c => c.id === switcherState.pipCameraId) : null;

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
      <div className="px-3 py-1.5 bg-red-600/20 border-b border-red-500/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
          <span className="text-red-100 font-bold text-xs uppercase tracking-widest">Program Output (Live)</span>
        </div>
        {programCamera && (
          <div className="flex items-center gap-4">
            <span className="text-white/60 font-mono text-[10px] uppercase truncate max-w-[150px]">
              {programCamera.name}
            </span>
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`p-1.5 rounded transition ${isMuted ? 'bg-slate-800 text-slate-400' : 'bg-red-500/20 text-red-400'}`}
              title="Toggle Program Audio"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        )}
      </div>
      <div className="relative aspect-video bg-black w-full overflow-hidden">
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
              muted={isMuted}
            />
            </>
          ) : (
             <canvas
              ref={(el) => {
                if (el) {
                  // Hack to let the match simulator draw to this canvas too
                  // We'll give it a special id
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
