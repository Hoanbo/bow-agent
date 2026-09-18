import dotenv from 'dotenv';
dotenv.config();
// src/server.ts
// BOW AGENT V3.3 — MULTI-CHANNEL CENTRAL SERVER & WEBSOCKET GATEWAY (Port 4000)

import http from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { CONFIG, isDesktopAuthValid, isRobotSecretValid } from './config.js';
import { verifyShopWebhookSignature } from './core/security.js';
import { isGeminiConfigured } from './gemini/config.js';
import { webAdapter } from './adapters/webAdapter.js';
import { robotChannelAdapter } from './adapters/robotAdapter.js';
import { desktopChannelAdapter } from './adapters/desktopAdapter.js';
import { ttsEngine } from './speech/ttsEngine.js';
import { sttEngine } from './speech/sttEngine.js';
import { hybridLlmRouter } from './llm/hybridLlmRouter.js';
import { watchdogDaemon } from './embodied/watchdogDaemon.js';
import { getKnowledgeGaps } from './knowledge/knowledgeReviewService.js';
import { globalRequestGuard, RequestGuard } from './security/requestGuard.js';
import { WebhookVerifier } from './security/webhookVerifier.js';
import { globalPDP } from './core/policyDecisionPoint.js';
import { globalCircuitBreaker } from './llm/resilience.js';
import { globalBodyRegistry, validateBodyPsk, getBodyPsk, type BodyCommand, type BodyCommandResult, type BodyConnectionSender } from './core/bodyProtocol/index.js';




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
  private webhookVerifier: WebhookVerifier;

  constructor(options: ServerOptions = {}) {
    this.port = options.port || CONFIG.port || 4000;
    this.host = options.host || CONFIG.host || '0.0.0.0';
    this.webhookVerifier = new WebhookVerifier(CONFIG.shopWebhookSecret || (CONFIG.env === 'production' ? '' : 'bow_webhook_secret_default'));
  }

  public async start(): Promise<void> {
    if (this.isRunning) return;

    // Khởi tạo và xác thực Pre-Shared Key (PSK) cho BodyProtocol
    const bodyPsk = getBodyPsk();
    if (CONFIG.env !== 'test') {
      console.log(`[BOW-SERVER] BodyProtocol PSK đã sẵn sàng (độ dài: ${bodyPsk.length} ký tự).`);
    }

    this.server = http.createServer(async (req, res) => {
      // Never emit wildcard CORS in production. Development stays convenient,
      // while production must explicitly name browser origins in the env file.
      // 1. Correlation ID Propagation
      const incomingCorrelationId = req.headers['x-correlation-id'] as string | undefined;
      const correlationId = globalRequestGuard.getOrCreateCorrelationId(incomingCorrelationId);
      res.setHeader('X-Correlation-ID', correlationId);

      // 2. Client IP Rate Limiting
      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';
      const rateStatus = globalRequestGuard.checkRateLimit(clientIp);
      res.setHeader('X-RateLimit-Remaining', rateStatus.remaining.toString());
      res.setHeader('X-RateLimit-Reset', Math.ceil(rateStatus.resetMs / 1000).toString());
      if (!rateStatus.allowed) {
        res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': Math.ceil(rateStatus.resetMs / 1000).toString() });
        res.end(JSON.stringify({ error: 'RATE_LIMIT_EXCEEDED', resetMs: rateStatus.resetMs, correlationId }));
        return;
      }

      // 3. Origin Verification
      const requestOrigin = typeof req.headers.origin === 'string' ? req.headers.origin : '';
      if (requestOrigin && !globalRequestGuard.isOriginAllowed(requestOrigin)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'FORBIDDEN_ORIGIN', correlationId }));
        return;
      }

      // 4. CORS Setup
      const corsOrigin = CONFIG.env === 'production'
        ? (CONFIG.corsAllowedOrigins.includes(requestOrigin) ? requestOrigin : '')
        : '*';
      if (corsOrigin) res.setHeader('Access-Control-Allow-Origin', corsOrigin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Auth-Token');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Auth-Token, X-Correlation-ID, X-BOW-Signature, X-BOW-Timestamp, X-BOW-Nonce');

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
          version: '4.0.0',
          geminiConfigured: isGeminiConfigured(),
          hybridRouting: hybridLlmRouter.getHealthStatus(),
          speechEngine: ttsEngine.getTtsStatus(),
          embodiedWatchdog: watchdogDaemon.runHealthCheck(),
          channels: ['WEB', 'ROBOT', 'DESKTOP'],
          timestamp: new Date().toISOString(),
        }));
        return;


      }

      const readRawBody = async (): Promise<string> => {
        return new Promise((resolve, reject) => {
          let body = '';
          let size = 0;
          req.on('data', (chunk: Buffer) => {
            size += chunk.length;
            if (size > CONFIG.maxRequestBodyBytes) {
              reject(new Error('REQUEST_BODY_TOO_LARGE'));
              req.destroy();
              return;
            }
            body += chunk;
          });
          req.on('end', () => {
            resolve(body);
          });
          req.on('error', reject);
        });
      };

      // Helper to parse JSON body
      const parseJsonBody = async (): Promise<any> => {
        const body = await readRawBody();
        return body ? JSON.parse(body) : {};
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

      // 7. Realtime Shop Business Event Webhook Endpoint (Triggers Robot Proactive Notification)
      if (url.pathname === '/api/events/shop' && req.method === 'POST') {
        try {
          const rawBody = await readRawBody();
          const timestamp = req.headers['x-bow-timestamp'];
          const signature = req.headers['x-bow-signature'];
          const nonce = req.headers['x-bow-nonce'];

          if (CONFIG.env === 'production' || CONFIG.shopWebhookSecret) {
            const verifyRes = this.webhookVerifier.verify({
              rawBody,
              signatureHeader: typeof signature === 'string' ? signature : undefined,
              timestampHeader: typeof timestamp === 'string' ? timestamp : undefined,
              nonceHeader: typeof nonce === 'string' ? nonce : undefined,
            });
            if (!verifyRes.valid) {
              res.writeHead(401, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'UNAUTHORIZED_WEBHOOK', reason: verifyRes.reason, correlationId }));
              return;
            }
          }

          const body = rawBody ? JSON.parse(rawBody) : {};
          const robotCommand = await robotChannelAdapter.pushShopEventToOwner(body);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, dispatchedToRobot: true, robotCommand, correlationId }));
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err?.message || 'Event dispatch error', correlationId }));
        }
        return;
      }

      // Helper for governance authorization
      const checkGovAuth = (): boolean => {
        const authHeader = req.headers['authorization'] || req.headers['x-auth-token'];
        const token = typeof authHeader === 'string' ? authHeader.replace(/^Bearer\s+/i, '') : '';
        return isDesktopAuthValid(token) || isRobotSecretValid(token) || (Boolean(CONFIG.desktopAuthToken) && token === CONFIG.desktopAuthToken);
      };

      // 8. Governance: Request Approval
      if (url.pathname === '/api/v1/governance/approvals/request' && req.method === 'POST') {
        if (!checkGovAuth()) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'UNAUTHORIZED', correlationId }));
          return;
        }
        try {
          const body = await parseJsonBody();
          const approval = globalPDP.requestApproval({
            actionName: body.actionName,
            targetDomain: body.targetDomain || 'shop',
            arguments: body.arguments || {},
            requestedBy: body.requestedBy || 'api_client',
            ttlSeconds: body.ttlSeconds,
          });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, approval, correlationId }));
        } catch (err: any) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err?.message || 'Invalid request', correlationId }));
        }
        return;
      }

      // 9. Governance: Grant Approval
      if (url.pathname.match(/^\/api\/v1\/governance\/approvals\/([^/]+)\/grant$/) && req.method === 'POST') {
        if (!checkGovAuth()) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'UNAUTHORIZED', correlationId }));
          return;
        }
        try {
          const match = url.pathname.match(/^\/api\/v1\/governance\/approvals\/([^/]+)\/grant$/);
          const approvalId = match ? match[1] : '';
          const body = await parseJsonBody();
          const result = globalPDP.grantApproval(approvalId, body.approver || 'owner_api');
          res.writeHead(result.success ? 200 : 400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ...result, correlationId }));
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err?.message, correlationId }));
        }
        return;
      }

      // 10. Governance: Revoke Approval
      if (url.pathname.match(/^\/api\/v1\/governance\/approvals\/([^/]+)\/revoke$/) && req.method === 'POST') {
        if (!checkGovAuth()) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'UNAUTHORIZED', correlationId }));
          return;
        }
        try {
          const match = url.pathname.match(/^\/api\/v1\/governance\/approvals\/([^/]+)\/revoke$/);
          const approvalId = match ? match[1] : '';
          const body = await parseJsonBody();
          const revoked = globalPDP.revokeApproval(approvalId, body.reason || 'Revoked by operator');
          res.writeHead(revoked ? 200 : 404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: revoked, approvalId, correlationId }));
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err?.message, correlationId }));
        }
        return;
      }

      // 11. Governance: List Approvals
      if (url.pathname === '/api/v1/governance/approvals' && req.method === 'GET') {
        if (!checkGovAuth()) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'UNAUTHORIZED', correlationId }));
          return;
        }
        const approvals = globalPDP.getAllApprovals();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, count: approvals.length, approvals, correlationId }));
        return;
      }

      // 12. Governance: Audit Trail & Integrity
      if (url.pathname === '/api/v1/governance/audit' && req.method === 'GET') {
        if (!checkGovAuth()) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'UNAUTHORIZED', correlationId }));
          return;
        }
        const trail = globalPDP.getAuditTrail();
        const integrityVerified = globalPDP.verifyAuditLedgerIntegrity();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          count: trail.length,
          integrityVerified,
          auditTrail: trail.slice(-100),
          correlationId,
        }));
        return;
      }

      // 13. Governance: Kill Switches
      if (url.pathname === '/api/v1/governance/kill-switch') {
        if (req.method === 'GET') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            killSwitches: globalPDP.getKillSwitchStatus(),
            correlationId,
          }));
          return;
        }
        if (req.method === 'POST') {
          if (!checkGovAuth()) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'UNAUTHORIZED', correlationId }));
            return;
          }
          const body = await parseJsonBody();
          const active = Boolean(body.active);
          if (body.domain) {
            globalPDP.setDomainKillSwitch(body.domain, active);
          } else {
            globalPDP.setGlobalKillSwitch(active);
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            killSwitches: globalPDP.getKillSwitchStatus(),
            correlationId,
          }));
          return;
        }
      }

      // 14. Governance: SLO Metrics
      if (url.pathname === '/api/v1/governance/slo' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          slo: {
            availabilityTarget: 0.999,
            latencyTargetP95Ms: 2000,
            latencyTargetP99Ms: 5000,
            safetyZeroTolerance: true,
            rpoSeconds: 3600,
            rtoMinutes: 15,
          },
          currentStatus: {
            circuitBreaker: globalCircuitBreaker.getState(),
            hybridRouting: hybridLlmRouter.getHealthStatus(),
            killSwitches: globalPDP.getKillSwitchStatus(),
          },
          correlationId,
          timestamp: new Date().toISOString(),
        }));
        return;
      }

      // 15. BodyProtocol: Tra cứu danh sách Bodies đang hoạt động
      if (url.pathname === '/api/body/list' && req.method === 'GET') {
        const bodies = globalBodyRegistry.getAllActiveBodies().map((b) => ({
          bodyId: b.bodyId,
          bodyType: b.bodyType,
          name: b.name,
          capabilities: Array.from(b.capabilities.values()),
          registeredAt: b.registeredAt,
          lastHeartbeatAt: b.lastHeartbeatAt,
        }));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, count: bodies.length, bodies, correlationId }));
        return;
      }

      // 16. BodyProtocol: Điều phối gửi lệnh trực tiếp tới Body
      if (url.pathname === '/api/body/command' && req.method === 'POST') {
        const body = await parseJsonBody();
        const cmdResult = await globalBodyRegistry.executeBodyCommand({
          commandId: body.commandId || `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          bodyId: body.bodyId,
          capability: body.capability,
          params: body.params || {},
          correlationId,
          timeoutMs: body.timeoutMs,
        });
        res.writeHead(cmdResult.success ? 200 : 500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ...cmdResult, correlationId }));
        return;
      }

      // 404
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Endpoint not found', correlationId }));
    });

    // WebSocket Gateway Server
    this.wss = new WebSocketServer({
      server: this.server,
      verifyClient: (info, done) => {
        const origin = info.origin || (typeof info.req.headers.origin === 'string' ? info.req.headers.origin : '');
        if (origin && !globalRequestGuard.isOriginAllowed(origin)) {
          return done(false, 403, 'Forbidden Origin');
        }

        const clientIp = (info.req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || info.req.socket.remoteAddress || '127.0.0.1';
        const rateStatus = globalRequestGuard.checkRateLimit(clientIp);
        if (!rateStatus.allowed) {
          return done(false, 429, 'Rate Limit Exceeded');
        }

        const url = new URL(info.req.url || '/', `http://${info.req.headers.host || 'localhost'}`);
        const path = url.pathname;

        // Route: /ws/body (BodyProtocol)
        // Bắt buộc xác thực Pre-Shared Key (PSK) qua HTTP Header "Authorization: Bearer <PSK>"
        if (path === '/ws/body' || path.startsWith('/ws/body')) {
          const authHeader = info.req.headers['authorization'];
          let bearerToken: string | undefined;
          if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
            bearerToken = authHeader.slice(7).trim();
          }

          if (!bearerToken || !validateBodyPsk(bearerToken)) {
            console.warn(`[BOW-SERVER] ⚠️ TỪ CHỐI kết nối /ws/body (401 Unauthorized): Thiếu hoặc sai Pre-Shared Key (PSK) từ IP: ${clientIp}`);
            return done(false, 401, 'Unauthorized');
          }

          return done(true);
        }

        if (CONFIG.env !== 'production') return done(true);
        const robotPath = path.includes('robot') || path.includes('audio-stream');
        const desktopPath = path.includes('desktop');
        if (!robotPath && !desktopPath) return done(true);

        const robotSecret = info.req.headers['x-robot-secret'] || url.searchParams.get('secret') || url.searchParams.get('token');
        const desktopToken = info.req.headers['x-auth-token'] || info.req.headers.authorization?.replace(/^Bearer\s+/i, '') || url.searchParams.get('token');
        const authorized = robotPath
          ? isRobotSecretValid(typeof robotSecret === 'string' ? robotSecret : undefined)
          : isDesktopAuthValid(typeof desktopToken === 'string' ? desktopToken : undefined);
        return authorized ? done(true) : done(false, 401, 'Unauthorized');
      },
    });

    this.wss.on('connection', (ws: WebSocket, req) => {
      const pathname = req.url ? new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname : '/';
      const isRobotConnection = pathname.includes('robot') || pathname.includes('audio-stream');
      const isDesktopConnection = pathname.includes('desktop');
      const isBodyConnection = pathname.includes('body');
      console.log(`[BOW-SERVER] WebSocket client connected on path: ${pathname}`);

      let connectedBodyId: string | undefined;
      const pendingCommandResolvers = new Map<string, (res: BodyCommandResult) => void>();

      // Nếu client kết nối từ Robot hoặc Audio Stream, đăng ký nhận các sự kiện chủ động và lệnh ngắt (robot.interrupt)
      let unregisterRobotListener: (() => void) | undefined;
      if (isRobotConnection) {
        unregisterRobotListener = robotChannelAdapter.registerListener((command) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(command));
          }
        });
      }

      ws.on('message', async (data, isBinary) => {
        try {
          // 1. Handle Binary PCM Audio Chunks directly from microphone
          if (isBinary || (Buffer.isBuffer(data) && !data.toString().trim().startsWith('{'))) {
            if (!isRobotConnection) throw new Error('BINARY_AUDIO_REQUIRES_ROBOT_CHANNEL');
            const result = robotChannelAdapter.handleStreamingAudioChunk(data as Buffer);
            if (result.isInterrupted && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'robot.interrupt',
                action: 'stop_playback',
                reason: 'barge_in',
                detectionLatencyMs: result.latencyMs,
              }));
            }
            return;
          }

          const payload = JSON.parse(data.toString());

          // 2. BodyProtocol Handlers (Body Advertisement, Heartbeat, Command Result)
          if (payload.type === 'body.advertise') {
            const ad = payload.advertisement;
            connectedBodyId = ad.bodyId;

            const sender: BodyConnectionSender = {
              sendCommand: async (command: BodyCommand): Promise<BodyCommandResult> => {
                return new Promise((resolve) => {
                  const timeoutMs = command.timeoutMs || 10000;
                  const timer = setTimeout(() => {
                    pendingCommandResolvers.delete(command.commandId);
                    resolve({
                      commandId: command.commandId,
                      success: false,
                      error: `COMMAND_TIMEOUT: Body command execution timed out after ${timeoutMs}ms.`,
                    });
                  }, timeoutMs);

                  pendingCommandResolvers.set(command.commandId, (res: BodyCommandResult) => {
                    clearTimeout(timer);
                    resolve(res);
                  });

                  if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                      type: 'body.command',
                      command,
                    }));
                  } else {
                    clearTimeout(timer);
                    pendingCommandResolvers.delete(command.commandId);
                    resolve({
                      commandId: command.commandId,
                      success: false,
                      error: 'BODY_SOCKET_CLOSED: WebSocket connection to body is not open.',
                    });
                  }
                });
              },
              isAlive: () => ws.readyState === WebSocket.OPEN,
              close: (reason?: string) => {
                try {
                  ws.close(1000, reason);
                } catch {
                  // Ignore
                }
              },
            };

            globalBodyRegistry.registerBody(ad, sender);
            ws.send(JSON.stringify({
              type: 'body.advertise_ack',
              bodyId: ad.bodyId,
              status: 'REGISTERED',
              timestamp: Date.now(),
            }));
            return;
          }

          if (payload.type === 'body.heartbeat') {
            if (payload.bodyId) {
              globalBodyRegistry.recordHeartbeat(payload.bodyId);
            }
            ws.send(JSON.stringify({ type: 'body.heartbeat_ack', timestamp: Date.now() }));
            return;
          }

          if (payload.type === 'body.command_result') {
            const res = payload.result as BodyCommandResult;
            if (res && res.commandId) {
              const resolver = pendingCommandResolvers.get(res.commandId);
              if (resolver) {
                pendingCommandResolvers.delete(res.commandId);
                resolver(res);
              }
            }
            return;
          }

          // Ping / Heartbeat
          if (payload.type === 'ping' || payload.type === 'heartbeat') {
            ws.send(JSON.stringify({ type: 'pong', requestId: payload.requestId, timestamp: new Date().toISOString() }));
            return;
          }

          // Audio Stream Chunk (JSON wrapper)
          if (payload.type === 'audio_chunk') {
            if (!isRobotConnection) throw new Error('AUDIO_REQUIRES_ROBOT_CHANNEL');
            const chunk = payload.chunk || payload.data || payload.audio || '';
            const result = robotChannelAdapter.handleStreamingAudioChunk(chunk, payload.sessionId);
            if (result.isInterrupted && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'robot.interrupt',
                action: 'stop_playback',
                reason: 'barge_in',
                detectionLatencyMs: result.latencyMs,
              }));
            }
            return;
          }

          // Robot Audio Inbound
          if (isRobotConnection) {
            const result = await robotChannelAdapter.handleAudioIn(payload.audio || payload.text || '', payload.context);

            ws.send(JSON.stringify({ ...result, requestId: payload.requestId }));
            return;
          }

          // Desktop Command (Legacy adapter)
          if (isDesktopConnection && !payload.type?.startsWith('body.')) {
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
        if (connectedBodyId) {
          globalBodyRegistry.unregisterBody(connectedBodyId, 'CONNECTION_CLOSED');
        }
        if (unregisterRobotListener) {
          unregisterRobotListener();
        }
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
