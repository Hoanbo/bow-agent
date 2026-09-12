// src/core/sandbox/governedSandboxManager.ts
// BOWCON V4.0 — MS-1.3.47: GOVERNED AUTONOMOUS PROJECT SANDBOX & CONTROLLED WORKTREE ISOLATION
//
// Invariants:
// - MASTER_OWNER_AUTHORITY > BOW > BOWCON > PROJECTS
// - USER_STOP > EVERYTHING_AUTONOMOUS
// - REVOCATION > AGENT_INTENT
// - SANDBOX != AUTHORITY
// - AGENT != MASTER_OWNER
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0 (Fail closed with SECURITY_VIOLATION).
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { createSandboxId, SandboxError, } from './sandboxTypes.js';
import { SandboxPathGuard } from './sandboxPathGuard.js';
export class GovernedSandboxManager {
    baseStorageDir;
    sandboxes = new Map();
    _isUserStopped = false;
    _userStopReason = '';
    constructor(baseStorageDir = path.resolve(process.cwd(), 'data', 'sandboxes')) {
        this.baseStorageDir = baseStorageDir;
    }
    /**
     * Asserts that emergency USER_STOP is not active.
     * Khẳng định rằng lệnh dừng khẩn cấp USER_STOP không đang kích hoạt.
     */
    assertNotStopped(opName) {
        if (this._isUserStopped) {
            throw new SandboxError('USER_STOP_ACTIVE', `Operation "${opName}" rejected: USER_STOP is active (${this._userStopReason || 'Emergency Stop'}).`);
        }
    }
    /**
     * Requests emergency USER_STOP, immediately halting all sandboxes.
     * Yêu cầu dừng khẩn cấp USER_STOP, lập tức dừng mọi sandbox.
     */
    requestUserStop(reason) {
        this._isUserStopped = true;
        this._userStopReason = reason;
        // Freeze all existing active sandboxes.
        // Đóng băng tất cả các sandbox đang hoạt động.
        for (const [id, sb] of this.sandboxes.entries()) {
            if (sb.state !== 'REVOKED' && sb.state !== 'EXPIRED' && sb.state !== 'EXPORTED') {
                const frozen = {
                    ...sb,
                    state: 'INTERRUPTED',
                    stateReason: `USER_STOP: ${reason}`,
                    isStopped: true,
                    updatedAt: Date.now(),
                };
                this.sandboxes.set(id, frozen);
            }
        }
    }
    /**
     * Authoritatively resets USER_STOP and unfreezes interrupted sandboxes.
     * Thiết lập lại USER_STOP một cách có thẩm quyền và giải phóng các sandbox bị gián đoạn.
     */
    resetUserStop() {
        this._isUserStopped = false;
        this._userStopReason = '';
        for (const [id, sb] of this.sandboxes.entries()) {
            if (sb.isStopped) {
                const restored = {
                    ...sb,
                    state: sb.state === 'INTERRUPTED' ? 'ACTIVE' : sb.state,
                    isStopped: false,
                    updatedAt: Date.now(),
                };
                this.sandboxes.set(id, restored);
            }
        }
    }
    /**
     * Creates an isolated, governed sandbox bound to session, task, delegation, and capability lease.
     * Tạo một sandbox cô lập, được quản trị gắn kết với phiên, tác vụ, ủy quyền và hợp đồng thuê năng lực.
     */
    createSandbox(input) {
        this.assertNotStopped('createSandbox');
        // 1. Guard against protected workspace C:\BOW\shopofbow.
        // 1. Bảo vệ chống lại không gian làm việc được bảo vệ C:\BOW\shopofbow.
        SandboxPathGuard.assertNotProtectedWorkspace(input.projectRoot);
        if (input.scope.allowedProjectRoots) {
            for (const root of input.scope.allowedProjectRoots) {
                SandboxPathGuard.assertNotProtectedWorkspace(root);
            }
        }
        // 2. Validate agent identity separation (AGENT != MASTER_OWNER).
        // 2. Xác thực phân tách định danh tác nhân (AGENT != MASTER_OWNER).
        const normalizedAgent = input.agentId.toLowerCase();
        if (normalizedAgent === 'master_owner' || normalizedAgent === 'owner') {
            throw new SandboxError('SECURITY_VIOLATION', `Agent identity cannot impersonate Master Owner: "${input.agentId}"`);
        }
        // 3. Compute deterministic expiration.
        // 3. Tính toán thời gian hết hạn tất định.
        const now = Date.now();
        let expiresAt = now + input.ttlMs;
        if (input.maxExpiresAt && expiresAt > input.maxExpiresAt) {
            expiresAt = input.maxExpiresAt;
        }
        if (expiresAt <= now) {
            throw new SandboxError('EXPIRED_DELEGATION', 'Sandbox expiration cannot be in the past or zero duration.');
        }
        // 4. Generate unique branded SandboxId.
        // 4. Tạo SandboxId có thương hiệu duy nhất.
        const rawId = `sb_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const sandboxId = createSandboxId(rawId);
        // 5. Establish safe isolated directory for the sandbox root.
        // 5. Thiết lập thư mục cô lập an toàn cho thư mục gốc của sandbox.
        const safeRootPath = path.resolve(this.baseStorageDir, rawId);
        SandboxPathGuard.assertNotProtectedWorkspace(safeRootPath);
        if (!fs.existsSync(safeRootPath)) {
            fs.mkdirSync(safeRootPath, { recursive: true });
        }
        const descriptor = {
            id: sandboxId,
            binding: {
                sandboxId,
                sessionId: input.sessionId,
                taskId: input.taskId,
                taskGroupId: input.taskGroupId,
                delegationId: input.delegationId,
                capabilityLeaseId: input.capabilityLeaseId,
                agentId: input.agentId,
                deviceId: input.deviceId,
                createdAt: now,
                expiresAt,
            },
            scope: {
                allowedProjectRoots: [...input.scope.allowedProjectRoots],
                allowedOperations: [...input.scope.allowedOperations],
                maxFileCount: input.scope.maxFileCount,
                maxWorkspaceSizeBytes: input.scope.maxWorkspaceSizeBytes,
                allowedFileExtensions: input.scope.allowedFileExtensions ? [...input.scope.allowedFileExtensions] : undefined,
                deniedFilePatterns: input.scope.deniedFilePatterns ? [...input.scope.deniedFilePatterns] : undefined,
            },
            rootPath: safeRootPath,
            state: 'ACTIVE',
            createdAt: now,
            updatedAt: now,
            expiresAt,
            isRevoked: false,
            isStopped: false,
        };
        this.sandboxes.set(sandboxId, descriptor);
        return descriptor;
    }
    /**
     * Retrieves a sandbox descriptor by id.
     * Lấy bộ mô tả sandbox theo định danh.
     */
    getSandbox(id) {
        return this.sandboxes.get(id);
    }
    /**
     * Lists sandboxes, optionally filtered by sessionId.
     * Liệt kê các sandbox, tùy chọn lọc theo sessionId.
     */
    listSandboxes(sessionId) {
        const all = Array.from(this.sandboxes.values());
        if (sessionId) {
            return all.filter((s) => s.binding.sessionId === sessionId);
        }
        return all;
    }
    /**
     * Transitions a sandbox to a new lifecycle state.
     * Chuyển đổi một sandbox sang trạng thái vòng đời mới.
     */
    transitionState(sandboxId, nextState, reason) {
        this.assertNotStopped('transitionState');
        const sb = this.sandboxes.get(sandboxId);
        if (!sb) {
            throw new SandboxError('POLICY_VIOLATION', `Sandbox "${sandboxId}" not found.`);
        }
        // Terminal states cannot transition to operational states.
        // Các trạng thái kết thúc không thể chuyển về trạng thái hoạt động.
        const terminalStates = ['REVOKED', 'EXPIRED', 'DISCARDED'];
        if (terminalStates.includes(sb.state) && nextState === 'ACTIVE') {
            throw new SandboxError('POLICY_VIOLATION', `Cannot reactivate sandbox "${sandboxId}" from terminal state "${sb.state}".`);
        }
        const updated = {
            ...sb,
            state: nextState,
            stateReason: reason ?? sb.stateReason,
            updatedAt: Date.now(),
        };
        this.sandboxes.set(sandboxId, updated);
        return updated;
    }
    /**
     * Revokes a specific sandbox immediately.
     * Thu hồi một sandbox cụ thể ngay lập tức.
     */
    revokeSandbox(sandboxId, reason) {
        const sb = this.sandboxes.get(sandboxId);
        if (!sb) {
            throw new SandboxError('POLICY_VIOLATION', `Sandbox "${sandboxId}" not found.`);
        }
        const revoked = {
            ...sb,
            state: 'REVOKED',
            stateReason: `REVOKED: ${reason}`,
            isRevoked: true,
            updatedAt: Date.now(),
        };
        this.sandboxes.set(sandboxId, revoked);
        return revoked;
    }
    /**
     * Revokes all sandboxes bound to a revoked delegation.
     * Thu hồi tất cả các sandbox được liên kết với một ủy quyền đã bị thu hồi.
     */
    revokeByDelegation(delegationId, reason) {
        let count = 0;
        for (const [id, sb] of this.sandboxes.entries()) {
            if (sb.binding.delegationId === delegationId && sb.state !== 'REVOKED') {
                const revoked = {
                    ...sb,
                    state: 'REVOKED',
                    stateReason: `Parent delegation revoked: ${reason}`,
                    isRevoked: true,
                    updatedAt: Date.now(),
                };
                this.sandboxes.set(id, revoked);
                count++;
            }
        }
        return count;
    }
    /**
     * Cleans up all in-memory sandboxes and clears storage directory if desired.
     * Dọn dẹp tất cả các sandbox trong bộ nhớ và xóa thư mục lưu trữ nếu muốn.
     */
    clear() {
        this.sandboxes.clear();
        this._isUserStopped = false;
        this._userStopReason = '';
    }
}
