import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import os from 'os';

interface ConnectedClient {
  ws: WebSocket;
  id: string;
  role: 'switcher' | 'camera' | 'viewer';
  cameraAngle?: string;
  name?: string;
  deviceInfo?: {
    battery?: number;
    fps?: number;
    resolution?: string;
    temperature?: string;
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  const server = http.createServer(app);

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // WebSocket Server for WebRTC Signaling and Tally sync
  const wss = new WebSocketServer({ server, path: '/ws/signaling' });
  const clients = new Map<string, ConnectedClient>();

  function broadcastToRole(role: 'switcher' | 'camera' | 'viewer' | 'all', message: object, excludeId?: string) {
    const payload = JSON.stringify(message);
    clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN && client.id !== excludeId) {
        if (role === 'all' || client.role === role) {
          client.ws.send(payload);
        }
      }
    });
  }

  function getConnectedNodesList() {
    const nodes: Array<{
      id: string;
      role: string;
      cameraAngle?: string;
      name?: string;
      deviceInfo?: any;
    }> = [];
    clients.forEach((c) => {
      if (c.role === 'camera' || c.role === 'switcher') {
        nodes.push({
          id: c.id,
          role: c.role,
          cameraAngle: c.cameraAngle,
          name: c.name,
          deviceInfo: c.deviceInfo,
        });
      }
    });
    return nodes;
  }

  wss.on('connection', (ws: WebSocket) => {
    let clientId = 'client_' + Math.random().toString(36).substring(2, 9);
    let clientRole: 'switcher' | 'camera' | 'viewer' = 'viewer';

    clients.set(clientId, {
      ws,
      id: clientId,
      role: clientRole,
    });

    // Send assigned client ID
    ws.send(
      JSON.stringify({
        type: 'registered',
        clientId,
        availableNodes: getConnectedNodesList(),
      })
    );

    ws.on('message', (data: string) => {
      try {
        const msg = JSON.parse(data.toString());

        switch (msg.type) {
          case 'register-role': {
            const current = clients.get(clientId);
            if (current) {
              current.role = msg.role;
              current.cameraAngle = msg.cameraAngle || 'center';
              current.name = msg.name || `Camera ${msg.cameraAngle || 'Feed'}`;
              current.deviceInfo = msg.deviceInfo || {};
            }
            // Broadcast updated node list to switcher
            broadcastToRole('switcher', {
              type: 'node-list-updated',
              nodes: getConnectedNodesList(),
            });
            break;
          }

          case 'telemetry-update': {
            const current = clients.get(clientId);
            if (current) {
              current.deviceInfo = { ...current.deviceInfo, ...msg.deviceInfo };
            }
            broadcastToRole('switcher', {
              type: 'node-telemetry',
              nodeId: clientId,
              deviceInfo: msg.deviceInfo,
            });
            break;
          }

          // WebRTC Signaling: Offer, Answer, ICE Candidates
          case 'webrtc-offer': {
            const targetClient = clients.get(msg.targetId);
            if (targetClient && targetClient.ws.readyState === WebSocket.OPEN) {
              targetClient.ws.send(
                JSON.stringify({
                  type: 'webrtc-offer',
                  senderId: clientId,
                  offer: msg.offer,
                  cameraAngle: msg.cameraAngle,
                })
              );
            }
            break;
          }

          case 'webrtc-answer': {
            const targetClient = clients.get(msg.targetId);
            if (targetClient && targetClient.ws.readyState === WebSocket.OPEN) {
              targetClient.ws.send(
                JSON.stringify({
                  type: 'webrtc-answer',
                  senderId: clientId,
                  answer: msg.answer,
                })
              );
            }
            break;
          }

          case 'ice-candidate': {
            const targetClient = clients.get(msg.targetId);
            if (targetClient && targetClient.ws.readyState === WebSocket.OPEN) {
              targetClient.ws.send(
                JSON.stringify({
                  type: 'ice-candidate',
                  senderId: clientId,
                  candidate: msg.candidate,
                })
              );
            }
            break;
          }

          // Tally Light & Remote Camera Control (Torch, Zoom, Dim)
          case 'tally-command': {
            const targetClient = clients.get(msg.targetId);
            if (targetClient && targetClient.ws.readyState === WebSocket.OPEN) {
              targetClient.ws.send(
                JSON.stringify({
                  type: 'tally-state',
                  state: msg.state, // 'program' (RED) | 'preview' (GREEN) | 'standby' (GREY)
                })
              );
            }
            break;
          }

          case 'remote-camera-control': {
            const targetClient = clients.get(msg.targetId);
            if (targetClient && targetClient.ws.readyState === WebSocket.OPEN) {
              targetClient.ws.send(
                JSON.stringify({
                  type: 'remote-camera-control',
                  command: msg.command, // 'torch', 'zoom', 'dim-screen', 'set-resolution'
                  value: msg.value,
                })
              );
            }
            break;
          }

          // Global broadcast commands (e.g. Master Trigger Replay / Score change sync)
          case 'scoreboard-broadcast': {
            broadcastToRole('all', {
              type: 'scoreboard-sync',
              scoreboard: msg.scoreboard,
            });
            break;
          }

          default:
            break;
        }
      } catch (err) {
        console.error('Signaling message error:', err);
      }
    });

    ws.on('close', () => {
      clients.delete(clientId);
      broadcastToRole('switcher', {
        type: 'node-disconnected',
        nodeId: clientId,
        nodes: getConnectedNodesList(),
      });
    });
  });

  // REST API Routes
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Multi-Camera Live Match Broadcast Server',
      clientsConnected: clients.size,
      uptime: process.uptime(),
    });
  });

  // Network info endpoint for local Wi-Fi pairing
  app.get('/api/network-info', (req, res) => {
    const interfaces = os.networkInterfaces();
    const addresses: string[] = [];

    for (const k in interfaces) {
      for (const k2 of interfaces[k] || []) {
        if (k2.family === 'IPv4' && !k2.internal) {
          addresses.push(k2.address);
        }
      }
    }

    const host = req.get('host') || `localhost:${PORT}`;
    const protocol = req.protocol;

    res.json({
      host,
      localIps: addresses.length > 0 ? addresses : ['192.168.1.100'],
      port: PORT,
      wsUrl: `${protocol === 'https' ? 'wss' : 'ws'}://${host}/ws/signaling`,
      appUrl: `${protocol}://${host}`,
    });
  });

  // RTMP status / stream manager endpoint
  let rtmpBroadcastState = {
    isLive: false,
    rtmpUrl: 'rtmp://a.rtmp.youtube.com/live2',
    streamKey: '',
    resolution: '1080p',
    bitrateKbps: 5500,
    fps: 60,
    droppedFrames: 0,
    startTime: null as number | null,
    totalBytesStreamed: 0,
  };

  app.get('/api/rtmp/status', (req, res) => {
    res.json(rtmpBroadcastState);
  });

  app.post('/api/rtmp/start', (req, res) => {
    const { rtmpUrl, streamKey, resolution, bitrateKbps } = req.body;
    rtmpBroadcastState = {
      isLive: true,
      rtmpUrl: rtmpUrl || 'rtmp://a.rtmp.youtube.com/live2',
      streamKey: streamKey || 'xxxx-xxxx-xxxx-xxxx',
      resolution: resolution || '1080p',
      bitrateKbps: bitrateKbps || 5500,
      fps: 60,
      droppedFrames: 0,
      startTime: Date.now(),
      totalBytesStreamed: 0,
    };
    res.json({ success: true, message: 'RTMP Stream initialized', state: rtmpBroadcastState });
  });

  app.post('/api/rtmp/stop', (req, res) => {
    rtmpBroadcastState.isLive = false;
    rtmpBroadcastState.startTime = null;
    res.json({ success: true, message: 'RTMP Stream stopped', state: rtmpBroadcastState });
  });

  // Google Drive Upload Proxy (or direct client upload support)
  app.post('/api/drive/save-clip', (req, res) => {
    const { clipName, duration, eventType, timestamp, metadata } = req.body;
    // Returns simulated/live receipt for match clip archive
    res.json({
      success: true,
      fileId: 'gdrive_' + Math.random().toString(36).substring(2, 12),
      clipName,
      duration,
      eventType,
      savedAt: new Date().toISOString(),
      folder: '⚽ Football Match Live Studio / Replays',
      shareUrl: `https://drive.google.com/file/d/demo_match_${Date.now()}/view`,
    });
  });

  // Vite Middleware for Development vs Static Dist for Production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`⚽ Match Studio Live Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
