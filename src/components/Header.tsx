import React from 'react';
import { Video, Camera, Grid, Smartphone, Youtube, HardDrive, ShieldCheck, Flame, Radio } from 'lucide-react';
import { ScoreboardState, RtmpConfig } from '../types/broadcast';

interface HeaderProps {
  activeTab: 'switcher' | 'camera' | 'multiview' | 'apk-guide';
  setActiveTab: (tab: 'switcher' | 'camera' | 'multiview' | 'apk-guide') => void;
  scoreboard: ScoreboardState;
  rtmpConfig: RtmpConfig;
  connectedNodesCount: number;
  onOpenPairingModal: () => void;
  onOpenDriveModal: () => void;
  isDriveConfigured: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  scoreboard,
  rtmpConfig,
  connectedNodesCount,
  onOpenPairingModal,
  onOpenDriveModal,
  isDriveConfigured,
}) => {
  const min = Math.floor(scoreboard.matchSeconds / 60);
  const sec = scoreboard.matchSeconds % 60;
  const timeStr = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;

  return (
    <header className="bg-white/5 backdrop-blur-xl border-b border-white/10 text-[#E2E8F0] px-4 py-2.5 select-none sticky top-0 z-50 shadow-lg shadow-black/20">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Left: Branding & Live Match Clock */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center font-bold text-xs shadow-lg shadow-red-900/40 text-white">
              LIVE
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm tracking-tight uppercase text-white">
                  MATCH SWITCHER PRO
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/70 font-mono border border-white/10">
                  v4.2.0 RTMP
                </span>
              </div>
              <p className="text-[11px] text-white/50 font-medium">
                Multi-Cam Live Broadcast & Replay Engine
              </p>
            </div>
          </div>

          {/* Quick Score Capsule */}
          <div className="flex items-center bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-xs">
            <span className="font-bold tracking-widest text-sky-400">{scoreboard.homeTeam.shortName}</span>
            <span className="mx-2 font-mono font-bold text-red-500 text-sm">
              {scoreboard.homeTeam.score} - {scoreboard.awayTeam.score}
            </span>
            <span className="font-bold tracking-widest text-rose-400 mr-2">{scoreboard.awayTeam.shortName}</span>
            <span className="w-px h-3.5 bg-white/20 mr-2"></span>
            <span className="text-[11px] font-mono text-white/80">
              {scoreboard.period} {timeStr}
            </span>
          </div>
        </div>

        {/* Center: Navigation Tabs */}
        <div className="flex items-center bg-black/40 backdrop-blur-md p-1 rounded-xl border border-white/10 text-xs font-semibold">
          <button
            id="nav-switcher-tab"
            onClick={() => setActiveTab('switcher')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'switcher'
                ? 'bg-red-600 text-white shadow-lg shadow-red-900/40 font-bold'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Master Switcher</span>
          </button>

          <button
            id="nav-multiview-tab"
            onClick={() => setActiveTab('multiview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'multiview'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-900/40 font-bold'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Multiview Grid</span>
          </button>

          <button
            id="nav-camera-tab"
            onClick={() => setActiveTab('camera')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'camera'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40 font-bold'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Phone Cam Node</span>
          </button>

          <button
            id="nav-apk-tab"
            onClick={() => setActiveTab('apk-guide')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'apk-guide'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/40 font-bold'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Android APK & Native</span>
          </button>
        </div>

        {/* Right: Broadcast Status & Tool Integrations */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          {/* LAN Connected Cameras */}
          <button
            id="btn-pair-cameras"
            onClick={onOpenPairingModal}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 transition-colors"
            title="Manage LAN Phone Cameras & QR Pairing"
          >
            <Camera className="w-3.5 h-3.5 text-sky-400" />
            <span>{connectedNodesCount} Cams LAN</span>
          </button>

          {/* Google Drive Match Archive */}
          <button
            id="btn-drive-archive"
            onClick={onOpenDriveModal}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 transition-colors"
            title="Google Drive Match Highlight Archive"
          >
            <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Drive Archive</span>
          </button>

          {/* YouTube RTMP Status Pill */}
          <div
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-bold border transition-all ${
              rtmpConfig.isLive
                ? 'bg-red-950/60 text-red-400 border-red-500/40 shadow-lg shadow-red-900/30'
                : 'bg-black/40 text-white/40 border-white/10'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${rtmpConfig.isLive ? 'bg-red-500 animate-pulse' : 'bg-white/20'}`} />
            <Youtube className={`w-3.5 h-3.5 ${rtmpConfig.isLive ? 'text-red-500' : 'text-white/40'}`} />
            <span className="font-mono text-[11px]">{rtmpConfig.isLive ? '1080P60 ON AIR' : 'RTMP OFF'}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
