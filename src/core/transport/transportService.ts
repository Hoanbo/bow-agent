// src/core/transport/transportService.ts
// BOWCON V4.0 — MILESTONE 1.3.19: AUTHORITATIVE BRAIN TRANSPORT SERVICE
//
// EN:
// Authoritative TransportService coordinating message envelopes, connection lifecycles,
// sessions, delivery states, ACK/NACK semantics, heartbeats, replay defense, and backpressure.
//
// STRICT BOUNDARIES:
// - ZERO Network I/O (pure contracts and in-memory delivery foundation)
// - ZERO Tool execution, LLM calls, shell commands
// - ZERO Governance / PDP / Approval / Idempotency mutation
// - ZERO Verification / Commit / Recovery / Synchronization usurpation
// - ACK != task success; DELIVERED != verification success
//
// VI:
// Dịch vụ truyền tải có thẩm quyền điều phối phong bì thông điệp, vòng đời kết nối,
// phiên làm việc, trạng thái phân phối, ngữ nghĩa ACK/NACK, heartbeat, chống phát lại và áp lực ngược.

import type {
  BrainTransportMessage,
  CreateTransportMessageParams,
  TransportFailureCode,
  TransportGatewayContract,
} from './transportTypes.js';
import type {
  TransportConnectionState,
} from './transportStates.js';
import {
  isConnectionActive,
} from './transportStates.js';
import type {
  ScopedTransportIdentity,
} from './transportIdentity.js';
import {
  createConnectionIdentity,
  assertScopeMatches,
} from './transportIdentity.js';
import type {
  TransportConnectionRecord,
} from './transportConnection.js';
import {
  createTransportConnection,
  transitionConnection,
} from './transportConnection.js';
import type {
  TransportSessionSnapshot,
} from './transportSession.js';
import {
  createTransportSessionSnapshot,
  updateTransportSessionSnapshot,
} from './transportSession.js';
import {
  createTransportMessageEnvelope,
} from './transportEnvelope.js';
import {
  analyzeMessageSequence,
} from './transportOrdering.js';
import {
  analyzeReplay,
} from './transportReplay.js';
import type {
  TransportDeliveryRecord,
} from './transportDelivery.js';
import {
  createDeliveryRecord,
  transitionDelivery,
} from './transportDelivery.js';
import type {
  TransportAckRecord,
  TransportNackRecord,
  AckClassification,
} from './transportAck.js';
import {
  createTransportAck,
  createTransportNack,
} from './transportAck.js';
import type {
  HeartbeatSignal,
  HeartbeatAck,
} from './transportHeartbeat.js';
import {
  createHeartbeatSignal,
  createHeartbeatAck,
} from './transportHeartbeat.js';
import type {
  ResumeResult,
} from './transportReconnect.js';
import {
  createResumeRequest,
  validateResumeRequest,
} from './transportReconnect.js';
import type {
  TransportBackpressureMetrics,
} from './transportBackpressure.js';
import {
  computeBackpressureMetrics,
  canEnqueueMessage,
} from './transportBackpressure.js';
import type {
  TransportCheckpoint,
} from './transportCheckpoint.js';
import {
  createTransportCheckpoint,
} from './transportCheckpoint.js';
import type {
  TransportAuditRecord,
} from './transportResult.js';
import {
  createTransportAuditRecord,
} from './transportResult.js';
import {
  deepFreeze,
  MAX_QUEUE_DEPTH,
  assertTransportRiskPreservation,
} from './transportValidator.js';

export interface TransportServiceOptions {
  readonly maxQueueDepth?: number;
  readonly defaultBrainId?: string;
}

export class TransportService implements TransportGatewayContract {
  private readonly maxQueueDepth: number;
  private readonly connections = new Map<string, Readonly<TransportConnectionRecord>>();
  private readonly sessions = new Map<string, Readonly<TransportSessionSnapshot>>();
  private readonly messagesById = new Map<string, Readonly<BrainTransportMessage>>();
  private readonly messagesByConnectionSeq = new Map<string, Map<number, Readonly<BrainTransportMessage>>>();
  private readonly deliveries = new Map<string, Readonly<TransportDeliveryRecord>>();
  private readonly queues = new Map<string, string[]>(); // connectionId -> array of messageIds
  private readonly audits: Array<Readonly<TransportAuditRecord>> = [];
  private readonly heartbeats = new Map<string, Readonly<HeartbeatSignal>>();
  private heartbeatSequenceCounter = new Map<string, number>();

  constructor(options?: TransportServiceOptions) {
    this.maxQueueDepth = options?.maxQueueDepth ?? MAX_QUEUE_DEPTH;
  }

  /**
   * EN: Registers a new scoped connection with DISCONNECTED or specified initial state.
   * VI: Đăng ký một kết nối có phạm vi mới với trạng thái DISCONNECTED hoặc trạng thái ban đầu được chỉ định.
   */
  public registerConnection(
    params: ScopedTransportIdentity,
    initialState: TransportConnectionState = 'CONNECTING',
    timestamp = 0,
  ): Readonly<TransportConnectionRecord> {
    const conn = createTransportConnection(params, initialState, timestamp);
    this.connections.set(conn.connectionId, conn);

    const session = createTransportSessionSnapshot({
      connection: conn,
      initialSequence: 0,
      timestamp,
    });
    this.sessions.set(conn.connectionId, session);
    this.queues.set(conn.connectionId, []);
    this.messagesByConnectionSeq.set(conn.connectionId, new Map());

    this.recordAudit({
      connectionId: conn.connectionId,
      action: 'CONNECT',
      outcome: 'SUCCESS',
      details: `Registered connection for scope ${conn.scopeKey} in state ${initialState}`,
      timestamp,
    });

    return conn;
  }

  /**
   * EN: Retrieves an immutable connection record by connectionId.
   * VI: Lấy bản ghi kết nối bất biến theo connectionId.
   */
  public getConnection(connectionId: string): Readonly<TransportConnectionRecord> | undefined {
    return this.connections.get(connectionId);
  }

  /**
   * EN: Transitions a connection's state following the strict transition matrix.
   * VI: Chuyển đổi trạng thái của một kết nối tuân theo ma trận chuyển đổi nghiêm ngặt.
   */
  public setConnectionState(
    connectionId: string,
    newState: TransportConnectionState,
    reason?: string,
    timestamp = 0,
  ): Readonly<TransportConnectionRecord> {
    const current = this.connections.get(connectionId);
    if (!current) {
      throw new Error(`[TRANSPORT_CONNECTION_ERROR] Connection "${connectionId}" not found.`);
    }

    const updated = transitionConnection(current, newState, reason, timestamp);
    this.connections.set(connectionId, updated);

    const session = this.sessions.get(connectionId);
    if (session) {
      this.sessions.set(
        connectionId,
        updateTransportSessionSnapshot(session, {
          connectionState: newState,
          disconnectReason: reason,
          timestamp,
        }),
      );
    }

    this.recordAudit({
      connectionId,
      action: newState === 'CLOSED' || newState === 'DISCONNECTED' ? 'DISCONNECT' : 'CONNECT',
      outcome: newState === 'FAILED' ? 'FAILURE' : 'SUCCESS',
      details: `Transitioned from ${current.state} to ${newState}: ${reason ?? 'no reason'}`,
      timestamp,
    });

    return updated;
  }

  /**
   * EN: Retrieves an immutable session snapshot by connectionId.
   * VI: Lấy snapshot phiên bất biến theo connectionId.
   */
  public getSession(connectionId: string): Readonly<TransportSessionSnapshot> | undefined {
    return this.sessions.get(connectionId);
  }

  /**
   * EN: Retrieves all registered session snapshots.
   * VI: Lấy danh sách tất cả các snapshot phiên đã đăng ký.
   */
  public getActiveSessions(): ReadonlyArray<Readonly<TransportSessionSnapshot>> {
    return deepFreeze(Array.from(this.sessions.values()));
  }

  /**
   * EN: Dispatches a message from Brain to a target connection/surface.
   * Enforces sequence, backpressure, risk monotonicity, and delivery state tracking.
   *
   * VI: Điều phối gửi thông điệp từ Não bộ đến một kết nối/bề mặt mục tiêu.
   * Thực thi số thứ tự, áp lực ngược, tính đơn điệu rủi ro và theo dõi trạng thái phân phối.
   */
  public dispatch(
    params: CreateTransportMessageParams,
  ): {
    readonly message: Readonly<BrainTransportMessage>;
    readonly delivery: Readonly<TransportDeliveryRecord>;
  } {
    const conn = this.connections.get(params.connectionId);
    if (!conn) {
      throw new Error(`[TRANSPORT_CONNECTION_ERROR] Connection "${params.connectionId}" not found.`);
    }

    // Monotonic risk check if prior message exists
    const seqMap = this.messagesByConnectionSeq.get(params.connectionId);
    if (seqMap && seqMap.size > 0 && params.riskLevel) {
      const highestPrior = Array.from(seqMap.values()).pop();
      if (highestPrior?.riskLevel) {
        assertTransportRiskPreservation(highestPrior.riskLevel, params.riskLevel);
      }
    }

    // Check backpressure capacity
    const metrics = this.getBackpressureMetrics(params.connectionId);
    if (!canEnqueueMessage(metrics)) {
      this.recordAudit({
        connectionId: params.connectionId,
        action: 'BACKPRESSURE',
        outcome: 'REJECTED',
        details: `Rejected dispatch due to backpressure state ${metrics.pressureLevel}`,
        timestamp: params.timestamp,
      });
      throw new Error(
        `[TRANSPORT_BACKPRESSURE_ERROR] Cannot dispatch message: backpressure is in ${metrics.pressureLevel} state.`,
      );
    }

    // Create validated envelope
    const envelope = createTransportMessageEnvelope(params);
    assertScopeMatches(conn.scopeKey, envelope);

    // Track delivery
    let delivery = createDeliveryRecord(envelope, params.timestamp);
    delivery = transitionDelivery(delivery, 'VALIDATED', { timestamp: params.timestamp });

    // Store in maps
    this.messagesById.set(envelope.messageId, envelope);
    if (!seqMap) {
      const newMap = new Map<number, Readonly<BrainTransportMessage>>();
      newMap.set(envelope.sequence, envelope);
      this.messagesByConnectionSeq.set(params.connectionId, newMap);
    } else {
      seqMap.set(envelope.sequence, envelope);
    }

    const queue = this.queues.get(params.connectionId) ?? [];
    queue.push(envelope.messageId);
    this.queues.set(params.connectionId, queue);

    delivery = transitionDelivery(delivery, 'QUEUED', { timestamp: params.timestamp });
    this.deliveries.set(envelope.messageId, delivery);

    // Update session snapshot
    const session = this.sessions.get(params.connectionId);
    if (session) {
      this.sessions.set(
        params.connectionId,
        updateTransportSessionSnapshot(session, {
          lastAcceptedSequence: Math.max(session.lastAcceptedSequence, envelope.sequence),
          pendingCount: queue.length,
          backpressureState: metrics.pressureLevel,
          timestamp: params.timestamp,
        }),
      );
    }

    this.recordAudit({
      connectionId: params.connectionId,
      messageId: envelope.messageId,
      action: 'DISPATCH',
      outcome: 'SUCCESS',
      details: `Dispatched message ${envelope.messageId} at seq ${envelope.sequence}`,
      timestamp: params.timestamp,
    });

    return { message: envelope, delivery };
  }

  /**
   * EN: Gateway dispatchMessage implementation (implements TransportGatewayContract).
   * VI: Triển khai gateway dispatchMessage (thực thi TransportGatewayContract).
   */
  public async dispatchMessage(message: BrainTransportMessage): Promise<boolean> {
    try {
      this.dispatch({
        brainId: message.brainId,
        userId: message.userId,
        sessionId: message.sessionId,
        surfaceId: message.surfaceId,
        transportId: message.transportId,
        connectionId: message.connectionId,
        correlationId: message.correlationId,
        causationId: message.causationId,
        eventId: message.eventId,
        messageType: message.messageType,
        direction: message.direction,
        sequence: message.sequence,
        payload: message.payload,
        riskLevel: message.riskLevel,
        governanceMetadata: message.governanceMetadata,
        lifecycleMetadata: message.lifecycleMetadata,
        timestamp: message.timestamp,
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * EN: Receives an incoming message from a surface.
   * Performs replay analysis, sequence analysis, scope isolation, and delivery tracking.
   *
   * VI: Nhận một thông điệp đến từ một bề mặt.
   * Thực hiện phân tích phát lại, phân tích chuỗi, cô lập phạm vi và theo dõi phân phối.
   */
  public receive(
    incoming: Readonly<BrainTransportMessage>,
    timestamp = 0,
  ): {
    readonly success: boolean;
    readonly ack?: Readonly<TransportAckRecord>;
    readonly nack?: Readonly<TransportNackRecord>;
    readonly delivery: Readonly<TransportDeliveryRecord>;
  } {
    const conn = this.connections.get(incoming.connectionId);
    let delivery = createDeliveryRecord(incoming, timestamp);

    if (!conn) {
      delivery = transitionDelivery(delivery, 'FAILED', {
        failureCode: 'CONNECTION_FAILURE',
        failureReason: `Connection "${incoming.connectionId}" not registered.`,
        timestamp,
      });
      const nack = createTransportNack({
        message: incoming,
        failureCode: 'CONNECTION_FAILURE',
        reason: `Connection "${incoming.connectionId}" not registered.`,
        timestamp,
      });
      return { success: false, nack, delivery };
    }

    const session = this.sessions.get(incoming.connectionId);
    const lastAcceptedSeq = session?.lastAcceptedSequence ?? 0;
    const seqMap = this.messagesByConnectionSeq.get(incoming.connectionId) ?? new Map();

    // Replay analysis
    const replayAnalysis = analyzeReplay(
      seqMap,
      this.messagesById,
      incoming,
      conn.scopeKey,
    );

    if (replayAnalysis.classification === 'CROSS_SCOPE_REJECTED') {
      delivery = transitionDelivery(delivery, 'REJECTED', {
        failureCode: 'INVALID_SCOPE',
        failureReason: replayAnalysis.reason,
        timestamp,
      });
      const nack = createTransportNack({
        message: incoming,
        failureCode: 'INVALID_SCOPE',
        reason: replayAnalysis.reason,
        timestamp,
      });
      this.recordAudit({
        connectionId: incoming.connectionId,
        messageId: incoming.messageId,
        action: 'RECEIVE',
        outcome: 'REJECTED',
        details: replayAnalysis.reason,
        timestamp,
      });
      return { success: false, nack, delivery };
    }

    if (replayAnalysis.classification === 'REPLAY_CONFLICT') {
      delivery = transitionDelivery(delivery, 'CONFLICTED', {
        failureCode: 'REPLAY_CONFLICT',
        failureReason: replayAnalysis.reason,
        timestamp,
      });
      const nack = createTransportNack({
        message: incoming,
        failureCode: 'REPLAY_CONFLICT',
        reason: replayAnalysis.reason,
        timestamp,
      });
      this.recordAudit({
        connectionId: incoming.connectionId,
        messageId: incoming.messageId,
        action: 'RECEIVE',
        outcome: 'FAILURE',
        details: replayAnalysis.reason,
        timestamp,
      });
      return { success: false, nack, delivery };
    }

    if (replayAnalysis.classification === 'IDEMPOTENT_DUPLICATE') {
      delivery = transitionDelivery(delivery, 'DUPLICATE', {
        failureCode: 'REPLAY_DETECTED',
        failureReason: replayAnalysis.reason,
        timestamp,
      });
      // Idempotent duplicate is acknowledged with PROCESSED (safe replay)
      const ack = createTransportAck({
        message: incoming,
        classification: 'PROCESSED',
        details: 'Idempotent replay accepted.',
        timestamp,
      });
      return { success: true, ack, delivery };
    }

    // Sequence analysis
    const seqAnalysis = analyzeMessageSequence(lastAcceptedSeq, incoming.sequence);
    if (seqAnalysis.status === 'STALE_SEQUENCE') {
      delivery = transitionDelivery(delivery, 'STALE', {
        failureCode: 'STALE_MESSAGE',
        failureReason: `Stale sequence: ${incoming.sequence} < ${lastAcceptedSeq}`,
        timestamp,
      });
      const nack = createTransportNack({
        message: incoming,
        failureCode: 'STALE_MESSAGE',
        reason: `Stale sequence: ${incoming.sequence}`,
        timestamp,
      });
      return { success: false, nack, delivery };
    }

    if (seqAnalysis.status === 'SEQUENCE_GAP') {
      delivery = transitionDelivery(delivery, 'REJECTED', {
        failureCode: 'SEQUENCE_GAP',
        failureReason: `Sequence gap detected: missing ${seqAnalysis.missingCount} messages.`,
        timestamp,
      });
      const nack = createTransportNack({
        message: incoming,
        failureCode: 'SEQUENCE_GAP',
        reason: `Sequence gap: got ${incoming.sequence}, expected ${seqAnalysis.expectedSequence}.`,
        timestamp,
      });
      return { success: false, nack, delivery };
    }

    if (seqAnalysis.status === 'INVALID_SEQUENCE') {
      delivery = transitionDelivery(delivery, 'FAILED', {
        failureCode: 'INVALID_SEQUENCE',
        failureReason: seqAnalysis.reason,
        timestamp,
      });
      const nack = createTransportNack({
        message: incoming,
        failureCode: 'INVALID_SEQUENCE',
        reason: seqAnalysis.reason,
        timestamp,
      });
      return { success: false, nack, delivery };
    }

    // In-order message accepted
    delivery = transitionDelivery(delivery, 'VALIDATED', { timestamp });
    delivery = transitionDelivery(delivery, 'DELIVERED', { timestamp });

    // Store in history
    this.messagesById.set(incoming.messageId, incoming);
    seqMap.set(incoming.sequence, incoming);
    this.messagesByConnectionSeq.set(incoming.connectionId, seqMap);

    // Create transport acknowledgement
    const ack = createTransportAck({
      message: incoming,
      classification: 'RECEIVED',
      details: 'Message validated and received in order.',
      timestamp,
    });

    delivery = transitionDelivery(delivery, 'ACKNOWLEDGED', { timestamp });
    this.deliveries.set(incoming.messageId, delivery);

    // Update session snapshot
    if (session) {
      this.sessions.set(
        incoming.connectionId,
        updateTransportSessionSnapshot(session, {
          lastAcceptedSequence: incoming.sequence,
          lastAcknowledgedSequence: incoming.sequence,
          timestamp,
        }),
      );
    }

    this.recordAudit({
      connectionId: incoming.connectionId,
      messageId: incoming.messageId,
      action: 'RECEIVE',
      outcome: 'SUCCESS',
      details: `Accepted in-order message ${incoming.messageId} at seq ${incoming.sequence}`,
      timestamp,
    });

    return { success: true, ack, delivery };
  }

  /**
   * EN: Gateway receiveMessage implementation (implements TransportGatewayContract).
   * VI: Triển khai gateway receiveMessage (thực thi TransportGatewayContract).
   */
  public async receiveMessage(message: BrainTransportMessage): Promise<boolean> {
    const res = this.receive(message);
    return res.success;
  }

  /**
   * EN: Explicitly acknowledges a message.
   * VI: Tường minh xác nhận một thông điệp.
   */
  public acknowledge(
    messageId: string,
    classification: AckClassification,
    details?: string,
    timestamp = 0,
  ): Readonly<TransportAckRecord> {
    const message = this.messagesById.get(messageId);
    if (!message) {
      throw new Error(`[TRANSPORT_ACK_ERROR] Message "${messageId}" not found for acknowledgement.`);
    }

    const ack = createTransportAck({
      message,
      classification,
      details,
      timestamp,
    });

    const delivery = this.deliveries.get(messageId);
    if (delivery && delivery.state !== 'ACKNOWLEDGED') {
      try {
        const nextDelivery = transitionDelivery(delivery, 'ACKNOWLEDGED', { timestamp });
        this.deliveries.set(messageId, nextDelivery);
      } catch {
        // Ignore if already in terminal state
      }
    }

    // Remove from queue
    const queue = this.queues.get(message.connectionId) ?? [];
    const filteredQueue = queue.filter(id => id !== messageId);
    this.queues.set(message.connectionId, filteredQueue);

    // Update session
    const session = this.sessions.get(message.connectionId);
    if (session) {
      this.sessions.set(
        message.connectionId,
        updateTransportSessionSnapshot(session, {
          lastAcknowledgedSequence: Math.max(session.lastAcknowledgedSequence, message.sequence),
          pendingCount: filteredQueue.length,
          timestamp,
        }),
      );
    }

    this.recordAudit({
      connectionId: message.connectionId,
      messageId,
      action: 'ACK',
      outcome: 'SUCCESS',
      details: `ACK ${classification} for msg ${messageId}`,
      timestamp,
    });

    return ack;
  }

  /**
   * EN: Explicitly negative-acknowledges a message with failure descriptor.
   * VI: Tường minh từ chối xác nhận (NACK) một thông điệp với bộ mô tả lỗi.
   */
  public negativeAcknowledge(
    messageId: string,
    failureCode: TransportFailureCode,
    reason: string,
    timestamp = 0,
  ): Readonly<TransportNackRecord> {
    const message = this.messagesById.get(messageId);
    if (!message) {
      throw new Error(`[TRANSPORT_NACK_ERROR] Message "${messageId}" not found for negative acknowledgement.`);
    }

    const nack = createTransportNack({
      message,
      failureCode,
      reason,
      timestamp,
    });

    const delivery = this.deliveries.get(messageId);
    if (delivery && delivery.state !== 'REJECTED' && delivery.state !== 'FAILED') {
      try {
        const nextDelivery = transitionDelivery(delivery, 'REJECTED', {
          failureCode,
          failureReason: reason,
          timestamp,
        });
        this.deliveries.set(messageId, nextDelivery);
      } catch {
        // Ignore if already terminal
      }
    }

    this.recordAudit({
      connectionId: message.connectionId,
      messageId,
      action: 'NACK',
      outcome: 'FAILURE',
      details: `NACK ${failureCode}: ${reason}`,
      timestamp,
    });

    return nack;
  }

  /**
   * EN: Sends a heartbeat signal on a connection.
   * Heartbeat is a connectivity signal only; does NOT execute tools or invoke LLM.
   *
   * VI: Gửi tín hiệu nhịp tim trên một kết nối.
   * Nhịp tim chỉ là tín hiệu kết nối; KHÔNG thực thi tool hay gọi LLM.
   */
  public sendHeartbeat(connectionId: string, timestamp = 0): Readonly<HeartbeatSignal> {
    const conn = this.connections.get(connectionId);
    if (!conn) {
      throw new Error(`[TRANSPORT_HEARTBEAT_ERROR] Connection "${connectionId}" not found.`);
    }

    const currentSeq = (this.heartbeatSequenceCounter.get(connectionId) ?? 0) + 1;
    this.heartbeatSequenceCounter.set(connectionId, currentSeq);

    const signal = createHeartbeatSignal({
      connectionId,
      heartbeatSequence: currentSeq,
      healthStatus: isConnectionActive(conn.state) ? 'HEALTHY' : 'DEGRADED',
      timestamp,
    });

    this.heartbeats.set(connectionId, signal);

    const session = this.sessions.get(connectionId);
    if (session) {
      this.sessions.set(
        connectionId,
        updateTransportSessionSnapshot(session, {
          lastHeartbeatSequence: currentSeq,
          timestamp,
        }),
      );
    }

    this.recordAudit({
      connectionId,
      action: 'HEARTBEAT',
      outcome: 'SUCCESS',
      details: `Sent heartbeat seq ${currentSeq}`,
      timestamp,
    });

    return signal;
  }

  /**
   * EN: Acknowledges a heartbeat signal from a remote surface.
   * VI: Xác nhận một tín hiệu nhịp tim từ một bề mặt từ xa.
   */
  public acknowledgeHeartbeat(
    connectionId: string,
    sequence: number,
    surfaceId: string,
    timestamp = 0,
  ): Readonly<HeartbeatAck> {
    const conn = this.connections.get(connectionId);
    if (!conn) {
      throw new Error(`[TRANSPORT_HEARTBEAT_ERROR] Connection "${connectionId}" not found.`);
    }

    const ack = createHeartbeatAck({
      connectionId,
      heartbeatSequence: sequence,
      surfaceId,
      timestamp,
    });

    this.recordAudit({
      connectionId,
      action: 'HEARTBEAT',
      outcome: 'SUCCESS',
      details: `Received heartbeat ACK for seq ${sequence} from surface ${surfaceId}`,
      timestamp,
    });

    return ack;
  }

  /**
   * EN: Requests session resume on reconnect.
   * Validates scope and sequence preservation. Never creates a second Brain.
   *
   * VI: Yêu cầu khôi phục phiên khi kết nối lại.
   * Xác thực phạm vi và bảo toàn chuỗi số thứ tự. Không bao giờ tạo Não bộ thứ hai.
   */
  public requestResume(params: {
    readonly connectionId: string;
    readonly scope: ScopedTransportIdentity;
    readonly lastAckSequence: number;
    readonly checkpointReference?: string;
    readonly resumeAttempt?: number;
    readonly timestamp?: number;
  }): Readonly<ResumeResult> {
    const session = this.sessions.get(params.connectionId);
    if (!session) {
      throw new Error(`[TRANSPORT_RESUME_ERROR] Session for connection "${params.connectionId}" not found.`);
    }

    const request = createResumeRequest(params);
    const result = validateResumeRequest(request, {
      connectionId: session.connectionId,
      scopeKey: session.scopeKey,
      lastAcceptedSequence: session.lastAcceptedSequence,
      lastAcknowledgedSequence: session.lastAcknowledgedSequence,
    });

    if (result.success) {
      // Transition connection from RECONNECTING/RESUMING -> CONNECTED
      const currentConn = this.connections.get(params.connectionId);
      if (currentConn) {
        let activeConn = currentConn;
        if (currentConn.state === 'DISCONNECTED') {
          activeConn = transitionConnection(activeConn, 'CONNECTING', 'Resuming session', params.timestamp);
        }
        if (activeConn.state === 'CONNECTING') {
          activeConn = transitionConnection(activeConn, 'CONNECTED', 'Session resumed', params.timestamp);
        } else if (activeConn.state === 'RECONNECTING') {
          activeConn = transitionConnection(activeConn, 'RESUMING', 'Resuming state', params.timestamp);
          activeConn = transitionConnection(activeConn, 'CONNECTED', 'Session resumed', params.timestamp);
        }
        this.connections.set(params.connectionId, activeConn);
      }

      this.sessions.set(
        params.connectionId,
        updateTransportSessionSnapshot(session, {
          connectionState: 'CONNECTED',
          reconnectCount: session.reconnectCount + 1,
          timestamp: params.timestamp,
        }),
      );

      this.recordAudit({
        connectionId: params.connectionId,
        action: 'RESUME',
        outcome: 'SUCCESS',
        details: `Successfully resumed session at seq ${result.resumedSequence}`,
        timestamp: params.timestamp,
      });
    } else {
      this.recordAudit({
        connectionId: params.connectionId,
        action: 'RESUME',
        outcome: 'FAILURE',
        details: `Failed resume: ${result.error ?? 'unknown error'}`,
        timestamp: params.timestamp,
      });
    }

    return result;
  }

  /**
   * EN: Computes current flow-control and backpressure metrics for a connection.
   * VI: Tính toán chỉ số kiểm soát lưu lượng và áp lực ngược hiện tại cho một kết nối.
   */
  public getBackpressureMetrics(connectionId: string): Readonly<TransportBackpressureMetrics> {
    const queue = this.queues.get(connectionId) ?? [];
    return computeBackpressureMetrics({
      queueDepth: queue.length,
      maxQueueDepth: this.maxQueueDepth,
    });
  }

  /**
   * EN: Creates an immutable checkpoint of the transport state for a connection.
   * VI: Khởi tạo một checkpoint trạng thái truyền tải bất biến cho một kết nối.
   */
  public createCheckpoint(connectionId: string, timestamp = 0): Readonly<TransportCheckpoint> {
    const session = this.sessions.get(connectionId);
    if (!session) {
      throw new Error(`[TRANSPORT_CHECKPOINT_ERROR] Session "${connectionId}" not found.`);
    }

    const queue = this.queues.get(connectionId) ?? [];

    return createTransportCheckpoint({
      connectionId,
      scopeKey: session.scopeKey,
      lastSequence: session.lastAcceptedSequence,
      lastAcknowledgedSequence: session.lastAcknowledgedSequence,
      sessionFingerprint: session.fingerprint,
      pendingMessageIds: queue,
      timestamp,
    });
  }

  /**
   * EN: Returns immutable audit records, optionally filtered by connectionId.
   * VI: Trả về danh sách bản ghi kiểm tra bất biến, có thể lọc theo connectionId.
   */
  public getAuditRecords(connectionId?: string): ReadonlyArray<Readonly<TransportAuditRecord>> {
    const list = connectionId
      ? this.audits.filter(a => a.connectionId === connectionId)
      : this.audits;
    return deepFreeze(list);
  }

  /**
   * EN: Retrieves delivery record for a message.
   * VI: Lấy bản ghi phân phối cho một thông điệp.
   */
  public getDelivery(messageId: string): Readonly<TransportDeliveryRecord> | undefined {
    return this.deliveries.get(messageId);
  }

  /**
   * EN: Retrieves message envelope by messageId.
   * VI: Lấy phong bì thông điệp theo messageId.
   */
  public getMessage(messageId: string): Readonly<BrainTransportMessage> | undefined {
    return this.messagesById.get(messageId);
  }

  private recordAudit(params: {
    readonly connectionId: string;
    readonly action: 'CONNECT' | 'DISCONNECT' | 'DISPATCH' | 'RECEIVE' | 'ACK' | 'NACK' | 'HEARTBEAT' | 'RESUME' | 'BACKPRESSURE';
    readonly outcome: 'SUCCESS' | 'FAILURE' | 'DEGRADED' | 'REJECTED';
    readonly messageId?: string;
    readonly details?: string;
    readonly timestamp?: number;
  }): void {
    const record = createTransportAuditRecord(params);
    this.audits.push(record);
  }
}
