// src/core/missionCoordination/missionGovernanceSecurityBoundary.ts
// BOWCON V4.0 — MS-1.5.13: NATIVE GOVERNED MISSION COORDINATION, MULTI-OBJECTIVE PRIORITIZATION & SUPERVISED CONTINUATION ENGINE
// Component 1105 — REAL
//
// EN: Central governance security boundary and policy enforcement firewall for mission coordination.
//     Synchronously enforces 11-checkpoint USER_STOP supremacy, EMERGENCY_STOP, tenant isolation,
//     session isolation, lease governance, and immutable scope bounds.
// VI: Ranh giới bảo mật quản trị trung tâm và tường lửa thực thi chính sách cho điều phối sứ mệnh.
//     Thực thi đồng bộ quyền tối cao USER_STOP tại 11 điểm kiểm tra, EMERGENCY_STOP, cô lập bên thuê,
//     cô lập phiên, quản trị hợp đồng thuê và các giới hạn phạm vi bất biến.

import path from 'node:path';
import {
  MissionCoordinationUserStopError,
  MissionCoordinationEmergencyStopError,
  MissionCoordinationTenantIsolationError,
  MissionCoordinationSessionIsolationError,
  MissionCoordinationScopeViolationError,
  MissionCoordinationLeaseError,
  MissionCoordinationValidationError,
} from './missionCoordinationTypes.js';
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';

export type MissionCheckpoint =
  | 'MISSION_ENTRY'
  | 'PRE_MISSION_VALIDATION'
  | 'PRE_OBJECTIVE_SELECTION'
  | 'POST_OBJECTIVE_SELECTION'
  | 'PRE_OBJECTIVE_DELEGATION'
  | 'POST_OBJECTIVE_DELEGATION'
  | 'PRE_MISSION_REASSESSMENT'
  | 'PRE_CONFLICT_RESOLUTION'
  | 'PRE_CONTINUITY_COMMIT'
  | 'PRE_PERSISTENCE'
  | 'POST_PERSISTENCE';

export interface SecurityBoundaryOptions {
  readonly userStopProvider?: () => boolean;
  readonly emergencyStopProvider?: () => boolean;
}

export class MissionGovernanceSecurityBoundary {
  private readonly userStopProvider?: () => boolean;
  private readonly emergencyStopProvider?: () => boolean;

  constructor(options?: SecurityBoundaryOptions) {
    this.userStopProvider = options?.userStopProvider;
    this.emergencyStopProvider = options?.emergencyStopProvider;
  }

  /**
   * EN: Checks if USER_STOP is active across human authority and local provider.
   * VI: Kiểm tra xem USER_STOP có đang kích hoạt trên thẩm quyền con người và nhà cung cấp cục bộ không.
   */
  public isUserStopActive(): boolean {
    if (this.userStopProvider && this.userStopProvider()) {
      return true;
    }
    const authorityVal = globalMasterHumanAuthority?.isUserStopActive;
    if (typeof authorityVal === 'function') {
      return (authorityVal as () => boolean)();
    }
    return Boolean(authorityVal);
  }

  /**
   * EN: Checks if EMERGENCY_STOP is active.
   * VI: Kiểm tra xem EMERGENCY_STOP có đang kích hoạt không.
   */
  public isEmergencyStopActive(): boolean {
    if (this.emergencyStopProvider && this.emergencyStopProvider()) {
      return true;
    }
    return false;
  }

  /**
   * EN: Asserts neither USER_STOP nor EMERGENCY_STOP is active at a critical checkpoint.
   * VI: Khẳng định cả USER_STOP và EMERGENCY_STOP đều không kích hoạt tại điểm kiểm tra quan trọng.
   */
  public assertStopInactive(checkpoint: MissionCheckpoint, tenantId?: string, missionId?: string): void {
    if (this.isEmergencyStopActive()) {
      throw new MissionCoordinationEmergencyStopError(
        `EMERGENCY_STOP active at checkpoint '${checkpoint}' — immediate mission halt enforced`,
        tenantId,
        missionId
      );
    }
    if (this.isUserStopActive()) {
      throw new MissionCoordinationUserStopError(
        `USER_STOP active at checkpoint '${checkpoint}' — immediate mission halt enforced`,
        tenantId,
        missionId
      );
    }
  }

  /**
   * EN: Asserts strict multi-tenant isolation across mission, objective, session, and lease.
   * VI: Khẳng định sự cô lập đa bên thuê nghiêm ngặt trên sứ mệnh, mục tiêu, phiên và hợp đồng thuê.
   */
  public assertTenantIsolation(requestedTenant: string, expectedTenant: string, missionId?: string): void {
    if (!requestedTenant || !expectedTenant || requestedTenant.trim() !== expectedTenant.trim()) {
      throw new MissionCoordinationTenantIsolationError(
        `Tenant isolation violation: requested '${requestedTenant}', expected '${expectedTenant}'`,
        requestedTenant,
        missionId
      );
    }
  }

  /**
   * EN: Asserts session identity matches active mission session.
   * VI: Khẳng định định danh phiên khớp với phiên sứ mệnh đang hoạt động.
   */
  public assertSessionIsolation(requestedSession: string, activeSession: string, tenantId?: string, missionId?: string): void {
    if (!requestedSession || !activeSession || requestedSession.trim() !== activeSession.trim()) {
      throw new MissionCoordinationSessionIsolationError(
        `Session isolation violation: requested '${requestedSession}', active '${activeSession}'`,
        tenantId,
        missionId
      );
    }
  }

  /**
   * EN: Asserts execution lease is active, unexpired, non-revoked, and matches tenant/session.
   * VI: Khẳng định hợp đồng thuê thực thi đang hoạt động, chưa hết hạn, chưa bị thu hồi và khớp bên thuê/phiên.
   */
  public assertLeaseValidity(
    lease: { leaseId: string; tenantId: string; sessionId?: string; expiresAt: number; isRevoked?: boolean },
    expectedTenant: string,
    expectedSession?: string,
    missionId?: string
  ): void {
    if (!lease || !lease.leaseId) {
      throw new MissionCoordinationLeaseError('Missing or null execution lease', expectedTenant, missionId);
    }
    if (lease.tenantId !== expectedTenant) {
      throw new MissionCoordinationLeaseError(
        `Lease tenant mismatch: lease=${lease.tenantId}, expected=${expectedTenant}`,
        expectedTenant,
        missionId
      );
    }
    if (expectedSession && lease.sessionId && lease.sessionId !== expectedSession) {
      throw new MissionCoordinationLeaseError(
        `Lease session mismatch: lease=${lease.sessionId}, expected=${expectedSession}`,
        expectedTenant,
        missionId
      );
    }
    if (lease.isRevoked) {
      throw new MissionCoordinationLeaseError(`Lease '${lease.leaseId}' has been revoked`, expectedTenant, missionId);
    }
    if (lease.expiresAt <= Date.now()) {
      throw new MissionCoordinationLeaseError(
        `Lease '${lease.leaseId}' has expired (expiresAt=${lease.expiresAt})`,
        expectedTenant,
        missionId
      );
    }
  }

  /**
   * EN: Enforces scope firewalling — ensures proposed operations remain within authorized scope.
   * VI: Thực thi tường lửa phạm vi — đảm bảo các hành động được đề xuất nằm trong phạm vi ủy quyền.
   */
  public assertScopeBound(
    requestedOperations: readonly string[],
    authorizedScope: readonly string[],
    tenantId?: string,
    missionId?: string
  ): void {
    const authorizedSet = new Set(authorizedScope);
    for (const op of requestedOperations) {
      if (!authorizedSet.has(op)) {
        throw new MissionCoordinationScopeViolationError(
          `Scope firewall violation: operation '${op}' is not in authorized scope [${authorizedScope.join(', ')}]`,
          tenantId,
          missionId
        );
      }
    }
  }

  /**
   * EN: Resolves safe tenant partition directory, preventing path traversal and null bytes.
   * VI: Giải quyết thư mục phân vùng bên thuê an toàn, ngăn chặn duyệt đường dẫn và byte rỗng.
   */
  public resolveSafePartition(tenantId: string, baseDir: string): { partitionKey: string; partitionDir: string } {
    if (!tenantId || typeof tenantId !== 'string' || tenantId.trim().length === 0) {
      throw new MissionCoordinationValidationError('Tenant ID must be a non-empty string');
    }
    if (tenantId.includes('\0')) {
      throw new MissionCoordinationValidationError('Null byte detected in tenant identifier');
    }
    if (tenantId.includes('..') || tenantId.includes('/') || tenantId.includes('\\')) {
      throw new MissionCoordinationValidationError('Path traversal characters detected in tenant identifier');
    }

    const partitionKey = `tenant_${tenantId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    const resolvedPath = path.resolve(baseDir, partitionKey);
    const resolvedBase = path.resolve(baseDir);

    if (!resolvedPath.startsWith(resolvedBase)) {
      throw new MissionCoordinationValidationError('Resolved partition escapes base directory boundary');
    }

    return { partitionKey, partitionDir: resolvedPath };
  }
}
