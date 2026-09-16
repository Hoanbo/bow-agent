// src/core/governedPolicyLifecycle/PolicyOperationalIncidentManager.ts
// Component 1181: PolicyOperationalIncidentManager (REAL)
//
// Governed operational incident management engine.
// Tracks degradation incidents, orchestrates automated fail-closed safety tripping,
// records immutable incident fingerprints, and enforces human-governed resolution paths.
import { MAX_ACTIVE_INCIDENTS_PER_DOMAIN, computeIncidentRecordHash, deepFreeze, PolicyIncidentManagementError, } from './GovernedPolicyLifecycleTypes.js';
export class PolicyOperationalIncidentManager {
    stateManager;
    auditLedger;
    incidents = new Map(); // incidentId -> record
    activeIncidentIndex = new Map(); // tenant:domain -> Set<incidentId>
    constructor(stateManager, auditLedger) {
        this.stateManager = stateManager;
        this.auditLedger = auditLedger;
    }
    /**
     * Open an operational incident and optionally trigger automated safety halt.
     */
    openIncident(params) {
        const scopeKey = `${params.tenantId}:${params.policyDomain}`;
        const activeSet = this.activeIncidentIndex.get(scopeKey) || new Set();
        if (activeSet.size >= MAX_ACTIVE_INCIDENTS_PER_DOMAIN) {
            throw new PolicyIncidentManagementError(`INCIDENT_CAPACITY_EXCEEDED: Tenant '${params.tenantId}' domain '${params.policyDomain}' has reached maximum active incidents ceiling (${MAX_ACTIVE_INCIDENTS_PER_DOMAIN}).`);
        }
        const incidentId = `inc_${params.tenantId}_${params.policyDomain}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        let triggeredState = undefined;
        if (params.autoTripSafetyState && this.stateManager) {
            triggeredState = params.autoTripSafetyState;
            this.stateManager.transitionState({
                tenantId: params.tenantId,
                policyDomain: params.policyDomain,
                policyId: params.policyId,
                targetState: params.autoTripSafetyState,
                reason: `Automated safety trip triggered by incident '${params.incidentType}' (${params.severity}): ${params.description}`,
                trigger: 'AUTOMATIC_SAFETY_INTERLOCK',
            });
        }
        const rawRecord = {
            incidentId,
            tenantId: params.tenantId,
            policyDomain: params.policyDomain,
            policyVersion: params.policyVersion,
            incidentType: params.incidentType,
            severity: params.severity,
            status: 'OPEN',
            description: params.description,
            triggeredStateChange: triggeredState,
            openedAt: Date.now(),
        };
        const incidentHash = computeIncidentRecordHash(rawRecord);
        const frozenRecord = deepFreeze({
            ...rawRecord,
            incidentHash,
        });
        this.incidents.set(incidentId, frozenRecord);
        activeSet.add(incidentId);
        this.activeIncidentIndex.set(scopeKey, activeSet);
        if (this.auditLedger) {
            this.auditLedger.recordEvent({
                eventType: 'POLICY_INCIDENT_OPENED',
                tenantId: params.tenantId,
                policyDomain: params.policyDomain,
                policyId: params.policyId,
                policyVersion: params.policyVersion,
                details: {
                    incidentId,
                    incidentType: params.incidentType,
                    severity: params.severity,
                    triggeredStateChange: triggeredState,
                    incidentHash,
                },
            });
            if (triggeredState === 'SUSPENDED') {
                this.auditLedger.recordEvent({
                    eventType: 'SAFETY_HALT_ENGAGED',
                    tenantId: params.tenantId,
                    policyDomain: params.policyDomain,
                    policyId: params.policyId,
                    policyVersion: params.policyVersion,
                    details: { incidentId, reason: params.description },
                });
            }
        }
        return frozenRecord;
    }
    /**
     * Resolve an open incident with mandatory root-cause justification.
     */
    resolveIncident(params) {
        const existing = this.incidents.get(params.incidentId);
        if (!existing) {
            throw new PolicyIncidentManagementError(`INCIDENT_NOT_FOUND: Incident '${params.incidentId}' does not exist.`);
        }
        if (existing.status === 'RESOLVED') {
            throw new PolicyIncidentManagementError(`INCIDENT_ALREADY_RESOLVED: Incident '${params.incidentId}' is already resolved.`);
        }
        if (!params.resolutionJustification || params.resolutionJustification.trim().length < 10) {
            throw new PolicyIncidentManagementError(`RESOLUTION_JUSTIFICATION_TOO_SHORT: Meaningful root-cause justification (>= 10 chars) is required to resolve incident.`);
        }
        const updatedRaw = {
            ...existing,
            status: 'RESOLVED',
            resolvedAt: Date.now(),
            resolvedBy: params.resolvedBy,
            resolutionJustification: params.resolutionJustification,
        };
        const incidentHash = computeIncidentRecordHash(updatedRaw);
        const frozenUpdated = deepFreeze({
            ...updatedRaw,
            incidentHash,
        });
        this.incidents.set(params.incidentId, frozenUpdated);
        const scopeKey = `${existing.tenantId}:${existing.policyDomain}`;
        const activeSet = this.activeIncidentIndex.get(scopeKey);
        if (activeSet) {
            activeSet.delete(params.incidentId);
        }
        if (this.auditLedger) {
            this.auditLedger.recordEvent({
                eventType: 'POLICY_INCIDENT_RESOLVED',
                tenantId: existing.tenantId,
                policyDomain: existing.policyDomain,
                policyVersion: existing.policyVersion,
                operatorId: params.resolvedBy,
                details: {
                    incidentId: params.incidentId,
                    resolutionJustification: params.resolutionJustification,
                    incidentHash,
                },
            });
        }
        return frozenUpdated;
    }
    getIncident(incidentId) {
        return this.incidents.get(incidentId);
    }
    getActiveIncidents(tenantId, policyDomain) {
        const scopeKey = `${tenantId}:${policyDomain}`;
        const activeSet = this.activeIncidentIndex.get(scopeKey);
        if (!activeSet || activeSet.size === 0)
            return [];
        const result = [];
        for (const id of activeSet) {
            const record = this.incidents.get(id);
            if (record && record.status !== 'RESOLVED') {
                result.push(record);
            }
        }
        return Object.freeze(result);
    }
}
