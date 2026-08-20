const fs = require('fs');
let content = fs.readFileSync('src/services/webrtcService.ts', 'utf8');

content = content.replace(/if \(this\.role === 'camera'\) \{[\s\S]*?10 FPS fallback\n\s*\}/m, '');

fs.writeFileSync('src/services/webrtcService.ts', content);
console.log("Regex patched webrtcService");
