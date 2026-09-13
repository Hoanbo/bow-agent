// src/core/agentLoopFacade/productionAgentLoopFacade.ts
// BOWCON V4.0 — MS-1.4.10: PRODUCTION AGENT LOOP FAÇADE
//
// EN:
// Master public façade orchestrating end-to-end governed task execution cycles.
// Connects TaskLifecycle, ContextAssembly, CognitiveRuntime, GovernedPlanning,
// ActionProposal, PDP/PEP, ProductionToolAdapter, RealityVerification, DurableCommit,
// and EpisodicMemory into a controlled, bounded, deeply auditable agent loop.
// Enforces:
//   COGNITION != AUTHORIZATION, PLAN != EXECUTION, LLM_OUTPUT != AUTHORITY,
//   PROPOSAL != AUTHORIZATION, AUTHORIZATION != EXECUTION, PEP != TOOL,
//   TOOL_OUTPUT != REALITY_PROOF, REALITY_VERIFICATION != DURABLE_COMMIT,
//   DURABLE_COMMIT != MEMORY_SYNTHESIS, MEMORY != AUTHORITY,
//   USER_STOP > ALL_AGENT_ACTIVITY.
//
// VI:
// Mặt tiền công khai chính điều phối toàn bộ chu trình thực thi tác vụ có quản trị.
// Kết hợp các phân hệ vòng đời tác vụ, lắp ráp ngữ cảnh, nhận thức, lập kế hoạch,
// đề xuất hành động, PDP/PEP, adapter công cụ, xác minh thực tế, commit bền vững
// và bộ nhớ episodic thành một chu trình kiểm soát chặt chẽ, có giới hạn và bất biến sâu.
import crypto from 'node:crypto';
import { globalAuditLedger } from '../auditLedger.js';
import { globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import { AGENT_LOOP_FACADE_AUDIT_DOMAIN, AgentLoopAbortedError, AgentLoopValidationError, AgentLoopSecurityViolationError, AgentLoopConcurrencyError, AgentLoopBudgetExceededError, AgentLoopAuthorizationError, AgentLoopExecutionError, } from './agentLoopFacadeTypes.js';
import { globalAgentLoopExecutionGate, } from './agentLoopExecutionGate.js';
import { AgentLoopStateCoordinator } from './agentLoopStateCoordinator.js';
import { AgentLoopRetryGovernor } from './agentLoopRetryGovernor.js';
import { AgentLoopSubsystemComposer } from './agentLoopSubsystemComposer.js';
export class ProductionAgentLoopFacade {
    composer;
    gate;
    auditLedger;
    sanitizer;
    constructor(options) {
        this.composer = options?.composer ?? new AgentLoopSubsystemComposer();
        this.gate = options?.gate ?? globalAgentLoopExecutionGate;
        this.auditLedger = options?.auditLedger ?? globalAuditLedger;
        this.sanitizer = options?.sanitizer ?? globalDiagnosisSanitizer;
    }
    /**
     * EN: Recursively deep-freezes an object to guarantee absolute immutability.
     */
    deepFreeze(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        for (const key of Object.getOwnPropertyNames(obj)) {
            const val = obj[key];
            if (val !== null && typeof val === 'object' && !Object.isFrozen(val)) {
                this.deepFreeze(val);
            }
            else if (val !== null && typeof val === 'object' && Array.isArray(val)) {
                for (const item of val) {
                    if (item !== null && typeof item === 'object' && !Object.isFrozen(item)) {
                        this.deepFreeze(item);
                    }
                }
            }
        }
        return Object.freeze(obj);
    }
    /**
     * EN: Produces a canonical JSON string with deterministically sorted keys.
     */
    canonicalJSON(obj) {
        if (obj === null || typeof obj !== 'object') {
            return JSON.stringify(obj);
        }
        if (Array.isArray(obj)) {
            return '[' + obj.map((x) => this.canonicalJSON(x)).join(',') + ']';
        }
        const keys = Object.keys(obj).sort();
        const pairs = keys.map((k) => JSON.stringify(k) + ':' + this.canonicalJSON(obj[k]));
        return '{' + pairs.join(',') + '}';
    }
    /**
     * EN: Validates the structural and security envelope of the loop request.
     */
    validateRequest(request) {
        if (!request || typeof request !== 'object') {
            throw new AgentLoopValidationError('AgentLoopRequest must be a non-null object');
        }
        const req = request;
        if (!req.taskId || typeof req.taskId !== 'string' || !req.taskId.trim()) {
            throw new AgentLoopValidationError('AgentLoopRequest must specify a non-empty taskId');
        }
        if (!req.tenantId || typeof req.tenantId !== 'string' || !req.tenantId.trim()) {
            throw new AgentLoopValidationError('AgentLoopRequest must specify a non-empty tenantId');
        }
        if (typeof req.expectedTaskVersion !== 'number' || req.expectedTaskVersion < 0 || !Number.isInteger(req.expectedTaskVersion)) {
            throw new AgentLoopValidationError('AgentLoopRequest must specify a non-negative integer expectedTaskVersion');
        }
        if (req.maxIterations !== undefined) {
            if (typeof req.maxIterations !== 'number' || req.maxIterations <= 0 || req.maxIterations > 20) {
                throw new AgentLoopBudgetExceededError(`maxIterations must be an integer between 1 and 20 (received: ${req.maxIterations})`);
            }
        }
        if (req.maxStepAttempts !== undefined) {
            if (typeof req.maxStepAttempts !== 'number' || req.maxStepAttempts <= 0 || req.maxStepAttempts > 3) {
                throw new AgentLoopBudgetExceededError(`maxStepAttempts must be an integer between 1 and 3 (received: ${req.maxStepAttempts})`);
            }
        }
        if (req.timeoutMs !== undefined) {
            if (typeof req.timeoutMs !== 'number' || req.timeoutMs <= 0 || req.timeoutMs > 300000) {
                throw new AgentLoopBudgetExceededError(`timeoutMs must be an integer between 1 and 300000 (received: ${req.timeoutMs})`);
            }
        }
        // Security path traversal / forbidden characters
        const forbidden = ['..', '/', '\\', '\0', 'shopofbow'];
        for (const token of forbidden) {
            if (req.taskId.includes(token)) {
                throw new AgentLoopSecurityViolationError(`Security violation: taskId contains forbidden sequence '${token}'`);
            }
            if (req.tenantId.includes(token)) {
                throw new AgentLoopSecurityViolationError(`Security violation: tenantId contains forbidden sequence '${token}'`);
            }
        }
        // Prototype pollution
        const keys = Object.keys(req);
        for (const k of keys) {
            if (k === '__proto__' || k === 'constructor' || k === 'prototype') {
                throw new AgentLoopSecurityViolationError(`Security violation: forbidden property '${k}' in request`);
            }
        }
    }
    /**
     * EN: Records structured audit event in globalAuditLedger.
     */
    recordAudit(eventType, tenantId, metadata) {
        const sanitizedMetadata = this.sanitizer.sanitize(metadata);
        const nowIso = new Date().toISOString();
        this.auditLedger.record({
            timestamp: nowIso,
            eventType,
            domain: AGENT_LOOP_FACADE_AUDIT_DOMAIN,
            toolName: 'production_agent_loop_facade',
            classification: eventType.includes('ABORTED')
                ? 'INTERRUPT'
                : eventType.includes('FAILED') || eventType.includes('REJECTED') || eventType.includes('CONFLICT')
                    ? 'SECURITY'
                    : 'OBSERVE',
            policyDecision: eventType.includes('COMPLETED') || eventType.includes('STARTED') || eventType.includes('EXECUTED') || eventType.includes('VERIFIED') || eventType.includes('COMMITTED')
                ? 'PERMIT'
                : 'DENY',
            executionStatus: eventType.includes('COMPLETED') || eventType.includes('STARTED') || eventType.includes('EXECUTED') || eventType.includes('VERIFIED') || eventType.includes('COMMITTED')
                ? 'SUCCESS'
                : 'FAILURE',
            resultHash: metadata.provenanceHash ?? '',
            actor: {
                userId: 'production_agent_loop_facade',
                role: 'SYSTEM',
                channel: 'AGENT_LOOP',
            },
            tenantId,
            metadata: sanitizedMetadata,
        });
    }
    /**
     * EN: Primary execution entrypoint alias: runs a governed, bounded agent execution cycle.
     */
    async executeLoop(request) {
        return this.runLoop(request);
    }
    /**
     * EN: Primary execution entrypoint: runs a governed, bounded agent execution cycle.
     */
    async runLoop(request) {
        const startTimeMs = Date.now();
        const startedAt = new Date().toISOString();
        // 1. Envelope and Security Validation
        this.validateRequest(request);
        const coordinator = new AgentLoopStateCoordinator();
        const retryGovernor = new AgentLoopRetryGovernor({
            maxIterations: request.maxIterations,
            maxExecutionTimeMs: request.timeoutMs,
        });
        retryGovernor.start();
        const gateContext = {
            taskId: request.taskId,
            tenantId: request.tenantId,
        };
        const stepExecutions = [];
        const completedStepIds = [];
        let finalState = 'IDLE';
        let outcomeStatus = 'FAILED';
        let failureReason = undefined;
        let pendingApprovalStepId = undefined;
        try {
            // 2. Gate 1: Loop Entry
            this.gate.assertGate1_LoopEntry(gateContext);
            // 3. Retrieve authoritative task & validate tenant isolation
            const task = this.composer.getTask(request.tenantId, request.taskId);
            if (task.tenantId !== request.tenantId) {
                throw new AgentLoopSecurityViolationError(`Tenant isolation mismatch: request tenant '${request.tenantId}' does not match task tenant '${task.tenantId}'`);
            }
            if (task.taskId !== request.taskId) {
                throw new AgentLoopSecurityViolationError(`Task binding mismatch: request task '${request.taskId}' does not match retrieved task '${task.taskId}'`);
            }
            // Concurrency check
            const expectedTaskVersion = request.expectedTaskVersion ?? task.version;
            coordinator.verifyTaskVersion(task, expectedTaskVersion);
            coordinator.transitionTo('TASK_ACCEPTED', 'Task retrieved and validated');
            this.recordAudit('AGENT_LOOP_STARTED', request.tenantId, {
                taskId: request.taskId,
                tenantId: request.tenantId,
                taskVersion: task.version,
                expectedTaskVersion,
            });
            let iteration = 0;
            let hasMoreSteps = true;
            // 4. Bounded Loop Execution
            while (hasMoreSteps) {
                iteration = retryGovernor.advanceIteration();
                const iterContext = { ...gateContext, iteration };
                // Checkpoint 2: Before Context Assembly
                this.gate.assertGate2_PreContext(iterContext);
                coordinator.transitionTo('CONTEXT_ASSEMBLED', `Iteration ${iteration} context assembled`);
                // Stage 2: Assemble Context
                const assembledContext = await this.composer.assembleContext({
                    task,
                    userPrompt: request.prompt,
                });
                // Checkpoint 3: Before Cognitive Inference
                this.gate.assertGate3_PreCognition(iterContext);
                coordinator.transitionTo('COGNITION_COMPLETED', `Iteration ${iteration} cognition finished`);
                // Stage 3: Cognitive Inference
                const cognitiveResponse = await this.composer.executeCognition({
                    task,
                    context: assembledContext,
                    prompt: request.prompt,
                });
                // Checkpoint 4: Before Plan Formulation
                this.gate.assertGate4_PrePlanning(iterContext);
                coordinator.transitionTo('PLAN_FORMULATED', `Iteration ${iteration} plan formulated`);
                // Stage 4: Formulate Governed Candidate Plan
                const candidatePlan = await this.composer.formulatePlan({
                    task,
                    cognitiveOutput: cognitiveResponse,
                });
                // Find candidate step that is not yet completed
                const candidateStep = candidatePlan.steps.find((s) => !completedStepIds.includes(s.stepId));
                if (!candidateStep) {
                    // All planned steps completed
                    hasMoreSteps = false;
                    break;
                }
                const stepContext = { ...iterContext, stepId: candidateStep.stepId };
                const stepStartTime = Date.now();
                coordinator.transitionTo('ACTION_PROPOSED', `Candidate step ${candidateStep.stepId} proposed`);
                // Checkpoint 5: Before PDP Proposal Evaluation
                this.gate.assertGate5_PreAuthorization(stepContext);
                // Stage 5: Evaluate PDP & PEP
                let handoff;
                try {
                    const proposalOutcome = await this.composer.processActionProposal({
                        candidatePlan,
                        stepId: candidateStep.stepId,
                        completedStepIds,
                        executionToken: request.executionToken,
                        task,
                    });
                    if ('action' in proposalOutcome && proposalOutcome.action === 'REQUIRE_HUMAN_APPROVAL') {
                        coordinator.transitionTo('AWAITING_HUMAN_APPROVAL', `Step ${candidateStep.stepId} requires human signature`);
                        pendingApprovalStepId = candidateStep.stepId;
                        outcomeStatus = 'AWAITING_APPROVAL';
                        this.recordAudit('AGENT_LOOP_APPROVAL_DEMANDED', request.tenantId, {
                            taskId: request.taskId,
                            tenantId: request.tenantId,
                            stepId: candidateStep.stepId,
                            actionName: candidateStep.actionType,
                        });
                        stepExecutions.push({
                            stepId: candidateStep.stepId,
                            stepIndex: candidateStep.sequence,
                            actionName: candidateStep.actionType,
                            status: 'AWAITING_APPROVAL',
                            durationMs: Date.now() - stepStartTime,
                            failureReason: 'Human approval required',
                        });
                        hasMoreSteps = false;
                        break;
                    }
                    handoff = proposalOutcome;
                    retryGovernor.resetDenials();
                    coordinator.transitionTo('AUTHORIZATION_EVALUATED', `Step ${candidateStep.stepId} authorized by PDP/PEP`);
                    this.recordAudit('AGENT_LOOP_STEP_DISPATCHED', request.tenantId, {
                        taskId: request.taskId,
                        tenantId: request.tenantId,
                        stepId: candidateStep.stepId,
                        actionName: candidateStep.actionType,
                        proposalId: handoff.proposalId,
                    });
                }
                catch (authErr) {
                    if (authErr.name === 'ProposalApprovalRequiredError' || authErr.code === 'PROPOSAL_APPROVAL_REQUIRED') {
                        coordinator.transitionTo('AWAITING_HUMAN_APPROVAL', `Step ${candidateStep.stepId} requires human signature`);
                        pendingApprovalStepId = candidateStep.stepId;
                        outcomeStatus = 'AWAITING_APPROVAL';
                        this.recordAudit('AGENT_LOOP_APPROVAL_DEMANDED', request.tenantId, {
                            taskId: request.taskId,
                            tenantId: request.tenantId,
                            stepId: candidateStep.stepId,
                            actionName: candidateStep.actionType,
                        });
                        stepExecutions.push({
                            stepId: candidateStep.stepId,
                            stepIndex: candidateStep.sequence,
                            actionName: candidateStep.actionType,
                            status: 'AWAITING_APPROVAL',
                            durationMs: Date.now() - stepStartTime,
                            failureReason: 'Human approval required',
                        });
                        hasMoreSteps = false;
                        break;
                    }
                    if (authErr.name === 'ProposalDeniedError' || authErr.code === 'PROPOSAL_DENIED' || authErr.message?.includes('denied')) {
                        retryGovernor.recordDenial(candidateStep.stepId);
                        this.recordAudit('AGENT_LOOP_FAILED', request.tenantId, {
                            taskId: request.taskId,
                            tenantId: request.tenantId,
                            stepId: candidateStep.stepId,
                            actionName: candidateStep.actionType,
                            reason: authErr.message,
                        });
                        stepExecutions.push({
                            stepId: candidateStep.stepId,
                            stepIndex: candidateStep.sequence,
                            actionName: candidateStep.actionType,
                            status: 'DENIED',
                            durationMs: Date.now() - stepStartTime,
                            failureReason: authErr.message,
                        });
                        throw new AgentLoopAuthorizationError(`Action step '${candidateStep.stepId}' was DENIED: ${authErr.message}`);
                    }
                    throw authErr;
                }
                // Checkpoint 6: Before Tool Execution
                this.gate.assertGate6_PreToolExecution(stepContext);
                coordinator.transitionTo('TOOL_EXECUTING', `Executing tool for step ${candidateStep.stepId}`);
                // Stage 6: Tool Execution via ToolAdapter
                retryGovernor.recordStepAttempt(candidateStep.stepId);
                const toolResult = await this.composer.executeTool({
                    handoff,
                    authoritativeTask: task,
                    timeoutMs: request.timeoutMs,
                });
                if (toolResult.status !== 'SUCCESS') {
                    stepExecutions.push({
                        stepId: candidateStep.stepId,
                        stepIndex: candidateStep.sequence,
                        actionName: candidateStep.actionType,
                        proposalId: handoff.proposalId,
                        executionId: toolResult.executionId,
                        status: 'FAILED',
                        durationMs: Date.now() - stepStartTime,
                        failureReason: `Tool execution returned status: ${toolResult.status}`,
                    });
                    throw new AgentLoopExecutionError(`Tool execution failed with status '${toolResult.status}'`);
                }
                this.recordAudit('AGENT_LOOP_STEP_EXECUTED', request.tenantId, {
                    taskId: request.taskId,
                    tenantId: request.tenantId,
                    stepId: candidateStep.stepId,
                    executionId: toolResult.executionId,
                    durationMs: toolResult.executionDurationMs,
                });
                // Checkpoint 7: Before Reality Verification
                this.gate.assertGate7_PreRealityVerification(stepContext);
                coordinator.transitionTo('REALITY_VERIFYING', `Verifying reality for step ${candidateStep.stepId}`);
                // Stage 7: Reality Verification
                const verificationResult = await this.composer.verifyReality({
                    executionResult: toolResult,
                    authoritativeTask: task,
                    expectedTaskVersion: task.version,
                });
                if (verificationResult.status !== 'VERIFIED' || !verificationResult.summary.allRequiredPassed) {
                    stepExecutions.push({
                        stepId: candidateStep.stepId,
                        stepIndex: candidateStep.sequence,
                        actionName: candidateStep.actionType,
                        proposalId: handoff.proposalId,
                        executionId: toolResult.executionId,
                        verificationId: verificationResult.verificationId,
                        status: 'FAILED',
                        durationMs: Date.now() - stepStartTime,
                        failureReason: `Reality verification failed with status: ${verificationResult.status}`,
                    });
                    throw new AgentLoopExecutionError(`Reality verification failed with status '${verificationResult.status}'`);
                }
                this.recordAudit('AGENT_LOOP_VERIFIED', request.tenantId, {
                    taskId: request.taskId,
                    tenantId: request.tenantId,
                    stepId: candidateStep.stepId,
                    executionId: toolResult.executionId,
                    verificationId: verificationResult.verificationId,
                    confidence: verificationResult.confidence,
                });
                // Checkpoint 8: Before Durable Commit
                this.gate.assertGate8_PreDurableCommit(stepContext);
                coordinator.transitionTo('DURABLE_COMMITTING', `Committing durable state for step ${candidateStep.stepId}`);
                // Stage 8: Durable Commit
                const commitResult = await this.composer.commitDurable({
                    verificationResult,
                    authoritativeTask: task,
                    expectedTaskVersion: task.version,
                });
                this.recordAudit('AGENT_LOOP_COMMITTED', request.tenantId, {
                    taskId: request.taskId,
                    tenantId: request.tenantId,
                    stepId: candidateStep.stepId,
                    commitId: commitResult.commitId,
                });
                // Checkpoint 9: Before Episodic Memory Ingestion
                this.gate.assertGate9_PreEpisodicMemory(stepContext);
                coordinator.transitionTo('MEMORY_SYNTHESIZING', `Synthesizing memory for step ${candidateStep.stepId}`);
                // Stage 9: Episodic Memory Ingestion & Synthesis
                let memoryResult;
                try {
                    memoryResult = await this.composer.recordEpisodicMemory({
                        commitRecord: commitResult.record,
                        authoritativeTask: task,
                        expectedTaskVersion: task.version,
                    });
                }
                catch (memErr) {
                    // If duplicate memory, handle without failing task execution
                    if (!memErr.name?.includes('Duplicate') && !memErr.message?.includes('Replay')) {
                        throw memErr;
                    }
                }
                completedStepIds.push(candidateStep.stepId);
                stepExecutions.push({
                    stepId: candidateStep.stepId,
                    stepIndex: candidateStep.sequence,
                    actionName: candidateStep.actionType,
                    proposalId: handoff.proposalId,
                    executionId: toolResult.executionId,
                    verificationId: verificationResult.verificationId,
                    commitId: commitResult.commitId,
                    memoryId: memoryResult?.memoryId,
                    status: 'SUCCESS',
                    durationMs: Date.now() - stepStartTime,
                });
                this.recordAudit('AGENT_LOOP_STEP_COMPLETED', request.tenantId, {
                    taskId: request.taskId,
                    tenantId: request.tenantId,
                    stepId: candidateStep.stepId,
                    durationMs: Date.now() - stepStartTime,
                });
                // Checkpoint 10: Before Next Iteration
                this.gate.assertGate10_PreNextIteration(stepContext);
                coordinator.transitionTo('CYCLE_EVALUATION', `Iteration ${iteration} evaluation`);
                this.recordAudit('AGENT_LOOP_ITERATION_COMPLETED', request.tenantId, {
                    taskId: request.taskId,
                    tenantId: request.tenantId,
                    iteration,
                    completedStepsCount: completedStepIds.length,
                });
                // Check if more steps remain in the candidate plan
                const remaining = candidatePlan.steps.filter((s) => !completedStepIds.includes(s.stepId));
                if (remaining.length === 0) {
                    hasMoreSteps = false;
                }
            }
            if (outcomeStatus !== 'AWAITING_APPROVAL') {
                coordinator.transitionTo('COMPLETED', 'All candidate steps executed and verified');
                outcomeStatus = 'COMPLETED';
                finalState = 'COMPLETED';
                this.recordAudit('AGENT_LOOP_TASK_COMPLETED', request.tenantId, {
                    taskId: request.taskId,
                    tenantId: request.tenantId,
                    totalSteps: stepExecutions.length,
                    totalDurationMs: Date.now() - startTimeMs,
                });
            }
            else {
                finalState = coordinator.getCurrentState();
            }
        }
        catch (err) {
            failureReason = err.message || 'Unknown error occurred in agent loop';
            if (err instanceof AgentLoopAbortedError) {
                outcomeStatus = 'USER_STOP_ABORTED';
                finalState = 'USER_STOP_ABORTED';
                this.recordAudit('AGENT_LOOP_USER_STOP_ABORTED', request.tenantId, {
                    taskId: request.taskId,
                    tenantId: request.tenantId,
                    reason: failureReason,
                });
            }
            else if (err instanceof AgentLoopSecurityViolationError || err instanceof AgentLoopAuthorizationError) {
                outcomeStatus = 'SECURITY_REJECTED';
                finalState = 'SECURITY_REJECTED';
                this.recordAudit('AGENT_LOOP_SECURITY_REJECTED', request.tenantId, {
                    taskId: request.taskId,
                    tenantId: request.tenantId,
                    reason: failureReason,
                });
            }
            else if (err instanceof AgentLoopConcurrencyError) {
                outcomeStatus = 'CONCURRENCY_ABORTED';
                finalState = 'STALE_TASK_CONCURRENCY_ABORT';
                this.recordAudit('AGENT_LOOP_CONCURRENCY_CONFLICT', request.tenantId, {
                    taskId: request.taskId,
                    tenantId: request.tenantId,
                    reason: failureReason,
                });
            }
            else if (err instanceof AgentLoopBudgetExceededError) {
                outcomeStatus = 'BUDGET_EXCEEDED';
                finalState = 'CYCLE_BUDGET_EXCEEDED';
                this.recordAudit('AGENT_LOOP_FAILED', request.tenantId, {
                    taskId: request.taskId,
                    tenantId: request.tenantId,
                    reason: failureReason,
                });
            }
            else {
                outcomeStatus = 'FAILED';
                finalState = 'FAILED';
                this.recordAudit('AGENT_LOOP_FAILED', request.tenantId, {
                    taskId: request.taskId,
                    tenantId: request.tenantId,
                    reason: failureReason,
                });
            }
            // Re-throw if error was a validation or security error prior to task acceptance
            if (coordinator.getCurrentState() === 'IDLE') {
                throw err;
            }
        }
        const completedAt = new Date().toISOString();
        const totalDurationMs = Date.now() - startTimeMs;
        // Cryptographic provenance calculation
        const rawProvenance = [
            request.taskId,
            request.tenantId,
            outcomeStatus,
            finalState,
            String(retryGovernor.getIteration()),
            this.canonicalJSON(stepExecutions),
            startedAt,
            completedAt,
        ].join(':');
        const loopProvenanceHash = crypto.createHash('sha256').update(rawProvenance, 'utf8').digest('hex');
        const result = {
            taskId: request.taskId,
            tenantId: request.tenantId,
            status: outcomeStatus,
            finalState,
            iterationsExecuted: retryGovernor.getIteration(),
            stepExecutions: Object.freeze(stepExecutions),
            startedAt,
            completedAt,
            totalDurationMs,
            loopProvenanceHash,
            failureReason,
            pendingApprovalStepId,
        };
        return this.deepFreeze(result);
    }
}
export const globalProductionAgentLoopFacade = new ProductionAgentLoopFacade();
