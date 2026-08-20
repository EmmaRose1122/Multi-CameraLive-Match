const fs = require('fs');
let content = fs.readFileSync('src/components/CameraNode/MobileCameraTransmitter.tsx', 'utf8');

content = content.replace(/ \/\/ MJPEG Fallback Broadcaster[\s\S]*?150\); \/\/ ~6-7 FPS\n    }\n    return \(\) => \{\n      if \(interval\) clearInterval\(interval\);\n    }\n  \}, \[stream\]\);/m, '');

fs.writeFileSync('src/components/CameraNode/MobileCameraTransmitter.tsx', content);
console.log("Removed duplicate fallback");
