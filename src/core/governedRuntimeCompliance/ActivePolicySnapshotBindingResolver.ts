// src/core/governedRuntimeCompliance/ActivePolicySnapshotBindingResolver.ts
// Component 1190: ActivePolicySnapshotBindingResolver (REAL)
//
// Resolves and cryptographically binds the active canonical policy version and hash
// matching the exact execution context and timestamp. Eliminates version confusion and TOCTOU.
// Tra cứu và liên kết mã hóa phiên bản và mã băm chính sách chuẩn đang hoạt động
// tương ứng với ngữ cảnh và thời điểm thực thi. Triệt tiêu sự nhầm lẫn phiên bản và lỗi TOCTOU.

import {
  ActivePolicyBinding,
  PolicySnapshotUnavailableError,
  PolicyVersionBindingMismatchError,
  EmergencyStopActiveError,
  TenantAccessForbiddenError,
} from './GovernedRuntimeComplianceTypes.js';
import type { PolicyDomain } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
import type { PolicyLifecycleState } from '../governedPolicyLifecycle/GovernedPolicyLifecycleTypes.js';

export interface PolicySnapshotProvider {
  getActivePolicy(
    tenantId: string,
    domain: PolicyDomain
  ): Promise<{
    version: number;
    canonicalPolicyHash: string;
    state: PolicyLifecycleState;
  } | null>;
}

export interface ResolverEmergencyStopProvider {
  isEmergencyStopActive(): boolean;
}

export class ActivePolicySnapshotBindingResolver {
  private readonly storeProvider: PolicySnapshotProvider;
  private readonly stopProvider?: ResolverEmergencyStopProvider;

  constructor(storeProvider: PolicySnapshotProvider, stopProvider?: ResolverEmergencyStopProvider) {
    this.storeProvider = storeProvider;
    this.stopProvider = stopProvider;
  }

  private assertEmergencyStopInactive(): void {
    if (!this.stopProvider) return;
    let active = true;
    try {
      const result = this.stopProvider.isEmergencyStopActive();
      if (typeof result !== 'boolean') {
        active = true;
      } else {
        active = result;
      }
    } catch (_err) {
      active = true;
    }
    if (active) {
      throw new EmergencyStopActiveError(
        'Policy binding resolution halted: EMERGENCY_STOP is currently active.'
      );
    }
  }

  // Resolves the currently active canonical policy snapshot and produces an immutable binding.
  // Tra cứu ảnh chụp chính sách chuẩn đang hoạt động và tạo ra một liên kết bất biến.
  public async resolveActiveBinding(
    tenantId: string,
    policyDomain: PolicyDomain,
    expectedVersion?: number,
    expectedPolicyHash?: string
  ): Promise<ActivePolicyBinding> {
    this.assertEmergencyStopInactive();

    if (!tenantId || typeof tenantId !== 'string' || tenantId.trim().length === 0) {
      throw new TenantAccessForbiddenError('Tenant ID must be specified for policy snapshot resolution.');
    }

    const snapshot = await this.storeProvider.getActivePolicy(tenantId, policyDomain);
    if (!snapshot) {
      throw new PolicySnapshotUnavailableError(
        `No active canonical policy found for tenant '${tenantId}' in domain '${policyDomain}'.`
      );
    }

    // Version mismatch defense: verify resolved version equals expected version if provided
    // Phòng thủ không khớp phiên bản: xác minh phiên bản tra cứu khớp với phiên bản kỳ vọng
    if (expectedVersion !== undefined && snapshot.version !== expectedVersion) {
      throw new PolicyVersionBindingMismatchError(
        `Policy version mismatch: expected version ${expectedVersion}, but store resolved version ${snapshot.version}.`
      );
    }

    // Canonical policy hash defense: verify hash matches
    // Phòng thủ mã băm chính sách chuẩn: xác minh mã băm hoàn toàn trùng khớp
    if (expectedPolicyHash !== undefined && snapshot.canonicalPolicyHash !== expectedPolicyHash) {
      throw new PolicyVersionBindingMismatchError(
        `Canonical policy hash mismatch: expected '${expectedPolicyHash}', but store resolved '${snapshot.canonicalPolicyHash}'.`
      );
    }

    const binding: ActivePolicyBinding = Object.freeze({
      tenantId,
      policyDomain,
      policyVersion: snapshot.version,
      canonicalPolicyHash: snapshot.canonicalPolicyHash,
      boundAt: new Date().toISOString(),
      lifecycleState: snapshot.state,
    });

    return binding;
  }
}
