const fs = require('fs');
let content = fs.readFileSync('src/components/MasterSwitcher/RemoteCameraFleetModal.tsx', 'utf8');

const target = `  const pairUrl = \`\${window.location.origin}/?mode=camera&angle=\${selectedAngle}\`;

  useEffect(() => {
    if (isOpen) {
      QRCode.toDataURL(pairUrl, {`;

const replacement = `  const [pairUrl, setPairUrl] = useState(\`\${window.location.origin}/?mode=camera&angle=\${selectedAngle}\`);

  useEffect(() => {
    setPairUrl(\`\${window.location.origin}/?mode=camera&angle=\${selectedAngle}\`);
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      fetch('/api/network-info')
        .then(res => res.json())
        .then(data => {
           if (data.localIps && data.localIps.length > 0) {
             setPairUrl(\`http://\${data.localIps[0]}:\${data.port}/?mode=camera&angle=\${selectedAngle}\`);
           }
        })
        .catch(console.error);
    }
  }, [selectedAngle]);

  useEffect(() => {
    if (isOpen) {
      QRCode.toDataURL(pairUrl, {`;

content = content.replace(target, replacement);
fs.writeFileSync('src/components/MasterSwitcher/RemoteCameraFleetModal.tsx', content);
console.log("Patched QR code pair URL");
