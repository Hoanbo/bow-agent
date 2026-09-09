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
import {
  generateResilienceId,
  CognitiveEpisode,
  EpisodeEvent,
  EpisodeLesson,
  EpisodePhase,
} from './cognitiveResilienceTypes.js';
import { MASTER_OWNER_ID } from '../architecture/masterArchitectureIdentity.js';

function computeEpisodeHash(episode: Pick<CognitiveEpisode, 'episodeId' | 'createdAt' | 'ownerId' | 'projectId' | 'goalId' | 'triggeringContext' | 'events' | 'observations'>): string {
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
  private readonly _episodes: Map<string, CognitiveEpisode> = new Map();
  private readonly _storagePath: string;

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
  public openEpisode(params: {
    projectId: string;
    goalId: string;
    triggeringContext: string;
    relatedObjective: string;
    ownerId?: string;
  }): CognitiveEpisode {
    const episodeId = generateResilienceId('ep');
    const skeleton = {
      episodeId,
      createdAt: Date.now(),
      ownerId: params.ownerId ?? MASTER_OWNER_ID,
      projectId: params.projectId,
      goalId: params.goalId,
      triggeringContext: params.triggeringContext,
      relatedObjective: params.relatedObjective,
      events: [] as EpisodeEvent[],
      observations: [] as string[],
      decisions: [] as string[],
      ownerDecision: undefined as string | undefined,
      bowconRecommendation: undefined as string | undefined,
      authorizedActions: [] as string[],
      executionResult: undefined as string | undefined,
      verificationResult: undefined as string | undefined,
      outcome: undefined as string | undefined,
      lessons: [] as EpisodeLesson[],
      contradictions: [] as string[],
      uncertainties: [] as string[],
      provenanceChain: [] as string[],
      overallConfidence: 0.5,
      phase: 'OBSERVATION' as EpisodePhase,
      isComplete: false,
      completedAt: undefined as number | undefined,
    };

    const episode: CognitiveEpisode = {
      ...skeleton,
      integrityHash: computeEpisodeHash(skeleton),
      isBoundedToRecommendation: undefined as any, // not on episode
    } as any;

    // Build clean episode
    const clean: CognitiveEpisode = {
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
  public appendEvent(episodeId: string, event: Omit<EpisodeEvent, 'eventId'>): EpisodeEvent {
    const ep = this._getEpisode(episodeId);
    const fullEvent: EpisodeEvent = {
      eventId: generateResilienceId('evt'),
      ...event,
    };
    (ep.events as EpisodeEvent[]).push(fullEvent);
    this._refreshHash(ep);
    this._persist();
    return fullEvent;
  }

  public appendObservation(episodeId: string, observation: string, provenance: string): void {
    const ep = this._getEpisode(episodeId);
    (ep.observations as string[]).push(observation);
    (ep.provenanceChain as string[]).push(provenance);
    this._refreshHash(ep);
    this._persist();
  }

  public recordDecision(episodeId: string, params: {
    decision: string;
    bowconRecommendation?: string;
    ownerDecision?: string;
  }): void {
    const ep = this._getEpisode(episodeId);
    (ep.decisions as string[]).push(params.decision);
    if (params.bowconRecommendation !== undefined) {
      (ep as any).bowconRecommendation = params.bowconRecommendation;
    }
    if (params.ownerDecision !== undefined) {
      (ep as any).ownerDecision = params.ownerDecision;
    }
    (ep as any).phase = 'DECISION';
    this._refreshHash(ep);
    this._persist();
  }

  public recordAuthorizedAction(episodeId: string, actionId: string): void {
    const ep = this._getEpisode(episodeId);
    (ep.authorizedActions as string[]).push(actionId);
    (ep as any).phase = 'ACTION';
    this._refreshHash(ep);
    this._persist();
  }

  public recordExecutionResult(episodeId: string, result: string): void {
    const ep = this._getEpisode(episodeId);
    (ep as any).executionResult = result;
    (ep as any).phase = 'EXECUTION';
    this._refreshHash(ep);
    this._persist();
  }

  public recordVerificationResult(episodeId: string, result: string): void {
    const ep = this._getEpisode(episodeId);
    (ep as any).verificationResult = result;
    (ep as any).phase = 'VERIFICATION';
    this._refreshHash(ep);
    this._persist();
  }

  public recordOutcome(episodeId: string, outcome: string, confidence: number): void {
    const ep = this._getEpisode(episodeId);
    (ep as any).outcome = outcome;
    (ep as any).overallConfidence = Math.max(0, Math.min(1, confidence));
    (ep as any).phase = 'OUTCOME';
    this._refreshHash(ep);
    this._persist();
  }

  public appendLesson(episodeId: string, lesson: Omit<EpisodeLesson, 'lessonId'>): EpisodeLesson {
    const ep = this._getEpisode(episodeId);
    const full: EpisodeLesson = {
      lessonId: generateResilienceId('les'),
      ...lesson,
    };
    (ep.lessons as EpisodeLesson[]).push(full);
    (ep as any).phase = 'LEARNING';
    this._refreshHash(ep);
    this._persist();
    return full;
  }

  public appendContradiction(episodeId: string, contradiction: string): void {
    const ep = this._getEpisode(episodeId);
    (ep.contradictions as string[]).push(contradiction);
    this._refreshHash(ep);
    this._persist();
  }

  public appendUncertainty(episodeId: string, uncertainty: string): void {
    const ep = this._getEpisode(episodeId);
    (ep.uncertainties as string[]).push(uncertainty);
    this._refreshHash(ep);
    this._persist();
  }

  public completeEpisode(episodeId: string): void {
    const ep = this._getEpisode(episodeId);
    (ep as any).isComplete = true;
    (ep as any).completedAt = Date.now();
    (ep as any).phase = 'COMPLETED';
    this._refreshHash(ep);
    this._persist();
  }

  public markInterrupted(episodeId: string): void {
    const ep = this._getEpisode(episodeId);
    (ep as any).phase = 'INTERRUPTED';
    this._persist();
  }

  // ---------------------------------------------------------------------------
  // READ
  // ---------------------------------------------------------------------------
  public getEpisode(episodeId: string): CognitiveEpisode | undefined {
    return this._episodes.get(episodeId);
  }

  public getAllEpisodes(): CognitiveEpisode[] {
    return Array.from(this._episodes.values());
  }

  public getEpisodesByProject(projectId: string): CognitiveEpisode[] {
    return Array.from(this._episodes.values()).filter((e) => e.projectId === projectId);
  }

  public getCompletedEpisodes(): CognitiveEpisode[] {
    return Array.from(this._episodes.values()).filter((e) => e.isComplete);
  }

  public getInterruptedEpisodes(): CognitiveEpisode[] {
    return Array.from(this._episodes.values()).filter((e) => e.phase === 'INTERRUPTED');
  }

  /**
   * Reconstructs episode from persisted storage.
   * Validates integrity hash and rejects corrupted episodes.
   */
  public reconstructEpisode(episodeId: string): {
    episode: CognitiveEpisode | null;
    valid: boolean;
    reason: string;
  } {
    const ep = this._episodes.get(episodeId);
    if (!ep) return { episode: null, valid: false, reason: `Episode '${episodeId}' not found in store.` };

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
  private _getEpisode(episodeId: string): CognitiveEpisode {
    const ep = this._episodes.get(episodeId);
    if (!ep) throw new Error(`Episode '${episodeId}' not found.`);
    return ep;
  }

  private _refreshHash(ep: CognitiveEpisode): void {
    (ep as any).integrityHash = computeEpisodeHash(ep);
  }

  private _persist(): void {
    try {
      const dir = path.dirname(this._storagePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const data = JSON.stringify(Array.from(this._episodes.values()), null, 2);
      fs.writeFileSync(this._storagePath, data, 'utf8');
    } catch {
      // Persist failure is non-fatal — in-memory state remains intact
    }
  }

  private _rehydrate(): void {
    try {
      if (!fs.existsSync(this._storagePath)) return;
      const raw = fs.readFileSync(this._storagePath, 'utf8');
      const episodes: CognitiveEpisode[] = JSON.parse(raw);
      for (const ep of episodes) {
        // Validate integrity before loading
        const recomputed = computeEpisodeHash(ep);
        if (recomputed === ep.integrityHash) {
          this._episodes.set(ep.episodeId, ep);
        }
        // Corrupted episodes are silently dropped — they are NOT trusted
      }
    } catch {
      // Rehydration failure is non-fatal — start with empty store
    }
  }

  public clear(): void {
    this._episodes.clear();
  }
}

export const globalEpisodicMemorySynthesisEngine = new EpisodicMemorySynthesisEngine();
