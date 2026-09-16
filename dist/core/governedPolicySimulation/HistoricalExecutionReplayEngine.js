// src/core/governedPolicySimulation/HistoricalExecutionReplayEngine.ts
// Component 1209: HistoricalExecutionReplayEngine (REAL)
//
// Pure in-memory deterministic replay of historical execution evidence against candidate policy deltas.
// Tái hiện tiền định hoàn toàn trong bộ nhớ bằng chứng thực thi lịch sử đối chiếu các đề xuất chính sách ứng viên.
import { EmergencyStopActiveError, SimulationCrossTenantAccessForbiddenError, SimulationAuthorityViolationError, computeReplayCorpusHash, sanitizeUntrustedText, } from './GovernedPolicySimulationTypes.js';
export class HistoricalExecutionReplayEngine {
    emergencyStopProvider;
    maxReplayBatchSize;
    constructor(emergencyStopProvider, config) {
        this.emergencyStopProvider = emergencyStopProvider;
        this.maxReplayBatchSize = config?.maxReplayBatchSize ?? 5000;
    }
    assertEmergencyStopInactive() {
        if (!this.emergencyStopProvider) {
            throw new EmergencyStopActiveError('Emergency stop provider is missing or undefined (fail-closed)');
        }
        let active;
        try {
            active = this.emergencyStopProvider.isEmergencyStopActive();
        }
        catch (err) {
            throw new EmergencyStopActiveError(`Emergency stop provider threw error during simulation: ${err instanceof Error ? err.message : String(err)}`);
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
    /**
     * Replays historical observation corpus against candidate policy changes in memory.
     * REPLAY != RE-EXECUTION: Zero tools are called, zero external processes or side-effects.
     */
    replayCorpus(tenantId, policyDomain, candidateDeltas, historicalCorpus) {
        this.assertEmergencyStopInactive();
        const cleanTenant = this.sanitizeTenantId(tenantId);
        if (!Array.isArray(candidateDeltas)) {
            throw new SimulationAuthorityViolationError('Candidate deltas must be an array');
        }
        if (!Array.isArray(historicalCorpus)) {
            throw new SimulationAuthorityViolationError('Historical corpus must be an array');
        }
        // Verify all corpus items belong to calling tenant and domain
        for (const item of historicalCorpus) {
            if (item.tenantId !== cleanTenant || item.policyDomain !== policyDomain) {
                throw new SimulationCrossTenantAccessForbiddenError(`Cross-tenant replay violation: item tenant ${item.tenantId} does not match caller ${cleanTenant}`);
            }
        }
        const corpusHash = computeReplayCorpusHash(historicalCorpus);
        const totalReplayed = Math.min(historicalCorpus.length, this.maxReplayBatchSize);
        let newlyDeniedCount = 0;
        let newlyPermittedCount = 0;
        let unchangedCount = 0;
        let falseRejectionCount = 0;
        let trueMitigationCount = 0;
        // In-memory deterministic simulation against delta constraints
        for (let i = 0; i < totalReplayed; i++) {
            const observation = historicalCorpus[i];
            const wasCompliant = observation.wasCompliant;
            // Evaluate whether candidate deltas alter the decision
            let wouldPermitUnderCandidate = wasCompliant;
            for (const delta of candidateDeltas) {
                const sanitizedRationale = sanitizeUntrustedText(delta.rationale);
                if (sanitizedRationale.includes('[SANITIZED_INSTRUCTION]')) {
                    // Untrusted injection pattern in delta rationale
                }
                // Check rule matching based on parameter limits or action clamps
                if (delta.fieldPath.includes(observation.actionType) || delta.fieldPath.includes('rules')) {
                    if (typeof delta.proposedValue === 'boolean') {
                        wouldPermitUnderCandidate = delta.proposedValue;
                    }
                    else if (typeof delta.proposedValue === 'number' && typeof observation.parameters.value === 'number') {
                        wouldPermitUnderCandidate = observation.parameters.value <= delta.proposedValue;
                    }
                    else if (delta.proposedValue === 'DENY' || delta.proposedValue === 'CLAMP') {
                        wouldPermitUnderCandidate = false;
                    }
                    else if (delta.proposedValue === 'ALLOW') {
                        wouldPermitUnderCandidate = true;
                    }
                }
            }
            if (wasCompliant && !wouldPermitUnderCandidate) {
                newlyDeniedCount++;
                falseRejectionCount++; // Action was previously valid, now blocked by candidate
            }
            else if (!wasCompliant && wouldPermitUnderCandidate) {
                newlyPermittedCount++;
            }
            else if (!wasCompliant && !wouldPermitUnderCandidate) {
                trueMitigationCount++; // Action was violating, still correctly blocked or mitigated
                unchangedCount++;
            }
            else {
                unchangedCount++;
            }
        }
        return Object.freeze({
            totalReplayed,
            newlyDeniedCount,
            newlyPermittedCount,
            unchangedCount,
            falseRejectionCount,
            trueMitigationCount,
            corpusHash,
            replayedAt: Date.now(),
        });
    }
}
