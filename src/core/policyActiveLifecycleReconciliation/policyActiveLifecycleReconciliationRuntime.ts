// src/core/policyActiveLifecycleReconciliation/policyActiveLifecycleReconciliationRuntime.ts
// BOWCON V4.0 — MS-1.3.73: GOVERNED ACTIVE POLICY LIFECYCLE RECONCILIATION & CONSISTENCY VERIFICATION
//
// Master Active Lifecycle Reconciliation Runtime Coordinator (Component 828).
// Orchestrates deterministic verification across durable state, active runtime snapshots,
// PDP evaluation, PEP enforcement, rollback lifecycles, cryptographic provenance, and audit logs.
//
// Core Authority Invariants:
// - OBSERVATION != EVIDENCE != INVESTIGATION != DECISION != AUTHORIZATION
// - ACTIVE_POLICY != RUNTIME_POLICY_SNAPSHOT != PDP_STATE != PEP_ENFORCEMENT_STATE
// - RECONCILIATION != POLICY_AUTHORITY
// - RECONCILIATION != POLICY_MUTATION
// - RECONCILIATION != AUTONOMOUS_REPAIR
// - HUMAN_AUTHORIZATION > AUTONOMOUS_AUTHORIZATION
// - USER_STOP > EVERYTHING
// - ZERO AUTONOMOUS POLICY MUTATION
// - ZERO AUTONOMOUS POLICY ACTIVATION
// - ZERO AUTONOMOUS ROLLBACK / SUNSET / RECOVERY
// - ZERO AUTONOMOUS REPAIR
// - ZERO DIRECT TOOL EXECUTION
// - FAIL_CLOSED

import crypto from 'node:crypto';
import type { RuntimePolicySnapshot } from '../policyActiveRuntime/policyActiveRuntimeTypes.js';
import type {
  LifecycleReconciliationResult,
  ReconciliationProvenanceRecord,
  PolicyActiveLifecycleReconciliationOptions,
} from './policyActiveLifecycleReconciliationTypes.js';
import { createReconciliationProvenanceId } from './policyActiveLifecycleReconciliationTypes.js';
import { PolicyActiveLifecycleConsistencyEngine } from './policyActiveLifecycleConsistencyEngine.js';
import { PolicyActiveLifecycleReconciliationAuditEngine } from './policyActiveLifecycleReconciliationAuditEngine.js';

export class PolicyActiveLifecycleReconciliationRuntime {
  private readonly consistencyEngine: PolicyActiveLifecycleConsistencyEngine;
  private readonly auditEngine: PolicyActiveLifecycleReconciliationAuditEngine;
  private readonly isUserStopActiveFn?: () => boolean;

  // In-memory append-only cryptographic provenance chain for reconciliation events
  private readonly provenanceChains: Map<string, ReconciliationProvenanceRecord[]> = new Map();

  constructor(
    options?: PolicyActiveLifecycleReconciliationOptions,
    consistencyEngine?: PolicyActiveLifecycleConsistencyEngine,
    auditEngine?: PolicyActiveLifecycleReconciliationAuditEngine
  ) {
    this.isUserStopActiveFn = options?.isUserStopActive;
    this.consistencyEngine = consistencyEngine ?? new PolicyActiveLifecycleConsistencyEngine(options);
    this.auditEngine = auditEngine ?? new PolicyActiveLifecycleReconciliationAuditEngine(options);
  }

  private assertUserStopInactive(tenantPartition?: string): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      if (tenantPartition) {
        try {
          this.auditEngine.recordEvent({
            eventType: 'USER_STOP_BLOCKED',
            tenantPartition,
            details: { reason: 'Operation suspended by active USER_STOP signal' },
          });
        } catch {
          // Ignore audit errors when aborting for USER_STOP
        }
      }
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Active policy lifecycle reconciliation suspended by USER_STOP supremacy');
    }
  }

  private appendProvenanceRecord(
    tenantPartition: string,
    result: LifecycleReconciliationResult
  ): ReconciliationProvenanceRecord {
    let chain = this.provenanceChains.get(tenantPartition);
    if (!chain) {
      chain = [];
      this.provenanceChains.set(tenantPartition, chain);
    }

    const previousHash =
      chain.length > 0
        ? chain[chain.length - 1].recordHash
        : '0000000000000000000000000000000000000000000000000000000000000000';

    const timestamp = new Date().toISOString();
    const payloadHash = crypto
      .createHash('sha256')
      .update(
        JSON.stringify({
          reconciliationId: result.reconciliationId,
          status: result.status,
          isConsistent: result.isConsistent,
          activePolicyStateId: result.activePolicyStateId,
          runtimeSnapshotId: result.runtimeSnapshotId,
          driftsCount: result.detectedDrifts.length,
          provenanceHash: result.provenanceHash,
        })
      )
      .digest('hex');

    const recordHash = crypto
      .createHash('sha256')
      .update(
        `${tenantPartition}:${result.reconciliationId}:${result.status}:${timestamp}:${previousHash}:${payloadHash}`
      )
      .digest('hex');

    const record: ReconciliationProvenanceRecord = Object.freeze({
      provenanceId: createReconciliationProvenanceId(`rprv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`),
      tenantPartition,
      reconciliationId: result.reconciliationId,
      status: result.status,
      eventType: 'LIFECYCLE_RECONCILIATION_RECORDED',
      timestamp,
      previousHash,
      recordHash,
      payloadHash,
    });

    chain.push(record);
    return record;
  }

  /**
   * Reconciles active policy lifecycle state against runtime, PDP, PEP, rollback, and provenance.
   * Strictly read-only; never mutates policy or autonomously repairs drift.
   */
  public reconcileLifecycle(
    tenantPartition: string,
    options?: {
      explicitSnapshot?: RuntimePolicySnapshot | null;
      actorUserId?: string;
    }
  ): LifecycleReconciliationResult {
    // 1. Mandatory USER_STOP supremacy check
    this.assertUserStopInactive(tenantPartition);

    // 2. Audit: reconciliation initiated
    this.auditEngine.recordEvent({
      eventType: 'LIFECYCLE_RECONCILIATION_STARTED',
      tenantPartition,
      actorUserId: options?.actorUserId,
      details: { tenantPartition },
    });

    // 3. Execute deterministic consistency evaluation
    const result = this.consistencyEngine.evaluateLifecycleConsistency(
      tenantPartition,
      options?.explicitSnapshot
    );

    // 4. Record append-only provenance
    this.appendProvenanceRecord(tenantPartition, result);

    // 5. Audit: record outcome
    if (result.isConsistent) {
      this.auditEngine.recordEvent({
        eventType: 'LIFECYCLE_RECONCILIATION_PASSED',
        tenantPartition,
        actorUserId: options?.actorUserId,
        details: {
          reconciliationId: result.reconciliationId,
          activePolicyStateId: result.activePolicyStateId,
          runtimeSnapshotId: result.runtimeSnapshotId,
          status: result.status,
          verifiedBoundaries: result.verifiedBoundaries,
        },
      });
    } else {
      if (result.status === 'TENANT_MISMATCH') {
        this.auditEngine.recordEvent({
          eventType: 'TENANT_ISOLATION_BLOCKED',
          tenantPartition,
          actorUserId: options?.actorUserId,
          details: {
            reconciliationId: result.reconciliationId,
            blockingReasons: result.blockingReasons,
          },
        });
      } else if (result.status === 'PROVENANCE_INVALID') {
        this.auditEngine.recordEvent({
          eventType: 'PROVENANCE_TAMPER_BLOCKED',
          tenantPartition,
          actorUserId: options?.actorUserId,
          details: {
            reconciliationId: result.reconciliationId,
            blockingReasons: result.blockingReasons,
          },
        });
      } else {
        this.auditEngine.recordEvent({
          eventType: 'LIFECYCLE_RECONCILIATION_BLOCKED',
          tenantPartition,
          actorUserId: options?.actorUserId,
          details: {
            reconciliationId: result.reconciliationId,
            status: result.status,
            driftsCount: result.detectedDrifts.length,
            blockingReasons: result.blockingReasons,
          },
        });
      }
    }

    return result;
  }

  /**
   * Fast Boolean check: returns true if lifecycle is completely consistent and 0 drifts detected.
   */
  public verifyConsistency(tenantPartition: string): boolean {
    this.assertUserStopInactive(tenantPartition);
    const result = this.reconcileLifecycle(tenantPartition);
    return result.isConsistent;
  }

  /**
   * Retrieves the reconciliation provenance chain for a tenant.
   */
  public getReconciliationProvenance(tenantPartition: string): readonly ReconciliationProvenanceRecord[] {
    this.assertUserStopInactive(tenantPartition);
    return Object.freeze([...(this.provenanceChains.get(tenantPartition) ?? [])]);
  }

  /**
   * Verifies the cryptographic integrity of the reconciliation provenance chain.
   */
  public verifyReconciliationProvenance(tenantPartition: string): boolean {
    this.assertUserStopInactive(tenantPartition);
    const chain = this.provenanceChains.get(tenantPartition);
    if (!chain || chain.length === 0) {
      return true;
    }

    let expectedPrev = '0000000000000000000000000000000000000000000000000000000000000000';
    for (const record of chain) {
      if (record.previousHash !== expectedPrev) {
        return false;
      }
      const computedHash = crypto
        .createHash('sha256')
        .update(
          `${record.tenantPartition}:${record.reconciliationId}:${record.status}:${record.timestamp}:${record.previousHash}:${record.payloadHash}`
        )
        .digest('hex');

      if (computedHash !== record.recordHash) {
        return false;
      }
      expectedPrev = record.recordHash;
    }

    return true;
  }
}
