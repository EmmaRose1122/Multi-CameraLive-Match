const fs = require('fs');
console.log(fs.readFileSync('src/services/webrtcService.ts', 'utf8').length);
