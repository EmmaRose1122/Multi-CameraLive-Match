const fs = require('fs');
let content = fs.readFileSync('src/components/CameraNode/MobileCameraTransmitter.tsx', 'utf8');

const target = `    async function startCam() {
      try {`;

const replacement = `    async function startCam() {
      if (!navigator.mediaDevices) {
        setErrorMsg('Camera access requires HTTPS or localhost. Please use a secure URL (https://...)');
        return;
      }
      try {`;

content = content.replace(target, replacement);
fs.writeFileSync('src/components/CameraNode/MobileCameraTransmitter.tsx', content);
console.log("Patched secure context check");
