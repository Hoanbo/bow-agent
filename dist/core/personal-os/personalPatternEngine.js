// src/core/personal-os/personalPatternEngine.ts
// BOWCON V4.0 — MS-1.3.40: MASTER OWNER PERSONAL OPERATING SYSTEM & PROACTIVE COGNITIVE AGENCY RUNTIME
//
// Section 10: Personal Pattern Engine
// Detects evidence-backed recurring operational, architectural, and failure patterns.
//
// Invariants:
// - Patterns must be evidence-backed (minimum evidence threshold required).
// - Do NOT fabricate behavioral claims without verified observations.
// - Confidence is grounded in observation count, not model speculation.
import { generatePersonalOsId, } from './personalOsTypes';
export class PersonalPatternEngine {
    observations = [];
    detectedPatterns = new Map();
    minThreshold;
    constructor(options) {
        this.minThreshold = options?.minEvidenceThreshold ?? 2;
    }
    /**
     * Ingest a discrete evidence observation.
     */
    recordObservation(patternType, patternKey, evidenceDetail) {
        this.observations.push({
            patternType,
            patternKey: patternKey.trim().toLowerCase(),
            evidenceDetail,
            timestamp: Date.now(),
        });
    }
    /**
     * Analyze accumulated observations and synthesize verified patterns.
     */
    analyzePatterns() {
        const grouped = new Map();
        for (const obs of this.observations) {
            const compositeKey = `${obs.patternType}:::${obs.patternKey}`;
            const list = grouped.get(compositeKey) ?? [];
            list.push(obs);
            grouped.set(compositeKey, list);
        }
        const newlyDetected = [];
        for (const [compositeKey, obsList] of grouped.entries()) {
            if (obsList.length >= this.minThreshold) {
                const [patternTypeStr, patternKey] = compositeKey.split(':::');
                const patternType = patternTypeStr;
                // Honest confidence calculation based on evidence volume
                const confidence = Math.min(0.98, 0.6 + obsList.length * 0.1);
                const patternId = this.detectedPatterns.has(compositeKey)
                    ? this.detectedPatterns.get(compositeKey).patternId
                    : generatePersonalOsId('pat');
                const pattern = {
                    patternId,
                    patternType,
                    observedPattern: `Recurring ${patternType.replace(/_/g, ' ').toLowerCase()}: '${patternKey}'`,
                    evidenceCount: obsList.length,
                    evidenceRecords: obsList.map((o) => o.evidenceDetail),
                    confidence: Number(confidence.toFixed(2)),
                    alternativeExplanations: [
                        'Transient environmental fluctuations',
                        'Uncorrelated coincidence under similar external conditions',
                    ],
                    unknowns: [
                        'Underlying root cause requires dedicated diagnostic run',
                        'Longer temporal baseline needed to rule out external variance',
                    ],
                    detectedAt: Date.now(),
                };
                this.detectedPatterns.set(compositeKey, pattern);
                newlyDetected.push(pattern);
            }
        }
        return newlyDetected;
    }
    /**
     * Retrieve all verified patterns.
     */
    getAllPatterns() {
        return Array.from(this.detectedPatterns.values());
    }
    /**
     * Retrieve patterns filtered by type.
     */
    getPatternsByType(patternType) {
        return Array.from(this.detectedPatterns.values()).filter((p) => p.patternType === patternType);
    }
    /**
     * Clear all observations and patterns (for reset/testing).
     */
    clear() {
        this.observations.length = 0;
        this.detectedPatterns.clear();
    }
}
