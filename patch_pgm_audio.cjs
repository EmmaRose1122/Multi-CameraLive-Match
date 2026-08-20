const fs = require('fs');
let content = fs.readFileSync('src/components/MasterSwitcher/ProgramMonitor.tsx', 'utf8');

// 1. Add useState, Volume2, VolumeX imports
if (content.includes("import React, { useEffect, useRef }")) {
  content = content.replace("import React, { useEffect, useRef }", "import React, { useEffect, useRef, useState } from 'react';\nimport { Volume2, VolumeX } from 'lucide-react';");
}

// 2. Add state inside component
const stateTarget = "const videoRef = useRef<HTMLVideoElement>(null);";
const stateReplacement = "const [isMuted, setIsMuted] = useState(true);\n  const videoRef = useRef<HTMLVideoElement>(null);";
content = content.replace(stateTarget, stateReplacement);

// 3. Bind muted to state
const videoTarget = `autoPlay
              playsInline
              muted`;
const videoReplacement = `autoPlay
              playsInline
              muted={isMuted}`;
content = content.replace(videoTarget, videoReplacement);

// 4. Add Volume toggle button in header
const headerTarget = `{programCamera && (
          <span className="text-white/60 font-mono text-[10px] uppercase truncate max-w-[150px]">
            {programCamera.name}
          </span>
        )}`;
const headerReplacement = `{programCamera && (
          <div className="flex items-center gap-4">
            <span className="text-white/60 font-mono text-[10px] uppercase truncate max-w-[150px]">
              {programCamera.name}
            </span>
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={\`p-1.5 rounded transition \${isMuted ? 'bg-slate-800 text-slate-400' : 'bg-red-500/20 text-red-400'}\`}
              title="Toggle Program Audio"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        )}`;
content = content.replace(headerTarget, headerReplacement);

fs.writeFileSync('src/components/MasterSwitcher/ProgramMonitor.tsx', content);
console.log("Patched program monitor audio controls");
