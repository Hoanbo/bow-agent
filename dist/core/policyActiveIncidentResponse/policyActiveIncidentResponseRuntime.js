// src/core/policyActiveIncidentResponse/policyActiveIncidentResponseRuntime.ts
// BOWCON V4.0 — MS-1.3.74: GOVERNED ACTIVE POLICY INCIDENT RESPONSE, DEGRADATION DETECTION & EMERGENCY SAFETY BOUNDARY
//
// Master Active Policy Incident Response Runtime Coordinator (Component 839).
// Coordinates trusted signal resolution, degradation detection, deterministic incident classification,
// emergency safety boundary activation, human escalation, durable storage, cryptographic provenance,
// and canonical audit logging under USER_STOP supremacy.
//
// Core Authority Invariants:
// - INCIDENT_DETECTION != POLICY_AUTHORITY
// - DEGRADATION_DETECTION != POLICY_MUTATION
// - EMERGENCY_SAFETY_BOUNDARY != POLICY_AUTHORITY
// - EMERGENCY_SAFETY_BOUNDARY != POLICY_MUTATION
// - INCIDENT_RESPONSE != AUTONOMOUS_ROLLBACK
// - INCIDENT_RESPONSE != AUTONOMOUS_RECOVERY
// - INCIDENT_RESPONSE != AUTONOMOUS_REPAIR
// - PDP != POLICY_AUTHORITY
// - PEP != POLICY_AUTHORITY
// - ZERO AUTONOMOUS POLICY MUTATION
// - ZERO AUTONOMOUS POLICY ACTIVATION
// - ZERO AUTONOMOUS ROLLBACK / SUNSET / RECOVERY
// - ZERO AUTONOMOUS REPAIR
// - ZERO DIRECT TOOL EXECUTION
// - HUMAN_AUTHORIZATION > AUTONOMOUS_AUTHORIZATION
// - USER_STOP > EVERYTHING
// - FAIL_CLOSED
import crypto from 'node:crypto';
import { createActiveIncidentId, } from './policyActiveIncidentResponseTypes.js';
import { PolicyActiveIncidentSignalResolver } from './policyActiveIncidentSignalResolver.js';
import { PolicyActivePolicyDegradationDetector } from './policyActivePolicyDegradationDetector.js';
import { PolicyActiveIncidentClassifier } from './policyActiveIncidentClassifier.js';
import { PolicyEmergencySafetyBoundary } from './policyEmergencySafetyBoundary.js';
import { PolicyIncidentEscalationEngine } from './policyIncidentEscalationEngine.js';
import { PolicyActiveIncidentStore } from './policyActiveIncidentStore.js';
import { PolicyActiveIncidentProvenanceEngine } from './policyActiveIncidentProvenanceEngine.js';
import { PolicyActiveIncidentAuditEngine } from './policyActiveIncidentAuditEngine.js';
export class PolicyActiveIncidentResponseRuntime {
    signalResolver;
    degradationDetector;
    classifier;
    safetyBoundary;
    escalationEngine;
    incidentStore;
    provenanceEngine;
    auditEngine;
    isUserStopActiveFn;
    constructor(options, signalResolver, degradationDetector, classifier, safetyBoundary, escalationEngine, incidentStore, provenanceEngine, auditEngine) {
        this.isUserStopActiveFn = options?.isUserStopActive;
        this.signalResolver = signalResolver ?? new PolicyActiveIncidentSignalResolver(options);
        this.degradationDetector = degradationDetector ?? new PolicyActivePolicyDegradationDetector(options);
        this.classifier = classifier ?? new PolicyActiveIncidentClassifier(options);
        this.safetyBoundary = safetyBoundary ?? new PolicyEmergencySafetyBoundary(options);
        this.escalationEngine = escalationEngine ?? new PolicyIncidentEscalationEngine(options);
        this.incidentStore = incidentStore ?? new PolicyActiveIncidentStore(options);
        this.provenanceEngine = provenanceEngine ?? new PolicyActiveIncidentProvenanceEngine(options);
        this.auditEngine = auditEngine ?? new PolicyActiveIncidentAuditEngine(options);
    }
    assertUserStopInactive(tenantPartition) {
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            if (tenantPartition) {
                try {
                    this.auditEngine.recordEvent({
                        eventType: 'USER_STOP_BLOCKED',
                        tenantPartition,
                        details: { reason: 'Operation suspended by active USER_STOP signal' },
                    });
                }
                catch {
                    // Ignore audit errors when aborting for USER_STOP
                }
            }
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Active policy incident response suspended by USER_STOP supremacy');
        }
    }
    /**
     * Evaluates active policy operational health and creates or updates incidents.
     */
    evaluateIncidentState(tenantPartition, params) {
        this.assertUserStopInactive(tenantPartition);
        // 1. Audit start
        this.auditEngine.recordEvent({
            eventType: 'INCIDENT_DETECTION_STARTED',
            tenantPartition,
            actorUserId: params.actorUserId,
            details: { tenantPartition },
        });
        // 2. Resolve signals
        const resolvedSignals = this.signalResolver.resolveSignals(tenantPartition, params);
        // 3. Detect degradation
        const degradation = this.degradationDetector.detectDegradation(resolvedSignals);
        // 4. Classify
        const classification = this.classifier.classifyIncident(degradation);
        if (classification.severity === 'NORMAL') {
            return null;
        }
        // 5. Deduplicate via deterministic fingerprint
        const primaryCat = degradation.primaryCategory ?? 'CORRUPTED_ACTIVE_STATE';
        const fingerprint = crypto
            .createHash('sha256')
            .update(`${tenantPartition}:${primaryCat}:${resolvedSignals.activePolicyStateId ?? 'none'}:${degradation.severity}`)
            .digest('hex');
        const existingIncident = this.incidentStore.getIncidentByFingerprint(tenantPartition, fingerprint);
        const now = new Date().toISOString();
        let incidentId = existingIncident?.incidentId ?? createActiveIncidentId(`inc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
        let escalationId = existingIncident?.escalationId ?? null;
        // 6. Establish Emergency Safety Boundary if required
        let boundaryStatus = classification.safetyBoundaryStatus;
        if (boundaryStatus !== 'INACTIVE') {
            this.safetyBoundary.activateSafetyBoundary(tenantPartition, incidentId, boundaryStatus, classification.rationale);
            this.auditEngine.recordEvent({
                eventType: 'SAFETY_BOUNDARY_ACTIVATED',
                tenantPartition,
                actorUserId: params.actorUserId,
                details: { incidentId, boundaryStatus, rationale: classification.rationale },
            });
        }
        // 7. Human Escalation if required
        if (classification.requiresHumanEscalation && !escalationId) {
            const escRecord = this.escalationEngine.escalateIncident(tenantPartition, incidentId, classification.severity, `Active policy degradation: ${primaryCat}`, classification.rationale);
            this.incidentStore.saveEscalation(escRecord);
            escalationId = escRecord.escalationId;
            this.auditEngine.recordEvent({
                eventType: 'INCIDENT_ESCALATED',
                tenantPartition,
                actorUserId: params.actorUserId,
                details: { incidentId, escalationId, severity: classification.severity },
            });
        }
        // 8. Construct immutable incident record
        const incidentRecord = Object.freeze({
            incidentId,
            tenantPartition,
            fingerprint,
            activePolicyStateId: resolvedSignals.activePolicyStateId ?? null,
            runtimeSnapshotId: resolvedSignals.runtimeSnapshotId ?? null,
            severity: classification.severity,
            state: classification.lifecycleState,
            primaryCategory: primaryCat,
            signals: degradation.triggerSignals,
            safetyBoundaryStatus: boundaryStatus,
            escalationId,
            detectedAt: existingIncident?.detectedAt ?? now,
            updatedAt: now,
            resolvedAt: existingIncident?.resolvedAt ?? null,
            resolvedBy: existingIncident?.resolvedBy ?? null,
            resolutionRationale: existingIncident?.resolutionRationale ?? null,
            isActivePolicy: false,
            isPolicyMutation: false,
            isAutonomousMutation: false,
            isAutonomousRollback: false,
        });
        // 9. Persist incident
        this.incidentStore.saveIncident(incidentRecord);
        // 10. Append provenance
        this.provenanceEngine.appendIncidentEvent(tenantPartition, incidentId, classification.severity, 'INCIDENT_RECORDED', { incidentId, severity: classification.severity, primaryCategory: primaryCat, boundaryStatus });
        // 11. Audit classification
        this.auditEngine.recordEvent({
            eventType: 'INCIDENT_CLASSIFIED',
            tenantPartition,
            actorUserId: params.actorUserId,
            details: {
                incidentId,
                severity: classification.severity,
                primaryCategory: primaryCat,
                boundaryStatus,
                escalationId,
            },
        });
        return incidentRecord;
    }
    /**
     * Enforces emergency safety boundary on proposed action.
     */
    enforceSafetyBoundary(tenantPartition, action, actionClassification) {
        this.assertUserStopInactive(tenantPartition);
        return this.safetyBoundary.enforceSafetyBoundary(tenantPartition, action, actionClassification);
    }
    /**
     * Retrieves active safety boundary for a tenant.
     */
    getActiveSafetyBoundary(tenantPartition) {
        this.assertUserStopInactive(tenantPartition);
        return this.safetyBoundary.getBoundaryState(tenantPartition);
    }
    /**
     * Resolves an incident with explicit human operator governance.
     * Deactivates the safety boundary and records human clearance.
     */
    resolveIncidentWithHumanReview(tenantPartition, incidentId, operatorId, rationale) {
        this.assertUserStopInactive(tenantPartition);
        const incident = this.incidentStore.getIncident(tenantPartition, incidentId);
        if (!incident) {
            throw new Error(`INCIDENT_NOT_FOUND: No incident found with id '${incidentId}' for tenant '${tenantPartition}'`);
        }
        // 1. Anti-autonomous validation
        const opLower = operatorId.toLowerCase().trim();
        if (opLower.startsWith('auto_') ||
            opLower.startsWith('bot_') ||
            opLower.includes('ai_agent') ||
            opLower.includes('daemon') ||
            opLower === 'anonymous' ||
            opLower === 'guest') {
            throw new Error('HUMAN_GOVERNANCE_REQUIRED: Autonomous personas cannot resolve policy incidents.');
        }
        if (!rationale || rationale.trim().length < 10) {
            throw new Error('INVALID_RESOLUTION_RATIONALE: Explicit rationale (>= 10 chars) required.');
        }
        // 2. Deactivate safety boundary
        this.safetyBoundary.deactivateSafetyBoundary(tenantPartition, operatorId, rationale);
        // 3. Update incident record to RESOLVED
        const now = new Date().toISOString();
        const resolvedRecord = Object.freeze({
            ...incident,
            state: 'RESOLVED',
            safetyBoundaryStatus: 'INACTIVE',
            resolvedAt: now,
            resolvedBy: operatorId,
            resolutionRationale: rationale,
            updatedAt: now,
        });
        this.incidentStore.saveIncident(resolvedRecord);
        // 4. Provenance
        this.provenanceEngine.appendIncidentEvent(tenantPartition, incident.incidentId, incident.severity, 'INCIDENT_RESOLVED', { resolvedBy: operatorId, rationale, resolvedAt: now });
        // 5. Audit
        this.auditEngine.recordEvent({
            eventType: 'INCIDENT_RESOLVED',
            tenantPartition,
            actorUserId: operatorId,
            details: { incidentId, resolvedBy: operatorId, rationale },
        });
        return resolvedRecord;
    }
    /**
     * Closes a resolved incident.
     */
    closeIncident(tenantPartition, incidentId, operatorId, rationale) {
        this.assertUserStopInactive(tenantPartition);
        const incident = this.incidentStore.getIncident(tenantPartition, incidentId);
        if (!incident) {
            throw new Error(`INCIDENT_NOT_FOUND: No incident found with id '${incidentId}'`);
        }
        if (incident.state !== 'RESOLVED') {
            throw new Error(`INVALID_STATE_TRANSITION: Incident '${incidentId}' must be in RESOLVED state before closing.`);
        }
        const now = new Date().toISOString();
        const closedRecord = Object.freeze({
            ...incident,
            state: 'CLOSED',
            updatedAt: now,
        });
        this.incidentStore.saveIncident(closedRecord);
        this.provenanceEngine.appendIncidentEvent(tenantPartition, incident.incidentId, incident.severity, 'INCIDENT_CLOSED', { closedBy: operatorId, rationale, closedAt: now });
        this.auditEngine.recordEvent({
            eventType: 'INCIDENT_CLOSED',
            tenantPartition,
            actorUserId: operatorId,
            details: { incidentId, closedBy: operatorId, rationale },
        });
        return closedRecord;
    }
    /**
     * Retrieves the incident provenance chain for a tenant.
     */
    getIncidentProvenance(tenantPartition) {
        this.assertUserStopInactive(tenantPartition);
        return this.provenanceEngine.getChain(tenantPartition);
    }
    /**
     * Verifies the cryptographic integrity of the incident provenance chain.
     */
    verifyIncidentProvenance(tenantPartition) {
        this.assertUserStopInactive(tenantPartition);
        return this.provenanceEngine.verifyChainIntegrity(tenantPartition);
    }
}
