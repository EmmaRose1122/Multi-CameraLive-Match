const fs = require('fs');
let content = fs.readFileSync('src/services/webrtcService.ts', 'utf8');

const target = `  public setLocalStream(stream: MediaStream) {
    this.localStream = stream;
    
    // Start fallback transmission if on a mobile node
    if (this.role === 'camera') { 
       if (!this.hiddenCanvas) {
         this.hiddenCanvas = document.createElement('canvas');
         this.hiddenCanvas.width = 640;
         this.hiddenCanvas.height = 360;
       }
       const videoEl = document.createElement('video');
       videoEl.autoplay = true;
       videoEl.muted = true;
       videoEl.playsInline = true;
       videoEl.srcObject = stream;
       
       videoEl.play().catch(e => console.log("Hidden video play error", e));
       
       if (this.transmissionInterval) clearInterval(this.transmissionInterval);
       this.transmissionInterval = setInterval(() => {
           if (this.ws && this.ws.readyState === WebSocket.OPEN && this.hiddenCanvas) {
             const ctx = this.hiddenCanvas.getContext('2d');
             if (ctx && videoEl.videoWidth > 0) {
               ctx.drawImage(videoEl, 0, 0, this.hiddenCanvas.width, this.hiddenCanvas.height);
               const frameDataUrl = this.hiddenCanvas.toDataURL('image/jpeg', 0.5);
               this.send({ type: 'frame-sync', frameDataUrl });
             }
           }
         }, 100); // 10 FPS fallback
    }

    // Add or replace tracks for any existing peer connections`;

const replacement = `  public setLocalStream(stream: MediaStream) {
    this.localStream = stream;
    
    // Fallback transmission removed to fix severe mobile performance lag

    // Add or replace tracks for any existing peer connections`;

content = content.replace(target, replacement);
fs.writeFileSync('src/services/webrtcService.ts', content);
console.log("Removed webrtc canvas fallback");
