// src/core/governedFederatedKnowledgeState/FederatedKnowledgeSecurityBoundary.ts
// BOWCON V4.0 — MS-1.5.16: GOVERNED FEDERATED KNOWLEDGE STATE & COLLECTIVE INTELLIGENCE ENGINE
// Component 1135 — REAL
//
// EN: Synchronous security boundary evaluating USER_STOP, EMERGENCY_STOP, tenant/session isolation,
//     and Windows reserved path safety across 15 critical checkpoints.
// VI: Ranh giới bảo mật đồng bộ đánh giá USER_STOP, EMERGENCY_STOP, cô lập tenant/phiên,
//     và an toàn đường dẫn thiết bị Windows qua 15 điểm kiểm tra trọng yếu.

import {
  FederatedKnowledgeCheckpoint,
  GovernedFederatedKnowledgeStateUserStopError,
  GovernedFederatedKnowledgeStateEmergencyStopError,
  GovernedFederatedKnowledgeStateTenantIsolationError,
  GovernedFederatedKnowledgeStateSessionIsolationError,
} from './GovernedFederatedKnowledgeStateTypes.js';

export class FederatedKnowledgeSecurityBoundary {
  private emergencyStopActive = false;
  private userStopActive = false;

  public setEmergencyStop(active: boolean): void {
    this.emergencyStopActive = active;
  }

  public isEmergencyStopActive(): boolean {
    return this.emergencyStopActive;
  }

  public setUserStop(active: boolean): void {
    this.userStopActive = active;
  }

  public isUserStopActive(): boolean {
    return this.userStopActive;
  }

  /**
   * EN: Synchronously asserts safety gates across all 15 critical checkpoints.
   * VI: Khẳng định đồng bộ các cổng an toàn qua toàn bộ 15 điểm kiểm tra trọng yếu.
   */
  public assertStopInactive(
    checkpoint: FederatedKnowledgeCheckpoint,
    tenantId?: string,
    stateId?: string
  ): void {
    // 1. EMERGENCY_STOP has absolute priority
    if (this.emergencyStopActive) {
      throw new GovernedFederatedKnowledgeStateEmergencyStopError(
        `EMERGENCY_STOP active at checkpoint '${checkpoint}'`,
        tenantId,
        stateId
      );
    }

    // 2. USER_STOP has immediate priority
    if (this.userStopActive) {
      throw new GovernedFederatedKnowledgeStateUserStopError(
        `USER_STOP active at checkpoint '${checkpoint}'`,
        tenantId,
        stateId
      );
    }
  }

  /**
   * EN: Validates tenant identifier and prevents path traversal & reserved Windows names.
   * VI: Xác thực mã định danh tenant và ngăn chặn duyệt đường dẫn cùng các tên dành riêng Windows.
   */
  public assertTenantSafe(tenantId: string): void {
    if (!tenantId || tenantId.trim().length === 0) {
      throw new GovernedFederatedKnowledgeStateTenantIsolationError('Tenant ID cannot be empty');
    }

    if (tenantId.includes('..') || tenantId.includes('/') || tenantId.includes('\\') || tenantId.includes('\0')) {
      throw new GovernedFederatedKnowledgeStateTenantIsolationError(
        `Path traversal or invalid characters in tenant ID: '${tenantId}'`,
        tenantId
      );
    }

    const reservedWindowsNames = [
      'CON',
      'PRN',
      'AUX',
      'NUL',
      'COM1',
      'COM2',
      'COM3',
      'COM4',
      'COM5',
      'COM6',
      'COM7',
      'COM8',
      'COM9',
      'LPT1',
      'LPT2',
      'LPT3',
      'LPT4',
      'LPT5',
      'LPT6',
      'LPT7',
      'LPT8',
      'LPT9',
    ];
    if (reservedWindowsNames.includes(tenantId.toUpperCase())) {
      throw new GovernedFederatedKnowledgeStateTenantIsolationError(
        `Reserved Windows device name rejected as tenant ID: '${tenantId}'`,
        tenantId
      );
    }
  }

  /**
   * EN: Asserts session isolation safety.
   * VI: Khẳng định an toàn cô lập phiên.
   */
  public assertSessionSafe(sessionId: string): void {
    if (!sessionId || sessionId.trim().length === 0) {
      throw new GovernedFederatedKnowledgeStateSessionIsolationError('Session ID cannot be empty');
    }
    if (sessionId.includes('..') || sessionId.includes('\0')) {
      throw new GovernedFederatedKnowledgeStateSessionIsolationError(
        `Invalid characters in session ID: '${sessionId}'`
      );
    }
  }

  /**
   * EN: Asserts matching tenant identifiers across entities.
   * VI: Khẳng định các mã định danh tenant khớp nhau giữa các thực thể.
   */
  public assertTenantIsolation(primaryTenantId: string, ...otherTenantIds: string[]): void {
    this.assertTenantSafe(primaryTenantId);
    for (const tid of otherTenantIds) {
      this.assertTenantSafe(tid);
      if (tid !== primaryTenantId) {
        throw new GovernedFederatedKnowledgeStateTenantIsolationError(
          `Tenant isolation violation: '${tid}' does not match primary '${primaryTenantId}'`,
          primaryTenantId
        );
      }
    }
  }

  /**
   * EN: Asserts matching session identifiers across entities.
   * VI: Khẳng định các mã định danh phiên khớp nhau giữa các thực thể.
   */
  public assertSessionIsolation(primarySessionId: string, ...otherSessionIds: string[]): void {
    this.assertSessionSafe(primarySessionId);
    for (const sid of otherSessionIds) {
      this.assertSessionSafe(sid);
      if (sid !== primarySessionId) {
        throw new GovernedFederatedKnowledgeStateSessionIsolationError(
          `Session isolation violation: '${sid}' does not match primary '${primarySessionId}'`
        );
      }
    }
  }
}
