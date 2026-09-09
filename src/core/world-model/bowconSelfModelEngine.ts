// src/core/world-model/bowconSelfModelEngine.ts
// BOWCON V4.0 — MS-1.3.42: MASTER OWNER WORLD MODEL, SELF-AWARENESS & CAPABILITY-GROUNDED REASONING RUNTIME
//
// 12-Facet BOWCON Self-Awareness Engine.
// Tracks precisely what BOWCON knows, observes, infers, remembers, expects, assumes,
// does not know, cannot measure, cannot execute, is not authorized to execute,
// has verified, and has not yet verified.
//
// Epistemic discipline is absolute: inferences, assumptions, and memories are never
// silently elevated to facts.

import crypto from 'node:crypto';
import type {
  EpistemicProvenance,
  WorldModelEpistemicItem,
  BowconSelfModel,
} from './worldModelTypes.js';

type EpistemicItem<T = unknown> = WorldModelEpistemicItem<T>;
import {
  isAuthoritativeFactProvenance,
  assertValidEpistemicPromotion,
} from './worldModelTypes.js';

export class BowconSelfModelEngine {
  private readonly _whatIKnow = new Map<string, EpistemicItem>();
  private readonly _whatIObserved = new Map<string, EpistemicItem>();
  private readonly _whatIInferred = new Map<string, EpistemicItem>();
  private readonly _whatIRemember = new Map<string, EpistemicItem>();
  private readonly _whatIExpect = new Map<string, EpistemicItem>();
  private readonly _whatIAssume = new Map<string, EpistemicItem>();
  private readonly _whatIDoNotKnow = new Map<string, EpistemicItem>();
  private readonly _whatICannotMeasure = new Map<string, EpistemicItem>();
  private readonly _whatICannotExecute = new Map<string, EpistemicItem>();
  private readonly _whatIAmNotAuthorizedToExecute = new Map<string, EpistemicItem>();
  private readonly _whatIHaveVerified = new Map<string, EpistemicItem>();
  private readonly _whatIHaveNotVerified = new Map<string, EpistemicItem>();

  // ---------------------------------------------------------------------------
  // Observation & Telemetry (Authoritative Empirical Input)
  // ---------------------------------------------------------------------------
  public recordObservation<T>(key: string, value: T, source = 'host_observation'): EpistemicItem<T> {
    const item: EpistemicItem<T> = {
      id: `obs_${crypto.randomUUID().slice(0, 8)}`,
      key,
      value,
      provenance: 'DIRECT_OBSERVATION',
      confidence: 1.0,
      timestamp: Date.now(),
      source,
    };
    this._whatIObserved.set(key, item);
    this._whatIKnow.set(key, item); // Direct observation qualifies as known fact
    return item;
  }

  public recordTelemetry<T>(key: string, value: T, source = 'host_telemetry'): EpistemicItem<T> {
    const item: EpistemicItem<T> = {
      id: `tel_${crypto.randomUUID().slice(0, 8)}`,
      key,
      value,
      provenance: 'HOST_TELEMETRY',
      confidence: 1.0,
      timestamp: Date.now(),
      source,
    };
    this._whatIObserved.set(key, item);
    this._whatIKnow.set(key, item); // Verified telemetry qualifies as known fact
    return item;
  }

  // ---------------------------------------------------------------------------
  // Owner Stated & Confirmed Input
  // ---------------------------------------------------------------------------
  public recordOwnerStated<T>(key: string, value: T): EpistemicItem<T> {
    const item: EpistemicItem<T> = {
      id: `own_${crypto.randomUUID().slice(0, 8)}`,
      key,
      value,
      provenance: 'OWNER_STATED',
      confidence: 0.95,
      timestamp: Date.now(),
      source: 'master_owner',
    };
    // Owner stated is retained with explicit OWNER_STATED provenance
    this._whatIRemember.set(key, item);
    return item;
  }

  public recordOwnerConfirmed<T>(key: string, value: T): EpistemicItem<T> {
    const item: EpistemicItem<T> = {
      id: `cnf_${crypto.randomUUID().slice(0, 8)}`,
      key,
      value,
      provenance: 'OWNER_CONFIRMED',
      confidence: 1.0,
      timestamp: Date.now(),
      source: 'master_owner',
    };
    this._whatIKnow.set(key, item);
    return item;
  }

  // ---------------------------------------------------------------------------
  // Inferences, Assumptions & Hypotheses (NON-FACTS)
  // ---------------------------------------------------------------------------
  public recordInference<T>(key: string, value: T, premises: string[], confidence = 0.75): EpistemicItem<T> {
    const item: EpistemicItem<T> = {
      id: `inf_${crypto.randomUUID().slice(0, 8)}`,
      key,
      value,
      provenance: 'INFERENCE',
      confidence: Math.min(0.9, Math.max(0.1, confidence)), // Inferences can never have 1.0 confidence
      timestamp: Date.now(),
      source: `premises:[${premises.join(',')}]`,
    };
    this._whatIInferred.set(key, item);
    // NEVER put inference into _whatIKnow
    return item;
  }

  public recordAssumption<T>(key: string, value: T, rationale: string): EpistemicItem<T> {
    const item: EpistemicItem<T> = {
      id: `asm_${crypto.randomUUID().slice(0, 8)}`,
      key,
      value,
      provenance: 'ASSUMPTION',
      confidence: 0.5,
      timestamp: Date.now(),
      source: rationale,
    };
    this._whatIAssume.set(key, item);
    // NEVER put assumption into _whatIKnow
    return item;
  }

  public recordExpectation<T>(key: string, value: T, context = ''): EpistemicItem<T> {
    const item: EpistemicItem<T> = {
      id: `exp_${crypto.randomUUID().slice(0, 8)}`,
      key,
      value,
      provenance: 'HYPOTHESIS',
      confidence: 0.6,
      timestamp: Date.now(),
      source: context,
    };
    this._whatIExpect.set(key, item);
    return item;
  }

  public recordMemory<T>(key: string, value: T, memoryId: string): EpistemicItem<T> {
    const item: EpistemicItem<T> = {
      id: `mem_${crypto.randomUUID().slice(0, 8)}`,
      key,
      value,
      provenance: 'PERSISTED_MEMORY',
      confidence: 0.85,
      timestamp: Date.now(),
      source: memoryId,
    };
    this._whatIRemember.set(key, item);
    // Memories are historical models, not current verified facts
    return item;
  }

  // ---------------------------------------------------------------------------
  // Unknowns & Limitations (Honest Epistemic Boundary)
  // ---------------------------------------------------------------------------
  public recordUnknown(key: string, description: string): EpistemicItem<string> {
    const item: EpistemicItem<string> = {
      id: `unk_${crypto.randomUUID().slice(0, 8)}`,
      key,
      value: 'UNKNOWN',
      provenance: 'UNKNOWN',
      confidence: 0.0,
      timestamp: Date.now(),
      source: description,
    };
    this._whatIDoNotKnow.set(key, item);
    return item;
  }

  public recordUnmeasurable(metricName: string, reason: string): EpistemicItem<string> {
    const item: EpistemicItem<string> = {
      id: `unm_${crypto.randomUUID().slice(0, 8)}`,
      key: metricName,
      value: 'UNMEASURABLE',
      provenance: 'UNKNOWN',
      confidence: 0.0,
      timestamp: Date.now(),
      source: reason,
    };
    this._whatICannotMeasure.set(metricName, item);
    this._whatIDoNotKnow.set(metricName, item);
    return item;
  }

  public recordUnexecutable(capabilityId: string, reason: string): EpistemicItem<string> {
    const item: EpistemicItem<string> = {
      id: `unx_${crypto.randomUUID().slice(0, 8)}`,
      key: capabilityId,
      value: 'CANNOT_EXECUTE',
      provenance: 'UNKNOWN',
      confidence: 0.0,
      timestamp: Date.now(),
      source: reason,
    };
    this._whatICannotExecute.set(capabilityId, item);
    return item;
  }

  public recordUnauthorized(capabilityId: string, requiredPermission: string): EpistemicItem<string> {
    const item: EpistemicItem<string> = {
      id: `una_${crypto.randomUUID().slice(0, 8)}`,
      key: capabilityId,
      value: 'UNAUTHORIZED',
      provenance: 'UNKNOWN',
      confidence: 0.0,
      timestamp: Date.now(),
      source: `requires:${requiredPermission}`,
    };
    this._whatIAmNotAuthorizedToExecute.set(capabilityId, item);
    return item;
  }

  // ---------------------------------------------------------------------------
  // Verified vs Unverified Executions
  // ---------------------------------------------------------------------------
  public recordVerifiedExecution<T>(key: string, value: T, verificationHash: string): EpistemicItem<T> {
    const item: EpistemicItem<T> = {
      id: `ver_${crypto.randomUUID().slice(0, 8)}`,
      key,
      value,
      provenance: 'VERIFIED_EXECUTION',
      confidence: 1.0,
      timestamp: Date.now(),
      source: `hash:${verificationHash}`,
    };
    this._whatIHaveVerified.set(key, item);
    this._whatIKnow.set(key, item); // Verified execution output is an authoritative fact
    this._whatIHaveNotVerified.delete(key);
    return item;
  }

  public recordUnverifiedOutput<T>(key: string, value: T, actionId: string): EpistemicItem<T> {
    const item: EpistemicItem<T> = {
      id: `unv_${crypto.randomUUID().slice(0, 8)}`,
      key,
      value,
      provenance: 'INFERENCE', // Until verified, output is an inference of execution
      confidence: 0.5,
      timestamp: Date.now(),
      source: actionId,
    };
    this._whatIHaveNotVerified.set(key, item);
    return item;
  }

  // ---------------------------------------------------------------------------
  // Promotion Discipline (Forbidden Silent Upgrades)
  // ---------------------------------------------------------------------------
  public attemptPromoteFact(key: string, targetProvenance: EpistemicProvenance): void {
    const candidate =
      this._whatIInferred.get(key) ||
      this._whatIAssume.get(key) ||
      this._whatIRemember.get(key) ||
      this._whatIDoNotKnow.get(key);

    if (!candidate) {
      throw new Error(`Item "${key}" does not exist in self-model.`);
    }

    assertValidEpistemicPromotion(candidate.provenance, targetProvenance);

    // If valid promotion (e.g. verified outcome), move into whatIKnow
    const promotedItem: EpistemicItem = {
      ...candidate,
      provenance: targetProvenance,
      confidence: 1.0,
      timestamp: Date.now(),
    };
    this._whatIKnow.set(key, promotedItem);
  }

  public isFact(key: string): boolean {
    const item = this._whatIKnow.get(key);
    return item !== undefined && isAuthoritativeFactProvenance(item.provenance);
  }

  public getProvenance(key: string): EpistemicProvenance | undefined {
    return (
      this._whatIKnow.get(key)?.provenance ||
      this._whatIObserved.get(key)?.provenance ||
      this._whatIHaveVerified.get(key)?.provenance ||
      this._whatIInferred.get(key)?.provenance ||
      this._whatIRemember.get(key)?.provenance ||
      this._whatIAssume.get(key)?.provenance ||
      this._whatIDoNotKnow.get(key)?.provenance ||
      this._whatICannotMeasure.get(key)?.provenance ||
      this._whatICannotExecute.get(key)?.provenance ||
      this._whatIAmNotAuthorizedToExecute.get(key)?.provenance ||
      this._whatIHaveNotVerified.get(key)?.provenance
    );
  }

  // ---------------------------------------------------------------------------
  // Snapshot Retrieval
  // ---------------------------------------------------------------------------
  public getSelfModel(): BowconSelfModel {
    return {
      whatIKnow: new Map(this._whatIKnow),
      whatIObserved: new Map(this._whatIObserved),
      whatIInferred: new Map(this._whatIInferred),
      whatIRemember: new Map(this._whatIRemember),
      whatIExpect: new Map(this._whatIExpect),
      whatIAssume: new Map(this._whatIAssume),
      whatIDoNotKnow: new Map(this._whatIDoNotKnow),
      whatICannotMeasure: new Map(this._whatICannotMeasure),
      whatICannotExecute: new Map(this._whatICannotExecute),
      whatIAmNotAuthorizedToExecute: new Map(this._whatIAmNotAuthorizedToExecute),
      whatIHaveVerified: new Map(this._whatIHaveVerified),
      whatIHaveNotVerified: new Map(this._whatIHaveNotVerified),
    };
  }

  public reset(): void {
    this._whatIKnow.clear();
    this._whatIObserved.clear();
    this._whatIInferred.clear();
    this._whatIRemember.clear();
    this._whatIExpect.clear();
    this._whatIAssume.clear();
    this._whatIDoNotKnow.clear();
    this._whatICannotMeasure.clear();
    this._whatICannotExecute.clear();
    this._whatIAmNotAuthorizedToExecute.clear();
    this._whatIHaveVerified.clear();
    this._whatIHaveNotVerified.clear();
  }
}

export const globalBowconSelfModelEngine = new BowconSelfModelEngine();
