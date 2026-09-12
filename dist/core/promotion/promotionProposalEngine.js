// src/core/promotion/promotionProposalEngine.ts
// BOWCON V4.0 — MS-1.3.48: CONTROLLED CHANGE PROMOTION & GOVERNED PROJECT INTEGRATION
//
// Generates deterministic, provenance-bound promotion proposals from verified sandbox diffs.
// Tạo các đề xuất xúc tiến tất định, gắn liền nguồn gốc từ các diff sandbox đã được kiểm chứng.
//
// STRICT INVARIANTS:
// - PROMOTION_PROPOSAL != AUTHORIZATION
// - PROMOTION != OWNER_APPROVAL
// - DIFF != AUTHORIZATION
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0 (Fail closed with SECURITY_VIOLATION).
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.
import crypto from 'node:crypto';
import { createPromotionId, PromotionError, } from './promotionTypes.js';
import { PromotionScopeValidator } from './promotionScopeValidator.js';
export class PromotionProposalEngine {
    /**
     * Computes deterministic SHA-256 hash representing a promotion proposal content.
     * Tính toán mã băm SHA-256 tất định đại diện cho nội dung đề xuất xúc tiến.
     */
    static hashProposal(sandboxId, targetProjectRoot, diffHash, manifestHash, changesCount) {
        const payload = `${sandboxId}:${targetProjectRoot}:${diffHash}:${manifestHash}:${changesCount}`;
        return crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
    }
    /**
     * Creates a structured promotion proposal from verified sandbox artifacts.
     * Tạo một đề xuất xúc tiến có cấu trúc từ các tạo phẩm sandbox đã được kiểm chứng.
     */
    createProposal(input) {
        // 1. Guard against protected workspace C:\BOW\shopofbow.
        // 1. Bảo vệ chống lại không gian làm việc được bảo vệ C:\BOW\shopofbow.
        PromotionScopeValidator.assertNotProtectedWorkspace(input.targetProjectRoot);
        const now = Date.now();
        const ttl = input.ttlMs ?? 3600000; // 1 hour default
        const expiresAt = Math.min(now + ttl, input.sandbox.expiresAt);
        // 2. Validate diff belongs to the sandbox.
        // 2. Xác thực diff thuộc về sandbox tương ứng.
        if (input.diff.sandboxId !== input.sandbox.id) {
            throw new PromotionError('DIFF_MISMATCH', `Diff sandboxId "${input.diff.sandboxId}" does not match sandbox "${input.sandbox.id}".`);
        }
        // 3. Validate manifest hashes match.
        // 3. Xác thực mã băm bản kê khai phải khớp nhau.
        if (input.diff.baseManifestHash !== input.baseManifest.manifestHash) {
            throw new PromotionError('MANIFEST_HASH_MISMATCH', `Diff base manifest hash "${input.diff.baseManifestHash}" does not match provided base manifest hash "${input.baseManifest.manifestHash}".`);
        }
        if (input.diff.targetManifestHash !== input.currentManifest.manifestHash) {
            throw new PromotionError('MANIFEST_HASH_MISMATCH', `Diff target manifest hash "${input.diff.targetManifestHash}" does not match current manifest hash "${input.currentManifest.manifestHash}".`);
        }
        const proposalHash = PromotionProposalEngine.hashProposal(input.sandbox.id, input.targetProjectRoot, input.diff.diffHash, input.currentManifest.manifestHash, input.diff.changes.length);
        const promotionId = createPromotionId(`prop_${now}_${crypto.randomBytes(4).toString('hex')}`);
        const provenance = {
            taskId: input.sandbox.binding.taskId,
            agentId: input.sandbox.binding.agentId,
            deviceId: input.sandbox.binding.deviceId,
            sessionId: input.sandbox.binding.sessionId,
            delegationId: input.sandbox.binding.delegationId,
            capabilityLeaseId: input.sandbox.binding.capabilityLeaseId,
            sandboxId: input.sandbox.id,
            manifestHash: input.currentManifest.manifestHash,
            diffHash: input.diff.diffHash,
            proposalHash,
            timestamp: now,
        };
        const scope = {
            allowedTargetRoots: input.customScope?.allowedTargetRoots ?? [...input.sandbox.scope.allowedProjectRoots],
            targetProjectRoot: input.targetProjectRoot,
            maxFileChanges: input.customScope?.maxFileChanges ?? input.sandbox.scope.maxFileCount,
            maxPromotionSizeBytes: input.customScope?.maxPromotionSizeBytes ?? input.sandbox.scope.maxWorkspaceSizeBytes,
            allowedFileExtensions: input.customScope?.allowedFileExtensions ?? input.sandbox.scope.allowedFileExtensions,
            deniedFilePatterns: input.customScope?.deniedFilePatterns ?? input.sandbox.scope.deniedFilePatterns,
        };
        const proposal = {
            promotionId,
            sandboxId: input.sandbox.id,
            taskId: input.sandbox.binding.taskId,
            delegationId: input.sandbox.binding.delegationId,
            capabilityLeaseId: input.sandbox.binding.capabilityLeaseId,
            agentId: input.sandbox.binding.agentId,
            deviceId: input.sandbox.binding.deviceId,
            sessionId: input.sandbox.binding.sessionId,
            baseManifestHash: input.baseManifest.manifestHash,
            currentManifestHash: input.currentManifest.manifestHash,
            diffHash: input.diff.diffHash,
            targetProjectRoot: input.targetProjectRoot,
            proposedChanges: [...input.diff.changes],
            provenance,
            state: 'PROPOSED',
            createdAt: now,
            expiresAt,
            scope,
        };
        // 4. Validate scope containment against parent sandbox.
        // 4. Xác thực tính bao chứa phạm vi so với sandbox cha.
        PromotionScopeValidator.validateScope(proposal, input.sandbox);
        return proposal;
    }
}
