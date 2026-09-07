// src/core/remote/remoteGateway.ts
// BOWCON V4.0 — MILESTONE 1.3.20: AUTHORITATIVE SECURE REMOTE GATEWAY
//
// EN:
// Authoritative RemoteGateway coordinator.
// Manages peer registration, pure-data handshake negotiation, authentication boundaries,
// authorization validation, capability enforcement, remote sessions, sequence ordering,
// replay defense, and data-only rate limiting.
//
// STRICT BOUNDARIES:
// - ZERO Network I/O (pure data/protocol foundation)
// - ZERO Tool execution, LLM calls, shell execution
// - ZERO Governance / PDP / Approval / Idempotency mutation
// - ZERO Verification / Commit / Recovery / Synchronization usurpation
// - AUTHENTICATED ≠ AUTHORIZED; AUTHORIZED ≠ EXECUTED; DELIVERED ≠ SUCCEEDED
//
// VI:
// Điều phối viên Cổng từ xa có thẩm quyền.
// Quản lý đăng ký máy khách, đàm phán bắt tay, ranh giới xác thực, phân quyền,
// phiên từ xa, thứ tự chuỗi, chống phát lại và giới hạn lưu lượng.

import type {
  RemoteGatewayIdentity,
  RemotePeerIdentity,
  RemoteHandshake,
  RemoteHandshakeResult,
  RemoteRequest,
  RemoteResponse,
  RemoteGatewayContract,
} from './remoteTypes.js';
import {
  createRemoteGatewayIdentity,
} from './remoteIdentity.js';
import type { RemoteSessionSnapshot } from './remoteSession.js';
import {
  createRemoteSessionSnapshot,
  updateRemoteSessionSnapshot,
} from './remoteSession.js';
import { evaluateRemoteHandshake } from './remoteHandshake.js';
import { evaluateRemoteAuthentication } from './remoteAuthentication.js';
import { createRemoteAuthorizationContext } from './remoteAuthorization.js';
import { negotiateRemoteCapabilities } from './remoteCapabilities.js';
import { analyzeRemoteReplay } from './remoteReplay.js';
import { analyzeRemoteSequence } from './remoteSequence.js';
import {
  computeRemoteRateMetrics,
  canAcceptRemoteRequest,
} from './remoteRateLimit.js';
import type { RemoteAuditRecord } from './remoteAudit.js';
import { createRemoteAuditRecord } from './remoteAudit.js';
import {
  deepFreeze,
  assertRemoteRiskPreservation,
  validateRemotePayloadBounds,
} from './remoteValidator.js';
import { fnv1aHex } from './remoteFingerprint.js';

export interface RemoteGatewayOptions {
  readonly name?: string;
  readonly version?: string;
  readonly maxCapacity?: number;
}

export class RemoteGateway implements RemoteGatewayContract {
  public readonly identity: Readonly<RemoteGatewayIdentity>;
  public readonly gatewayId: string;
  private readonly maxCapacity: number;

  private readonly peers = new Map<string, Readonly<RemotePeerIdentity>>();
  private readonly sessions = new Map<string, Readonly<RemoteSessionSnapshot>>();
  private readonly requestsById = new Map<string, Readonly<RemoteRequest>>();
  private readonly requestsBySessionSeq = new Map<string, Map<number, Readonly<RemoteRequest>>>();
  private readonly audits: Array<Readonly<RemoteAuditRecord>> = [];

  constructor(options?: RemoteGatewayOptions) {
    const name = options?.name ?? 'BOW_CENTRAL_REMOTE_GATEWAY';
    const version = options?.version ?? '1.0.0';
    this.maxCapacity = options?.maxCapacity ?? 1000;

    this.identity = createRemoteGatewayIdentity({
      name,
      version,
      supportedProtocols: ['1.0.0'],
    });
    this.gatewayId = this.identity.gatewayId;
  }

  /**
   * EN: Registers an external remote peer identity.
   * VI: Đăng ký một định danh máy khách từ xa bên ngoài.
   */
  public async registerPeer(
    peer: Readonly<RemotePeerIdentity>,
  ): Promise<{ success: boolean; peerId: string; error?: string }> {
    this.peers.set(peer.peerId, peer);

    this.recordAudit({
      eventType: 'PEER_REGISTERED',
      peerId: peer.peerId,
      outcome: 'SUCCESS',
      details: `Registered peer ${peer.peerId} (${peer.surfaceType})`,
    });

    return { success: true, peerId: peer.peerId };
  }

  /**
   * EN: Retrieves registered peer identity by peerId.
   * VI: Lấy định danh máy khách đã đăng ký theo peerId.
   */
  public getPeer(peerId: string): Readonly<RemotePeerIdentity> | undefined {
    return this.peers.get(peerId);
  }

  /**
   * EN: Handles pure-data handshake negotiation with an incoming peer.
   * VI: Xử lý đàm phán bắt tay thuần dữ liệu với máy khách đến.
   */
  public async handleHandshake(
    handshake: Readonly<RemoteHandshake>,
  ): Promise<Readonly<RemoteHandshakeResult>> {
    // 1. Evaluate basic handshake against gateway identity and capabilities
    const result = evaluateRemoteHandshake(handshake, this.identity, handshake.timestamp);
    if (!result.success || !result.remoteSessionId) {
      this.recordAudit({
        eventType: 'HANDSHAKE_REJECTED',
        peerId: handshake.peerId,
        outcome: 'REJECTED',
        details: result.failureReason ?? 'Handshake evaluation failed',
      });
      return result;
    }

    // 2. Evaluate authentication token
    const authResult = evaluateRemoteAuthentication(handshake.authToken);
    if (!authResult.authenticated) {
      const reason = authResult.error ?? 'Authentication failed.';
      const fp = fnv1aHex(`${handshake.handshakeId}::AUTH_FAILED::${reason}`);
      this.recordAudit({
        eventType: 'AUTHENTICATION_FAILED',
        peerId: handshake.peerId,
        outcome: 'FAILURE',
        details: reason,
      });
      return deepFreeze({
        handshakeId: handshake.handshakeId,
        success: false,
        failureCode: 'AUTHENTICATION_FAILED',
        failureReason: reason,
        timestamp: handshake.timestamp,
        fingerprint: fp,
      });
    }

    // 3. Negotiate capabilities (strictly rejecting any forbidden cognitive/execution capabilities)
    const capResult = negotiateRemoteCapabilities(handshake.requestedCapabilities);
    if (!capResult.success) {
      const reason = capResult.error ?? 'Capability negotiation failed.';
      const fp = fnv1aHex(`${handshake.handshakeId}::CAP_FAILED::${reason}`);
      this.recordAudit({
        eventType: 'CAPABILITY_DENIED',
        peerId: handshake.peerId,
        outcome: 'REJECTED',
        details: reason,
      });
      return deepFreeze({
        handshakeId: handshake.handshakeId,
        success: false,
        failureCode: capResult.failureCode ?? 'CAPABILITY_DENIED',
        failureReason: reason,
        timestamp: handshake.timestamp,
        fingerprint: fp,
      });
    }

    // 4. Create authorization context (AUTHENTICATED ≠ AUTHORIZED)
    const scopeKey = `${handshake.scope.userId}::${handshake.scope.sessionId}::${handshake.scope.brainId}::${handshake.scope.surfaceId}::${handshake.scope.transportId}::${handshake.scope.gatewayId}`;
    const authContext = createRemoteAuthorizationContext({
      peerId: handshake.peerId,
      remoteSessionId: result.remoteSessionId,
      scopeKey,
      isAuthenticated: true,
      authorizedCapabilities: capResult.grantedCapabilities,
      riskLevel: handshake.riskLevel,
      timestamp: handshake.timestamp,
    });

    // 5. Initialize remote session
    const session = createRemoteSessionSnapshot({
      gatewayId: this.gatewayId,
      peerId: handshake.peerId,
      scope: handshake.scope,
      protocolVersion: result.negotiatedProtocolVersion ?? '1.0.0',
      capabilities: capResult.grantedCapabilities,
      initialState: 'ESTABLISHED',
      authState: 'AUTHENTICATED',
      authContext,
      initialSequence: 0,
      timestamp: handshake.timestamp,
    });

    this.sessions.set(result.remoteSessionId, session);
    this.requestsBySessionSeq.set(result.remoteSessionId, new Map());

    this.recordAudit({
      eventType: 'SESSION_ESTABLISHED',
      peerId: handshake.peerId,
      remoteSessionId: result.remoteSessionId,
      outcome: 'SUCCESS',
      details: `Established remote session for scope ${scopeKey}`,
    });

    return result;
  }

  /**
   * EN: Handles an incoming protocol request from a remote peer.
   * Enforces session active check, rate limit, replay protection, sequence ordering, and authorization.
   *
   * VI: Xử lý yêu cầu giao thức đến từ một máy khách từ xa.
   * Thực thi kiểm tra phiên hoạt động, giới hạn tốc độ, chống phát lại, thứ tự chuỗi và phân quyền.
   */
  public async handleRequest(
    request: Readonly<RemoteRequest>,
  ): Promise<Readonly<RemoteResponse>> {
    const session = this.sessions.get(request.remoteSessionId);
    if (!session) {
      return deepFreeze({
        responseId: `res_${fnv1aHex(request.requestId + '::NO_SESSION')}`,
        requestId: request.requestId,
        remoteSessionId: request.remoteSessionId,
        status: 'FAILURE',
        error: `Remote session "${request.remoteSessionId}" not found.`,
        timestamp: request.timestamp,
        fingerprint: fnv1aHex(`${request.requestId}::FAILURE`),
      });
    }

    // Validate resource bounds
    validateRemotePayloadBounds(request.payload);

    // Rate limit check
    const rateMetrics = computeRemoteRateMetrics({
      requestCount: session.pendingCount + (this.requestsBySessionSeq.get(request.remoteSessionId)?.size ?? 0),
      maxCapacity: this.maxCapacity,
    });
    if (!canAcceptRemoteRequest(rateMetrics)) {
      this.recordAudit({
        eventType: 'RATE_LIMITED',
        remoteSessionId: request.remoteSessionId,
        outcome: 'REJECTED',
        details: `Request rejected due to rate pressure ${rateMetrics.pressureLevel}`,
      });
      return deepFreeze({
        responseId: `res_${fnv1aHex(request.requestId + '::RATE_LIMITED')}`,
        requestId: request.requestId,
        remoteSessionId: request.remoteSessionId,
        status: 'RATE_LIMITED',
        error: `Request rejected: gateway is in ${rateMetrics.pressureLevel} state.`,
        timestamp: request.timestamp,
        fingerprint: fnv1aHex(`${request.requestId}::RATE_LIMITED`),
      });
    }

    const seqMap = this.requestsBySessionSeq.get(request.remoteSessionId) ?? new Map();

    // Replay analysis
    const replayAnalysis = analyzeRemoteReplay(
      seqMap,
      this.requestsById,
      request,
      session.remoteSessionId,
    );

    if (replayAnalysis.classification === 'CROSS_SCOPE_REJECTED') {
      return deepFreeze({
        responseId: `res_${fnv1aHex(request.requestId + '::CROSS_SCOPE')}`,
        requestId: request.requestId,
        remoteSessionId: request.remoteSessionId,
        status: 'REJECTED',
        error: replayAnalysis.reason,
        timestamp: request.timestamp,
        fingerprint: fnv1aHex(`${request.requestId}::CROSS_SCOPE`),
      });
    }

    if (replayAnalysis.classification === 'REPLAY_CONFLICT') {
      return deepFreeze({
        responseId: `res_${fnv1aHex(request.requestId + '::CONFLICT')}`,
        requestId: request.requestId,
        remoteSessionId: request.remoteSessionId,
        status: 'REJECTED',
        error: replayAnalysis.reason,
        timestamp: request.timestamp,
        fingerprint: fnv1aHex(`${request.requestId}::REPLAY_CONFLICT`),
      });
    }

    if (replayAnalysis.classification === 'IDEMPOTENT_DUPLICATE') {
      return deepFreeze({
        responseId: `res_${fnv1aHex(request.requestId + '::IDEMPOTENT')}`,
        requestId: request.requestId,
        remoteSessionId: request.remoteSessionId,
        status: 'SUCCESS',
        payload: { idempotentReplay: true },
        timestamp: request.timestamp,
        fingerprint: fnv1aHex(`${request.requestId}::IDEMPOTENT`),
      });
    }

    // Sequence analysis
    const seqAnalysis = analyzeRemoteSequence(session.lastSequence, request.sequence);
    if (seqAnalysis.status === 'STALE_SEQUENCE') {
      return deepFreeze({
        responseId: `res_${fnv1aHex(request.requestId + '::STALE')}`,
        requestId: request.requestId,
        remoteSessionId: request.remoteSessionId,
        status: 'REJECTED',
        error: `Stale sequence: ${request.sequence} <= ${session.lastSequence}.`,
        timestamp: request.timestamp,
        fingerprint: fnv1aHex(`${request.requestId}::STALE`),
      });
    }

    if (seqAnalysis.status === 'SEQUENCE_GAP') {
      return deepFreeze({
        responseId: `res_${fnv1aHex(request.requestId + '::GAP')}`,
        requestId: request.requestId,
        remoteSessionId: request.remoteSessionId,
        status: 'REJECTED',
        error: `Sequence gap detected: got ${request.sequence}, expected ${seqAnalysis.expectedSequence}.`,
        timestamp: request.timestamp,
        fingerprint: fnv1aHex(`${request.requestId}::GAP`),
      });
    }

    if (seqAnalysis.status === 'INVALID_SEQUENCE') {
      return deepFreeze({
        responseId: `res_${fnv1aHex(request.requestId + '::INVALID_SEQ')}`,
        requestId: request.requestId,
        remoteSessionId: request.remoteSessionId,
        status: 'FAILURE',
        error: seqAnalysis.reason ?? 'Invalid sequence number.',
        timestamp: request.timestamp,
        fingerprint: fnv1aHex(`${request.requestId}::INVALID_SEQ`),
      });
    }

    // Monotonic risk preservation check
    if (request.riskLevel && session.authContext?.riskLevel) {
      assertRemoteRiskPreservation(session.authContext.riskLevel, request.riskLevel);
    }

    // Store request in history
    this.requestsById.set(request.requestId, request);
    seqMap.set(request.sequence, request);
    this.requestsBySessionSeq.set(request.remoteSessionId, seqMap);

    // Update session snapshot with new sequence
    this.sessions.set(
      request.remoteSessionId,
      updateRemoteSessionSnapshot(session, {
        lastSequence: request.sequence,
        timestamp: request.timestamp,
      }),
    );

    const fp = fnv1aHex(`${request.requestId}::SUCCESS`);
    const response: RemoteResponse = {
      responseId: `res_${fp}`,
      requestId: request.requestId,
      remoteSessionId: request.remoteSessionId,
      status: 'SUCCESS',
      payload: { accepted: true, action: request.action },
      timestamp: request.timestamp,
      fingerprint: fp,
    };

    this.recordAudit({
      eventType: 'REQUEST_ACCEPTED',
      remoteSessionId: request.remoteSessionId,
      outcome: 'SUCCESS',
      details: `Accepted in-order request "${request.action}" at seq ${request.sequence}`,
    });

    return deepFreeze(response);
  }

  /**
   * EN: Retrieves remote session snapshot by remoteSessionId.
   * VI: Lấy snapshot phiên từ xa theo remoteSessionId.
   */
  public getSession(remoteSessionId: string): Readonly<RemoteSessionSnapshot> | undefined {
    return this.sessions.get(remoteSessionId);
  }

  /**
   * EN: Retrieves all registered remote sessions.
   * VI: Lấy tất cả các phiên làm việc từ xa đã đăng ký.
   */
  public getActiveSessions(): ReadonlyArray<Readonly<RemoteSessionSnapshot>> {
    return deepFreeze(Array.from(this.sessions.values()));
  }

  /**
   * EN: Disconnects a remote session cleanly without shutting down the Brain.
   * VI: Ngắt kết nối phiên từ xa một cách sạch sẽ mà không làm tắt Não bộ.
   */
  public disconnectSession(remoteSessionId: string, reason?: string): boolean {
    const session = this.sessions.get(remoteSessionId);
    if (!session) return false;

    this.sessions.set(
      remoteSessionId,
      updateRemoteSessionSnapshot(session, {
        sessionState: 'CLOSED',
      }),
    );

    this.recordAudit({
      eventType: 'SESSION_DISCONNECTED',
      remoteSessionId,
      outcome: 'SUCCESS',
      details: reason ?? 'Peer disconnected',
    });

    return true;
  }

  /**
   * EN: Reconnects an existing remote session preserving sequence and continuity.
   * VI: Kết nối lại một phiên từ xa hiện có bảo toàn số thứ tự và tính liên tục.
   */
  public reconnectSession(
    remoteSessionId: string,
    lastAckSequence: number,
  ): { success: boolean; session?: Readonly<RemoteSessionSnapshot>; error?: string } {
    const session = this.sessions.get(remoteSessionId);
    if (!session) {
      return { success: false, error: `Session "${remoteSessionId}" not found.` };
    }

    if (lastAckSequence > session.lastSequence) {
      return {
        success: false,
        error: `Sequence error: requested ack ${lastAckSequence} > last known sequence ${session.lastSequence}.`,
      };
    }

    const updated = updateRemoteSessionSnapshot(session, {
      sessionState: 'ACTIVE',
      reconnectCount: session.reconnectCount + 1,
      lastAcknowledgedSequence: lastAckSequence,
    });
    this.sessions.set(remoteSessionId, updated);

    this.recordAudit({
      eventType: 'SESSION_RECONNECTED',
      remoteSessionId,
      outcome: 'SUCCESS',
      details: `Reconnected session at sequence ${lastAckSequence}`,
    });

    return { success: true, session: updated };
  }

  /**
   * EN: Returns immutable audit records.
   * VI: Trả về danh sách bản ghi kiểm tra bất biến.
   */
  public getAuditRecords(): ReadonlyArray<Readonly<RemoteAuditRecord>> {
    return deepFreeze(this.audits);
  }

  private recordAudit(params: {
    readonly eventType: string;
    readonly peerId?: string;
    readonly remoteSessionId?: string;
    readonly outcome: 'SUCCESS' | 'FAILURE' | 'REJECTED';
    readonly details?: string;
    readonly timestamp?: number;
  }): void {
    const audit = createRemoteAuditRecord({
      eventType: params.eventType,
      gatewayId: this.gatewayId,
      peerId: params.peerId,
      remoteSessionId: params.remoteSessionId,
      outcome: params.outcome,
      details: params.details,
      timestamp: params.timestamp,
    });
    this.audits.push(audit);
  }
}
