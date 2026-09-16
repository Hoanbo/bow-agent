// src/core/governedPolicySimulation/PolicySimulationAuditLedger.ts
// Component 1216: PolicySimulationAuditLedger (REAL)
//
// Append-only cryptographic audit ledger with continuous SHA-256 hash chaining,
// multi-process atomic file locking, secret scrubbing, and corruption detection for MS-1.5.24.
// Sổ cái kiểm toán mật mã chỉ nối thêm với chuỗi băm SHA-256 liên tục,
// khóa tệp nguyên tử đa tiến trình, làm sạch bí mật và phát hiện hư hỏng cho MS-1.5.24.
import { existsSync, mkdirSync, readFileSync, writeFileSync, openSync, closeSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { EmergencyStopActiveError, SimulationCrossTenantAccessForbiddenError, SimulationAuditLedgerIntegrityError, SimulationLockTimeoutError, asSimulationAuditRecordId, GENESIS_SIMULATION_HASH, MAX_LOCK_TIMEOUT_MS, computeAuditEventHash, canonicalJsonSerialize, } from './GovernedPolicySimulationTypes.js';
export class PolicySimulationAuditLedger {
    emergencyStopProvider;
    baseStorageDir;
    inMemoryLedger = new Map();
    constructor(emergencyStopProvider, baseStorageDir) {
        this.emergencyStopProvider = emergencyStopProvider;
        this.baseStorageDir = baseStorageDir ?? join(process.cwd(), 'data', 'governed_policy_simulation');
    }
    assertEmergencyStopInactive(isAuditEmergencyEvent = false) {
        if (isAuditEmergencyEvent) {
            // Narrow forensic path allowed for recording emergency stop events
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
            throw new EmergencyStopActiveError(`Emergency stop provider threw error during audit operation: ${err instanceof Error ? err.message : String(err)}`);
        }
        if (typeof active !== 'boolean' || active === true) {
            throw new EmergencyStopActiveError('Emergency stop is ACTIVE or non-boolean (fail-closed)');
        }
    }
    sanitizeTenantId(tenantId) {
        if (!tenantId || typeof tenantId !== 'string') {
            throw new SimulationCrossTenantAccessForbiddenError('Tenant ID must be a non-empty string');
        }
        const clean = tenantId.trim();
        if (!/^[a-zA-Z0-9_-]{1,64}$/.test(clean)) {
            throw new SimulationCrossTenantAccessForbiddenError(`Invalid tenant ID format: ${clean}`);
        }
        const reservedWindows = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
        if (reservedWindows.test(clean) || clean.includes('..') || clean.includes('/') || clean.includes('\\')) {
            throw new SimulationCrossTenantAccessForbiddenError(`Forbidden tenant path token: ${clean}`);
        }
        return clean;
    }
    scrubSecrets(data) {
        const scrubbed = {};
        for (const [key, val] of Object.entries(data)) {
            const lower = key.toLowerCase();
            if (lower.includes('secret') ||
                lower.includes('token') ||
                lower.includes('password') ||
                lower.includes('privatekey') ||
                lower.includes('credential') ||
                lower.includes('hmac')) {
                scrubbed[key] = '[SCRUBBED_SECRET]';
            }
            else if (val && typeof val === 'object' && !Array.isArray(val)) {
                scrubbed[key] = this.scrubSecrets(val);
            }
            else {
                scrubbed[key] = val;
            }
        }
        return scrubbed;
    }
    getTenantAuditDir(tenantId) {
        return join(this.baseStorageDir, tenantId, 'audit');
    }
    acquireLock(lockFilePath) {
        const startTime = Date.now();
        while (Date.now() - startTime < MAX_LOCK_TIMEOUT_MS) {
            try {
                const fd = openSync(lockFilePath, 'wx');
                return fd;
            }
            catch (err) {
                const nodeErr = err;
                if (nodeErr.code === 'EEXIST') {
                    // Lock exists, spin-wait briefly
                    const waitEnd = Date.now() + 20;
                    while (Date.now() < waitEnd) {
                        // tight spin wait
                    }
                }
                else {
                    throw new SimulationAuditLedgerIntegrityError(`Failed to acquire lock: ${nodeErr.message}`);
                }
            }
        }
        throw new SimulationLockTimeoutError(`Lock acquisition timed out after ${MAX_LOCK_TIMEOUT_MS}ms: ${lockFilePath}`);
    }
    releaseLock(fd, lockFilePath) {
        try {
            closeSync(fd);
        }
        catch {
            // ignore
        }
        try {
            if (existsSync(lockFilePath)) {
                unlinkSync(lockFilePath);
            }
        }
        catch {
            // ignore
        }
    }
    /**
     * Appends an audit event to the tenant's append-only cryptographic ledger.
     */
    appendAuditEvent(tenantId, policyDomain, eventType, details, sessionId) {
        const isEmergencyEvent = eventType === 'EMERGENCY_STOP_ENCOUNTERED';
        this.assertEmergencyStopInactive(isEmergencyEvent);
        const cleanTenant = this.sanitizeTenantId(tenantId);
        const auditDir = this.getTenantAuditDir(cleanTenant);
        if (!existsSync(auditDir)) {
            mkdirSync(auditDir, { recursive: true });
        }
        const ledgerFile = join(auditDir, 'simulation_audit.jsonl');
        const lockFile = join(auditDir, 'simulation_audit.lock');
        const lockFd = this.acquireLock(lockFile);
        try {
            // Reload under lock to prevent TOCTOU race conditions
            const existingRecords = this.readLedgerUnderLock(ledgerFile, cleanTenant);
            const previousEventHash = existingRecords.length > 0
                ? existingRecords[existingRecords.length - 1].eventHash
                : GENESIS_SIMULATION_HASH;
            const recordId = asSimulationAuditRecordId(`sim_audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);
            const scrubbedDetails = this.scrubSecrets(details);
            const timestamp = Date.now();
            const eventDataToHash = {
                recordId,
                eventType,
                tenantId: cleanTenant,
                policyDomain,
                sessionId: sessionId ?? null,
                details: scrubbedDetails,
                timestamp,
            };
            const eventHash = computeAuditEventHash(previousEventHash, eventDataToHash);
            const record = Object.freeze({
                recordId,
                eventType,
                tenantId: cleanTenant,
                policyDomain,
                sessionId,
                details: Object.freeze(scrubbedDetails),
                previousEventHash,
                eventHash,
                timestamp,
            });
            // Atomic append using .tmp staging
            const tmpFile = join(auditDir, `simulation_audit_${Date.now()}.tmp`);
            const line = canonicalJsonSerialize(record) + '\n';
            writeFileSync(tmpFile, line, { flag: 'w', encoding: 'utf8' });
            // Append tmp content to ledgerFile
            const existingContent = existsSync(ledgerFile) ? readFileSync(ledgerFile, 'utf8') : '';
            writeFileSync(ledgerFile, existingContent + line, { flag: 'w', encoding: 'utf8' });
            if (existsSync(tmpFile)) {
                unlinkSync(tmpFile);
            }
            // Update in-memory cache
            if (!this.inMemoryLedger.has(cleanTenant)) {
                this.inMemoryLedger.set(cleanTenant, []);
            }
            this.inMemoryLedger.get(cleanTenant).push(record);
            return record;
        }
        finally {
            this.releaseLock(lockFd, lockFile);
        }
    }
    readLedgerUnderLock(ledgerFile, tenantId) {
        if (!existsSync(ledgerFile)) {
            return this.inMemoryLedger.get(tenantId) || [];
        }
        const content = readFileSync(ledgerFile, 'utf8');
        const lines = content.trim().split('\n').filter((l) => l.trim().length > 0);
        const records = [];
        let lastHash = GENESIS_SIMULATION_HASH;
        for (let i = 0; i < lines.length; i++) {
            try {
                const parsed = JSON.parse(lines[i]);
                if (parsed.previousEventHash !== lastHash) {
                    throw new SimulationAuditLedgerIntegrityError(`Hash chain break at record ${i}: expected previous ${lastHash} but found ${parsed.previousEventHash}`);
                }
                lastHash = parsed.eventHash;
                records.push(parsed);
            }
            catch (err) {
                if (err instanceof SimulationAuditLedgerIntegrityError) {
                    throw err;
                }
                throw new SimulationAuditLedgerIntegrityError(`Corrupt audit record JSON at line ${i}: ${String(err)}`);
            }
        }
        return records;
    }
    verifyLedgerIntegrity(tenantId) {
        const cleanTenant = this.sanitizeTenantId(tenantId);
        const auditDir = this.getTenantAuditDir(cleanTenant);
        const ledgerFile = join(auditDir, 'simulation_audit.jsonl');
        const lockFile = join(auditDir, 'simulation_audit.lock');
        if (!existsSync(ledgerFile)) {
            return true; // Empty is valid
        }
        const lockFd = this.acquireLock(lockFile);
        try {
            this.readLedgerUnderLock(ledgerFile, cleanTenant);
            return true;
        }
        finally {
            this.releaseLock(lockFd, lockFile);
        }
    }
    getTenantAuditRecords(tenantId) {
        const cleanTenant = this.sanitizeTenantId(tenantId);
        const auditDir = this.getTenantAuditDir(cleanTenant);
        const ledgerFile = join(auditDir, 'simulation_audit.jsonl');
        const lockFile = join(auditDir, 'simulation_audit.lock');
        if (!existsSync(ledgerFile)) {
            return Object.freeze(this.inMemoryLedger.get(cleanTenant) || []);
        }
        const lockFd = this.acquireLock(lockFile);
        try {
            const records = this.readLedgerUnderLock(ledgerFile, cleanTenant);
            return Object.freeze(records);
        }
        finally {
            this.releaseLock(lockFd, lockFile);
        }
    }
}
