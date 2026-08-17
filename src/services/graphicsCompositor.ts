/**
 * Broadcast Graphics Compositor Engine
 * Blends active camera feeds, transitions, scoreboard overlays, event lower-thirds,
 * instant replay watermarks, and PiP feeds into a single broadcast output stream.
 */

import { ScoreboardState, SwitcherState } from '../types/broadcast';
import { BufferedFrame } from './rollingReplayBuffer';

export class GraphicsCompositor {
  public composite(
    targetCanvas: HTMLCanvasElement,
    programSource: HTMLCanvasElement | HTMLVideoElement | BufferedFrame | null,
    previewSource: HTMLCanvasElement | HTMLVideoElement | null,
    pipSource: HTMLCanvasElement | HTMLVideoElement | null,
    switcher: SwitcherState,
    scoreboard: ScoreboardState,
    replayFrame: BufferedFrame | null
  ) {
    const ctx = targetCanvas.getContext('2d');
    if (!ctx) return;

    const w = targetCanvas.width;
    const h = targetCanvas.height;

    ctx.clearRect(0, 0, w, h);

    // 1. Render Base Video (or Instant Replay Frame / Replay Transition)
    if (switcher.isReplayTransitioning) {
      this.drawReplayTransition(
        ctx,
        w,
        h,
        programSource,
        replayFrame,
        switcher,
        scoreboard
      );
    } else if (replayFrame) {
      ctx.drawImage(replayFrame.canvas, 0, 0, w, h);
      this.drawReplayWatermark(ctx, w, h, switcher.replaySpeed, switcher.replayProgress);
    } else if (switcher.isTransitioning && previewSource && programSource) {
      this.drawTransitionBlend(ctx, w, h, programSource, previewSource, switcher);
    } else if (programSource) {
      if ('canvas' in programSource) {
        ctx.drawImage(programSource.canvas, 0, 0, w, h);
      } else {
        ctx.drawImage(programSource, 0, 0, w, h);
      }
    } else {
      // No input - draw broadcast test pattern / bars
      this.drawTestPattern(ctx, w, h);
    }

    // 2. Render Picture-in-Picture (PiP) if enabled
    if (switcher.pipEnabled && pipSource && !replayFrame) {
      this.drawPiP(ctx, w, h, pipSource, switcher.pipPosition);
    }

    // 3. Render Match Scoreboard & Overlays
    if (scoreboard.showScoreboard) {
      this.drawScoreboard(ctx, w, h, scoreboard);
    }

    // 4. Render Active Match Event Badges (Goal, Cards, VAR, Stoppage)
    if (scoreboard.activeBanner && scoreboard.activeBanner.expiresAt > Date.now()) {
      this.drawEventBanner(ctx, w, h, scoreboard.activeBanner);
    } else if (scoreboard.showLowerThird && scoreboard.customLowerThird) {
      this.drawCustomLowerThird(ctx, w, h, scoreboard.customLowerThird, scoreboard.theme);
    }

    // 5. Render Station Bug / Live Watermark
    this.drawStationBug(ctx, w, h, scoreboard.stationName);
  }

  private drawTransitionBlend(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    pgm: any,
    pvw: any,
    switcher: SwitcherState
  ) {
    const progress = switcher.transitionProgress; // 0 to 1

    if (switcher.transitionType === 'fade') {
      ctx.globalAlpha = 1.0;
      ctx.drawImage('canvas' in pvw ? pvw.canvas : pvw, 0, 0, w, h);
      ctx.globalAlpha = progress;
      ctx.drawImage('canvas' in pgm ? pgm.canvas : pgm, 0, 0, w, h);
      ctx.globalAlpha = 1.0;
    } else if (switcher.transitionType === 'wipe') {
      // Horizontal Wipe
      ctx.drawImage('canvas' in pgm ? pgm.canvas : pgm, 0, 0, w, h);
      const wipeX = w * (1 - progress);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, wipeX, h);
      ctx.clip();
      ctx.drawImage('canvas' in pvw ? pvw.canvas : pvw, 0, 0, w, h);
      ctx.restore();

      // Wipe line highlight
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(wipeX - 2, 0, 4, h);
    } else if (switcher.transitionType === 'dip-black') {
      const half = progress < 0.5;
      if (half) {
        ctx.globalAlpha = 1 - progress * 2;
        ctx.drawImage('canvas' in pvw ? pvw.canvas : pvw, 0, 0, w, h);
        ctx.globalAlpha = 1.0;
      } else {
        ctx.globalAlpha = (progress - 0.5) * 2;
        ctx.drawImage('canvas' in pgm ? pgm.canvas : pgm, 0, 0, w, h);
        ctx.globalAlpha = 1.0;
      }
    } else {
      // Instant Cut
      ctx.drawImage('canvas' in pgm ? pgm.canvas : pgm, 0, 0, w, h);
    }
  }

  private drawPiP(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    pipSource: any,
    pos: string
  ) {
    const pipW = w * 0.28;
    const pipH = h * 0.28;
    let x = w - pipW - 24;
    let y = 24;

    if (pos === 'top-left') {
      x = 24;
      y = 24;
    } else if (pos === 'bottom-right') {
      x = w - pipW - 24;
      y = h - pipH - 24;
    } else if (pos === 'bottom-left') {
      x = 24;
      y = h - pipH - 24;
    }

    // Shadow & Border
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x - 2, y - 2, pipW + 4, pipH + 4);
    ctx.shadowBlur = 0;

    // Video Inset
    ctx.drawImage('canvas' in pipSource ? pipSource.canvas : pipSource, x, y, pipW, pipH);

    // Inset border & label
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, pipW, pipH);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(x, y, 70, 18);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText('TACTICAL PiP', x + 6, y + 12);
  }

  private drawScoreboard(ctx: CanvasRenderingContext2D, w: number, h: number, sb: ScoreboardState) {
    const min = Math.floor(sb.matchSeconds / 60);
    const sec = sb.matchSeconds % 60;
    const timeStr = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;

    const x = 32;
    const y = 32;

    if (sb.theme === 'premier') {
      // Premier League Style (Deep Purple & Vibrant Cyan)
      ctx.fillStyle = '#240046';
      ctx.beginPath();
      ctx.roundRect(x, y, 320, 38, 4);
      ctx.fill();

      // Home Team color block
      ctx.fillStyle = sb.homeTeam.primaryColor;
      ctx.fillRect(x + 4, y + 4, 6, 30);

      // Home short & score
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(sb.homeTeam.shortName, x + 16, y + 24);
      ctx.textAlign = 'center';
      ctx.fillText(`${sb.homeTeam.score}`, x + 72, y + 24);

      // Divider
      ctx.fillStyle = '#4c1d95';
      ctx.fillRect(x + 88, y + 6, 2, 26);

      // Away Score & short
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`${sb.awayTeam.score}`, x + 104, y + 24);
      ctx.textAlign = 'left';
      ctx.fillText(sb.awayTeam.shortName, x + 122, y + 24);

      // Away color block
      ctx.fillStyle = sb.awayTeam.primaryColor;
      ctx.fillRect(x + 165, y + 4, 6, 30);

      // Clock Block (Vibrant Cyan)
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.roundRect(x + 180, y + 4, 134, 30, 3);
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      let clockDisplay = `${sb.period}  ${timeStr}`;
      if (sb.stoppageMinutes > 0) {
        clockDisplay += ` +${sb.stoppageMinutes}`;
      }
      ctx.fillText(clockDisplay, x + 247, y + 23);
    } else if (sb.theme === 'champions') {
      // UEFA Champions League Midnight Blue & Gold
      ctx.fillStyle = 'rgba(10, 25, 47, 0.95)';
      ctx.beginPath();
      ctx.roundRect(x, y, 340, 40, 6);
      ctx.fill();
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Home
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(sb.homeTeam.shortName, x + 16, y + 25);
      ctx.fillStyle = '#fbbf24';
      ctx.fillText(`${sb.homeTeam.score}`, x + 75, y + 25);

      // VS Gold Star
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('-', x + 96, y + 25);

      // Away
      ctx.fillStyle = '#fbbf24';
      ctx.fillText(`${sb.awayTeam.score}`, x + 112, y + 25);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(sb.awayTeam.shortName, x + 132, y + 25);

      // Clock Tag
      ctx.fillStyle = 'rgba(212, 175, 55, 0.2)';
      ctx.fillRect(x + 190, y + 6, 140, 28);
      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${sb.period}  ${timeStr} ${sb.stoppageMinutes ? '+' + sb.stoppageMinutes : ''}`, x + 260, y + 24);
    } else {
      // Modern High-Contrast Broadcast Dark
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.beginPath();
      ctx.roundRect(x, y, 330, 38, 6);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Home
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(sb.homeTeam.shortName, x + 16, y + 24);
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`${sb.homeTeam.score}`, x + 72, y + 24);

      ctx.fillStyle = '#64748b';
      ctx.fillRect(x + 92, y + 6, 2, 26);

      // Away
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`${sb.awayTeam.score}`, x + 104, y + 24);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(sb.awayTeam.shortName, x + 124, y + 24);

      // Clock
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(x + 185, y + 4, 138, 30);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${sb.period} ${timeStr} ${sb.stoppageMinutes ? '+' + sb.stoppageMinutes : ''}`, x + 254, y + 23);
    }
  }

  private drawCustomLowerThird(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    lt: { title: string; subtitle: string },
    theme: string
  ) {
    const marginX = w * 0.08;
    const marginY = h - 70;
    
    // Determine colors based on theme
    const primaryBg = theme === 'modern-dark' ? 'rgba(11, 13, 17, 0.95)' : 'rgba(255, 255, 255, 0.95)';
    const primaryText = theme === 'modern-dark' ? '#ffffff' : '#0f172a';
    const accentBg = theme === 'premier' ? '#38bdf8' : theme === 'champions' ? '#1d4ed8' : '#eab308';
    const accentText = '#ffffff';

    ctx.save();
    
    // Base shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;

    // Main Plate
    ctx.fillStyle = primaryBg;
    ctx.beginPath();
    ctx.roundRect(marginX, marginY - 45, 400, 45, [4, 4, 4, 4]);
    ctx.fill();

    // Accent Plate (Subtitle)
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = accentBg;
    ctx.beginPath();
    ctx.roundRect(marginX, marginY, 360, 24, [0, 0, 4, 4]);
    ctx.fill();

    // Red Live bar decorator
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.roundRect(marginX, marginY - 45, 6, 45, [4, 0, 0, 4]);
    ctx.fill();

    // Texts
    ctx.fillStyle = primaryText;
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(lt.title.toUpperCase(), marginX + 16, marginY - 14);

    ctx.fillStyle = accentText;
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(lt.subtitle.toUpperCase(), marginX + 12, marginY + 16);
    
    ctx.restore();
  }

  private drawEventBanner(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    banner: { type: string; title: string; subtitle: string; color: string }
  ) {
    const bannerW = 480;
    const bannerH = 54;
    const x = (w - bannerW) / 2;
    const y = h - 90;

    // Glowing background container
    ctx.shadowColor = banner.color;
    ctx.shadowBlur = 20;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.beginPath();
    ctx.roundRect(x, y, bannerW, bannerH, 8);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Left accent bar
    ctx.fillStyle = banner.color;
    ctx.beginPath();
    ctx.roundRect(x, y, 10, bannerH, [8, 0, 0, 8]);
    ctx.fill();

    // Event Icon & Title
    ctx.fillStyle = banner.color;
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(banner.title.toUpperCase(), x + 24, y + 25);

    // Subtitle (Player / Info)
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '14px sans-serif';
    ctx.fillText(banner.subtitle, x + 24, y + 45);
  }

  private drawReplayWatermark(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    speed: number,
    progress: number
  ) {
    // Top-Right Flash Replay Tag
    const tagW = 200;
    const tagH = 34;
    const x = w - tagW - 32;
    const y = 32;

    ctx.fillStyle = 'rgba(220, 38, 38, 0.95)'; // Broadcast Red
    ctx.beginPath();
    ctx.roundRect(x, y, tagW, tagH, 6);
    ctx.fill();

    // White flashing dot
    const flash = Math.floor(Date.now() / 400) % 2 === 0;
    ctx.fillStyle = flash ? '#ffffff' : '#fca5a5';
    ctx.beginPath();
    ctx.arc(x + 20, y + 17, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`REPLAY (${speed}x)`, x + 34, y + 21);

    // Bottom Replay Scrub Line
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, h - 6, w, 6);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(0, h - 6, w * progress, 6);
  }

  private drawReplayTransition(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    programSource: any,
    replayFrame: BufferedFrame | null,
    switcher: SwitcherState,
    scoreboard: ScoreboardState
  ) {
    const progress = Math.max(0, Math.min(1, switcher.replayTransitionProgress));
    const direction = switcher.replayTransitionDirection || 'in';
    const type = switcher.replayTransitionType || 'glitch';

    // Determine current active source based on transition phase
    let activeCanvasSource: any = null;
    if (direction === 'in') {
      // Switching from live program to replay
      activeCanvasSource = progress < 0.5 ? programSource : (replayFrame ? replayFrame.canvas : programSource);
    } else {
      // Switching from replay back to live program
      activeCanvasSource = progress < 0.5 ? (replayFrame ? replayFrame.canvas : programSource) : programSource;
    }

    if (type === 'glitch') {
      this.drawGlitchEffect(ctx, w, h, activeCanvasSource, progress, direction, scoreboard);
    } else if (type === 'zoom') {
      this.drawZoomEffect(ctx, w, h, activeCanvasSource, progress, direction, scoreboard);
    } else {
      this.drawStingerFlashEffect(ctx, w, h, activeCanvasSource, progress, direction, scoreboard);
    }
  }

  private drawGlitchEffect(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    source: any,
    progress: number,
    direction: 'in' | 'out',
    scoreboard: ScoreboardState
  ) {
    const intensity = Math.sin(progress * Math.PI); // 0 -> 1 -> 0 peak at 0.5
    const src = source && 'canvas' in source ? source.canvas : source;

    if (!src) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);
      return;
    }

    // 1. Draw base frame
    ctx.drawImage(src, 0, 0, w, h);

    if (intensity > 0.05) {
      // 2. Horizontal slice glitch displacement
      const numSlices = Math.floor(6 + intensity * 18);
      for (let i = 0; i < numSlices; i++) {
        const sliceY = Math.floor(((i + Math.sin(i * 99 + progress * 20)) % numSlices) / numSlices * h);
        const sliceH = Math.floor(10 + Math.random() * 24 * intensity);
        const shiftX = (Math.sin(i * 37 + progress * 50) * 40 + (Math.random() - 0.5) * 30) * intensity;

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, sliceY, w, sliceH);
        ctx.clip();
        ctx.drawImage(src, shiftX, 0, w, h);

        // Subtle color tint on displaced slice
        if (i % 2 === 0) {
          ctx.fillStyle = `rgba(239, 68, 68, ${0.25 * intensity})`; // Red chromatic fringe
          ctx.fillRect(0, sliceY, w, sliceH);
        } else {
          ctx.fillStyle = `rgba(56, 189, 248, ${0.25 * intensity})`; // Cyan chromatic fringe
          ctx.fillRect(0, sliceY, w, sliceH);
        }
        ctx.restore();
      }

      // 3. CRT Scanline Raster
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      for (let y = 0; y < h; y += 4) {
        ctx.fillRect(0, y, w, 1.5);
      }

      // 4. White flash / Digital noise burst at transition apex
      if (progress > 0.35 && progress < 0.65) {
        const peakAlpha = (1 - Math.abs(progress - 0.5) / 0.15) * 0.4;
        ctx.fillStyle = `rgba(255, 255, 255, ${peakAlpha})`;
        ctx.fillRect(0, 0, w, h);

        // Cyber grid scan flash
        ctx.strokeStyle = `rgba(56, 189, 248, ${peakAlpha * 0.8})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x < w; x += 40) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
        }
        for (let y = 0; y < h; y += 40) {
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
        }
        ctx.stroke();
      }

      // 5. Broadcast Stinger Badge (Center)
      const badgeW = 280;
      const badgeH = 54;
      const badgeX = (w - badgeW) / 2 + (Math.random() - 0.5) * 6 * intensity;
      const badgeY = (h - badgeH) / 2;

      ctx.save();
      ctx.shadowColor = 'rgba(239, 68, 68, 0.8)';
      ctx.shadowBlur = 24 * intensity;

      // Dark metallic plate
      ctx.fillStyle = 'rgba(11, 13, 17, 0.92)';
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 8);
      ctx.fill();

      // Neon red / cyan border
      ctx.strokeStyle = direction === 'in' ? '#ef4444' : '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Text label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 8;
      const title = direction === 'in' ? '⚡ REPLAY ACTIVE' : '● LIVE BROADCAST';
      ctx.fillText(title, w / 2, badgeY + 28);

      ctx.fillStyle = direction === 'in' ? '#fca5a5' : '#7dd3fc';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(
        direction === 'in' ? 'INSTANT SLOW-MOTION BUFFER' : 'CUTTING TO MASTER PROGRAM',
        w / 2,
        badgeY + 44
      );
      ctx.restore();
    }
  }

  private drawZoomEffect(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    source: any,
    progress: number,
    direction: 'in' | 'out',
    scoreboard: ScoreboardState
  ) {
    const intensity = Math.sin(progress * Math.PI); // 0 -> 1 -> 0
    const src = source && 'canvas' in source ? source.canvas : source;

    if (!src) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);
      return;
    }

    ctx.save();
    // 1. Dynamic optical zoom transform into center
    const scale = 1.0 + intensity * 0.38; // Up to 1.38x zoom
    ctx.translate(w / 2, h / 2);
    ctx.scale(scale, scale);
    ctx.translate(-w / 2, -h / 2);

    ctx.drawImage(src, 0, 0, w, h);
    ctx.restore();

    if (intensity > 0.05) {
      // 2. Radial speed-lines radiating from center
      ctx.save();
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.35 * intensity})`;
      ctx.lineWidth = 2;
      const lineCount = 24;
      const cx = w / 2;
      const cy = h / 2;
      const maxR = Math.sqrt(cx * cx + cy * cy);

      for (let i = 0; i < lineCount; i++) {
        const angle = (i / lineCount) * Math.PI * 2 + progress * 0.5;
        const innerR = maxR * (0.35 + (i % 3) * 0.1);
        const outerR = maxR * (0.9 + (i % 2) * 0.1);

        const x1 = cx + Math.cos(angle) * innerR;
        const y1 = cy + Math.sin(angle) * innerR;
        const x2 = cx + Math.cos(angle) * outerR;
        const y2 = cy + Math.sin(angle) * outerR;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      ctx.restore();

      // 3. Center Optical Bloom Flare at peak
      if (progress > 0.3 && progress < 0.7) {
        const flareAlpha = (1 - Math.abs(progress - 0.5) / 0.2) * 0.45;
        const grad = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.4);
        grad.addColorStop(0, `rgba(255, 255, 255, ${flareAlpha})`);
        grad.addColorStop(0.4, `rgba(239, 68, 68, ${flareAlpha * 0.6})`);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }

      // 4. Dynamic Zoom Stinger Banner
      const bannerH = 64;
      const bannerY = (h - bannerH) / 2;

      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.beginPath();
      ctx.roundRect((w - 320) / 2, bannerY, 320, bannerH, 8);
      ctx.fill();

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Side chevron accents
      ctx.fillStyle = '#ef4444';
      ctx.fillRect((w - 320) / 2 + 6, bannerY + 6, 8, bannerH - 12);
      ctx.fillRect((w + 320) / 2 - 14, bannerY + 6, 8, bannerH - 12);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(direction === 'in' ? 'ZOOM REPLAY' : 'RESUMING LIVE', w / 2, bannerY + 32);

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        direction === 'in' ? 'OPTICAL HIGH-SPEED ZOOM' : 'MASTER LIVE FEED',
        w / 2,
        bannerY + 50
      );
      ctx.restore();
    }
  }

  private drawStingerFlashEffect(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    source: any,
    progress: number,
    direction: 'in' | 'out',
    scoreboard: ScoreboardState
  ) {
    const src = source && 'canvas' in source ? source.canvas : source;
    if (src) {
      ctx.drawImage(src, 0, 0, w, h);
    }

    // Dynamic diagonal sports stinger bar sweep
    const sweepProgress = progress * 1.6 - 0.3; // -0.3 to 1.3
    const sweepCenterX = sweepProgress * w;
    const barWidth = w * 0.45;

    ctx.save();
    ctx.translate(sweepCenterX, h / 2);
    ctx.rotate(-0.35); // Angle

    // Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 30;

    // Primary red chevron bar
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(-barWidth / 2, -h * 1.5, barWidth, h * 3);

    // Accent gold/white highlight bar
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-barWidth / 2 + 20, -h * 1.5, 12, h * 3);

    // Dark inset strip
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-barWidth / 2 + 45, -h * 1.5, barWidth - 90, h * 3);

    // Center Stinger Typography
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MATCH REPLAY', 0, 8);

    ctx.restore();
  }

  private drawStationBug(ctx: CanvasRenderingContext2D, w: number, h: number, name: string) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.beginPath();
    ctx.roundRect(w - 150, h - 45, 126, 26, 4);
    ctx.fill();

    // Red Live dot
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(w - 138, h - 32, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(name || 'LIVE MATCH', w - 128, h - 29);
  }

  private drawTestPattern(ctx: CanvasRenderingContext2D, w: number, h: number) {
    // SMPTE Color Bars
    const colors = ['#ffffff', '#ffff00', '#00ffff', '#00ff00', '#ff00ff', '#ff0000', '#0000ff'];
    const barW = w / colors.length;
    for (let i = 0; i < colors.length; i++) {
      ctx.fillStyle = colors[i];
      ctx.fillRect(i * barW, 0, barW, h * 0.75);
    }
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, h * 0.75, w, h * 0.25);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('NO CAMERA SIGNAL • STANDBY', w / 2, h * 0.88);
  }
}

export const graphicsCompositor = new GraphicsCompositor();
