const fs = require('fs');
let content = fs.readFileSync('src/components/CameraNode/MobileCameraTransmitter.tsx', 'utf8');

const target = `    async function startCam() {
      try {
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: isFrontCamera ? 'user' : 'environment',
            width: resolution === '1080p' ? { ideal: 1920 } : { ideal: 1280 },
            height: resolution === '1080p' ? { ideal: 1080 } : { ideal: 720 },
            frameRate: { ideal: fps },
          },
          audio: true,
        };
        const s = await navigator.mediaDevices.getUserMedia(constraints);`;

const replacement = `    async function startCam() {
      try {
        let constraints: MediaStreamConstraints = {
          video: {
            facingMode: isFrontCamera ? 'user' : 'environment',
            width: resolution === '1080p' ? { ideal: 1920 } : { ideal: 1280 },
            height: resolution === '1080p' ? { ideal: 1080 } : { ideal: 720 },
            frameRate: { ideal: fps },
          },
          audio: true,
        };
        
        let s;
        try {
           s = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (initialErr) {
           console.warn("Initial constraints failed, falling back to basic constraints", initialErr);
           constraints = { video: { facingMode: isFrontCamera ? 'user' : 'environment' }, audio: true };
           s = await navigator.mediaDevices.getUserMedia(constraints);
        }`;

content = content.replace(target, replacement);
fs.writeFileSync('src/components/CameraNode/MobileCameraTransmitter.tsx', content);
console.log("Patched constraints fallback");
