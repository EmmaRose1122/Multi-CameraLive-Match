const fs = require('fs');
let content = fs.readFileSync('src/components/MasterSwitcher/RemoteCameraFleetModal.tsx', 'utf8');

const target = `<div className="text-sm font-medium text-white mb-2">Scan to connect</div>`;
const replacement = `<div className="text-sm font-medium text-white mb-1">Scan to connect</div>
              {pairUrl.includes('192.168') && (
                <div className="text-[10px] text-amber-400 mb-2 max-w-[200px] text-center leading-tight">
                  For LAN IP, ensure your browser allows camera on HTTP, or use the HTTPS live preview URL.
                </div>
              )}`;
content = content.replace(target, replacement);
fs.writeFileSync('src/components/MasterSwitcher/RemoteCameraFleetModal.tsx', content);
console.log("Patched modal warning");
