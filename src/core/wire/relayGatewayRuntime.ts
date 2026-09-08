// src/core/wire/relayGatewayRuntime.ts
// BOWCON V4.0 — SECURE REAL WIRE TRANSPORT & RELAY GATEWAY RUNTIME (MS-1.3.28)
//
// Authoritative Real Relay Gateway Runtime Engine.
//
// Connects physical wire transport to Zero-Trust Admission (MS-1.3.26)
// and Remote Session Relay (MS-1.3.27).
//
// INVARIANTS:
// - RELAY_GATEWAY != BRAIN
// - RELAY_GATEWAY != LLM
// - RELAY_GATEWAY != TOOL_EXECUTOR
// - RELAY_CONNECTED != ADMITTED
// - ADMITTED != AUTHORIZED
// - AUTHORIZED != EXECUTED
// - ONE_BRAIN == ONE_AUTHORITATIVE_BRAIN
// - RECONNECT != RE-EXECUTE

import type {
  WireEndpointMetadata,
  WireEnvelope,
  WireFrame,
  WireTransportSnapshot,
} from './wireTypes.js';
import type { WireServerTransportAdapter, WireConnection } from './wireTransport.js';
import { WireHandshakeCoordinator } from './wireHandshake.js';
import { WireAdmissionBridge } from './wireAdmissionBridge.js';
import { WireSessionBinder } from './wireSessionBinding.js';
import { WireMessageRouter } from './wireMessageRouter.js';
import { WireBackpressureController } from './wireBackpressure.js';
import { WireHeartbeatCoordinator } from './wireHeartbeat.js';
import { WireAuditLedger } from './wireAudit.js';
import { WireReconnectScheduler } from './wireReconnect.js';
import { WireTransportError } from './wireFailure.js';
import { createWireFrame } from './wireFrame.js';
import { SecureBrainRelayRuntime } from '../relay/relayRuntime.js';
import { RemoteSessionRecord } from '../relay/relaySession.js';

export interface RelayGatewayRuntimeOptions {
  readonly gatewayId?: string;
  readonly relayId?: string;
  readonly brainId?: string;
  readonly serverAdapter: WireServerTransportAdapter;
  readonly admissionBridge?: WireAdmissionBridge;
  readonly relayRuntime?: SecureBrainRelayRuntime;
  readonly handshakeCoordinator?: WireHandshakeCoordinator;
  readonly sessionBinder?: WireSessionBinder;
  readonly messageRouter?: WireMessageRouter;
  readonly backpressureController?: WireBackpressureController;
  readonly heartbeatCoordinator?: WireHeartbeatCoordinator;
  readonly auditLedger?: WireAuditLedger;
  readonly reconnectScheduler?: WireReconnectScheduler;
}

export class RelayGatewayRuntime {
  public readonly gatewayId: string;
  public readonly relayId: string;
  public readonly brainId: string;

  private readonly serverAdapter: WireServerTransportAdapter;
  private readonly admissionBridge: WireAdmissionBridge;
  private readonly relayRuntime: SecureBrainRelayRuntime;
  private readonly handshakeCoordinator: WireHandshakeCoordinator;
  private readonly sessionBinder: WireSessionBinder;
  private readonly messageRouter: WireMessageRouter;
  private readonly backpressureController: WireBackpressureController;
  private readonly heartbeatCoordinator: WireHeartbeatCoordinator;
  private readonly auditLedger: WireAuditLedger;
  private readonly reconnectScheduler: WireReconnectScheduler;

  private isRunning = false;
  private listeningEndpoint?: WireEndpointMetadata;
  private outboundSeq = 0;
  private inboundEnvelopeHandlers: Array<(env: WireEnvelope) => void> = [];
  private connAssignedSessionId = new Map<string, string>();

  constructor(options: RelayGatewayRuntimeOptions) {
    this.gatewayId = options.gatewayId ?? 'gw_relay_v4';
    this.relayId = options.relayId ?? 'relay_authoritative_01';
    this.brainId = options.brainId ?? 'brain_authoritative_01';
    this.serverAdapter = options.serverAdapter;
    this.admissionBridge = options.admissionBridge ?? new WireAdmissionBridge();
    this.relayRuntime = options.relayRuntime ?? new SecureBrainRelayRuntime();
    this.handshakeCoordinator =
      options.handshakeCoordinator ??
      new WireHandshakeCoordinator({
        gatewayId: this.gatewayId,
        challengeGenerator: (deviceId) => {
          const provider = this.admissionBridge.getAdmissionRuntime().getTrustProvider();
          const trust = typeof (provider as any).getTrustRecord === 'function'
            ? (provider as any).getTrustRecord(deviceId, { deviceId } as any)
            : undefined;
          const keyVersion = trust?.keyVersion ?? 1;
          const challenge = this.admissionBridge
            .getAdmissionRuntime()
            .getChallengeTracker()
            .issueChallenge(
              deviceId,
              {
                userId: trust?.userId ?? 'usr_owner_01',
                sessionId: `sess_${deviceId}`,
                brainId: this.brainId,
                surfaceId: trust?.surfaceId ?? 'surf_01',
                transportId: 'transport_relay_v4',
                gatewayId: this.gatewayId,
                adapterId: this.serverAdapter.adapterType,
                connectionId: 'conn_01',
                deviceId,
              },
              keyVersion
            );
          return challenge.challengeId;
        },
      });
    this.sessionBinder = options.sessionBinder ?? new WireSessionBinder();
    this.messageRouter = options.messageRouter ?? new WireMessageRouter();
    this.backpressureController = options.backpressureController ?? new WireBackpressureController();
    this.heartbeatCoordinator = options.heartbeatCoordinator ?? new WireHeartbeatCoordinator();
    this.auditLedger = options.auditLedger ?? new WireAuditLedger();
    this.reconnectScheduler = options.reconnectScheduler ?? new WireReconnectScheduler();
  }

  // --- Subsystem Accessors ---
  public getServerAdapter(): WireServerTransportAdapter { return this.serverAdapter; }
  public getAdmissionBridge(): WireAdmissionBridge { return this.admissionBridge; }
  public getRelayRuntime(): SecureBrainRelayRuntime { return this.relayRuntime; }
  public getSessionBinder(): WireSessionBinder { return this.sessionBinder; }
  public getMessageRouter(): WireMessageRouter { return this.messageRouter; }
  public getBackpressureController(): WireBackpressureController { return this.backpressureController; }
  public getHeartbeatCoordinator(): WireHeartbeatCoordinator { return this.heartbeatCoordinator; }
  public getAuditLedger(): WireAuditLedger { return this.auditLedger; }
  public getReconnectScheduler(): WireReconnectScheduler { return this.reconnectScheduler; }

  public async start(port = 0, host = '127.0.0.1'): Promise<WireEndpointMetadata> {
    if (this.isRunning) {
      return this.listeningEndpoint!;
    }

    this.serverAdapter.onConnection((conn) => this.handleInboundConnection(conn));
    this.listeningEndpoint = await this.serverAdapter.listen(port, host);
    this.isRunning = true;

    this.auditLedger.recordEvent({
      eventType: 'WIRE_CONNECTION_OPENED',
      connectionId: 'gateway_listener',
      details: { endpoint: this.listeningEndpoint },
    });

    return this.listeningEndpoint;
  }

  private handleInboundConnection(conn: WireConnection): void {
    let assignedSessionId: string | undefined;
    let connectedDeviceId: string | undefined;

    this.auditLedger.recordEvent({
      eventType: 'WIRE_CONNECTION_OPENED',
      connectionId: conn.connectionId,
      details: { remoteEndpoint: conn.endpoint },
    });

    conn.onFrame(async (frame) => {
      try {
        if (frame.frameType === 'HANDSHAKE') {
          await this.handleHandshake(conn, frame);
        } else if (frame.frameType === 'DATA') {
          await this.handleDataFrame(conn, frame);
        } else if (frame.frameType === 'HEARTBEAT') {
          const ack = this.heartbeatCoordinator.createHeartbeatAck(frame, ++this.outboundSeq);
          await conn.send(ack);
        } else if (frame.frameType === 'HEARTBEAT_ACK') {
          this.heartbeatCoordinator.recordPongReceived(conn.connectionId);
        }
      } catch (err) {
        this.auditLedger.recordEvent({
          eventType: 'WIRE_ERROR_RECORDED',
          connectionId: conn.connectionId,
          details: { error: (err as Error).message },
          riskLevel: 'HIGH',
        });
        await conn.close((err as Error).message);
      }
    });

    conn.onClose((reason) => {
      if (assignedSessionId) {
        this.sessionBinder.unbind(conn.connectionId);
      }
      this.heartbeatCoordinator.remove(conn.connectionId);
      this.auditLedger.recordEvent({
        eventType: 'WIRE_CONNECTION_CLOSED',
        connectionId: conn.connectionId,
        deviceId: connectedDeviceId,
        sessionId: assignedSessionId,
        details: { reason },
      });
    });
  }

  private async handleHandshake(conn: WireConnection, frame: WireFrame): Promise<void> {
    const request = JSON.parse(frame.payload);
    if ('setState' in conn && typeof (conn as any).setState === 'function') {
      (conn as any).setState('WIRE_HANDSHAKING', 'Processing handshake request');
    }
    this.auditLedger.recordEvent({
      eventType: 'WIRE_HANDSHAKE_REQUESTED',
      connectionId: conn.connectionId,
      deviceId: request.deviceId,
      details: { request },
    });

    const assignedSessionId = this.connAssignedSessionId.get(conn.connectionId) ?? `sess_${request.deviceId}_${Date.now()}`;
    this.connAssignedSessionId.set(conn.connectionId, assignedSessionId);
    const response = this.handshakeCoordinator.evaluateServerRequest(request, conn.connectionId, assignedSessionId);
    const respFrame = createWireFrame({
      frameType: 'HANDSHAKE_ACK',
      sequence: ++this.outboundSeq,
      payload: JSON.stringify(response),
    });

    await conn.send(respFrame);

    if (response.accepted) {
      if ('setState' in conn && typeof (conn as any).setState === 'function') {
        (conn as any).setState('WIRE_VALIDATING', 'Handshake response accepted');
        if (response.challenge) {
          (conn as any).setState('WIRE_ADMISSION_PENDING', 'Awaiting challenge proof');
        }
      }
      this.auditLedger.recordEvent({
        eventType: 'WIRE_HANDSHAKE_COMPLETED',
        connectionId: conn.connectionId,
        deviceId: request.deviceId,
        details: { response },
      });
    } else {
      if ('setState' in conn && typeof (conn as any).setState === 'function') {
        (conn as any).setState('WIRE_REJECTED', response.rejectionReason);
      }
      this.auditLedger.recordEvent({
        eventType: 'WIRE_HANDSHAKE_REJECTED',
        connectionId: conn.connectionId,
        deviceId: request.deviceId,
        details: { reason: response.rejectionReason },
        riskLevel: 'MEDIUM',
      });
      await conn.close(response.rejectionReason);
    }
  }

  private async handleDataFrame(conn: WireConnection, frame: WireFrame): Promise<void> {
    const parsed = JSON.parse(frame.payload);

    // 1. Check if this is an admission proof message
    if (parsed.type === 'ADMISSION_PROOF') {
      await this.processAdmissionProof(conn, parsed);
      return;
    }

    // 2. Regular WireEnvelope routing
    const envelope = parsed as WireEnvelope;

    // Validate scope binding
    this.sessionBinder.validateScopeMatch(conn.connectionId, envelope.scope);

    // Backpressure check
    const accepted = this.backpressureController.enqueue(frame, envelope.priority);
    if (!accepted) {
      this.auditLedger.recordEvent({
        eventType: 'WIRE_BACKPRESSURE_OVERFLOW',
        connectionId: conn.connectionId,
        deviceId: envelope.deviceId,
        sessionId: envelope.sessionId,
        details: { messageId: envelope.messageId, sequence: envelope.sequence },
        riskLevel: 'HIGH',
      });
      return;
    }

    // Dequeue immediately for dispatch
    this.backpressureController.dequeue();

    // Verify sequence & route
    const routed = this.messageRouter.route(envelope);

    this.auditLedger.recordEvent({
      eventType: 'WIRE_FRAME_RECEIVED',
      connectionId: conn.connectionId,
      deviceId: envelope.deviceId,
      sessionId: envelope.sessionId,
      details: {
        messageId: routed.messageId,
        sequence: routed.sequence,
        category: routed.messageCategory,
      },
    });

    // Dispatch to registered Brain listeners
    for (const handler of this.inboundEnvelopeHandlers) {
      handler(routed);
    }
  }

  private async processAdmissionProof(conn: WireConnection, payload: any): Promise<void> {
    this.auditLedger.recordEvent({
      eventType: 'WIRE_ADMISSION_REQUESTED',
      connectionId: conn.connectionId,
      deviceId: payload.deviceId,
      details: { surfaceType: payload.surfaceType },
    });

    const decision = await this.admissionBridge.evaluateWireAdmission({
      deviceId: payload.deviceId,
      surfaceType: payload.surfaceType,
      surfaceId: payload.surfaceId,
      scope: {
        userId: 'usr_owner_01',
        sessionId: `sess_${payload.deviceId}_${Date.now()}`,
        brainId: this.brainId,
        surfaceId: payload.surfaceId,
        transportId: 'transport_relay_v4',
        gatewayId: this.gatewayId,
        adapterId: this.serverAdapter.adapterType,
        connectionId: conn.connectionId,
        deviceId: payload.deviceId,
      },
      endpoint: {
        host: conn.endpoint.host,
        port: conn.endpoint.port,
        protocol: 'wss',
        tlsEnabled: conn.endpoint.tlsRequired,
        path: conn.endpoint.path,
      },
      network: {
        networkType: 'WIFI',
        ipAddress: conn.endpoint.host,
        locality: conn.endpoint.isLocal ? 'LOCAL' : 'REMOTE',
        isRoaming: false,
        transportType: 'relay_wire',
      },
      proof: payload.proof,
    });

    if (decision.decision === 'ADMIT' && decision.admitted) {
      if ('setState' in conn && typeof (conn as any).setState === 'function') {
        (conn as any).setState('WIRE_ADMITTED', 'Proof verified');
        (conn as any).setState('WIRE_SESSION_BINDING', 'Binding session');
      }

      const sessionId =
        this.connAssignedSessionId.get(conn.connectionId) ?? `sess_${payload.deviceId}_${Date.now()}`;
      const sessionRecord = new RemoteSessionRecord({
        sessionId,
        deviceId: payload.deviceId,
        relayId: this.relayId,
        brainId: this.brainId,
        surfaceId: payload.surfaceId,
        surfaceType: payload.surfaceType,
        tenantId: 'tenant_bow_01',
        userId: 'usr_owner_01',
        connectionId: conn.connectionId,
        gatewayId: this.gatewayId,
      });

      sessionRecord.setAdmissionState('ADMITTED');
      sessionRecord.setTrustState('TRUSTED');
      sessionRecord.transitionTo('SESSION_ACTIVE');

      // Bind connection to session
      this.sessionBinder.bind(conn.connectionId, sessionRecord.toImmutable());

      // Transition connection state to active
      if ('setState' in conn && typeof (conn as any).setState === 'function') {
        (conn as any).setState('WIRE_ACTIVE', 'Admission verified and session bound');
      }

      // Send confirmation frame
      const confirmFrame = createWireFrame({
        frameType: 'DATA',
        sequence: ++this.outboundSeq,
        payload: JSON.stringify({
          type: 'ADMISSION_CONFIRMATION',
          sessionId,
          admitted: true,
        }),
      });
      await conn.send(confirmFrame);

      this.auditLedger.recordEvent({
        eventType: 'WIRE_ADMISSION_GRANTED',
        connectionId: conn.connectionId,
        deviceId: payload.deviceId,
        sessionId,
        details: { decision },
      });

      this.auditLedger.recordEvent({
        eventType: 'WIRE_SESSION_BOUND',
        connectionId: conn.connectionId,
        deviceId: payload.deviceId,
        sessionId,
        details: { boundAt: Date.now() },
      });
    } else {
      if ('setState' in conn && typeof (conn as any).setState === 'function') {
        (conn as any).setState('WIRE_REJECTED', decision.rejectionReason ?? 'ADMISSION_DENIED');
      }
      this.auditLedger.recordEvent({
        eventType: 'WIRE_ADMISSION_DENIED',
        connectionId: conn.connectionId,
        deviceId: payload.deviceId,
        details: { decision },
        riskLevel: 'HIGH',
      });
      await conn.close(decision.rejectionReason ?? 'ADMISSION_DENIED');
    }
  }

  public onInboundEnvelope(handler: (env: WireEnvelope) => void): void {
    this.inboundEnvelopeHandlers.push(handler);
  }

  public async sendEnvelopeToSession(sessionId: string, envelope: WireEnvelope): Promise<void> {
    const connId = this.sessionBinder.getConnectionForSession(sessionId);
    if (!connId) {
      throw new WireTransportError(
        'WIRE_CONNECTION_FAILED',
        `No active connection found bound to session "${sessionId}".`
      );
    }

    const conn = this.serverAdapter.getActiveConnections().find((c) => c.connectionId === connId);
    if (!conn) {
      throw new WireTransportError(
        'WIRE_CONNECTION_FAILED',
        `Bound connection "${connId}" is no longer active.`
      );
    }

    const frame = createWireFrame({
      frameType: 'DATA',
      sequence: ++this.outboundSeq,
      payload: JSON.stringify(envelope),
    });

    await conn.send(frame);

    this.auditLedger.recordEvent({
      eventType: 'WIRE_FRAME_SENT',
      connectionId: connId,
      sessionId,
      deviceId: envelope.deviceId,
      details: {
        messageId: envelope.messageId,
        sequence: envelope.sequence,
        category: envelope.messageCategory,
      },
    });
  }

  public getSnapshot(): WireTransportSnapshot {
    const activeConns = this.serverAdapter.getActiveConnections();
    let totalSent = 0;
    let totalReceived = 0;
    let totalFramesSent = 0;
    let totalFramesReceived = 0;

    for (const c of activeConns) {
      const m = c.getMetrics();
      totalSent += m.bytesSent;
      totalReceived += m.bytesReceived;
      totalFramesSent += m.framesSent;
      totalFramesReceived += m.framesReceived;
    }

    return Object.freeze({
      activeConnections: activeConns.length,
      totalBytesSent: totalSent,
      totalBytesReceived: totalReceived,
      totalFramesSent: totalFramesSent,
      totalFramesReceived: totalFramesReceived,
      totalReconnections: 0,
      totalResumptions: 0,
      totalDroppedFrames: this.backpressureController.getDroppedCount(),
      backpressureState: this.backpressureController.getLevel(),
      status: this.isRunning ? 'ACTIVE' : 'CLOSED',
    });
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) return;
    this.isRunning = false;
    await this.serverAdapter.close();
    this.sessionBinder.clear();
    this.listeningEndpoint = undefined;
  }
}
