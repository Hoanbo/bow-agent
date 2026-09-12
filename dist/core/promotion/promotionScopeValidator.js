// src/core/promotion/promotionScopeValidator.ts
// BOWCON V4.0 — MS-1.3.48: CONTROLLED CHANGE PROMOTION & GOVERNED PROJECT INTEGRATION
//
// Strict validator for promotion scope, target boundaries, containment, and invariants.
// Bộ xác thực nghiêm ngặt cho phạm vi xúc tiến, ranh giới mục tiêu, tính bao chứa và các tiên đề bất biến.
//
// STRICT INVARIANTS:
// - PROMOTION_SCOPE <= OWNER_GRANTED_SCOPE
// - PROMOTION_SCOPE <= SANDBOX_SCOPE
// - PROMOTION_TARGET <= AUTHORIZED_PROJECT_SCOPE
// - PROMOTION_CAPABILITIES <= DELEGATED_CAPABILITIES
// - PROMOTION_EXPIRATION <= AUTHORIZED_EXPIRATION
// - USER_STOP > EVERYTHING_AUTONOMOUS
// - REVOCATION > AGENT_INTENT
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0 (Fail closed with SECURITY_VIOLATION).
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.
import path from 'node:path';
import { PromotionError, } from './promotionTypes.js';
import { SandboxPathGuard } from '../sandbox/sandboxPathGuard.js';
export class PromotionScopeValidator {
    /**
     * Asserts that a target project root is strictly not the protected workspace.
     * Khẳng định rằng thư mục gốc dự án mục tiêu tuyệt đối không phải không gian làm việc được bảo vệ.
     */
    static assertNotProtectedWorkspace(targetPath) {
        try {
            SandboxPathGuard.assertNotProtectedWorkspace(targetPath);
        }
        catch (err) {
            throw new PromotionError('SECURITY_VIOLATION', `Target path "${targetPath}" targets protected workspace C:\\BOW\\shopofbow. Promotion denied.`);
        }
    }
    /**
     * Asserts that a relative path stays strictly contained within a root directory.
     * Khẳng định rằng đường dẫn tương đối hoàn toàn nằm bên trong thư mục gốc.
     */
    static assertPathContained(rootDir, relativePath) {
        try {
            const { absolutePath } = SandboxPathGuard.resolveAndAssertContainedPath(rootDir, relativePath);
            return absolutePath;
        }
        catch (err) {
            throw new PromotionError('PATH_TRAVERSAL_DETECTED', `Path traversal detected: "${relativePath}" escapes root "${rootDir}".`);
        }
    }
    /**
     * Asserts session integrity for a promotion proposal.
     * Khẳng định tính toàn vẹn phiên cho đề xuất xúc tiến.
     */
    static assertSessionIntegrity(proposal, expectedSessionId) {
        if (proposal.sessionId !== expectedSessionId) {
            throw new PromotionError('SESSION_MISMATCH', `Proposal session "${proposal.sessionId}" does not match expected session "${expectedSessionId}".`);
        }
    }
    /**
     * Validates that requested promotion scope is fully contained within sandbox scope,
     * delegation scope, and authorized project roots.
     * Xác thực rằng phạm vi xúc tiến được yêu cầu hoàn toàn nằm trong phạm vi sandbox,
     * phạm vi ủy quyền và các thư mục gốc dự án được phép.
     */
    static validateScope(proposal, sandbox, delegation, lease) {
        // 1. Guard against protected workspace C:\BOW\shopofbow.
        // 1. Bảo vệ chống lại không gian làm việc được bảo vệ C:\BOW\shopofbow.
        PromotionScopeValidator.assertNotProtectedWorkspace(proposal.targetProjectRoot);
        if (proposal.scope.allowedTargetRoots) {
            for (const root of proposal.scope.allowedTargetRoots) {
                PromotionScopeValidator.assertNotProtectedWorkspace(root);
            }
        }
        // 2. Validate session binding (Strict session isolation).
        // 2. Xác thực ràng buộc phiên (Cô lập phiên nghiêm ngặt).
        if (proposal.sessionId !== sandbox.binding.sessionId) {
            throw new PromotionError('CROSS_SESSION_PROMOTION_REJECTED', `Proposal session "${proposal.sessionId}" does not match sandbox session "${sandbox.binding.sessionId}".`);
        }
        // 3. Validate task binding.
        // 3. Xác thực ràng buộc tác vụ.
        if (proposal.taskId !== sandbox.binding.taskId) {
            throw new PromotionError('TASK_MISMATCH', `Proposal task "${proposal.taskId}" does not match sandbox task "${sandbox.binding.taskId}".`);
        }
        // 4. Validate agent identity separation (AGENT != MASTER_OWNER).
        // 4. Xác thực phân tách định danh tác nhân (AGENT != MASTER_OWNER).
        if (proposal.agentId !== sandbox.binding.agentId) {
            throw new PromotionError('AGENT_MISMATCH', `Proposal agent "${proposal.agentId}" does not match sandbox agent "${sandbox.binding.agentId}".`);
        }
        // 5. Validate device binding.
        // 5. Xác thực ràng buộc thiết bị.
        if (proposal.deviceId !== sandbox.binding.deviceId) {
            throw new PromotionError('DEVICE_MISMATCH', `Proposal device "${proposal.deviceId}" does not match sandbox device "${sandbox.binding.deviceId}".`);
        }
        // 6. Validate target root authorization: must match one of sandbox.scope.allowedProjectRoots.
        // 6. Xác thực ủy quyền thư mục gốc mục tiêu: phải khớp với một trong các thư mục dự án được phép của sandbox.
        const resolvedTarget = path.resolve(proposal.targetProjectRoot);
        const isTargetAuthorized = sandbox.scope.allowedProjectRoots.some((allowed) => {
            const resolvedAllowed = path.resolve(allowed);
            return resolvedTarget === resolvedAllowed || resolvedTarget.startsWith(resolvedAllowed + path.sep);
        });
        if (!isTargetAuthorized) {
            throw new PromotionError('UNAUTHORIZED_PROJECT_ROOT', `Target project root "${proposal.targetProjectRoot}" is not authorized by sandbox scope.`);
        }
        // 7. Validate expiration: PROMOTION_EXPIRATION <= SANDBOX_EXPIRATION.
        // 7. Xác thực thời gian hết hạn: PROMOTION_EXPIRATION <= SANDBOX_EXPIRATION.
        if (proposal.expiresAt > sandbox.expiresAt) {
            throw new PromotionError('SCOPE_EXCEEDED', `Proposal expiration (${new Date(proposal.expiresAt).toISOString()}) exceeds sandbox expiration (${new Date(sandbox.expiresAt).toISOString()}).`);
        }
        // 8. Validate file count quota if specified.
        // 8. Xác thực hạn ngạch số lượng tệp nếu được chỉ định.
        if (sandbox.scope.maxFileCount !== undefined &&
            proposal.proposedChanges.length > sandbox.scope.maxFileCount) {
            throw new PromotionError('FILE_LIMIT_EXCEEDED', `Proposal change count (${proposal.proposedChanges.length}) exceeds sandbox file limit (${sandbox.scope.maxFileCount}).`);
        }
        // 9. Validate file extension restrictions.
        // 9. Xác thực giới hạn đuôi tệp.
        if (sandbox.scope.allowedFileExtensions && sandbox.scope.allowedFileExtensions.length > 0) {
            const allowedExts = new Set(sandbox.scope.allowedFileExtensions.map((e) => e.toLowerCase()));
            for (const change of proposal.proposedChanges) {
                if (change.changeType === 'DELETED')
                    continue;
                const ext = path.extname(change.relativePath).toLowerCase();
                if (ext && !allowedExts.has(ext)) {
                    throw new PromotionError('FILE_EXTENSION_DISALLOWED', `File extension "${ext}" for "${change.relativePath}" is disallowed by sandbox scope.`);
                }
            }
        }
        // 10. Validate delegation binding if provided.
        // 10. Xác thực ràng buộc ủy quyền nếu được cung cấp.
        if (delegation) {
            if (proposal.delegationId !== delegation.delegationId) {
                throw new PromotionError('DELEGATION_MISMATCH', `Proposal delegation "${proposal.delegationId}" does not match active delegation "${delegation.delegationId}".`);
            }
            if (delegation.status === 'REVOKED') {
                throw new PromotionError('REVOKED_DELEGATION', `Parent delegation "${delegation.delegationId}" is revoked.`);
            }
            if (Date.now() > delegation.expiresAt) {
                throw new PromotionError('DELEGATION_EXPIRED', `Parent delegation "${delegation.delegationId}" has expired.`);
            }
        }
        // 11. Validate capability lease if provided.
        // 11. Xác thực hợp đồng thuê năng lực nếu được cung cấp.
        if (lease) {
            if (proposal.capabilityLeaseId !== lease.leaseId) {
                throw new PromotionError('LEASE_MISMATCH', `Proposal lease "${proposal.capabilityLeaseId}" does not match active lease "${lease.leaseId}".`);
            }
            if (lease.status === 'REVOKED') {
                throw new PromotionError('REVOKED_CAPABILITY', `Capability lease "${lease.leaseId}" is revoked.`);
            }
            if (Date.now() > lease.expiresAt) {
                throw new PromotionError('LEASE_EXPIRED', `Capability lease "${lease.leaseId}" has expired.`);
            }
        }
    }
}
