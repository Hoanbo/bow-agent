// src/core/governedExecution/executionLeaseManager.ts
// BOWCON V4.0 — MS-1.5.09: EXECUTION LEASE MANAGER
// Component 1061 — REAL
//
// EN: Governed execution lease management engine. Enforces time-to-live expiration,
//     single-use nonces, anti-replay guards, tenant/session scoping, and synchronous USER_STOP invalidation.
// VI: Động cơ quản lý hợp đồng thuê thực thi có quản trị. Thực thi hết hạn TTL,
//     nonce dùng một lần, bảo vệ chống lặp lại (anti-replay), phân vùng tenant/phiên và vô hiệu hóa tức thì khi USER_STOP.

import crypto from 'node:crypto';
import {
  type ExecutionLease,
  type ExecutionOperationKind,
  ExecutionLeaseError,
  ExecutionUserStopError,
  ExecutionConcurrencyError,
  ExecutionTenantIsolationError,
  ExecutionSessionIsolationError,
  DEFAULT_EXECUTION_LEASE_TTL_MS,
  computeLeaseSignatureHash,
} from './executionTypes.js';
import type { GroundedPlanRiskLevel } from '../groundedPlanning/groundedPlanTypes.js';
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';

export interface IssueLeaseParams {
  readonly tenantId: string;
  readonly sessionId: string;
  readonly taskId: string;
  readonly stepId: string;
  readonly stepIndex: number;
  readonly operationKind: ExecutionOperationKind;
  readonly riskLevel: GroundedPlanRiskLevel;
  readonly ttlMs?: number;
  readonly singleUse?: boolean;
}

export class ExecutionLeaseManager {
  private readonly leases = new Map<string, ExecutionLease>();
  private readonly consumedLeaseIds = new Set<string>();
  private readonly userStopProvider: () => boolean;

  constructor(options?: { readonly userStopProvider?: () => boolean }) {
    this.userStopProvider = options?.userStopProvider ?? (() => globalMasterHumanAuthority.isUserStopActive);
  }

  /**
   * EN: Issues a new cryptographically signed execution lease.
   * VI: Cấp một hợp đồng thuê thực thi mới được ký mật mã.
   */
  public issueLease(params: IssueLeaseParams): ExecutionLease {
    if (this.userStopProvider()) {
      throw new ExecutionUserStopError('issue_lease');
    }

    const {
      tenantId,
      sessionId,
      taskId,
      stepId,
      stepIndex,
      operationKind,
      riskLevel,
      ttlMs = DEFAULT_EXECUTION_LEASE_TTL_MS,
      singleUse = true,
    } = params;

    const leaseId = `lease_${tenantId}_${taskId}_${stepIndex}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const issuedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + ttlMs).toISOString();
    const nonce = crypto.randomBytes(16).toString('hex');

    const rawLease = {
      leaseId,
      tenantId,
      sessionId,
      taskId,
      stepId,
      stepIndex,
      operationKind,
      riskLevel,
      issuedAt,
      expiresAt,
      nonce,
      singleUse,
      isConsumed: false,
      version: 1,
    };

    const signatureHash = computeLeaseSignatureHash(rawLease);
    const lease: ExecutionLease = Object.freeze({
      ...rawLease,
      signatureHash,
    });

    this.leases.set(leaseId, lease);
    return lease;
  }

  /**
   * EN: Consumes an active execution lease, guaranteeing single-use execution semantics.
   * VI: Tiêu thụ một hợp đồng thuê thực thi đang hoạt động, đảm bảo ngữ nghĩa thực thi một lần duy nhất.
   */
  public consumeLease(leaseId: string, expectedVersion: number, context: { tenantId: string; sessionId: string }): ExecutionLease {
    if (this.userStopProvider()) {
      throw new ExecutionUserStopError('consume_lease');
    }

    const lease = this.leases.get(leaseId);
    if (!lease) {
      if (this.consumedLeaseIds.has(leaseId)) {
        throw new ExecutionLeaseError(`Lease "${leaseId}" has already been consumed and cannot be replayed`);
      }
      throw new ExecutionLeaseError(`Execution lease "${leaseId}" does not exist or was purged`);
    }

    // Tenant & Session Isolation
    if (lease.tenantId !== context.tenantId) {
      throw new ExecutionTenantIsolationError(context.tenantId, lease.tenantId);
    }
    if (lease.sessionId !== context.sessionId) {
      throw new ExecutionSessionIsolationError(context.sessionId, lease.sessionId);
    }

    // Expiration check
    if (Date.now() > Date.parse(lease.expiresAt)) {
      this.leases.delete(leaseId);
      throw new ExecutionLeaseError(`Execution lease "${leaseId}" has expired at ${lease.expiresAt}`);
    }

    // Replay / consumption check
    if (lease.isConsumed || this.consumedLeaseIds.has(leaseId)) {
      throw new ExecutionLeaseError(`Execution lease "${leaseId}" has already been consumed (replay rejected)`);
    }

    // OCC CAS check
    if (lease.version !== expectedVersion) {
      throw new ExecutionConcurrencyError(expectedVersion, lease.version, { leaseId });
    }

    // Cryptographic signature integrity verification
    const expectedSig = computeLeaseSignatureHash({
      leaseId: lease.leaseId,
      tenantId: lease.tenantId,
      sessionId: lease.sessionId,
      taskId: lease.taskId,
      stepId: lease.stepId,
      stepIndex: lease.stepIndex,
      operationKind: lease.operationKind,
      riskLevel: lease.riskLevel,
      issuedAt: lease.issuedAt,
      expiresAt: lease.expiresAt,
      nonce: lease.nonce,
      singleUse: lease.singleUse,
      isConsumed: lease.isConsumed,
      version: lease.version,
    });

    if (lease.signatureHash !== expectedSig) {
      throw new ExecutionLeaseError(`Execution lease "${leaseId}" signature verification failed (tamper detected)`);
    }

    const consumedAt = new Date().toISOString();
    const updatedLease: ExecutionLease = Object.freeze({
      ...lease,
      isConsumed: true,
      consumedAt,
      version: lease.version + 1,
    });

    if (lease.singleUse) {
      this.leases.delete(leaseId);
      this.consumedLeaseIds.add(leaseId);
    } else {
      this.leases.set(leaseId, updatedLease);
    }

    return updatedLease;
  }

  /**
   * EN: Explicitly invalidates a lease or all leases for a session.
   * VI: Vô hiệu hóa tường minh một hợp đồng thuê hoặc toàn bộ hợp đồng thuê của một phiên.
   */
  public invalidateLeasesForSession(tenantId: string, sessionId: string): number {
    let invalidated = 0;
    for (const [id, lease] of this.leases.entries()) {
      if (lease.tenantId === tenantId && lease.sessionId === sessionId) {
        this.leases.delete(id);
        this.consumedLeaseIds.add(id);
        invalidated++;
      }
    }
    return invalidated;
  }

  /**
   * EN: Retrieves an active lease if valid.
   * VI: Lấy một hợp đồng thuê đang hoạt động nếu hợp lệ.
   */
  public getLease(leaseId: string): ExecutionLease | undefined {
    return this.leases.get(leaseId);
  }
}
