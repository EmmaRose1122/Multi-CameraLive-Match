/**
 * WebRTC Local Peer-to-Peer & WebSocket Signaling Service
 * Manages low-latency camera transmission and Tally control between phone nodes and Master Switcher.
 */

import { CameraNode, TallyState } from '../types/broadcast';

export type SignalingCallback = (msg: any) => void;

export class WebRTCService {
  private ws: WebSocket | null = null;
  private wsUrl: string;
  private clientId: string = '';
  private role: 'switcher' | 'camera' | 'viewer' = 'switcher';
  private peerConnections = new Map<string, RTCPeerConnection>();
  private localStream: MediaStream | null = null;
  private onRemoteStreamCallbacks = new Map<string, (stream: MediaStream) => void>();
  private onNodesUpdatedCallback: ((nodes: any[]) => void) | null = null;
  private onTallyStateCallback: ((state: TallyState) => void) | null = null;
  private onRemoteControlCallback: ((cmd: string, val: any) => void) | null = null;
  private onScoreboardSyncCallback: ((scoreboard: any) => void) | null = null;

  // ICE Servers (Local STUN / Direct LAN)

  // Fallback MJPEG over WebSocket
  private useFallbackTransmission = false;
  private hiddenCanvas: HTMLCanvasElement | null = null;
  private transmissionInterval: any = null;
  private onRemoteFrameCallbacks = new Map<string, (frameDataUrl: string) => void>();

  private rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  constructor() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.wsUrl = `${protocol}//${window.location.host}/ws/signaling`;
  }

  public connect(role: 'switcher' | 'camera' | 'viewer', cameraAngle?: string, name?: string): Promise<string> {
    this.role = role;
    return new Promise((resolve) => {
      try {
        this.ws = new WebSocket(this.wsUrl);

        this.ws.onopen = () => {
          console.log(`[WebRTC] Connected to signaling server as ${role}`);
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleSignalingMessage(data, resolve);
          } catch (e) {
            console.error('Signaling parse error:', e);
          }
        };

        this.ws.onclose = () => {
          console.log('[WebRTC] Signaling socket closed. Auto-reconnecting...');
          setTimeout(() => this.connect(this.role, cameraAngle, name), 3000);
        };
      } catch (err) {
        console.warn('Signaling server offline, operating in local simulated mode', err);
        resolve('local_client_fallback');
      }
    });
  }

  private handleSignalingMessage(msg: any, onInitialConnect?: (id: string) => void) {
    switch (msg.type) {
      case 'registered':
        this.clientId = msg.clientId;
        this.send({
          type: 'register-role',
          role: this.role,
          cameraAngle: 'center',
          name: this.role === 'camera' ? 'Mobile Cam Node' : 'Master Broadcast Switcher',
        });
        if (onInitialConnect) onInitialConnect(this.clientId);
        break;

      case 'node-list-updated':
      case 'node-disconnected':
        if (this.onNodesUpdatedCallback) {
          this.onNodesUpdatedCallback(msg.nodes || []);
        }
        break;

      case 'webrtc-offer':
        this.handleRemoteOffer(msg.senderId, msg.offer);
        break;

      case 'webrtc-answer':
        this.handleRemoteAnswer(msg.senderId, msg.answer);
        break;

      case 'ice-candidate':
        this.handleRemoteIceCandidate(msg.senderId, msg.candidate);
        break;

      case 'tally-state':
        if (this.onTallyStateCallback) {
          this.onTallyStateCallback(msg.state);
        }
        break;

      case 'remote-camera-control':
        if (this.onRemoteControlCallback) {
          this.onRemoteControlCallback(msg.command, msg.value);
        }
        break;

            case 'frame-sync':
        const globalCb = this.onRemoteFrameCallbacks.get('global');
        if (globalCb) globalCb(msg.senderId, msg.frameDataUrl);
        break;

      case 'scoreboard-sync':
        if (this.onScoreboardSyncCallback) {
          this.onScoreboardSyncCallback(msg.scoreboard);
        }
        break;
    }
  }

  public getClientId(): string {
    return this.clientId;
  }

  public async getPeerStats(nodeId: string): Promise<any> {
    const pc = this.peerConnections.get(nodeId);
    if (!pc) return null;
    try {
      const stats = await pc.getStats();
      let result = { bytesReceived: 0, frameRate: 0, frameWidth: 0, frameHeight: 0 };
      stats.forEach((report) => {
        if (report.type === 'inbound-rtp' && report.kind === 'video') {
          result.bytesReceived = report.bytesReceived || 0;
          result.frameRate = report.framesPerSecond || 0;
          result.frameWidth = report.frameWidth || 0;
          result.frameHeight = report.frameHeight || 0;
        }
      });
      return result;
    } catch (e) {
      return null;
    }
  }

  public setLocalStream(stream: MediaStream) {
    this.localStream = stream;
    
    // Start fallback transmission if on a mobile node
    if (this.role === 'camera') {
       if (!this.hiddenCanvas) {
         this.hiddenCanvas = document.createElement('canvas');
         this.hiddenCanvas.width = 640;
         this.hiddenCanvas.height = 360;
       }
       const videoEl = document.createElement('video');
       videoEl.autoplay = true;
       videoEl.muted = true;
       videoEl.playsInline = true;
       videoEl.srcObject = stream;
       
       videoEl.play().catch(e => console.log("Hidden video play error", e));
       
       if (this.transmissionInterval) clearInterval(this.transmissionInterval);
       this.transmissionInterval = setInterval(() => {
           if (this.ws && this.ws.readyState === WebSocket.OPEN && this.hiddenCanvas) {
             const ctx = this.hiddenCanvas.getContext('2d');
             if (ctx && videoEl.videoWidth > 0) {
               ctx.drawImage(videoEl, 0, 0, this.hiddenCanvas.width, this.hiddenCanvas.height);
               const frameDataUrl = this.hiddenCanvas.toDataURL('image/jpeg', 0.5);
               this.send({ type: 'frame-sync', frameDataUrl });
             }
           }
         }, 100); // 10 FPS fallback
    }
    // Add or replace tracks for any existing peer connections
    this.peerConnections.forEach((pc) => {
      const senders = pc.getSenders();
      stream.getTracks().forEach((track) => {
        const sender = senders.find(s => s.track && s.track.kind === track.kind);
        if (sender) {
          sender.replaceTrack(track);
        } else {
          pc.addTrack(track, stream);
        }
      });
    });
  }

  private iceCandidateQueues = new Map<string, RTCIceCandidateInit[]>();

  private async handleRemoteIceCandidate(senderId: string, candidate: RTCIceCandidateInit) {
    const pc = this.peerConnections.get(senderId);
    if (!pc) {
      if (!this.iceCandidateQueues.has(senderId)) this.iceCandidateQueues.set(senderId, []);
      this.iceCandidateQueues.get(senderId)!.push(candidate);
      return;
    }
    
    const addCandidate = async (cand: RTCIceCandidateInit) => {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(cand));
      } catch (e) {
        console.error('Error adding ICE candidate', e);
      }
    };

    if (pc.remoteDescription && pc.remoteDescription.type) {
      await addCandidate(candidate);
    } else {
      if (!this.iceCandidateQueues.has(senderId)) this.iceCandidateQueues.set(senderId, []);
      this.iceCandidateQueues.get(senderId)!.push(candidate);
    }
  }


  public callCameraNode(nodeId: string, onRemoteStream: (stream: MediaStream) => void) {
    const pc = new RTCPeerConnection(this.rtcConfig);
    this.peerConnections.set(nodeId, pc);
    this.onRemoteStreamCallbacks.set(nodeId, onRemoteStream);

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => pc.addTrack(track, this.localStream));
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.send({
          type: 'ice-candidate',
          targetId: nodeId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      console.log('[DEBUG] --- WEBRTC ONTRACK RECEIVED (answer) ---', { 
        streams: event.streams, 
        track: event.track, 
        senderId 
      });
      console.log('[DEBUG] --- WEBRTC ONTRACK RECEIVED (offer) ---', { 
        streams: event.streams, 
        track: event.track, 
        nodeId 
      });
      console.log('--- WEBRTC ONTRACK RECEIVED (offer) ---', event.streams);
      if (event.streams && event.streams[0]) {
        onRemoteStream(event.streams[0]);
      }
    };

    pc.createOffer()
      .then((offer) => pc.setLocalDescription(offer))
      .then(() => {
        this.send({
          type: 'webrtc-offer',
          targetId: nodeId,
          offer: pc.localDescription,
        });
      })
      .catch((e) => console.error('Error creating offer', e));
  }

  private async handleRemoteOffer(senderId: string, offer: RTCSessionDescriptionInit) {
    const pc = new RTCPeerConnection(this.rtcConfig);
    this.peerConnections.set(senderId, pc);

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => pc.addTrack(track, this.localStream));
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.send({
          type: 'ice-candidate',
          targetId: senderId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      console.log('--- WEBRTC ONTRACK RECEIVED (answer) ---', event.streams);
      if (event.streams && event.streams[0]) {
        const cb = this.onRemoteStreamCallbacks.get(senderId);
        if (cb) cb(event.streams[0]);
      }
    };

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      if (this.iceCandidateQueues.has(senderId)) {
        for (const cand of this.iceCandidateQueues.get(senderId)) {
          try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch (e) {}
        }
        this.iceCandidateQueues.delete(senderId);
      }
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this.send({
        type: 'webrtc-answer',
        targetId: senderId,
        answer: pc.localDescription,
      });
    } catch (e) {
      console.error('Error handling offer', e);
    }
  }

  private async handleRemoteAnswer(senderId: string, answer: RTCSessionDescriptionInit) {
    const pc = this.peerConnections.get(senderId);
    if (pc) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        if (this.iceCandidateQueues.has(senderId)) {
          for (const cand of this.iceCandidateQueues.get(senderId)) {
            try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch (e) {}
          }
          this.iceCandidateQueues.delete(senderId);
        }
      } catch (e) {
        console.error('Error handling answer', e);
      }
    }
  }

  public sendTallyCommand(targetNodeId: string, state: TallyState) {
    this.send({
      type: 'tally-command',
      targetId: targetNodeId,
      state,
    });
  }

  public sendRemoteCameraCommand(targetNodeId: string, command: string, value: any) {
    this.send({
      type: 'remote-camera-control',
      targetId: targetNodeId,
      command,
      value,
    });
  }

  public broadcastScoreboard(scoreboard: any) {
    this.send({
      type: 'scoreboard-broadcast',
      scoreboard,
    });
  }

  public sendTelemetry(battery: number, fps: number, tempC: number, resolution: string) {
    this.send({
      type: 'telemetry-update',
      deviceInfo: {
        battery,
        fps,
        temperature: `${tempC}°C`,
        resolution,
      },
    });
  }

  private send(msg: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  public onNodesUpdated(cb: (nodes: any[]) => void) {
    this.onNodesUpdatedCallback = cb;
  }

  public onTallyState(cb: (state: TallyState) => void) {
    this.onTallyStateCallback = cb;
  }

  public onRemoteControl(cb: (cmd: string, val: any) => void) {
    this.onRemoteControlCallback = cb;
  }

  public onRemoteFrame(cb: (nodeId: string, frameDataUrl: string) => void) {
    this.onRemoteFrameCallbacks.set('global', cb);
  }

  public onScoreboardSync(cb: (scoreboard: any) => void) {
    this.onScoreboardSyncCallback = cb;
  }
}

export const webrtcService = new WebRTCService();
