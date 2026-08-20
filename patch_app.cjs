const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add hasStartedCameraNode state
const stateHookTarget = `  const [activeTab, setActiveTab] = useState<'switcher' | 'camera' | 'multiview' | 'apk-guide'>(() => {`;
const stateHookReplace = `  const [hasStartedCameraNode, setHasStartedCameraNode] = useState(false);\n  const [activeTab, setActiveTab] = useState<'switcher' | 'camera' | 'multiview' | 'apk-guide'>(() => {`;
content = content.replace(stateHookTarget, stateHookReplace);

// 2. Update setActiveTab to also set hasStartedCameraNode
content = content.replace(/setActiveTab\('/g, "((tab) => { if (tab === 'camera') setHasStartedCameraNode(true); setActiveTab(tab); })('");
// Wait, replacing it blindly might break. It's passed as a prop!
// Better: just add it in the render where we pass setActiveTab.
