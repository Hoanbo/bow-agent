// src/core/sandbox/sandboxDiffEngine.ts
// BOWCON V4.0 — MS-1.3.47: GOVERNED AUTONOMOUS PROJECT SANDBOX & CONTROLLED WORKTREE ISOLATION
//
// Invariants:
// - DIFF != AUTHORIZATION
// - VALIDATION != AUTHORIZATION
// - Cryptographically verifiable, deterministic change sets.
// - Full provenance preservation for every file modification.
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.
import crypto from 'node:crypto';
export class SandboxDiffEngine {
    /**
     * Calculates deterministic SHA-256 hash across sorted changes.
     * Tính toán mã băm SHA-256 tất định trên các thay đổi đã được sắp xếp.
     */
    static calculateDiffHash(changes) {
        const canonicalPayload = JSON.stringify(changes.map((c) => ({
            changeType: c.changeType,
            relativePath: c.relativePath,
            previousHash: c.previousHash ?? '',
            newHash: c.newHash ?? '',
            previousPath: c.previousPath ?? '',
            sizeChangeBytes: c.sizeChangeBytes ?? 0,
        })));
        return crypto.createHash('sha256').update(canonicalPayload, 'utf8').digest('hex');
    }
    /**
     * Compares a base manifest against a target manifest to produce a deterministic SandboxDiff.
     * So sánh bản kê khai gốc với bản kê khai mục tiêu để tạo SandboxDiff tất định.
     */
    generateDiff(sandbox, baseManifest, targetManifest, context) {
        const baseMap = new Map();
        for (const entry of baseManifest.entries) {
            if (entry.entryType === 'FILE') {
                baseMap.set(entry.relativePath, entry);
            }
        }
        const targetMap = new Map();
        for (const entry of targetManifest.entries) {
            if (entry.entryType === 'FILE') {
                targetMap.set(entry.relativePath, entry);
            }
        }
        const changes = [];
        const now = Date.now();
        const provenance = `agent:${context.agentId}|device:${context.deviceId}|task:${context.taskId}|session:${context.sessionId}`;
        // 1. Detect ADDED and MODIFIED files.
        // 1. Phát hiện các tệp THÊM MỚI (ADDED) và ĐƯỢC SỬA ĐỔI (MODIFIED).
        for (const [relPath, targetEntry] of targetMap.entries()) {
            const baseEntry = baseMap.get(relPath);
            if (!baseEntry) {
                changes.push({
                    changeType: 'ADDED',
                    relativePath: relPath,
                    previousHash: undefined,
                    newHash: targetEntry.contentHash,
                    sizeChangeBytes: targetEntry.sizeBytes,
                    agentId: context.agentId,
                    taskId: context.taskId,
                    timestamp: now,
                    provenance,
                });
            }
            else if (baseEntry.contentHash !== targetEntry.contentHash) {
                changes.push({
                    changeType: 'MODIFIED',
                    relativePath: relPath,
                    previousHash: baseEntry.contentHash,
                    newHash: targetEntry.contentHash,
                    sizeChangeBytes: targetEntry.sizeBytes - baseEntry.sizeBytes,
                    agentId: context.agentId,
                    taskId: context.taskId,
                    timestamp: now,
                    provenance,
                });
            }
        }
        // 2. Detect DELETED files.
        // 2. Phát hiện các tệp ĐÃ BỊ XÓA (DELETED).
        for (const [relPath, baseEntry] of baseMap.entries()) {
            if (!targetMap.has(relPath)) {
                changes.push({
                    changeType: 'DELETED',
                    relativePath: relPath,
                    previousHash: baseEntry.contentHash,
                    newHash: undefined,
                    sizeChangeBytes: -baseEntry.sizeBytes,
                    agentId: context.agentId,
                    taskId: context.taskId,
                    timestamp: now,
                    provenance,
                });
            }
        }
        // 3. Sort changes deterministically by relativePath and changeType.
        // 3. Sắp xếp các thay đổi một cách tất định theo relativePath và changeType.
        changes.sort((a, b) => {
            const cmp = a.relativePath.localeCompare(b.relativePath);
            if (cmp !== 0)
                return cmp;
            return a.changeType.localeCompare(b.changeType);
        });
        const diffHash = SandboxDiffEngine.calculateDiffHash(changes);
        const diffId = `diff_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        return {
            diffId,
            sandboxId: sandbox.id,
            taskId: context.taskId,
            sessionId: context.sessionId,
            baseManifestHash: baseManifest.manifestHash,
            targetManifestHash: targetManifest.manifestHash,
            changes,
            diffHash,
            generatedAt: now,
        };
    }
    /**
     * Verifies mathematical integrity of a generated diff.
     * Xác minh tính toàn vẹn toán học của một bản diff đã tạo.
     */
    verifyDiffIntegrity(diff) {
        const recomputed = SandboxDiffEngine.calculateDiffHash(diff.changes);
        return recomputed === diff.diffHash;
    }
}
