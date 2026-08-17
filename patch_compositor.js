const fs = require('fs');
const file = 'src/services/graphicsCompositor.ts';
let content = fs.readFileSync(file, 'utf8');

const target1 = `    // 4. Render Active Match Event Badges (Goal, Cards, VAR, Stoppage)
    if (scoreboard.activeBanner && scoreboard.activeBanner.expiresAt > Date.now()) {
      this.drawEventBanner(ctx, w, h, scoreboard.activeBanner);
    }`;

const replace1 = `    // 4. Render Active Match Event Badges (Goal, Cards, VAR, Stoppage)
    if (scoreboard.activeBanner && scoreboard.activeBanner.expiresAt > Date.now()) {
      this.drawEventBanner(ctx, w, h, scoreboard.activeBanner);
    } else if (scoreboard.showLowerThird && scoreboard.customLowerThird) {
      this.drawCustomLowerThird(ctx, w, h, scoreboard.customLowerThird, scoreboard.theme);
    }`;

content = content.replace(target1, replace1);

const target2 = `  private drawEventBanner(`;

const replace2 = `  private drawCustomLowerThird(
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

  private drawEventBanner(`;

content = content.replace(target2, replace2);

fs.writeFileSync(file, content);
