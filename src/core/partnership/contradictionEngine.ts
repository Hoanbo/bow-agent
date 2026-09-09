// src/core/partnership/contradictionEngine.ts
// BOWCON V4.0 — MS-1.3.39: MASTER OWNER COGNITIVE PARTNERSHIP & PERSISTENT PERSONAL INTELLIGENCE RUNTIME
//
// Section 10: Contradiction Engine
// Detects conflicts between:
// - Current telemetry vs previous memory
// - Observations vs previous assumptions
// - Execution outcomes vs expectations
// - Owner statements vs verified facts
// - Capability availability vs assumed state
//
// Invariant: Do NOT silently resolve contradictions. Surface them explicitly.

import {
  ContradictionRecord,
  ContradictionType,
  generatePartnershipId,
  PersonalMemoryItem,
} from './partnershipTypes';

export class ContradictionEngine {
  private readonly contradictions: Map<string, ContradictionRecord> = new Map();

  /**
   * Record an explicit contradiction.
   */
  public recordContradiction(
    type: ContradictionType,
    previousBelief: string,
    currentEvidence: string,
    recommendedAction: string
  ): ContradictionRecord {
    const contradictionId = generatePartnershipId('contra');
    const record: ContradictionRecord = {
      contradictionId,
      type,
      previousBelief,
      currentEvidence,
      recommendedAction,
      detectedAt: Date.now(),
      resolved: false,
    };
    this.contradictions.set(contradictionId, record);
    return record;
  }

  /**
   * Check for telemetry vs stored memory conflict.
   */
  public detectTelemetryVsMemory(
    metricKey: string,
    observedValue: any,
    memoryBeliefValue: any,
    memoryItem?: PersonalMemoryItem
  ): ContradictionRecord | null {
    if (observedValue === undefined || memoryBeliefValue === undefined) {
      return null;
    }

    const obsStr = String(observedValue).trim().toLowerCase();
    const memStr = String(memoryBeliefValue).trim().toLowerCase();

    if (obsStr !== memStr) {
      const memoryRef = memoryItem ? ` (Memory ID: ${memoryItem.memoryId})` : '';
      return this.recordContradiction(
        'TELEMETRY_VS_MEMORY',
        `Telemetry/Belief '${metricKey}' was assumed to be '${memoryBeliefValue}'${memoryRef}`,
        `Current observation reports '${metricKey}' is '${observedValue}'`,
        `Reconcile telemetry '${metricKey}' before proceeding with reliant operations.`
      );
    }

    return null;
  }

  /**
   * Check for observation vs assumption conflict.
   */
  public detectObservationVsAssumption(
    assumption: string,
    observedFact: string,
    context?: string
  ): ContradictionRecord | null {
    if (!assumption || !observedFact) return null;

    return this.recordContradiction(
      'OBSERVATION_VS_ASSUMPTION',
      `Assumed: ${assumption}${context ? ` [Context: ${context}]` : ''}`,
      `Observed Fact: ${observedFact}`,
      `Revise assumption in light of observed fact; do not proceed on invalid premise.`
    );
  }

  /**
   * Check for outcome vs expectation conflict.
   */
  public detectOutcomeVsExpectation(
    actionId: string,
    expectedOutcome: string,
    actualOutcome: string
  ): ContradictionRecord | null {
    if (!expectedOutcome || !actualOutcome) return null;

    const expLower = expectedOutcome.trim().toLowerCase();
    const actLower = actualOutcome.trim().toLowerCase();

    if (expLower !== actLower && !actLower.includes(expLower)) {
      return this.recordContradiction(
        'OUTCOME_VS_EXPECTATION',
        `Action ${actionId} expected: ${expectedOutcome}`,
        `Actual execution result: ${actualOutcome}`,
        `Conduct failure analysis and update domain model before retrying.`
      );
    }

    return null;
  }

  /**
   * Check for statement vs verified fact conflict.
   */
  public detectStatementVsFact(
    statement: string,
    verifiedFact: string,
    context?: string
  ): ContradictionRecord | null {
    if (!statement || !verifiedFact) return null;

    return this.recordContradiction(
      'STATEMENT_VS_FACT',
      `Statement asserted: ${statement}${context ? ` (${context})` : ''}`,
      `Verified Host Fact: ${verifiedFact}`,
      `Clarify discrepancy with Master Owner; verified host truth takes operational precedence.`
    );
  }

  /**
   * Check capability availability against previous belief.
   */
  public detectCapabilityContradiction(
    capabilityId: string,
    isAvailableNow: boolean,
    previouslyBelievedAvailable: boolean
  ): ContradictionRecord | null {
    if (isAvailableNow !== previouslyBelievedAvailable) {
      return this.recordContradiction(
        'TELEMETRY_VS_MEMORY',
        `Capability '${capabilityId}' was believed to be ${previouslyBelievedAvailable ? 'AVAILABLE' : 'UNAVAILABLE'}`,
        `Current capability query indicates '${capabilityId}' is ${isAvailableNow ? 'AVAILABLE' : 'UNAVAILABLE'}`,
        `Refresh capability state and update planned tasks requiring '${capabilityId}'.`
      );
    }
    return null;
  }

  /**
   * Resolve an existing contradiction with rationale.
   */
  public resolveContradiction(contradictionId: string, resolutionNotes: string): ContradictionRecord {
    const record = this.contradictions.get(contradictionId);
    if (!record) {
      throw new Error(`Contradiction '${contradictionId}' not found.`);
    }
    record.resolved = true;
    record.resolutionNotes = resolutionNotes;
    return record;
  }

  /**
   * Query all unresolved contradictions.
   */
  public getUnresolvedContradictions(): ContradictionRecord[] {
    return Array.from(this.contradictions.values()).filter((c) => !c.resolved);
  }

  /**
   * Query all contradictions (resolved and unresolved).
   */
  public getAllContradictions(): ContradictionRecord[] {
    return Array.from(this.contradictions.values());
  }

  /**
   * Check if any unresolved contradictions exist.
   */
  public hasUnresolvedContradictions(): boolean {
    return this.getUnresolvedContradictions().length > 0;
  }

  /**
   * Clear all contradictions (e.g. for reset/testing).
   */
  public clear(): void {
    this.contradictions.clear();
  }
}
