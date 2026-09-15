// ============================================================================
// BOWCON V4.0 — MILESTONE MS-1.5.19
// Component 1162: CounterfactualPolicySimulationEngine
// Bounded, Read-Only, Isolated Counterfactual Policy Simulation Sandbox
// ============================================================================

import * as crypto from 'crypto';
import {
  PolicyEvolutionProposal,
  CounterfactualSimulationResult,
  CounterfactualScenario,
  MAX_SIMULATION_SCENARIOS_PER_ROUND,
  MAX_SIMULATION_DEPTH,
  MAX_CONCURRENT_SIMULATIONS,
  SimulationCeilingExceededError,
  computeCounterfactualSimulationHash,
} from './GovernedStrategicPolicyEvolutionTypes.js';

export class CounterfactualPolicySimulationEngine {
  private activeSimulationCount: number = 0;

  constructor() {}

  // EN: Runs hypothetical policy scenarios in an isolated, read-only sandbox with zero side-effects.
  // VI: Chạy các kịch bản chính sách giả định trong sandbox chỉ đọc, cô lập hoàn toàn không tác dụng phụ.
  public simulate(
    proposal: PolicyEvolutionProposal,
    requestedScenarios: number = 3,
    recursionDepth: number = 2
  ): CounterfactualSimulationResult {
    // EN: Guard against exceeding concurrent simulation ceiling.
    // VI: Bảo vệ chống vượt quá giới hạn số phiên mô phỏng đồng thời.
    if (this.activeSimulationCount >= MAX_CONCURRENT_SIMULATIONS) {
      throw new SimulationCeilingExceededError(
        `Simulation concurrency limit reached: Maximum ${MAX_CONCURRENT_SIMULATIONS} concurrent simulations permitted`
      );
    }

    // EN: Guard against unbounded scenario counts.
    // VI: Bảo vệ chống vượt quá giới hạn số kịch bản cho phép.
    if (requestedScenarios > MAX_SIMULATION_SCENARIOS_PER_ROUND) {
      throw new SimulationCeilingExceededError(
        `Scenario limit exceeded: Requested ${requestedScenarios}, maximum permitted is ${MAX_SIMULATION_SCENARIOS_PER_ROUND}`
      );
    }

    // EN: Guard against unbounded recursion depth.
    // VI: Bảo vệ chống vượt quá độ sâu đệ quy mô phỏng cho phép.
    if (recursionDepth > MAX_SIMULATION_DEPTH) {
      throw new SimulationCeilingExceededError(
        `Simulation depth exceeded: Requested depth ${recursionDepth}, maximum permitted is ${MAX_SIMULATION_DEPTH}`
      );
    }

    this.activeSimulationCount++;

    try {
      const scenarios: CounterfactualScenario[] = [];

      for (let i = 0; i < requestedScenarios; i++) {
        // EN: Pure mathematical projection based on proposal domains and delta counts.
        // VI: Dự báo thuần túy toán học dựa trên miền chính sách và số lượng thay đổi.
        const agentCount = 4 + i * 2;
        const rounds = 3 + i;
        const baselineSuccess = proposal.policyDomain === 'SECURITY' ? 0.75 : 0.85;
        const deltaPenalty = proposal.proposedChanges.length * 0.04;
        const projectedSuccess = Math.min(0.99, Math.max(0.1, baselineSuccess - deltaPenalty + (i * 0.03)));
        const conflictDelta = Math.round((proposal.proposedChanges.length * 1.5) - (i * 0.5));
        const driftDelta = Number(((proposal.policyDomain === 'LEASE' ? 0.12 : 0.04) - (i * 0.01)).toFixed(4));

        scenarios.push({
          scenarioId: `scenario_${proposal.proposalId.slice(-8)}_${i}`,
          description: `Hypothetical perturbation run ${i + 1} with ${agentCount} simulated agents across ${rounds} rounds`,
          simulatedAgentCount: agentCount,
          simulatedConvergenceRounds: rounds,
          projectedSuccessRate: Number(projectedSuccess.toFixed(4)),
          projectedConflictDelta: conflictDelta,
          projectedDriftDelta: driftDelta,
        });
      }

      const meanFeasibility = scenarios.reduce((sum, s) => sum + s.projectedSuccessRate, 0) / scenarios.length;
      const simulationId = `urn:bow:simulation:${crypto.randomUUID()}`;

      const result: CounterfactualSimulationResult = {
        simulationId,
        proposalId: proposal.proposalId,
        tenantId: proposal.tenantId,
        scenarios,
        recursionDepth,
        isHypothetical: true,
        cannotGrantAuthority: true,
        overallConvergenceFeasibility: Number(meanFeasibility.toFixed(4)),
        provenanceHash: '',
        simulatedAt: Date.now(),
      };
      result.provenanceHash = computeCounterfactualSimulationHash(result);

      return result;
    } finally {
      this.activeSimulationCount = Math.max(0, this.activeSimulationCount - 1);
    }
  }
}
