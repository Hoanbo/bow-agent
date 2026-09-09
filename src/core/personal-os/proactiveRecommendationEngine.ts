// src/core/personal-os/proactiveRecommendationEngine.ts
// BOWCON V4.0 — MS-1.3.40: MASTER OWNER PERSONAL OPERATING SYSTEM & PROACTIVE COGNITIVE AGENCY RUNTIME
//
// Section 6: Proactive Recommendation Engine
// Detects opportunities, risks, contradictions, bottlenecks, repeated failures, and stalled goals.
// Enforces Action Classes A, B, C, D and explicitly separates recommendation from execution.
//
// Invariants:
// - RECOMMENDATION != EXECUTION
// - Recommendations do NOT authorize themselves.
// - Class C & D actions strictly require Master Owner decision / HumanGate authorization.
// - MASTER_OWNER_AUTHORITY > BOWCON_INTELLIGENCE > BOWCON_AUTONOMY

import {
  ProactiveRecommendation,
  ProactiveActionClass,
  ACTION_CLASS_POLICIES,
  generatePersonalOsId,
  MASTER_OWNER_ID,
} from './personalOsTypes';
import { ContradictionRecord } from '../partnership/partnershipTypes';

export interface ProactiveScanContext {
  goals?: Array<{
    goalId: string;
    title: string;
    state?: string;
    isStalled?: boolean;
    hasBlocker?: boolean;
    blockers?: string[];
  }>;
  contradictions?: ContradictionRecord[];
  patterns?: Array<{
    patternType: string;
    observedPattern: string;
    evidenceCount: number;
  }>;
  resourceBottlenecks?: string[];
  ownerId?: string;
  sessionId?: string;
}

export class ProactiveRecommendationEngine {
  private readonly recommendations: Map<string, ProactiveRecommendation> = new Map();

  /**
   * Create an explicit structured recommendation.
   */
  public createRecommendation(
    params: Omit<ProactiveRecommendation, 'recommendationId' | 'createdAt' | 'status'>
  ): ProactiveRecommendation {
    const recommendationId = generatePersonalOsId('rec');
    const policy = ACTION_CLASS_POLICIES[params.actionClass];
    const confidence = Math.max(0.0, Math.min(1.0, params.confidence));
    const uncertainty = Number((1.0 - confidence).toFixed(2));

    const rec: ProactiveRecommendation = {
      recommendationId,
      ownerId: params.ownerId || MASTER_OWNER_ID,
      sessionId: params.sessionId,
      actionClass: params.actionClass,
      sourceEvidence: params.sourceEvidence,
      reasoningSummary: params.reasoningSummary,
      confidence,
      uncertainty,
      riskLevel: params.riskLevel,
      alternatives: params.alternatives,
      recommendedAction: params.recommendedAction,
      requiresOwnerDecision: policy.requiresOwnerApproval || params.requiresOwnerDecision,
      createdAt: Date.now(),
      status: 'PROPOSED',
    };

    this.recommendations.set(recommendationId, rec);
    return rec;
  }

  /**
   * Proactively scan context for opportunities, risks, and contradictions.
   */
  public scanAndGenerateRecommendations(context: ProactiveScanContext): ProactiveRecommendation[] {
    const generated: ProactiveRecommendation[] = [];
    const ownerId = context.ownerId || MASTER_OWNER_ID;

    // 1. Check for unaddressed contradictions
    if (context.contradictions && context.contradictions.length > 0) {
      const unres = context.contradictions.filter((c) => !c.resolved);
      for (const c of unres) {
        generated.push(
          this.createRecommendation({
            ownerId,
            sessionId: context.sessionId,
            actionClass: 'CLASS_A_INFORMATIONAL',
            sourceEvidence: [`Contradiction detected: ${c.previousBelief} vs ${c.currentEvidence}`],
            reasoningSummary: `Cognitive conflict detected between assumed memory and verified evidence: ${c.type}.`,
            confidence: 0.95,
            uncertainty: 0.05,
            riskLevel: 'MEDIUM',
            alternatives: ['Re-query live telemetry', 'Acknowledge assumption error and update memory'],
            recommendedAction: c.recommendedAction || 'Reconcile contradictory telemetry with host environment',
            requiresOwnerDecision: false,
          })
        );
      }
    }

    // 2. Check for stalled or blocked goals
    if (context.goals && context.goals.length > 0) {
      for (const g of context.goals) {
        if (g.isStalled || g.hasBlocker) {
          const blockerText = g.blockers && g.blockers.length > 0 ? g.blockers.join('; ') : 'Execution progress stalled';
          generated.push(
            this.createRecommendation({
              ownerId,
              sessionId: context.sessionId,
              actionClass: 'CLASS_C_OWNER_DECISION',
              sourceEvidence: [`Goal '${g.title}' is blocked or stalled: ${blockerText}`],
              reasoningSummary: `Goal '${g.title}' cannot advance due to dependency blockers. Strategic decision needed.`,
              confidence: 0.9,
              uncertainty: 0.1,
              riskLevel: 'HIGH',
              alternatives: ['Reorder dependent tasks in DAG', 'Abandon or pause goal', 'Request human intervention'],
              recommendedAction: `Review blockers on goal '${g.title}' and decide whether to unblock or pause.`,
              requiresOwnerDecision: true,
            })
          );
        }
      }
    }

    // 3. Check for repeated failure patterns
    if (context.patterns && context.patterns.length > 0) {
      for (const p of context.patterns) {
        if (p.patternType === 'REPEATED_FAILURE' || p.patternType === 'REPEATED_BOTTLENECK') {
          generated.push(
            this.createRecommendation({
              ownerId,
              sessionId: context.sessionId,
              actionClass: 'CLASS_C_OWNER_DECISION',
              sourceEvidence: [`Observed pattern: ${p.observedPattern} (${p.evidenceCount} occurrences)`],
              reasoningSummary: `Recurrent issue detected across multiple executions: ${p.observedPattern}. Repeating the approach is statistically high-risk.`,
              confidence: 0.88,
              uncertainty: 0.12,
              riskLevel: 'HIGH',
              alternatives: ['Refactor execution parameters', 'Apply alternative tool/capability', 'Suspend pipeline'],
              recommendedAction: `Change strategy to avoid recurrent failure in '${p.observedPattern}'.`,
              requiresOwnerDecision: true,
            })
          );
        }
      }
    }

    // 4. Check for resource bottlenecks
    if (context.resourceBottlenecks && context.resourceBottlenecks.length > 0) {
      for (const b of context.resourceBottlenecks) {
        generated.push(
          this.createRecommendation({
            ownerId,
            sessionId: context.sessionId,
            actionClass: 'CLASS_B_REVERSIBLE_INTERNAL',
            sourceEvidence: [`Resource constraint: ${b}`],
            reasoningSummary: `Resource threshold reached: ${b}. Rebalancing task dispatch will prevent throttling.`,
            confidence: 0.92,
            uncertainty: 0.08,
            riskLevel: 'MEDIUM',
            alternatives: ['Throttle concurrent tasks', 'Clear temporary memory caches'],
            recommendedAction: 'Throttle concurrent task scheduling to relieve resource pressure.',
            requiresOwnerDecision: false,
          })
        );
      }
    }

    return generated;
  }

  /**
   * Resolve a recommendation following Owner action or governance evaluation.
   */
  public resolveRecommendation(
    recommendationId: string,
    status: 'ACCEPTED' | 'OVERRIDDEN' | 'DISCARDED'
  ): ProactiveRecommendation {
    const rec = this.recommendations.get(recommendationId);
    if (!rec) {
      throw new Error(`Recommendation '${recommendationId}' not found.`);
    }
    rec.status = status;
    rec.resolvedAt = Date.now();
    return rec;
  }

  /**
   * Retrieve all pending proposed recommendations.
   */
  public getPendingRecommendations(): ProactiveRecommendation[] {
    return Array.from(this.recommendations.values()).filter((r) => r.status === 'PROPOSED');
  }

  /**
   * Retrieve all recommendations.
   */
  public getAllRecommendations(): ProactiveRecommendation[] {
    return Array.from(this.recommendations.values());
  }

  /**
   * Format recommendation into human-readable text.
   */
  public formatRecommendationText(rec: ProactiveRecommendation): string {
    return [
      '==============================================================================',
      'PROACTIVE RECOMMENDATION',
      '==============================================================================',
      `ID:          ${rec.recommendationId}`,
      `Class:       ${rec.actionClass}`,
      `Risk Level:  ${rec.riskLevel}`,
      `Confidence:  ${(rec.confidence * 100).toFixed(0)}% (Uncertainty: ${(rec.uncertainty * 100).toFixed(0)}%)`,
      `Requires Owner Decision: ${rec.requiresOwnerDecision ? 'YES' : 'NO'}`,
      '',
      'Evidence:',
      rec.sourceEvidence.map((e) => `* ${e}`).join('\n'),
      '',
      'Reasoning:',
      rec.reasoningSummary,
      '',
      'Recommended Action:',
      rec.recommendedAction,
      '',
      'Alternatives:',
      rec.alternatives.map((a) => `* ${a}`).join('\n'),
      '==============================================================================',
    ].join('\n');
  }

  /**
   * Clear all records (for reset/testing).
   */
  public clear(): void {
    this.recommendations.clear();
  }
}
