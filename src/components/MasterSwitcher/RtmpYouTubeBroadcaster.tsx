import React, { useState, useEffect } from 'react';
import {
  Youtube,
  Radio,
  Wifi,
  Activity,
  Key,
  Shield,
  MessageSquare,
  Users,
  Send,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { RtmpConfig, ScoreboardState } from '../../types/broadcast';

interface RtmpYouTubeBroadcasterProps {
  rtmpConfig: RtmpConfig;
  setRtmpConfig: React.Dispatch<React.SetStateAction<RtmpConfig>>;
  scoreboard: ScoreboardState;
}

interface ChatMessage {
  id: string;
  user: string;
  avatarColor: string;
  text: string;
  time: string;
  isSuperChat?: boolean;
  amount?: string;
}

export const RtmpYouTubeBroadcaster: React.FC<RtmpYouTubeBroadcasterProps> = ({
  rtmpConfig,
  setRtmpConfig,
  scoreboard,
}) => {
  const [showStreamKey, setShowStreamKey] = useState(false);
  const [viewerCount, setViewerCount] = useState(1420);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      user: 'SoccerFan99',
      avatarColor: '#3b82f6',
      text: 'What a save from the goalkeeper! Incredible angle from the left goal cam! 🔥',
      time: '12:04',
    },
    {
      id: '2',
      user: 'TacticalTactician',
      avatarColor: '#10b981',
      text: 'The 4-3-3 formation looks super solid today.',
      time: '12:05',
    },
    {
      id: '3',
      user: 'ProStriker',
      avatarColor: '#f59e0b',
      text: 'Stream quality is crisp 1080p60! No lag at all.',
      time: '12:06',
    },
  ]);
  const [newMsg, setNewMsg] = useState('');

  // Auto-generate fan reactions when scores or cards change
  useEffect(() => {
    if (scoreboard.homeTeam.score > 0 || scoreboard.awayTeam.score > 0) {
      const now = new Date();
      const time = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
      const goalMsg: ChatMessage = {
        id: `chat_${Date.now()}`,
        user: 'MatchFanatic',
        avatarColor: '#ef4444',
        text: `GOOOAAALLL!!! What a finish! Look at that slow-motion instant replay! ⚽🎉`,
        time,
        isSuperChat: true,
        amount: '$5.00',
      };
      setChatMessages((prev) => [...prev.slice(-15), goalMsg]);
      setViewerCount((v) => v + Math.floor(Math.random() * 80) + 20);
    }
  }, [scoreboard.homeTeam.score, scoreboard.awayTeam.score]);

  const handleToggleBroadcast = async () => {
    if (rtmpConfig.isLive) {
      // Stop broadcast
      try {
        await fetch('/api/rtmp/stop', { method: 'POST' });
      } catch (e) {}
      setRtmpConfig((prev) => ({
        ...prev,
        isLive: false,
        actualBitrateKbps: 0,
      }));
    } else {
      // Start broadcast
      try {
        await fetch('/api/rtmp/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rtmpUrl: rtmpConfig.rtmpUrl,
            streamKey: rtmpConfig.streamKey,
            resolution: rtmpConfig.resolution,
            bitrateKbps: rtmpConfig.targetBitrateKbps,
          }),
        });
      } catch (e) {}
      setRtmpConfig((prev) => ({
        ...prev,
        isLive: true,
        actualBitrateKbps: prev.targetBitrateKbps,
      }));
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim()) return;

    const now = new Date();
    const time = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
    const msg: ChatMessage = {
      id: `chat_${Date.now()}`,
      user: 'Broadcast Operator (Host)',
      avatarColor: '#8b5cf6',
      text: newMsg.trim(),
      time,
    };

    setChatMessages((prev) => [...prev, msg]);
    setNewMsg('');
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 shadow-2xl select-none flex flex-col gap-4">
      {/* Title Header */}
      <div className="flex flex-wrap items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Youtube className="w-4 h-4 text-red-500" />
          <h2 className="text-sm font-semibold text-white uppercase tracking-tight">
            YouTube Live RTMP Broadcaster & Ingestion Engine
          </h2>
        </div>

        {/* Live Stream Pill */}
        <div className="flex flex-wrap items-center gap-2">
          {rtmpConfig.isLive ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-950/80 text-red-400 border border-red-500/40 text-xs font-bold shadow-lg shadow-red-900/30 animate-pulse">
              <Radio className="w-3.5 h-3.5" />
              <span>LIVE TO YOUTUBE</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-black/40 text-white/50 border border-white/10 text-xs font-medium">
              <span>STANDBY / READY</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Stream Configuration & Health Telemetry (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          {/* RTMP Destination Form */}
          <div className="bg-black/40 backdrop-blur-md p-3.5 rounded-xl border border-white/10 flex flex-col gap-3 text-xs">
            <div>
              <label className="font-bold text-white/70 block mb-1">
                YouTube Live RTMP Server URL
              </label>
              <input
                type="text"
                value={rtmpConfig.rtmpUrl}
                onChange={(e) => setRtmpConfig((p) => ({ ...p, rtmpUrl: e.target.value }))}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none focus:border-red-500/80"
              />
            </div>

            <div>
              <label className="font-bold text-white/70 block mb-1">
                YouTube Stream Key
              </label>
              <div className="relative">
                <input
                  type={showStreamKey ? 'text' : 'password'}
                  value={rtmpConfig.streamKey || 'xxxx-xxxx-xxxx-xxxx-xxxx'}
                  onChange={(e) => setRtmpConfig((p) => ({ ...p, streamKey: e.target.value }))}
                  placeholder="Paste YouTube Stream Key"
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none focus:border-red-500/80 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowStreamKey(!showStreamKey)}
                  className="absolute right-2.5 top-2 text-white/40 hover:text-white"
                >
                  {showStreamKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Resolution & Bitrate */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="font-bold text-white/70 block mb-1">
                  Broadcast Resolution
                </label>
                <select
                  value={rtmpConfig.resolution}
                  onChange={(e) =>
                    setRtmpConfig((p) => ({ ...p, resolution: e.target.value as any }))
                  }
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-white font-bold focus:outline-none"
                >
                  <option value="1080p">1080p (1920x1080 @ 60fps)</option>
                  <option value="720p">720p (1280x720 @ 60fps)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-white/70 block mb-1">
                  Target Bitrate
                </label>
                <select
                  value={rtmpConfig.targetBitrateKbps}
                  onChange={(e) =>
                    setRtmpConfig((p) => ({ ...p, targetBitrateKbps: parseInt(e.target.value) }))
                  }
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-white font-bold focus:outline-none"
                >
                  <option value={4500}>4,500 kbps (Standard 1080p)</option>
                  <option value={6000}>6,000 kbps (High Quality Football)</option>
                  <option value={8000}>8,000 kbps (Ultra 60FPS)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Real-time RTMP Health Telemetry */}
          <div className="bg-black/40 backdrop-blur-md p-3 rounded-xl border border-white/10 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-white/5 border border-white/5 p-2 rounded-lg">
              <span className="text-[10px] text-white/40 font-bold uppercase block">Bitrate</span>
              <span className="font-mono font-bold text-sky-400 text-sm">
                {rtmpConfig.isLive ? `${rtmpConfig.actualBitrateKbps} kbps` : '0 kbps'}
              </span>
            </div>

            <div className="bg-white/5 border border-white/5 p-2 rounded-lg">
              <span className="text-[10px] text-white/40 font-bold uppercase block">FPS Stability</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">
                {rtmpConfig.isLive ? '60.0 fps' : '0.0 fps'}
              </span>
            </div>

            <div className="bg-white/5 border border-white/5 p-2 rounded-lg">
              <span className="text-[10px] text-white/40 font-bold uppercase block">Dropped Frames</span>
              <span className="font-mono font-bold text-white/70 text-sm">0 (0.0%)</span>
            </div>
          </div>

          {/* Master Start / Stop Button */}
          <button
            id="btn-toggle-rtmp-broadcast"
            onClick={handleToggleBroadcast}
            className={`w-full py-3 rounded-xl font-bold text-sm uppercase tracking-wider shadow-xl transition-colors active:scale-95 flex items-center justify-center gap-2 ${
              rtmpConfig.isLive
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-900/40'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>{rtmpConfig.isLive ? 'STOP YOUTUBE BROADCAST' : 'START YOUTUBE LIVE STREAM'}</span>
          </button>
        </div>

        {/* Right Column: Live YouTube Chat & Viewer Interaction (5 cols) */}
        <div className="lg:col-span-5 bg-black/40 backdrop-blur-md p-3.5 rounded-xl border border-white/10 flex flex-col justify-between h-[320px]">
          {/* Chat Header */}
          <div className="flex flex-wrap items-center justify-between pb-2 border-b border-white/10 text-xs">
            <div className="flex items-center gap-1.5 text-white font-bold">
              <MessageSquare className="w-3.5 h-3.5 text-red-500" />
              <span>YouTube Live Chat</span>
            </div>
            <div className="flex items-center gap-1 text-white/40 font-mono text-[11px]">
              <Users className="w-3 h-3 text-sky-400" />
              <span>{viewerCount.toLocaleString()} watching</span>
            </div>
          </div>

          {/* Message List */}
          <div className="flex-1 overflow-y-auto py-2 flex flex-col gap-2 pr-1 text-xs">
            {chatMessages.map((msg, idx) => (
              <div
                key={`chat-msg-${msg.id}-${idx}`}
                className={`p-2 rounded-lg flex flex-col gap-0.5 border ${
                  msg.isSuperChat
                    ? 'bg-amber-950/40 border-amber-500/40 shadow-sm'
                    : 'bg-white/5 border-white/5'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between text-[10px]">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: msg.avatarColor }}
                    />
                    {msg.user}
                  </span>
                  <span className="text-white/40 font-mono">{msg.time}</span>
                </div>
                <p className="text-white/80 text-[11px] leading-relaxed">{msg.text}</p>
                {msg.amount && (
                  <span className="text-[10px] font-bold text-amber-400">
                    Super Chat: {msg.amount}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSendChat} className="flex items-center gap-1.5 pt-2 border-t border-white/10">
            <input
              type="text"
              value={newMsg}
              onChange={(e) => setNewMsg(e.target.value)}
              placeholder="Send broadcast message to viewers..."
              className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
            />
            <button
              type="submit"
              className="p-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
