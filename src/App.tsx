/**
 * Custom Multi-Camera Live Streaming & Video Switching Application
 * Designed for Live Football Match Coverage
 */

import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { MultiviewGrid } from './components/MasterSwitcher/MultiviewGrid';
import { ProgramMonitor } from './components/MasterSwitcher/ProgramMonitor';
import { ScoreboardOverlayPanel } from './components/MasterSwitcher/ScoreboardOverlayPanel';
import { InstantReplayDeck } from './components/MasterSwitcher/InstantReplayDeck';
import { RtmpYouTubeBroadcaster } from './components/MasterSwitcher/RtmpYouTubeBroadcaster';
import { RemoteCameraFleetModal } from './components/MasterSwitcher/RemoteCameraFleetModal';
import { MobileCameraTransmitter } from './components/CameraNode/MobileCameraTransmitter';
import { ApkArchitectureGuide } from './components/ApkArchitectureGuide';
import { GoogleDriveSaveModal } from './components/GoogleDriveSaveModal';

import {
  CameraNode,
  SwitcherState,
  ScoreboardState,
  RtmpConfig,
  MatchEvent,
} from './types/broadcast';
import { webrtcService } from './services/webrtcService';
import { googleDriveService } from './services/googleDriveService';

export default function App() {
  // Navigation & Role Modes
  const [activeTab, setActiveTab] = useState<'switcher' | 'camera' | 'multiview' | 'apk-guide'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get('mode');
      if (mode === 'camera') return 'camera';
      if (mode === 'multiview') return 'multiview';
    }
    return 'switcher';
  });
  
  useEffect(() => { if (activeTab === 'camera') (window as any).__hasStartedCamera = true; }, [activeTab]);
  const [isPairingModalOpen, setIsPairingModalOpen] = useState(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [pendingDriveBlob, setPendingDriveBlob] = useState<Blob | null>(null);
  const [pendingDriveName, setPendingDriveName] = useState<string>('');
  const [pendingDriveMeta, setPendingDriveMeta] = useState<any>(null);

  // Scoreboard Match State
  const [scoreboard, setScoreboard] = useState<ScoreboardState>({
    homeTeam: {
      name: 'Manchester Blue',
      shortName: 'MCI',
      primaryColor: '#0284c7',
      secondaryColor: '#38bdf8',
      score: 1,
    },
    awayTeam: {
      name: 'Madrid White',
      shortName: 'RMA',
      primaryColor: '#e11d48',
      secondaryColor: '#fb7185',
      score: 0,
    },
    period: '1H',
    matchSeconds: 38 * 60 + 24, // 38:24 min
    isRunning: true,
    stoppageMinutes: 2,
    showScoreboard: true,
    showClock: true,
    showLowerThird: false,
    customLowerThird: {
      title: 'LIVE MATCH COVERAGE',
      subtitle: 'Commentary: John Smith & Sarah Jones',
    },
    activeBanner: null,
    theme: 'premier',
    stationName: 'FOOTBALL LIVE HD',
  });

  // Switcher State
  const [switcherState, setSwitcherState] = useState<SwitcherState>({
    programCameraId: 'cam_center',
    previewCameraId: 'cam_left_goal',
    transitionType: 'cut',
    transitionDurationMs: 1000,
    transitionProgress: 0,
    isTransitioning: false,
    pipEnabled: false,
    pipCameraId: 'cam_tactical',
    pipPosition: 'top-right',
    isReplayActive: false,
    replaySpeed: 0.5,
    replayProgress: 0,
    replayTransitionType: 'glitch',
    isReplayTransitioning: false,
    replayTransitionProgress: 0,
    replayTransitionDurationMs: 450,
    replayTransitionDirection: 'in',
  });

  // Multi-Camera Fleet
  const [cameras, setCameras] = useState<CameraNode[]>([]);

  // RTMP Broadcast Output Config
  const [rtmpConfig, setRtmpConfig] = useState<RtmpConfig>({
    isLive: true,
    rtmpUrl: 'rtmp://a.rtmp.youtube.com/live2',
    streamKey: 'live_match_stream_key_9941',
    resolution: '1080p',
    targetBitrateKbps: 6000,
    actualBitrateKbps: 5940,
    fps: 60,
    droppedFrames: 0,
    uptimeSeconds: 2304,
    audioChannel: 'master',
    youtubeChatConnected: true,
  });

  // Match Timer Clock Tick
  useEffect(() => {
    let interval: any = null;
    if (scoreboard.isRunning) {
      interval = setInterval(() => {
        setScoreboard((prev) => ({
          ...prev,
          matchSeconds: prev.matchSeconds + 1,
        }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [scoreboard.isRunning]);

  // Connect WebRTC signaling on start
  useEffect(() => {
    // Check URL parameters for direct phone camera node launch
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'camera') {
      setActiveTab('camera');
      return;
    }

    webrtcService.connect('switcher');
    webrtcService.onRemoteFrame((nodeId, frameDataUrl) => {
      setCameras((currentCameras) => {
        return currentCameras.map((cam) => {
          if (cam.id === nodeId) {
            return { ...cam, fallbackFrame: frameDataUrl };
          }
          return cam;
        });
      });
    });

    webrtcService.onNodesUpdated((nodes) => {
      setCameras((prev) => {
        const existingMap = new Map<string, CameraNode>(prev.map((c) => [c.id, c]));
        
        // Track new nodes we need to call
        const nodesToCall: string[] = [];
        // Keep track of nodes we are currently calling so we don't spam offers
        const callingNodes = (window as any).callingNodes || new Set<string>();
        (window as any).callingNodes = callingNodes;

        nodes.forEach((n) => {
          if (n.role === 'camera' && n.id !== webrtcService.getClientId()) {
            const isNewOrNoStream = (!existingMap.has(n.id) || !existingMap.get(n.id)?.stream) && !callingNodes.has(n.id);
            
            if (existingMap.has(n.id)) {
              const existing = existingMap.get(n.id)!;
              existingMap.set(n.id, {
                ...existing,
                name: n.name || existing.name,
                angle: n.cameraAngle || existing.angle,
                isConnected: true,
                fps: n.deviceInfo?.fps ?? existing.fps,
                resolution: n.deviceInfo?.resolution ?? existing.resolution,
                batteryLevel: n.deviceInfo?.battery ?? existing.batteryLevel,
              });
            } else {
              existingMap.set(n.id, {
                id: n.id,
                name: n.name || `Remote Phone (${n.cameraAngle || 'Cam'})`,
                angle: n.cameraAngle || 'custom',
                isPhysical: true,
                stream: null,
                isConnected: true,
                fps: n.deviceInfo?.fps || 60,
                resolution: n.deviceInfo?.resolution || '1080p',
                batteryLevel: n.deviceInfo?.battery || 85,
                temperatureC: 34,
                tallyState: 'standby',
                torchOn: false,
                screenDimmed: false,
                zoomLevel: 1,
                bitrateKbps: 5800,
                latencyMs: 35,
                audioLevel: 50,
              });
            }
            
            if (isNewOrNoStream) {
              nodesToCall.push(n.id);
            }
          }
        });

        // Fire callCameraNode for new nodes outside of the setState map loop
        // to avoid infinite loops, we just trigger it and let it update state asynchronously
        setTimeout(() => {
          nodesToCall.forEach(nodeId => {
             callingNodes.add(nodeId);
             webrtcService.callCameraNode(nodeId, (remoteStream) => {
                console.log('[DEBUG] App.tsx received remote stream for nodeId:', nodeId, remoteStream.getTracks());
                setCameras((currentCameras) => {
                  const updated = currentCameras.map(cam => 
                    cam.id === nodeId ? { ...cam, stream: remoteStream } : cam
                  );
                  // Auto-select first camera if nothing is selected
                  setSwitcherState(s => {
                    if (updated.length > 0) {
                      const firstId = updated[0].id;
                      if (!updated.find(c => c.id === s.programCamera)) {
                        return { ...s, programCamera: firstId, previewCamera: updated.length > 1 ? updated[1].id : firstId };
                      }
                    }
                    return s;
                  });
                  return updated;
                });
             });
          });
        }, 100);

        const newCameras = Array.from(existingMap.values());
        // Also auto-select on initial connect before stream arrives
        setSwitcherState(s => {
           if (newCameras.length > 0) {
              const firstId = newCameras[0].id;
              if (!newCameras.find(c => c.id === s.programCamera)) {
                 return { ...s, programCamera: firstId, previewCamera: newCameras.length > 1 ? newCameras[1].id : firstId };
              }
           }
           return s;
        });

        return newCameras;
      });
    });
  }, []);

  // Update Tally states across all cameras when Program/Preview camera changes
  useEffect(() => {
    setCameras((prev) =>
      prev.map((c) => {
        let state: 'program' | 'preview' | 'standby' = 'standby';
        if (c.id === switcherState.programCameraId) {
          state = 'program';
          webrtcService.sendTallyCommand(c.id, 'program');
        } else if (c.id === switcherState.previewCameraId) {
          state = 'preview';
          webrtcService.sendTallyCommand(c.id, 'preview');
        } else {
          state = 'standby';
          webrtcService.sendTallyCommand(c.id, 'standby');
        }
        return { ...c, tallyState: state };
      })
    );
  }, [switcherState.programCameraId, switcherState.previewCameraId]);

  // Execute Instant CUT
  const handleExecuteCut = () => {
    setSwitcherState((prev) => ({
      ...prev,
      programCameraId: prev.previewCameraId,
      previewCameraId: prev.programCameraId,
      transitionProgress: 0,
      isTransitioning: false,
    }));
  };

  // Execute AUTO DISSOLVE
  const handleExecuteAuto = () => {
    setSwitcherState((prev) => ({
      ...prev,
      isTransitioning: true,
      transitionProgress: 0,
    }));

    const startTime = performance.now();
    const duration = switcherState.transitionDurationMs;

    const step = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(1, elapsed / duration);

      setSwitcherState((prev) => ({
        ...prev,
        transitionProgress: progress,
      }));

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        // Swap program & preview
        setSwitcherState((prev) => ({
          ...prev,
          programCameraId: prev.previewCameraId,
          previewCameraId: prev.programCameraId,
          transitionProgress: 0,
          isTransitioning: false,
        }));
      }
    };

    requestAnimationFrame(step);
  };

  const handleSelectPreview = (cameraId: string) => {
    setSwitcherState((prev) => ({
      ...prev,
      previewCameraId: cameraId,
    }));
  };

  const handleCutToProgram = (cameraId: string) => {
    setSwitcherState((prev) => ({
      ...prev,
      programCameraId: cameraId,
    }));
  };

  const handleTogglePip = () => {
    setSwitcherState((prev) => ({
      ...prev,
      pipEnabled: !prev.pipEnabled,
    }));
  };

  const handleSelectPipSource = (cameraId: string) => {
    setSwitcherState((prev) => ({
      ...prev,
      pipCameraId: cameraId,
    }));
  };

  const handleSelectPipPosition = (position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left') => {
    setSwitcherState((prev) => ({
      ...prev,
      pipPosition: position,
    }));
  };

  const handleToggleTorch = (cameraId: string) => {
    setCameras((prev) =>
      prev.map((c) => {
        if (c.id === cameraId) {
          const nextTorch = !c.torchOn;
          webrtcService.sendRemoteCameraCommand(cameraId, 'torch', nextTorch);
          return { ...c, torchOn: nextTorch };
        }
        return c;
      })
    );
  };

  const handleToggleDimScreen = (cameraId: string) => {
    setCameras((prev) =>
      prev.map((c) => {
        if (c.id === cameraId) {
          const nextDim = !c.screenDimmed;
          webrtcService.sendRemoteCameraCommand(cameraId, 'dim-screen', nextDim);
          return { ...c, screenDimmed: nextDim };
        }
        return c;
      })
    );
  };

  const handleToggleLatencySim = (cameraId: string) => {
    setCameras((prev) =>
      prev.map((c) => {
        if (c.id === cameraId) {
          // If currently > 100, reset to healthy 28-36ms. Otherwise spike to 142ms.
          const nextLatency = c.latencyMs > 100 ? Math.floor(24 + Math.random() * 15) : 142;
          return { ...c, latencyMs: nextLatency };
        }
        return c;
      })
    );
  };

  const handleAddPhysicalCamera = (node: Partial<CameraNode>) => {
    if (!node.id) return;
    setCameras((prev) => [
      ...prev.filter((c) => c.id !== node.id),
      node as CameraNode,
    ]);
  };

  const handleSaveToDrive = (clipBlob: Blob, clipName: string, metadata: any) => {
    setPendingDriveBlob(clipBlob);
    setPendingDriveName(clipName);
    setPendingDriveMeta(metadata);
    setIsDriveModalOpen(true);
  };

  // Removed early return for camera to keep studio mounted

  return (
    <div className="min-h-screen bg-[#0B0D11] text-[#E2E8F0] flex flex-col font-sans relative selection:bg-red-500 selection:text-white">
      {/* Subtle ambient lighting for frosted glass diffusion */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.12),rgba(255,255,255,0))] -z-10" />
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_60%_60%_at_85%_85%,rgba(59,130,246,0.08),rgba(255,255,255,0))] -z-10" />

      {/* Top Studio Control Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        scoreboard={scoreboard}
        rtmpConfig={rtmpConfig}
        connectedNodesCount={cameras.length}
        onOpenPairingModal={() => setIsPairingModalOpen(true)}
        onOpenDriveModal={() => setIsDriveModalOpen(true)}
        isDriveConfigured={googleDriveService.getIsConfigured()}
      />

      {/* View Switcher based on Active Tab */}
      
      {/* The Camera Node - Keeps running in background if started */}
      {(activeTab === 'camera' || (typeof window !== 'undefined' && window.__hasStartedCamera)) && (
        <div className={activeTab === 'camera' ? 'flex-1 flex flex-col h-screen absolute inset-0 z-[100] bg-black' : 'fixed -top-[9999px] -left-[9999px] w-[10px] h-[10px] opacity-0 pointer-events-none overflow-hidden'}>
          <MobileCameraTransmitter
            onBackToSwitcher={() => setActiveTab('switcher')}
            assignedAngle={typeof window !== 'undefined' ? (new URLSearchParams(window.location.search).get('angle') as any) || 'left-goal' : 'left-goal'}
          />
          {activeTab === 'camera' && (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mode') !== 'camera') && (
            <button onClick={() => setActiveTab('switcher')} className="absolute top-4 left-4 z-50 bg-red-600 px-4 py-2 rounded font-bold">
              ← Back to Studio
            </button>
          )}
        </div>
      )}
      <main className={"flex-1 w-full mx-auto p-3 sm:p-4 flex flex-col gap-4 max-w-[1400px] " + (activeTab === 'camera' ? 'hidden' : '')}>
        {activeTab === 'switcher' && (
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Left Column: Multiview Production Grid (4 Cameras) */}
            <div className="flex-1 overflow-hidden">
              <MultiviewGrid
                cameras={cameras}
                switcherState={switcherState}
                scoreboard={scoreboard}
                onSelectPreview={handleSelectPreview}
                onCutToProgram={handleCutToProgram}
                onToggleTorch={handleToggleTorch}
                onToggleDimScreen={handleToggleDimScreen}
                onTogglePip={handleTogglePip}
                onSelectPipSource={handleSelectPipSource}
                onSelectPipPosition={handleSelectPipPosition}
                onToggleLatencySim={handleToggleLatencySim}
              />
            </div>

            {/* Right Column: Scoreboard Desk & Instant Replay */}
            <div className="w-full lg:w-[400px] xl:w-[450px] flex flex-col gap-4 flex-shrink-0">
              <ProgramMonitor 
                cameras={cameras}
                switcherState={switcherState}
                scoreboard={scoreboard}
              />
              <ScoreboardOverlayPanel
                scoreboard={scoreboard}
                setScoreboard={setScoreboard}
                onTriggerEvent={(e) => console.log('Match Event:', e)}
              />

              <InstantReplayDeck
                switcherState={switcherState}
                setSwitcherState={setSwitcherState}
                scoreboard={scoreboard}
                onSaveToDrive={handleSaveToDrive}
              />
              
              {/* YouTube RTMP Broadcaster & Live Chat Simulator */}
              <RtmpYouTubeBroadcaster
                rtmpConfig={rtmpConfig}
                setRtmpConfig={setRtmpConfig}
                scoreboard={scoreboard}
              />
            </div>
          </div>
        )}

        {activeTab === 'multiview' && (
          <div className="flex flex-col gap-4">
            <MultiviewGrid
              cameras={cameras}
              switcherState={switcherState}
              scoreboard={scoreboard}
              onSelectPreview={handleSelectPreview}
              onCutToProgram={handleCutToProgram}
              onToggleTorch={handleToggleTorch}
              onToggleDimScreen={handleToggleDimScreen}
              onTogglePip={handleTogglePip}
              onSelectPipSource={handleSelectPipSource}
              onSelectPipPosition={handleSelectPipPosition}
            />
          </div>
        )}

        {activeTab === 'apk-guide' && <ApkArchitectureGuide />}
      </main>

      {/* Broadcast Studio Status Footer Bar */}
      <footer className="h-10 border-t border-white/10 bg-black/40 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between text-[#E2E8F0] mt-auto">
        <div className="flex items-center gap-4 text-[10px] font-mono text-white/40">
          <span>SESSION: 01:24:12</span>
          <span className="hidden sm:inline">DROPPED FRAMES: {rtmpConfig.droppedFrames}</span>
          <span className="hidden md:inline">STORAGE: 12.8GB FREE (RAM BUFFER ACTIVE)</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/60 uppercase tracking-tighter">
            <span className={`w-1.5 h-1.5 rounded-full ${rtmpConfig.isLive ? 'bg-red-600 animate-pulse' : 'bg-white/20'}`}></span> YouTube Live
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/60 uppercase tracking-tighter opacity-30">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span> RTMP Secondary
          </div>
        </div>
      </footer>

      {/* Modals */}
      <RemoteCameraFleetModal
        isOpen={isPairingModalOpen}
        onClose={() => setIsPairingModalOpen(false)}
        cameras={cameras}
        onToggleTorch={handleToggleTorch}
        onToggleDimScreen={handleToggleDimScreen}
        onAddPhysicalCamera={handleAddPhysicalCamera}
      />

      <GoogleDriveSaveModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        scoreboard={scoreboard}
        pendingBlob={pendingDriveBlob}
        pendingClipName={pendingDriveName}
        pendingMetadata={pendingDriveMeta}
      />
    </div>
  );
}
