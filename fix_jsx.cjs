const fs = require('fs');
let content = fs.readFileSync('src/components/CameraNode/MobileCameraTransmitter.tsx', 'utf8');

const target = `className="w-full h-full object-contain"
          />
          <div className="absolute top-16 left-0 right-0 flex justify-center pointer-events-none z-10">`;

const replacement = `className="w-full h-full object-contain"
          />
          <div className="absolute top-16 left-0 right-0 flex justify-center pointer-events-none z-10">`;

// Wait, I need to wrap it in <> </>
// Let's do it right.

const fullTarget = `{stream ? (
          <video
            ref={(el) => {
              videoRef.current = el;
              if (el && stream && el.srcObject !== stream) {
                el.srcObject = stream;
                el.play().catch(e => console.error("Mobile cam play error:", e));
              }
            }}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain"
          />
          <div className="absolute top-16 left-0 right-0 flex justify-center pointer-events-none z-10">
             <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-white/70 text-[10px] font-medium border border-white/10 shadow-lg flex items-center gap-2">
                <span>⚠️ If video is upside down, turn ON Auto-Rotate on your phone</span>
             </div>
          </div>
        ) : (`;

const fullReplacement = `{stream ? (
          <>
          <video
            ref={(el) => {
              videoRef.current = el;
              if (el && stream && el.srcObject !== stream) {
                el.srcObject = stream;
                el.play().catch(e => console.error("Mobile cam play error:", e));
              }
            }}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain"
          />
          <div className="absolute top-16 left-0 right-0 flex justify-center pointer-events-none z-10">
             <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-white/70 text-[10px] font-medium border border-white/10 shadow-lg flex items-center gap-2">
                <span>⚠️ If video is upside down, turn ON Auto-Rotate on your phone</span>
             </div>
          </div>
          </>
        ) : (`;

content = content.replace(fullTarget, fullReplacement);
fs.writeFileSync('src/components/CameraNode/MobileCameraTransmitter.tsx', content);
console.log("Fixed JSX wrapper");
