// src/core/world-model/worldModelContradictionEngine.ts
// BOWCON V4.0 — MS-1.3.42: MASTER OWNER WORLD MODEL, SELF-AWARENESS & CAPABILITY-GROUNDED REASONING RUNTIME
//
// Contradiction-Aware World Model Engine.
// Detects conflicts across telemetry, memory, outcomes, and assumptions.
// Crucial invariant: never silently deletes one side of a conflict; unresolved
// conflicts are explicitly maintained in state CONTRADICTED.
import crypto from 'node:crypto';
export class WorldModelContradictionEngine {
    _contradictions = new Map();
    recordContradiction(sourceA, sourceB, evidence, confidence = 0.9, severity = 'MEDIUM', ownerConfirmationRequired = true) {
        const contradictionId = `ctrd_${crypto.randomUUID().slice(0, 8)}`;
        const record = {
            contradictionId,
            sourceA,
            sourceB,
            evidence,
            confidence,
            severity,
            status: 'UNRESOLVED',
            ownerConfirmationRequired,
            detectedAt: Date.now(),
        };
        this._contradictions.set(contradictionId, record);
        return record;
    }
    /**
     * Detects conflict between a stated premise/memory and live observed telemetry.
     */
    detectTelemetryConflict(statedClaim, observedTelemetryClaim, evidenceDetail, severity = 'HIGH') {
        return this.recordContradiction({
            source: 'stated_or_memory',
            claim: statedClaim,
            provenance: 'PERSISTED_MEMORY',
            timestamp: Date.now() - 3600000,
        }, {
            source: 'host_telemetry',
            claim: observedTelemetryClaim,
            provenance: 'HOST_TELEMETRY',
            timestamp: Date.now(),
        }, evidenceDetail, 0.95, severity, true);
    }
    /**
     * Detects conflict between an expected outcome and an actual verified outcome.
     */
    detectOutcomeConflict(expectedOutcome, actualOutcome, actionId) {
        return this.recordContradiction({
            source: `plan_expected:${actionId}`,
            claim: expectedOutcome,
            provenance: 'HYPOTHESIS',
            timestamp: Date.now(),
        }, {
            source: `execution_verified:${actionId}`,
            claim: actualOutcome,
            provenance: 'VERIFIED_OUTCOME',
            timestamp: Date.now(),
        }, `Actual execution outcome diverges from planned hypothesis for action ${actionId}.`, 1.0, 'HIGH', false);
    }
    /**
     * Resolves a contradiction through empirical verified evidence.
     */
    resolveWithEvidence(contradictionId, evidenceProof) {
        const ctrd = this._contradictions.get(contradictionId);
        if (!ctrd)
            return false;
        ctrd.status = 'RESOLVED_BY_EVIDENCE';
        ctrd.resolvedAt = Date.now();
        return true;
    }
    /**
     * Resolves a contradiction through explicit Master Owner confirmation.
     */
    resolveWithOwnerConfirmation(contradictionId) {
        const ctrd = this._contradictions.get(contradictionId);
        if (!ctrd)
            return false;
        ctrd.status = 'OWNER_CONFIRMED';
        ctrd.resolvedAt = Date.now();
        return true;
    }
    getUnresolved() {
        return Array.from(this._contradictions.values()).filter((c) => c.status === 'UNRESOLVED');
    }
    getAll() {
        return Array.from(this._contradictions.values());
    }
    reset() {
        this._contradictions.clear();
    }
}
export const globalWorldModelContradictionEngine = new WorldModelContradictionEngine();
