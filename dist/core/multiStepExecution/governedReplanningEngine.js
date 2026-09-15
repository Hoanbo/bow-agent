// src/core/multiStepExecution/governedReplanningEngine.ts
// BOWCON V4.0 — MS-1.5.10: GOVERNED REPLANNING ENGINE
// Component 1073 — REAL
//
// EN: Governed replanning engine. Detects plan invalidations caused by failed steps,
//     environmental drift, or policy interventions, and constructs cryptographically sealed
//     ReplanningRequests. Enforces invariant: REPLANNING != SELF-AUTHORIZATION.
// VI: Động cơ lập lại kế hoạch có quản trị. Phát hiện sự vô hiệu hóa kế hoạch do các bước thất bại,
//     sự trôi dạt môi trường hoặc sự can thiệp chính sách, và tạo các ReplanningRequest được niêm phong mật mã.
//     Thực thi bất biến: LẬP KẾ HOẠCH LẠI KHÔNG PHẢI TỰ ỦY QUYỀN.
import crypto from 'node:crypto';
import { MAX_REPLANS_PER_SESSION, computeReplanningRequestProvenanceHash, MultiStepExecutionReplanningError, } from './multiStepExecutionTypes.js';
import { MultiStepExecutionValidator } from './multiStepExecutionValidator.js';
import { ExecutionStepScheduler } from './executionStepScheduler.js';
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';
export class GovernedReplanningEngine {
    userStopProvider;
    constructor(options) {
        this.userStopProvider = options?.userStopProvider ?? (() => globalMasterHumanAuthority.isUserStopActive);
    }
    /**
     * EN: Evaluates whether a replanning request must be created and synthesizes an immutable request envelope.
     * VI: Đánh giá xem có cần tạo yêu cầu lập lại kế hoạch hay không và tổng hợp phong bì yêu cầu bất biến.
     */
    createReplanningRequest(params) {
        const totalReplans = params.totalPreviousReplans ?? 0;
        if (totalReplans >= MAX_REPLANS_PER_SESSION) {
            throw new MultiStepExecutionReplanningError(`Replanning limit exceeded: session already underwent ${totalReplans} replans (max ${MAX_REPLANS_PER_SESSION})`);
        }
        MultiStepExecutionValidator.validateGeneration(params.generation);
        MultiStepExecutionValidator.validateEnvironmentSnapshot(params.environmentSnapshot);
        const steps = params.generation.stepStates;
        const completedStepIds = [];
        let failedStepId = params.failedStepId;
        for (const step of Object.values(steps)) {
            if (step.status === 'COMPLETED') {
                completedStepIds.push(step.stepId);
            }
            else if (step.status === 'FAILED' && !failedStepId) {
                failedStepId = step.stepId;
            }
        }
        // Compute downstream invalidated steps
        let invalidatedStepIds = [];
        if (failedStepId && steps[failedStepId]) {
            invalidatedStepIds = ExecutionStepScheduler.computeCascadingInvalidations(failedStepId, steps);
        }
        if (params.explicitInvalidatedStepIds) {
            for (const id of params.explicitInvalidatedStepIds) {
                if (!invalidatedStepIds.includes(id)) {
                    invalidatedStepIds.push(id);
                }
            }
        }
        invalidatedStepIds.sort();
        // Identify affected dependencies
        const affectedDependencies = [];
        for (const invId of invalidatedStepIds) {
            const step = steps[invId];
            if (step) {
                for (const dep of step.dependencies) {
                    if (!affectedDependencies.includes(dep)) {
                        affectedDependencies.push(dep);
                    }
                }
            }
        }
        affectedDependencies.sort();
        const timestamp = new Date().toISOString();
        const requestId = `replan_${params.generation.tenantId}_${params.generation.sessionId}_gen${params.generation.generationIndex}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const rawRequest = {
            requestId,
            tenantId: params.generation.tenantId,
            sessionId: params.generation.sessionId,
            sourceGenerationId: params.generation.generationId,
            sourceGenerationIndex: params.generation.generationIndex,
            taskId: params.generation.taskId,
            planId: params.generation.planId,
            completedStepIds: Object.freeze(completedStepIds.sort()),
            failedStepId,
            invalidatedStepIds: Object.freeze(invalidatedStepIds),
            environmentSnapshot: params.environmentSnapshot,
            reason: params.reason.trim(),
            affectedDependencies: Object.freeze(affectedDependencies),
            remainingObjective: params.remainingObjective.trim(),
            timestamp,
        };
        const provenanceHash = computeReplanningRequestProvenanceHash(rawRequest);
        const sealedRequest = Object.freeze({
            ...rawRequest,
            provenanceHash,
        });
        MultiStepExecutionValidator.validateReplanningRequest(sealedRequest);
        return sealedRequest;
    }
}
