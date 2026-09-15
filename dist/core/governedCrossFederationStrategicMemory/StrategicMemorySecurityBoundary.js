// ============================================================================
// BOWCON V4.0 — MILESTONE MS-1.5.18
// Component 1155: StrategicMemorySecurityBoundary
// 16-Checkpoint Security Boundary, Emergency Interlock & Isolation Gate
// ============================================================================
import { GovernedStrategicMemorySecurityError, } from './GovernedStrategicMemoryTypes';
export class StrategicMemorySecurityBoundary {
    userStopActive = false;
    emergencyStopActive = false;
    evaluatedCheckpoints = [];
    // EN: Sets the USER_STOP flag.
    // VI: Thiết lập cờ dừng người dùng USER_STOP.
    setUserStop(active) {
        this.userStopActive = active;
    }
    // EN: Sets the EMERGENCY_STOP flag.
    // VI: Thiết lập cờ dừng khẩn cấp EMERGENCY_STOP.
    setEmergencyStop(active) {
        this.emergencyStopActive = active;
    }
    isUserStopActive() {
        return this.userStopActive;
    }
    isEmergencyStopActive() {
        return this.emergencyStopActive;
    }
    // EN: Synchronously evaluates security invariants at one of the 16 critical checkpoints.
    // VI: Đánh giá đồng bộ các bất biến an ninh tại một trong 16 điểm kiểm soát trọng yếu.
    evaluateCheckpoint(ctx) {
        this.evaluatedCheckpoints.push(ctx.checkpoint);
        // Priority 1: EMERGENCY_STOP Check
        if (this.emergencyStopActive) {
            throw new GovernedStrategicMemorySecurityError(`EMERGENCY_STOP active at checkpoint '${ctx.checkpoint}': immediate fail-closed halt`);
        }
        // Priority 2: USER_STOP Check
        if (this.userStopActive) {
            throw new GovernedStrategicMemorySecurityError(`USER_STOP active at checkpoint '${ctx.checkpoint}': operation preempted by human authority`);
        }
        // Tenant boundary assertion
        this.assertTenantSafety(ctx.tenantId);
        if (ctx.targetTenantId && ctx.targetTenantId !== ctx.tenantId) {
            throw new GovernedStrategicMemorySecurityError(`Cross-tenant violation at checkpoint '${ctx.checkpoint}': '${ctx.tenantId}' != '${ctx.targetTenantId}'`);
        }
        // Path safety assertion if path is provided
        if (ctx.path) {
            this.assertSafePath(ctx.path);
        }
    }
    // EN: Returns the list of evaluated checkpoints (used in verification tests).
    // VI: Trả về danh sách các checkpoint đã được đánh giá (dùng trong kiểm thử).
    getEvaluatedCheckpoints() {
        return [...this.evaluatedCheckpoints];
    }
    // EN: Clears the checkpoint history (used in test teardown).
    // VI: Xoá lịch sử checkpoint (dùng khi dọn dẹp kiểm thử).
    clear() {
        this.evaluatedCheckpoints.length = 0;
        this.userStopActive = false;
        this.emergencyStopActive = false;
    }
    // --------------------------------------------------------------------------
    // Safety Invariant Assertions
    // --------------------------------------------------------------------------
    assertTenantSafety(tenantId) {
        if (!tenantId || tenantId.trim().length === 0) {
            throw new GovernedStrategicMemorySecurityError('Tenant identifier must not be empty');
        }
        if (tenantId.includes('..') || tenantId.includes('/') || tenantId.includes('\\') || tenantId.includes('\0')) {
            throw new GovernedStrategicMemorySecurityError(`Malicious tenant identifier: '${tenantId}'`);
        }
    }
    // EN: Validates filesystem paths against directory traversal and Windows reserved filenames.
    // VI: Xác thực đường dẫn tệp chống duyệt thư mục trái phép và tên thiết bị dành riêng của Windows.
    assertSafePath(targetPath) {
        if (!targetPath || typeof targetPath !== 'string') {
            throw new GovernedStrategicMemorySecurityError('Invalid filesystem path: path must be a non-empty string');
        }
        // 1. Directory traversal & null-byte rejection
        if (targetPath.includes('..') || targetPath.includes('\0')) {
            throw new GovernedStrategicMemorySecurityError(`Path traversal or null-byte attempt detected and blocked: '${targetPath}'`);
        }
        // 2. Windows reserved names rejection: CON, PRN, AUX, NUL, COM1-9, LPT1-9
        const windowsReservedRegex = /(?:^|[\\/])(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.[^\\/]*)?(?:$|[\\/])/i;
        if (windowsReservedRegex.test(targetPath)) {
            throw new GovernedStrategicMemorySecurityError(`Windows reserved device name detected and blocked in path: '${targetPath}'`);
        }
    }
}
