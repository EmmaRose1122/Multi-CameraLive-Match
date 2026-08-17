import React, { useEffect, useRef } from 'react';

interface BroadcastAudioMeterProps {
  cameraId: string;
}

export const BroadcastAudioMeter: React.FC<BroadcastAudioMeterProps> = ({ cameraId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let baseLevelL = 0;
    let baseLevelR = 0;
    let peakHoldL = 0;
    let peakHoldR = 0;
    let peakHoldTimeL = 0;
    let peakHoldTimeR = 0;

    // We'll use a local time counter to avoid relying strictly on Date.now() 
    // for smooth animation scaling.
    let time = 0;

    const draw = () => {
      // Simulate audio levels
      time += 0.05;
      
      // Seeded roughly by camera id to make them look distinct
      const seed = cameraId.charCodeAt(0) || 0;
      
      const targetL = Math.max(0.02, 0.5 + Math.sin(time * 0.8 + seed) * 0.3 + (Math.random() * 0.3 - 0.15));
      const targetR = Math.max(0.02, 0.5 + Math.sin(time * 0.85 + seed) * 0.3 + (Math.random() * 0.3 - 0.15));

      // Smooth interpolation for realistic meter ballistics (fast attack, slower decay)
      baseLevelL += (targetL - baseLevelL) * (targetL > baseLevelL ? 0.4 : 0.1);
      baseLevelR += (targetR - baseLevelR) * (targetR > baseLevelR ? 0.4 : 0.1);

      // Add occasional spikes for realism (like shouting or loud whistle)
      if (Math.random() > 0.98) baseLevelL += Math.random() * 0.5;
      if (Math.random() > 0.98) baseLevelR += Math.random() * 0.5;
      
      baseLevelL = Math.min(1.05, Math.max(0, baseLevelL));
      baseLevelR = Math.min(1.05, Math.max(0, baseLevelR));

      // Peak hold logic
      if (baseLevelL >= peakHoldL) {
        peakHoldL = baseLevelL;
        peakHoldTimeL = 45; // Frames to hold
      } else {
        if (peakHoldTimeL > 0) peakHoldTimeL--;
        else peakHoldL *= 0.92; // Decay
      }

      if (baseLevelR >= peakHoldR) {
        peakHoldR = baseLevelR;
        peakHoldTimeR = 45;
      } else {
        if (peakHoldTimeR > 0) peakHoldTimeR--;
        else peakHoldR *= 0.92;
      }

      // Drawing
      const width = canvas.width;
      const height = canvas.height;
      
      ctx.clearRect(0, 0, width, height);

      const drawBar = (x: number, w: number, level: number, peak: number) => {
        // Draw background track
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(x, 0, w, height);

        const levelH = level * height;
        const y = height - levelH;

        // Create gradient: Green -> Yellow -> Red
        const gradient = ctx.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, '#22c55e');   // Green (Low)
        gradient.addColorStop(0.65, '#22c55e'); // Green (Mid)
        gradient.addColorStop(0.75, '#eab308'); // Yellow (Warning)
        gradient.addColorStop(0.9, '#ef4444');  // Red (Clipping)
        gradient.addColorStop(1, '#ef4444');

        ctx.fillStyle = gradient;
        ctx.fillRect(x, Math.max(0, y), w, Math.min(height, levelH));

        // Draw segmented lines over the bar to give it an LED array look
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        const numSegments = 30;
        const segmentHeight = height / numSegments;
        for(let i = 0; i < numSegments; i++) {
          // Draw thin horizontal lines cutting through the gradient
          ctx.fillRect(x, i * segmentHeight, w, 1);
        }

        // Draw Peak indicator line
        const peakY = height - (peak * height);
        // Turn red if it's clipping (peak > 0.9)
        ctx.fillStyle = peak > 0.9 ? '#ef4444' : 'rgba(255, 255, 255, 0.9)'; 
        ctx.fillRect(x, Math.max(0, peakY), w, 2);
      };

      const barWidth = (width - 2) / 2; // 2px gap in the middle
      drawBar(0, barWidth, baseLevelL, peakHoldL);
      drawBar(barWidth + 2, barWidth, baseLevelR, peakHoldR);

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [cameraId]);

  return (
    <div className="absolute right-3 sm:right-4 bottom-4 top-4 w-4 sm:w-5 md:w-6 bg-black/80 rounded-md p-0.5 border border-white/20 backdrop-blur-md flex flex-col justify-between shadow-lg z-20">
      <div className="w-full text-center text-[6px] sm:text-[7px] font-mono font-bold text-white/70 leading-none pb-0.5 opacity-80">dB</div>
      <div className="flex-1 w-full relative">
        {/* We use a fixed internal resolution for the canvas, CSS will scale it */}
        <div className="absolute inset-0 rounded-sm overflow-hidden">
           <canvas ref={canvasRef} className="w-full h-full" width={24} height={120} />
        </div>
        
        {/* Overlay Decibel Markings */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-[2px] pt-[2px]">
           <div className="w-full border-t border-white/30 h-px relative"><span className="absolute -left-3 sm:-left-3.5 -top-1.5 text-[5px] sm:text-[6px] text-white/70 font-mono font-bold drop-shadow-md">0</span></div>
           <div className="w-full border-t border-white/20 h-px relative"><span className="absolute -left-4 sm:-left-4.5 -top-1.5 text-[5px] sm:text-[6px] text-white/60 font-mono font-bold drop-shadow-md">-12</span></div>
           <div className="w-full border-t border-white/20 h-px relative"><span className="absolute -left-4 sm:-left-4.5 -top-1.5 text-[5px] sm:text-[6px] text-white/60 font-mono font-bold drop-shadow-md">-24</span></div>
           <div className="w-full border-t border-white/20 h-px relative"><span className="absolute -left-4 sm:-left-4.5 -top-1.5 text-[5px] sm:text-[6px] text-white/60 font-mono font-bold drop-shadow-md">-40</span></div>
        </div>
      </div>
      <div className="w-full flex justify-between px-[1px] pt-1">
         <span className="text-[5px] sm:text-[6px] font-mono font-bold text-white/70 leading-none">L</span>
         <span className="text-[5px] sm:text-[6px] font-mono font-bold text-white/70 leading-none">R</span>
      </div>
    </div>
  );
};
