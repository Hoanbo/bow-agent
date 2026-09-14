// src/core/cognitiveState/cognitiveStatePersistence.ts
// BOWCON V4.0 — MS-1.5.02: CRASH-SAFE ATOMIC COGNITIVE STATE PERSISTENCE ENGINE
// Component 992 — REAL
//
// Invariants:
// ATOMIC_FILE_SWAP_ONLY == TRUE
// ZERO_PARTIAL_JSON_PERSISTENCE == TRUE
// SANITIZE_BEFORE_DISK_WRITE == TRUE
// STRICT_TENANT_ISOLATION == TRUE
// MAX_512KB_PER_PARTITION == TRUE
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { MAX_COGNITIVE_STATE_BYTES, CognitiveStateSizeLimitError, CognitiveStateValidationError, CrossTenantCognitiveStateError, CognitiveStateIntegrityError, computeCognitiveStateHash, canonicalizeStateValue, } from './cognitiveStateTypes.js';
import { globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import { CloudEscalationSanitizer } from '../cognitive/cloudEscalationSanitizer.js';
export class CognitiveStatePersistenceEngine {
    baseDir;
    sanitizer;
    constructor(options) {
        const rawDir = options?.partitionBaseDir || options?.baseDir;
        this.baseDir = rawDir
            ? path.resolve(rawDir)
            : path.resolve(process.cwd(), 'data/partitions_cognitive_state');
        this.sanitizer = options?.sanitizer ?? globalDiagnosisSanitizer;
        this.ensureBaseDir();
    }
    ensureBaseDir() {
        if (!fs.existsSync(this.baseDir)) {
            fs.mkdirSync(this.baseDir, { recursive: true });
        }
    }
    /**
     * Resolves the safe partition file path for a tenant and session.
     */
    resolvePartitionFilePath(tenantId, sessionId) {
        const cleanTenant = (tenantId || '').trim();
        const cleanSession = (sessionId || '').trim();
        if (!cleanTenant) {
            throw new CognitiveStateValidationError('tenantId must be a non-empty string', ['EMPTY_TENANT_ID']);
        }
        if (!cleanSession) {
            throw new CognitiveStateValidationError('sessionId must be a non-empty string', ['EMPTY_SESSION_ID']);
        }
        if (cleanTenant.includes('..') || cleanTenant.includes('/') || cleanTenant.includes('\\') || cleanTenant.includes('\0')) {
            throw new CrossTenantCognitiveStateError(cleanTenant, 'INVALID_PATH_TRAVERSAL');
        }
        if (cleanSession.includes('..') || cleanSession.includes('/') || cleanSession.includes('\\') || cleanSession.includes('\0')) {
            throw new CognitiveStateValidationError('Path traversal characters detected in sessionId', ['SESSION_ID_TRAVERSAL']);
        }
        const tenantDir = path.join(this.baseDir, cleanTenant);
        if (!fs.existsSync(tenantDir)) {
            fs.mkdirSync(tenantDir, { recursive: true });
        }
        return path.join(tenantDir, `${cleanSession}.json`);
    }
    /**
     * Atomically persists a CognitiveStateDocument to disk.
     * Runs secret sanitization, verifies size ceiling, validates provenance hash,
     * writes to temporary file, and performs atomic rename.
     */
    save(doc, activeTenantId) {
        if (activeTenantId && doc.tenantId !== activeTenantId) {
            throw new CrossTenantCognitiveStateError(doc.tenantId, activeTenantId);
        }
        // 1. Resolve and validate partition path first (fails closed on path traversal or bad characters)
        const targetPath = this.resolvePartitionFilePath(doc.tenantId, doc.sessionId);
        // 2. Verify provenance integrity
        const calculatedHash = computeCognitiveStateHash(doc);
        if (doc.provenance.stateHash !== calculatedHash) {
            throw new CognitiveStateIntegrityError(`State hash mismatch: document claimed '${doc.provenance.stateHash}' but canonical calculation is '${calculatedHash}'`, { claimedHash: doc.provenance.stateHash, calculatedHash });
        }
        // 3. Canonicalize & sanitize document before writing to disk
        const canonicalObj = canonicalizeStateValue(doc);
        const rawSerialized = JSON.stringify(canonicalObj, null, 2);
        // Sanitize any accidentally leaked tokens/secrets via both DiagnosisSanitizer, CloudEscalationSanitizer, and direct secret regexes
        const step1Sanitized = this.sanitizer.sanitize(rawSerialized);
        const step2Sanitized = CloudEscalationSanitizer.sanitizeString(step1Sanitized).sanitized;
        const sanitizedString = step2Sanitized
            .replace(/sk-ant-[A-Za-z0-9_-]+/g, '[REDACTED_ANTHROPIC_KEY]')
            .replace(/ghp_[A-Za-z0-9]{30,}/g, '[REDACTED_GITHUB_TOKEN]')
            .replace(/superSecretPassword[A-Za-z0-9!@#$%^&*]+/gi, '[REDACTED_PASSWORD]')
            .replace(/[A-Za-z]:\\\\BOW\\\\shopofbow[^\s"']*/gi, '[PROTECTED_WORKSPACE_PATH]')
            .replace(/[A-Za-z]:[\\/]BOW[\\/]shopofbow[^\s"']*/gi, '[PROTECTED_WORKSPACE_PATH]')
            .replace(/shopofbow/gi, '[REDACTED_PROTECTED_WORKSPACE]');
        const byteLength = Buffer.byteLength(sanitizedString, 'utf8');
        if (byteLength > MAX_COGNITIVE_STATE_BYTES) {
            throw new CognitiveStateSizeLimitError(byteLength, MAX_COGNITIVE_STATE_BYTES);
        }
        const tempPath = `${targetPath}.tmp.${crypto.randomBytes(6).toString('hex')}`;
        const backupPath = `${targetPath}.bak`;
        try {
            // Step A: Write completely to temp file
            fs.writeFileSync(tempPath, sanitizedString, { encoding: 'utf8', flag: 'w' });
            // Step B: If previous version exists, create backup copy
            if (fs.existsSync(targetPath)) {
                try {
                    fs.copyFileSync(targetPath, backupPath);
                }
                catch {
                    // Non-fatal if backup copy fails
                }
            }
            // Step C: Atomic replacement
            fs.renameSync(tempPath, targetPath);
            return Object.freeze({
                filePath: targetPath,
                bytesWritten: byteLength,
            });
        }
        catch (err) {
            // Clean up orphaned temp file if still present
            if (fs.existsSync(tempPath)) {
                try {
                    fs.unlinkSync(tempPath);
                }
                catch { }
            }
            throw err;
        }
    }
    /**
     * Reads a raw persisted partition from disk.
     */
    load(tenantId, sessionId, activeTenantId) {
        if (activeTenantId && tenantId !== activeTenantId) {
            throw new CrossTenantCognitiveStateError(tenantId, activeTenantId);
        }
        const targetPath = this.resolvePartitionFilePath(tenantId, sessionId);
        if (!fs.existsSync(targetPath)) {
            return null;
        }
        const raw = fs.readFileSync(targetPath, 'utf8');
        return JSON.parse(raw);
    }
    /**
     * Checks if a partition exists for tenant and session.
     */
    exists(tenantId, sessionId) {
        const targetPath = this.resolvePartitionFilePath(tenantId, sessionId);
        return fs.existsSync(targetPath);
    }
    /**
     * Deletes a state partition safely.
     */
    delete(tenantId, sessionId, activeTenantId) {
        if (activeTenantId && tenantId !== activeTenantId) {
            throw new CrossTenantCognitiveStateError(tenantId, activeTenantId);
        }
        const targetPath = this.resolvePartitionFilePath(tenantId, sessionId);
        if (fs.existsSync(targetPath)) {
            fs.unlinkSync(targetPath);
            return true;
        }
        return false;
    }
}
