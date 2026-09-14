// src/core/cognitiveState/cognitiveStateRecovery.ts
// BOWCON V4.0 — MS-1.5.02: CRASH-SAFE COGNITIVE STATE RECOVERY ENGINE
// Component 993 — REAL
//
// Invariants:
// FAIL_CLOSED_ON_CORRUPTED_STATE == TRUE
// ZERO_TOLERANCE_FOR_HASH_TAMPERING == TRUE
// AUTOMATIC_FALLBACK_TO_VALID_BACKUP == TRUE
// STRICT_TENANT_ISOLATION == TRUE
import fs from 'node:fs';
import { COGNITIVE_STATE_SCHEMA_VERSION, CognitiveStateRecoveryError, CognitiveStateIntegrityError, CrossTenantCognitiveStateError, computeCognitiveStateHash, } from './cognitiveStateTypes.js';
import { CognitiveStatePersistenceEngine } from './cognitiveStatePersistence.js';
export class CognitiveStateRecoveryEngine {
    persistence;
    constructor(persistence) {
        this.persistence = persistence || new CognitiveStatePersistenceEngine();
    }
    /**
     * Recovers a persisted cognitive state document, strictly validating integrity and provenance.
     * If the canonical file is corrupted or tampered, attempts safe recovery from backup.
     */
    recover(tenantId, sessionId, activeTenantId) {
        if (activeTenantId && tenantId !== activeTenantId) {
            throw new CrossTenantCognitiveStateError(tenantId, activeTenantId);
        }
        const canonicalPath = this.persistence.resolvePartitionFilePath(tenantId, sessionId);
        const backupPath = `${canonicalPath}.bak`;
        // Case 1: No state exists on disk
        if (!fs.existsSync(canonicalPath) && !fs.existsSync(backupPath)) {
            return Object.freeze({
                recovered: false,
                document: null,
                source: 'NOT_FOUND',
                message: `No persisted cognitive state partition found for ${tenantId}::${sessionId}`,
            });
        }
        // Case 2: Attempt canonical recovery
        let canonicalError = null;
        if (fs.existsSync(canonicalPath)) {
            try {
                const doc = this.loadAndValidateFile(canonicalPath, tenantId, sessionId);
                return Object.freeze({
                    recovered: true,
                    document: doc,
                    source: 'CANONICAL',
                    message: `Successfully recovered canonical state version ${doc.stateVersion}`,
                });
            }
            catch (err) {
                canonicalError = err;
                // Canonical file corrupted or tampered -> Fall through to attempt backup recovery if present
            }
        }
        // Case 3: Attempt recovery from backup snapshot (.bak)
        if (fs.existsSync(backupPath)) {
            try {
                const backupDoc = this.loadAndValidateFile(backupPath, tenantId, sessionId);
                return Object.freeze({
                    recovered: true,
                    document: backupDoc,
                    source: 'BACKUP',
                    message: `Recovered from valid backup state version ${backupDoc.stateVersion} after canonical failure`,
                });
            }
            catch (backupErr) {
                throw new CognitiveStateIntegrityError(`Both canonical and backup state partitions for ${tenantId}::${sessionId} are corrupted or tampered`, { canonicalPath, backupPath, reason: backupErr.message });
            }
        }
        if (canonicalError) {
            throw canonicalError;
        }
        throw new CognitiveStateRecoveryError(`Failed to recover state partition for ${tenantId}::${sessionId}`);
    }
    /**
     * Rehydrates an existing WorkingRegisterStore from disk, or initializes fresh state if none exists.
     */
    rehydrateStore(store, tenantId, sessionId, activeTenantId) {
        const res = this.recover(tenantId, sessionId, activeTenantId);
        if (res.recovered && res.document) {
            store.loadDocument(res.document);
            return res;
        }
        // Fresh initialization
        const freshDoc = store.initialize(tenantId, sessionId);
        return Object.freeze({
            recovered: true,
            document: freshDoc,
            source: 'FRESH_INITIALIZED',
            message: `Initialized fresh cognitive state for ${tenantId}::${sessionId}`,
        });
    }
    /**
     * Safely loads, parses, and validates a state document from a given file path.
     */
    loadAndValidateFile(filePath, expectedTenant, expectedSession) {
        const raw = fs.readFileSync(filePath, 'utf8');
        let parsed;
        try {
            parsed = JSON.parse(raw);
        }
        catch (parseErr) {
            throw new CognitiveStateRecoveryError(`Syntax error in state JSON at ${filePath}: ${parseErr.message}`);
        }
        // Validate structural fields
        if (!parsed || typeof parsed !== 'object') {
            throw new CognitiveStateRecoveryError(`State root must be a JSON object at ${filePath}`);
        }
        if (parsed.schemaVersion !== COGNITIVE_STATE_SCHEMA_VERSION) {
            throw new CognitiveStateRecoveryError(`Unsupported schemaVersion ${parsed.schemaVersion}; expected ${COGNITIVE_STATE_SCHEMA_VERSION}`);
        }
        if (parsed.tenantId !== expectedTenant) {
            throw new CrossTenantCognitiveStateError(parsed.tenantId, expectedTenant);
        }
        if (parsed.sessionId !== expectedSession) {
            throw new CognitiveStateRecoveryError(`Session ID mismatch: file has '${parsed.sessionId}', expected '${expectedSession}'`);
        }
        if (typeof parsed.stateVersion !== 'number' || parsed.stateVersion < 1) {
            throw new CognitiveStateRecoveryError(`Invalid stateVersion '${parsed.stateVersion}' in ${filePath}`);
        }
        if (!parsed.registers || typeof parsed.registers !== 'object') {
            throw new CognitiveStateRecoveryError(`Missing or malformed registers in ${filePath}`);
        }
        if (!parsed.provenance || typeof parsed.provenance !== 'object') {
            throw new CognitiveStateRecoveryError(`Missing provenance metadata in ${filePath}`);
        }
        const doc = parsed;
        // Verify SHA-256 state hash matches material exactly (Tamper Detection)
        const expectedHash = computeCognitiveStateHash(doc);
        if (doc.provenance.stateHash !== expectedHash) {
            throw new CognitiveStateIntegrityError(`Tampered state detected in ${filePath}: claimed hash '${doc.provenance.stateHash}', calculated '${expectedHash}'`, { claimedHash: doc.provenance.stateHash, expectedHash });
        }
        return Object.freeze(doc);
    }
}
