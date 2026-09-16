// src/core/governedPolicySimulation/CounterfactualAssuranceProjector.ts
// Component 1210: CounterfactualAssuranceProjector (REAL)
//
// Quantitative projection of operational assurance scores (A_proj), false rejection rates, and drift deltas (ΔA).
// Dự báo định lượng điểm số bảo đảm vận hành (A_proj), tỷ lệ từ chối sai và độ lệch trôi dạt (ΔA).
import { EmergencyStopActiveError, SimulationAuthorityViolationError, computeProjectionHash, DEFAULT_FALSE_REJECTION_THRESHOLD, } from './GovernedPolicySimulationTypes.js';
export class CounterfactualAssuranceProjector {
    emergencyStopProvider;
    falseRejectionThreshold;
    constructor(emergencyStopProvider, falseRejectionThreshold = DEFAULT_FALSE_REJECTION_THRESHOLD) {
        this.emergencyStopProvider = emergencyStopProvider;
        this.falseRejectionThreshold = falseRejectionThreshold;
    }
    assertEmergencyStopInactive() {
        if (!this.emergencyStopProvider) {
            throw new EmergencyStopActiveError('Emergency stop provider is missing or undefined (fail-closed)');
        }
        let active;
        try {
            active = this.emergencyStopProvider.isEmergencyStopActive();
        }
        catch (err) {
            throw new EmergencyStopActiveError(`Emergency stop provider threw error during assurance projection: ${err instanceof Error ? err.message : String(err)}`);
        }
        if (typeof active !== 'boolean' || active === true) {
            throw new EmergencyStopActiveError('Emergency stop is ACTIVE or non-boolean (fail-closed)');
        }
    }
    /**
     * Projects prospective assurance score A_proj and regression risk.
     * SIMULATION_SCORE != AUTHORIZATION: High projected assurance gives zero approval power.
     */
    projectAssuranceImpact(replayResult, baselineAssurance) {
        this.assertEmergencyStopInactive();
        if (typeof baselineAssurance !== 'number' || isNaN(baselineAssurance) || baselineAssurance < 0 || baselineAssurance > 1) {
            throw new SimulationAuthorityViolationError('Baseline assurance must be a valid finite number between 0 and 1');
        }
        if (!replayResult || typeof replayResult.totalReplayed !== 'number') {
            throw new SimulationAuthorityViolationError('Invalid replay execution result input');
        }
        // Fail closed on empty replay corpus
        if (replayResult.totalReplayed === 0) {
            const projectionHash = computeProjectionHash({
                baselineAssurance,
                projectedAssurance: 0,
                assuranceDelta: -baselineAssurance,
                falsePositiveRejectionRate: 1.0,
            });
            return Object.freeze({
                baselineAssurance,
                projectedAssurance: 0,
                assuranceDelta: -baselineAssurance,
                falsePositiveRejectionRate: 1.0,
                isHighRegressionRisk: true,
                projectionHash,
                calculatedAt: Date.now(),
            });
        }
        const totalValidBefore = replayResult.totalReplayed - (replayResult.trueMitigationCount || 0);
        const falsePositiveRejectionRate = totalValidBefore > 0 ? replayResult.falseRejectionCount / totalValidBefore : 0;
        // Projected assurance balances mitigation gain against false rejection penalty
        const mitigationBonus = (replayResult.trueMitigationCount / replayResult.totalReplayed) * 0.3;
        const rejectionPenalty = falsePositiveRejectionRate * 0.5;
        let projectedAssurance = baselineAssurance + mitigationBonus - rejectionPenalty;
        projectedAssurance = Math.max(0.0, Math.min(1.0, Number(projectedAssurance.toFixed(4))));
        const assuranceDelta = Number((projectedAssurance - baselineAssurance).toFixed(4));
        const isHighRegressionRisk = falsePositiveRejectionRate > this.falseRejectionThreshold;
        const projectionHash = computeProjectionHash({
            baselineAssurance,
            projectedAssurance,
            assuranceDelta,
            falsePositiveRejectionRate,
        });
        return Object.freeze({
            baselineAssurance,
            projectedAssurance,
            assuranceDelta,
            falsePositiveRejectionRate: Number(falsePositiveRejectionRate.toFixed(4)),
            isHighRegressionRisk,
            projectionHash,
            calculatedAt: Date.now(),
        });
    }
}
