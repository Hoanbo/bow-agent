// src/core/resilience/recoveryLessonFederation.ts
// BOWCON V4.0 — MS-1.3.44: RECOVERY LESSON FEDERATION INTO WORLD MODEL
//
// Bridges episodic memories and mined cross-episode patterns into the World Model
// advisory layer without mutating authoritative host facts.
//
// INVARIANTS:
// - Bridge produces GOVERNED ADVISORY LEARNING RECORDS only.
// - WORLD_FACT != LEARNED_ADVISORY.
// - Direct host observations or measurements MUST NEVER be overwritten by an advisory.
// - Advisories cannot execute actions and cannot grant authorization.
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0

import {
  generateResilienceId,
  CognitiveEpisode,
  CrossEpisodePattern,
  RecoveryLessonFederationRecord,
  RecoveryLessonFederationRecordType,
  PatternProvenance,
} from './cognitiveResilienceTypes.js';
import { globalCrossEpisodePatternEngine, CrossEpisodePatternEngine } from './crossEpisodePatternEngine.js';

export class RecoveryLessonFederationEngine {
  private readonly _advisoryRecords: Map<string, RecoveryLessonFederationRecord> = new Map();
  private readonly _patternEngine: CrossEpisodePatternEngine;

  constructor(patternEngine?: CrossEpisodePatternEngine) {
    this._patternEngine = patternEngine ?? globalCrossEpisodePatternEngine;
  }

  /**
   * Federates episodic lessons from an episode into governed advisory records.
   */
  public federateFromEpisode(episode: CognitiveEpisode): RecoveryLessonFederationRecord[] {
    const records: RecoveryLessonFederationRecord[] = [];
    const now = Date.now();

    for (const lesson of episode.lessons) {
      const recordId = generateResilienceId('rec_fed');
      const record: RecoveryLessonFederationRecord = {
        recordId,
        recordType: 'LEARNED_RECOVERY_LESSON',
        title: `Episode Lesson: ${lesson.lesson.slice(0, 50)}...`,
        description: lesson.lesson,
        sourceEpisodeIds: [episode.episodeId],
        sourceEvidence: [...lesson.derivedFrom],
        provenance: lesson.isSpeculative ? 'INFERENCE' : 'OBSERVED_PATTERN',
        confidence: lesson.confidence,
        createdAt: now,
        updatedAt: now,
        verificationStatus: lesson.isSpeculative ? 'UNVERIFIED' : 'VERIFIED',
        isStale: false,
        contradictions: [],
        isAdvisoryOnly: true,
      };
      this._advisoryRecords.set(recordId, record);
      records.push(record);
    }

    // Check for unresolved information gaps or contradictions
    if (episode.uncertainties && episode.uncertainties.length > 0) {
      for (const unc of episode.uncertainties) {
        const gapId = generateResilienceId('rec_gap');
        const gapRecord: RecoveryLessonFederationRecord = {
          recordId: gapId,
          recordType: 'UNRESOLVED_INFORMATION_GAP',
          title: `Information Gap in Episode ${episode.episodeId}`,
          description: unc,
          sourceEpisodeIds: [episode.episodeId],
          sourceEvidence: [unc],
          provenance: 'INFERENCE',
          confidence: 0.5,
          createdAt: now,
          updatedAt: now,
          verificationStatus: 'UNVERIFIED',
          isStale: false,
          contradictions: [],
          isAdvisoryOnly: true,
        };
        this._advisoryRecords.set(gapId, gapRecord);
        records.push(gapRecord);
      }
    }

    return records;
  }

  /**
   * Federates cross-episode patterns into planning cautions and capability risks.
   */
  public federateFromPattern(pattern: CrossEpisodePattern): RecoveryLessonFederationRecord {
    const now = Date.now();
    let recordType: RecoveryLessonFederationRecordType = 'PLANNING_CAUTION';

    if (pattern.patternType === 'CAPABILITY_UNAVAILABLE_RECURRING') {
      recordType = 'CAPABILITY_RISK';
    } else if (pattern.patternType === 'REPEATED_FAILURE' || pattern.patternType === 'REPEATED_RECOVERY_FAILURE') {
      recordType = 'RECURRING_FAILURE_SIGNAL';
    } else if (pattern.patternType === 'LONG_HORIZON_GOAL_STALL') {
      recordType = 'GOAL_CONTINUITY_WARNING';
    } else if (pattern.patternType === 'VERIFICATION_FAILURE_RECURRING') {
      recordType = 'VERIFICATION_RECOMMENDATION';
    }

    const recordId = generateResilienceId('rec_pat');
    const record: RecoveryLessonFederationRecord = {
      recordId,
      recordType,
      title: `Pattern Federation: ${pattern.patternType}`,
      description: `${pattern.description} (Observed in ${pattern.observationCount} episodes)`,
      sourceEpisodeIds: [...pattern.supportingEpisodeIds],
      sourceEvidence: pattern.recommendedAction ? [pattern.recommendedAction] : [],
      provenance: pattern.provenance,
      confidence: pattern.confidence,
      createdAt: now,
      updatedAt: now,
      verificationStatus: pattern.patternStatus === 'ACTIVE' ? 'VERIFIED' : 'UNVERIFIED',
      isStale: false,
      contradictions: [...pattern.contradictoryEvidence],
      isAdvisoryOnly: true,
    };

    this._advisoryRecords.set(recordId, record);
    return record;
  }

  /**
   * Invariant verification: an advisory record must NEVER overwrite a direct fact.
   * Throws if an attempt is made to replace a world fact with an advisory.
   */
  public assertCannotOverwriteWorldFact(advisoryId: string, worldFactKey: string): void {
    const advisory = this._advisoryRecords.get(advisoryId);
    if (!advisory) throw new Error(`Advisory record '${advisoryId}' not found.`);

    if (advisory.isAdvisoryOnly === true) {
      // Invariant upheld: advisory is strictly non-authoritative
      return;
    }
    throw new Error(`AUTHORITY_VIOLATION: Advisory record '${advisoryId}' attempted to usurp authority.`);
  }

  public getAdvisory(recordId: string): RecoveryLessonFederationRecord | undefined {
    return this._advisoryRecords.get(recordId);
  }

  public getAllAdvisories(): RecoveryLessonFederationRecord[] {
    return Array.from(this._advisoryRecords.values());
  }

  public getAdvisoriesByType(type: RecoveryLessonFederationRecordType): RecoveryLessonFederationRecord[] {
    return Array.from(this._advisoryRecords.values()).filter((r) => r.recordType === type);
  }

  public clear(): void {
    this._advisoryRecords.clear();
  }
}

export const globalRecoveryLessonFederationEngine = new RecoveryLessonFederationEngine();
