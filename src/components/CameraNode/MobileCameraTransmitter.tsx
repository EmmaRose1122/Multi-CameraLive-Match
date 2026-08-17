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
} from 'lucide-react';
import { TallyState, CameraAngle } from '../../types/broadcast';
import { webrtcService } from '../../services/webrtcService';

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
  const [resolution, setResolution] = useState<'1080p' | '720p'>('1080p');
  const [fps, setFps] = useState<number>(60);
  const [batteryLevel, setBatteryLevel] = useState<number>(85);
  const [tempC, setTempC] = useState<number>(32);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Initialize camera
  useEffect(() => {
    let currentStream: MediaStream | null = null;

    async function startCam() {
      try {
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: isFrontCamera ? 'user' : 'environment',
            width: resolution === '1080p' ? { ideal: 1920 } : { ideal: 1280 },
            height: resolution === '1080p' ? { ideal: 1080 } : { ideal: 720 },
            frameRate: { ideal: fps },
          },
          audio: true,
        };

        const s = await navigator.mediaDevices.getUserMedia(constraints);
        currentStream = s;
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
        webrtcService.setLocalStream(s);
      } catch (err: any) {
        console.warn('Physical camera access error:', err);
        setErrorMsg('Camera permissions requested or simulated hardware node in use.');
      }
    }

    startCam();

    // Connect WebRTC signaling as camera node
    webrtcService.connect('camera', assignedAngle, `Phone Cam (${assignedAngle})`);
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

  // Battery & Thermal simulator
  useEffect(() => {
    const interval = setInterval(() => {
      setTempC((prev) => (screenDimmed ? Math.max(30, prev - 0.2) : Math.min(41, prev + 0.1)));
      webrtcService.sendTelemetry(batteryLevel, fps, Math.round(tempC), resolution);
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
        <button
          onClick={onBackToSwitcher}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 backdrop-blur-md text-white text-xs font-bold border border-slate-700"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit Node</span>
        </button>

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
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
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
      <div className="absolute bottom-0 inset-x-0 z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 flex items-center justify-between gap-3">
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
