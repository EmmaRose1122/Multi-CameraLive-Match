const fs = require('fs');
let content = fs.readFileSync('src/components/CameraNode/MobileCameraTransmitter.tsx', 'utf8');

const target = `        let constraints: MediaStreamConstraints = {
          video: {
            facingMode: isFrontCamera ? 'user' : 'environment',
            width: { ideal: isPortrait ? idealH : idealW },
            height: { ideal: isPortrait ? idealW : idealH },
            frameRate: { ideal: fps },
          },
          audio: true,
        };`;

const replacement = `        // Just specify the ideal largest dimension.
        // Let the browser automatically determine the best aspect ratio based on phone orientation.
        let constraints: MediaStreamConstraints = {
          video: {
            facingMode: isFrontCamera ? 'user' : 'environment',
            width: { ideal: resolution === '1080p' ? 1920 : 1280 },
            frameRate: { ideal: fps },
          },
          audio: true,
        };`;

content = content.replace(target, replacement);
fs.writeFileSync('src/components/CameraNode/MobileCameraTransmitter.tsx', content);
console.log("Patched constraints for auto-orientation");
