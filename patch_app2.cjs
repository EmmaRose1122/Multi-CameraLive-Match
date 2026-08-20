const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const targetEarlyReturn = `  if (activeTab === 'camera') {
    return (
      <div className="min-h-screen bg-black text-[#E2E8F0] flex flex-col font-sans selection:bg-red-500 selection:text-white">
        <MobileCameraTransmitter
          onBackToSwitcher={() => {}} // Disabled for camera feed view isolation
          assignedAngle={typeof window !== 'undefined' ? (new URLSearchParams(window.location.search).get('angle') as any) || 'left-goal' : 'left-goal'}
        />
      </div>
    );
  }`;

content = content.replace(targetEarlyReturn, `  // Removed early return for camera to keep studio mounted`);

const targetMain = `<main className="flex-1 w-full mx-auto p-3 sm:p-4 flex flex-col gap-4 max-w-[1400px]">`;
const replaceMain = `
      {/* The Camera Node - Keeps running in background if started */}
      {(activeTab === 'camera' || (typeof window !== 'undefined' && window.__hasStartedCamera)) && (
        <div className={activeTab === 'camera' ? 'flex-1 flex flex-col h-screen absolute inset-0 z-[100] bg-black' : 'hidden'}>
          <MobileCameraTransmitter
            onBackToSwitcher={() => setActiveTab('switcher')}
            assignedAngle={typeof window !== 'undefined' ? (new URLSearchParams(window.location.search).get('angle') as any) || 'left-goal' : 'left-goal'}
          />
          {activeTab === 'camera' && (
            <button onClick={() => setActiveTab('switcher')} className="absolute top-4 left-4 z-50 bg-red-600 px-4 py-2 rounded font-bold">
              ← Back to Studio
            </button>
          )}
        </div>
      )}
      <main className={"flex-1 w-full mx-auto p-3 sm:p-4 flex flex-col gap-4 max-w-[1400px] " + (activeTab === 'camera' ? 'hidden' : '')}>`;
content = content.replace(targetMain, replaceMain);

// Also need a way to set __hasStartedCamera. We can do it inside the Header click or just use a small effect.
const hookTarget = `export default function App() {`;
const hookReplace = `export default function App() {\n  useEffect(() => { if (activeTab === 'camera') window.__hasStartedCamera = true; }, [activeTab]);`;
content = content.replace(hookTarget, hookReplace);

fs.writeFileSync('src/App.tsx', content);
console.log("Patched App.tsx camera rendering");
