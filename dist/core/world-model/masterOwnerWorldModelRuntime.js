// src/core/world-model/masterOwnerWorldModelRuntime.ts
// BOWCON V4.0 — MS-1.3.42: MASTER OWNER WORLD MODEL, SELF-AWARENESS & CAPABILITY-GROUNDED REASONING RUNTIME
//
// Master Orchestrator for the World Model Subsystem.
// Coordinates:
//   OBSERVE -> BUILD WORLD MODEL -> IDENTIFY GAPS -> DETECT CONTRADICTIONS ->
//   GROUND CAPABILITIES -> REASON & CHALLENGE -> PROPOSE PLAN -> GOVERN ->
//   REQUEST AUTHORIZATION -> EXECUTE -> VERIFY -> UPDATE WORLD MODEL -> LEARN
//
// Invariants:
// MASTER_OWNER_AUTHORITY > BOW > BOWCON > OPTIONAL_PROJECT_INTEGRATIONS
// OWNER_DECISION > BOWCON_RECOMMENDATION
// USER_STOP > EVERYTHING_AUTONOMOUS
// CHALLENGE != AUTHORITY
// RECOMMENDATION != EXECUTION
// PREDICTION != FACT
// INFERENCE != FACT
// MEMORY != TRUTH
// C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0
import { globalBowconSelfModelEngine } from './bowconSelfModelEngine.js';
import { globalMasterOwnerWorldModelManager } from './masterOwnerWorldModelManager.js';
import { globalCapabilityGroundedReasoningEngine } from './capabilityGroundedReasoningEngine.js';
import { globalInformationGapEngine } from './informationGapEngine.js';
import { globalWorldModelContradictionEngine } from './worldModelContradictionEngine.js';
import { globalEnhancedSelfCorrectionEngine } from './enhancedSelfCorrectionEngine.js';
import { MASTER_OWNER_ID } from '../architecture/masterArchitectureIdentity.js';
export class MasterOwnerWorldModelRuntime {
    selfModel;
    worldModel;
    reasoning;
    gaps;
    contradictions;
    selfCorrection;
    _isStopped = false;
    _stopReason = '';
    constructor(selfModel = globalBowconSelfModelEngine, worldModel = globalMasterOwnerWorldModelManager, reasoning = globalCapabilityGroundedReasoningEngine, gaps = globalInformationGapEngine, contradictions = globalWorldModelContradictionEngine, selfCorrection = globalEnhancedSelfCorrectionEngine) {
        this.selfModel = selfModel;
        this.worldModel = worldModel;
        this.reasoning = reasoning;
        this.gaps = gaps;
        this.contradictions = contradictions;
        this.selfCorrection = selfCorrection;
    }
    /**
     * Universal Emergency Stop. Preempts all autonomous execution and cognitive loops.
     */
    emergencyStop(reason = 'Master Owner emergency stop') {
        this._isStopped = true;
        this._stopReason = reason;
        this.selfModel.recordObservation('runtime_stopped', true, 'master_operator_stop');
    }
    resetEmergencyStop(operatorId) {
        if (operatorId !== MASTER_OWNER_ID) {
            throw new Error(`UNAUTHORIZED: Only Master Owner (${MASTER_OWNER_ID}) may reset emergency stop.`);
        }
        this._isStopped = false;
        this._stopReason = '';
        this.selfModel.recordObservation('runtime_stopped', false, 'master_operator_reset');
    }
    isStopped() {
        return this._isStopped;
    }
    getStopReason() {
        return this._stopReason;
    }
    /**
     * Executes a complete cognitive observation and grounding cycle.
     */
    runCognitiveCycle() {
        if (this._isStopped) {
            throw new Error(`RUNTIME_STOPPED: Cognitive cycle cannot execute under USER_STOP (${this._stopReason}).`);
        }
        // 1. Refresh live host and capability observations
        this.worldModel.refreshObservations();
        const snapshot = this.worldModel.getSnapshot();
        // 2. Feed observations into Self-Model
        this.selfModel.recordObservation('host_platform', snapshot.hostEnvironment.operatingSystem.platform);
        this.selfModel.recordObservation('cpu_architecture', snapshot.hostEnvironment.architecture.arch);
        this.selfModel.recordObservation('available_capabilities_count', snapshot.availableCapabilities.length);
        // 3. Detect implicit information gaps
        this.gaps.detectGapsFromSelfModel(this.selfModel.getSelfModel());
        // 4. Update world model with active contradictions
        const activeContradictions = this.contradictions.getUnresolved();
        this.worldModel.setContradictions(activeContradictions);
        return {
            snapshot,
            activeGapsCount: this.gaps.getActiveGaps().length,
            unresolvedContradictionsCount: activeContradictions.length,
            stalenessChecked: true,
        };
    }
    /**
     * Assesses the grounded feasibility of a proposed plan.
     */
    evaluatePlan(spec, activeTokens = []) {
        if (this._isStopped) {
            return {
                planId: spec.planId,
                status: 'PLAN_BLOCKED',
                requiredCapabilities: spec.requiredCapabilities,
                availableCapabilities: [],
                missingCapabilities: [],
                requiredAuthorizations: [],
                requiredOwnerActions: [],
                reasons: [`Execution is blocked by USER_STOP: ${this._stopReason}`],
                executionAllowed: false,
                assessedAt: Date.now(),
            };
        }
        const host = this.worldModel.getSnapshot().hostEnvironment;
        const feasibility = this.reasoning.evaluatePlanFeasibility(spec, host, activeTokens);
        // Record discovered gaps if plan is blocked or conditional
        if (feasibility.status === 'PLAN_BLOCKED' || feasibility.status === 'PLAN_CONDITIONALLY_POSSIBLE') {
            this.gaps.detectGapsForPlan(spec.planId, spec.requiredCapabilities, feasibility.availableCapabilities, activeTokens);
        }
        return feasibility;
    }
    /**
     * Generates a grounded operational briefing for the Master Owner.
     */
    getBriefing() {
        const snap = this.worldModel.getSnapshot();
        const activeGaps = this.gaps.getActiveGaps();
        const activeCtrd = this.contradictions.getUnresolved();
        return [
            `=== BOWCON V4.0 MASTER OWNER WORLD MODEL BRIEFING ===`,
            `Owner: ${snap.ownerId} | Ecosystem: ${snap.ecosystemId} | Runtime: ${snap.runtimeIdentity}`,
            `Host: ${snap.hostEnvironment.operatingSystem.platform} (${snap.hostEnvironment.architecture.arch})`,
            `Capabilities Available: ${snap.availableCapabilities.length}`,
            `Active Gaps: ${activeGaps.length}`,
            `Unresolved Contradictions: ${activeCtrd.length}`,
            `Temporal Status: ${snap.temporalState.isStale ? 'STALE (Re-discovery recommended)' : 'FRESH'}`,
            `Runtime State: ${this._isStopped ? `STOPPED (${this._stopReason})` : 'OPERATIONAL'}`,
            `======================================================`,
        ].join('\n');
    }
}
export const globalMasterOwnerWorldModelRuntime = new MasterOwnerWorldModelRuntime();
