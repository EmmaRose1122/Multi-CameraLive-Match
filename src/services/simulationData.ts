/**
 * Canvas-based Real-time Football Match Simulation Engine
 * Generates dynamic multi-angle camera feeds (Left Goal, Right Goal, Center Field, Tactical, Drone)
 * with animated football players, ball physics, goal nets, pitch textures, and camera pans.
 */

export class FootballMatchSimulator {
  private canvasMap = new Map<string, HTMLCanvasElement>();
  private ctxMap = new Map<string, CanvasRenderingContext2D>();
  private animFrameId: number | null = null;

  // Match state for simulation
  private ball = { x: 50, y: 50, z: 0, vx: 0.8, vy: 0.4, vz: 0 };
  private players: Array<{ x: number; y: number; team: 'home' | 'away'; num: number; role: string }> = [];
  private time = 0;

  constructor() {
    this.initPlayers();
  }

  private initPlayers() {
    // 11 Home (Blue) & 11 Away (Red)
    const homeForm = [
      { x: 10, y: 50, num: 1, role: 'GK' },
      { x: 25, y: 20, num: 2, role: 'RB' },
      { x: 22, y: 40, num: 4, role: 'CB' },
      { x: 22, y: 60, num: 5, role: 'CB' },
      { x: 25, y: 80, num: 3, role: 'LB' },
      { x: 45, y: 30, num: 8, role: 'CM' },
      { x: 40, y: 50, num: 6, role: 'CDM' },
      { x: 45, y: 70, num: 10, role: 'CAM' },
      { x: 65, y: 20, num: 7, role: 'RW' },
      { x: 70, y: 50, num: 9, role: 'ST' },
      { x: 65, y: 80, num: 11, role: 'LW' },
    ];

    const awayForm = [
      { x: 90, y: 50, num: 1, role: 'GK' },
      { x: 75, y: 20, num: 2, role: 'RB' },
      { x: 78, y: 40, num: 4, role: 'CB' },
      { x: 78, y: 60, num: 5, role: 'CB' },
      { x: 75, y: 80, num: 3, role: 'LB' },
      { x: 55, y: 30, num: 8, role: 'CM' },
      { x: 60, y: 50, num: 6, role: 'CDM' },
      { x: 55, y: 70, num: 10, role: 'CAM' },
      { x: 35, y: 20, num: 7, role: 'RW' },
      { x: 30, y: 50, num: 9, role: 'ST' },
      { x: 35, y: 80, num: 11, role: 'LW' },
    ];

    this.players = [
      ...homeForm.map((p) => ({ ...p, team: 'home' as const })),
      ...awayForm.map((p) => ({ ...p, team: 'away' as const })),
    ];
  }

  public registerCanvas(id: string, canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (ctx) {
      this.canvasMap.set(id, canvas);
      this.ctxMap.set(id, ctx);
    }
  }

  public unregisterCanvas(id: string) {
    this.canvasMap.delete(id);
    this.ctxMap.delete(id);
  }

  public start() {
    if (this.animFrameId) return;

    const renderLoop = () => {
      this.updatePhysics();
      this.renderAllAngles();
      this.animFrameId = requestAnimationFrame(renderLoop);
    };
    this.animFrameId = requestAnimationFrame(renderLoop);
  }

  public stop() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private updatePhysics() {
    this.time += 0.02;

    // Move ball smoothly around pitch with realistic football curve
    this.ball.x += Math.sin(this.time * 0.8) * 0.7 + Math.cos(this.time * 1.5) * 0.4;
    this.ball.y += Math.cos(this.time * 0.7) * 0.5 + Math.sin(this.time * 1.1) * 0.3;

    // Constrain ball to field
    if (this.ball.x < 8) this.ball.x = 8;
    if (this.ball.x > 92) this.ball.x = 92;
    if (this.ball.y < 12) this.ball.y = 12;
    if (this.ball.y > 88) this.ball.y = 88;

    // Dynamic players follow play
    this.players.forEach((p, idx) => {
      const targetX = p.team === 'home' ? this.ball.x * 0.6 + p.x * 0.4 : this.ball.x * 0.6 + p.x * 0.4;
      const targetY = this.ball.y * 0.4 + p.y * 0.6;
      p.x += (targetX - p.x) * 0.02 + Math.sin(this.time + idx) * 0.05;
      p.y += (targetY - p.y) * 0.02 + Math.cos(this.time * 1.2 + idx) * 0.05;
    });
  }

  private renderAllAngles() {
    this.canvasMap.forEach((canvas, angleKey) => {
      const ctx = this.ctxMap.get(angleKey);
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;

      ctx.save();
      if (angleKey.includes('center') || angleKey.includes('main')) {
        this.drawCenterFieldAngle(ctx, w, h);
      } else if (angleKey.includes('left') || angleKey.includes('goal-1')) {
        this.drawLeftGoalAngle(ctx, w, h);
      } else if (angleKey.includes('right') || angleKey.includes('goal-2')) {
        this.drawRightGoalAngle(ctx, w, h);
      } else if (angleKey.includes('tactical')) {
        this.drawTacticalAngle(ctx, w, h);
      } else if (angleKey.includes('drone')) {
        this.drawDroneAngle(ctx, w, h);
      } else {
        this.drawCenterFieldAngle(ctx, w, h);
      }
      ctx.restore();
    });
  }

  private drawPitchBase(ctx: CanvasRenderingContext2D, w: number, h: number) {
    // Striped realistic football grass
    const stripeCount = 12;
    const stripeW = w / stripeCount;
    for (let i = 0; i < stripeCount; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#1b5e20' : '#2e7d32';
      ctx.fillRect(i * stripeW, 0, stripeW, h);
    }

    // Vignette / Stadium floodlight glow
    const grad = ctx.createRadialGradient(w / 2, h / 2, w * 0.2, w / 2, h / 2, w * 0.8);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  private drawCenterFieldAngle(ctx: CanvasRenderingContext2D, w: number, h: number) {
    this.drawPitchBase(ctx, w, h);

    // Stadium crowd silhouette at top
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h * 0.12);
    ctx.fillStyle = '#334155';
    for (let i = 0; i < w; i += 8) {
      const crowH = 10 + Math.sin(i * 0.1 + this.time * 3) * 4;
      ctx.fillRect(i, h * 0.12 - crowH, 6, crowH);
    }

    // Pitch lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 2.5;

    // Touchlines
    ctx.strokeRect(w * 0.05, h * 0.15, w * 0.9, h * 0.75);

    // Halfway line & Center Circle
    ctx.beginPath();
    ctx.moveTo(w * 0.5, h * 0.15);
    ctx.lineTo(w * 0.5, h * 0.9);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.525, h * 0.18, 0, Math.PI * 2);
    ctx.stroke();

    // Center spot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.525, 4, 0, Math.PI * 2);
    ctx.fill();

    // Penalty Boxes
    // Left
    ctx.strokeRect(w * 0.05, h * 0.32, w * 0.14, h * 0.41);
    ctx.strokeRect(w * 0.05, h * 0.42, w * 0.06, h * 0.21);
    // Right
    ctx.strokeRect(w * 0.81, h * 0.32, w * 0.14, h * 0.41);
    ctx.strokeRect(w * 0.89, h * 0.42, w * 0.06, h * 0.21);

    // Draw Players
    this.players.forEach((p) => {
      const px = w * 0.05 + (p.x / 100) * (w * 0.9);
      const py = h * 0.15 + (p.y / 100) * (h * 0.75);

      // Player shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(px, py + 8, 8, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Jersey
      ctx.fillStyle = p.team === 'home' ? '#0284c7' : '#dc2626'; // Blue vs Red
      ctx.beginPath();
      ctx.arc(px, py, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Head
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(px, py - 4, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw Ball with shadow
    const bx = w * 0.05 + (this.ball.x / 100) * (w * 0.9);
    const by = h * 0.15 + (this.ball.y / 100) * (h * 0.75);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.ellipse(bx + 2, by + 4, 5, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(bx, by, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Camera Watermark Badge
    this.drawCameraInfoBadge(ctx, w, h, 'CAM 1 • CENTER FIELD TACTICAL', '1080p 60FPS');
  }

  private drawLeftGoalAngle(ctx: CanvasRenderingContext2D, w: number, h: number) {
    // Dynamic perspective looking right down the left goalmouth
    this.drawPitchBase(ctx, w, h);

    // Big 3D Goal Frame in foreground
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 6;
    ctx.strokeRect(w * 0.08, h * 0.2, w * 0.25, h * 0.65);

    // Goal Net Mesh
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    for (let x = w * 0.08; x <= w * 0.33; x += 12) {
      ctx.beginPath();
      ctx.moveTo(x, h * 0.2);
      ctx.lineTo(x - 20, h * 0.85);
      ctx.stroke();
    }
    for (let y = h * 0.2; y <= h * 0.85; y += 12) {
      ctx.beginPath();
      ctx.moveTo(w * 0.08, y);
      ctx.lineTo(w * 0.33, y);
      ctx.stroke();
    }

    // Goalkeeper in action
    const gkX = w * 0.25 + Math.sin(this.time * 2) * 20;
    const gkY = h * 0.55 + Math.cos(this.time * 2) * 15;

    // GK Gloves
    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.arc(gkX - 12, gkY - 10, 5, 0, Math.PI * 2);
    ctx.arc(gkX + 12, gkY - 10, 5, 0, Math.PI * 2);
    ctx.fill();

    // GK Body
    ctx.fillStyle = '#10b981'; // Green GK Jersey
    ctx.beginPath();
    ctx.arc(gkX, gkY, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Strikers attacking the goal
    const strikerX = w * 0.55 + Math.cos(this.time * 1.4) * 35;
    const strikerY = h * 0.5 + Math.sin(this.time * 1.2) * 30;

    ctx.fillStyle = '#dc2626'; // Away Striker
    ctx.beginPath();
    ctx.arc(strikerX, strikerY, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Ball approaching goal line
    const bDist = (Math.sin(this.time * 1.5) + 1) * 0.5;
    const ballX = w * 0.35 + bDist * (w * 0.3);
    const ballY = h * 0.52 + Math.sin(this.time * 3) * 20;
    const ballR = 8 + (1 - bDist) * 6; // Gets larger as it comes closer

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ballX, ballY, ballR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    this.drawCameraInfoBadge(ctx, w, h, 'CAM 2 • LEFT GOAL POST (NORTH)', '1080p 60FPS');
  }

  private drawRightGoalAngle(ctx: CanvasRenderingContext2D, w: number, h: number) {
    this.drawPitchBase(ctx, w, h);

    // Goal Frame on right side
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 6;
    ctx.strokeRect(w * 0.67, h * 0.2, w * 0.25, h * 0.65);

    // Net
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    for (let x = w * 0.67; x <= w * 0.92; x += 12) {
      ctx.beginPath();
      ctx.moveTo(x, h * 0.2);
      ctx.lineTo(x + 20, h * 0.85);
      ctx.stroke();
    }
    for (let y = h * 0.2; y <= h * 0.85; y += 12) {
      ctx.beginPath();
      ctx.moveTo(w * 0.67, y);
      ctx.lineTo(w * 0.92, y);
      ctx.stroke();
    }

    // Home Team Defender heading the ball
    const defX = w * 0.62 + Math.sin(this.time * 1.8) * 15;
    const defY = h * 0.52 + Math.cos(this.time * 1.6) * 20;

    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.arc(defX, defY, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Corner Kick Cross in mid-air
    const crossProgress = (this.time * 0.8) % Math.PI;
    const bX = w * 0.45 + Math.cos(crossProgress) * (w * 0.2);
    const bY = h * 0.45 - Math.sin(crossProgress) * 70;

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(bX, bY, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.stroke();

    this.drawCameraInfoBadge(ctx, w, h, 'CAM 3 • RIGHT GOAL POST (SOUTH)', '1080p 60FPS');
  }

  private drawTacticalAngle(ctx: CanvasRenderingContext2D, w: number, h: number) {
    // 2D Tactical overhead radar style with heat glow and formation lines
    ctx.fillStyle = '#064e3b';
    ctx.fillRect(0, 0, w, h);

    // Subtle pitch markings
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(w * 0.08, h * 0.08, w * 0.84, h * 0.84);
    ctx.beginPath();
    ctx.moveTo(w * 0.5, h * 0.08);
    ctx.lineTo(w * 0.5, h * 0.92);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.5, h * 0.2, 0, Math.PI * 2);
    ctx.stroke();

    // Tactical formation connecting lines (Home 4-3-3)
    const homeTeam = this.players.filter((p) => p.team === 'home');
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    for (let i = 1; i < homeTeam.length - 1; i++) {
      const p1 = homeTeam[i];
      const p2 = homeTeam[i + 1];
      const x1 = w * 0.08 + (p1.x / 100) * (w * 0.84);
      const y1 = h * 0.08 + (p1.y / 100) * (h * 0.84);
      const x2 = w * 0.08 + (p2.x / 100) * (w * 0.84);
      const y2 = h * 0.08 + (p2.y / 100) * (h * 0.84);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Draw tactical player markers with numbers
    this.players.forEach((p) => {
      const px = w * 0.08 + (p.x / 100) * (w * 0.84);
      const py = h * 0.08 + (p.y / 100) * (h * 0.84);

      ctx.fillStyle = p.team === 'home' ? '#0284c7' : '#e11d48';
      ctx.beginPath();
      ctx.arc(px, py, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${p.num}`, px, py);
    });

    // Ball
    const bx = w * 0.08 + (this.ball.x / 100) * (w * 0.84);
    const by = h * 0.08 + (this.ball.y / 100) * (h * 0.84);
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(bx, by, 5, 0, Math.PI * 2);
    ctx.fill();

    this.drawCameraInfoBadge(ctx, w, h, 'CAM 4 • 2D TACTICAL OVERVIEW', '1080p 60FPS');
  }

  private drawDroneAngle(ctx: CanvasRenderingContext2D, w: number, h: number) {
    // Aerial angled bird's eye stadium perspective
    this.drawPitchBase(ctx, w, h);

    // Stadium architectural roof rim
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.5, w * 0.47, h * 0.44, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Floodlight beams
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(w * 0.4, h * 0.4);
    ctx.lineTo(w * 0.1, h * 0.8);
    ctx.fill();

    // Pitch
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 2;
    ctx.strokeRect(w * 0.18, h * 0.22, w * 0.64, h * 0.56);

    // Mini Players
    this.players.forEach((p) => {
      const px = w * 0.18 + (p.x / 100) * (w * 0.64);
      const py = h * 0.22 + (p.y / 100) * (h * 0.56);
      ctx.fillStyle = p.team === 'home' ? '#38bdf8' : '#f87171';
      ctx.beginPath();
      ctx.arc(px, py, 4.5, 0, Math.PI * 2);
      ctx.fill();
    });

    this.drawCameraInfoBadge(ctx, w, h, 'CAM 5 • SPIDER DRONE AERIAL', '4K 60FPS');
  }

  private drawCameraInfoBadge(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    label: string,
    res: string
  ) {
    // Glassmorphic corner tag
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.roundRect(12, 12, 230, 26, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Green live pulsing dot
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(24, 25, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 36, 25);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(res, 232, 25);
  }
}

export const matchSimulator = new FootballMatchSimulator();
