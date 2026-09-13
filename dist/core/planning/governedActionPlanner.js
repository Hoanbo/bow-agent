// src/core/planning/governedActionPlanner.ts
// BOWCON V4.0 — MS-1.4.04: GOVERNED MULTI-STEP ACTION PLANNER
//
// Invariants:
// LLM_OUTPUT != AUTHORITY
// LLM_PROPOSAL != EXECUTION
// CONFIDENCE != AUTHORIZATION
// PLAN != EXECUTION
// PLANNER != TOOL_EXECUTOR
// COGNITION != AUTHORIZATION
// USER_STOP > PLANNER
//
// Candidate plans are strictly UNTRUSTED DATA. MS-1.4.04 never executes tools,
// mutates AgentTask lifecycle state, issues execution tokens, or bypasses PDP/PEP.
import crypto from 'node:crypto';
import { globalAuditLedger } from '../auditLedger.js';
import { globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';
import { GOVERNED_PLANNER_VERSION, PLANNER_AUDIT_DOMAIN, PlannerAuditEventType, PlanAbortError, PlanDagCycleError, PlanUserStopError, PlanValidationError, StaleTaskPlanError, CrossTenantPlanError, } from './governedPlanningTypes.js';
import { PlanStepBuilder } from './planStepBuilder.js';
import { PlanDependencyResolver } from './planDependencyResolver.js';
import { GovernedPlanValidator } from './governedPlanValidator.js';
/**
 * Master Governed Multi-Step Action Planner.
 * Transforms untrusted cognitive output into a structured, inert, governed candidate plan.
 */
export class GovernedActionPlanner {
    taskRuntime;
    taskStore;
    auditLedger;
    sanitizer;
    externalUserStopFn;
    deterministicTimestamp;
    internalUserStop = false;
    constructor(options) {
        this.taskRuntime = options?.taskRuntime;
        this.taskStore = options?.taskStore;
        this.auditLedger = options?.auditLedger ?? globalAuditLedger;
        this.sanitizer = options?.sanitizer ?? globalDiagnosisSanitizer;
        this.deterministicTimestamp = options?.deterministicTimestamp;
        this.externalUserStopFn =
            options?.isUserStopActive ??
                (() => {
                    try {
                        return globalMasterHumanAuthority.isUserStopActive;
                    }
                    catch {
                        return false;
                    }
                });
    }
    /**
     * Sets internal USER_STOP emergency state.
     */
    setUserStop(active) {
        this.internalUserStop = active;
    }
    /**
     * Returns true if USER_STOP is currently active.
     */
    isUserStopActive() {
        if (this.internalUserStop)
            return true;
        if (this.externalUserStopFn && this.externalUserStopFn())
            return true;
        return false;
    }
    /**
     * Primary entry point: Produces an inert GovernedCandidatePlan from a GovernedPlanningRequest.
     * Executes 4 synchronous USER_STOP gates and enforces strict tenant and task-version binding.
     */
    async plan(request) {
        const startTime = Date.now();
        const timestamp = request.plannerConfig?.deterministicTimestamp ??
            this.deterministicTimestamp ??
            new Date().toISOString();
        // =========================================================================
        // GATE 1: PRE-PLANNING USER_STOP & CANCELLATION CHECK
        // =========================================================================
        this.checkCancellation(request.signal);
        if (this.isUserStopActive()) {
            this.emitAudit(PlannerAuditEventType.PLANNER_USER_STOP_ABORTED, request, {
                gate: 'GATE_1_PRE_PLANNING',
                reason: 'Planning aborted at Gate 1: USER_STOP is active',
            });
            throw new PlanUserStopError('Planning aborted at Gate 1: USER_STOP is active');
        }
        // 1. Validate incoming request schema and tenant syntax
        try {
            GovernedPlanValidator.validateRequest(request);
        }
        catch (err) {
            this.emitAudit(PlannerAuditEventType.PLANNER_VALIDATION_FAILED, request, {
                stage: 'REQUEST_VALIDATION',
                error: err instanceof Error ? err.message : String(err),
            });
            throw err;
        }
        this.emitAudit(PlannerAuditEventType.PLANNER_STARTED, request, {
            requestId: request.requestId,
            taskId: request.taskId,
            tenantId: request.tenantId,
            expectedTaskVersion: request.expectedTaskVersion,
            cognitiveModel: request.cognitiveResult.model,
        });
        // 2. Authoritative Task Version & Tenant Boundary Verification (Read-Only)
        await this.verifyTaskBoundary(request);
        // 3. Step Building: Convert cognitive output to candidate steps
        let candidateSteps;
        try {
            candidateSteps = PlanStepBuilder.buildSteps(request.cognitiveResult, request.plannerConfig);
        }
        catch (err) {
            this.emitAudit(PlannerAuditEventType.PLANNER_PLAN_REJECTED, request, {
                stage: 'STEP_BUILDING',
                error: err instanceof Error ? err.message : String(err),
            });
            throw err;
        }
        // =========================================================================
        // GATE 2: PRE-DAG / DEPENDENCY RESOLUTION USER_STOP & CANCELLATION CHECK
        // =========================================================================
        this.checkCancellation(request.signal);
        if (this.isUserStopActive()) {
            this.emitAudit(PlannerAuditEventType.PLANNER_USER_STOP_ABORTED, request, {
                gate: 'GATE_2_PRE_DAG',
                reason: 'Planning aborted at Gate 2: USER_STOP is active',
            });
            throw new PlanUserStopError('Planning aborted at Gate 2: USER_STOP is active');
        }
        // 4. DAG & Dependency Construction
        let resolvedSteps;
        let dag;
        try {
            const resolverResult = PlanDependencyResolver.resolve(candidateSteps, undefined, request.plannerConfig);
            resolvedSteps = resolverResult.steps;
            dag = resolverResult.dag;
        }
        catch (err) {
            if (err instanceof PlanDagCycleError) {
                this.emitAudit(PlannerAuditEventType.PLANNER_DAG_INVALID, request, {
                    stage: 'DAG_RESOLUTION',
                    cycleNodes: err.cycleNodes,
                    error: err.message,
                });
            }
            else {
                this.emitAudit(PlannerAuditEventType.PLANNER_PLAN_REJECTED, request, {
                    stage: 'DAG_RESOLUTION',
                    error: err instanceof Error ? err.message : String(err),
                });
            }
            throw err;
        }
        // 5. Build Risk Summary
        const riskSummary = this.calculateRiskSummary(resolvedSteps);
        const requiresApproval = riskSummary.requiresHumanApproval ||
            request.cognitiveResult.requiresApproval === true ||
            request.cognitiveResult.decision?.requiresApproval === true;
        // 6. Assemble candidate plan structure
        const planId = `plan-${request.taskId.replace(/^task-/, '')}-${String(request.expectedTaskVersion).padStart(2, '0')}`;
        const objective = this.sanitizer.sanitize(request.cognitiveResult.plan?.summary ??
            request.cognitiveResult.interpretation ??
            'Multi-step candidate plan execution proposal');
        const candidatePlanDraft = {
            planId,
            requestId: request.requestId,
            taskId: request.taskId,
            tenantId: request.tenantId,
            taskVersion: request.expectedTaskVersion,
            objective,
            assumptions: Object.freeze((request.constraints ?? []).slice(0, 10).map((c) => this.sanitizer.sanitize(c))),
            constraints: Object.freeze((request.constraints ?? []).map((c) => this.sanitizer.sanitize(c))),
            steps: resolvedSteps,
            dag,
            riskSummary,
            requiresApproval,
            isCandidatePlanOnly: true,
            isAuthorized: false,
            timestamp,
        };
        // =========================================================================
        // GATE 3: PRE-VALIDATION / FINALIZATION USER_STOP & CANCELLATION CHECK
        // =========================================================================
        this.checkCancellation(request.signal);
        if (this.isUserStopActive()) {
            this.emitAudit(PlannerAuditEventType.PLANNER_USER_STOP_ABORTED, request, {
                gate: 'GATE_3_PRE_VALIDATION',
                reason: 'Planning aborted at Gate 3: USER_STOP is active',
            });
            throw new PlanUserStopError('Planning aborted at Gate 3: USER_STOP is active');
        }
        // 7. Full Deep Validation of Draft Candidate Plan
        // Compute provisional provenance hash for validation
        const provisionalProvenance = this.computeProvenanceHash(candidatePlanDraft);
        const candidatePlan = Object.freeze({
            ...candidatePlanDraft,
            provenanceHash: provisionalProvenance,
        });
        const validation = GovernedPlanValidator.validateCandidatePlan(candidatePlan, request.plannerConfig);
        if (!validation.valid) {
            this.emitAudit(PlannerAuditEventType.PLANNER_VALIDATION_FAILED, request, {
                stage: 'PLAN_FINAL_VALIDATION',
                errors: validation.errors,
            });
            throw new PlanValidationError(`Candidate plan validation failed with ${validation.errors.length} error(s): ${validation.errors.join('; ')}`, validation.errors);
        }
        // =========================================================================
        // GATE 4: PRE-EMISSION / PROVENANCE USER_STOP & CANCELLATION CHECK
        // =========================================================================
        this.checkCancellation(request.signal);
        if (this.isUserStopActive()) {
            this.emitAudit(PlannerAuditEventType.PLANNER_USER_STOP_ABORTED, request, {
                gate: 'GATE_4_PRE_EMISSION',
                reason: 'Planning aborted at Gate 4: USER_STOP is active',
            });
            throw new PlanUserStopError('Planning aborted at Gate 4: USER_STOP is active');
        }
        // 8. Generate Final Provenance Hash
        const finalProvenance = this.computeProvenanceHash(candidatePlan);
        const finalCandidatePlan = Object.freeze({
            ...candidatePlan,
            provenanceHash: finalProvenance,
        });
        // 9. Emit Completion Audit Event
        this.emitAudit(PlannerAuditEventType.PLANNER_COMPLETED, request, {
            planId: finalCandidatePlan.planId,
            stepCount: finalCandidatePlan.steps.length,
            edgeCount: finalCandidatePlan.dag.edges.length,
            requiresApproval: finalCandidatePlan.requiresApproval,
            overallRisk: finalCandidatePlan.riskSummary.overallRisk,
            provenanceHash: finalProvenance,
            durationMs: Date.now() - startTime,
        });
        // 10. Assemble and return response
        return Object.freeze({
            requestId: request.requestId,
            taskId: request.taskId,
            tenantId: request.tenantId,
            taskVersion: request.expectedTaskVersion,
            candidatePlan: finalCandidatePlan,
            validationMetadata: Object.freeze({
                valid: true,
                validatedAt: timestamp,
                stepCount: finalCandidatePlan.steps.length,
                edgeCount: finalCandidatePlan.dag.edges.length,
                passedValidationRules: validation.passedRules,
            }),
            provenanceHash: finalProvenance,
            timestamp,
            plannerMetadata: Object.freeze({
                plannerVersion: GOVERNED_PLANNER_VERSION,
                durationMs: Date.now() - startTime,
                deterministicTimestampUsed: Boolean(request.plannerConfig?.deterministicTimestamp ?? this.deterministicTimestamp),
                cognitiveModelUsed: request.cognitiveResult.model,
            }),
            status: 'CANDIDATE_PRODUCED',
        });
    }
    /**
     * Cryptographically verifies candidate plan provenance offline.
     */
    static verifyPlanProvenance(plan) {
        if (!plan || !plan.provenanceHash)
            return false;
        const computed = GovernedActionPlanner.calculateProvenance(plan);
        return computed === plan.provenanceHash;
    }
    static calculateProvenance(plan) {
        const canonicalPayload = {
            planId: plan.planId,
            requestId: plan.requestId,
            taskId: plan.taskId,
            tenantId: plan.tenantId,
            taskVersion: plan.taskVersion,
            objective: plan.objective,
            assumptions: [...plan.assumptions].sort(),
            constraints: [...plan.constraints].sort(),
            steps: plan.steps.map((s) => ({
                stepId: s.stepId,
                sequence: s.sequence,
                actionType: s.actionType,
                intent: s.intent,
                target: s.target ?? '',
                parameters: s.parameters,
                dependencies: [...s.dependencies].sort(),
                expectedOutcome: s.expectedOutcome,
                riskLevel: s.riskLevel,
                requiresApproval: s.requiresApproval,
                capabilityId: s.capabilityId ?? '',
                status: s.status,
            })),
            dag: {
                nodes: [...plan.dag.nodes].sort(),
                edges: plan.dag.edges
                    .map((e) => ({ from: e.fromStepId, to: e.toStepId }))
                    .sort((a, b) => (a.from + a.to).localeCompare(b.from + b.to)),
                topologicalOrder: [...plan.dag.topologicalOrder],
            },
            riskSummary: {
                overallRisk: plan.riskSummary.overallRisk,
                highestStepRisk: plan.riskSummary.highestStepRisk,
                approvalRequiredStepCount: plan.riskSummary.approvalRequiredStepCount,
                requiresHumanApproval: plan.riskSummary.requiresHumanApproval,
            },
            requiresApproval: plan.requiresApproval,
            isCandidatePlanOnly: true,
            isAuthorized: false,
            timestamp: plan.timestamp,
        };
        const serialized = JSON.stringify(canonicalPayload);
        return crypto.createHash('sha256').update(serialized, 'utf8').digest('hex');
    }
    computeProvenanceHash(plan) {
        return GovernedActionPlanner.calculateProvenance(plan);
    }
    /**
     * Verifies task existence, tenant alignment, and task version freshness (read-only).
     */
    async verifyTaskBoundary(request) {
        if (!this.taskRuntime && !this.taskStore) {
            // Runtime check skipped if not injected
            return;
        }
        let task;
        try {
            if (this.taskRuntime) {
                task = await this.taskRuntime.getTask(request.tenantId, request.taskId);
            }
            else if (this.taskStore) {
                task = await this.taskStore.getTask(request.tenantId, request.taskId);
            }
        }
        catch (err) {
            this.emitAudit(PlannerAuditEventType.PLANNER_PLAN_REJECTED, request, {
                stage: 'TASK_LOOKUP',
                reason: `Task '${request.taskId}' lookup failed under tenant '${request.tenantId}': ${err instanceof Error ? err.message : String(err)}`,
            });
            throw new CrossTenantPlanError(`Task '${request.taskId}' does not exist or is not accessible under tenant '${request.tenantId}'`);
        }
        if (!task) {
            this.emitAudit(PlannerAuditEventType.PLANNER_PLAN_REJECTED, request, {
                stage: 'TASK_LOOKUP',
                reason: `Task '${request.taskId}' not found under tenant '${request.tenantId}'`,
            });
            throw new CrossTenantPlanError(`Task '${request.taskId}' does not exist or is not accessible under tenant '${request.tenantId}'`);
        }
        if (task.tenantId !== request.tenantId) {
            this.emitAudit(PlannerAuditEventType.PLANNER_PLAN_REJECTED, request, {
                stage: 'TENANT_CHECK',
                reason: `Cross-tenant planning violation: task tenant '${task.tenantId}' != request tenant '${request.tenantId}'`,
            });
            throw new CrossTenantPlanError(`Cross-tenant planning violation: task tenant '${task.tenantId}' does not match request tenant '${request.tenantId}'`);
        }
        if (task.version !== request.expectedTaskVersion) {
            this.emitAudit(PlannerAuditEventType.PLANNER_STALE_REJECTED, request, {
                stage: 'VERSION_CHECK',
                expectedVersion: request.expectedTaskVersion,
                authoritativeVersion: task.version,
            });
            throw new StaleTaskPlanError(request.expectedTaskVersion, task.version);
        }
    }
    calculateRiskSummary(steps) {
        const riskCounts = {
            LOW: 0,
            MEDIUM: 0,
            HIGH: 0,
            CRITICAL: 0,
        };
        let approvalRequiredStepCount = 0;
        let highestStepRisk = 'LOW';
        const riskOrder = {
            LOW: 0,
            MEDIUM: 1,
            HIGH: 2,
            CRITICAL: 3,
        };
        for (const step of steps) {
            riskCounts[step.riskLevel] = (riskCounts[step.riskLevel] ?? 0) + 1;
            if (step.requiresApproval) {
                approvalRequiredStepCount++;
            }
            if (riskOrder[step.riskLevel] > riskOrder[highestStepRisk]) {
                highestStepRisk = step.riskLevel;
            }
        }
        const overallRisk = highestStepRisk;
        const requiresHumanApproval = highestStepRisk === 'HIGH' ||
            highestStepRisk === 'CRITICAL' ||
            approvalRequiredStepCount > 0;
        return Object.freeze({
            overallRisk,
            highestStepRisk,
            riskCounts: Object.freeze(riskCounts),
            approvalRequiredStepCount,
            requiresHumanApproval,
        });
    }
    checkCancellation(signal) {
        if (signal?.aborted) {
            throw new PlanAbortError('Planning cancelled via AbortSignal');
        }
    }
    emitAudit(eventType, request, payload) {
        try {
            const sanitizedPayload = this.sanitizer.sanitize(payload);
            this.auditLedger.record({
                timestamp: new Date().toISOString(),
                eventType,
                action: eventType,
                domain: PLANNER_AUDIT_DOMAIN,
                toolName: 'governed_action_planner',
                classification: 'OBSERVE',
                argumentsHash: '',
                policyDecision: eventType === PlannerAuditEventType.PLANNER_COMPLETED ||
                    eventType === PlannerAuditEventType.PLANNER_STARTED
                    ? 'PERMIT'
                    : 'DENY',
                executionStatus: eventType === PlannerAuditEventType.PLANNER_COMPLETED ||
                    eventType === PlannerAuditEventType.PLANNER_STARTED
                    ? 'SUCCESS'
                    : 'BLOCKED',
                resultHash: payload.provenanceHash || '',
                actor: {
                    userId: 'system',
                    role: 'SYSTEM',
                    channel: 'GOVERNED_ACTION_PLANNER',
                },
                tenantId: request.tenantId,
                metadata: {
                    requestId: request.requestId,
                    taskId: request.taskId,
                    tenantId: request.tenantId,
                    ...sanitizedPayload,
                },
            });
        }
        catch {
            // Fail safe on audit recording to preserve main execution flow
        }
    }
}
