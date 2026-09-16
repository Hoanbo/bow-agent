// src/core/governedPolicySimulation/CrossDomainPolicyInvariantChecker.ts
// Component 1211: CrossDomainPolicyInvariantChecker (REAL)
//
// Analytical graph cycle detection and multi-domain policy deadlock identification.
// Nhận diện bế tắc chính sách đa miền và phát hiện chu trình đồ thị phân tích.

import type { PolicyDomain } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
import {
  EmergencyStopProvider,
  EmergencyStopActiveError,
  PolicyDomainDependency,
  CrossDomainInvariantResult,
  computeInvariantCheckHash,
} from './GovernedPolicySimulationTypes.js';

export class CrossDomainPolicyInvariantChecker {
  private readonly emergencyStopProvider?: EmergencyStopProvider;

  constructor(emergencyStopProvider?: EmergencyStopProvider) {
    this.emergencyStopProvider = emergencyStopProvider;
  }

  private assertEmergencyStopInactive(): void {
    if (!this.emergencyStopProvider) {
      throw new EmergencyStopActiveError('Emergency stop provider is missing or undefined (fail-closed)');
    }
    let active: unknown;
    try {
      active = this.emergencyStopProvider.isEmergencyStopActive();
    } catch (err) {
      throw new EmergencyStopActiveError(
        `Emergency stop provider threw error during invariant checking: ${err instanceof Error ? err.message : String(err)}`
      );
    }
    if (typeof active !== 'boolean' || active === true) {
      throw new EmergencyStopActiveError('Emergency stop is ACTIVE or non-boolean (fail-closed)');
    }
  }

  /**
   * Verifies policy domain dependencies for circular constraints and deadlocks.
   * Analytical only: Upon conflict, emits DEADLOCK_DETECTED; never auto-resolves.
   */
  public verifyDomainInvariants(
    dependencies: readonly PolicyDomainDependency[]
  ): CrossDomainInvariantResult {
    this.assertEmergencyStopInactive();

    if (!Array.isArray(dependencies)) {
      return Object.freeze({
        hasDeadlock: false,
        circularDependencies: [],
        conflictingRules: [],
        invariantCheckHash: computeInvariantCheckHash({ hasDeadlock: false, circularDependencies: [], conflictingRules: [] }),
        checkedAt: Date.now(),
      });
    }

    // Build directed adjacency list
    const adj = new Map<string, string[]>();
    const allNodes = new Set<string>();

    for (const dep of dependencies) {
      const u = `${dep.sourceDomain}:${dep.constraintName}`;
      const v = `${dep.targetDomain}:${dep.prerequisiteRuleId}`;
      allNodes.add(u);
      allNodes.add(v);

      if (!adj.has(u)) {
        adj.set(u, []);
      }
      adj.get(u)!.push(v);
    }

    // Cycle detection via DFS with recursion stack
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const circularPaths: string[][] = [];
    const conflictingRules = new Set<string>();

    const dfs = (node: string, currentPath: string[]): void => {
      visited.add(node);
      recStack.add(node);
      currentPath.push(node);

      const neighbors = adj.get(node) || [];
      for (const next of neighbors) {
        if (!visited.has(next)) {
          dfs(next, [...currentPath]);
        } else if (recStack.has(next)) {
          // Found cycle
          const cycleStartIndex = currentPath.indexOf(next);
          const cycle = cycleStartIndex !== -1 ? currentPath.slice(cycleStartIndex) : [...currentPath, next];
          circularPaths.push([...cycle, next]);
          for (const c of cycle) {
            conflictingRules.add(c);
          }
        }
      }

      recStack.delete(node);
    };

    for (const node of allNodes) {
      if (!visited.has(node)) {
        dfs(node, []);
      }
    }

    const hasDeadlock = circularPaths.length > 0;
    const sortedConflicting = Array.from(conflictingRules).sort();

    const invariantCheckHash = computeInvariantCheckHash({
      hasDeadlock,
      circularDependencies: circularPaths,
      conflictingRules: sortedConflicting,
    });

    return Object.freeze({
      hasDeadlock,
      circularDependencies: circularPaths,
      conflictingRules: sortedConflicting,
      invariantCheckHash,
      checkedAt: Date.now(),
    });
  }
}
