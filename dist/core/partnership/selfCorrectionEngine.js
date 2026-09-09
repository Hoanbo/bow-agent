// src/core/partnership/selfCorrectionEngine.ts
// BOWCON V4.0 — MS-1.3.39: MASTER OWNER COGNITIVE PARTNERSHIP & PERSISTENT PERSONAL INTELLIGENCE RUNTIME
//
// Section 11: Self-Correction Engine
// Tracks explicit SELF_CORRECTION records when verified evidence disproves
// earlier reasoning, assumptions, or model outputs.
//
// Invariants:
// - BOWCON must not protect its previous answer merely because it was previously generated.
// - Verified host evidence > historical model output.
// - Epistemic honesty: track confidence shifts explicitly.
import { generatePartnershipId, } from './partnershipTypes';
export class SelfCorrectionEngine {
    corrections = new Map();
    /**
     * Record an explicit self-correction.
     * If an associated memory is provided and memoryStore is passed, update its status.
     */
    recordCorrection(params, memoryStore) {
        const correctionId = generatePartnershipId('corr');
        const record = {
            correctionId,
            previousAssessment: params.previousAssessment,
            newEvidence: params.newEvidence,
            detectedError: params.detectedError,
            correctedAssessment: params.correctedAssessment,
            confidenceChange: {
                before: Math.max(0, Math.min(1, params.confidenceBefore)),
                after: Math.max(0, Math.min(1, params.confidenceAfter)),
            },
            affectedDecisions: params.affectedDecisions ?? [],
            timestamp: Date.now(),
        };
        this.corrections.set(correctionId, record);
        // If there is an associated memory item, mark it CONTRADICTED or SUPERSEDED
        if (params.associatedMemoryId && memoryStore) {
            const mem = memoryStore.getMemory(params.associatedMemoryId);
            if (mem) {
                // Demote memory status
                memoryStore.updateMemoryStatus(mem.memoryId, 'CONTRADICTED', {
                    supersededByCorrectionId: correctionId,
                    correctionNotes: params.detectedError,
                });
            }
        }
        return record;
    }
    /**
     * Retrieve all recorded self-corrections.
     */
    getAllCorrections() {
        return Array.from(this.corrections.values());
    }
    /**
     * Retrieve a specific self-correction record by ID.
     */
    getCorrection(correctionId) {
        return this.corrections.get(correctionId);
    }
    /**
     * Clear all records (for reset/testing).
     */
    clear() {
        this.corrections.clear();
    }
}
