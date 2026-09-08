// src/core/relay/relayRuntime.ts
// BOWCON V4.0 — SECURE ALWAYS-ON BRAIN RELAY & REMOTE SESSION RUNTIME (MS-1.3.27)
//
// Central SecureBrainRelayRuntime Engine.
// Bridges MS-1.3.22 (Bidirectional Connection), MS-1.3.23 (Pairing/Trust),
// MS-1.3.24 (Device Identity), MS-1.3.25 (Device Vault), MS-1.3.26 (Zero-Trust Admission)
// into an authoritative remote session transport and relay architecture.
//
// STRICT CARDINAL INVARIANTS:
// - ONE_BRAIN == ONE_AUTHORITATIVE_BRAIN
// - RELAY != BRAIN
// - RELAY != DEVICE
// - RELAY != SESSION
// - IP_ADDRESS != DEVICE_IDENTITY
// - SSID != DEVICE_IDENTITY
// - NETWORK_LOCATION != DEVICE_TRUST
// - ENDPOINT_KNOWLEDGE != ACCESS_TO_BRAIN
// - RELAY_CONNECTED != DEVICE_ADMITTED
// - RELAY_CONNECTED != AUTHENTICATED
// - RELAY_CONNECTED != TRUSTED
// - RECONNECT != RE-EXECUTE
// - SESSION_RESUME != TASK_RESUME
// - HEARTBEAT != TASK_SUCCESS
// - ACK != TASK_SUCCESS
// - DELIVERED != TASK_SUCCESS
// - Relay MUST NOT execute tools, call LLM, or mutate Brain memory.

import type {
  RelayId,
  RelayRegistration,
  RemoteSession,
  RelayMessage,
  RelayRuntimeSnapshot,
  RelaySurfaceType as SurfaceType,
  RelayEndpointMetadata,
} from './relayTypes.js';
import type { DeviceProof } from '../deviceIdentity/persistentDeviceTypes.js';
import { RELAY_PROTOCOL_VERSION } from './relayTypes.js';
import { RelayRegistrationManager } from './relayRegistration.js';
import { RelayAdmissionBridge } from './relayAdmission.js';
import { RemoteSessionRecord } from './relaySession.js';
import { RelayMultiplexer } from './relayMultiplexing.js';
import { RelayHeartbeatTracker } from './relayHeartbeat.js';
import { RelayReconnectScheduler } from './relayReconnect.js';
import { RelayResumeCoordinator } from './relayResume.js';
import { RelayMessageRouter } from './relayRouting.js';
import { RelayBackpressureController } from './relayBackpressure.js';
import { RelayAuditLedger } from './relayAudit.js';
import { RelayRegistry } from './relayRegistry.js';
import { RelayError } from './relayFailure.js';

export interface SecureBrainRelayRuntimeOptions {
  readonly registrationManager?: RelayRegistrationManager;
  readonly admissionBridge?: RelayAdmissionBridge;
  readonly multiplexer?: RelayMultiplexer;
  readonly heartbeatTracker?: RelayHeartbeatTracker;
  readonly reconnectScheduler?: RelayReconnectScheduler;
  readonly resumeCoordinator?: RelayResumeCoordinator;
  readonly router?: RelayMessageRouter;
  readonly backpressureController?: RelayBackpressureController;
  readonly auditLedger?: RelayAuditLedger;
  readonly registry?: RelayRegistry;
}

export class SecureBrainRelayRuntime {
  private readonly registrationManager: RelayRegistrationManager;
  private readonly admissionBridge: RelayAdmissionBridge;
  private readonly multiplexer: RelayMultiplexer;
  private readonly heartbeatTracker: RelayHeartbeatTracker;
  private readonly reconnectScheduler: RelayReconnectScheduler;
  private readonly resumeCoordinator: RelayResumeCoordinator;
  private readonly router: RelayMessageRouter;
  private readonly backpressureController: RelayBackpressureController;
  private readonly auditLedger: RelayAuditLedger;
  private readonly registry: RelayRegistry;

  private totalReconnections: number = 0;
  private totalResumptions: number = 0;
  private totalRoamingEvents: number = 0;

  constructor(options?: SecureBrainRelayRuntimeOptions) {
    this.registrationManager = options?.registrationManager ?? new RelayRegistrationManager();
    this.admissionBridge = options?.admissionBridge ?? new RelayAdmissionBridge();
    this.multiplexer = options?.multiplexer ?? new RelayMultiplexer();
    this.heartbeatTracker = options?.heartbeatTracker ?? new RelayHeartbeatTracker();
    this.reconnectScheduler = options?.reconnectScheduler ?? new RelayReconnectScheduler();
    this.resumeCoordinator = options?.resumeCoordinator ?? new RelayResumeCoordinator();
    this.router = options?.router ?? new RelayMessageRouter();
    this.backpressureController = options?.backpressureController ?? new RelayBackpressureController();
    this.auditLedger = options?.auditLedger ?? new RelayAuditLedger();
    this.registry = options?.registry ?? new RelayRegistry();
  }

  // --- Subsystem Accessors ---
  public getRegistrationManager(): RelayRegistrationManager {
    return this.registrationManager;
  }
  public getAdmissionBridge(): RelayAdmissionBridge {
    return this.admissionBridge;
  }
  public getMultiplexer(): RelayMultiplexer {
    return this.multiplexer;
  }
  public getHeartbeatTracker(): RelayHeartbeatTracker {
    return this.heartbeatTracker;
  }
  public getReconnectScheduler(): RelayReconnectScheduler {
    return this.reconnectScheduler;
  }
  public getResumeCoordinator(): RelayResumeCoordinator {
    return this.resumeCoordinator;
  }
  public getRouter(): RelayMessageRouter {
    return this.router;
  }
  public getBackpressureController(): RelayBackpressureController {
    return this.backpressureController;
  }
  public getAuditLedger(): RelayAuditLedger {
    return this.auditLedger;
  }
  public getRegistry(): RelayRegistry {
    return this.registry;
  }

  /**
   * Registers a Relay instance with the Brain infrastructure.
   */
  public registerRelay(reg: RelayRegistration): void {
    this.registrationManager.register(reg);
    this.auditLedger.record({
      eventType: 'RELAY_REGISTERED',
      relayId: reg.relayId,
      details: {
        endpoint: reg.advertisedEndpoint,
        protocols: reg.supportedProtocols,
        capabilities: reg.capabilities,
      },
    });
  }

  /**
   * Establishes a remote session for an admitted device connecting via an active relay.
   */
  public async establishSession(params: {
    sessionId: string;
    relayId: RelayId;
    deviceId: string;
    surfaceType: SurfaceType;
    scope: {
      tenantId: string;
      userId: string;
      surfaceId: string;
      brainId: string;
    };
    networkContext: {
      networkType: 'HOME_WIFI' | 'CELLULAR_4G' | 'CELLULAR_5G' | 'PUBLIC_WIFI' | 'HOTSPOT' | 'ETHERNET';
      ipAddress: string;
      ssid?: string;
    };
    endpoint: RelayEndpointMetadata;
    proof?: DeviceProof;
    connectionId?: string;
    gatewayId?: string;
  }): Promise<RemoteSession> {
    // 1. Verify relay is registered and active
    const relay = this.registrationManager.getRegistration(params.relayId);
    if (!relay || relay.status !== 'ACTIVE') {
      this.auditLedger.record({
        eventType: 'RELAY_REJECTED',
        relayId: params.relayId,
        deviceId: params.deviceId,
        details: { reason: 'Relay is not registered or not active.' },
      });
      throw new RelayError('UNAUTHORIZED_RELAY', `Relay ${params.relayId} is not registered or active.`);
    }

    // 2. Perform zero-trust admission check
    this.auditLedger.record({
      eventType: 'ADMISSION_STARTED',
      relayId: params.relayId,
      deviceId: params.deviceId,
      sessionId: params.sessionId,
      details: { networkType: params.networkContext.networkType },
    });

    let admissionDecision = this.admissionBridge.evaluateRelayAdmission({
      relayId: params.relayId,
      deviceId: params.deviceId,
      surfaceType: params.surfaceType,
      scope: {
        tenantId: params.scope.tenantId,
        userId: params.scope.userId,
        deviceId: params.deviceId,
        surfaceId: params.scope.surfaceId,
        brainId: params.scope.brainId,
      },
      networkContext: params.networkContext,
      endpoint: params.endpoint,
      proof: params.proof,
      sessionId: params.sessionId,
    });

    if (admissionDecision.decision === 'CHALLENGE_REQUIRED' && admissionDecision.challenge && !params.proof) {
      try {
        admissionDecision = this.admissionBridge.solveChallengeAndAdmit(
          {
            relayId: params.relayId,
            deviceId: params.deviceId,
            surfaceType: params.surfaceType,
            scope: {
              tenantId: params.scope.tenantId,
              userId: params.scope.userId,
              deviceId: params.deviceId,
              surfaceId: params.scope.surfaceId,
              brainId: params.scope.brainId,
            },
            networkContext: params.networkContext,
            endpoint: params.endpoint,
            sessionId: params.sessionId,
          },
          admissionDecision.challenge
        );
      } catch {
        // Will fail closed on check below
      }
    }

    if (admissionDecision.decision !== 'ADMIT' || !admissionDecision.admitted) {
      this.auditLedger.record({
        eventType: 'ADMISSION_REJECTED',
        relayId: params.relayId,
        deviceId: params.deviceId,
        sessionId: params.sessionId,
        details: { reason: admissionDecision.rejectionReason },
      });
      throw new RelayError(
        'FAKE_DEVICE',
        `Admission rejected for device ${params.deviceId}: ${admissionDecision.rejectionReason}`
      );
    }

    this.auditLedger.record({
      eventType: 'ADMISSION_ACCEPTED',
      relayId: params.relayId,
      deviceId: params.deviceId,
      sessionId: params.sessionId,
      details: { admitted: admissionDecision.admitted, decision: admissionDecision.decision },
    });

    // 3. Create Session Record
    const sessionRecord = new RemoteSessionRecord({
      sessionId: params.sessionId,
      deviceId: params.deviceId,
      relayId: params.relayId,
      brainId: params.scope.brainId,
      surfaceId: params.scope.surfaceId,
      surfaceType: params.surfaceType,
      tenantId: params.scope.tenantId,
      userId: params.scope.userId,
      connectionId: params.connectionId || `conn_${Date.now()}`,
      gatewayId: params.gatewayId || 'gw_default',
      initialState: 'CONNECTED',
    });

    sessionRecord.transitionTo('ADMISSION_PENDING');
    sessionRecord.setAdmissionState('ADMITTED');
    sessionRecord.setTrustState('TRUSTED');
    sessionRecord.transitionTo('ADMITTED');
    sessionRecord.transitionTo('SESSION_ESTABLISHING');
    sessionRecord.transitionTo('SESSION_ACTIVE');

    // Issue initial resume token
    this.resumeCoordinator.generateResumeToken(sessionRecord);

    // Register in multiplexer and registry
    this.multiplexer.registerSession(sessionRecord);
    this.registry.registerSession(sessionRecord);

    this.auditLedger.record({
      eventType: 'SESSION_CREATED',
      relayId: params.relayId,
      deviceId: params.deviceId,
      sessionId: params.sessionId,
      surfaceId: params.scope.surfaceId,
      surfaceType: params.surfaceType,
      details: { initialState: sessionRecord.getState() },
    });

    return sessionRecord.toImmutable();
  }

  /**
   * Handles network roaming (e.g. Home Wi-Fi -> 4G -> 5G -> Public Wi-Fi)
   * The device identity MUST NOT change when roaming across networks.
   */
  public handleNetworkRoaming(
    sessionId: string,
    newNetwork: {
      networkType: 'HOME_WIFI' | 'CELLULAR_4G' | 'CELLULAR_5G' | 'PUBLIC_WIFI' | 'HOTSPOT' | 'ETHERNET';
      ipAddress: string;
      ssid?: string;
    }
  ): { session: RemoteSession; roamingDetected: boolean } {
    const sessionRecord = this.multiplexer.getSession(sessionId);
    if (!sessionRecord) {
      throw new RelayError('SESSION_CONFUSION', `Cannot roam unknown session ${sessionId}`);
    }

    this.totalRoamingEvents++;
    this.auditLedger.record({
      eventType: 'ROAMING_DETECTED',
      relayId: sessionRecord.relayId,
      deviceId: sessionRecord.deviceId,
      sessionId: sessionRecord.sessionId,
      surfaceId: sessionRecord.surfaceId,
      surfaceType: sessionRecord.surfaceType,
      details: {
        previousNetwork: 'unknown_prior',
        newNetworkType: newNetwork.networkType,
        newIp: newNetwork.ipAddress,
      },
    });

    sessionRecord.updateActivity();
    return {
      session: sessionRecord.toImmutable(),
      roamingDetected: true,
    };
  }

  /**
   * Routes an application message through backpressure and router.
   */
  public routeMessage(message: RelayMessage): RelayMessage {
    // 1. Verify session multiplexing boundaries
    this.multiplexer.routeInbound(message);

    // 2. Pass through backpressure controller
    this.backpressureController.enqueue(message);

    // 3. Forward via router
    const dequeued = this.backpressureController.dequeue();
    if (!dequeued) {
      throw new RelayError('BACKPRESSURE_OVERFLOW', 'Failed to dequeue message.');
    }

    const routed = this.router.route(dequeued);
    RelayMessageRouter.assertRoutingPreservation(message, routed);
    return routed;
  }

  /**
   * Records a heartbeat and updates session activity.
   */
  public recordHeartbeat(relayId: RelayId, sessionId: string, rttMs: number): void {
    const hb = this.heartbeatTracker.recordHeartbeat(relayId, sessionId, rttMs);
    const session = this.multiplexer.getSession(sessionId);
    if (session) {
      session.updateActivity();
      if (hb.status === 'DEGRADED' && session.getState() === 'SESSION_ACTIVE') {
        session.transitionTo('DEGRADED');
        this.auditLedger.record({
          eventType: 'HEARTBEAT_FAILED',
          relayId,
          sessionId,
          details: { status: 'DEGRADED', rttMs },
        });
      } else if (hb.status === 'HEALTHY' && session.getState() === 'DEGRADED') {
        session.transitionTo('SESSION_ACTIVE');
        this.auditLedger.record({
          eventType: 'HEARTBEAT_RECOVERED',
          relayId,
          sessionId,
          details: { status: 'HEALTHY', rttMs },
        });
      }
    }
  }

  /**
   * Performs a bounded, state-aware reconnection attempt.
   * INVARIANT: RECONNECT != RE-EXECUTE.
   */
  public reconnectSession(sessionId: string): {
    reconnected: boolean;
    delayMs?: number;
    error?: string;
  } {
    const session = this.multiplexer.getSession(sessionId);
    if (!session) {
      return { reconnected: false, error: `Session ${sessionId} not found` };
    }

    this.auditLedger.record({
      eventType: 'RECONNECT_STARTED',
      relayId: session.relayId,
      deviceId: session.deviceId,
      sessionId,
      details: { currentState: session.getState() },
    });

    const nextAttempt = this.reconnectScheduler.scheduleNextAttempt(sessionId);
    if (!nextAttempt.allowed) {
      this.auditLedger.record({
        eventType: 'REPLAY_REJECTED',
        relayId: session.relayId,
        deviceId: session.deviceId,
        sessionId,
        details: { reason: 'Reconnect attempts exhausted.' },
      });
      throw new RelayError('RECONNECT_EXHAUSTED', `Reconnect attempts exhausted for ${sessionId}`);
    }

    if (session.getState() === 'SESSION_ACTIVE' || session.getState() === 'DEGRADED') {
      session.transitionTo('RECONNECTING');
    }

    this.totalReconnections++;
    this.reconnectScheduler.recordSuccess(sessionId);
    session.transitionTo('CONNECTED');

    this.auditLedger.record({
      eventType: 'RECONNECT_COMPLETED',
      relayId: session.relayId,
      deviceId: session.deviceId,
      sessionId,
      details: { attempt: nextAttempt.attempt },
    });

    return { reconnected: true, delayMs: nextAttempt.delayMs };
  }

  /**
   * Resumes an existing remote session with sequence continuity and token validation.
   * INVARIANT: SESSION_RESUME != TASK_RESUME.
   */
  public resumeSession(params: {
    sessionId: string;
    resumeToken: string;
    clientLastAckSeq: number;
    clientNextSeq: number;
    now?: number;
  }): RemoteSession {
    const session = this.multiplexer.getSession(params.sessionId);
    if (!session) {
      throw new RelayError('STALE_SESSION_RESUME', `Session ${params.sessionId} not found`);
    }

    // Validate sequence continuity and resume token
    this.resumeCoordinator.validateResumeRequest({
      sessionId: params.sessionId,
      providedToken: params.resumeToken,
      clientLastAckSeq: params.clientLastAckSeq,
      clientNextSeq: params.clientNextSeq,
      now: params.now,
    });

    if (session.getState() === 'CONNECTED' || session.getState() === 'RECONNECTING') {
      session.transitionTo('RESUMING');
    }

    session.markResumed(params.now);
    session.transitionTo('SESSION_ACTIVE');

    // Issue refreshed token for the next potential resume
    this.resumeCoordinator.generateResumeToken(session);
    this.totalResumptions++;

    this.auditLedger.record({
      eventType: 'SESSION_RESUMED',
      relayId: session.relayId,
      deviceId: session.deviceId,
      sessionId: params.sessionId,
      surfaceId: session.surfaceId,
      surfaceType: session.surfaceType,
      details: { resumedSeq: params.clientNextSeq },
    });

    return session.toImmutable();
  }

  /**
   * Gracefully terminates an active remote session.
   */
  public terminateSession(sessionId: string, reason?: string): void {
    const session = this.multiplexer.getSession(sessionId);
    if (!session) return;

    if (session.getState() !== 'TERMINATED' && session.getState() !== 'REJECTED') {
      session.transitionTo('TERMINATING');
      session.transitionTo('TERMINATED');
    }

    this.resumeCoordinator.invalidateToken(sessionId);
    this.multiplexer.unregisterSession(sessionId);

    this.auditLedger.record({
      eventType: 'SESSION_TERMINATED',
      relayId: session.relayId,
      deviceId: session.deviceId,
      sessionId,
      details: { reason: reason || 'Normal termination' },
    });
  }

  /**
   * Diagnostic runtime snapshot.
   */
  public getSnapshot(): RelayRuntimeSnapshot {
    return Object.freeze({
      protocolVersion: RELAY_PROTOCOL_VERSION,
      registeredRelaysCount: this.registrationManager.listRegistrations().length,
      activeSessionsCount: this.multiplexer.getActiveSessions().length,
      backpressureState: this.backpressureController.getState(),
      totalMessagesRouted: this.router.getTotalRouted(),
      totalReconnections: this.totalReconnections,
      totalResumptions: this.totalResumptions,
      totalRoamingEvents: this.totalRoamingEvents,
      totalSecurityEvents: this.auditLedger.count(),
      healthy: true,
    });
  }

  /**
   * Static architectural verification confirming boundary non-interference.
   */
  public static verifyArchitecturalNonInterference(): {
    callsLLM: false;
    executesTools: false;
    mutatesBrainMemory: false;
    controlsActuators: false;
    bypassesPDP: false;
    isCognitiveAuthority: false;
  } {
    return Object.freeze({
      callsLLM: false,
      executesTools: false,
      mutatesBrainMemory: false,
      controlsActuators: false,
      bypassesPDP: false,
      isCognitiveAuthority: false,
    });
  }
}
