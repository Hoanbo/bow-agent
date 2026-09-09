// src/core/resilience/crossEpisodePatternEngine.ts
// BOWCON V4.0 — MS-1.3.44: CROSS-EPISODE PATTERN MINING ENGINE
//
// Mins recurring patterns across multiple episodes to detect structural host,
// capability, planning, and recovery failure modes.
//
// INVARIANTS:
// - A pattern MUST NOT be created from a single observation (observationCount >= 2 required).
// - INFERENCE != FACT. PREDICTION != FACT. MEMORY != TRUTH. PATTERN != FACT.
// - Engine output is strictly advisory (isAdvisoryOnly: true).
// - Engine NEVER executes actions or creates authorization tokens.
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0
import { generateResilienceId, } from './cognitiveResilienceTypes.js';
export class CrossEpisodePatternEngine {
    _patterns = new Map();
    _contradictoryEvidenceMap = new Map();
    /**
     * Mines patterns across an array of cognitive episodes.
     * Enforces minimum evidence threshold (>= 2 observations).
     */
    minePatterns(episodes) {
        if (!episodes || episodes.length === 0)
            return [];
        const discoveredPatterns = [];
        // 1. Recurring Execution Failures
        const failureGroups = new Map();
        for (const ep of episodes) {
            if (ep.executionResult && (ep.executionResult.includes('FAILURE') || ep.executionResult.includes('error') || ep.executionResult.includes('failed'))) {
                const key = ep.projectId || 'global_scope';
                if (!failureGroups.has(key)) {
                    failureGroups.set(key, { episodeIds: [], timestamps: [], details: [] });
                }
                const group = failureGroups.get(key);
                group.episodeIds.push(ep.episodeId);
                group.timestamps.push(ep.createdAt);
                group.details.push(ep.executionResult);
            }
        }
        for (const [scope, group] of failureGroups.entries()) {
            if (group.episodeIds.length >= 2) {
                const pattern = this._registerOrUpdatePattern({
                    patternType: 'REPEATED_FAILURE',
                    description: `Recurring execution failure detected in scope '${scope}' across ${group.episodeIds.length} episodes.`,
                    supportingEpisodeIds: group.episodeIds,
                    observationCount: group.episodeIds.length,
                    firstObservedAt: Math.min(...group.timestamps),
                    lastObservedAt: Math.max(...group.timestamps),
                    confidence: Math.min(0.5 + group.episodeIds.length * 0.1, 0.95),
                    provenance: 'OBSERVED_PATTERN',
                    patternStatus: 'ACTIVE',
                    recommendedAction: 'Perform root cause analysis and assess host/environment stability.',
                });
                discoveredPatterns.push(pattern);
            }
        }
        // 2. Recurring Verification Failures
        const verificationFailures = new Map();
        for (const ep of episodes) {
            if (ep.verificationResult && (ep.verificationResult.includes('FAIL') || ep.verificationResult.includes('unverified') || ep.verificationResult.includes('mismatch'))) {
                const key = ep.relatedObjective || ep.goalId || 'objective_unknown';
                if (!verificationFailures.has(key)) {
                    verificationFailures.set(key, { episodeIds: [], timestamps: [] });
                }
                const group = verificationFailures.get(key);
                group.episodeIds.push(ep.episodeId);
                group.timestamps.push(ep.createdAt);
            }
        }
        for (const [obj, group] of verificationFailures.entries()) {
            if (group.episodeIds.length >= 2) {
                const pattern = this._registerOrUpdatePattern({
                    patternType: 'VERIFICATION_FAILURE_RECURRING',
                    description: `Repeated verification failure for objective/goal '${obj}' across ${group.episodeIds.length} episodes.`,
                    supportingEpisodeIds: group.episodeIds,
                    observationCount: group.episodeIds.length,
                    firstObservedAt: Math.min(...group.timestamps),
                    lastObservedAt: Math.max(...group.timestamps),
                    confidence: Math.min(0.6 + group.episodeIds.length * 0.1, 0.95),
                    provenance: 'OBSERVED_PATTERN',
                    patternStatus: 'ACTIVE',
                    recommendedAction: 'Inspect verification criteria and telemetry sources before re-executing.',
                });
                discoveredPatterns.push(pattern);
            }
        }
        // 3. Recurring Interrupted Cycles
        const interruptedEpisodes = episodes.filter((ep) => ep.phase === 'INTERRUPTED' || (ep.triggeringContext && ep.triggeringContext.includes('interrupted')));
        if (interruptedEpisodes.length >= 2) {
            const timestamps = interruptedEpisodes.map((e) => e.createdAt);
            const pattern = this._registerOrUpdatePattern({
                patternType: 'CYCLE_INTERRUPTED_RECURRING',
                description: `Recurring cognitive cycle interruptions detected across ${interruptedEpisodes.length} episodes.`,
                supportingEpisodeIds: interruptedEpisodes.map((e) => e.episodeId),
                observationCount: interruptedEpisodes.length,
                firstObservedAt: Math.min(...timestamps),
                lastObservedAt: Math.max(...timestamps),
                confidence: 0.8,
                provenance: 'OBSERVED_PATTERN',
                patternStatus: 'ACTIVE',
                recommendedAction: 'Check host resource headroom and watchdog timeout configurations.',
            });
            discoveredPatterns.push(pattern);
        }
        // 4. Contradiction Patterns
        const contradictionEpisodes = episodes.filter((ep) => ep.contradictions && ep.contradictions.length > 0);
        if (contradictionEpisodes.length >= 2) {
            const timestamps = contradictionEpisodes.map((e) => e.createdAt);
            const pattern = this._registerOrUpdatePattern({
                patternType: 'CONTRADICTION_RECURRING',
                description: `Persistent epistemic contradictions detected across ${contradictionEpisodes.length} episodes.`,
                supportingEpisodeIds: contradictionEpisodes.map((e) => e.episodeId),
                observationCount: contradictionEpisodes.length,
                firstObservedAt: Math.min(...timestamps),
                lastObservedAt: Math.max(...timestamps),
                confidence: 0.75,
                provenance: 'OBSERVED_PATTERN',
                patternStatus: 'MONITORING',
                recommendedAction: 'Request Master Owner clarification on contradictory world states.',
            });
            discoveredPatterns.push(pattern);
        }
        // 5. Long-Horizon Goal Stalls
        const goalStalls = new Map();
        for (const ep of episodes) {
            if (!ep.isComplete && ep.goalId) {
                if (!goalStalls.has(ep.goalId)) {
                    goalStalls.set(ep.goalId, { episodeIds: [], timestamps: [] });
                }
                const g = goalStalls.get(ep.goalId);
                g.episodeIds.push(ep.episodeId);
                g.timestamps.push(ep.createdAt);
            }
        }
        for (const [goalId, group] of goalStalls.entries()) {
            if (group.episodeIds.length >= 2) {
                const pattern = this._registerOrUpdatePattern({
                    patternType: 'LONG_HORIZON_GOAL_STALL',
                    description: `Long-horizon goal '${goalId}' has multiple unresolved episodes (${group.episodeIds.length}) without verified completion.`,
                    supportingEpisodeIds: group.episodeIds,
                    observationCount: group.episodeIds.length,
                    firstObservedAt: Math.min(...group.timestamps),
                    lastObservedAt: Math.max(...group.timestamps),
                    confidence: 0.7,
                    provenance: 'OBSERVED_PATTERN',
                    patternStatus: 'ACTIVE',
                    recommendedAction: 'Review capability dependencies and evaluate whether sub-goals are blocked.',
                });
                discoveredPatterns.push(pattern);
            }
        }
        return discoveredPatterns;
    }
    /**
     * Registers an explicit candidate pattern with strict validation:
     * Rejects any pattern with fewer than 2 supporting observations.
     */
    registerPattern(params) {
        const count = params.observationCount ?? params.supportingEpisodeIds.length;
        if (count < 2 || params.supportingEpisodeIds.length < 2) {
            throw new Error(`EPISTEMIC_VIOLATION: Cannot create cross-episode pattern from single observation (count=${count}). Minimum 2 observations required.`);
        }
        return this._registerOrUpdatePattern({
            patternType: params.patternType,
            description: params.description,
            supportingEpisodeIds: params.supportingEpisodeIds,
            observationCount: count,
            firstObservedAt: params.firstObservedAt ?? Date.now(),
            lastObservedAt: params.lastObservedAt ?? Date.now(),
            confidence: params.confidence ?? 0.7,
            provenance: params.provenance ?? 'OBSERVED_PATTERN',
            patternStatus: params.patternStatus ?? 'ACTIVE',
            contradictoryEvidence: params.contradictoryEvidence ?? [],
            unresolvedUncertainty: params.unresolvedUncertainty ?? [],
            recommendedAction: params.recommendedAction,
        });
    }
    /**
     * Adds contradictory evidence against an identified pattern.
     * If contradictory evidence exceeds threshold, status transitions to REFUTED or MONITORING.
     */
    addContradictoryEvidence(patternId, contradictoryEpisodeId, reason) {
        const pattern = this._patterns.get(patternId);
        if (!pattern)
            throw new Error(`Pattern '${patternId}' not found.`);
        if (!this._contradictoryEvidenceMap.has(patternId)) {
            this._contradictoryEvidenceMap.set(patternId, []);
        }
        const list = this._contradictoryEvidenceMap.get(patternId);
        list.push(`${contradictoryEpisodeId}: ${reason}`);
        const newContradictions = [...pattern.contradictoryEvidence, `${contradictoryEpisodeId}: ${reason}`];
        let newStatus = pattern.patternStatus;
        let newConfidence = Math.max(0.1, pattern.confidence - 0.2);
        if (newContradictions.length >= pattern.observationCount) {
            newStatus = 'REFUTED';
        }
        else if (newContradictions.length >= 1) {
            newStatus = 'MONITORING';
        }
        const updated = {
            ...pattern,
            confidence: newConfidence,
            contradictoryEvidence: newContradictions,
            patternStatus: newStatus,
            lastObservedAt: Date.now(),
        };
        this._patterns.set(patternId, updated);
    }
    /**
     * Master Owner affirmation of a pattern elevates provenance to OWNER_CONFIRMED_PATTERN.
     * Invariant: Only Owner can affirm; BOWCON cannot self-affirm.
     */
    affirmByOwner(patternId, ownerId) {
        const pattern = this._patterns.get(patternId);
        if (!pattern)
            throw new Error(`Pattern '${patternId}' not found.`);
        const updated = {
            ...pattern,
            provenance: 'OWNER_CONFIRMED_PATTERN',
            confidence: 1.0,
            lastObservedAt: Date.now(),
        };
        this._patterns.set(patternId, updated);
        return updated;
    }
    getPattern(patternId) {
        return this._patterns.get(patternId);
    }
    getAllPatterns() {
        return Array.from(this._patterns.values());
    }
    getActivePatterns() {
        return Array.from(this._patterns.values()).filter((p) => p.patternStatus === 'ACTIVE');
    }
    clear() {
        this._patterns.clear();
        this._contradictoryEvidenceMap.clear();
    }
    _registerOrUpdatePattern(params) {
        // Check if equivalent pattern already exists
        for (const [id, existing] of this._patterns.entries()) {
            if (existing.patternType === params.patternType && existing.description === params.description) {
                const mergedEpisodes = Array.from(new Set([...existing.supportingEpisodeIds, ...params.supportingEpisodeIds]));
                const updated = {
                    ...existing,
                    observationCount: mergedEpisodes.length,
                    supportingEpisodeIds: mergedEpisodes,
                    lastObservedAt: Math.max(existing.lastObservedAt, params.lastObservedAt),
                    confidence: Math.min(existing.confidence + 0.05, 0.95),
                };
                this._patterns.set(id, updated);
                return updated;
            }
        }
        const patternId = generateResilienceId('pat');
        const record = {
            patternId,
            patternType: params.patternType,
            description: params.description,
            observationCount: params.observationCount,
            supportingEpisodeIds: [...params.supportingEpisodeIds],
            firstObservedAt: params.firstObservedAt,
            lastObservedAt: params.lastObservedAt,
            confidence: params.confidence,
            provenance: params.provenance,
            patternStatus: params.patternStatus,
            contradictoryEvidence: params.contradictoryEvidence ?? [],
            unresolvedUncertainty: params.unresolvedUncertainty ?? [],
            recommendedAction: params.recommendedAction,
            isAdvisoryOnly: true,
        };
        this._patterns.set(patternId, record);
        return record;
    }
}
export const globalCrossEpisodePatternEngine = new CrossEpisodePatternEngine();
