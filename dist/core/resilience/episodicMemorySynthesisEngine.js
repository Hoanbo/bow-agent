// src/core/resilience/episodicMemorySynthesisEngine.ts
// BOWCON V4.0 — MS-1.3.43: EPISODIC MEMORY SYNTHESIS
//
// Creates and reconstructs meaningful sequences of events (episodes), as opposed
// to isolated memories. An episode captures the full lifecycle:
//   OBSERVATION → DECISION → ACTION → EXECUTION → VERIFICATION → OUTCOME → LEARNING
//
// Historical episodes are IMMUTABLE. Events and observations may only be appended.
// A lesson may only be derived from verified evidence — never fabricated.
//
// INVARIANTS:
// - Historical episode events must never be overwritten.
// - INFERENCE != FACT: lessons are tagged as speculative until verified.
// - MEMORY != TRUTH: episodes are recalled, not re-created.
// - Episode persistence survives process restart.
// - Corrupted episodes are rejected, not silently trusted.
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { generateResilienceId, } from './cognitiveResilienceTypes.js';
import { MASTER_OWNER_ID } from '../architecture/masterArchitectureIdentity.js';
function computeEpisodeHash(episode) {
    const payload = JSON.stringify({
        episodeId: episode.episodeId,
        createdAt: episode.createdAt,
        ownerId: episode.ownerId,
        projectId: episode.projectId,
        goalId: episode.goalId,
        triggeringContext: episode.triggeringContext,
        events: episode.events,
        observations: episode.observations,
    });
    return crypto.createHash('sha256').update(payload).digest('hex').slice(0, 32);
}
export class EpisodicMemorySynthesisEngine {
    _episodes = new Map();
    _storagePath;
    constructor(storageDir = 'data/episodes') {
        if (storageDir.includes('shopofbow')) {
            throw new Error('SECURITY_VIOLATION: Episode storage cannot target protected workspace C:\\BOW\\shopofbow.');
        }
        this._storagePath = path.join(storageDir, 'episodes.json');
        this._rehydrate();
    }
    // ---------------------------------------------------------------------------
    // CREATE
    // ---------------------------------------------------------------------------
    openEpisode(params) {
        const episodeId = generateResilienceId('ep');
        const skeleton = {
            episodeId,
            createdAt: Date.now(),
            ownerId: params.ownerId ?? MASTER_OWNER_ID,
            projectId: params.projectId,
            goalId: params.goalId,
            triggeringContext: params.triggeringContext,
            relatedObjective: params.relatedObjective,
            events: [],
            observations: [],
            decisions: [],
            ownerDecision: undefined,
            bowconRecommendation: undefined,
            authorizedActions: [],
            executionResult: undefined,
            verificationResult: undefined,
            outcome: undefined,
            lessons: [],
            contradictions: [],
            uncertainties: [],
            provenanceChain: [],
            overallConfidence: 0.5,
            phase: 'OBSERVATION',
            isComplete: false,
            completedAt: undefined,
        };
        const episode = {
            ...skeleton,
            integrityHash: computeEpisodeHash(skeleton),
            isBoundedToRecommendation: undefined, // not on episode
        };
        // Build clean episode
        const clean = {
            episodeId,
            createdAt: skeleton.createdAt,
            ownerId: skeleton.ownerId,
            projectId: skeleton.projectId,
            goalId: skeleton.goalId,
            triggeringContext: skeleton.triggeringContext,
            relatedObjective: skeleton.relatedObjective,
            events: [],
            observations: [],
            decisions: [],
            ownerDecision: undefined,
            bowconRecommendation: undefined,
            authorizedActions: [],
            executionResult: undefined,
            verificationResult: undefined,
            outcome: undefined,
            lessons: [],
            contradictions: [],
            uncertainties: [],
            provenanceChain: [],
            overallConfidence: 0.5,
            phase: 'OBSERVATION',
            integrityHash: computeEpisodeHash(skeleton),
            isComplete: false,
        };
        this._episodes.set(episodeId, clean);
        this._persist();
        return clean;
    }
    // ---------------------------------------------------------------------------
    // APPEND (immutable append-only mutation)
    // ---------------------------------------------------------------------------
    appendEvent(episodeId, event) {
        const ep = this._getEpisode(episodeId);
        const fullEvent = {
            eventId: generateResilienceId('evt'),
            ...event,
        };
        ep.events.push(fullEvent);
        this._refreshHash(ep);
        this._persist();
        return fullEvent;
    }
    appendObservation(episodeId, observation, provenance) {
        const ep = this._getEpisode(episodeId);
        ep.observations.push(observation);
        ep.provenanceChain.push(provenance);
        this._refreshHash(ep);
        this._persist();
    }
    recordDecision(episodeId, params) {
        const ep = this._getEpisode(episodeId);
        ep.decisions.push(params.decision);
        if (params.bowconRecommendation !== undefined) {
            ep.bowconRecommendation = params.bowconRecommendation;
        }
        if (params.ownerDecision !== undefined) {
            ep.ownerDecision = params.ownerDecision;
        }
        ep.phase = 'DECISION';
        this._refreshHash(ep);
        this._persist();
    }
    recordAuthorizedAction(episodeId, actionId) {
        const ep = this._getEpisode(episodeId);
        ep.authorizedActions.push(actionId);
        ep.phase = 'ACTION';
        this._refreshHash(ep);
        this._persist();
    }
    recordExecutionResult(episodeId, result) {
        const ep = this._getEpisode(episodeId);
        ep.executionResult = result;
        ep.phase = 'EXECUTION';
        this._refreshHash(ep);
        this._persist();
    }
    recordVerificationResult(episodeId, result) {
        const ep = this._getEpisode(episodeId);
        ep.verificationResult = result;
        ep.phase = 'VERIFICATION';
        this._refreshHash(ep);
        this._persist();
    }
    recordOutcome(episodeId, outcome, confidence) {
        const ep = this._getEpisode(episodeId);
        ep.outcome = outcome;
        ep.overallConfidence = Math.max(0, Math.min(1, confidence));
        ep.phase = 'OUTCOME';
        this._refreshHash(ep);
        this._persist();
    }
    appendLesson(episodeId, lesson) {
        const ep = this._getEpisode(episodeId);
        const full = {
            lessonId: generateResilienceId('les'),
            ...lesson,
        };
        ep.lessons.push(full);
        ep.phase = 'LEARNING';
        this._refreshHash(ep);
        this._persist();
        return full;
    }
    appendContradiction(episodeId, contradiction) {
        const ep = this._getEpisode(episodeId);
        ep.contradictions.push(contradiction);
        this._refreshHash(ep);
        this._persist();
    }
    appendUncertainty(episodeId, uncertainty) {
        const ep = this._getEpisode(episodeId);
        ep.uncertainties.push(uncertainty);
        this._refreshHash(ep);
        this._persist();
    }
    completeEpisode(episodeId) {
        const ep = this._getEpisode(episodeId);
        ep.isComplete = true;
        ep.completedAt = Date.now();
        ep.phase = 'COMPLETED';
        this._refreshHash(ep);
        this._persist();
    }
    markInterrupted(episodeId) {
        const ep = this._getEpisode(episodeId);
        ep.phase = 'INTERRUPTED';
        this._persist();
    }
    // ---------------------------------------------------------------------------
    // READ
    // ---------------------------------------------------------------------------
    getEpisode(episodeId) {
        return this._episodes.get(episodeId);
    }
    getAllEpisodes() {
        return Array.from(this._episodes.values());
    }
    getEpisodesByProject(projectId) {
        return Array.from(this._episodes.values()).filter((e) => e.projectId === projectId);
    }
    getCompletedEpisodes() {
        return Array.from(this._episodes.values()).filter((e) => e.isComplete);
    }
    getInterruptedEpisodes() {
        return Array.from(this._episodes.values()).filter((e) => e.phase === 'INTERRUPTED');
    }
    /**
     * Reconstructs episode from persisted storage.
     * Validates integrity hash and rejects corrupted episodes.
     */
    reconstructEpisode(episodeId) {
        const ep = this._episodes.get(episodeId);
        if (!ep)
            return { episode: null, valid: false, reason: `Episode '${episodeId}' not found in store.` };
        // Recompute hash to validate integrity
        const recomputed = computeEpisodeHash(ep);
        // Compare first 32 chars (our stored hash length)
        const storedPrefix = ep.integrityHash;
        if (recomputed !== storedPrefix) {
            return {
                episode: null,
                valid: false,
                reason: `Episode '${episodeId}' integrity check failed. Hash mismatch. Episode rejected — will NOT be silently trusted.`,
            };
        }
        return { episode: ep, valid: true, reason: 'Integrity verified.' };
    }
    // ---------------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------------
    _getEpisode(episodeId) {
        const ep = this._episodes.get(episodeId);
        if (!ep)
            throw new Error(`Episode '${episodeId}' not found.`);
        return ep;
    }
    _refreshHash(ep) {
        ep.integrityHash = computeEpisodeHash(ep);
    }
    _persist() {
        try {
            const dir = path.dirname(this._storagePath);
            if (!fs.existsSync(dir))
                fs.mkdirSync(dir, { recursive: true });
            const data = JSON.stringify(Array.from(this._episodes.values()), null, 2);
            fs.writeFileSync(this._storagePath, data, 'utf8');
        }
        catch {
            // Persist failure is non-fatal — in-memory state remains intact
        }
    }
    _rehydrate() {
        try {
            if (!fs.existsSync(this._storagePath))
                return;
            const raw = fs.readFileSync(this._storagePath, 'utf8');
            const episodes = JSON.parse(raw);
            for (const ep of episodes) {
                // Validate integrity before loading
                const recomputed = computeEpisodeHash(ep);
                if (recomputed === ep.integrityHash) {
                    this._episodes.set(ep.episodeId, ep);
                }
                // Corrupted episodes are silently dropped — they are NOT trusted
            }
        }
        catch {
            // Rehydration failure is non-fatal — start with empty store
        }
    }
    clear() {
        this._episodes.clear();
    }
}
export const globalEpisodicMemorySynthesisEngine = new EpisodicMemorySynthesisEngine();
