// src/core/policyActiveIncidentResolution/policyActiveIncidentResolutionStore.ts
// BOWCON V4.0 — MS-1.3.75: GOVERNED ACTIVE POLICY INCIDENT RESOLUTION, CONTAINMENT CLEARANCE & RECOVERY AUTHORIZATION BOUNDARY
//
// Governed Active Incident Resolution Store (Component 850).
// Provides durable, crash-safe, tenant-partitioned persistence for incident resolution records.
// Enforces atomic file replacement, secret sanitization, terminal state immutability,
// and path traversal rejection via resolveUserPartition.
//
// Core Authority Invariants:
// - STORE_GRANTS_ZERO_AUTHORITY
// - USER_STOP > ALL_PERSISTENCE_OPERATIONS
// - INCIDENT_CLOSURE != INCIDENT_DELETION
// - ZERO DESTRUCTIVE DELETION
// - FAIL_CLOSED
import fs from 'node:fs';
import path from 'node:path';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';
import { globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
export class PolicyActiveIncidentResolutionStore {
    baseDir;
    isUserStopActiveFn;
    sanitizer;
    // In-memory tenant caches:
    assessments = new Map();
    clearances = new Map();
    authorizations = new Map();
    handoffs = new Map();
    verifications = new Map();
    resolutions = new Map();
    closures = new Map();
    constructor(options, sanitizer) {
        this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'partitions'));
        this.isUserStopActiveFn = options?.isUserStopActive;
        this.sanitizer = sanitizer ?? globalDiagnosisSanitizer;
    }
    assertUserStopInactive() {
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Resolution store suspended by USER_STOP supremacy');
        }
    }
    getTenantStorageDir(tenantPartition) {
        if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
            throw new Error('STORE_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
        }
        const resolved = resolveUserPartition(tenantPartition.trim(), this.baseDir);
        const targetDir = path.join(resolved.baseDir, resolved.partitionKey, 'policy_incident_resolution');
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }
        return targetDir;
    }
    loadTenantStateIfEmpty(tenantPartition) {
        if (this.assessments.has(tenantPartition)) {
            return;
        }
        const assMap = new Map();
        const clrMap = new Map();
        const authMap = new Map();
        const hndMap = new Map();
        const verMap = new Map();
        const resMap = new Map();
        const clsMap = new Map();
        this.assessments.set(tenantPartition, assMap);
        this.clearances.set(tenantPartition, clrMap);
        this.authorizations.set(tenantPartition, authMap);
        this.handoffs.set(tenantPartition, hndMap);
        this.verifications.set(tenantPartition, verMap);
        this.resolutions.set(tenantPartition, resMap);
        this.closures.set(tenantPartition, clsMap);
        const dir = this.getTenantStorageDir(tenantPartition);
        this.loadFile(path.join(dir, 'containment_assessments.json'), assMap, 'assessmentId', tenantPartition);
        this.loadFile(path.join(dir, 'containment_clearances.json'), clrMap, 'clearanceId', tenantPartition);
        this.loadFile(path.join(dir, 'recovery_authorizations.json'), authMap, 'authorizationId', tenantPartition);
        this.loadFile(path.join(dir, 'recovery_handoffs.json'), hndMap, 'handoffId', tenantPartition);
        this.loadFile(path.join(dir, 'recovery_verifications.json'), verMap, 'verificationId', tenantPartition);
        this.loadFile(path.join(dir, 'incident_resolutions.json'), resMap, 'resolutionId', tenantPartition);
        this.loadFile(path.join(dir, 'incident_closures.json'), clsMap, 'closureId', tenantPartition);
    }
    loadFile(filePath, targetMap, idKey, tenantPartition) {
        if (fs.existsSync(filePath)) {
            try {
                const raw = fs.readFileSync(filePath, 'utf8');
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    for (const item of parsed) {
                        if (item && item[idKey] && item.tenantPartition === tenantPartition) {
                            targetMap.set(item[idKey], Object.freeze(item));
                        }
                    }
                }
            }
            catch (err) {
                throw new Error(`RESOLUTION_STORE_CORRUPTION: Failed to parse '${path.basename(filePath)}' for tenant '${tenantPartition}': ${err.message}`);
            }
        }
    }
    persistList(fileName, tenantPartition, items) {
        const dir = this.getTenantStorageDir(tenantPartition);
        const finalFile = path.join(dir, fileName);
        const tempFile = path.join(dir, `${fileName.replace('.json', '')}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.tmp`);
        const sanitized = this.sanitizer.sanitize(items);
        fs.writeFileSync(tempFile, JSON.stringify(sanitized, null, 2), 'utf8');
        fs.renameSync(tempFile, finalFile);
    }
    // --- Containment Assessments ---
    saveAssessment(record) {
        this.assertUserStopInactive();
        this.loadTenantStateIfEmpty(record.tenantPartition);
        const map = this.assessments.get(record.tenantPartition);
        const frozen = Object.freeze({ ...record });
        map.set(frozen.assessmentId, frozen);
        this.persistList('containment_assessments.json', record.tenantPartition, Array.from(map.values()));
        return frozen;
    }
    getAssessment(tenantPartition, assessmentId) {
        this.assertUserStopInactive();
        this.loadTenantStateIfEmpty(tenantPartition);
        return this.assessments.get(tenantPartition)?.get(assessmentId) ?? null;
    }
    // --- Containment Clearances ---
    saveClearance(record) {
        this.assertUserStopInactive();
        this.loadTenantStateIfEmpty(record.tenantPartition);
        const map = this.clearances.get(record.tenantPartition);
        const frozen = Object.freeze({ ...record });
        map.set(frozen.clearanceId, frozen);
        this.persistList('containment_clearances.json', record.tenantPartition, Array.from(map.values()));
        return frozen;
    }
    getClearance(tenantPartition, clearanceId) {
        this.assertUserStopInactive();
        this.loadTenantStateIfEmpty(tenantPartition);
        return this.clearances.get(tenantPartition)?.get(clearanceId) ?? null;
    }
    // --- Recovery Authorizations ---
    saveRecoveryAuthorization(record) {
        this.assertUserStopInactive();
        this.loadTenantStateIfEmpty(record.tenantPartition);
        const map = this.authorizations.get(record.tenantPartition);
        const frozen = Object.freeze({ ...record });
        map.set(frozen.authorizationId, frozen);
        this.persistList('recovery_authorizations.json', record.tenantPartition, Array.from(map.values()));
        return frozen;
    }
    getRecoveryAuthorization(tenantPartition, authorizationId) {
        this.assertUserStopInactive();
        this.loadTenantStateIfEmpty(tenantPartition);
        return this.authorizations.get(tenantPartition)?.get(authorizationId) ?? null;
    }
    // --- Recovery Handoffs ---
    saveRecoveryHandoff(record) {
        this.assertUserStopInactive();
        this.loadTenantStateIfEmpty(record.tenantPartition);
        const map = this.handoffs.get(record.tenantPartition);
        const frozen = Object.freeze({ ...record });
        map.set(frozen.handoffId, frozen);
        this.persistList('recovery_handoffs.json', record.tenantPartition, Array.from(map.values()));
        return frozen;
    }
    getRecoveryHandoff(tenantPartition, handoffId) {
        this.assertUserStopInactive();
        this.loadTenantStateIfEmpty(tenantPartition);
        return this.handoffs.get(tenantPartition)?.get(handoffId) ?? null;
    }
    // --- Recovery Verifications ---
    saveRecoveryVerification(record) {
        this.assertUserStopInactive();
        this.loadTenantStateIfEmpty(record.tenantPartition);
        const map = this.verifications.get(record.tenantPartition);
        const frozen = Object.freeze({ ...record });
        map.set(frozen.verificationId, frozen);
        this.persistList('recovery_verifications.json', record.tenantPartition, Array.from(map.values()));
        return frozen;
    }
    getRecoveryVerification(tenantPartition, verificationId) {
        this.assertUserStopInactive();
        this.loadTenantStateIfEmpty(tenantPartition);
        return this.verifications.get(tenantPartition)?.get(verificationId) ?? null;
    }
    // --- Incident Resolutions ---
    saveResolution(record) {
        this.assertUserStopInactive();
        this.loadTenantStateIfEmpty(record.tenantPartition);
        const map = this.resolutions.get(record.tenantPartition);
        const existing = map.get(record.resolutionId);
        if (existing && existing.status === 'CONFIRMED' && record.status !== 'CONFIRMED') {
            throw new Error(`CONFLICTING_TERMINAL_REWRITE: Confirmed resolution '${record.resolutionId}' cannot be modified or downgraded.`);
        }
        const frozen = Object.freeze({ ...record });
        map.set(frozen.resolutionId, frozen);
        this.persistList('incident_resolutions.json', record.tenantPartition, Array.from(map.values()));
        return frozen;
    }
    getResolution(tenantPartition, resolutionId) {
        this.assertUserStopInactive();
        this.loadTenantStateIfEmpty(tenantPartition);
        return this.resolutions.get(tenantPartition)?.get(resolutionId) ?? null;
    }
    // --- Incident Closures ---
    saveClosure(record) {
        this.assertUserStopInactive();
        this.loadTenantStateIfEmpty(record.tenantPartition);
        const map = this.closures.get(record.tenantPartition);
        const existing = map.get(record.closureId);
        if (existing) {
            throw new Error(`CONFLICTING_TERMINAL_REWRITE: Terminal incident closure '${record.closureId}' cannot be overwritten.`);
        }
        const frozen = Object.freeze({ ...record });
        map.set(frozen.closureId, frozen);
        this.persistList('incident_closures.json', record.tenantPartition, Array.from(map.values()));
        return frozen;
    }
    getClosure(tenantPartition, closureId) {
        this.assertUserStopInactive();
        this.loadTenantStateIfEmpty(tenantPartition);
        return this.closures.get(tenantPartition)?.get(closureId) ?? null;
    }
}
