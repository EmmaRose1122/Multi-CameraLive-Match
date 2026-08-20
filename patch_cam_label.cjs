const fs = require('fs');
let content = fs.readFileSync('src/components/CameraNode/MobileCameraTransmitter.tsx', 'utf8');

content = content.replace(
  '<span className="text-[10px] font-bold uppercase tracking-wider">Flip</span>',
  '<span className="text-[10px] font-bold uppercase tracking-wider">Rear/Front</span>'
);

fs.writeFileSync('src/components/CameraNode/MobileCameraTransmitter.tsx', content);
console.log("Patched flip label");
