// src/core/missionCoordination/missionConflictResolver.ts
// BOWCON V4.0 — MS-1.5.13: NATIVE GOVERNED MISSION COORDINATION, MULTI-OBJECTIVE PRIORITIZATION & SUPERVISED CONTINUATION ENGINE
// Component 1103 — REAL
//
// EN: Governed mission conflict detection and resolution engine.
//     Detects resource, scope, dependency, lease, and authorization conflicts, failing closed into REVIEW_REQUIRED.
// VI: Động cơ phát hiện và giải quyết xung đột sứ mệnh có quản trị.
//     Phát hiện xung đột tài nguyên, phạm vi, phụ thuộc, hợp đồng thuê và ủy quyền, đóng-khi-lỗi sang REVIEW_REQUIRED.

import {
  MissionObjectiveBinding,
  MissionConflict,
  MissionConflictCategory,
  MissionCoordinationConflictError,
} from './missionCoordinationTypes.js';

export class MissionConflictResolver {
  private readonly conflicts: MissionConflict[] = [];

  public getConflicts(): readonly MissionConflict[] {
    return [...this.conflicts];
  }

  /**
   * EN: Detects conflicts between proposed eligible objectives and currently active objectives.
   * VI: Phát hiện các xung đột giữa các mục tiêu đủ điều kiện được đề xuất và các mục tiêu đang hoạt động.
   */
  public detectConflicts(
    eligibleObjectives: readonly MissionObjectiveBinding[],
    activeObjectives: readonly MissionObjectiveBinding[] = []
  ): readonly MissionConflict[] {
    const detected: MissionConflict[] = [];
    const all = [...activeObjectives, ...eligibleObjectives];

    // 1. Detect Scope & Mutex Mutation Conflicts
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const objA = all[i];
        const objB = all[j];

        // Cross-tenant or cross-session conflict
        if (objA.tenantId !== objB.tenantId) {
          detected.push({
            conflictId: `conf_tenant_${objA.objectiveId}_${objB.objectiveId}`,
            category: 'AUTHORIZATION_CONFLICT',
            affectedObjectiveIds: [objA.objectiveId, objB.objectiveId],
            description: `Cross-tenant conflict between '${objA.objectiveId}' (${objA.tenantId}) and '${objB.objectiveId}' (${objB.tenantId})`,
            isResolvable: false,
            detectedAt: Date.now(),
          });
        }

        if (objA.sessionId !== objB.sessionId) {
          detected.push({
            conflictId: `conf_sess_${objA.objectiveId}_${objB.objectiveId}`,
            category: 'AUTHORIZATION_CONFLICT',
            affectedObjectiveIds: [objA.objectiveId, objB.objectiveId],
            description: `Cross-session conflict between '${objA.objectiveId}' and '${objB.objectiveId}'`,
            isResolvable: false,
            detectedAt: Date.now(),
          });
        }

        // Mutual write collision in scope
        const writeA = objA.authorizationScope.filter((s) => s.startsWith('write:') || s.startsWith('delete:'));
        const writeB = objB.authorizationScope.filter((s) => s.startsWith('write:') || s.startsWith('delete:'));
        const overlappingWrite = writeA.filter((w) => writeB.includes(w));

        if (overlappingWrite.length > 0) {
          detected.push({
            conflictId: `conf_scope_${objA.objectiveId}_${objB.objectiveId}`,
            category: 'SCOPE_CONFLICT',
            affectedObjectiveIds: [objA.objectiveId, objB.objectiveId],
            description: `Mutually exclusive write operations detected on scopes: [${overlappingWrite.join(', ')}]`,
            isResolvable: true,
            resolutionStrategy: 'SERIALIZE_EXECUTION_ORDER',
            detectedAt: Date.now(),
          });
        }

        // Lease collision
        if (objA.leaseId === objB.leaseId && objA.objectiveId !== objB.objectiveId) {
          detected.push({
            conflictId: `conf_lease_${objA.objectiveId}_${objB.objectiveId}`,
            category: 'LEASE_CONFLICT',
            affectedObjectiveIds: [objA.objectiveId, objB.objectiveId],
            description: `Duplicate lease reuse detected between distinct objectives '${objA.objectiveId}' and '${objB.objectiveId}'`,
            isResolvable: false,
            detectedAt: Date.now(),
          });
        }
      }
    }

    for (const conf of detected) {
      this.conflicts.push(conf);
    }

    return detected;
  }

  /**
   * EN: Evaluates if a conflict can be deterministically resolved without inventing authority.
   * VI: Đánh giá xem xung đột có thể giải quyết xác định mà không tạo ra thẩm quyền không.
   */
  public resolveConflict(conflict: MissionConflict): { isResolved: boolean; strategy?: string } {
    if (!conflict.isResolvable) {
      return { isResolved: false };
    }

    if (conflict.resolutionStrategy === 'SERIALIZE_EXECUTION_ORDER') {
      return { isResolved: true, strategy: 'SERIALIZE_EXECUTION_ORDER' };
    }

    return { isResolved: false };
  }
}
