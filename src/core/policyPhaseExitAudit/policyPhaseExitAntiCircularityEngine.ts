// src/core/policyPhaseExitAudit/policyPhaseExitAntiCircularityEngine.ts
// BOWCON V4.0 — MS-1.3.78: INDEPENDENT PHASE 1.3 EXIT EVIDENCE AUDIT & GOVERNANCE READINESS CERTIFICATION
//
// Anti-Circularity & Evidence Grounding Engine (Component 894).
// Builds a directed evidence citation graph and detects circular reasoning or ungrounded claims.
// Strictly read-only; alters ZERO state.
//
// Core Authority Invariants:
// - CIRCULAR_EVIDENCE_MUST_NEVER_PRODUCE_A_PASS
// - ALL_CRITERIA_MUST_GROUND_IN_PHYSICAL_ARTIFACTS
// - USER_STOP > EVERYTHING
// - FAIL_CLOSED

import type { AuditEvidenceItem, AuditCriterionId } from './policyPhaseExitAuditTypes.js';

export interface CircularityAnalysisResult {
  readonly hasCycles: boolean;
  readonly cyclesDetected: readonly string[];
  readonly groundedCriteriaCount: number;
  readonly ungroundedCriteria: readonly string[];
}

export class PolicyPhaseExitAntiCircularityEngine {
  private readonly isUserStopActiveFn?: () => boolean;

  constructor(options?: { readonly isUserStopActive?: () => boolean }) {
    this.isUserStopActiveFn = options?.isUserStopActive;
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Anti-circularity engine suspended by USER_STOP supremacy');
    }
  }

  /**
   * Analyzes an array of evidence items for circular references and physical grounding.
   */
  public analyzeEvidence(evidenceItems: readonly AuditEvidenceItem[]): CircularityAnalysisResult {
    this.assertUserStopInactive();

    const graph = new Map<string, Set<string>>();
    const groundedCriteria = new Set<string>();
    const allCriteria = new Set<string>();

    for (const item of evidenceItems) {
      const cId = item.criterionId as string;
      allCriteria.add(cId);

      if (!graph.has(cId)) {
        graph.set(cId, new Set<string>());
      }

      // Check if physically grounded
      const isPhysical =
        item.verificationMethod === 'AST_SOURCE_INSPECTION' ||
        item.verificationMethod === 'DEDICATED_REALITY_TEST' ||
        item.verificationMethod === 'FULL_REGRESSION_RUN' ||
        item.verificationMethod === 'SECURITY_SCAN' ||
        item.verificationMethod === 'PROVENANCE_CHAIN_VERIFICATION' ||
        item.verificationMethod === 'PROTECTED_WORKSPACE_PROBE' ||
        item.verificationMethod === 'RUNTIME_EXECUTION';

      if (isPhysical && item.evidenceStrength !== 'CLAIM_ONLY') {
        groundedCriteria.add(cId);
      }

      // If details contains dependency citations, add edges
      if (item.details?.dependsOnCriterion) {
        graph.get(cId)!.add(item.details.dependsOnCriterion);
      }
    }

    // Cycle detection via DFS
    const cycles: string[] = [];
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const dfs = (node: string, path: string[]) => {
      visited.add(node);
      recStack.add(node);

      const neighbors = graph.get(node) || new Set<string>();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor, [...path, neighbor]);
        } else if (recStack.has(neighbor)) {
          cycles.push(`Cycle detected: ${[...path, neighbor].join(' -> ')}`);
        }
      }

      recStack.delete(node);
    };

    for (const node of graph.keys()) {
      if (!visited.has(node)) {
        dfs(node, [node]);
      }
    }

    const ungrounded: string[] = [];
    for (const c of allCriteria) {
      if (!groundedCriteria.has(c)) {
        ungrounded.push(c);
      }
    }

    return Object.freeze({
      hasCycles: cycles.length > 0,
      cyclesDetected: Object.freeze(cycles),
      groundedCriteriaCount: groundedCriteria.size,
      ungroundedCriteria: Object.freeze(ungrounded),
    });
  }
}
