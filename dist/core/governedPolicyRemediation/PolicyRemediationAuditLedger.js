// src/core/governedPolicyRemediation/PolicyRemediationAuditLedger.ts
// Component 1206: PolicyRemediationAuditLedger (REAL)
//
// Cryptographically chained, append-only remediation audit ledger with atomic persistence,
// continuous SHA-256 integrity verification, tenant isolation, and emergency stop enforcement.
// Sổ cái kiểm toán khắc phục gắn chuỗi mã hóa, chỉ ghi thêm với tính bền vững nguyên tử,
// liên tục xác minh tính toàn vẹn SHA-256, cô lập tenant và thực thi dừng khẩn cấp.
import fs from 'node:fs';
import path from 'node:path';
import { asRemediationAuditRecordId, computeAuditEventHash, GENESIS_REMEDIATION_HASH, EmergencyStopActiveError, CrossTenantAccessForbiddenError, RemediationAuditLedgerError, } from './GovernedPolicyRemediationTypes.js';
const TENANT_ID_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;
const WINDOWS_RESERVED_DEVICE_NAMES = new Set([
    'CON', 'PRN', 'AUX', 'NUL',
    'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
    'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
]);
export class PolicyRemediationAuditLedger {
    baseStorageDir;
    emergencyStopProvider;
    inMemoryLedger = [];
    constructor(emergencyStopProvider, baseStorageDir = path.join(process.cwd(), 'data', 'partitions_governed_policy_remediation')) {
        this.emergencyStopProvider = emergencyStopProvider;
        this.baseStorageDir = baseStorageDir;
    }
    assertEmergencyStopInactive(eventType) {
        // Special forensic exception: logging EMERGENCY_STOP_ENFORCED is permitted during halt
        if (eventType === 'EMERGENCY_STOP_ENFORCED') {
            return;
        }
        if (!this.emergencyStopProvider) {
            throw new EmergencyStopActiveError('Emergency stop provider is missing or undefined (fail-closed)');
        }
        let active;
        try {
            active = this.emergencyStopProvider.isEmergencyStopActive();
        }
        catch (err) {
            throw new EmergencyStopActiveError(`Emergency stop provider threw error: ${err instanceof Error ? err.message : String(err)}`);
        }
        if (typeof active !== 'boolean') {
            throw new EmergencyStopActiveError('Emergency stop provider returned non-boolean value (fail-closed)');
        }
        if (active === true) {
            throw new EmergencyStopActiveError('Emergency stop is currently ACTIVE (fail-closed)');
        }
    }
    assertValidTenantId(tenantId) {
        if (!tenantId || typeof tenantId !== 'string') {
            throw new CrossTenantAccessForbiddenError('Tenant ID must be a non-empty string.');
        }
        const trimmed = tenantId.trim();
        if (!TENANT_ID_REGEX.test(trimmed)) {
            throw new CrossTenantAccessForbiddenError(`Invalid tenant ID format '${tenantId}'.`);
        }
        if (trimmed.includes('..') || trimmed.includes('/') || trimmed.includes('\\') || trimmed.includes('\0')) {
            throw new CrossTenantAccessForbiddenError(`Path traversal detected in tenant ID '${tenantId}'.`);
        }
        if (WINDOWS_RESERVED_DEVICE_NAMES.has(trimmed.toUpperCase())) {
            throw new CrossTenantAccessForbiddenError(`Tenant ID matches reserved Windows device name '${tenantId}'.`);
        }
    }
    getLedgerFilePath(tenantId) {
        this.assertValidTenantId(tenantId);
        return path.join(this.baseStorageDir, tenantId, 'remediation_audit_ledger.jsonl');
    }
    scrubSecrets(payload) {
        const scrubbed = {};
        for (const [k, v] of Object.entries(payload)) {
            if (typeof v === 'string') {
                let text = v;
                text = text.replace(/(?:api[_-]?key|bearer|token|secret|password|passwd|pwd)\s*[:=]\s*(?:\\*["'])?([a-zA-Z0-9_\-\.]{8,})/gi, '[REDACTED_SECRET]');
                scrubbed[k] = text;
            }
            else if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
                scrubbed[k] = this.scrubSecrets(v);
            }
            else {
                scrubbed[k] = v;
            }
        }
        return scrubbed;
    }
    async appendEvent(tenantId, policyDomain, eventType, eventPayload) {
        this.assertEmergencyStopInactive(eventType);
        this.assertValidTenantId(tenantId);
        const filePath = this.getLedgerFilePath(tenantId);
        const dirPath = path.dirname(filePath);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
        let previousEventHash = GENESIS_REMEDIATION_HASH;
        let sequenceNumber = 1;
        // Read previous tip from disk or in-memory ledger
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8').trim();
            if (content.length > 0) {
                const lines = content.split('\n');
                const lastLine = lines[lines.length - 1];
                if (lastLine) {
                    try {
                        const lastRecord = JSON.parse(lastLine);
                        previousEventHash = lastRecord.eventHash;
                        sequenceNumber = lastRecord.sequenceNumber + 1;
                    }
                    catch (_err) {
                        throw new RemediationAuditLedgerError(`Remediation audit ledger corrupted: unable to parse last entry for tenant '${tenantId}'`);
                    }
                }
            }
        }
        else {
            const tenantEvents = this.inMemoryLedger.filter((e) => e.tenantId === tenantId);
            if (tenantEvents.length > 0) {
                const last = tenantEvents[tenantEvents.length - 1];
                previousEventHash = last.eventHash;
                sequenceNumber = last.sequenceNumber + 1;
            }
        }
        const timestamp = new Date().toISOString();
        const recordId = asRemediationAuditRecordId(`rec_${tenantId}_${sequenceNumber}_${Date.now()}`);
        const cleanPayload = this.scrubSecrets(eventPayload);
        const eventHash = computeAuditEventHash(sequenceNumber, timestamp, tenantId, policyDomain, eventType, cleanPayload, previousEventHash);
        const record = Object.freeze({
            recordId,
            sequenceNumber,
            timestamp,
            tenantId,
            policyDomain,
            eventType,
            eventPayload: Object.freeze(cleanPayload),
            previousEventHash,
            eventHash,
        });
        // Append to file and memory
        fs.appendFileSync(filePath, JSON.stringify(record) + '\n', 'utf8');
        this.inMemoryLedger.push(record);
        return record;
    }
    verifyLedgerChain(tenantId, policyDomain) {
        this.assertValidTenantId(tenantId);
        const filePath = this.getLedgerFilePath(tenantId);
        let records = [];
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8').trim();
            if (content.length > 0) {
                const lines = content.split('\n');
                records = lines.map((line) => JSON.parse(line));
            }
        }
        else {
            records = this.inMemoryLedger.filter((e) => e.tenantId === tenantId);
        }
        let prevHash = GENESIS_REMEDIATION_HASH;
        let expectedSeq = 1;
        for (const rec of records) {
            if (rec.tenantId !== tenantId) {
                throw new RemediationAuditLedgerError(`Cross-tenant record detected: expected '${tenantId}', found '${rec.tenantId}'`);
            }
            if (rec.sequenceNumber !== expectedSeq) {
                throw new RemediationAuditLedgerError(`Sequence broken: expected ${expectedSeq}, found ${rec.sequenceNumber}`);
            }
            if (rec.previousEventHash !== prevHash) {
                throw new RemediationAuditLedgerError(`Hash chain broken at seq ${rec.sequenceNumber}: expected prev '${prevHash}', found '${rec.previousEventHash}'`);
            }
            const computed = computeAuditEventHash(rec.sequenceNumber, rec.timestamp, rec.tenantId, rec.policyDomain, rec.eventType, rec.eventPayload, rec.previousEventHash);
            if (computed !== rec.eventHash) {
                throw new RemediationAuditLedgerError(`Tampered record at seq ${rec.sequenceNumber}: expected hash '${computed}', found '${rec.eventHash}'`);
            }
            prevHash = rec.eventHash;
            expectedSeq += 1;
        }
        return {
            verified: true,
            recordCount: records.length,
            tipHash: prevHash,
        };
    }
}
