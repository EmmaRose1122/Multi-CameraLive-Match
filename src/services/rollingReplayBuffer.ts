/**
 * RAM-Based Circular Rolling Instant Replay Engine
 * Keeps a continuous in-memory ring buffer of the program feed / active camera frames
 * (last 15s to 30s) to allow instant slow-motion replay without disk/flash storage wear.
 */

export interface BufferedFrame {
  timestamp: number;
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  minute: number;
}

export class RollingReplayBuffer {
  private buffer: BufferedFrame[] = [];
  private maxDurationMs: number = 20000; // Default 20 seconds
  private targetFps: number = 30; // Capture rate
  private lastCaptureTime: number = 0;
  private isRecording: boolean = true;
  private tempCanvas: HTMLCanvasElement;
  private tempCtx: CanvasRenderingContext2D | null;

  // Active Replay State
  private isReplaying: boolean = false;
  private replayFrames: BufferedFrame[] = [];
  private replayCurrentIndex: number = 0;
  private replaySpeed: number = 0.5; // 0.5x slow-mo
  private onReplayCompleteCallback: (() => void) | null = null;
  private replayIntervalId: number | null = null;

  constructor(durationSeconds: number = 20, fps: number = 30) {
    this.maxDurationMs = durationSeconds * 1000;
    this.targetFps = fps;
    this.tempCanvas = document.createElement('canvas');
    this.tempCtx = this.tempCanvas.getContext('2d', { willReadFrequently: true });
  }

  public setDuration(seconds: number) {
    this.maxDurationMs = seconds * 1000;
    this.purgeOldFrames(Date.now());
  }

  public getDurationSeconds(): number {
    return this.maxDurationMs / 1000;
  }

  /**
   * Pushes a new frame into the rolling circular RAM buffer.
   * Auto-purges expired frames to guarantee constant memory footprint.
   */
  public pushFrame(sourceCanvas: HTMLCanvasElement | HTMLVideoElement, minute: number = 0) {
    if (!this.isRecording) return;

    const now = performance.now();
    const frameInterval = 1000 / this.targetFps;

    if (now - this.lastCaptureTime < frameInterval) {
      return; // Cap capture rate to target FPS
    }
    this.lastCaptureTime = now;

    const targetW = 640; // High quality downscaled buffer frame for memory efficiency
    const targetH = 360;

    const frameCanvas = document.createElement('canvas');
    frameCanvas.width = targetW;
    frameCanvas.height = targetH;
    const ctx = frameCanvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Draw frame into buffered canvas
    ctx.drawImage(sourceCanvas, 0, 0, targetW, targetH);

    this.buffer.push({
      timestamp: Date.now(),
      canvas: frameCanvas,
      width: targetW,
      height: targetH,
      minute,
    });

    this.purgeOldFrames(Date.now());
  }

  private purgeOldFrames(now: number) {
    const cutoff = now - this.maxDurationMs;
    while (this.buffer.length > 0 && this.buffer[0].timestamp < cutoff) {
      this.buffer.shift();
    }
  }

  /**
   * Returns current buffer metrics for visual telemetry in the studio dashboard.
   */
  public getBufferStats() {
    const frameCount = this.buffer.length;
    const oldestTimestamp = this.buffer[0]?.timestamp || Date.now();
    const newestTimestamp = this.buffer[this.buffer.length - 1]?.timestamp || Date.now();
    const durationSeconds = Math.max(0, (newestTimestamp - oldestTimestamp) / 1000);
    // Approx memory calculation: frame count * width * height * 4 bytes
    const estimatedMemoryBytes = frameCount * (640 * 360 * 4);
    const estimatedMemoryMB = (estimatedMemoryBytes / (1024 * 1024)).toFixed(1);

    return {
      frameCount,
      durationSeconds: Math.round(durationSeconds * 10) / 10,
      maxDurationSeconds: this.maxDurationMs / 1000,
      memoryMB: estimatedMemoryMB,
      isRecording: this.isRecording,
      isReplaying: this.isReplaying,
      replayProgress: this.replayFrames.length > 0 ? this.replayCurrentIndex / this.replayFrames.length : 0,
    };
  }

  /**
   * Triggers an instant replay of the buffered sequence.
   * @param durationSec how many seconds back to replay (e.g. 5, 10, 15, 20)
   * @param speed playback speed multiplier (0.5x, 0.75x, 1.0x)
   * @param onComplete callback when replay finishes to switch back to Live Program
   */
  public triggerInstantReplay(
    durationSec: number = 10,
    speed: number = 0.5,
    onComplete?: () => void
  ): boolean {
    if (this.buffer.length === 0) return false;

    const requestedMs = durationSec * 1000;
    const now = Date.now();
    const startTime = now - requestedMs;

    // Extract slice of frames
    this.replayFrames = this.buffer.filter((f) => f.timestamp >= startTime);
    if (this.replayFrames.length === 0) {
      this.replayFrames = [...this.buffer];
    }

    this.replayCurrentIndex = 0;
    this.replaySpeed = speed;
    this.isReplaying = true;
    this.onReplayCompleteCallback = onComplete || null;

    return true;
  }

  /**
   * Advances the replay frame pointer according to slow-motion speed and returns current frame.
   */
  public getCurrentReplayFrame(): BufferedFrame | null {
    if (!this.isReplaying || this.replayFrames.length === 0) return null;

    const frame = this.replayFrames[Math.floor(this.replayCurrentIndex)];
    this.replayCurrentIndex += this.replaySpeed;

    if (this.replayCurrentIndex >= this.replayFrames.length) {
      this.stopReplay();
      if (this.onReplayCompleteCallback) {
        this.onReplayCompleteCallback();
      }
      return null;
    }

    return frame || null;
  }

  public stopReplay() {
    this.isReplaying = false;
    this.replayFrames = [];
    this.replayCurrentIndex = 0;
  }

  public setReplaySpeed(speed: number) {
    this.replaySpeed = speed;
  }

  public scrubToProgress(progress: number) {
    if (!this.isReplaying || this.replayFrames.length === 0) return;
    this.replayCurrentIndex = Math.min(
      this.replayFrames.length - 1,
      Math.max(0, Math.floor(progress * this.replayFrames.length))
    );
  }

  /**
   * Exports the current buffered replay slice into a downloadable WebM/MP4 video blob.
   */
  public async exportReplayClipBlob(durationSec: number = 10): Promise<{ blob: Blob; url: string; duration: number }> {
    const requestedMs = durationSec * 1000;
    const now = Date.now();
    const framesToExport = this.buffer.filter((f) => f.timestamp >= now - requestedMs);
    const targetFrames = framesToExport.length > 5 ? framesToExport : this.buffer;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = 640;
    exportCanvas.height = 360;
    const exportCtx = exportCanvas.getContext('2d');
    if (!exportCtx) throw new Error('Canvas context not available');

    const stream = exportCanvas.captureStream(30);
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm',
      videoBitsPerSecond: 3000000,
    });

    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    const completionPromise = new Promise<{ blob: Blob; url: string; duration: number }>((resolve) => {
      mediaRecorder.onstop = () => {
        const fullBlob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(fullBlob);
        resolve({ blob: fullBlob, url, duration: durationSec });
      };
    });

    mediaRecorder.start();

    // Render frames at 30 fps
    for (let i = 0; i < targetFrames.length; i++) {
      exportCtx.drawImage(targetFrames[i].canvas, 0, 0);
      // Overlay Replay Watermark on clip export
      exportCtx.fillStyle = 'rgba(220, 38, 38, 0.85)';
      exportCtx.fillRect(20, 20, 140, 28);
      exportCtx.fillStyle = '#ffffff';
      exportCtx.font = 'bold 12px sans-serif';
      exportCtx.fillText('MATCH REPLAY', 32, 38);

      await new Promise((r) => setTimeout(r, 1000 / 30));
    }

    mediaRecorder.stop();
    return completionPromise;
  }

  public clear() {
    this.buffer = [];
    this.stopReplay();
  }
}

export const globalReplayBuffer = new RollingReplayBuffer(20, 30);
