// src/core/planning/planDependencyResolver.ts
// BOWCON V4.0 — MS-1.4.04: DETERMINISTIC PLAN DEPENDENCY RESOLVER & DAG ENGINE
//
// Invariants:
// LLM_OUTPUT != AUTHORITY
// LLM_PROPOSAL != EXECUTION
// PLAN != EXECUTION
//
// Construct deterministic Directed Acyclic Graph (DAG) for candidate plan steps.
// Cycle detection fails closed. No silent repair or edge pruning.

import {
  type GovernedCandidateStep,
  type GovernedPlannerConfig,
  type PlanDag,
  type PlanDependencyEdge,
  PLANNER_LIMITS,
  PlanBudgetExceededError,
  PlanDagCycleError,
  PlanValidationError,
} from './governedPlanningTypes.js';

export interface DependencyResolverResult {
  readonly steps: readonly GovernedCandidateStep[];
  readonly dag: PlanDag;
}

export class PlanDependencyResolver {
  /**
   * Resolves dependencies, builds a validated PlanDag, and verifies acyclicity.
   * Fails closed on any cycle, missing dependency, duplicate edge, or self-dependency.
   */
  public static resolve(
    steps: readonly GovernedCandidateStep[],
    rawEdges?: readonly PlanDependencyEdge[],
    config?: GovernedPlannerConfig
  ): DependencyResolverResult {
    const maxEdges = config?.maxDependencies ?? PLANNER_LIMITS.MAX_DEPENDENCIES;

    if (!Array.isArray(steps) || steps.length === 0) {
      throw new PlanValidationError('Cannot resolve dependencies for empty step list');
    }

    const stepMap = new Map<string, GovernedCandidateStep>();
    const nodeIds: string[] = [];

    for (const step of steps) {
      if (!step.stepId || typeof step.stepId !== 'string') {
        throw new PlanValidationError('Step missing valid stepId');
      }
      if (stepMap.has(step.stepId)) {
        throw new PlanValidationError(`Duplicate stepId detected: ${step.stepId}`);
      }
      stepMap.set(step.stepId, step);
      nodeIds.push(step.stepId);
    }

    // Deterministically collect edges
    const validatedEdges: PlanDependencyEdge[] = [];
    const edgeSet = new Set<string>();
    const inDegrees = new Map<string, number>();
    const adjacency = new Map<string, string[]>(); // from -> [to]
    const reverseAdjacency = new Map<string, string[]>(); // to -> [from] (dependencies)

    for (const id of nodeIds) {
      inDegrees.set(id, 0);
      adjacency.set(id, []);
      reverseAdjacency.set(id, []);
    }

    // If explicit edges are provided, use them; otherwise, sequential chain step(i-1) -> step(i)
    if (rawEdges && rawEdges.length > 0) {
      if (rawEdges.length > maxEdges) {
        throw new PlanBudgetExceededError(
          `Plan dependency edge count (${rawEdges.length}) exceeds maximum limit (${maxEdges})`
        );
      }

      for (const edge of rawEdges) {
        if (!edge.fromStepId || !edge.toStepId) {
          throw new PlanValidationError('Dependency edge missing fromStepId or toStepId');
        }

        // Self-dependency check
        if (edge.fromStepId === edge.toStepId) {
          throw new PlanValidationError(
            `Self-dependency detected: Step '${edge.fromStepId}' cannot depend on itself`
          );
        }

        // Existence check
        if (!stepMap.has(edge.fromStepId)) {
          throw new PlanValidationError(
            `Dependency edge references non-existent prerequisite stepId: '${edge.fromStepId}'`
          );
        }
        if (!stepMap.has(edge.toStepId)) {
          throw new PlanValidationError(
            `Dependency edge references non-existent dependent stepId: '${edge.toStepId}'`
          );
        }

        // Duplicate edge check
        const edgeKey = `${edge.fromStepId}->${edge.toStepId}`;
        if (edgeSet.has(edgeKey)) {
          throw new PlanValidationError(
            `Duplicate dependency edge detected: '${edge.fromStepId}' -> '${edge.toStepId}'`
          );
        }
        edgeSet.add(edgeKey);

        adjacency.get(edge.fromStepId)!.push(edge.toStepId);
        reverseAdjacency.get(edge.toStepId)!.push(edge.fromStepId);
        inDegrees.set(edge.toStepId, inDegrees.get(edge.toStepId)! + 1);

        validatedEdges.push({
          fromStepId: edge.fromStepId,
          toStepId: edge.toStepId,
        });
      }
    } else if (steps.length > 1) {
      // Default deterministic linear dependency chain: step[i-1] is prerequisite for step[i]
      for (let i = 1; i < steps.length; i++) {
        const fromStepId = steps[i - 1].stepId;
        const toStepId = steps[i].stepId;

        adjacency.get(fromStepId)!.push(toStepId);
        reverseAdjacency.get(toStepId)!.push(fromStepId);
        inDegrees.set(toStepId, inDegrees.get(toStepId)! + 1);

        validatedEdges.push({
          fromStepId,
          toStepId,
        });
      }
    }

    // Deterministic Topological Sort using Kahn's Algorithm
    // Priority queue / sorted array for deterministic tie-breaking
    const zeroInDegreeQueue: string[] = [];
    for (const [id, deg] of inDegrees.entries()) {
      if (deg === 0) {
        zeroInDegreeQueue.push(id);
      }
    }
    // Sort deterministically by sequence number
    zeroInDegreeQueue.sort((a, b) => (stepMap.get(a)?.sequence ?? 0) - (stepMap.get(b)?.sequence ?? 0));

    const topologicalOrder: string[] = [];
    const levelMap = new Map<string, number>();

    // Initial zero in-degree nodes are at Level 0
    for (const id of zeroInDegreeQueue) {
      levelMap.set(id, 0);
    }

    const currentInDegrees = new Map(inDegrees);

    while (zeroInDegreeQueue.length > 0) {
      const current = zeroInDegreeQueue.shift()!;
      topologicalOrder.push(current);

      const neighbors = adjacency.get(current) ?? [];
      const sortedNeighbors = [...neighbors].sort(
        (a, b) => (stepMap.get(a)?.sequence ?? 0) - (stepMap.get(b)?.sequence ?? 0)
      );

      const currentLevel = levelMap.get(current) ?? 0;

      for (const neighbor of sortedNeighbors) {
        const nextDeg = currentInDegrees.get(neighbor)! - 1;
        currentInDegrees.set(neighbor, nextDeg);

        const currentNeighborLevel = levelMap.get(neighbor) ?? 0;
        levelMap.set(neighbor, Math.max(currentNeighborLevel, currentLevel + 1));

        if (nextDeg === 0) {
          zeroInDegreeQueue.push(neighbor);
          zeroInDegreeQueue.sort(
            (a, b) => (stepMap.get(a)?.sequence ?? 0) - (stepMap.get(b)?.sequence ?? 0)
          );
        }
      }
    }

    // Cycle detection check
    if (topologicalOrder.length !== nodeIds.length) {
      const cycleNodes = nodeIds.filter((id) => (currentInDegrees.get(id) ?? 0) > 0);
      throw new PlanDagCycleError(
        `Dependency cycle detected in plan graph involving steps: [${cycleNodes.join(', ')}]`,
        cycleNodes
      );
    }

    // Build hierarchical levels array
    const maxLevel = Math.max(0, ...Array.from(levelMap.values()));
    const levels: string[][] = Array.from({ length: maxLevel + 1 }, () => []);
    for (const [id, lvl] of levelMap.entries()) {
      levels[lvl].push(id);
    }
    for (const lvlArr of levels) {
      lvlArr.sort((a, b) => (stepMap.get(a)?.sequence ?? 0) - (stepMap.get(b)?.sequence ?? 0));
    }

    // Update steps with their resolved dependencies and freeze
    const updatedSteps: GovernedCandidateStep[] = steps.map((step) => {
      const deps = reverseAdjacency.get(step.stepId) ?? [];
      const sortedDeps = [...deps].sort();
      return Object.freeze({
        ...step,
        dependencies: Object.freeze(sortedDeps),
      });
    });

    const dag: PlanDag = Object.freeze({
      nodes: Object.freeze([...nodeIds]),
      edges: Object.freeze(validatedEdges),
      topologicalOrder: Object.freeze(topologicalOrder),
      levels: Object.freeze(levels.map((l) => Object.freeze(l))),
    });

    return {
      steps: Object.freeze(updatedSteps),
      dag,
    };
  }
}
