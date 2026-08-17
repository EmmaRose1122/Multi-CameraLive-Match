import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  X,
  QrCode,
  Smartphone,
  Zap,
  Moon,
  Battery,
  Flame,
  Wifi,
  Copy,
  Check,
  Camera,
  ExternalLink,
} from 'lucide-react';
import { CameraNode } from '../../types/broadcast';

interface RemoteCameraFleetModalProps {
  isOpen: boolean;
  onClose: () => void;
  cameras: CameraNode[];
  onToggleTorch: (cameraId: string) => void;
  onToggleDimScreen: (cameraId: string) => void;
  onAddPhysicalCamera: (node: Partial<CameraNode>) => void;
}

export const RemoteCameraFleetModal: React.FC<RemoteCameraFleetModalProps> = ({
  isOpen,
  onClose,
  cameras,
  onToggleTorch,
  onToggleDimScreen,
  onAddPhysicalCamera,
}) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [selectedAngle, setSelectedAngle] = useState<'left-goal' | 'right-goal' | 'center' | 'tactical'>('left-goal');

  const pairUrl = `${window.location.origin}/?mode=camera&angle=${selectedAngle}`;

  useEffect(() => {
    if (isOpen) {
      QRCode.toDataURL(pairUrl, {
        width: 220,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch((e) => console.error(e));
    }
  }, [isOpen, selectedAngle, pairUrl]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(pairUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulateAddPhone = () => {
    const angleNames = {
      'left-goal': 'Left Goal Post (North)',
      'right-goal': 'Right Goal Post (South)',
      center: 'Center Field Line',
      tactical: 'Tactical High Press',
    };
    onAddPhysicalCamera({
      id: `cam_phone_${Date.now()}`,
      name: `Pixel 8 Pro • ${angleNames[selectedAngle]}`,
      angle: selectedAngle,
      isPhysical: true,
      resolution: '1080p',
      fps: 60,
      batteryLevel: 88,
      temperatureC: 34,
      tallyState: 'standby',
      torchOn: false,
      screenDimmed: false,
      bitrateKbps: 5800,
      latencyMs: 38,
      audioLevel: 55,
      isConnected: true,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Smartphone className="w-5 h-5 text-sky-400" />
            <h3 className="font-bold text-white text-base">
              Wireless Phone Camera Fleet & QR Pairing
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex flex-col gap-5 overflow-y-auto max-h-[80vh]">
          {/* Pair via QR Code Section */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row items-center gap-5">
            {/* QR Code Canvas */}
            <div className="bg-white p-2.5 rounded-xl shrink-0 shadow-lg">
              {qrCodeDataUrl ? (
                <img src={qrCodeDataUrl} alt="Pairing QR" className="w-36 h-36" />
              ) : (
                <div className="w-36 h-36 flex items-center justify-center text-slate-400 text-xs">
                  Generating QR...
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="flex flex-col gap-2 text-xs flex-1">
              <span className="font-black text-white text-sm">
                1. Select Camera Assignment:
              </span>
              <div className="grid grid-cols-2 gap-1.5 mb-1">
                {(
                  [
                    { id: 'left-goal', label: 'Left Goal Cam' },
                    { id: 'right-goal', label: 'Right Goal Cam' },
                    { id: 'center', label: 'Center Field Cam' },
                    { id: 'tactical', label: 'Tactical Cam' },
                  ] as const
                ).map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setSelectedAngle(a.id)}
                    className={`px-2.5 py-1.5 rounded-lg font-bold text-left transition ${
                      selectedAngle === a.id
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>

              <span className="text-slate-400">
                2. Scan QR code on your mobile phone (connected to same Wi-Fi router/hotspot) to start wireless 1080p streaming.
              </span>

              {/* Direct Link */}
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  readOnly
                  value={pairUrl}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-300 font-mono text-[11px]"
                />
                <button
                  onClick={handleCopyLink}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition flex items-center gap-1"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <button
                onClick={handleSimulateAddPhone}
                className="mt-2 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 font-bold text-xs border border-slate-700 self-start transition flex items-center gap-1.5"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Simulate Connect Phone Node ({selectedAngle})</span>
              </button>
            </div>
          </div>

          {/* Active Fleet Management List */}
          <div className="flex flex-col gap-2">
            <span className="font-bold text-white text-xs uppercase tracking-wider">
              Connected Hardware Nodes ({cameras.length})
            </span>

            <div className="flex flex-col gap-2">
              {cameras.map((cam, idx) => (
                <div
                  key={`fleet-cam-${cam.id}-${idx}`}
                  className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-sky-400 font-bold">
                      <Camera className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-white text-xs">{cam.name}</p>
                      <div className="flex items-center gap-2 text-slate-400 text-[11px] font-mono">
                        <span>{cam.resolution} @ {cam.fps}fps</span>
                        <span>•</span>
                        <span className="text-emerald-400">{cam.bitrateKbps} kbps</span>
                        <span>•</span>
                        <span>{cam.latencyMs}ms</span>
                      </div>
                    </div>
                  </div>

                  {/* Remote Telemetry & Controls */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-slate-300 font-mono text-[11px]">
                      <Battery className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{cam.batteryLevel}%</span>
                    </div>

                    <div className="flex items-center gap-1 text-slate-300 font-mono text-[11px]">
                      <Flame className="w-3.5 h-3.5 text-rose-400" />
                      <span>{cam.temperatureC}°C</span>
                    </div>

                    {/* Torch Toggle */}
                    <button
                      onClick={() => onToggleTorch(cam.id)}
                      className={`p-1.5 rounded-lg transition ${
                        cam.torchOn
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                      title="Remote Flashlight Torch"
                    >
                      <Zap className="w-3.5 h-3.5" />
                    </button>

                    {/* Dim Screen Toggle */}
                    <button
                      onClick={() => onToggleDimScreen(cam.id)}
                      className={`p-1.5 rounded-lg transition ${
                        cam.screenDimmed
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                      title="Remote Screen Dimmer (Thermal Sleep Mode)"
                    >
                      <Moon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
