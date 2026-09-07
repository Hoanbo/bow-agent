// src/core/coordination/coordinationHandoff.ts
// BOWCON V4.0 — MILESTONE 1.3.17: DATA-ONLY SURFACE HANDOFF
//
// EN:
// Authoritative data-only handoff validation and execution.
// Moves active engagement between surfaces without executing tools or making network calls.
//
// VI:
// Xác thực và thực thi bàn giao (handoff) bề mặt thuần dữ liệu có thẩm quyền.
// Chuyển giao tương tác tích cực giữa các bề mặt mà không thực thi công cụ hoặc gọi mạng.
import { computeHandoffFingerprint, computeContinuityFingerprint, } from './coordinationFingerprint.js';
import { validateCoordinationScope, assertCoordinationRiskPreservation, assertCoordinationSequenceMonotonicity, } from './coordinationValidator.js';
import { isSurfaceAvailable } from './coordinationStates.js';
/**
 * EN: Deep freezes an object recursively.
 * VI: Đóng băng sâu một đối tượng một cách đệ quy.
 */
function deepFreeze(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    Object.freeze(obj);
    for (const key of Object.keys(obj)) {
        const value = obj[key];
        if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
            deepFreeze(value);
        }
    }
    return obj;
}
/**
 * EN: Validates a surface handoff request against active coordination state.
 * VI: Xác thực một yêu cầu bàn giao bề mặt đối chiếu với trạng thái điều phối tích cực.
 */
export function validateHandoff(request, activeSurfaces, currentContext) {
    // 1. Basic Scope Validation
    try {
        validateCoordinationScope(request.userId, request.sessionId, request.brainId);
    }
    catch (err) {
        return { valid: false, reason: err?.message || 'INVALID_SCOPE' };
    }
    // 2. Cross-Boundary Mismatch Checks
    if (request.userId !== currentContext.userId) {
        return { valid: false, reason: 'CROSS_USER_HANDOFF_REJECTED: Cannot hand off between different users' };
    }
    if (request.sessionId !== currentContext.sessionId) {
        return { valid: false, reason: 'CROSS_SESSION_HANDOFF_REJECTED: Cannot hand off between different sessions' };
    }
    if (request.brainId !== currentContext.brainId) {
        return { valid: false, reason: 'CROSS_BRAIN_HANDOFF_REJECTED: Cannot hand off between different Brain identities' };
    }
    if (request.sourceSurfaceId === request.targetSurfaceId) {
        return { valid: false, reason: 'INVALID_HANDOFF_TARGET: Source and target surfaces must be distinct' };
    }
    // 3. Surface Existence & Status Checks
    const sourceSurface = activeSurfaces.find(s => s.surface.surfaceId === request.sourceSurfaceId);
    if (!sourceSurface) {
        return { valid: false, reason: `SOURCE_SURFACE_NOT_FOUND: Source surface "${request.sourceSurfaceId}" is not attached` };
    }
    const targetSurface = activeSurfaces.find(s => s.surface.surfaceId === request.targetSurfaceId);
    if (!targetSurface) {
        return { valid: false, reason: `TARGET_SURFACE_NOT_FOUND: Target surface "${request.targetSurfaceId}" is not attached` };
    }
    if (!isSurfaceAvailable(targetSurface.status) && targetSurface.status !== 'ATTACHED') {
        return { valid: false, reason: `TARGET_SURFACE_UNAVAILABLE: Target surface status "${targetSurface.status}" cannot accept handoff` };
    }
    // 4. Risk Preservation Check
    try {
        assertCoordinationRiskPreservation(currentContext.risk, request.risk);
    }
    catch (err) {
        return { valid: false, reason: err?.message || 'RISK_DOWNGRADE_REJECTED' };
    }
    // 5. Sequence Monotonicity Check
    try {
        assertCoordinationSequenceMonotonicity(currentContext.sequence, request.sequence);
    }
    catch (err) {
        return { valid: false, reason: err?.message || 'STALE_COORDINATION_SEQUENCE' };
    }
    return { valid: true };
}
/**
 * EN: Accepts a valid handoff request and produces updated ContinuityContext and HandoffResult.
 * VI: Chấp nhận yêu cầu bàn giao hợp lệ và tạo ContinuityContext cùng HandoffResult đã cập nhật.
 */
export function acceptHandoff(request, currentContext, updatedActiveSurfaces) {
    const newSequence = request.sequence;
    const activeIds = updatedActiveSurfaces.map(s => s.surface.surfaceId);
    const continuityFingerprint = computeContinuityFingerprint(request.brainId, request.userId, request.sessionId, newSequence, request.risk, activeIds);
    const updatedContext = deepFreeze({
        continuityId: `continuity_${newSequence}`,
        brainId: request.brainId,
        userId: request.userId,
        sessionId: request.sessionId,
        correlationId: request.correlationId || currentContext.correlationId,
        sequence: newSequence,
        activeSurfaces: Object.freeze([...updatedActiveSurfaces]),
        preferredSurfaceId: request.targetSurfaceId,
        lifecycleState: request.lifecycleState || currentContext.lifecycleState,
        risk: request.risk,
        governanceMetadata: request.governanceMetadata || currentContext.governanceMetadata,
        approvalMetadata: request.approvalMetadata || currentContext.approvalMetadata,
        memoryNamespace: currentContext.memoryNamespace,
        fingerprint: continuityFingerprint,
        timestamp: Date.now(),
    });
    const handoffFingerprint = computeHandoffFingerprint(request.handoffId, request.brainId, request.sourceSurfaceId, request.targetSurfaceId, newSequence);
    return deepFreeze({
        handoffId: request.handoffId,
        accepted: true,
        sourceSurfaceId: request.sourceSurfaceId,
        targetSurfaceId: request.targetSurfaceId,
        continuityContext: updatedContext,
        fingerprint: handoffFingerprint,
        timestamp: Date.now(),
    });
}
/**
 * EN: Rejects a handoff request and produces an immutable rejected HandoffResult.
 * VI: Từ chối yêu cầu bàn giao và tạo một HandoffResult bị từ chối bất biến.
 */
export function rejectHandoff(request, reason) {
    const handoffFingerprint = computeHandoffFingerprint(request.handoffId, request.brainId, request.sourceSurfaceId, request.targetSurfaceId, request.sequence);
    return deepFreeze({
        handoffId: request.handoffId,
        accepted: false,
        reason,
        sourceSurfaceId: request.sourceSurfaceId,
        targetSurfaceId: request.targetSurfaceId,
        fingerprint: handoffFingerprint,
        timestamp: Date.now(),
    });
}
