const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `    if (params.get('mode') === 'camera') {
      setActiveTab('camera');
    }
    webrtcService.connect('switcher');`;

const replacement = `    if (params.get('mode') === 'camera') {
      setActiveTab('camera');
      return; // Do not connect as switcher on the mobile camera node
    }
    webrtcService.connect('switcher');`;

content = content.replace(target, replacement);
fs.writeFileSync('src/App.tsx', content);
console.log("Patched App.tsx connect logic");
