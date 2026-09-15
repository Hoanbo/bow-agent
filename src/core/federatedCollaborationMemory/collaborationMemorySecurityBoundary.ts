// src/core/federatedCollaborationMemory/collaborationMemorySecurityBoundary.ts
// BOWCON V4.0 — MS-1.5.15: NATIVE GOVERNED FEDERATED COLLABORATION MEMORY, SHARED CONTEXT & CONSENSUS GOVERNANCE ENGINE
// Component 1125 — REAL
//
// EN: Synchronous security boundary evaluating USER_STOP, EMERGENCY_STOP, tenant/session isolation,
//     Windows reserved path safety, and lifecycle gates across 14 critical checkpoints.
// VI: Ranh giới bảo mật đồng bộ đánh giá USER_STOP, EMERGENCY_STOP, cô lập tenant/phiên,
//     an toàn đường dẫn thiết bị Windows, và các cổng vòng đời qua 14 điểm kiểm tra trọng yếu.

import {
  CollaborationCheckpoint,
  FederatedCollaborationMemoryUserStopError,
  FederatedCollaborationMemoryEmergencyStopError,
  FederatedCollaborationMemoryTenantIsolationError,
  FederatedCollaborationMemorySessionIsolationError,
  FederatedCollaborationMemoryValidationError,
} from './federatedCollaborationMemoryTypes.js';

export class CollaborationMemorySecurityBoundary {
  private emergencyStopActive = false;
  private userStopActive = false;

  /**
   * EN: Signals or clears EMERGENCY_STOP.
   * VI: Bật hoặc tắt trạng thái EMERGENCY_STOP.
   */
  public setEmergencyStop(active: boolean): void {
    this.emergencyStopActive = active;
  }

  public isEmergencyStopActive(): boolean {
    return this.emergencyStopActive;
  }

  /**
   * EN: Signals or clears USER_STOP.
   * VI: Bật hoặc tắt trạng thái USER_STOP.
   */
  public setUserStop(active: boolean): void {
    this.userStopActive = active;
  }

  public isUserStopActive(): boolean {
    return this.userStopActive;
  }

  /**
   * EN: Synchronously validates safety gates at a critical checkpoint.
   * VI: Xác thực đồng bộ các cổng an toàn tại một điểm kiểm tra trọng yếu.
   */
  public assertStopInactive(
    checkpoint: CollaborationCheckpoint,
    tenantId?: string,
    contextId?: string
  ): void {
    // 1. EMERGENCY_STOP has absolute priority
    if (this.emergencyStopActive) {
      throw new FederatedCollaborationMemoryEmergencyStopError(
        `EMERGENCY_STOP active at checkpoint '${checkpoint}'`,
        tenantId,
        contextId
      );
    }

    // 2. USER_STOP has immediate priority
    if (this.userStopActive) {
      throw new FederatedCollaborationMemoryUserStopError(
        `USER_STOP active at checkpoint '${checkpoint}'`,
        tenantId,
        contextId
      );
    }
  }

  /**
   * EN: Validates tenant identifier and prevents path traversal & reserved Windows names.
   * VI: Xác thực mã định danh tenant và ngăn chặn duyệt đường dẫn cùng các tên dành riêng Windows.
   */
  public assertTenantSafe(tenantId: string): void {
    if (!tenantId || tenantId.trim().length === 0) {
      throw new FederatedCollaborationMemoryTenantIsolationError('Tenant ID cannot be empty');
    }

    // Traversal and null byte rejection
    if (tenantId.includes('..') || tenantId.includes('/') || tenantId.includes('\\') || tenantId.includes('\0')) {
      throw new FederatedCollaborationMemoryTenantIsolationError(
        `Invalid characters or path traversal pattern in tenant ID: '${tenantId}'`,
        tenantId
      );
    }

    // Windows reserved device names rejection
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
      throw new FederatedCollaborationMemoryTenantIsolationError(
        `Reserved Windows device name rejected as tenant ID: '${tenantId}'`,
        tenantId
      );
    }
  }

  /**
   * EN: Asserts session isolation.
   * VI: Khẳng định cô lập phiên.
   */
  public assertSessionSafe(sessionId: string): void {
    if (!sessionId || sessionId.trim().length === 0) {
      throw new FederatedCollaborationMemorySessionIsolationError('Session ID cannot be empty');
    }
    if (sessionId.includes('..') || sessionId.includes('\0')) {
      throw new FederatedCollaborationMemorySessionIsolationError(
        `Invalid characters in session ID: '${sessionId}'`
      );
    }
  }

  /**
   * EN: Asserts tenant matching across all related entities.
   * VI: Khẳng định sự khớp tenant trên tất cả các thực thể liên quan.
   */
  public assertTenantIsolation(primaryTenantId: string, ...otherTenantIds: string[]): void {
    this.assertTenantSafe(primaryTenantId);
    for (const tid of otherTenantIds) {
      this.assertTenantSafe(tid);
      if (tid !== primaryTenantId) {
        throw new FederatedCollaborationMemoryTenantIsolationError(
          `Tenant isolation violation: '${tid}' does not match primary '${primaryTenantId}'`,
          primaryTenantId
        );
      }
    }
  }

  /**
   * EN: Asserts session matching across all related entities.
   * VI: Khẳng định sự khớp phiên trên tất cả các thực thể liên quan.
   */
  public assertSessionIsolation(primarySessionId: string, ...otherSessionIds: string[]): void {
    this.assertSessionSafe(primarySessionId);
    for (const sid of otherSessionIds) {
      this.assertSessionSafe(sid);
      if (sid !== primarySessionId) {
        throw new FederatedCollaborationMemorySessionIsolationError(
          `Session isolation violation: '${sid}' does not match primary '${primarySessionId}'`
        );
      }
    }
  }
}
