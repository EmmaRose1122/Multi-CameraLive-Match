const fs = require('fs');
let content = fs.readFileSync('src/components/CameraNode/MobileCameraTransmitter.tsx', 'utf8');

const target = `        // Just specify the ideal largest dimension.
        // Let the browser automatically determine the best aspect ratio based on phone orientation.
        let constraints: MediaStreamConstraints = {
          video: {
            facingMode: isFrontCamera ? 'user' : 'environment',
            width: { ideal: resolution === '1080p' ? 1920 : 1280 },
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

const replacement = `        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: isFrontCamera ? 'user' : 'environment',
            width: resolution === '1080p' ? { ideal: 1920 } : { ideal: 1280 },
            height: resolution === '1080p' ? { ideal: 1080 } : { ideal: 720 },
            frameRate: { ideal: fps },
          },
          audio: true,
        };
        const s = await navigator.mediaDevices.getUserMedia(constraints);`;

content = content.replace(target, replacement);
fs.writeFileSync('src/components/CameraNode/MobileCameraTransmitter.tsx', content);
console.log("Reverted constraints");
