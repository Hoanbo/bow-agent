// src/core/governedCrossFederationConvergence/CrossFederationStrategyEngine.ts
// BOWCON V4.0 — MS-1.5.17: GOVERNED CROSS-FEDERATION STRATEGY, CONVERGENCE & POLICY META-GOVERNANCE ENGINE
// Component 1141 — REAL
//
// EN: Inter-federation strategy alignment, macro-plan synthesis, and dependency DAG scheduler.
// VI: Căn chỉnh chiến lược liên liên đoàn, tổng hợp kế hoạch vĩ mô và điều phối DAG phụ thuộc.

import {
  MAX_INTER_FEDERATION_DEPENDENCY_DEPTH,
  GovernedCrossFederationValidationError,
  type CrossFederationStrategyProposal,
  type InterFederationDependency,
} from './GovernedCrossFederationTypes.js';

export interface EvaluatedStrategyScore {
  readonly proposalId: string;
  readonly federationId: string;
  readonly finalPriorityScore: number;
  readonly isHumanDirective: boolean;
  readonly hasActiveLease: boolean;
  readonly timestamp: number;
}

export class CrossFederationStrategyEngine {
  // EN: Validate dependency DAG for cycles and maximum depth bounds
  // VI: Xác thực đồ thị có hướng (DAG) phụ thuộc không chứa chu trình và giới hạn độ sâu
  public validateDependencyGraph(dependencies: readonly InterFederationDependency[]): void {
    const adj = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    const allNodes = new Set<string>();

    for (const dep of dependencies) {
      if (!adj.has(dep.sourceFederationId)) {
        adj.set(dep.sourceFederationId, []);
      }
      adj.get(dep.sourceFederationId)!.push(dep.targetFederationId);
      allNodes.add(dep.sourceFederationId);
      allNodes.add(dep.targetFederationId);
      inDegree.set(dep.targetFederationId, (inDegree.get(dep.targetFederationId) || 0) + 1);
      if (!inDegree.has(dep.sourceFederationId)) {
        inDegree.set(dep.sourceFederationId, 0);
      }

      // Check depth on individual dependency link
      if (dep.depth > MAX_INTER_FEDERATION_DEPENDENCY_DEPTH) {
        throw new GovernedCrossFederationValidationError(
          `Dependency depth limit exceeded (${dep.depth} > ${MAX_INTER_FEDERATION_DEPENDENCY_DEPTH}) for dependency ${dep.dependencyId}`
        );
      }
    }

    // Kahn's algorithm for cycle detection
    const queue: string[] = [];
    for (const node of allNodes) {
      if ((inDegree.get(node) || 0) === 0) {
        queue.push(node);
      }
    }

    let visitedCount = 0;
    while (queue.length > 0) {
      const u = queue.shift()!;
      visitedCount++;

      const neighbors = adj.get(u) || [];
      for (const v of neighbors) {
        const deg = (inDegree.get(v) || 0) - 1;
        inDegree.set(v, deg);
        if (deg === 0) {
          queue.push(v);
        }
      }
    }

    if (visitedCount < allNodes.size) {
      throw new GovernedCrossFederationValidationError(
        'Dependency DAG contains circular dependency cycle across federations'
      );
    }
  }

  // EN: Evaluate deterministic priority ordering:
  //     Human Directive > Policy Rule > Lease Scope > Federation Priority > Earliest Timestamp
  // VI: Đánh giá thứ tự ưu tiên xác định:
  //     Chỉ thị con người > Quy tắc chính sách > Phạm vi Lease > Ưu tiên liên đoàn > Thời gian sớm nhất
  public rankProposals(
    proposals: readonly CrossFederationStrategyProposal[],
    humanDirectiveProposalIds: readonly string[] = []
  ): readonly EvaluatedStrategyScore[] {
    const humanSet = new Set(humanDirectiveProposalIds);

    const scores: EvaluatedStrategyScore[] = proposals.map((p) => {
      const isHumanDirective = humanSet.has(p.proposalId);
      const hasActiveLease = Boolean(p.leaseId);

      // Deterministic weight calculation
      let score = p.priority;
      if (isHumanDirective) {
        score += 100000;
      }
      if (hasActiveLease) {
        score += 10000;
      }

      return {
        proposalId: p.proposalId,
        federationId: p.federationId,
        finalPriorityScore: score,
        isHumanDirective,
        hasActiveLease,
        timestamp: p.createdAt,
      };
    });

    // Sort descending by priority score, tie-breaking by earliest timestamp
    scores.sort((a, b) => {
      if (b.finalPriorityScore !== a.finalPriorityScore) {
        return b.finalPriorityScore - a.finalPriorityScore;
      }
      return a.timestamp - b.timestamp;
    });

    return Object.freeze(scores);
  }

  // EN: Topologically sort dependencies to determine execution order
  // VI: Sắp xếp topo các phụ thuộc để xác định thứ tự thực thi
  public topologicalSort(dependencies: readonly InterFederationDependency[]): readonly string[] {
    this.validateDependencyGraph(dependencies);

    const adj = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    const allNodes = new Set<string>();

    for (const dep of dependencies) {
      if (!adj.has(dep.sourceFederationId)) {
        adj.set(dep.sourceFederationId, []);
      }
      adj.get(dep.sourceFederationId)!.push(dep.targetFederationId);
      allNodes.add(dep.sourceFederationId);
      allNodes.add(dep.targetFederationId);
      inDegree.set(dep.targetFederationId, (inDegree.get(dep.targetFederationId) || 0) + 1);
      if (!inDegree.has(dep.sourceFederationId)) {
        inDegree.set(dep.sourceFederationId, 0);
      }
    }

    const queue: string[] = [];
    for (const node of allNodes) {
      if ((inDegree.get(node) || 0) === 0) {
        queue.push(node);
      }
    }

    // Sort queue deterministically
    queue.sort();

    const order: string[] = [];
    while (queue.length > 0) {
      const u = queue.shift()!;
      order.push(u);

      const neighbors = (adj.get(u) || []).sort();
      for (const v of neighbors) {
        const deg = (inDegree.get(v) || 0) - 1;
        inDegree.set(v, deg);
        if (deg === 0) {
          queue.push(v);
          queue.sort();
        }
      }
    }

    return Object.freeze(order);
  }
}
