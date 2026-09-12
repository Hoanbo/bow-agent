// src/core/deployment/deploymentRollbackEngine.ts
// BOWCON V4.0 — MS-1.3.52: GOVERNED PRODUCTION DEPLOYMENT & CANARY VERIFICATION PIPELINE
//
// Governed rollback engine restoring deployment target to certified pre-deployment state.
// Động cơ hoàn nguyên có quản trị khôi phục mục tiêu triển khai về trạng thái trước triển khai đã được chứng nhận.
//
// STRICT INVARIANTS / CÁC BẤT BIẾN NGHIÊM NGẶT:
// - ROLLBACK != OWNER_AUTHORITY (Rollback restores prior authorized state).
// - USER_STOP & REVOCATION must be respected.
// - NO CLAIM OF ROLLBACK SUCCESS WITHOUT POST-ROLLBACK VERIFICATION.
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0 (Fail closed with PROTECTED_WORKSPACE_VIOLATION).
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DeploymentError, } from './deploymentTypes.js';
import { SandboxPathGuard } from '../sandbox/sandboxPathGuard.js';
export class DeploymentRollbackEngine {
    /**
     * Asserts that a target path does not touch the protected workspace C:\BOW\shopofbow.
     * Khẳng định rằng đường dẫn mục tiêu không chạm vào không gian làm việc được bảo vệ C:\BOW\shopofbow.
     */
    assertProtectedWorkspaceIsolation(targetPath) {
        SandboxPathGuard.assertNotProtectedWorkspace(targetPath);
        const normalized = path.normalize(targetPath).toLowerCase();
        if (normalized.includes('shopofbow') ||
            normalized.includes('c:\\bow\\shopofbow') ||
            normalized.includes('c:/bow/shopofbow')) {
            throw new DeploymentError('PROTECTED_WORKSPACE_VIOLATION', `Target path "${targetPath}" references permanently protected workspace C:\\BOW\\shopofbow.`);
        }
    }
    /**
     * Computes a deterministic SHA-256 tree manifest for files in a directory.
     * Tính toán mã băm cây biểu kê SHA-256 xác định cho các tệp trong một thư mục.
     */
    computeDirectoryManifest(dirPath) {
        if (!fs.existsSync(dirPath)) {
            return { files: [], manifestHash: crypto.createHash('sha256').update('EMPTY').digest('hex') };
        }
        const results = [];
        const scan = (currentDir, root) => {
            const entries = fs.readdirSync(currentDir, { withFileTypes: true });
            for (const entry of entries) {
                const full = path.join(currentDir, entry.name);
                const rel = path.relative(root, full).replace(/\\/g, '/');
                if (entry.isDirectory()) {
                    scan(full, root);
                }
                else if (entry.isFile()) {
                    const content = fs.readFileSync(full);
                    const hash = crypto.createHash('sha256').update(content).digest('hex');
                    results.push({ relativePath: rel, sha256: hash });
                }
            }
        };
        scan(dirPath, dirPath);
        results.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
        const manifestHash = crypto
            .createHash('sha256')
            .update(JSON.stringify(results))
            .digest('hex');
        return { files: results, manifestHash };
    }
    /**
     * Executes governed rollback of target directory to the verified pre-deployment state.
     * Thực thi hoàn nguyên có quản trị của thư mục mục tiêu về trạng thái trước triển khai đã được xác minh.
     */
    executeRollback(input) {
        // 1. Enforce emergency USER_STOP supremacy.
        // 1. Thực thi tính tối thượng của USER_STOP khẩn cấp.
        if (input.isUserStopActive) {
            throw new DeploymentError('USER_STOP_ACTIVE', 'Rollback halted: USER_STOP is active.');
        }
        // 2. Enforce REVOCATION supremacy.
        // 2. Thực thi tính tối thượng của THU HỒI QUYỀN.
        if (input.isRevoked) {
            throw new DeploymentError('REVOCATION_ACTIVE', 'Rollback halted: REVOCATION is active.');
        }
        const targetRoot = input.target.rootDirectory;
        this.assertProtectedWorkspaceIsolation(targetRoot);
        if (!fs.existsSync(targetRoot)) {
            throw new DeploymentError('ROLLBACK_VERIFICATION_FAILED', `Cannot rollback: Target directory does not exist: "${targetRoot}".`);
        }
        // 3. Compute pre-rollback manifest.
        // 3. Tính toán biểu kê trước hoàn nguyên.
        const preRollbackManifest = this.computeDirectoryManifest(targetRoot);
        const restoredFiles = [];
        const unlinkedFiles = [];
        const backupMap = new Map();
        for (const b of input.backups) {
            backupMap.set(b.relativePath, b.backupPath);
        }
        // 4. Restore backed-up files and unlink files that were newly added.
        // 4. Khôi phục các tệp đã sao lưu và hủy liên kết các tệp mới được thêm vào.
        for (const fileRel of input.deployedFiles) {
            const destFile = path.join(targetRoot, fileRel);
            const backupPath = backupMap.get(fileRel);
            if (backupPath && fs.existsSync(backupPath)) {
                // Restore from backup
                fs.copyFileSync(backupPath, destFile);
                restoredFiles.push(fileRel);
            }
            else {
                // Newly added file; remove it
                if (fs.existsSync(destFile)) {
                    fs.unlinkSync(destFile);
                    unlinkedFiles.push(fileRel);
                }
            }
        }
        // Also remove deployment marker file if present
        const markerFile = path.join(targetRoot, '.bowcon_deployment.json');
        if (fs.existsSync(markerFile)) {
            fs.unlinkSync(markerFile);
            unlinkedFiles.push('.bowcon_deployment.json');
        }
        // 5. Compute post-rollback manifest and verify.
        // 5. Tính toán biểu kê sau hoàn nguyên và xác minh.
        const postRollbackManifest = this.computeDirectoryManifest(targetRoot);
        const isVerified = postRollbackManifest.manifestHash === input.expectedPreManifestHash;
        if (!isVerified) {
            throw new DeploymentError('ROLLBACK_VERIFICATION_FAILED', `Post-rollback manifest hash "${postRollbackManifest.manifestHash}" does not match expected pre-deployment hash "${input.expectedPreManifestHash}".`);
        }
        return {
            rollbackId: `rb_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
            deploymentId: input.deploymentId,
            restoredFiles,
            unlinkedFiles,
            preRollbackManifestHash: preRollbackManifest.manifestHash,
            postRollbackManifestHash: postRollbackManifest.manifestHash,
            isVerified,
            executedAt: Date.now(),
            reason: input.reason,
        };
    }
}
