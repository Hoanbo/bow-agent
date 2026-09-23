import dotenv from 'dotenv';
dotenv.config();
// src/server.ts
// BOW AGENT V3.3 — MULTI-CHANNEL CENTRAL SERVER & WEBSOCKET GATEWAY (Port 4000)
import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { WebSocketServer, WebSocket } from 'ws';
import { ensureTlsCertificates } from './security/tlsCertManager.js';
import { CONFIG, isDesktopAuthValid, isRobotSecretValid } from './config.js';
import { isGeminiConfigured } from './gemini/config.js';
import { webAdapter } from './adapters/webAdapter.js';
import { robotChannelAdapter } from './adapters/robotAdapter.js';
import { desktopChannelAdapter } from './adapters/desktopAdapter.js';
import { ttsEngine } from './speech/ttsEngine.js';
import { sttEngine } from './speech/sttEngine.js';
import './tools/desktopTools.js';
import { hybridLlmRouter } from './llm/hybridLlmRouter.js';
import { watchdogDaemon } from './embodied/watchdogDaemon.js';
import { getKnowledgeGaps } from './knowledge/knowledgeReviewService.js';
import { globalRequestGuard } from './security/requestGuard.js';
import { WebhookVerifier } from './security/webhookVerifier.js';
import { globalPDP } from './core/policyDecisionPoint.js';
import { globalCircuitBreaker } from './llm/resilience.js';
import { globalBodyRegistry, validateBodyPsk, getBodyPsk, BODY_CONFIG } from './core/bodyProtocol/index.js';
import { globalVoicePipeline } from './speech/voicePipeline.js';
export class BowCentralAgentServer {
    server;
    wss;
    isRunning = false;
    port;
    host;
    webhookVerifier;
    tlsEnabled = false;
    constructor(options = {}) {
        this.port = options.port || CONFIG.port || 4000;
        this.host = options.host || CONFIG.host || '0.0.0.0';
        this.webhookVerifier = new WebhookVerifier(CONFIG.shopWebhookSecret || (CONFIG.env === 'production' ? '' : 'bow_webhook_secret_default'));
        this.tlsEnabled = process.env.BOW_ENABLE_TLS === 'true';
    }
    async start() {
        if (this.isRunning)
            return;
        // Khởi tạo và xác thực Pre-Shared Key (PSK) cho BodyProtocol
        const bodyPsk = getBodyPsk();
        if (CONFIG.env !== 'test') {
            console.log(`[BOW-SERVER] BodyProtocol PSK đã sẵn sàng (độ dài: ${bodyPsk.length} ký tự).`);
        }
        const requestHandler = async (req, res) => {
            // Never emit wildcard CORS in production. Development stays convenient,
            // while production must explicitly name browser origins in the env file.
            // 1. Correlation ID Propagation
            const incomingCorrelationId = req.headers['x-correlation-id'];
            const correlationId = globalRequestGuard.getOrCreateCorrelationId(incomingCorrelationId);
            res.setHeader('X-Correlation-ID', correlationId);
            // 2. Client IP Rate Limiting
            const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';
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
            if (corsOrigin)
                res.setHeader('Access-Control-Allow-Origin', corsOrigin);
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
            const readRawBody = async () => {
                return new Promise((resolve, reject) => {
                    let body = '';
                    let size = 0;
                    req.on('data', (chunk) => {
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
            const parseJsonBody = async () => {
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
                }
                catch (err) {
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
                }
                catch (err) {
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
                }
                catch (err) {
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
                }
                catch (err) {
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
                }
                catch (err) {
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
                    // Bắt buộc xác thực chữ ký Webhook vô điều kiện (không có bypass theo environment)
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
                    const body = rawBody ? JSON.parse(rawBody) : {};
                    const robotCommand = await robotChannelAdapter.pushShopEventToOwner(body);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, dispatchedToRobot: true, robotCommand, correlationId }));
                }
                catch (err) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: err?.message || 'Event dispatch error', correlationId }));
                }
                return;
            }
            // Helper for governance authorization
            const checkGovAuth = () => {
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
                }
                catch (err) {
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
                }
                catch (err) {
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
                }
                catch (err) {
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
                    }
                    else {
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
            // 16. BodyProtocol: Điều phối gửi lệnh trực tiếp tới Body (Chỉ bật khi có BOW_ALLOW_DEBUG_ENDPOINTS=true, bắt buộc Bearer Auth và PDP)
            if (url.pathname === '/api/body/command' && req.method === 'POST') {
                // 1. Kiểm tra cờ Debug: Mặc định TẮT ở production và mọi môi trường trừ khi bật tường minh
                if (process.env.BOW_ALLOW_DEBUG_ENDPOINTS !== 'true') {
                    res.writeHead(403, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        error: 'DEBUG_ENDPOINT_DISABLED',
                        message: 'Endpoint /api/body/command is disabled by default. Set BOW_ALLOW_DEBUG_ENDPOINTS=true to enable.',
                        correlationId,
                    }));
                    return;
                }
                // 2. Bắt buộc xác thực phiên Chủ nhân qua Bearer Token / PSK / Desktop Token
                const rawAuth = req.headers['authorization'] || req.headers['x-auth-token'];
                let authToken;
                if (typeof rawAuth === 'string') {
                    authToken = rawAuth.startsWith('Bearer ') ? rawAuth.slice(7).trim() : rawAuth.trim();
                }
                const isAuthorized = Boolean(authToken && (validateBodyPsk(authToken) || isDesktopAuthValid(authToken)));
                if (!isAuthorized) {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        error: 'UNAUTHORIZED',
                        message: 'Missing or invalid authentication token for /api/body/command.',
                        correlationId,
                    }));
                    return;
                }
                // 3. Phân tích body và đánh giá chính sách qua PDP (Policy Decision Point)
                try {
                    const body = await parseJsonBody();
                    const capability = String(body.capability || '').trim();
                    // Kiểm tra qua PDP — tuyệt đối không tạo đường tắt xuống BodyRegistry
                    const pdpDecision = globalPDP.evaluate({
                        toolName: capability,
                        args: body.params || {},
                        actor: { userId: 'owner', role: 'owner', isOwner: true, channel: 'BODY_COMMAND_API' },
                        executionToken: body.executionToken,
                        consumeToken: true,
                    });
                    if (!pdpDecision.allowed) {
                        res.writeHead(403, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            error: 'POLICY_DENIED',
                            reason: pdpDecision.reason,
                            classification: pdpDecision.classification,
                            requiresApproval: pdpDecision.requiresApproval,
                            approvalId: pdpDecision.approvalId,
                            correlationId,
                        }));
                        return;
                    }
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
                }
                catch (err) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: err?.message || 'Invalid JSON body', correlationId }));
                }
                return;
            }
            // 17. Voice Benchmark Lab Static Web UI
            if (url.pathname.startsWith('/voice-lab') && (req.method === 'GET' || req.method === 'HEAD')) {
                const subPath = url.pathname.replace(/^\/voice-lab\/?/, '') || 'index.html';
                const fullPath = path.resolve('artifacts/voice-benchmark', subPath);
                const baseDir = path.resolve('artifacts/voice-benchmark');
                if (fullPath.toLowerCase().startsWith(baseDir.toLowerCase()) && fs.existsSync(fullPath) && !fs.statSync(fullPath).isDirectory()) {
                    const ext = path.extname(fullPath).toLowerCase();
                    const mimeTypes = {
                        '.html': 'text/html; charset=utf-8',
                        '.wav': 'audio/wav',
                        '.css': 'text/css',
                        '.js': 'application/javascript',
                        '.json': 'application/json',
                    };
                    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
                    fs.createReadStream(fullPath).pipe(res);
                    return;
                }
            }
            // 18. Voice Pipeline End-to-End Roundtrip Endpoint
            if (url.pathname === '/api/voice/roundtrip' && req.method === 'POST') {
                try {
                    const body = await parseJsonBody();
                    const result = await globalVoicePipeline.executeVoiceRoundtrip({
                        ...body,
                        correlationId,
                    });
                    res.writeHead(result.success ? 200 : 500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ ...result, correlationId }));
                }
                catch (err) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: err?.message || 'Voice roundtrip failed', correlationId }));
                }
                return;
            }
            // 404
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Endpoint not found', correlationId }));
        };
        if (this.tlsEnabled) {
            const { serverCertPath, serverKeyPath } = ensureTlsCertificates({ hosts: [this.host] });
            const tlsOptions = {
                key: fs.readFileSync(serverKeyPath),
                cert: fs.readFileSync(serverCertPath),
            };
            this.server = https.createServer(tlsOptions, requestHandler);
        }
        else {
            this.server = http.createServer(requestHandler);
        }
        // WebSocket Gateway Server
        this.wss = new WebSocketServer({
            server: this.server,
            verifyClient: (info, done) => {
                const origin = info.origin || (typeof info.req.headers.origin === 'string' ? info.req.headers.origin : '');
                if (origin && !globalRequestGuard.isOriginAllowed(origin)) {
                    return done(false, 403, 'Forbidden Origin');
                }
                const clientIp = info.req.headers['x-forwarded-for']?.split(',')[0]?.trim() || info.req.socket.remoteAddress || '127.0.0.1';
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
                    let bearerToken;
                    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
                        bearerToken = authHeader.slice(7).trim();
                    }
                    else {
                        const queryToken = url.searchParams.get('token') || url.searchParams.get('psk');
                        if (typeof queryToken === 'string' && queryToken.trim().length > 0) {
                            bearerToken = queryToken.trim();
                        }
                    }
                    if (!bearerToken || !validateBodyPsk(bearerToken)) {
                        console.warn(`[BOW-SERVER] ⚠️ TỪ CHỐI kết nối /ws/body (401 Unauthorized): Thiếu hoặc sai Pre-Shared Key (PSK) từ IP: ${clientIp}`);
                        return done(false, 401, 'Unauthorized');
                    }
                    return done(true);
                }
                // Route: /ws/robot và /ws/audio-stream
                // Bắt buộc xác thực x-robot-secret VÔ ĐIỀU KIỆN (Loại bỏ hoàn toàn mọi bypass theo environment)
                const robotPath = path.includes('robot') || path.includes('audio-stream');
                if (robotPath) {
                    const robotSecret = info.req.headers['x-robot-secret'] || url.searchParams.get('secret') || url.searchParams.get('token');
                    const isSecretProvided = typeof robotSecret === 'string' && robotSecret.trim().length > 0;
                    if (!isSecretProvided || !isRobotSecretValid(robotSecret)) {
                        console.warn(`[BOW-SERVER] ⚠️ TỪ CHỐI kết nối robot/audio-stream (401 Unauthorized): Thiếu hoặc sai Robot Secret từ IP: ${clientIp}`);
                        return done(false, 401, 'Unauthorized');
                    }
                    return done(true);
                }
                // Route: /ws/desktop
                // Bắt buộc xác thực Desktop Token VÔ ĐIỀU KIỆN
                const desktopPath = path.includes('desktop');
                if (desktopPath) {
                    const desktopToken = info.req.headers['x-auth-token'] || info.req.headers.authorization?.replace(/^Bearer\s+/i, '') || url.searchParams.get('token');
                    const isTokenProvided = typeof desktopToken === 'string' && desktopToken.trim().length > 0;
                    if (!isTokenProvided || !isDesktopAuthValid(desktopToken)) {
                        console.warn(`[BOW-SERVER] ⚠️ TỪ CHỐI kết nối desktop (401 Unauthorized): Thiếu hoặc sai Desktop Token từ IP: ${clientIp}`);
                        return done(false, 401, 'Unauthorized');
                    }
                    return done(true);
                }
                // Route: /ws/web (Kênh chat web public của shop)
                const webPath = path.includes('web') || path === '/ws' || path === '/';
                if (webPath) {
                    return done(true);
                }
                // Mọi route lạ khác đều bị từ chối 404 thay vì cho qua
                return done(false, 404, 'Not Found');
            },
        });
        this.wss.on('connection', (ws, req) => {
            const pathname = req.url ? new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname : '/';
            const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
            const isRobotConnection = pathname.includes('robot') || pathname.includes('audio-stream');
            const isDesktopConnection = pathname.includes('desktop');
            const isBodyConnection = pathname.includes('body');
            console.log(`[BOW-SERVER] WebSocket client connected on path: ${pathname} from IP: ${clientIp}`);
            let connectedBodyId;
            // NOTE: pendingCommandResolvers đã được chuyển vào globalBodyRegistry.pendingCommands.
            // Không còn quản lý tại closure này nữa — mọi Body type đều dùng chung điểm trung tâm.
            // Nếu client kết nối từ Robot hoặc Audio Stream, đăng ký nhận các sự kiện chủ động và lệnh ngắt (robot.interrupt)
            let unregisterRobotListener;
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
                        if (!isRobotConnection)
                            throw new Error('BINARY_AUDIO_REQUIRES_ROBOT_CHANNEL');
                        const result = robotChannelAdapter.handleStreamingAudioChunk(data);
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
                        const sender = {
                            sendCommand: async (command) => {
                                return new Promise((resolve, reject) => {
                                    const timeoutMs = command.timeoutMs || BODY_CONFIG.commandTimeoutMs;
                                    const timeoutHandle = setTimeout(() => {
                                        // Timeout: xóa khỏi registry trước khi resolve để tránh double-call
                                        const hadEntry = globalBodyRegistry.resolvePendingCommand(command.commandId, {
                                            commandId: command.commandId,
                                            success: false,
                                            error: `COMMAND_TIMEOUT: Body command execution timed out after ${timeoutMs}ms.`,
                                        });
                                        if (!hadEntry) {
                                            // Đã được failPendingCommandsForBody() xử lý trước — không làm gì thêm
                                        }
                                    }, timeoutMs);
                                    // Đăng ký vào registry trung tâm (thay cho pendingCommandResolvers local)
                                    globalBodyRegistry.registerPendingCommand(command.commandId, connectedBodyId || command.bodyId || 'unknown', resolve, reject, timeoutHandle);
                                    if (ws.readyState === WebSocket.OPEN) {
                                        ws.send(JSON.stringify({
                                            type: 'body.command',
                                            command,
                                        }));
                                    }
                                    else {
                                        // Socket đã đóng ngay tại thời điểm gửi — fail ngay lập tức
                                        globalBodyRegistry.resolvePendingCommand(command.commandId, {
                                            commandId: command.commandId,
                                            success: false,
                                            error: 'BODY_SOCKET_CLOSED: WebSocket connection to body is not open.',
                                        });
                                    }
                                });
                            },
                            isAlive: () => ws.readyState === WebSocket.OPEN,
                            close: (reason) => {
                                try {
                                    ws.close(1000, reason);
                                }
                                catch {
                                    // Ignore
                                }
                            },
                        };
                        globalBodyRegistry.registerBody(ad, sender);
                        console.log(`[BOW-SERVER] ✓ Body registered successfully: ${ad.bodyId} (${ad.bodyType}) from IP: ${clientIp} with capabilities: [${ad.capabilities.map((c) => c.name).join(', ')}]`);
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
                        const res = payload.result;
                        if (res && res.commandId) {
                            // Dùng registry trung tâm thay vì pendingCommandResolvers local
                            globalBodyRegistry.resolvePendingCommand(res.commandId, res);
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
                        if (!isRobotConnection)
                            throw new Error('AUDIO_REQUIRES_ROBOT_CHANNEL');
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
                    // Voice Pipeline Roundtrip over WebSocket
                    if (payload.type === 'voice.roundtrip' || payload.type === 'voice.turn' || payload.type === 'body.voice_turn') {
                        const voiceRes = await globalVoicePipeline.executeVoiceRoundtrip({
                            bodyId: connectedBodyId || payload.bodyId,
                            sessionId: payload.sessionId,
                            userId: payload.userId,
                            role: payload.role,
                            isOwner: payload.isOwner,
                            correlationId: payload.correlationId,
                            audioBufferOverride: payload.audioBase64 ? Buffer.from(payload.audioBase64, 'base64') : undefined,
                            simulatedTranscript: payload.text,
                        });
                        ws.send(JSON.stringify({
                            type: 'voice.roundtrip_result',
                            requestId: payload.requestId,
                            ...voiceRes,
                        }));
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
                }
                catch (err) {
                    ws.send(JSON.stringify({
                        type: 'agent.error',
                        error: err?.message || 'Invalid payload',
                        timestamp: new Date().toISOString(),
                    }));
                }
            });
            ws.on('close', () => {
                // failPendingCommandsForBody() được gọi TỰ ĐỘNG bên trong unregisterBody().
                // Không cần vòng lặp thủ công ở đây nữa — đây là điểm cải thiện cốt lõi:
                // mọi body type đều được hưởng lợi từ một điểm fix duy nhất tại BodyRegistry.
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
            this.server.listen(this.port, this.host, () => {
                this.isRunning = true;
                const proto = this.tlsEnabled ? 'https' : 'http';
                const mode = this.tlsEnabled ? 'TLS/WSS Enforced' : 'Plain HTTP/WS (Tailscale Mesh VPN)';
                console.log(`[BOW-SERVER] Central Autonomous Brain listening on ${proto}://${this.host}:${this.port} (${mode})`);
                resolve();
            });
            this.server.on('error', reject);
        });
    }
    async stop() {
        if (!this.isRunning)
            return;
        return new Promise((resolve) => {
            if (this.wss) {
                for (const client of this.wss.clients) {
                    try {
                        client.terminate();
                    }
                    catch { }
                }
                this.wss.close(() => {
                    if (this.server) {
                        this.server.close(() => {
                            this.isRunning = false;
                            resolve();
                        });
                    }
                    else {
                        this.isRunning = false;
                        resolve();
                    }
                });
            }
            else if (this.server) {
                this.server.close(() => {
                    this.isRunning = false;
                    resolve();
                });
            }
            else {
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
