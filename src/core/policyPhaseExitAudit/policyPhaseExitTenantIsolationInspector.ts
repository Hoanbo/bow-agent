// src/core/policyPhaseExitAudit/policyPhaseExitTenantIsolationInspector.ts
// BOWCON V4.0 — MS-1.3.78: INDEPENDENT PHASE 1.3 EXIT EVIDENCE AUDIT & GOVERNANCE READINESS CERTIFICATION
//
// Tenant Isolation & Security Boundary Inspector (Component 892).
// Independently tests resolveUserPartition and verifies path traversal, null byte, and reserved name defense.
// Strictly read-only; alters ZERO state.
//
// Core Authority Invariants:
// - TENANT_ISOLATION_ENFORCED
// - USER_STOP > EVERYTHING
// - FAIL_CLOSED

import path from 'node:path';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';

export interface TenantIsolationFinding {
  readonly pathTraversalBlocked: boolean;
  readonly nullByteBlocked: boolean;
  readonly reservedDeviceBlocked: boolean;
  readonly anonymousBlocked: boolean;
  readonly crossTenantSegregationVerified: boolean;
  readonly clean: boolean;
  readonly anomalies: readonly string[];
}

export class PolicyPhaseExitTenantIsolationInspector {
  private readonly isUserStopActiveFn?: () => boolean;

  constructor(options?: { readonly isUserStopActive?: () => boolean }) {
    this.isUserStopActiveFn = options?.isUserStopActive;
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Tenant isolation inspector suspended by USER_STOP supremacy');
    }
  }

  /**
   * Independently probes tenant isolation boundaries and verifies fail-closed security.
   */
  public probeIsolation(): TenantIsolationFinding {
    this.assertUserStopInactive();

    const anomalies: string[] = [];
    const baseDir = path.resolve('data/partitions_probe');

    // 1. Path traversal probe
    let traversalBlocked = false;
    try {
      resolveUserPartition('../../../etc/passwd', baseDir);
    } catch {
      traversalBlocked = true;
    }
    if (!traversalBlocked) anomalies.push('Path traversal was not rejected');

    // 2. Null byte probe
    let nullByteBlocked = false;
    try {
      resolveUserPartition('tenant\0malicious', baseDir);
    } catch {
      nullByteBlocked = true;
    }
    if (!nullByteBlocked) anomalies.push('Null byte in tenantId was not rejected');

    // 3. Windows reserved device name probe
    let reservedDeviceBlocked = false;
    try {
      resolveUserPartition('CON', baseDir);
    } catch {
      reservedDeviceBlocked = true;
    }
    if (!reservedDeviceBlocked) anomalies.push('Windows reserved device name CON was not rejected');

    // 4. Anonymous / Empty probe
    let anonymousBlocked = false;
    try {
      resolveUserPartition('   ', baseDir);
    } catch {
      anonymousBlocked = true;
    }
    if (!anonymousBlocked) anomalies.push('Whitespace-only tenantId was not rejected');

    // 5. Cross-tenant segregation check
    let crossTenantSegregationVerified = false;
    try {
      const pA = resolveUserPartition('tenant_alpha_audit', baseDir);
      const pB = resolveUserPartition('tenant_beta_audit', baseDir);
      crossTenantSegregationVerified = pA.partitionKey !== pB.partitionKey;
    } catch {
      crossTenantSegregationVerified = false;
    }
    if (!crossTenantSegregationVerified) anomalies.push('Cross-tenant partition keys collided');

    const clean = anomalies.length === 0;

    return Object.freeze({
      pathTraversalBlocked: traversalBlocked,
      nullByteBlocked,
      reservedDeviceBlocked,
      anonymousBlocked,
      crossTenantSegregationVerified,
      clean,
      anomalies: Object.freeze(anomalies),
    });
  }
}
