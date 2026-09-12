// src/core/releaseExecution/releaseExecutionManifestEngine.ts
// BOWCON V4.0 — MS-1.3.51: GOVERNED RELEASE EXECUTION & AUTHORIZED DEPLOYMENT BOUNDARY
//
// Deterministic manifest scanning and hash computation engine for release execution.
// Động cơ quét bản kê khai và tính toán mã băm tất định cho thực thi phát hành.
//
// STRICT INVARIANTS / CÁC BẤT BIẾN NGHIÊM NGẶT:
// - Deterministic SHA-256 sorting and hashing.
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0.
// - Zero shell execution.
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ReleaseExecutionPolicyEngine } from './releaseExecutionPolicyEngine.js';
export class ReleaseExecutionManifestEngine {
    /**
     * Scans a target directory and computes a deterministic SHA-256 manifest.
     * Quét một thư mục mục tiêu và tính toán bản kê khai SHA-256 tất định.
     */
    static scanDirectory(dirPath) {
        ReleaseExecutionPolicyEngine.assertNotProtectedWorkspace(dirPath);
        ReleaseExecutionPolicyEngine.assertSafePath(dirPath);
        const resolvedRoot = path.resolve(dirPath);
        if (!fs.existsSync(resolvedRoot)) {
            return {
                rootPath: resolvedRoot,
                manifestHash: crypto.createHash('sha256').update('EMPTY_DIR').digest('hex'),
                capturedAt: Date.now(),
                fileCount: 0,
                files: [],
            };
        }
        const fileEntries = [];
        const walk = (currentDir) => {
            const entries = fs.readdirSync(currentDir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(currentDir, entry.name);
                if (entry.isDirectory()) {
                    walk(fullPath);
                }
                else if (entry.isFile()) {
                    const rel = path.relative(resolvedRoot, fullPath).replace(/\\/g, '/');
                    const content = fs.readFileSync(fullPath);
                    const sha256 = crypto.createHash('sha256').update(content).digest('hex');
                    fileEntries.push({
                        relativePath: rel,
                        sha256,
                        sizeBytes: content.length,
                    });
                }
            }
        };
        walk(resolvedRoot);
        // Sort entries deterministically by relativePath.
        // Sắp xếp các mục một cách tất định theo relativePath.
        fileEntries.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
        const manifestPayload = fileEntries
            .map(e => `${e.relativePath}:${e.sha256}:${e.sizeBytes}`)
            .join('\n');
        const manifestHash = crypto.createHash('sha256').update(manifestPayload).digest('hex');
        return {
            rootPath: resolvedRoot,
            manifestHash,
            capturedAt: Date.now(),
            fileCount: fileEntries.length,
            files: Object.freeze(fileEntries),
        };
    }
    /**
     * Compares two manifests and returns true if they match identically.
     * So sánh hai bản kê khai và trả về true nếu chúng khớp hoàn toàn.
     */
    static compareManifests(a, b) {
        const mapA = new Map(a.files.map(f => [f.relativePath, f.sha256]));
        const mapB = new Map(b.files.map(f => [f.relativePath, f.sha256]));
        const added = [];
        const removed = [];
        const modified = [];
        for (const [rel, hashB] of mapB) {
            if (!mapA.has(rel)) {
                added.push(rel);
            }
            else if (mapA.get(rel) !== hashB) {
                modified.push(rel);
            }
        }
        for (const rel of mapA.keys()) {
            if (!mapB.has(rel)) {
                removed.push(rel);
            }
        }
        return {
            isIdentical: a.manifestHash === b.manifestHash,
            addedFiles: Object.freeze(added),
            removedFiles: Object.freeze(removed),
            modifiedFiles: Object.freeze(modified),
        };
    }
}
