// src/core/sandbox/sandboxManifestEngine.ts
// BOWCON V4.0 — MS-1.3.47: GOVERNED AUTONOMOUS PROJECT SANDBOX & CONTROLLED WORKTREE ISOLATION
//
// Invariants:
// - Manifest generation MUST inspect ONLY files inside the authorized sandbox.
// - Protected workspace C:\BOW\shopofbow contents MUST NEVER be included.
// - Deterministic SHA-256 manifestHash over lexicographically sorted entries.
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { SandboxPathGuard } from './sandboxPathGuard.js';
export class SandboxManifestEngine {
    fsEngine;
    constructor(fsEngine) {
        this.fsEngine = fsEngine;
    }
    /**
     * Directly scans an authorized directory (with strict protected workspace rejection) and returns sorted entries.
     * Quét trực tiếp một thư mục được phép (với việc từ chối nghiêm ngặt không gian làm việc được bảo vệ) và trả về các mục đã sắp xếp.
     */
    static scanProjectDirectory(projectRoot) {
        SandboxPathGuard.assertNotProtectedWorkspace(projectRoot);
        if (!fs.existsSync(projectRoot)) {
            return [];
        }
        const results = [];
        const walk = (dir) => {
            const items = fs.readdirSync(dir, { withFileTypes: true });
            for (const item of items) {
                const itemAbs = path.join(dir, item.name);
                const itemRel = path.relative(projectRoot, itemAbs).replace(/\\/g, '/');
                SandboxPathGuard.assertNotProtectedWorkspace(itemRel);
                if (item.isDirectory()) {
                    results.push({
                        relativePath: itemRel,
                        entryType: 'DIRECTORY',
                        sizeBytes: 0,
                        mtimeMs: fs.statSync(itemAbs).mtimeMs,
                    });
                    walk(itemAbs);
                }
                else if (item.isFile()) {
                    const stat = fs.statSync(itemAbs);
                    const content = fs.readFileSync(itemAbs, 'utf8');
                    results.push({
                        relativePath: itemRel,
                        entryType: 'FILE',
                        sizeBytes: stat.size,
                        contentHash: crypto.createHash('sha256').update(content, 'utf8').digest('hex'),
                        mtimeMs: stat.mtimeMs,
                    });
                }
            }
        };
        walk(projectRoot);
        return results.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
    }
    /**
     * Calculates deterministic SHA-256 hash for a manifest's sorted entries.
     * Tính toán mã băm SHA-256 tất định cho các mục kê khai đã sắp xếp.
     */
    static calculateManifestHash(entries) {
        const canonicalPayload = JSON.stringify(entries.map((e) => ({
            relativePath: e.relativePath,
            entryType: e.entryType,
            sizeBytes: e.sizeBytes,
            contentHash: e.contentHash ?? '',
        })));
        return crypto.createHash('sha256').update(canonicalPayload, 'utf8').digest('hex');
    }
    /**
     * Generates a deterministic filesystem manifest for an isolated sandbox.
     * Tạo bảng kê khai hệ thống tệp tất định cho một sandbox cô lập.
     */
    generateManifest(sandbox, context) {
        // 1. Assert sandbox root does not touch protected workspace C:\BOW\shopofbow.
        // 1. Khẳng định thư mục gốc sandbox không chạm tới không gian làm việc được bảo vệ C:\BOW\shopofbow.
        SandboxPathGuard.assertNotProtectedWorkspace(sandbox.rootPath);
        // 2. List all entries inside sandbox.
        // 2. Liệt kê tất cả các mục bên trong sandbox.
        const rawEntries = this.fsEngine.listFiles(sandbox, '', context);
        // 3. Double-check each entry path against protected workspace.
        // 3. Kiểm tra lại đường dẫn của từng mục đối với không gian làm việc được bảo vệ.
        for (const entry of rawEntries) {
            SandboxPathGuard.assertNotProtectedWorkspace(entry.relativePath);
        }
        // 4. Sort entries deterministically by relativePath in lexicographical order.
        // 4. Sắp xếp các mục một cách tất định theo relativePath theo thứ tự từ điển.
        const sortedEntries = [...rawEntries].sort((a, b) => a.relativePath.localeCompare(b.relativePath));
        // 5. Compute manifest hash.
        // 5. Tính toán mã băm của bản kê khai.
        const manifestHash = SandboxManifestEngine.calculateManifestHash(sortedEntries);
        const totalFiles = sortedEntries.filter((e) => e.entryType === 'FILE').length;
        const totalSizeBytes = sortedEntries.reduce((acc, e) => acc + e.sizeBytes, 0);
        const manifestId = `manifest_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        return {
            manifestId,
            sandboxId: sandbox.id,
            entries: sortedEntries,
            manifestHash,
            generatedAt: Date.now(),
            totalFiles,
            totalSizeBytes,
        };
    }
    /**
     * Verifies mathematical and cryptographic integrity of a manifest.
     * Xác minh tính toàn vẹn toán học và mật mã học của một bảng kê khai.
     */
    verifyManifestIntegrity(manifest) {
        const recomputed = SandboxManifestEngine.calculateManifestHash(manifest.entries);
        return recomputed === manifest.manifestHash;
    }
}
