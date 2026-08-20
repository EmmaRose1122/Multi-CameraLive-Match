/**
 * Broadcast Audio Mixer Engine powered by Web Audio API
 * Provides professional DSP routing, multi-channel gain faders, 3-band EQ,
 * stereo panning, AFV (Audio Follows Video), master limiter, lip-sync delay,
 * calibrated test tones, and realistic stadium crowd acoustics.
 */

import { ChannelAudioState, MasterAudioState, CameraAngle } from '../types/broadcast';

export function dbToLinear(db: number): number {
  if (db <= -58) return 0;
  return Math.pow(10, db / 20);
}

export function linearToDb(linear: number): number {
  if (linear <= 0.001) return -60;
  return Math.max(-60, Math.min(12, 20 * Math.log10(linear)));
}

interface ChannelDspNodes {
  sourceNode: MediaStreamAudioSourceNode | null;
  synthSourceNode: AudioNode | null;
  eqLow: BiquadFilterNode;
  eqMid: BiquadFilterNode;
  eqHigh: BiquadFilterNode;
  panner: StereoPannerNode;
  gainNode: GainNode;
  splitter: ChannelSplitterNode;
  analyserL: AnalyserNode;
  analyserR: AnalyserNode;
  stream: MediaStream | null;
}

class AudioMixerService {
  private ctx: AudioContext | null = null;
  private masterSumBus: GainNode | null = null;
  private masterDelay: DelayNode | null = null;
  private masterCompressor: DynamicsCompressorNode | null = null;
  private masterGainNode: GainNode | null = null;
  private masterSplitter: ChannelSplitterNode | null = null;
  private masterAnalyserL: AnalyserNode | null = null;
  private masterAnalyserR: AnalyserNode | null = null;
  private destinationNode: MediaStreamAudioDestinationNode | null = null;

  // Test Tone & Ambience Generators
  private testToneOsc: OscillatorNode | null = null;
  private testToneGain: GainNode | null = null;
  private ambienceSource: AudioNode | null = null;
  private ambienceGain: GainNode | null = null;

  // Channel DSP chains mapped by camera nodeId
  private channels = new Map<string, ChannelDspNodes>();

  // State caches
  private channelStates = new Map<string, ChannelAudioState>();
  private masterState: MasterAudioState = {
    masterGain: 1.0,
    masterGainDb: 0,
    masterMuted: false,
    limiterEnabled: true,
    compressorEnabled: true,
    delayMs: 40,
    testTone: false,
    stadiumAmbience: true,
    stadiumAmbienceLevel: 0.35,
    monitorSource: 'master',
    meterL: 0,
    meterR: 0,
    peakL: 0,
    peakR: 0,
    isClipping: false,
  };

  private currentProgramCameraId: string = '';
  private meterListeners = new Set<(channels: ChannelAudioState[], master: MasterAudioState) => void>();
  private animFrameId: number | null = null;
  private isStarted = false;

  constructor() {
    // Delay initialization until user gesture
  }

  public init() {
    if (this.ctx && this.ctx.state !== 'closed') {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx({ latencyHint: 'interactive' });

      // Master Summing Bus
      this.masterSumBus = this.ctx.createGain();
      this.masterSumBus.gain.value = 1.0;

      // Master Lip-Sync Delay
      this.masterDelay = this.ctx.createDelay(1.0);
      this.masterDelay.delayTime.value = this.masterState.delayMs / 1000;

      // Master Broadcast Limiter & Compressor
      this.masterCompressor = this.ctx.createDynamicsCompressor();
      this.masterCompressor.threshold.setValueAtTime(-3, this.ctx.currentTime); // -3dB threshold
      this.masterCompressor.knee.setValueAtTime(6, this.ctx.currentTime);
      this.masterCompressor.ratio.setValueAtTime(12, this.ctx.currentTime); // high ratio as broadcast limiter
      this.masterCompressor.attack.setValueAtTime(0.003, this.ctx.currentTime); // 3ms fast attack
      this.masterCompressor.release.setValueAtTime(0.15, this.ctx.currentTime); // 150ms release

      // Master Gain Node
      this.masterGainNode = this.ctx.createGain();
      this.masterGainNode.gain.value = this.masterState.masterMuted ? 0 : this.masterState.masterGain;

      // Master Metering
      this.masterSplitter = this.ctx.createChannelSplitter(2);
      this.masterAnalyserL = this.ctx.createAnalyser();
      this.masterAnalyserR = this.ctx.createAnalyser();
      this.masterAnalyserL.fftSize = 256;
      this.masterAnalyserR.fftSize = 256;
      this.masterAnalyserL.smoothingTimeConstant = 0.8;
      this.masterAnalyserR.smoothingTimeConstant = 0.8;

      // Route Master Bus Chain:
      // masterSumBus -> masterDelay -> masterCompressor -> masterGainNode -> Destination & Splitter
      this.masterSumBus.connect(this.masterDelay);
      this.masterDelay.connect(this.masterCompressor);
      this.masterCompressor.connect(this.masterGainNode);

      // Connect to hardware speakers / headphones
      this.masterGainNode.connect(this.ctx.destination);

      // Connect to Master Analysers for VU meters
      this.masterGainNode.connect(this.masterSplitter);
      this.masterSplitter.connect(this.masterAnalyserL, 0);
      this.masterSplitter.connect(this.masterAnalyserR, 1);

      // Create destination for broadcast stream mixdown
      this.destinationNode = this.ctx.createMediaStreamDestination();
      this.masterGainNode.connect(this.destinationNode);

      // Initialize Ambient Stadium Crowd Bed
      this.initStadiumAmbience();

      this.isStarted = true;
      this.startMeterLoop();
    } catch (e) {
      console.warn('AudioContext initialization error:', e);
    }
  }

  private initStadiumAmbience() {
    if (!this.ctx || !this.masterSumBus) return;

    try {
      // Pink/Brown noise generator simulating stadium acoustic atmosphere
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(2, bufferSize, this.ctx.sampleRate);
      for (let channel = 0; channel < 2; channel++) {
        const out = noiseBuffer.getChannelData(channel);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
          b6 = white * 0.115926;
        }
      }

      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      // Bandpass filter to isolate stadium crowd presence frequencies (300Hz - 3.5kHz)
      const filterLow = this.ctx.createBiquadFilter();
      filterLow.type = 'highpass';
      filterLow.frequency.value = 180;

      const filterHigh = this.ctx.createBiquadFilter();
      filterHigh.type = 'lowpass';
      filterHigh.frequency.value = 3200;

      this.ambienceGain = this.ctx.createGain();
      const targetGain = this.masterState.stadiumAmbience ? this.masterState.stadiumAmbienceLevel * 0.12 : 0;
      this.ambienceGain.gain.setValueAtTime(targetGain, this.ctx.currentTime);

      noiseSource.connect(filterLow);
      filterLow.connect(filterHigh);
      filterHigh.connect(this.ambienceGain);
      this.ambienceGain.connect(this.masterSumBus);

      noiseSource.start(0);
      this.ambienceSource = noiseSource;
    } catch (e) {
      console.warn('Failed to setup stadium ambience generator', e);
    }
  }

  public async resumeContext() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch (e) {}
    }
  }

  public registerCameraNode(nodeId: string, name: string, angle: CameraAngle, stream: MediaStream | null) {
    this.init();

    // Default initial audio state
    if (!this.channelStates.has(nodeId)) {
      this.channelStates.set(nodeId, {
        nodeId,
        name,
        angle,
        gain: 1.0,
        gainDb: 0,
        muted: false,
        solo: false,
        pan: angle === 'left-goal' ? -0.4 : angle === 'right-goal' ? 0.4 : 0,
        afv: true, // Audio Follows Video default ON for broadcast
        eqLow: 0,
        eqMid: 0,
        eqHigh: 0,
        meterL: 0,
        meterR: 0,
        peakL: 0,
        peakR: 0,
        isClipping: false,
        isAudioPresent: !!(stream && stream.getAudioTracks().length > 0),
      });
    }

    if (!this.ctx || !this.masterSumBus) return;

    // Check if DSP nodes already exist for this node
    let dsp = this.channels.get(nodeId);
    if (!dsp) {
      // Build Channel Strip DSP
      const eqLow = this.ctx.createBiquadFilter();
      eqLow.type = 'lowshelf';
      eqLow.frequency.value = 150;
      eqLow.gain.value = 0;

      const eqMid = this.ctx.createBiquadFilter();
      eqMid.type = 'peaking';
      eqMid.frequency.value = 1200;
      eqMid.Q.value = 1.0;
      eqMid.gain.value = 0;

      const eqHigh = this.ctx.createBiquadFilter();
      eqHigh.type = 'highshelf';
      eqHigh.frequency.value = 6500;
      eqHigh.gain.value = 0;

      const panner = this.ctx.createStereoPanner();
      const state = this.channelStates.get(nodeId)!;
      panner.pan.value = state.pan;

      const gainNode = this.ctx.createGain();
      gainNode.gain.value = state.muted ? 0 : state.gain;

      const splitter = this.ctx.createChannelSplitter(2);
      const analyserL = this.ctx.createAnalyser();
      const analyserR = this.ctx.createAnalyser();
      analyserL.fftSize = 256;
      analyserR.fftSize = 256;
      analyserL.smoothingTimeConstant = 0.8;
      analyserR.smoothingTimeConstant = 0.8;

      // Connect EQ -> Panner -> Gain -> Master Sum Bus
      eqLow.connect(eqMid);
      eqMid.connect(eqHigh);
      eqHigh.connect(panner);
      panner.connect(gainNode);
      gainNode.connect(this.masterSumBus);

      // Metering branch
      gainNode.connect(splitter);
      splitter.connect(analyserL, 0);
      splitter.connect(analyserR, 1);

      dsp = {
        sourceNode: null,
        synthSourceNode: null,
        eqLow,
        eqMid,
        eqHigh,
        panner,
        gainNode,
        splitter,
        analyserL,
        analyserR,
        stream: null,
      };

      this.channels.set(nodeId, dsp);
    }

    // Connect stream if audio tracks are available
    const hasAudioTracks = !!(stream && stream.getAudioTracks().length > 0);
    const channelState = this.channelStates.get(nodeId);
    if (channelState) channelState.isAudioPresent = hasAudioTracks;

    if (hasAudioTracks && stream) {
      if (dsp.synthSourceNode) {
        try {
          (dsp.synthSourceNode as any).stop?.();
          dsp.synthSourceNode.disconnect();
        } catch (e) {}
        dsp.synthSourceNode = null;
      }

      // Only recreate MediaStreamSourceNode if stream actually changed
      if (!dsp.sourceNode || dsp.stream !== stream) {
        try {
          if (dsp.sourceNode) {
            dsp.sourceNode.disconnect();
          }
          dsp.sourceNode = this.ctx.createMediaStreamSource(stream);
          dsp.sourceNode.connect(dsp.eqLow);
          dsp.stream = stream;
        } catch (e) {
          console.warn('Error attaching media stream to audio mixer channel:', e);
        }
      }
    } else if (!hasAudioTracks && !dsp.sourceNode) {
      // Connect pitch-side simulated mic ambience (whistle, ball kick resonance, crowd focus)
      if (!dsp.synthSourceNode) {
        try {
          const osc = this.ctx.createOscillator();
          const oscGain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = 60 + Math.random() * 40; // Subtle sub thump
          oscGain.gain.value = 0.005; // very subtle background tone
          osc.connect(oscGain);
          oscGain.connect(dsp.eqLow);
          osc.start();
          dsp.synthSourceNode = osc;
        } catch (e) {}
      }
    }

    this.recalculateGains();
  }

  public unregisterCameraNode(nodeId: string) {
    const dsp = this.channels.get(nodeId);
    if (dsp) {
      try {
        if (dsp.sourceNode) dsp.sourceNode.disconnect();
        if (dsp.synthSourceNode) (dsp.synthSourceNode as any).stop?.();
        dsp.gainNode.disconnect();
        dsp.panner.disconnect();
        dsp.eqHigh.disconnect();
        dsp.eqMid.disconnect();
        dsp.eqLow.disconnect();
      } catch (e) {}
      this.channels.delete(nodeId);
    }
    this.channelStates.delete(nodeId);
    this.recalculateGains();
  }

  public setChannelGain(nodeId: string, gain: number, gainDb?: number) {
    this.init();
    const state = this.channelStates.get(nodeId);
    if (!state) return;

    state.gain = Math.max(0, Math.min(2.0, gain));
    state.gainDb = gainDb !== undefined ? gainDb : linearToDb(state.gain);
    this.recalculateGains();
  }

  public setChannelMute(nodeId: string, muted: boolean) {
    this.init();
    const state = this.channelStates.get(nodeId);
    if (!state) return;
    state.muted = muted;
    this.recalculateGains();
  }

  public setChannelSolo(nodeId: string, solo: boolean) {
    this.init();
    const state = this.channelStates.get(nodeId);
    if (!state) return;
    state.solo = solo;
    this.recalculateGains();
  }

  public setChannelPan(nodeId: string, pan: number) {
    this.init();
    const state = this.channelStates.get(nodeId);
    if (!state) return;
    state.pan = Math.max(-1, Math.min(1, pan));
    const dsp = this.channels.get(nodeId);
    if (dsp && this.ctx) {
      dsp.panner.pan.setValueAtTime(state.pan, this.ctx.currentTime);
    }
  }

  public setChannelAfv(nodeId: string, afv: boolean) {
    this.init();
    const state = this.channelStates.get(nodeId);
    if (!state) return;
    state.afv = afv;
    this.recalculateGains();
  }

  public setChannelEq(nodeId: string, low: number, mid: number, high: number) {
    this.init();
    const state = this.channelStates.get(nodeId);
    if (!state) return;
    state.eqLow = low;
    state.eqMid = mid;
    state.eqHigh = high;

    const dsp = this.channels.get(nodeId);
    if (dsp && this.ctx) {
      dsp.eqLow.gain.setValueAtTime(low, this.ctx.currentTime);
      dsp.eqMid.gain.setValueAtTime(mid, this.ctx.currentTime);
      dsp.eqHigh.gain.setValueAtTime(high, this.ctx.currentTime);
    }
  }

  public setMasterGain(gain: number, gainDb?: number) {
    this.init();
    this.masterState.masterGain = Math.max(0, Math.min(2.0, gain));
    this.masterState.masterGainDb = gainDb !== undefined ? gainDb : linearToDb(this.masterState.masterGain);
    this.recalculateGains();
  }

  public setMasterMute(muted: boolean) {
    this.init();
    this.masterState.masterMuted = muted;
    this.recalculateGains();
  }

  public setMasterDelay(delayMs: number) {
    this.init();
    this.masterState.delayMs = Math.max(0, Math.min(1000, delayMs));
    if (this.masterDelay && this.ctx) {
      this.masterDelay.delayTime.setValueAtTime(this.masterState.delayMs / 1000, this.ctx.currentTime);
    }
  }

  public setMasterLimiter(enabled: boolean) {
    this.init();
    this.masterState.limiterEnabled = enabled;
    if (this.masterCompressor && this.ctx) {
      this.masterCompressor.ratio.setValueAtTime(enabled ? 12 : 1, this.ctx.currentTime);
    }
  }

  public toggleTestTone(enabled?: boolean) {
    this.init();
    const newState = enabled !== undefined ? enabled : !this.masterState.testTone;
    this.masterState.testTone = newState;

    if (!this.ctx || !this.masterSumBus) return;

    if (newState) {
      try {
        if (!this.testToneOsc) {
          this.testToneOsc = this.ctx.createOscillator();
          this.testToneGain = this.ctx.createGain();
          this.testToneOsc.type = 'sine';
          this.testToneOsc.frequency.setValueAtTime(1000, this.ctx.currentTime); // 1 kHz Standard Test Tone
          this.testToneGain.gain.setValueAtTime(0.1, this.ctx.currentTime); // -20 dBFS reference level
          this.testToneOsc.connect(this.testToneGain);
          this.testToneGain.connect(this.masterSumBus);
          this.testToneOsc.start();
        }
      } catch (e) {
        console.warn('Error starting test tone:', e);
      }
    } else {
      if (this.testToneOsc) {
        try {
          this.testToneOsc.stop();
          this.testToneOsc.disconnect();
        } catch (e) {}
        this.testToneOsc = null;
        this.testToneGain = null;
      }
    }
  }

  public toggleStadiumAmbience(enabled?: boolean, level?: number) {
    this.init();
    if (enabled !== undefined) this.masterState.stadiumAmbience = enabled;
    else this.masterState.stadiumAmbience = !this.masterState.stadiumAmbience;

    if (level !== undefined) this.masterState.stadiumAmbienceLevel = level;

    if (this.ambienceGain && this.ctx) {
      const target = this.masterState.stadiumAmbience ? this.masterState.stadiumAmbienceLevel * 0.15 : 0;
      this.ambienceGain.gain.setValueAtTime(target, this.ctx.currentTime);
    }
  }

  public updateActiveProgramCamera(programCameraId: string) {
    this.currentProgramCameraId = programCameraId;
    this.recalculateGains();
  }

  private recalculateGains() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Check if any channel is soloed
    let hasSolo = false;
    this.channelStates.forEach((state) => {
      if (state.solo) hasSolo = true;
    });

    // Apply gains per channel
    this.channelStates.forEach((state, nodeId) => {
      const dsp = this.channels.get(nodeId);
      if (!dsp) return;

      let effectiveGain = state.gain;

      // Mute rule
      if (state.muted) {
        effectiveGain = 0;
      }
      // Solo rule
      else if (hasSolo && !state.solo) {
        effectiveGain = 0;
      }
      // AFV rule (Audio Follows Video): if AFV is on, duck by 20dB or silence when off-air
      else if (state.afv) {
        const isOnProgram = (nodeId === this.currentProgramCameraId);
        if (!isOnProgram) {
          effectiveGain = effectiveGain * 0.05; // ducked background bleed
        }
      }

      dsp.gainNode.gain.cancelScheduledValues(now);
      dsp.gainNode.gain.linearRampToValueAtTime(Math.max(0, effectiveGain), now + 0.03); // smooth 30ms ramp
    });

    // Apply Master Gain
    if (this.masterGainNode) {
      const effectiveMaster = this.masterState.masterMuted ? 0 : this.masterState.masterGain;
      this.masterGainNode.gain.cancelScheduledValues(now);
      this.masterGainNode.gain.linearRampToValueAtTime(Math.max(0, effectiveMaster), now + 0.03);
    }
  }

  public getChannelState(nodeId: string): ChannelAudioState | undefined {
    return this.channelStates.get(nodeId);
  }

  public getAllChannelStates(): ChannelAudioState[] {
    return Array.from(this.channelStates.values());
  }

  public getMasterState(): MasterAudioState {
    return { ...this.masterState };
  }

  public subscribeMeters(listener: (channels: ChannelAudioState[], master: MasterAudioState) => void) {
    this.meterListeners.add(listener);
    return () => {
      this.meterListeners.delete(listener);
    };
  }

  private startMeterLoop() {
    if (this.animFrameId) return;

    const dataArray = new Uint8Array(128);

    const calculateLevel = (analyser: AnalyserNode | null): { rms: number; peak: number } => {
      if (!analyser) return { rms: 0, peak: 0 };
      analyser.getByteTimeDomainData(dataArray);

      let sum = 0;
      let peak = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const normalized = (dataArray[i] - 128) / 128; // -1 to 1
        const abs = Math.abs(normalized);
        if (abs > peak) peak = abs;
        sum += normalized * normalized;
      }
      const rms = Math.sqrt(sum / dataArray.length);
      return { rms, peak };
    };

    const tick = () => {
      // Process channel meters
      this.channelStates.forEach((state, nodeId) => {
        const dsp = this.channels.get(nodeId);
        if (dsp) {
          const l = calculateLevel(dsp.analyserL);
          const r = calculateLevel(dsp.analyserR);

          // Fast attack, slow decay
          state.meterL += (l.rms - state.meterL) * (l.rms > state.meterL ? 0.6 : 0.15);
          state.meterR += (r.rms - state.meterR) * (r.rms > state.meterR ? 0.6 : 0.15);

          state.peakL = Math.max(l.peak, (state.peakL || 0) * 0.94);
          state.peakR = Math.max(r.peak, (state.peakR || 0) * 0.94);

          state.isClipping = (state.peakL > 0.95 || state.peakR > 0.95);
        }
      });

      // Process Master meters
      if (this.masterAnalyserL && this.masterAnalyserR) {
        const l = calculateLevel(this.masterAnalyserL);
        const r = calculateLevel(this.masterAnalyserR);

        this.masterState.meterL += (l.rms - this.masterState.meterL) * (l.rms > this.masterState.meterL ? 0.6 : 0.15);
        this.masterState.meterR += (r.rms - this.masterState.meterR) * (r.rms > this.masterState.meterR ? 0.6 : 0.15);

        this.masterState.peakL = Math.max(l.peak, (this.masterState.peakL || 0) * 0.94);
        this.masterState.peakR = Math.max(r.peak, (this.masterState.peakR || 0) * 0.94);

        this.masterState.isClipping = (this.masterState.peakL > 0.96 || this.masterState.peakR > 0.96);
      }

      // Notify UI listeners
      const channelList = Array.from(this.channelStates.values());
      this.meterListeners.forEach((listener) => {
        listener(channelList, { ...this.masterState });
      });

      this.animFrameId = requestAnimationFrame(tick);
    };

    this.animFrameId = requestAnimationFrame(tick);
  }
}

export const audioMixerService = new AudioMixerService();
