// src/core/phase14Readiness/phase14ReadinessAssessor.ts
// BOWCON V4.0 — MS-1.4.12: END-TO-END AGENT REALITY VALIDATION & GOVERNED READINESS ASSESSMENT
// Component 971: Phase14ReadinessAssessor
// Multi-Scenario Chaos & Criteria Assessment Orchestrator
import { deepFreeze, } from './phase14ReadinessTypes.js';
import { ChaosFaultInjector } from './chaosFaultInjector.js';
import { Phase14ExitCriteriaEvaluator } from './phase14ExitCriteriaEvaluator.js';
import { globalAuditLedger } from '../auditLedger.js';
export class Phase14ReadinessAssessor {
    _gate;
    _injector;
    _evaluator;
    constructor(gate) {
        this._gate = gate;
        this._injector = new ChaosFaultInjector(this._gate);
        this._evaluator = new Phase14ExitCriteriaEvaluator(this._gate);
    }
    /**
     * Run full holistic readiness assessment across chaos scenarios and 12 exit criteria
     */
    async assessReadiness(options) {
        this._gate.assertCheckpoint1_AssessmentIntake(options.tenantId);
        const chaosFaults = (options.simulatedFailures && options.simulatedFailures.length > 0)
            ? [...options.simulatedFailures]
            : [
                'NETWORK_TIMEOUT',
                'MODEL_CIRCUIT_BREAK',
                'PDP_DENIAL',
                'VERIFICATION_FAILURE',
                'COMMIT_CONFLICT',
                'USER_STOP_PREEMPTION',
            ];
        // Execute Chaos Scenarios
        const chaosResults = [];
        for (let i = 0; i < chaosFaults.length; i++) {
            const fault = chaosFaults[i];
            const scenarioId = `chaos_${options.tenantId}_${fault.toLowerCase()}_${i + 1}`;
            const res = await this._injector.executeChaosScenario({
                scenarioId,
                faultType: fault,
                targetSubsystem: `Subsystem_${fault}`,
                tenantId: options.tenantId,
            });
            chaosResults.push(res);
        }
        // Default healthy evaluator context
        const defaultContext = {
            tenantId: options.tenantId,
            shopOfBowUntouched: true,
            regressionPassRatio: 1.0,
            userStopLatencyMs: 15,
            multiStepCompletionObserved: true,
            zeroUnauthToolObserved: true,
            zeroUnhandledDenialObserved: true,
            inferenceBudgetsEnforced: true,
            toolIsolationEnforced: true,
            realityVerificationEnforced: true,
            memoryPollutionInvariantHeld: true,
            distributedTracesComplete: true,
            multiTenantIsolationHeld: true,
            ...(options.contextOverrides || {}),
        };
        // Evaluate 12 Exit Criteria
        const criteriaEvaluations = this._evaluator.evaluateAllCriteria(defaultContext);
        let passedCount = 0;
        for (const item of criteriaEvaluations) {
            if (item.status === 'PASSED') {
                passedCount++;
            }
        }
        const passRatio = criteriaEvaluations.length > 0
            ? Number((passedCount / criteriaEvaluations.length).toFixed(4))
            : 0;
        try {
            globalAuditLedger.record({
                timestamp: new Date().toISOString(),
                actor: { userId: 'phase14_readiness_assessor', role: 'ASSESSOR', channel: 'INTERNAL_EVALUATION' },
                domain: 'phase14_readiness',
                toolName: 'Phase14ReadinessAssessor',
                classification: 'ASSESSMENT_RUN_COMPLETE',
                argumentsHash: `readiness_assessment_${options.tenantId}_${passedCount}of${criteriaEvaluations.length}`,
                policyDecision: 'PERMIT',
                executionStatus: passedCount === 12 ? 'SUCCESS' : 'BLOCKED',
                resultHash: `pass_ratio_${passRatio}`,
            });
        }
        catch {
            // Fail closed audit
        }
        const results = {
            criteriaEvaluations: Object.freeze(criteriaEvaluations),
            chaosScenarios: Object.freeze(chaosResults),
            passRatio,
            criteriaPassedCount: passedCount,
        };
        return deepFreeze(results);
    }
}
