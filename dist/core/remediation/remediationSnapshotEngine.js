// src/core/remediation/remediationSnapshotEngine.ts
// BOWCON V4.0 — MS-1.3.55: GOVERNED INCIDENT REMEDIATION, AUTHORIZED RECOVERY EXECUTION & CLOSED-LOOP POST-MITIGATION VERIFICATION
//
// Atomic Pre-Remediation State & Configuration Snapshot Engine.
// Captures atomic snapshots of targets prior to any mutating remediation actions.
// Enforces protected workspace boundary (C:\BOW\shopofbow) before inspection or snapshotting.
// Động cơ chụp ảnh nhanh cấu hình và trạng thái nguyên tử trước khi khắc phục.
// Chụp ảnh nhanh nguyên tử của các đối tượng đích trước mọi hành động khắc phục gây biến đổi.
// Thực thi ranh giới không gian làm việc được bảo vệ (C:\BOW\shopofbow) trước khi kiểm tra hoặc chụp ảnh.
//
// STRICT INVARIANTS / CÁC BẤT BIẾN NGHIÊM NGẶT:
// - MANDATORY_PRE_SNAPSHOT: Every physical mutation requires a successful pre-remediation snapshot.
// - FAIL_CLOSED_ON_PROTECTED_WORKSPACE: C:\BOW\shopofbow is strictly protected (READS=0, WRITES=0, TOUCHES=0).
// - DETERMINISTIC_SHA256: Snapshot manifest and items must produce a verifiable deterministic SHA-256 digest.
// - SANDBOX_CONTAINED: Snapshot artifacts persist ONLY within designated allowed sandbox storage.
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { SandboxPathGuard } from '../sandbox/sandboxPathGuard.js';
import { createRemediationSnapshotId, } from './remediationTypes.js';
export class RemediationSnapshotError extends Error {
    code;
    constructor(code, message) {
        super(`[${code}] ${message}`);
        this.code = code;
        this.name = 'RemediationSnapshotError';
    }
}
export class RemediationSnapshotEngine {
    snapshots = new Map();
    /**
     * Captures an atomic pre-remediation state snapshot for a given remediation plan.
     * Chụp ảnh nhanh trạng thái nguyên tử trước khắc phục cho một kế hoạch khắc phục đã cho.
     */
    capturePreRemediationSnapshot(options) {
        const { plan, baseDirectory = process.cwd(), storageDirectory } = options;
        // 1. Assert protected workspace exclusion on all target identifiers and paths
        // 1. Khẳng định loại trừ không gian làm việc được bảo vệ trên mọi định danh và đường dẫn đích
        if (plan.targetPath) {
            SandboxPathGuard.assertNotProtectedWorkspace(plan.targetPath);
        }
        SandboxPathGuard.assertNotProtectedWorkspace(plan.targetId);
        if (storageDirectory) {
            SandboxPathGuard.assertNotProtectedWorkspace(storageDirectory);
        }
        const timestamp = Date.now();
        const rawId = `snap_${plan.planId}_${timestamp}_${crypto.randomBytes(4).toString('hex')}`;
        const snapshotId = createRemediationSnapshotId(rawId);
        const items = [];
        // 2. If plan targets a filesystem path, capture existing file or directory state
        // 2. Nếu kế hoạch nhắm vào một đường dẫn hệ thống tệp, chụp trạng thái tệp hoặc thư mục hiện có
        if (plan.targetPath) {
            try {
                const resolvedPath = path.isAbsolute(plan.targetPath)
                    ? plan.targetPath
                    : path.resolve(baseDirectory, plan.targetPath);
                SandboxPathGuard.assertNotProtectedWorkspace(resolvedPath);
                if (fs.existsSync(resolvedPath)) {
                    const stats = fs.statSync(resolvedPath);
                    if (stats.isFile()) {
                        const content = fs.readFileSync(resolvedPath, 'utf8');
                        const fileSha256 = crypto.createHash('sha256').update(content, 'utf8').digest('hex');
                        items.push({
                            itemKey: 'targetFile',
                            targetPath: resolvedPath,
                            originalSha256: fileSha256,
                            statePayload: content,
                        });
                    }
                    else if (stats.isDirectory()) {
                        // Read direct files in directory
                        const dirEntries = fs.readdirSync(resolvedPath, { withFileTypes: true });
                        for (const entry of dirEntries) {
                            if (entry.isFile()) {
                                const filePath = path.join(resolvedPath, entry.name);
                                SandboxPathGuard.assertNotProtectedWorkspace(filePath);
                                const content = fs.readFileSync(filePath, 'utf8');
                                const fileSha256 = crypto.createHash('sha256').update(content, 'utf8').digest('hex');
                                items.push({
                                    itemKey: `file:${entry.name}`,
                                    targetPath: filePath,
                                    originalSha256: fileSha256,
                                    statePayload: content,
                                });
                            }
                        }
                    }
                }
                else {
                    // Record that target did not exist prior to remediation
                    items.push({
                        itemKey: 'targetFile',
                        targetPath: resolvedPath,
                        statePayload: null,
                    });
                }
            }
            catch (err) {
                if (err.name === 'SandboxError' || err.message?.includes('SECURITY_VIOLATION')) {
                    throw err;
                }
                throw new RemediationSnapshotError('SNAPSHOT_FILESYSTEM_READ_FAILED', `Failed to read filesystem target during snapshot: ${err.message}`);
            }
        }
        // 3. Capture logical plan parameters snapshot
        // 3. Chụp ảnh nhanh các tham số kế hoạch logic
        const planConfigPayload = JSON.stringify({
            targetId: plan.targetId,
            actionClass: plan.actionClass,
            parameters: plan.parameters,
        });
        items.push({
            itemKey: 'planConfig',
            statePayload: planConfigPayload,
            originalSha256: crypto.createHash('sha256').update(planConfigPayload, 'utf8').digest('hex'),
        });
        // 4. Compute deterministic SHA-256 digest of entire snapshot
        // 4. Tính toán mã băm SHA-256 xác định cho toàn bộ ảnh chụp nhanh
        const snapshotSha256 = this.computeSnapshotSha256(snapshotId, plan, items);
        // 5. Construct immutable RemediationSnapshot DTO
        // 5. Xây dựng DTO RemediationSnapshot bất biến
        const snapshot = {
            snapshotId,
            planId: plan.planId,
            capturedAt: timestamp,
            createdAt: timestamp,
            targetId: plan.targetId,
            targetPath: plan.targetPath,
            snapshotHash: snapshotSha256,
            snapshotSha256,
            items: Object.freeze(items),
        };
        // 6. Persist to internal registry
        // 6. Lưu vào sổ đăng ký nội bộ
        this.snapshots.set(snapshotId, snapshot);
        // 7. If storageDirectory is supplied, write JSON manifest within allowed sandbox
        // 7. Nếu thư mục lưu trữ được cung cấp, ghi manifest JSON trong sandbox được phép
        if (storageDirectory) {
            try {
                SandboxPathGuard.assertNotProtectedWorkspace(storageDirectory);
                if (!fs.existsSync(storageDirectory)) {
                    fs.mkdirSync(storageDirectory, { recursive: true });
                }
                const manifestPath = path.join(storageDirectory, `${snapshotId}.json`);
                SandboxPathGuard.assertNotProtectedWorkspace(manifestPath);
                fs.writeFileSync(manifestPath, JSON.stringify(snapshot, null, 2), 'utf8');
            }
            catch (err) {
                if (err.name === 'SandboxError' || err.message?.includes('SECURITY_VIOLATION')) {
                    throw err;
                }
                throw new RemediationSnapshotError('SNAPSHOT_PERSISTENCE_FAILED', `Failed to persist snapshot to storageDirectory: ${err.message}`);
            }
        }
        return snapshot;
    }
    /**
     * Retrieves a snapshot by ID.
     * Lấy ảnh chụp nhanh theo mã ID.
     */
    getSnapshot(snapshotId) {
        return this.snapshots.get(snapshotId);
    }
    /**
     * Computes a deterministic SHA-256 hash for snapshot integrity.
     * Tính toán băm SHA-256 xác định cho tính toàn vẹn của ảnh chụp nhanh.
     */
    computeSnapshotSha256(snapshotId, plan, items) {
        const rawTokens = [
            snapshotId,
            plan.planId,
            plan.targetId,
            plan.targetPath || '',
            ...items.map(item => `${item.itemKey}:${item.targetPath || ''}:${item.originalSha256 || ''}`),
        ];
        return crypto.createHash('sha256').update(rawTokens.join('|'), 'utf8').digest('hex');
    }
}
