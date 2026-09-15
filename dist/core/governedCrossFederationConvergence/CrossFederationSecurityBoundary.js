// src/core/governedCrossFederationConvergence/CrossFederationSecurityBoundary.ts
// BOWCON V4.0 — MS-1.5.17: GOVERNED CROSS-FEDERATION STRATEGY, CONVERGENCE & POLICY META-GOVERNANCE ENGINE
// Component 1145 — REAL
//
// EN: 16-checkpoint security boundary, emergency interlock, and multi-tenant quarantine gate.
// VI: Ranh giới bảo mật 16 điểm kiểm tra, khóa liên động khẩn cấp và cổng cách ly đa tenant.
import { GovernedCrossFederationUserStopError, GovernedCrossFederationEmergencyStopError, GovernedCrossFederationTenantIsolationError, GovernedCrossFederationSessionIsolationError, GovernedCrossFederationValidationError, } from './GovernedCrossFederationTypes.js';
export class CrossFederationSecurityBoundary {
    userStopActive = false;
    emergencyStopActive = false;
    executedCheckpoints = [];
    // EN: Set USER_STOP state
    // VI: Kích hoạt hoặc hủy trạng thái USER_STOP
    setUserStop(active) {
        this.userStopActive = active;
    }
    // EN: Set EMERGENCY_STOP state
    // VI: Kích hoạt hoặc hủy trạng thái EMERGENCY_STOP
    setEmergencyStop(active) {
        this.emergencyStopActive = active;
    }
    isUserStopActive() {
        return this.userStopActive;
    }
    isEmergencyStopActive() {
        return this.emergencyStopActive;
    }
    // EN: Validate safe filesystem path identifiers preventing traversal and Windows reserved names
    // VI: Xác thực định danh đường dẫn an toàn, ngăn chặn duyệt thư mục và tên thiết bị đặc biệt của Windows
    validateSafePathId(id) {
        if (!id || typeof id !== 'string') {
            throw new GovernedCrossFederationValidationError('Invalid path ID: must be a non-empty string');
        }
        if (id.includes('\0') || id.includes('..') || id.includes('/') || id.includes('\\')) {
            throw new GovernedCrossFederationValidationError(`Path traversal or illegal character detected in ID: "${id}"`);
        }
        const reservedWindows = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;
        if (reservedWindows.test(id)) {
            throw new GovernedCrossFederationValidationError(`Security violation: Windows reserved device name rejected: "${id}"`);
        }
    }
    // EN: Enforce synchronous evaluation of the 16 critical checkpoints with strict priority
    // VI: Thực thi đánh giá đồng bộ 16 điểm kiểm tra quan trọng với thứ tự ưu tiên nghiêm ngặt
    evaluateCheckpoint(checkpoint, tenantId, sessionId, targetTenantId, targetSessionId) {
        // Priority 1: EMERGENCY_STOP
        if (this.emergencyStopActive) {
            throw new GovernedCrossFederationEmergencyStopError(`EMERGENCY_STOP is active: All cross-federation operations blocked at checkpoint ${checkpoint}`, tenantId, sessionId);
        }
        // Priority 2: USER_STOP
        if (this.userStopActive) {
            throw new GovernedCrossFederationUserStopError(`USER_STOP is active: Operation halted by operator directive at checkpoint ${checkpoint}`, tenantId, sessionId);
        }
        // Tenant and Session isolation validation
        if (tenantId && targetTenantId && tenantId !== targetTenantId) {
            throw new GovernedCrossFederationTenantIsolationError(`Cross-tenant violation at checkpoint ${checkpoint}: ${tenantId} !== ${targetTenantId}`, tenantId, sessionId);
        }
        if (sessionId && targetSessionId && sessionId !== targetSessionId) {
            throw new GovernedCrossFederationSessionIsolationError(`Cross-session violation at checkpoint ${checkpoint}: ${sessionId} !== ${targetSessionId}`, tenantId, sessionId);
        }
        // Validate path IDs if provided
        if (tenantId)
            this.validateSafePathId(tenantId);
        if (sessionId)
            this.validateSafePathId(sessionId);
        this.executedCheckpoints.push(checkpoint);
    }
    getExecutedCheckpoints() {
        return Object.freeze([...this.executedCheckpoints]);
    }
    clear() {
        this.userStopActive = false;
        this.emergencyStopActive = false;
        this.executedCheckpoints.length = 0;
    }
}
