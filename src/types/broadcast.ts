export type CameraAngle = 'center' | 'left-goal' | 'right-goal' | 'tactical' | 'drone' | 'custom';
export type TallyState = 'program' | 'preview' | 'standby';
export type MatchPeriod = '1H' | 'HT' | '2H' | 'ET1' | 'ET2' | 'PEN' | 'FT';
export type TransitionType = 'cut' | 'fade' | 'wipe' | 'dip-black';
export type ReplayTransitionType = 'glitch' | 'zoom' | 'stinger-flash';
export type ScoreboardTheme = 'premier' | 'champions' | 'modern-dark' | 'classic-light' | 'fifa-bold';

export interface CameraNode {
  id: string;
  name: string;
  angle: CameraAngle;
  isPhysical: boolean;
  stream: MediaStream | null;
  isConnected: boolean;
  fps: number;
  resolution: string;
  batteryLevel: number; // percentage
  temperatureC: number; // Celsius
  tallyState: TallyState;
  torchOn: boolean;
  screenDimmed: boolean;
  zoomLevel: number;
  bitrateKbps: number;
  latencyMs: number;
  audioLevel: number; // 0 - 100
}

export interface MatchEvent {
  id: string;
  type: 'goal' | 'yellow-card' | 'red-card' | 'substitution' | 'var' | 'foul' | 'corner' | 'stoppage';
  team: 'home' | 'away';
  player: string;
  minute: number;
  stoppageAdded?: number;
  subIn?: string;
  subOut?: string;
  detail?: string;
  timestamp: number;
}

export interface ScoreboardState {
  homeTeam: {
    name: string;
    shortName: string;
    primaryColor: string;
    secondaryColor: string;
    score: number;
  };
  awayTeam: {
    name: string;
    shortName: string;
    primaryColor: string;
    secondaryColor: string;
    score: number;
  };
  period: MatchPeriod;
  matchSeconds: number;
  isRunning: boolean;
  stoppageMinutes: number;
  showScoreboard: boolean;
  showClock: boolean;
  showLowerThird: boolean;
  activeBanner: {
    id: string;
    type: string;
    title: string;
    subtitle: string;
    color: string;
    expiresAt: number;
  } | null;
  theme: ScoreboardTheme;
  stationName: string;
}

export interface ReplayFrame {
  timestamp: number;
  canvasData: ImageData;
  cameraId: string;
  cameraName: string;
  matchMinute: number;
}

export interface ReplayClip {
  id: string;
  title: string;
  cameraAngle: string;
  durationSec: number;
  playbackSpeed: number;
  recordedAt: number;
  matchMinute: number;
  blobUrl?: string;
  thumbnailUrl?: string;
  driveFileId?: string;
  driveUrl?: string;
  isSavedToDrive?: boolean;
}

export interface RtmpConfig {
  isLive: boolean;
  rtmpUrl: string;
  streamKey: string;
  resolution: '1080p' | '720p';
  targetBitrateKbps: number;
  actualBitrateKbps: number;
  fps: number;
  droppedFrames: number;
  uptimeSeconds: number;
  audioChannel: 'master' | 'camera' | 'mic-only';
  youtubeChatConnected: boolean;
}

export interface SwitcherState {
  programCameraId: string;
  previewCameraId: string;
  transitionType: TransitionType;
  transitionDurationMs: number;
  transitionProgress: number; // 0 (preview) to 1 (program)
  isTransitioning: boolean;
  pipEnabled: boolean;
  pipCameraId: string;
  pipPosition: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  isReplayActive: boolean;
  replaySpeed: number;
  replayProgress: number; // 0 to 1
  replayTransitionType: ReplayTransitionType;
  isReplayTransitioning: boolean;
  replayTransitionProgress: number; // 0 to 1
  replayTransitionDurationMs: number;
  replayTransitionDirection: 'in' | 'out';
}
