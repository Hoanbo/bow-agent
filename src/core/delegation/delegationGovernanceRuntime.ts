// src/core/delegation/delegationGovernanceRuntime.ts
// BOWCON V4.0 — MS-1.3.45: MASTER OWNER DELEGATION GOVERNANCE RUNTIME
//
// Authoritative coordinator for multi-agent delegation, capability leases,
// and federation governance.
//
// STRICT INVARIANTS:
// - MASTER_OWNER_AUTHORITY > BOW > BOWCON > PROJECTS
// - DELEGATED_AUTHORITY <= OWNER_GRANTED_SCOPE
// - CHILD_DELEGATION_SCOPE <= PARENT_DELEGATION_SCOPE
// - CHILD_CAPABILITIES ⊆ PARENT_CAPABILITIES
// - CHILD_EXPIRATION <= PARENT_EXPIRATION
// - REVOCATION > AGENT_INTENT
// - USER_STOP > EVERYTHING_AUTONOMOUS
// - AGENT != MASTER_OWNER
// - DEVICE != MASTER_OWNER
// - DELEGATION != EXECUTION
// - CAPABILITY != AUTHORIZATION
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0

import crypto from 'node:crypto';
import type {
  DelegationRecord,
  DelegationRequestInput,
  DelegationScope,
  CapabilityLease,
  DelegationEvidence,
} from './delegationTypes.js';
import {
  DELEGATION_SCHEMA_VERSION,
  MASTER_OWNER_ID,
  isMasterOwner,
} from './delegationTypes.js';
import { DelegationScopeValidator, DelegationScopeValidationError } from './delegationScopeValidator.js';
import { AgentIdentityManager, globalAgentIdentityManager } from './agentIdentityManager.js';
import { FederatedDeviceRegistry, globalFederatedDeviceRegistry } from './federatedDeviceRegistry.js';
import { CapabilityLeaseManager, globalCapabilityLeaseManager } from './capabilityLeaseManager.js';
import { DurableDelegationStore } from './durableDelegationStore.js';
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';
import { globalAuditLedger } from '../auditLedger.js';

export class DelegationGovernanceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(`[${code}] ${message}`);
    this.name = 'DelegationGovernanceError';
  }
}

export class DelegationGovernanceRuntime {
  private delegations = new Map<string, DelegationRecord>();
  private completedOrTerminalIds = new Set<string>();
  private readonly store: DurableDelegationStore;

  constructor(
    public readonly agentIdentityManager: AgentIdentityManager = globalAgentIdentityManager,
    public readonly deviceRegistry: FederatedDeviceRegistry = globalFederatedDeviceRegistry,
    public readonly leaseManager: CapabilityLeaseManager = globalCapabilityLeaseManager,
    store?: DurableDelegationStore
  ) {
    this.store = store || new DurableDelegationStore();
  }

  // ---------------------------------------------------------------------------
  // 1. Delegation Lifecycle: Request -> Authorize -> Activate
  // ---------------------------------------------------------------------------

  /**
   * Submits a delegation request into PENDING_AUTHORIZATION.
   */
  public requestDelegation(input: DelegationRequestInput): DelegationRecord {
    // 1. Invariant: USER_STOP > EVERYTHING_AUTONOMOUS
    if (globalMasterHumanAuthority.isUserStopActive) {
      throw new DelegationGovernanceError(
        'USER_STOP_ACTIVE',
        'Cannot request delegation while USER_STOP is active.'
      );
    }

    // 2. Target path & protected workspace check
    if (input.scope.targetPaths) {
      DelegationScopeValidator.assertProtectedWorkspaceSafe(
        input.scope.targetPaths,
        'targetPaths'
      );
    }
    if (input.scope.forbiddenPaths) {
      DelegationScopeValidator.assertProtectedWorkspaceSafe(
        input.scope.forbiddenPaths,
        'forbiddenPaths'
      );
    }

    // 3. Agent identity must exist
    if (!this.agentIdentityManager.hasAgent(input.targetAgentId)) {
      throw new DelegationGovernanceError(
        'TARGET_AGENT_NOT_REGISTERED',
        `Target agent "${input.targetAgentId}" is not registered.`
      );
    }

    const delegationId = `del_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const now = Date.now();
    const expiresAt = now + input.ttlMs;

    // Construct standardized scope
    const scope: DelegationScope = {
      maxScopePercentage: input.scope.maxScopePercentage,
      allowedCapabilities: [...input.scope.allowedCapabilities],
      disallowedCapabilities: input.scope.disallowedCapabilities
        ? [...input.scope.disallowedCapabilities]
        : [],
      targetPaths: input.scope.targetPaths ? [...input.scope.targetPaths] : [],
      forbiddenPaths: input.scope.forbiddenPaths
        ? [...input.scope.forbiddenPaths, 'C:\\BOW\\shopofbow']
        : ['C:\\BOW\\shopofbow'],
      maxChildDelegationDepth: input.scope.maxChildDelegationDepth ?? 3,
      currentDepth: 0,
      allowSubDelegation: input.scope.allowSubDelegation ?? true,
    };

    DelegationScopeValidator.validateScope(scope);

    const record: DelegationRecord = {
      delegationId,
      ownerId: input.ownerId,
      issuerIdentity: {
        id: input.issuerId,
        type: isMasterOwner(input.issuerId) ? 'MASTER_OWNER' : 'AGENT',
      },
      targetAgentId: input.targetAgentId,
      targetDeviceId: input.targetDeviceId,
      parentDelegationId: input.parentDelegationId,
      requestedCapabilities: [...input.requestedCapabilities],
      grantedCapabilities: [], // Empty until authorized
      scope,
      createdAt: now,
      expiresAt,
      status: 'PENDING_AUTHORIZATION',
      revocationState: {
        isRevoked: false,
      },
      parentGoalId: input.parentGoalId,
      sessionId: input.sessionId,
      provenance: input.provenance ? [...input.provenance] : [`requested_by_${input.issuerId}`],
      schemaVersion: DELEGATION_SCHEMA_VERSION,
    };

    this.delegations.set(delegationId, record);

    globalAuditLedger.record({
      timestamp: new Date().toISOString(),
      actor: {
        userId: input.issuerId,
        role: isMasterOwner(input.issuerId) ? 'MASTER_OWNER' : 'AGENT',
        channel: 'delegation_runtime',
      },
      domain: 'DELEGATION',
      toolName: 'requestDelegation',
      classification: 'GOVERNANCE',
      argumentsHash: crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex'),
      policyDecision: 'PERMIT',
      executionStatus: 'SUCCESS',
    });

    return record;
  }

  /**
   * Authorizes a pending delegation request.
   * STRICT INVARIANT: Only Master Owner authority can authorize a root delegation.
   */
  public authorizeDelegation(
    delegationId: string,
    actorId: string,
    grantedCapabilities?: readonly string[]
  ): DelegationRecord {
    if (globalMasterHumanAuthority.isUserStopActive) {
      throw new DelegationGovernanceError(
        'USER_STOP_ACTIVE',
        'Cannot authorize delegation while USER_STOP is active.'
      );
    }

    if (!isMasterOwner(actorId)) {
      throw new DelegationGovernanceError(
        'UNAUTHORIZED_DELEGATION_APPROVAL',
        `Actor "${actorId}" is not the Master Owner. Only Master Owner authority can authorize delegations.`
      );
    }

    const delegation = this.delegations.get(delegationId);
    if (!delegation) {
      throw new DelegationGovernanceError(
        'DELEGATION_NOT_FOUND',
        `Delegation "${delegationId}" not found.`
      );
    }

    if (delegation.status !== 'PENDING_AUTHORIZATION') {
      throw new DelegationGovernanceError(
        'INVALID_STATE_TRANSITION',
        `Cannot authorize delegation in state "${delegation.status}". Must be PENDING_AUTHORIZATION.`
      );
    }

    // Default granted capabilities to allowed capabilities from scope if not explicitly filtered
    const granted = grantedCapabilities
      ? [...grantedCapabilities].filter((cap) =>
          delegation.scope.allowedCapabilities.includes(cap)
        )
      : [...delegation.scope.allowedCapabilities];

    const updated: DelegationRecord = {
      ...delegation,
      grantedCapabilities: granted,
      status: 'AUTHORIZED',
      provenance: [...delegation.provenance, `authorized_by_${actorId}`],
    };

    this.delegations.set(delegationId, updated);

    globalAuditLedger.record({
      timestamp: new Date().toISOString(),
      actor: {
        userId: actorId,
        role: 'MASTER_OWNER',
        channel: 'delegation_runtime',
      },
      domain: 'DELEGATION',
      toolName: 'authorizeDelegation',
      classification: 'GOVERNANCE',
      argumentsHash: crypto.createHash('sha256').update(delegationId).digest('hex'),
      policyDecision: 'PERMIT',
      executionStatus: 'SUCCESS',
    });

    return updated;
  }

  /**
   * Activates an authorized delegation for active execution.
   */
  public activateDelegation(delegationId: string, actorId: string): DelegationRecord {
    if (globalMasterHumanAuthority.isUserStopActive) {
      throw new DelegationGovernanceError(
        'USER_STOP_ACTIVE',
        'Cannot activate delegation while USER_STOP is active.'
      );
    }

    const delegation = this.delegations.get(delegationId);
    if (!delegation) {
      throw new DelegationGovernanceError(
        'DELEGATION_NOT_FOUND',
        `Delegation "${delegationId}" not found.`
      );
    }

    if (delegation.status !== 'AUTHORIZED') {
      throw new DelegationGovernanceError(
        'INVALID_STATE_TRANSITION',
        `Cannot activate delegation in state "${delegation.status}". Must be AUTHORIZED.`
      );
    }

    if (Date.now() >= delegation.expiresAt) {
      const expired: DelegationRecord = { ...delegation, status: 'EXPIRED' };
      this.delegations.set(delegationId, expired);
      throw new DelegationGovernanceError(
        'DELEGATION_EXPIRED',
        `Delegation "${delegationId}" has already expired.`
      );
    }

    const updated: DelegationRecord = {
      ...delegation,
      status: 'ACTIVE',
      provenance: [...delegation.provenance, `activated_by_${actorId}`],
    };

    this.delegations.set(delegationId, updated);

    globalAuditLedger.record({
      timestamp: new Date().toISOString(),
      actor: {
        userId: actorId,
        role: isMasterOwner(actorId) ? 'MASTER_OWNER' : 'AGENT',
        channel: 'delegation_runtime',
      },
      domain: 'DELEGATION',
      toolName: 'activateDelegation',
      classification: 'GOVERNANCE',
      argumentsHash: crypto.createHash('sha256').update(delegationId).digest('hex'),
      policyDecision: 'PERMIT',
      executionStatus: 'SUCCESS',
    });

    return updated;
  }

  // ---------------------------------------------------------------------------
  // 2. Child Delegation (Governed Sub-Delegation)
  // ---------------------------------------------------------------------------

  /**
   * Creates a governed child delegation from an active parent delegation.
   * STRICT INVARIANTS:
   * - CHILD_DELEGATION_SCOPE <= PARENT_DELEGATION_SCOPE
   * - CHILD_CAPABILITIES ⊆ PARENT_CAPABILITIES
   * - CHILD_EXPIRATION <= PARENT_EXPIRATION
   */
  public createChildDelegation(
    parentDelegationId: string,
    childInput: DelegationRequestInput,
    actorId: string
  ): DelegationRecord {
    if (globalMasterHumanAuthority.isUserStopActive) {
      throw new DelegationGovernanceError(
        'USER_STOP_ACTIVE',
        'Cannot create child delegation while USER_STOP is active.'
      );
    }

    const parent = this.delegations.get(parentDelegationId);
    if (!parent) {
      throw new DelegationGovernanceError(
        'PARENT_DELEGATION_NOT_FOUND',
        `Parent delegation "${parentDelegationId}" not found.`
      );
    }

    // Validate scope containment: child cannot widen scope, capabilities, or expiration
    DelegationScopeValidator.assertValidChildDelegation(parent, childInput);

    // Target agent must exist
    if (!this.agentIdentityManager.hasAgent(childInput.targetAgentId)) {
      throw new DelegationGovernanceError(
        'TARGET_AGENT_NOT_REGISTERED',
        `Child target agent "${childInput.targetAgentId}" is not registered.`
      );
    }

    const childId = `del_child_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const now = Date.now();
    const childExpiresAt = Math.min(now + childInput.ttlMs, parent.expiresAt);

    const childScope: DelegationScope = {
      maxScopePercentage: childInput.scope.maxScopePercentage,
      allowedCapabilities: [...childInput.scope.allowedCapabilities],
      disallowedCapabilities: [
        ...(childInput.scope.disallowedCapabilities || []),
        ...parent.scope.disallowedCapabilities,
      ],
      targetPaths: childInput.scope.targetPaths ? [...childInput.scope.targetPaths] : [],
      forbiddenPaths: [
        ...(childInput.scope.forbiddenPaths || []),
        ...parent.scope.forbiddenPaths,
        'C:\\BOW\\shopofbow',
      ],
      maxChildDelegationDepth: parent.scope.maxChildDelegationDepth,
      currentDepth: parent.scope.currentDepth + 1,
      allowSubDelegation: childInput.scope.allowSubDelegation ?? false,
    };

    DelegationScopeValidator.validateScope(childScope);

    // Child delegation is directly authorized and active within parent's granted scope
    const childRecord: DelegationRecord = {
      delegationId: childId,
      ownerId: parent.ownerId,
      issuerIdentity: {
        id: actorId,
        type: isMasterOwner(actorId) ? 'MASTER_OWNER' : 'AGENT',
      },
      targetAgentId: childInput.targetAgentId,
      targetDeviceId: childInput.targetDeviceId,
      parentDelegationId,
      requestedCapabilities: [...childInput.requestedCapabilities],
      grantedCapabilities: [...childScope.allowedCapabilities],
      scope: childScope,
      createdAt: now,
      expiresAt: childExpiresAt,
      status: 'ACTIVE',
      revocationState: {
        isRevoked: false,
      },
      parentGoalId: childInput.parentGoalId || parent.parentGoalId,
      sessionId: parent.sessionId,
      provenance: [
        ...parent.provenance,
        `child_delegated_to_${childInput.targetAgentId}_by_${actorId}`,
      ],
      schemaVersion: DELEGATION_SCHEMA_VERSION,
    };

    this.delegations.set(childId, childRecord);

    globalAuditLedger.record({
      timestamp: new Date().toISOString(),
      actor: {
        userId: actorId,
        role: isMasterOwner(actorId) ? 'MASTER_OWNER' : 'AGENT',
        channel: 'delegation_runtime',
      },
      domain: 'DELEGATION',
      toolName: 'createChildDelegation',
      classification: 'GOVERNANCE',
      argumentsHash: crypto.createHash('sha256').update(childId).digest('hex'),
      policyDecision: 'PERMIT',
      executionStatus: 'SUCCESS',
    });

    return childRecord;
  }

  // ---------------------------------------------------------------------------
  // 3. Capability Lease Issuance
  // ---------------------------------------------------------------------------

  /**
   * Grants a scoped, time-bounded capability lease under an active delegation.
   * INVARIANT: CAPABILITY != AUTHORIZATION.
   */
  public grantCapabilityLease(
    delegationId: string,
    capabilityId: string,
    actorId: string,
    ttlMs: number
  ): CapabilityLease {
    if (globalMasterHumanAuthority.isUserStopActive) {
      throw new DelegationGovernanceError(
        'USER_STOP_ACTIVE',
        'Cannot grant capability lease while USER_STOP is active.'
      );
    }

    const delegation = this.delegations.get(delegationId);
    if (!delegation) {
      throw new DelegationGovernanceError(
        'DELEGATION_NOT_FOUND',
        `Delegation "${delegationId}" not found.`
      );
    }

    if (delegation.status !== 'ACTIVE' || delegation.revocationState.isRevoked) {
      throw new DelegationGovernanceError(
        'DELEGATION_NOT_ACTIVE',
        `Cannot issue capability lease for delegation with status "${delegation.status}".`
      );
    }

    if (Date.now() >= delegation.expiresAt) {
      throw new DelegationGovernanceError(
        'DELEGATION_EXPIRED',
        'Cannot issue capability lease for expired delegation.'
      );
    }

    if (!delegation.grantedCapabilities.includes(capabilityId)) {
      throw new DelegationGovernanceError(
        'CAPABILITY_NOT_IN_DELEGATION',
        `Capability "${capabilityId}" is not granted in delegation "${delegationId}".`
      );
    }

    const lease = this.leaseManager.issueLease({
      delegationId,
      capabilityId,
      grantedBy: actorId,
      grantedTo: delegation.targetAgentId,
      deviceId: delegation.targetDeviceId,
      sessionId: delegation.sessionId,
      ttlMs,
      maxExpiresAt: delegation.expiresAt,
    });

    globalAuditLedger.record({
      timestamp: new Date().toISOString(),
      actor: {
        userId: actorId,
        role: isMasterOwner(actorId) ? 'MASTER_OWNER' : 'AGENT',
        channel: 'delegation_runtime',
      },
      domain: 'DELEGATION',
      toolName: 'grantCapabilityLease',
      classification: 'GOVERNANCE',
      argumentsHash: crypto.createHash('sha256').update(lease.leaseId).digest('hex'),
      policyDecision: 'PERMIT',
      executionStatus: 'SUCCESS',
    });

    return lease;
  }

  // ---------------------------------------------------------------------------
  // 4. Revocation & Expiration
  // ---------------------------------------------------------------------------

  /**
   * Revokes a delegation and all of its descendants immediately.
   * INVARIANT: REVOCATION > AGENT_INTENT.
   */
  public revokeDelegation(
    delegationId: string,
    revokedBy: string,
    reason?: string
  ): DelegationRecord {
    const delegation = this.delegations.get(delegationId);
    if (!delegation) {
      throw new DelegationGovernanceError(
        'DELEGATION_NOT_FOUND',
        `Delegation "${delegationId}" not found.`
      );
    }

    const now = Date.now();
    const updated: DelegationRecord = {
      ...delegation,
      status: 'REVOKED',
      revocationState: {
        isRevoked: true,
        revokedAt: now,
        revokedBy,
        reason: reason || 'Revoked by authority',
      },
    };

    this.delegations.set(delegationId, updated);
    this.completedOrTerminalIds.add(delegationId);

    // 1. Revoke all associated capability leases
    this.leaseManager.revokeLeasesForDelegation(delegationId, revokedBy, reason);

    // 2. Cascade revocation to all child delegations
    for (const [id, child] of this.delegations.entries()) {
      if (child.parentDelegationId === delegationId && child.status !== 'REVOKED') {
        this.revokeDelegation(id, revokedBy, `Cascaded revocation from parent ${delegationId}`);
      }
    }

    globalAuditLedger.record({
      timestamp: new Date().toISOString(),
      actor: {
        userId: revokedBy,
        role: isMasterOwner(revokedBy) ? 'MASTER_OWNER' : 'AGENT',
        channel: 'delegation_runtime',
      },
      domain: 'DELEGATION',
      toolName: 'revokeDelegation',
      classification: 'GOVERNANCE',
      argumentsHash: crypto.createHash('sha256').update(delegationId).digest('hex'),
      policyDecision: 'PERMIT',
      executionStatus: 'SUCCESS',
    });

    return updated;
  }

  /**
   * Completes a delegation and attaches execution evidence.
   */
  public completeDelegation(
    delegationId: string,
    evidence: DelegationEvidence,
    actorId: string
  ): DelegationRecord {
    const delegation = this.delegations.get(delegationId);
    if (!delegation) {
      throw new DelegationGovernanceError(
        'DELEGATION_NOT_FOUND',
        `Delegation "${delegationId}" not found.`
      );
    }

    if (delegation.status !== 'ACTIVE') {
      throw new DelegationGovernanceError(
        'CANNOT_COMPLETE_INACTIVE_DELEGATION',
        `Cannot complete delegation in state "${delegation.status}". Must be ACTIVE.`
      );
    }

    const updated: DelegationRecord = {
      ...delegation,
      status: 'COMPLETED',
      resultEvidence: evidence,
    };

    this.delegations.set(delegationId, updated);
    this.completedOrTerminalIds.add(delegationId);

    // Revoke any remaining active leases upon completion
    this.leaseManager.revokeLeasesForDelegation(
      delegationId,
      actorId,
      'Delegation completed successfully'
    );

    globalAuditLedger.record({
      timestamp: new Date().toISOString(),
      actor: {
        userId: actorId,
        role: isMasterOwner(actorId) ? 'MASTER_OWNER' : 'AGENT',
        channel: 'delegation_runtime',
      },
      domain: 'DELEGATION',
      toolName: 'completeDelegation',
      classification: 'GOVERNANCE',
      argumentsHash: crypto.createHash('sha256').update(delegationId).digest('hex'),
      policyDecision: 'PERMIT',
      executionStatus: 'SUCCESS',
    });

    return updated;
  }

  // ---------------------------------------------------------------------------
  // 5. Replay Protection & Retrieval
  // ---------------------------------------------------------------------------

  public getDelegation(delegationId: string): DelegationRecord | undefined {
    return this.delegations.get(delegationId);
  }

  public isDelegationActive(delegationId: string, now: number = Date.now()): boolean {
    const d = this.delegations.get(delegationId);
    if (!d) return false;
    if (d.status !== 'ACTIVE') return false;
    if (d.revocationState.isRevoked) return false;
    if (now >= d.expiresAt) return false;
    return true;
  }

  public assertActiveDelegation(
    delegationId: string,
    sessionId: string,
    now: number = Date.now()
  ): DelegationRecord {
    const delegation = this.delegations.get(delegationId);
    if (!delegation) {
      throw new DelegationGovernanceError(
        'DELEGATION_NOT_FOUND',
        `Delegation "${delegationId}" not found.`
      );
    }

    if (delegation.sessionId !== sessionId) {
      throw new DelegationGovernanceError(
        'CROSS_SESSION_DELEGATION_REJECTED',
        `Delegation belongs to session "${delegation.sessionId}", cannot be accessed by session "${sessionId}".`
      );
    }

    if (delegation.revocationState.isRevoked || delegation.status === 'REVOKED') {
      throw new DelegationGovernanceError(
        'DELEGATION_REVOKED',
        `Delegation "${delegationId}" is revoked. REVOCATION > AGENT_INTENT.`
      );
    }

    if (now >= delegation.expiresAt || delegation.status === 'EXPIRED') {
      throw new DelegationGovernanceError(
        'DELEGATION_EXPIRED',
        `Delegation "${delegationId}" has expired.`
      );
    }

    if (delegation.status !== 'ACTIVE') {
      throw new DelegationGovernanceError(
        'DELEGATION_NOT_ACTIVE',
        `Delegation "${delegationId}" is in state "${delegation.status}", not ACTIVE.`
      );
    }

    return delegation;
  }

  // ---------------------------------------------------------------------------
  // 6. Persistence & Lifecycle
  // ---------------------------------------------------------------------------

  public saveDurableState(ownerSessionId: string): void {
    const allDelegations = Array.from(this.delegations.values());
    const allLeases = Array.from(
      new Set(allDelegations.flatMap((d) => this.leaseManager.getLeasesForDelegation(d.delegationId)))
    );

    this.store.saveState(ownerSessionId, allDelegations, allLeases);
  }

  public restoreDurableState(): boolean {
    const loaded = this.store.loadState();
    if (!loaded) return false;

    this.delegations.clear();
    for (const d of loaded.delegations) {
      this.delegations.set(d.delegationId, d);
      if (d.status === 'COMPLETED' || d.status === 'REVOKED' || d.status === 'EXPIRED') {
        this.completedOrTerminalIds.add(d.delegationId);
      }
    }

    this.leaseManager.clear();
    for (const l of loaded.capabilityLeases) {
      // Re-hydrate leases into leaseManager
      this.leaseManager.issueLease({
        delegationId: l.delegationId,
        capabilityId: l.capabilityId,
        grantedBy: l.grantedBy,
        grantedTo: l.grantedTo,
        deviceId: l.deviceId,
        sessionId: l.sessionId,
        ttlMs: Math.max(0, l.expiresAt - l.issuedAt),
      });
      if (l.isRevoked) {
        this.leaseManager.revokeLease(l.leaseId, l.revokedBy || 'restore', l.revocationReason);
      }
    }

    return true;
  }

  public clear(): void {
    this.delegations.clear();
    this.completedOrTerminalIds.clear();
    this.leaseManager.clear();
    this.agentIdentityManager.clear();
    this.deviceRegistry.clear();
  }
}

export const globalDelegationGovernance = new DelegationGovernanceRuntime();
