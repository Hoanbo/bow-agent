// src/core/orchestration/evidenceAggregationEngine.ts
// BOWCON V4.0 — MS-1.3.46: EVIDENCE AGGREGATION ENGINE
//
// Cryptographic bundling, deterministic aggregation, and epistemic state evaluation
// across multi-agent evidence records.
//
// INVARIANTS:
// - Aggregation is NOT truth creation: The resulting bundle remains evidence.
// - AGENT_COUNT != AUTHORITY_COUNT: Multiple agents cannot form collective authority or override Master Owner.
// - Deterministic SHA-256 bundle integrity hash over sorted constituent hashes.
// - Conflicting evidence remains EVIDENCE_CONTRADICTED; never auto-resolved by voting.
// - Session isolation: Evidence from disparate sessions cannot be aggregated.
import crypto from 'node:crypto';
export class EvidenceAggregationError extends Error {
    code;
    details;
    constructor(code, message, details) {
        super(`[${code}] ${message}`);
        this.code = code;
        this.details = details;
        this.name = 'EvidenceAggregationError';
    }
}
export class EvidenceAggregationEngine {
    bundles = new Map();
    /**
     * Calculates deterministic SHA-256 hash over an array of sorted constituent evidence hashes.
     */
    computeBundleHash(evidenceList) {
        const sortedHashes = evidenceList
            .map((e) => `${e.evidenceId}:${e.rawHash}:${e.verificationState}`)
            .sort();
        const payload = sortedHashes.join('|');
        return crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
    }
    /**
     * Evaluates the epistemic state of an aggregated evidence bundle.
     */
    evaluateEpistemicState(evidenceList, contradictions) {
        if (evidenceList.length === 0) {
            return 'EVIDENCE_UNKNOWN';
        }
        if (contradictions.length > 0) {
            return 'EVIDENCE_CONTRADICTED';
        }
        let hasRejected = false;
        let hasIncomplete = false;
        let allVerified = true;
        for (const ev of evidenceList) {
            if (ev.verificationState === 'CONTRADICTED') {
                return 'EVIDENCE_CONTRADICTED';
            }
            if (ev.verificationState === 'REJECTED' || ev.integrityStatus !== 'INTACT') {
                hasRejected = true;
            }
            if (ev.verificationState === 'INCOMPLETE') {
                hasIncomplete = true;
            }
            if (ev.verificationState !== 'VERIFIED') {
                allVerified = false;
            }
        }
        if (hasRejected)
            return 'EVIDENCE_REJECTED';
        if (hasIncomplete)
            return 'EVIDENCE_INCOMPLETE';
        if (allVerified)
            return 'EVIDENCE_VERIFIED';
        return 'EVIDENCE_OBSERVED';
    }
    /**
     * Aggregates a set of evidence records into a tamper-evident EvidenceBundle.
     */
    aggregateEvidence(params) {
        const { taskGroupId, taskId, sessionId, evidenceList, contradictions = [] } = params;
        // 1. Session Isolation Check
        for (const ev of evidenceList) {
            if (ev.sessionId !== sessionId) {
                throw new EvidenceAggregationError('CROSS_SESSION_ORCHESTRATION_REJECTED', `Cannot aggregate evidence from session ${ev.sessionId} into bundle session ${sessionId}`);
            }
        }
        // 2. Count statistics
        let verifiedCount = 0;
        let rejectedCount = 0;
        let contradictedCount = contradictions.length;
        let incompleteCount = 0;
        for (const ev of evidenceList) {
            if (ev.verificationState === 'VERIFIED')
                verifiedCount++;
            else if (ev.verificationState === 'REJECTED' || ev.integrityStatus !== 'INTACT')
                rejectedCount++;
            else if (ev.verificationState === 'CONTRADICTED')
                contradictedCount++;
            else if (ev.verificationState === 'INCOMPLETE')
                incompleteCount++;
        }
        // 3. Compute deterministic bundle hash
        const bundleIntegrityHash = this.computeBundleHash(evidenceList);
        // 4. Determine epistemic state
        const epistemicState = this.evaluateEpistemicState(evidenceList, contradictions);
        const bundleId = `bundle_${taskGroupId}_${bundleIntegrityHash.slice(0, 16)}`;
        const bundle = {
            bundleId,
            taskGroupId,
            taskId,
            sessionId,
            evidenceList: [...evidenceList],
            totalCount: evidenceList.length,
            verifiedCount,
            rejectedCount,
            contradictedCount,
            incompleteCount,
            bundleIntegrityHash,
            epistemicState,
            createdAt: Date.now(),
        };
        this.bundles.set(bundleId, bundle);
        return bundle;
    }
    /**
     * Verifies the cryptographic integrity of an existing EvidenceBundle.
     */
    verifyBundleIntegrity(bundle) {
        const computedHash = this.computeBundleHash(bundle.evidenceList);
        if (computedHash !== bundle.bundleIntegrityHash) {
            return {
                intact: false,
                computedHash,
                error: `EVIDENCE_INTEGRITY_FAILURE: Bundle integrity hash mismatch. Expected ${bundle.bundleIntegrityHash}, computed ${computedHash}`,
            };
        }
        return {
            intact: true,
            computedHash,
        };
    }
    getBundle(bundleId) {
        return this.bundles.get(bundleId);
    }
    clear() {
        this.bundles.clear();
    }
}
export const globalEvidenceAggregationEngine = new EvidenceAggregationEngine();
