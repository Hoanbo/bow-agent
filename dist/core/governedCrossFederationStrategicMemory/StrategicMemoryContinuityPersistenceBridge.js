// ============================================================================
// BOWCON V4.0 — MILESTONE MS-1.5.18
// Component 1156: StrategicMemoryContinuityPersistenceBridge
// Cryptographic Audit Chaining, Drift Snapshots & Crash-Safe Partition Persistence
// ============================================================================
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { MAX_AUDIT_LOG_RECORDS_PER_SESSION, GovernedStrategicMemoryError, GovernedStrategicMemoryConcurrencyError, computeSha256, computeStrategicMemoryAuditHash, computeInstitutionalMemoryContinuityHash, deterministicJsonStringify, } from './GovernedStrategicMemoryTypes';
export class StrategicMemoryContinuityPersistenceBridge {
    securityBoundary;
    auditChains = new Map(); // sessionId -> events
    continuitySnapshots = new Map();
    constructor(securityBoundary) {
        this.securityBoundary = securityBoundary;
    }
    // EN: Emits an immutable, cryptographically hash-chained audit event.
    // VI: Phát sự kiện kiểm toán bất biến, được liên kết chuỗi băm mật mã.
    emitAuditEvent(eventType, tenantId, sessionId, metadata = {}) {
        // Check security checkpoint POST_GOVERNANCE_COMMIT
        this.securityBoundary.evaluateCheckpoint({
            checkpoint: 'POST_GOVERNANCE_COMMIT',
            tenantId,
            sessionId,
        });
        let chain = this.auditChains.get(sessionId);
        if (!chain) {
            chain = [];
            this.auditChains.set(sessionId, chain);
        }
        if (chain.length >= MAX_AUDIT_LOG_RECORDS_PER_SESSION) {
            throw new GovernedStrategicMemoryError(`Audit log ceiling reached: max ${MAX_AUDIT_LOG_RECORDS_PER_SESSION} records per session`, 'MAX_AUDIT_LOG_EXCEEDED');
        }
        const previousHash = chain.length === 0
            ? '0000000000000000000000000000000000000000000000000000000000000000'
            : chain[chain.length - 1].eventHash;
        const eventId = `audit_${sessionId}_${Date.now()}_${chain.length + 1}`;
        const rawEvent = {
            eventId,
            eventType,
            timestamp: Date.now(),
            tenantId,
            sessionId,
            humanOperatorId: metadata.humanOperatorId,
            missionId: metadata.missionId,
            objectiveId: metadata.objectiveId,
            federationId: metadata.federationId,
            generation: metadata.generation,
            details: metadata.details,
            previousHash,
            eventHash: '',
            provenanceHash: '',
        };
        const eventHash = computeStrategicMemoryAuditHash(rawEvent);
        const event = {
            ...rawEvent,
            eventHash,
            provenanceHash: eventHash,
        };
        chain.push(event);
        return event;
    }
    // EN: Retrieves the complete chained audit trail for a session.
    // VI: Truy xuất toàn bộ chuỗi vết kiểm toán liên kết cho phiên.
    getAuditChain(sessionId) {
        return this.auditChains.get(sessionId) || [];
    }
    // EN: Verifies that the audit chain is unbroken and cryptographically intact.
    // VI: Xác minh chuỗi kiểm toán không bị gián đoạn và toàn vẹn về mặt mật mã.
    verifyAuditChainIntegrity(sessionId) {
        const chain = this.auditChains.get(sessionId);
        if (!chain || chain.length === 0) {
            return true;
        }
        let expectedPrev = '0000000000000000000000000000000000000000000000000000000000000000';
        for (const event of chain) {
            if (event.previousHash !== expectedPrev) {
                return false;
            }
            const calculatedHash = computeStrategicMemoryAuditHash(event);
            if (event.eventHash !== calculatedHash) {
                return false;
            }
            expectedPrev = event.eventHash;
        }
        return true;
    }
    // EN: Captures and cryptographically seals a continuity snapshot.
    // VI: Ghi nhận và niêm phong mật mã ảnh chụp tính liên tục.
    captureContinuitySnapshot(tenantId, sessionId, sessionEpoch, totalRecordsCount, activeDriftScore) {
        this.securityBoundary.evaluateCheckpoint({
            checkpoint: 'PRE_CONTINUITY_COMMIT',
            tenantId,
            sessionId,
        });
        const existing = this.continuitySnapshots.get(sessionId);
        const previousContinuityHash = existing
            ? existing.continuityHash
            : '0000000000000000000000000000000000000000000000000000000000000000';
        const continuityId = `continuity_${sessionId}_${sessionEpoch}`;
        const rawContinuity = {
            continuityId,
            tenantId,
            sessionId,
            sessionEpoch,
            totalRecordsCount,
            activeDriftScore,
            previousContinuityHash,
            timestamp: Date.now(),
            continuityHash: '',
        };
        const continuityHash = computeInstitutionalMemoryContinuityHash(rawContinuity);
        const continuity = {
            ...rawContinuity,
            continuityHash,
        };
        this.continuitySnapshots.set(sessionId, continuity);
        return continuity;
    }
    // EN: Executes crash-safe atomic persistence to tenant partition.
    // VI: Thực thi ghi dữ liệu bền vững nguyên tử chống sập vào phân vùng tenant.
    persistStateAtomically(tenantId, sessionId, statePayload, expectedVersion) {
        const baseDir = path.join('data', 'partitions_governed_strategic_memory', tenantId, 'sessions', sessionId);
        const targetPath = path.join(baseDir, 'strategic_memory_state.json');
        // Security boundary evaluations
        this.securityBoundary.evaluateCheckpoint({
            checkpoint: 'PRE_PERSISTENCE',
            tenantId,
            sessionId,
            path: targetPath,
        });
        if (!fs.existsSync(baseDir)) {
            fs.mkdirSync(baseDir, { recursive: true });
        }
        // Read existing file for OCC check if present
        if (fs.existsSync(targetPath)) {
            try {
                const existingData = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
                if (existingData.version !== undefined && existingData.version !== expectedVersion) {
                    throw new GovernedStrategicMemoryConcurrencyError(`OCC version conflict on file '${targetPath}': expected ${expectedVersion}, current ${existingData.version}`);
                }
            }
            catch (err) {
                if (err instanceof GovernedStrategicMemoryConcurrencyError) {
                    throw err;
                }
                // If file was corrupted, proceed to atomic write
            }
        }
        // 1. Serialize deterministic JSON payload
        const serialized = deterministicJsonStringify({
            ...statePayload,
            version: expectedVersion + 1,
            persistedAt: new Date().toISOString(),
        });
        const checksum = computeSha256(serialized);
        // 2. Write to temporary file
        const tempPath = path.join(baseDir, `.tmp.${crypto.randomUUID()}`);
        fs.writeFileSync(tempPath, serialized, 'utf8');
        // 3. Readback checksum verification
        const readbackContent = fs.readFileSync(tempPath, 'utf8');
        const readbackChecksum = computeSha256(readbackContent);
        if (readbackChecksum !== checksum) {
            fs.unlinkSync(tempPath);
            throw new GovernedStrategicMemoryError(`Readback checksum mismatch: expected ${checksum}, got ${readbackChecksum}`, 'CHECKSUM_VERIFICATION_FAILED');
        }
        // 4. Create backup copy if existing target exists
        const bakPath = `${targetPath}.bak`;
        if (fs.existsSync(targetPath)) {
            fs.copyFileSync(targetPath, bakPath);
        }
        // 5. Atomic rename to target path
        fs.renameSync(tempPath, targetPath);
        // Post-persistence checkpoint
        this.securityBoundary.evaluateCheckpoint({
            checkpoint: 'POST_PERSISTENCE',
            tenantId,
            sessionId,
            path: targetPath,
        });
        return { targetPath, checksum };
    }
    // EN: Clears in-memory audit chains and snapshots (used in test teardown).
    // VI: Xoá chuỗi kiểm toán và ảnh chụp trong bộ nhớ (dùng khi dọn dẹp kiểm thử).
    clear() {
        this.auditChains.clear();
        this.continuitySnapshots.clear();
    }
}
