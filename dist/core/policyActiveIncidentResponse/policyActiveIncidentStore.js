// src/core/policyActiveIncidentResponse/policyActiveIncidentStore.ts
// BOWCON V4.0 — MS-1.3.74: GOVERNED ACTIVE POLICY INCIDENT RESPONSE, DEGRADATION DETECTION & EMERGENCY SAFETY BOUNDARY
//
// Governed Active Incident Store (Component 836).
// Provides durable, crash-safe, tenant-isolated persistence for active policy incidents
// and human escalation records. Enforces atomic file replacement, secret sanitization,
// incident deduplication via deterministic fingerprinting, and terminal state preservation.
//
// Core Authority Invariants:
// - STORE_GRANTS_ZERO_AUTHORITY: Storage holds audit/governance records only
// - USER_STOP > ALL_PERSISTENCE_OPERATIONS
// - FAIL_CLOSED
import fs from 'node:fs';
import path from 'node:path';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';
import { globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
export class PolicyActiveIncidentStore {
    baseDir;
    isUserStopActiveFn;
    sanitizer;
    // In-memory tenant caches:
    // tenantPartition -> incidentId -> ActivePolicyIncidentRecord
    incidents = new Map();
    // tenantPartition -> fingerprint -> incidentId
    fingerprintLookup = new Map();
    // tenantPartition -> escalationId -> IncidentEscalationRecord
    escalations = new Map();
    constructor(options, sanitizer) {
        this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'partitions'));
        this.isUserStopActiveFn = options?.isUserStopActive;
        this.sanitizer = sanitizer ?? globalDiagnosisSanitizer;
    }
    assertUserStopInactive() {
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Active incident store suspended by USER_STOP supremacy');
        }
    }
    getTenantStorageDir(tenantPartition, subDir) {
        if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
            throw new Error('STORE_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
        }
        const resolved = resolveUserPartition(tenantPartition.trim(), this.baseDir);
        const targetDir = path.join(resolved.baseDir, resolved.partitionKey, subDir);
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }
        return targetDir;
    }
    loadTenantStateIfEmpty(tenantPartition) {
        if (this.incidents.has(tenantPartition)) {
            return;
        }
        const incMap = new Map();
        const fpMap = new Map();
        const escMap = new Map();
        this.incidents.set(tenantPartition, incMap);
        this.fingerprintLookup.set(tenantPartition, fpMap);
        this.escalations.set(tenantPartition, escMap);
        // 1. Load incidents
        const incDir = this.getTenantStorageDir(tenantPartition, 'policy_incidents');
        const incFile = path.join(incDir, 'active_incidents.json');
        if (fs.existsSync(incFile)) {
            try {
                const raw = fs.readFileSync(incFile, 'utf8');
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    for (const item of parsed) {
                        if (item && item.incidentId && item.tenantPartition === tenantPartition) {
                            incMap.set(item.incidentId, Object.freeze(item));
                            if (item.fingerprint) {
                                fpMap.set(item.fingerprint, item.incidentId);
                            }
                        }
                    }
                }
            }
            catch (err) {
                throw new Error(`INCIDENT_STORE_CORRUPTION: Failed to parse incidents for tenant '${tenantPartition}': ${err.message}`);
            }
        }
        // 2. Load escalations
        const escDir = this.getTenantStorageDir(tenantPartition, 'incident_escalations');
        const escFile = path.join(escDir, 'escalations.json');
        if (fs.existsSync(escFile)) {
            try {
                const raw = fs.readFileSync(escFile, 'utf8');
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    for (const item of parsed) {
                        if (item && item.escalationId && item.tenantPartition === tenantPartition) {
                            escMap.set(item.escalationId, Object.freeze(item));
                        }
                    }
                }
            }
            catch (err) {
                throw new Error(`INCIDENT_STORE_CORRUPTION: Failed to parse escalations for tenant '${tenantPartition}': ${err.message}`);
            }
        }
    }
    persistIncidents(tenantPartition) {
        const incDir = this.getTenantStorageDir(tenantPartition, 'policy_incidents');
        const incFile = path.join(incDir, 'active_incidents.json');
        const tempFile = path.join(incDir, `inc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.tmp`);
        const list = Array.from(this.incidents.get(tenantPartition)?.values() ?? []);
        const sanitized = this.sanitizer.sanitize(list);
        fs.writeFileSync(tempFile, JSON.stringify(sanitized, null, 2), 'utf8');
        fs.renameSync(tempFile, incFile);
    }
    persistEscalations(tenantPartition) {
        const escDir = this.getTenantStorageDir(tenantPartition, 'incident_escalations');
        const escFile = path.join(escDir, 'escalations.json');
        const tempFile = path.join(escDir, `esc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.tmp`);
        const list = Array.from(this.escalations.get(tenantPartition)?.values() ?? []);
        const sanitized = this.sanitizer.sanitize(list);
        fs.writeFileSync(tempFile, JSON.stringify(sanitized, null, 2), 'utf8');
        fs.renameSync(tempFile, escFile);
    }
    /**
     * Saves or updates an active policy incident.
     * Protects terminal records ('RESOLVED', 'CLOSED') from conflicting rewrites.
     */
    saveIncident(incident) {
        this.assertUserStopInactive();
        this.loadTenantStateIfEmpty(incident.tenantPartition);
        const incMap = this.incidents.get(incident.tenantPartition);
        const fpMap = this.fingerprintLookup.get(incident.tenantPartition);
        const existing = incMap.get(incident.incidentId);
        if (existing) {
            if ((existing.state === 'RESOLVED' || existing.state === 'CLOSED') && incident.state !== existing.state) {
                // Only explicit human resolution can alter closed/resolved records
                if (!incident.resolvedBy) {
                    throw new Error(`CONFLICTING_TERMINAL_REWRITE: Terminal incident '${incident.incidentId}' cannot be modified without human operator clearance.`);
                }
            }
        }
        const frozen = Object.freeze({ ...incident });
        incMap.set(frozen.incidentId, frozen);
        if (frozen.fingerprint) {
            fpMap.set(frozen.fingerprint, frozen.incidentId);
        }
        this.persistIncidents(incident.tenantPartition);
        return frozen;
    }
    /**
     * Finds an active incident by fingerprint.
     */
    getIncidentByFingerprint(tenantPartition, fingerprint) {
        this.assertUserStopInactive();
        this.loadTenantStateIfEmpty(tenantPartition);
        const incidentId = this.fingerprintLookup.get(tenantPartition)?.get(fingerprint);
        if (!incidentId)
            return null;
        return this.incidents.get(tenantPartition)?.get(incidentId) ?? null;
    }
    /**
     * Retrieves an incident by ID.
     */
    getIncident(tenantPartition, incidentId) {
        this.assertUserStopInactive();
        this.loadTenantStateIfEmpty(tenantPartition);
        return this.incidents.get(tenantPartition)?.get(incidentId) ?? null;
    }
    /**
     * Lists all incidents for a tenant.
     */
    listIncidents(tenantPartition) {
        this.assertUserStopInactive();
        this.loadTenantStateIfEmpty(tenantPartition);
        return Object.freeze(Array.from(this.incidents.get(tenantPartition)?.values() ?? []));
    }
    /**
     * Saves a human escalation record.
     */
    saveEscalation(escalation) {
        this.assertUserStopInactive();
        this.loadTenantStateIfEmpty(escalation.tenantPartition);
        const escMap = this.escalations.get(escalation.tenantPartition);
        const frozen = Object.freeze({ ...escalation });
        escMap.set(frozen.escalationId, frozen);
        this.persistEscalations(escalation.tenantPartition);
        return frozen;
    }
    /**
     * Retrieves an escalation by ID.
     */
    getEscalation(tenantPartition, escalationId) {
        this.assertUserStopInactive();
        this.loadTenantStateIfEmpty(tenantPartition);
        return this.escalations.get(tenantPartition)?.get(escalationId) ?? null;
    }
    /**
     * Lists all escalations for a tenant.
     */
    listEscalations(tenantPartition) {
        this.assertUserStopInactive();
        this.loadTenantStateIfEmpty(tenantPartition);
        return Object.freeze(Array.from(this.escalations.get(tenantPartition)?.values() ?? []));
    }
}
