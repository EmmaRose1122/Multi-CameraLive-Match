const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `export default function App() {
  useEffect(() => { if (activeTab === 'camera') window.__hasStartedCamera = true; }, [activeTab]);
  // Navigation & Role Modes
  const [activeTab, setActiveTab] = useState<'switcher' | 'camera' | 'multiview' | 'apk-guide'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get('mode');
      if (mode === 'camera') return 'camera';
      if (mode === 'multiview') return 'multiview';
    }
    return 'switcher';
  });`;

const replacement = `export default function App() {
  // Navigation & Role Modes
  const [activeTab, setActiveTab] = useState<'switcher' | 'camera' | 'multiview' | 'apk-guide'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get('mode');
      if (mode === 'camera') return 'camera';
      if (mode === 'multiview') return 'multiview';
    }
    return 'switcher';
  });
  
  useEffect(() => { if (activeTab === 'camera') (window as any).__hasStartedCamera = true; }, [activeTab]);`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('src/App.tsx', content);
  console.log("Fixed!");
} else {
  console.log("Target not found!");
}
