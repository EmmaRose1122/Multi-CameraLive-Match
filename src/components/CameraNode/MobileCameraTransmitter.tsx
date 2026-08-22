import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Radio,
  Eye,
  Zap,
  Moon,
  Sun,
  SwitchCamera,
  BatteryCharging,
  Flame,
  Wifi,
  Settings,
  ArrowLeft,
  Volume2,
  Mic,
  MicOff,
} from 'lucide-react';
import { TallyState, CameraAngle } from '../../types/broadcast';
import { webrtcService } from '../../services/webrtcService';
import { CameraNode } from '../../types/broadcast';

interface MobileCameraTransmitterProps {
  onBackToSwitcher: () => void;
  assignedAngle?: CameraAngle;
}

export const MobileCameraTransmitter: React.FC<MobileCameraTransmitterProps> = ({
  onBackToSwitcher,
  assignedAngle = 'left-goal',
}) => {
  const [tallyState, setTallyState] = useState<TallyState>('standby');
  const [isFrontCamera, setIsFrontCamera] = useState(false);
  const [torchActive, setTorchActive] = useState(false);
  const [screenDimmed, setScreenDimmed] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [micLevel, setMicLevel] = useState<number>(0);
  const [resolution, setResolution] = useState<'1080p' | '720p'>('1080p');
  const [fps, setFps] = useState<number>(60);
  const [batteryLevel, setBatteryLevel] = useState<number>(85);
  const [tempC, setTempC] = useState<number>(32);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.error('Mobile video play error:', e));
      }
    }
  }, [stream]);

  // Initialize camera
  useEffect(() => {
    let currentStream: MediaStream | null = null;

    async function startCam() {
      if (!navigator.mediaDevices) {
        setErrorMsg('Camera access requires HTTPS or localhost. Please use a secure URL (https://...)');
        return;
      }
      try {
        const isPortrait = window.innerHeight > window.innerWidth;
        const idealW = resolution === '1080p' ? 1920 : 1280;
        const idealH = resolution === '1080p' ? 1080 : 720;
        
        // Remove strict width/height to let the device naturally orient the sensor,
        // but prefer the highest resolution available that matches the target.
        let constraints: MediaStreamConstraints = {
          video: {
            facingMode: isFrontCamera ? 'user' : 'environment',
            width: resolution === '1080p' ? { ideal: 1920 } : { ideal: 1280 },
            height: resolution === '1080p' ? { ideal: 1080 } : { ideal: 720 },
            frameRate: { ideal: fps },
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        };
        
        let s;
        try {
          s = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (initialErr) {
          console.warn("High-res constraints failed, falling back to safe constraints", initialErr);
          try {
            constraints = { 
              video: { facingMode: isFrontCamera ? 'user' : 'environment' }, 
              audio: true 
            };
            s = await navigator.mediaDevices.getUserMedia(constraints);
          } catch (audioErr) {
            console.warn("Audio+Video getUserMedia failed, attempting video-only", audioErr);
            s = await navigator.mediaDevices.getUserMedia({ 
              video: { facingMode: isFrontCamera ? 'user' : 'environment' }
            });
          }
        }

        s.getAudioTracks().forEach((track) => {
          track.enabled = !micMuted;
          console.log(`[MobileCamera] Active mic track: ${track.label} (ID: ${track.id}, readyState: ${track.readyState})`);
        });

        currentStream = s;
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
        webrtcService.setLocalStream(s);
        
        // IMPORTANT: Only connect WebRTC AFTER stream is acquired so tracks exist for the initial offer!
        if (!webrtcService.getClientId() || webrtcService.getClientId() === '') {
          webrtcService.connect('camera', assignedAngle, `Phone Cam (${assignedAngle})`);
        } else if (webrtcService.getRole() !== 'camera') {
          // If we navigated here from another tab, update our role on the server
          webrtcService.updateRoleAndAngle('camera', assignedAngle, `Phone Cam (${assignedAngle})`);
        }
      } catch (err: any) {
        console.warn('Physical camera access error:', err);
        setErrorMsg('Camera permissions requested or simulated hardware node in use.');
      }
    }

    startCam();
    webrtcService.onTallyState((state) => {
      setTallyState(state);
      // Play subtle vibration on mobile if live program
      if (state === 'program' && navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
    });

    webrtcService.onRemoteControl((cmd, val) => {
      if (cmd === 'dim-screen') {
        setScreenDimmed(val);
      } else if (cmd === 'torch') {
        setTorchActive(val);
      }
    });

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isFrontCamera, resolution, fps, assignedAngle]);

 

  // Live Frame Streaming Fallback (MJPEG / WebSocket Frame Sync)
  useEffect(() => {
    if (!stream) return;
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    let active = true;
    const interval = setInterval(() => {
      if (!active || !videoRef.current || videoRef.current.readyState < 2) return;
      try {
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          const frameDataUrl = canvas.toDataURL('image/jpeg', 0.6);
          webrtcService.sendFrame(frameDataUrl);
        }
      } catch (e) {
        // Ignore canvas draw error
      }
    }, 66); // ~15 FPS live preview sync over WebSocket

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [stream]);

  // Real-Time Live Microphone Metering & Audio Track Monitoring
  useEffect(() => {
    if (!stream) return;
    const audioTrack = stream.getAudioTracks().find((t) => t.readyState === 'live') || stream.getAudioTracks()[0];
    if (!audioTrack) return;

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    let audioCtx: AudioContext | null = null;
    let micSource: MediaStreamAudioSourceNode | null = null;
    let analyser: AnalyserNode | null = null;
    let animId: number | null = null;

    try {
      audioCtx = new AudioCtx();
      const isolatedAudioStream = new MediaStream([audioTrack]);
      micSource = audioCtx.createMediaStreamSource(isolatedAudioStream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.6;
      micSource.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let lastSendTime = 0;

      const updateMeter = () => {
        if (!analyser) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = micMuted ? 0 : Math.min(100, Math.round((avg / 128) * 100));
        setMicLevel(normalized);

        const now = Date.now();
        if (now - lastSendTime > 100) {
          lastSendTime = now;
          if (!micMuted && normalized > 0) {
            webrtcService.sendAudioChunk('', audioCtx?.sampleRate || 48000, normalized / 100);
          }
        }

        animId = requestAnimationFrame(updateMeter);
      };

      animId = requestAnimationFrame(updateMeter);
    } catch (e) {
      console.warn('Error setting up mic analyser:', e);
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
      try {
        if (micSource) micSource.disconnect();
        if (analyser) analyser.disconnect();
        if (audioCtx && audioCtx.state !== 'closed') audioCtx.close().catch(() => {});
      } catch (e) {}
    };
  }, [stream, micMuted]);

  // Audio Mute Toggle
  useEffect(() => {
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = !micMuted;
      });
    }
  }, [micMuted, stream]);

  // Battery & Thermal simulator
  useEffect(() => {
    const interval = setInterval(() => {
      setTempC((prev) => (screenDimmed ? Math.max(30, prev - 0.2) : Math.min(41, prev + 0.1)));
      webrtcService.sendTelemetry(batteryLevel, fps, Math.round(tempC), resolution);
      webrtcService.getSenderStatsAndScale();
    }, 3000);
    return () => clearInterval(interval);
  }, [batteryLevel, fps, tempC, resolution, screenDimmed]);

  // Tally border styling
  let tallyBorderClass = 'border-slate-800';
  let tallyGlow = '';
  let tallyLabel = 'STANDBY';
  let tallyColor = 'text-slate-400';

  if (tallyState === 'program') {
    tallyBorderClass = 'border-8 border-red-600';
    tallyGlow = 'shadow-[inset_0_0_80px_rgba(220,38,38,0.6)]';
    tallyLabel = '● LIVE TO AIR (PROGRAM)';
    tallyColor = 'text-red-500 font-black animate-pulse';
  } else if (tallyState === 'preview') {
    tallyBorderClass = 'border-8 border-emerald-500';
    tallyGlow = 'shadow-[inset_0_0_60px_rgba(16,185,129,0.5)]';
    tallyLabel = '● PREVIEW (NEXT ANGLE)';
    tallyColor = 'text-emerald-400 font-black';
  }

  // Thermal Sleep Screen
  if (screenDimmed) {
    return (
      <div
        onClick={() => setScreenDimmed(false)}
        className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-6 text-center select-none cursor-pointer"
      >
        <Moon className="w-12 h-12 text-indigo-500 animate-pulse mb-4" />
        <h2 className="text-xl font-bold text-white mb-1">Thermal Sleep Mode Active</h2>
        <p className="text-xs text-slate-400 max-w-xs mb-6">
          Display brightness minimized to protect phone battery & prevent overheating during 90-minute match.
          Video stream continues at 1080p60 in background.
        </p>

        <div className="flex items-center gap-3 bg-slate-900/80 px-4 py-2 rounded-full border border-slate-800 text-xs text-slate-300 font-mono mb-8">
          <span>{assignedAngle.toUpperCase()}</span>
          <span>•</span>
          <span>{tempC.toFixed(1)}°C (Cooling)</span>
          <span>•</span>
          <span className="text-emerald-400">{batteryLevel}%</span>
        </div>

        <span className="text-xs font-bold text-indigo-400 border border-indigo-500/40 px-4 py-1.5 rounded-full">
          Tap anywhere to wake display
        </span>
      </div>
    );
  }

  return (
    <div
      className={`fixed inset-0 z-40 bg-black flex flex-col overflow-hidden transition-all duration-300 select-none ${tallyBorderClass} ${tallyGlow}`}
    >
      {/* Top Mobile Transmitter HUD */}
      <div className="absolute top-0 inset-x-0 z-20 bg-gradient-to-b from-black/90 via-black/40 to-transparent p-4 flex items-center justify-between">
        <div className="w-24"></div> {/* Spacer to maintain centering */}

        {/* Tally Light Indicator */}
        <div className="flex items-center gap-2 bg-slate-950/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-800 shadow-xl">
          <span
            className={`w-3 h-3 rounded-full ${
              tallyState === 'program'
                ? 'bg-red-600 animate-ping'
                : tallyState === 'preview'
                ? 'bg-emerald-500'
                : 'bg-slate-600'
            }`}
          />
          <span className={`text-xs tracking-wider ${tallyColor}`}>{tallyLabel}</span>
        </div>

        {/* Telemetry Badge */}
        <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-mono text-slate-300">
          <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
          <span>{batteryLevel}%</span>
          <span>•</span>
          <Flame className="w-3.5 h-3.5 text-rose-400" />
          <span>{tempC.toFixed(0)}°C</span>
        </div>
      </div>

      {/* Main Camera Video Surface */}
      <div className="flex-1 w-full h-full relative bg-slate-950 flex items-center justify-center">
        {stream ? (
          <>
          <video
            ref={(el) => {
              videoRef.current = el;
              if (el && stream && el.srcObject !== stream) {
                el.srcObject = stream;
                el.play().catch(e => console.error("Mobile cam play error:", e));
              }
            }}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain"
          />
          <div className="absolute top-16 left-0 right-0 flex justify-center pointer-events-none z-10">
             <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-white/70 text-[10px] font-medium border border-white/10 shadow-lg flex items-center gap-2">
                <span>⚠️ If video is upside down, turn ON Auto-Rotate on your phone</span>
             </div>
          </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <Camera className="w-12 h-12 text-sky-400 animate-pulse" />
            <h3 className="font-bold text-white text-base">
              Transmitting {assignedAngle.toUpperCase()} Feed
            </h3>
            <p className="text-xs text-slate-400 max-w-sm">
              {errorMsg || 'Connecting local hardware sensor to Master Broadcast Console over LAN...'}
            </p>
          </div>
        )}

        {/* Center Crosshair Grid for Camera Operator */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30">
          <div className="w-16 h-16 border-2 border-white rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full" />
          </div>
        </div>
      </div>

      {/* Bottom Camera Operator Controls */}
      <div className="absolute bottom-0 inset-x-0 z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 flex flex-wrap items-center justify-center sm:justify-between gap-3">
        {/* Left: Resolution & FPS */}
        <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md p-1 rounded-xl border border-slate-700 text-xs">
          <button
            onClick={() => setResolution(resolution === '1080p' ? '720p' : '1080p')}
            className="px-2.5 py-1 rounded-lg bg-slate-800 text-sky-400 font-bold"
          >
            {resolution}
          </button>
          <button
            onClick={() => setFps(fps === 60 ? 30 : 60)}
            className="px-2.5 py-1 rounded-lg bg-slate-800 text-emerald-400 font-bold font-mono"
          >
            {fps} FPS
          </button>
        </div>

        {/* Center: Flip & Torch */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsFrontCamera(!isFrontCamera)}
            className="p-3 rounded-full bg-slate-900/90 hover:bg-slate-800 text-white shadow-xl border border-slate-700 transition"
            title="Switch Camera (Front/Back)"
          >
            <SwitchCamera className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-full border border-slate-700">
            <button
              onClick={() => setMicMuted(!micMuted)}
              className={`p-2 rounded-full shadow-xl transition ${
                micMuted
                  ? 'bg-rose-500 text-white'
                  : 'bg-slate-800 text-emerald-400 hover:bg-slate-700'
              }`}
              title="Toggle Microphone"
            >
              {micMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            {/* Live Mic Meter */}
            <div className="w-10 h-3 bg-black/60 rounded-full overflow-hidden p-0.5 flex items-center mr-1">
              <div
                className={`h-full rounded-full transition-all duration-75 ${
                  micMuted ? 'bg-slate-600' : micLevel > 70 ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
                style={{ width: `${micMuted ? 0 : Math.max(8, micLevel)}%` }}
              />
            </div>
          </div>
          <button
            onClick={() => setTorchActive(!torchActive)}
            className={`p-3 rounded-full shadow-xl transition ${
              torchActive
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-900/90 text-slate-300 border border-slate-700'
            }`}
            title="Toggle Flashlight Torch"
          >
            <Zap className="w-5 h-5" />
          </button>
        </div>

        {/* Right: Thermal Sleep Saver */}
        <button
          onClick={() => setScreenDimmed(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition"
        >
          <Moon className="w-4 h-4" />
          <span className="hidden sm:inline">Thermal Sleep</span>
        </button>
      </div>
    </div>
  );
};
