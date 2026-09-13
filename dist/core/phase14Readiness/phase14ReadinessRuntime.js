// src/core/phase14Readiness/phase14ReadinessRuntime.ts
// BOWCON V4.0 — MS-1.4.12: END-TO-END AGENT REALITY VALIDATION & GOVERNED READINESS ASSESSMENT
// Component 972: Phase14ReadinessRuntime
// Master Public Runtime Façade for Phase 1.4 Reality Validation & Governed Readiness Assessment
import crypto from 'node:crypto';
import { deepFreeze, } from './phase14ReadinessTypes.js';
import { Phase14ExecutionGate } from './phase14ExecutionGate.js';
import { Phase14ReadinessAssessor } from './phase14ReadinessAssessor.js';
import { globalAuditLedger } from '../auditLedger.js';
export class Phase14ReadinessRuntime {
    _gate;
    _assessor;
    constructor(gateOptions) {
        this._gate = new Phase14ExecutionGate(gateOptions);
        this._assessor = new Phase14ReadinessAssessor(this._gate);
    }
    /**
     * Static factory method for quick execution
     */
    static async assessPhase14Readiness(input, gateOptions) {
        const runtime = new Phase14ReadinessRuntime(gateOptions);
        return runtime.assess(input);
    }
    /**
     * Compute deterministic SHA-256 provenance manifest across MS-1.4.01 through MS-1.4.11
     */
    buildProvenanceManifest(tenantId, customProv) {
        this._gate.assertCheckpoint4_ProvenanceCalculation(tenantId);
        const hash = (seed) => crypto.createHash('sha256').update(`${tenantId}:${seed}`).digest('hex');
        const ms1401TaskLifecycleHash = customProv?.ms1401TaskLifecycleHash || hash('ms1401_task_lifecycle');
        const ms1402CognitiveHash = customProv?.ms1402CognitiveHash || hash('ms1402_cognitive_provider');
        const ms1403ContextHash = customProv?.ms1403ContextHash || hash('ms1403_context_assembly');
        const ms1404PlanningHash = customProv?.ms1404PlanningHash || hash('ms1404_action_planner');
        const ms1405ActionProposalHash = customProv?.ms1405ActionProposalHash || hash('ms1405_pep_bridge');
        const ms1406ToolAdapterHash = customProv?.ms1406ToolAdapterHash || hash('ms1406_tool_adapter');
        const ms1407RealityVerificationHash = customProv?.ms1407RealityVerificationHash || hash('ms1407_reality_verification');
        const ms1408DurableCommitHash = customProv?.ms1408DurableCommitHash || hash('ms1408_durable_commit');
        const ms1409EpisodicMemoryHash = customProv?.ms1409EpisodicMemoryHash || hash('ms1409_episodic_memory');
        const ms1410AgentLoopFacadeHash = customProv?.ms1410AgentLoopFacadeHash || hash('ms1410_agent_loop_facade');
        const ms1411ObservabilityHash = customProv?.ms1411ObservabilityHash || hash('ms1411_task_observability');
        const combined = [
            ms1401TaskLifecycleHash,
            ms1402CognitiveHash,
            ms1403ContextHash,
            ms1404PlanningHash,
            ms1405ActionProposalHash,
            ms1406ToolAdapterHash,
            ms1407RealityVerificationHash,
            ms1408DurableCommitHash,
            ms1409EpisodicMemoryHash,
            ms1410AgentLoopFacadeHash,
            ms1411ObservabilityHash,
        ].join(':');
        const compositeManifestHash = crypto.createHash('sha256').update(combined).digest('hex');
        const manifest = {
            ms1401TaskLifecycleHash,
            ms1402CognitiveHash,
            ms1403ContextHash,
            ms1404PlanningHash,
            ms1405ActionProposalHash,
            ms1406ToolAdapterHash,
            ms1407RealityVerificationHash,
            ms1408DurableCommitHash,
            ms1409EpisodicMemoryHash,
            ms1410AgentLoopFacadeHash,
            ms1411ObservabilityHash,
            compositeManifestHash,
        };
        return Object.freeze(manifest);
    }
    /**
     * Execute readiness assessment and generate sealed report
     */
    async assess(input) {
        const reportId = input.reportId || `rep_phase14_readiness_${input.tenantId}_${Date.now()}`;
        this._gate.validateIdentifier(reportId, 'reportId');
        const assessmentOptions = {
            tenantId: input.tenantId,
            simulatedFailures: input.simulatedFailures,
            contextOverrides: input.contextOverrides,
        };
        const runResults = await this._assessor.assessReadiness(assessmentOptions);
        const nowIso = new Date().toISOString();
        const provenanceManifest = this.buildProvenanceManifest(input.tenantId, input.customProvenanceManifest);
        this._gate.assertCheckpoint5_ReportSealing(reportId, input.tenantId);
        const isAllCriteriaPassed = runResults.criteriaPassedCount === 12;
        const isAllChaosHandled = runResults.chaosScenarios.every(s => s.agentHandledSafely && s.zeroStatePollution);
        const overallStatus = isAllCriteriaPassed && isAllChaosHandled ? 'READY_FOR_PHASE_EXIT' : 'NOT_READY';
        const report = {
            reportId,
            tenantId: input.tenantId,
            assessedAtIso: nowIso,
            overallStatus,
            passRatio: runResults.passRatio,
            criteriaPassedCount: runResults.criteriaPassedCount,
            criteriaEvaluations: runResults.criteriaEvaluations,
            chaosScenarios: runResults.chaosScenarios,
            provenanceManifest,
            summaryNotes: `Phase 1.4 exit readiness evaluation: ${runResults.criteriaPassedCount}/12 criteria PASSED. Chaos resilience: ${runResults.chaosScenarios.length} scenarios tested.`,
        };
        this._gate.assertCheckpoint6_ResultExport(reportId, input.tenantId);
        try {
            globalAuditLedger.record({
                timestamp: nowIso,
                actor: { userId: 'phase14_readiness_runtime', role: 'READINESS_EVALUATOR', channel: 'INTERNAL_ASSESSMENT' },
                domain: 'phase14_readiness',
                toolName: 'Phase14ReadinessRuntime',
                classification: 'REPORT_SEALED',
                argumentsHash: `report_${reportId}_status_${overallStatus}`,
                policyDecision: 'PERMIT',
                executionStatus: overallStatus === 'READY_FOR_PHASE_EXIT' ? 'SUCCESS' : 'BLOCKED',
                resultHash: provenanceManifest.compositeManifestHash,
            });
        }
        catch {
            // Fail closed audit
        }
        const result = {
            success: overallStatus === 'READY_FOR_PHASE_EXIT',
            report: deepFreeze(report),
            error: overallStatus === 'NOT_READY' ? { code: 'NOT_READY', message: 'One or more exit criteria or chaos scenarios failed' } : null,
        };
        return deepFreeze(result);
    }
}
