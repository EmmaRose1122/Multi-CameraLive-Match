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

  public setLocalStream(stream: MediaStream) {
    this.localStream = stream;
    // Add tracks to any existing peer connections
    this.peerConnections.forEach((pc) => {
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });
    });
  }

  /**
   * Master Switcher initiates WebRTC connection to remote mobile camera node.
   */
  public async callCameraNode(targetNodeId: string, onRemoteStream: (stream: MediaStream) => void) {
    this.onRemoteStreamCallbacks.set(targetNodeId, onRemoteStream);

    const pc = new RTCPeerConnection(this.rtcConfig);
    this.peerConnections.set(targetNodeId, pc);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.send({
          type: 'ice-candidate',
          targetId: targetNodeId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        onRemoteStream(event.streams[0]);
      }
    };

    // Create Offer with low-latency constraints
    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    await pc.setLocalDescription(offer);

    this.send({
      type: 'webrtc-offer',
      targetId: targetNodeId,
      offer,
    });
  }

  private async handleRemoteOffer(senderId: string, offer: RTCSessionDescriptionInit) {
    const pc = new RTCPeerConnection(this.rtcConfig);
    this.peerConnections.set(senderId, pc);

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
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

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    this.send({
      type: 'webrtc-answer',
      targetId: senderId,
      answer,
    });
  }

  private async handleRemoteAnswer(senderId: string, answer: RTCSessionDescriptionInit) {
    const pc = this.peerConnections.get(senderId);
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }

  private async handleRemoteIceCandidate(senderId: string, candidate: RTCIceCandidateInit) {
    const pc = this.peerConnections.get(senderId);
    if (pc && candidate) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error('Error adding ICE candidate', e);
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

  public onScoreboardSync(cb: (scoreboard: any) => void) {
    this.onScoreboardSyncCallback = cb;
  }
}

export const webrtcService = new WebRTCService();
