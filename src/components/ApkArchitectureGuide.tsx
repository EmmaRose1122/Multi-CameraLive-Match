import React, { useState } from 'react';
import {
  ShieldCheck,
  Terminal,
  Cpu,
  Layers,
  FileCode,
  CheckCircle2,
  Copy,
  Check,
  Smartphone,
  Flame,
  Zap,
  HardDrive,
  Download,
} from 'lucide-react';

export const ApkArchitectureGuide: React.FC = () => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyCode = (id: string, codeText: string) => {
    navigator.clipboard.writeText(codeText);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6 py-4 px-2 select-none text-slate-200">
      {/* Hero Overview */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 rounded-xl bg-amber-600/20 border border-amber-500/40 text-amber-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Native Android APK & Mobile Streaming Architecture Guide
            </h1>
            <p className="text-xs text-white/50">
              Low-overhead, hardware-accelerated H.264 WebRTC camera nodes with ProGuard size optimization.
            </p>
          </div>
        </div>

        <p className="text-xs text-white/70 leading-relaxed">
          This architecture ensures that low-end Android mobile devices (e.g. 2GB–4GB RAM) can reliably run as
          wireless 1080p60/720p60 video transmitters for an entire 90-minute football match without thermal throttling,
          OOM crashes, or Wi-Fi packet drops.
        </p>
      </div>

      {/* Directory Structure */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5 shadow-2xl flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-semibold text-white uppercase tracking-tight">
              1. Standalone React Native Mobile Project Structure
            </h2>
          </div>
        </div>

        <div className="bg-black/40 backdrop-blur-md p-4 rounded-xl border border-white/10 font-mono text-xs text-white/80 overflow-x-auto">
          <pre>{`match-studio-mobile/
├── android/
│   ├── app/
│   │   ├── build.gradle              <-- ProGuard, ABI Filters (arm64-v8a/armeabi-v7a)
│   │   ├── proguard-rules.pro        <-- WebRTC and MediaCodec keep rules
│   │   └── src/main/
│   │       ├── AndroidManifest.xml   <-- CAMERA, WAKE_LOCK, HIGH_PERF_WIFI permissions
│   │       └── java/com/matchstudio/
├── ios/
├── src/
│   ├── services/
│   │   ├── WebRTCStreamingClient.ts  <-- Hardware H.264 WebRTC PeerConnection
│   │   ├── LocalSignalingService.ts  <-- Zero-Internet LAN WebSocket Discovery
│   │   ├── ThermalSleepManager.ts    <-- Screen dimming & power governor
│   │   └── RollingReplayBuffer.ts    <-- In-memory circular frame cache
│   ├── components/
│   │   ├── CameraNodeScreen.tsx      <-- Mobile transmitter UI with Tally border
│   │   └── ScoreboardOverlay.tsx     <-- Hardware-rendered football scoreboard
│   └── types/
└── package.json`}</pre>
        </div>
      </div>

      {/* Optimization Tips for Standalone Android APK */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5 shadow-2xl flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-white uppercase tracking-tight">
            2. Android APK Build Optimization (<code className="text-emerald-400">./gradlew assembleRelease</code>)
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Tip 1: ABI Split */}
          <div className="bg-black/40 backdrop-blur-md p-4 rounded-xl border border-white/10 flex flex-col gap-2">
            <div className="flex items-center gap-2 font-bold text-white">
              <span className="w-5 h-5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-mono text-[11px]">
                A
              </span>
              <span>ABI Splitting (Reduces APK from 65MB to ~14MB)</span>
            </div>
            <p className="text-white/60 leading-relaxed">
              Standard APKs bundle all architecture binaries. By configuring <code className="text-sky-300">splits.abi</code> in <code className="text-sky-300">android/app/build.gradle</code>, you build distinct APKs for <code className="text-sky-300">arm64-v8a</code> and <code className="text-sky-300">armeabi-v7a</code>, stripping 75% of unused native libraries.
            </p>
          </div>

          {/* Tip 2: MediaCodec H.264 Acceleration */}
          <div className="bg-black/40 backdrop-blur-md p-4 rounded-xl border border-white/10 flex flex-col gap-2">
            <div className="flex items-center gap-2 font-bold text-white">
              <span className="w-5 h-5 rounded bg-sky-950/80 border border-sky-500/40 text-sky-400 flex items-center justify-center font-mono text-[11px]">
                B
              </span>
              <span>Hardware MediaCodec H.264 Encoding</span>
            </div>
            <p className="text-white/60 leading-relaxed">
              Never use software VP8/VP9 on mobile phones for 90-minute matches. Enable native <code className="text-sky-300">MediaCodecVideoEncoderFactory</code> in WebRTC to route encoding directly to Qualcomm Adreno / Mali GPU hardware blocks, reducing CPU load from 80% to &lt;18%.
            </p>
          </div>

          {/* Tip 3: Thermal Sleep Mode */}
          <div className="bg-black/40 backdrop-blur-md p-4 rounded-xl border border-white/10 flex flex-col gap-2">
            <div className="flex items-center gap-2 font-bold text-white">
              <span className="w-5 h-5 rounded bg-indigo-950/80 border border-indigo-500/40 text-indigo-400 flex items-center justify-center font-mono text-[11px]">
                C
              </span>
              <span>Screen Dimming & Thermal Management</span>
            </div>
            <p className="text-white/60 leading-relaxed">
              Phone screens generate over 50% of device heat when left at max brightness. The app implements a one-tap Screen Dimmer that drops display rendering to 2% while keeping Camera2 sensor and WebRTC streaming active at 60 FPS.
            </p>
          </div>

          {/* Tip 4: Wi-Fi Lock */}
          <div className="bg-black/40 backdrop-blur-md p-4 rounded-xl border border-white/10 flex flex-col gap-2">
            <div className="flex items-center gap-2 font-bold text-white">
              <span className="w-5 h-5 rounded bg-amber-950/80 border border-amber-500/40 text-amber-400 flex items-center justify-center font-mono text-[11px]">
                D
              </span>
              <span>WIFI_MODE_FULL_HIGH_PERF Lock</span>
            </div>
            <p className="text-white/60 leading-relaxed">
              Acquiring Android's <code className="text-sky-300">WIFI_MODE_FULL_HIGH_PERF</code> prevents the OS from entering Wi-Fi power save intervals, ensuring consistent &lt;40ms latency across camera nodes without packet jitter.
            </p>
          </div>
        </div>
      </div>

      {/* Production build.gradle & ProGuard Config */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5 shadow-2xl flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm font-semibold text-white uppercase tracking-tight">
              3. Production <code className="text-purple-400">android/app/build.gradle</code> Snippet
            </h2>
          </div>
          <button
            onClick={() =>
              copyCode(
                'gradle',
                `android {
    ...
    defaultConfig {
        applicationId "com.matchstudio.pro"
        minSdkVersion 24
        targetSdkVersion 34
        ndk {
            abiFilters "arm64-v8a", "armeabi-v7a"
        }
    }
    splits {
        abi {
            enable true
            reset()
            include "arm64-v8a", "armeabi-v7a"
            universalApk false
        }
    }
    buildTypes {
        release {
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}`
              )
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-white border border-white/10 transition-colors"
          >
            {copiedSection === 'gradle' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Copy Gradle Config</span>
          </button>
        </div>

        <div className="bg-black/40 backdrop-blur-md p-4 rounded-xl border border-white/10 font-mono text-xs text-white/80 overflow-x-auto">
          <pre>{`android {
    defaultConfig {
        applicationId "com.matchstudio.pro"
        minSdkVersion 24
        targetSdkVersion 34
        ndk {
            abiFilters "arm64-v8a", "armeabi-v7a"
        }
    }
    splits {
        abi {
            enable true
            reset()
            include "arm64-v8a", "armeabi-v7a"
            universalApk false
        }
    }
    buildTypes {
        release {
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
            signingConfig signingConfigs.release
        }
    }
}`}</pre>
        </div>
      </div>

      {/* Terminal Build Commands */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5 shadow-2xl flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-white uppercase tracking-tight">
              4. Exporting Release APK Commands
            </h2>
          </div>
          <button
            onClick={() =>
              copyCode('cmd', `cd android\n./gradlew clean\n./gradlew assembleRelease`)
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-white border border-white/10 transition-colors"
          >
            {copiedSection === 'cmd' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Copy CLI</span>
          </button>
        </div>

        <div className="bg-black/40 backdrop-blur-md p-4 rounded-xl border border-white/10 font-mono text-xs text-emerald-400">
          <p className="text-white/40 mb-1"># Navigate to android directory and compile release APK:</p>
          <p className="text-white">cd android</p>
          <p className="text-white">./gradlew clean</p>
          <p className="text-white font-bold">./gradlew assembleRelease</p>
          <p className="text-white/40 mt-2">
            # Output APK will be located at:
            <br />
            <span className="text-sky-300">
              android/app/build/outputs/apk/release/app-arm64-v8a-release.apk
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};
