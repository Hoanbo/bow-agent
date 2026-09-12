// src/core/remediation/remediationRollbackEngine.ts
// BOWCON V4.0 — MS-1.3.55: GOVERNED INCIDENT REMEDIATION, AUTHORIZED RECOVERY EXECUTION & CLOSED-LOOP POST-MITIGATION VERIFICATION
//
// Governed Automatic Fail-Safe Rollback Engine.
// Restores atomic pre-remediation snapshots whenever post-mitigation verification fails,
// critical drift is detected, or USER_STOP is signaled during or after execution.
// Động cơ khôi phục an toàn tự động có quản trị.
// Khôi phục ảnh chụp nhanh nguyên tử trước khắc phục bất cứ khi nào xác minh sau giảm thiểu thất bại,
// phát hiện sai lệch nghiêm trọng, hoặc tín hiệu USER_STOP được phát trong hoặc sau thực thi.
//
// STRICT INVARIANTS / CÁC BẤT BIẾN NGHIÊM NGẶT:
// - MANDATORY_ROLLBACK_ON_VERIFICATION_FAILURE: Verification != PASS triggers fail-safe rollback immediately.
// - NEVER_REPORT_SUCCESS_ON_FAILURE: Failed verification MUST transition to ROLLED_BACK or ESCALATED.
// - ROLLBACK_FAILURE_ESCALATION: If rollback itself fails, status transitions to ESCALATED.
// - PROTECTED_WORKSPACE_PRESERVED: Rollback cannot write to or touch C:\BOW\shopofbow.
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { SandboxPathGuard } from '../sandbox/sandboxPathGuard.js';
export class RemediationRollbackEngine {
    /**
     * Executes fail-safe rollback using pre-remediation snapshot.
     * Thực thi khôi phục an toàn sử dụng ảnh chụp nhanh trước khắc phục.
     */
    async executeRollback(options) {
        const { plan, executionId, snapshot, reason, baseDirectory = process.cwd(), simulateRollbackFailure } = options;
        const startedAt = Date.now();
        const restoredItems = [];
        const errors = [];
        // Check protected workspace on target
        if (plan.targetPath) {
            SandboxPathGuard.assertNotProtectedWorkspace(plan.targetPath);
        }
        SandboxPathGuard.assertNotProtectedWorkspace(plan.targetId);
        if (simulateRollbackFailure) {
            errors.push('SIMULATED_ROLLBACK_FAILURE: Rollback hardware/filesystem write fault injected.');
            return {
                executionId,
                planId: plan.planId,
                snapshotId: snapshot.snapshotId,
                success: false,
                reason,
                startedAt,
                completedAt: Date.now(),
                restoredItems: Object.freeze(restoredItems),
                errors: Object.freeze(errors),
                rollbackSha256: crypto.createHash('sha256').update(`${executionId}:ROLLBACK_FAILED`).digest('hex'),
            };
        }
        try {
            for (const item of snapshot.items) {
                if (item.targetPath) {
                    SandboxPathGuard.assertNotProtectedWorkspace(item.targetPath);
                    const resolvedPath = path.isAbsolute(item.targetPath)
                        ? item.targetPath
                        : path.resolve(baseDirectory, item.targetPath);
                    SandboxPathGuard.assertNotProtectedWorkspace(resolvedPath);
                    if (item.statePayload === null) {
                        // File did not exist prior to remediation; remove it
                        if (fs.existsSync(resolvedPath)) {
                            fs.unlinkSync(resolvedPath);
                            restoredItems.push(`DELETED: Removed uncommitted file ${resolvedPath}`);
                        }
                    }
                    else if (typeof item.statePayload === 'string') {
                        // Ensure parent directory exists
                        const parentDir = path.dirname(resolvedPath);
                        if (!fs.existsSync(parentDir)) {
                            fs.mkdirSync(parentDir, { recursive: true });
                        }
                        fs.writeFileSync(resolvedPath, item.statePayload, 'utf8');
                        restoredItems.push(`RESTORED: Reverted ${resolvedPath} to pre-remediation state.`);
                    }
                }
                else if (item.itemKey === 'planConfig') {
                    restoredItems.push(`RESTORED: Logical plan configuration reverted to snapshot.`);
                }
            }
            const completedAt = Date.now();
            const rollbackSha256 = this.computeRollbackSha256(executionId, snapshot.snapshotId, true, restoredItems);
            return {
                executionId,
                planId: plan.planId,
                snapshotId: snapshot.snapshotId,
                success: true,
                reason,
                startedAt,
                completedAt,
                restoredItems: Object.freeze(restoredItems),
                errors: Object.freeze(errors),
                rollbackSha256,
            };
        }
        catch (err) {
            errors.push(err.message || String(err));
            return {
                executionId,
                planId: plan.planId,
                snapshotId: snapshot.snapshotId,
                success: false,
                reason,
                startedAt,
                completedAt: Date.now(),
                restoredItems: Object.freeze(restoredItems),
                errors: Object.freeze(errors),
                rollbackSha256: crypto.createHash('sha256').update(`${executionId}:ROLLBACK_FAILED:${err.message}`).digest('hex'),
            };
        }
    }
    computeRollbackSha256(executionId, snapshotId, success, restoredItems) {
        const raw = `${executionId}|${snapshotId}|${success}|${restoredItems.join(';')}`;
        return crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
    }
}
