// src/server.ts
// BOW AGENT V3.3 — MULTI-CHANNEL CENTRAL SERVER & WEBSOCKET GATEWAY (Port 4000)

import http from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { CONFIG } from './config.js';
import { isGeminiConfigured } from './gemini/config.js';
import { webAdapter } from './adapters/webAdapter.js';
import { robotChannelAdapter } from './adapters/robotAdapter.js';
import { desktopChannelAdapter } from './adapters/desktopAdapter.js';
import { ttsEngine } from './speech/ttsEngine.js';
import { sttEngine } from './speech/sttEngine.js';
import { getKnowledgeGaps } from './knowledge/knowledgeReviewService.js';

export interface ServerOptions {
  port?: number;
  host?: string;
}

export class BowCentralAgentServer {
  private server?: http.Server;
  private wss?: WebSocketServer;
  private isRunning = false;
  private port: number;
  private host: string;

  constructor(options: ServerOptions = {}) {
    this.port = options.port || CONFIG.port || 4000;
    this.host = options.host || CONFIG.host || '0.0.0.0';
  }

  public async start(): Promise<void> {
    if (this.isRunning) return;

    this.server = http.createServer(async (req, res) => {
      // CORS Headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Auth-Token');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

      // 1. Health Check
      if (url.pathname === '/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'ok',
          service: 'bow-agent-central-brain',
          version: '3.3.0',
          geminiConfigured: isGeminiConfigured(),
          channels: ['WEB', 'ROBOT', 'DESKTOP'],
          timestamp: new Date().toISOString(),
        }));
        return;
      }

      // Helper to parse JSON body
      const parseJsonBody = async (): Promise<any> => {
        return new Promise((resolve, reject) => {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', () => {
            try {
              resolve(body ? JSON.parse(body) : {});
            } catch (e) {
              reject(e);
            }
          });
          req.on('error', reject);
        });
      };

      // 2. Web Query Endpoint (Zero-breaking for shopofbow)
      if (url.pathname === '/api/agent/query' && req.method === 'POST') {
        try {
          const body = await parseJsonBody();
          const response = await webAdapter.handleRequest(body);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(response));
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err?.message || 'Agent processing error' }));
        }
        return;
      }

      // 3. Speech TTS Endpoint
      if (url.pathname === '/api/speech/tts' && req.method === 'POST') {
        try {
          const body = await parseJsonBody();
          const ttsResult = await ttsEngine.synthesize(body.text || '', body.options);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(ttsResult));
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err?.message || 'TTS generation error' }));
        }
        return;
      }

      // 4. Speech STT Endpoint
      if (url.pathname === '/api/speech/stt' && req.method === 'POST') {
        try {
          const body = await parseJsonBody();
          const sttResult = await sttEngine.transcribe(body.audio || '', body.options);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(sttResult));
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err?.message || 'STT processing error' }));
        }
        return;
      }

      // 5. Desktop Command Endpoint
      if (url.pathname === '/api/desktop/command' && req.method === 'POST') {
        try {
          const body = await parseJsonBody();
          const authHeader = req.headers['authorization'] || req.headers['x-auth-token'];
          const token = body.authToken || (typeof authHeader === 'string' ? authHeader.replace(/^Bearer\s+/i, '') : '');
          const result = await desktopChannelAdapter.executeCommand({ ...body, authToken: token });
          res.writeHead(result.success ? 200 : 403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err?.message || 'Desktop command error' }));
        }
        return;
      }

      // 6. Knowledge Gaps Endpoint
      if (url.pathname === '/api/knowledge/gaps' && req.method === 'GET') {
        try {
          const gaps = await getKnowledgeGaps();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, count: gaps.length, data: gaps }));
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err?.message || 'Knowledge query error' }));
        }
        return;
      }

      // 404
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Endpoint not found' }));
    });

    // WebSocket Gateway Server
    this.wss = new WebSocketServer({ server: this.server });

    this.wss.on('connection', (ws: WebSocket, req) => {
      const pathname = req.url ? new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname : '/';
      console.log(`[BOW-SERVER] WebSocket client connected on path: ${pathname}`);

      ws.on('message', async (data) => {
        try {
          const payload = JSON.parse(data.toString());

          // Ping / Heartbeat
          if (payload.type === 'ping' || payload.type === 'heartbeat') {
            ws.send(JSON.stringify({ type: 'pong', requestId: payload.requestId, timestamp: new Date().toISOString() }));
            return;
          }

          // Robot Audio Inbound
          if (pathname.includes('robot') || payload.type === 'robot.audio_in' || payload.channel === 'ROBOT') {
            const result = await robotChannelAdapter.handleAudioIn(payload.audio || payload.text || '', payload.context);
            ws.send(JSON.stringify({ ...result, requestId: payload.requestId }));
            return;
          }

          // Desktop Command
          if (pathname.includes('desktop') || payload.type === 'desktop.command' || payload.channel === 'DESKTOP') {
            const result = await desktopChannelAdapter.executeCommand(payload);
            ws.send(JSON.stringify({ ...result, requestId: payload.requestId }));
            return;
          }

          // Default Web Channel (shopofbow contract)
          const webRes = await webAdapter.handleRequest(payload);
          ws.send(JSON.stringify({
            type: 'agent.response',
            requestId: payload.requestId,
            ...webRes,
          }));
        } catch (err: any) {
          ws.send(JSON.stringify({
            type: 'agent.error',
            error: err?.message || 'Invalid payload',
            timestamp: new Date().toISOString(),
          }));
        }
      });

      ws.on('close', () => {
        console.log(`[BOW-SERVER] WebSocket client disconnected from: ${pathname}`);
      });
    });

    return new Promise((resolve, reject) => {
      this.server!.listen(this.port, this.host, () => {
        this.isRunning = true;
        console.log(`[BOW-SERVER] Central Autonomous Brain listening on http://${this.host}:${this.port}`);
        resolve();
      });
      this.server!.on('error', reject);
    });
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) return;
    return new Promise<void>((resolve) => {
      if (this.wss) {
        for (const client of this.wss.clients) {
          try { client.terminate(); } catch {}
        }
        this.wss.close(() => {
          if (this.server) {
            this.server.close(() => {
              this.isRunning = false;
              resolve();
            });
          } else {
            this.isRunning = false;
            resolve();
          }
        });
      } else if (this.server) {
        this.server.close(() => {
          this.isRunning = false;
          resolve();
        });
      } else {
        this.isRunning = false;
        resolve();
      }
    });
  }
}

export const server = new BowCentralAgentServer();

// Direct execution entrypoint
if (import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}`) {
  server.start().catch((err) => {
    console.error('Failed to start BowCentralAgentServer:', err);
    process.exit(1);
  });
}
