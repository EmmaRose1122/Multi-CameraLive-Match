const fs = require('fs');
let content = fs.readFileSync('src/components/CameraNode/MobileCameraTransmitter.tsx', 'utf8');

// 1. Add MicOff to lucide-react imports
if (content.includes("SwitchCamera, Zap, Moon }")) {
  content = content.replace("SwitchCamera, Zap, Moon }", "SwitchCamera, Zap, Moon, Mic, MicOff }");
}

// 2. Add micMuted state
const stateTarget = "const [screenDimmed, setScreenDimmed] = useState(false);";
const stateReplacement = "const [screenDimmed, setScreenDimmed] = useState(false);\n  const [micMuted, setMicMuted] = useState(false);";
content = content.replace(stateTarget, stateReplacement);

// 3. Add effect to toggle audio track
const effectTarget = "// Battery & Thermal simulator";
const effectReplacement = `// Audio Mute Toggle
  useEffect(() => {
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = !micMuted;
      });
    }
  }, [micMuted, stream]);

  // Battery & Thermal simulator`;
content = content.replace(effectTarget, effectReplacement);

// 4. Add mute button to controls
const controlsTarget = `<button
            onClick={() => setTorchActive(!torchActive)}`;
const controlsReplacement = `<button
            onClick={() => setMicMuted(!micMuted)}
            className={\`p-3 rounded-full shadow-xl transition \${
              micMuted
                ? 'bg-rose-500 text-white'
                : 'bg-slate-900/90 text-slate-300 border border-slate-700 hover:bg-slate-800'
            }\`}
            title="Toggle Microphone"
          >
            {micMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setTorchActive(!torchActive)}`;
content = content.replace(controlsTarget, controlsReplacement);

fs.writeFileSync('src/components/CameraNode/MobileCameraTransmitter.tsx', content);
console.log("Patched mobile cam audio controls");
