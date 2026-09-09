// src/core/agent-loop/agentLoopRuntime.ts
// BOWCON V4.0 — MS-1.3.36: REAL BOWCON CONTINUOUS AGENT OPERATING LOOP & CONTROLLED AUTONOMY RUNTIME
//
// Master Controlled Agent Operating Loop Runtime.
//
// Invariants:
// USER_STOP > EVERYTHING
// USER_AUTHORITY > GOVERNANCE > SUPERVISOR > BRAIN_AUTONOMY > CAPABILITY > WORLD_ACTION
// LLM_PROPOSE != EXECUTE
// CONFIDENCE != AUTHORIZATION
// EXECUTION != VERIFICATION
// FAILURE != BRAIN_DEATH
import crypto from 'node:crypto';
import { assertValidLoopTransition } from './agentLoopTransitions.js';
import { globalAgentLoopObjectiveManager } from './agentLoopObjective.js';
import { globalAgentLoopObservation } from './agentLoopObservation.js';
import { globalAgentLoopReasoning } from './agentLoopReasoning.js';
import { globalAgentLoopPlanner } from './agentLoopPlanner.js';
import { globalAgentLoopGovernance } from './agentLoopGovernance.js';
import { globalAgentLoopControl } from './agentLoopControl.js';
import { globalAgentLoopCancellation } from './agentLoopCancellation.js';
import { globalAgentLoopExecutor } from './agentLoopExecutor.js';
import { globalAgentLoopVerifier } from './agentLoopVerifier.js';
import { globalAgentLoopRecovery } from './agentLoopRecovery.js';
import { globalAgentLoopEscalation } from './agentLoopEscalation.js';
import { globalAgentLoopPersistence } from './agentLoopPersistence.js';
import { globalAgentLoopScheduler } from './agentLoopScheduler.js';
import { globalAgentLoopAudit } from './agentLoopAudit.js';
export class AgentLoopRuntime {
    _state = 'BOOTING';
    _iterationCount = 0;
    _consecutiveFailures = 0;
    _startTime = Date.now();
    _timer;
    _pendingPlan;
    get state() {
        return this._state;
    }
    get pendingPlan() {
        return this._pendingPlan;
    }
    transitionTo(nextState, context) {
        assertValidLoopTransition(this._state, nextState, context);
        this._state = nextState;
    }
    // -------------------------------------------------------------------------
    // 1. Boot & Lifecycle Initialization
    // -------------------------------------------------------------------------
    async boot() {
        this._state = 'BOOTING';
        this._startTime = Date.now();
        globalAgentLoopAudit.record('RUNTIME_RESTARTED', { bootTime: this._startTime });
        // Step 1: Self-Check
        this.transitionTo('SELF_CHECK', 'Validating subsystem baselines');
        const obs = globalAgentLoopObservation.captureObservation();
        if (obs.capabilities.unavailable === obs.capabilities.total && obs.capabilities.total > 0) {
            this.transitionTo('FAILED', 'All capabilities are unavailable.');
            throw new Error('BOOT_FAILED: All capabilities are unavailable.');
        }
        // Step 2: Ready
        this.transitionTo('READY', 'Boot completed, runtime operational.');
    }
    // -------------------------------------------------------------------------
    // 2. Single Controlled Operating Loop Iteration (tick)
    // -------------------------------------------------------------------------
    async tick(options) {
        this._iterationCount++;
        const iterationId = `iter_${Date.now()}_${this._iterationCount}`;
        const traceId = `trc_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const sessionId = 'session_agent_loop';
        // Mandatory USER_STOP Check
        if (globalAgentLoopControl.isStopped()) {
            if (this._state !== 'STOPPED' && this._state !== 'STOPPING') {
                this.transitionTo('STOPPED', 'USER_STOP active');
            }
            return {
                iterationId,
                traceId,
                sessionId,
                iterationNumber: this._iterationCount,
                state: this._state,
                authorizationState: 'NOT_REQUIRED',
                executionState: 'BLOCKED',
                startedAt: Date.now(),
                completedAt: Date.now(),
            };
        }
        // Mandatory PAUSE Check
        if (globalAgentLoopControl.isPaused()) {
            if (this._state !== 'PAUSED') {
                this.transitionTo('PAUSED', 'USER_PAUSE active');
            }
            return {
                iterationId,
                traceId,
                sessionId,
                iterationNumber: this._iterationCount,
                state: this._state,
                authorizationState: 'NOT_REQUIRED',
                executionState: 'SKIPPED',
                startedAt: Date.now(),
                completedAt: Date.now(),
            };
        }
        // A. Observation
        this.transitionTo('OBSERVING', `Iteration ${this._iterationCount}`);
        const observation = globalAgentLoopObservation.captureObservation();
        globalAgentLoopAudit.record('OBSERVATION_CREATED', { observationId: observation.observationId });
        // B. State Reconstruction & Objective Evaluation
        this.transitionTo('STATE_RECONSTRUCTION', 'Evaluating active objectives');
        const activeObjective = globalAgentLoopObjectiveManager.getActiveObjective();
        if (!activeObjective) {
            this.transitionTo('READY', 'No active objective pending');
            return {
                iterationId,
                traceId,
                sessionId,
                iterationNumber: this._iterationCount,
                state: this._state,
                observationRef: observation.observationId,
                authorizationState: 'NOT_REQUIRED',
                executionState: 'SKIPPED',
                startedAt: observation.timestamp,
                completedAt: Date.now(),
            };
        }
        // C. Reasoning
        this.transitionTo('REASONING', `Reasoning on objective ${activeObjective.objectiveId}`);
        globalAgentLoopCancellation.throwIfCancelled();
        const decision = await globalAgentLoopReasoning.reason(activeObjective, observation);
        globalAgentLoopAudit.record('REASONING_COMPLETED', {
            decisionId: decision.decisionId,
            actionRequired: decision.actionRequired,
            confidence: decision.confidence,
        });
        if (!decision.actionRequired) {
            this.transitionTo('READY', 'No action required by decision');
            return {
                iterationId,
                traceId,
                sessionId,
                objectiveId: activeObjective.objectiveId,
                iterationNumber: this._iterationCount,
                state: this._state,
                observationRef: observation.observationId,
                decisionRef: decision.decisionId,
                authorizationState: 'NOT_REQUIRED',
                executionState: 'SKIPPED',
                startedAt: observation.timestamp,
                completedAt: Date.now(),
            };
        }
        // Resource Lock Check
        if (decision.targetResource) {
            const lockAcquired = globalAgentLoopScheduler.acquireResourceLock(decision.targetResource, activeObjective.objectiveId);
            if (!lockAcquired) {
                this.transitionTo('READY', `Resource "${decision.targetResource}" is currently locked.`);
                return {
                    iterationId,
                    traceId,
                    sessionId,
                    objectiveId: activeObjective.objectiveId,
                    iterationNumber: this._iterationCount,
                    state: this._state,
                    observationRef: observation.observationId,
                    decisionRef: decision.decisionId,
                    authorizationState: 'NOT_REQUIRED',
                    executionState: 'BLOCKED',
                    startedAt: observation.timestamp,
                    completedAt: Date.now(),
                };
            }
        }
        // D. Planning
        this.transitionTo('PLANNING', `Creating plan for objective ${activeObjective.objectiveId}`);
        globalAgentLoopCancellation.throwIfCancelled();
        const plan = globalAgentLoopPlanner.plan(activeObjective, decision);
        globalAgentLoopAudit.record('PLAN_CREATED', { planId: plan.planId, stepsCount: plan.steps.length });
        // E. Governance Check
        this.transitionTo('GOVERNANCE_CHECK', 'Evaluating PDP policy');
        const govDecision = globalAgentLoopGovernance.evaluate(plan);
        globalAgentLoopAudit.record('GOVERNANCE_EVALUATED', {
            planId: plan.planId,
            allowed: govDecision.allowed,
            recoveryClass: govDecision.recoveryClass,
        });
        if (!govDecision.allowed) {
            // Critical Blocked
            this._consecutiveFailures++;
            this.transitionTo('READY', `Plan rejected by governance: ${govDecision.reason}`);
            if (decision.targetResource) {
                globalAgentLoopScheduler.releaseResourceLock(decision.targetResource, activeObjective.objectiveId);
            }
            return {
                iterationId,
                traceId,
                sessionId,
                objectiveId: activeObjective.objectiveId,
                iterationNumber: this._iterationCount,
                state: this._state,
                observationRef: observation.observationId,
                decisionRef: decision.decisionId,
                planRef: plan.planId,
                authorizationState: 'DENIED',
                executionState: 'BLOCKED',
                startedAt: observation.timestamp,
                completedAt: Date.now(),
            };
        }
        // F. Authorization Gate
        let authToken = options?.authorizationToken;
        if (govDecision.requiresHumanGate && !authToken && !options?.isDryRun) {
            this._pendingPlan = { plan, decision };
            this.transitionTo('WAITING_FOR_AUTHORIZATION', `Plan ${plan.planId} requires human gate`);
            globalAgentLoopAudit.record('AUTHORIZATION_REQUESTED', { planId: plan.planId });
            return {
                iterationId,
                traceId,
                sessionId,
                objectiveId: activeObjective.objectiveId,
                iterationNumber: this._iterationCount,
                state: this._state,
                observationRef: observation.observationId,
                decisionRef: decision.decisionId,
                planRef: plan.planId,
                authorizationState: 'PENDING',
                executionState: 'BLOCKED',
                startedAt: observation.timestamp,
                completedAt: Date.now(),
            };
        }
        if (authToken) {
            this.transitionTo('AUTHORIZED', 'Human authorization token provided');
            globalAgentLoopAudit.record('AUTHORIZATION_GRANTED', { planId: plan.planId });
        }
        else {
            this.transitionTo('AUTHORIZED', 'Auto-authorized by governance policy');
        }
        // G. Execution
        this.transitionTo('EXECUTING', `Executing plan ${plan.planId}`);
        globalAgentLoopCancellation.throwIfCancelled();
        globalAgentLoopAudit.record('ACTION_STARTED', { planId: plan.planId });
        const execStartTime = Date.now();
        const execRes = await globalAgentLoopExecutor.executePlan(plan, {
            isDryRun: options?.isDryRun,
            authorizationToken: authToken,
        });
        // H. Independent Verification
        this.transitionTo('VERIFYING', `Verifying plan ${plan.planId} outcomes`);
        const verifRes = await globalAgentLoopVerifier.verifyPlanOutcome(plan, execRes.outputs);
        // I. Evaluating Outcome & Recovery Handling
        this.transitionTo('EVALUATING', 'Evaluating verified outcomes');
        const isSuccess = execRes.success && verifRes.verified;
        if (!isSuccess) {
            this._consecutiveFailures++;
            globalAgentLoopAudit.record('ACTION_FAILED', {
                planId: plan.planId,
                error: execRes.error || verifRes.failureReason,
            });
            // Attempt bounded recovery if non-dry-run
            if (!options?.isDryRun) {
                this.transitionTo('RECOVERING', `Initiating recovery for plan ${plan.planId}`);
                const recRes = await globalAgentLoopRecovery.attemptRecovery(plan, execRes.error || verifRes.failureReason || 'Verification failure', this._consecutiveFailures);
                if (recRes.recovered) {
                    this._consecutiveFailures = 0;
                    globalAgentLoopAudit.record('RECOVERY_VERIFIED', { planId: plan.planId });
                }
                else if (this._consecutiveFailures >= plan.maxAttempts) {
                    this.transitionTo('ESCALATING', 'Recovery retries exhausted');
                    const esc = globalAgentLoopEscalation.escalate(plan, this._consecutiveFailures, recRes.reason);
                    globalAgentLoopAudit.record('ESCALATION_CREATED', {
                        escalationId: esc.escalationId,
                        planId: plan.planId,
                    });
                }
            }
        }
        else {
            this._consecutiveFailures = 0;
            globalAgentLoopAudit.record('ACTION_VERIFIED', { planId: plan.planId });
        }
        // Release resource lock
        if (decision.targetResource) {
            globalAgentLoopScheduler.releaseResourceLock(decision.targetResource, activeObjective.objectiveId);
        }
        // Save checkpoint
        globalAgentLoopPersistence.saveCheckpoint({
            state: this._state,
            objective: activeObjective,
            session: sessionId,
            iteration: this._iterationCount,
            lastObservation: observation,
            lastDecision: decision,
            lastPlan: plan,
            authorizationState: authToken ? 'GRANTED' : 'NOT_REQUIRED',
            verificationState: verifRes.verified ? 'PASSED' : 'FAILED',
            recoveryAttempts: this._consecutiveFailures,
        });
        // Loop Completion
        this._pendingPlan = undefined;
        if (this._state !== 'STOPPED' && this._state !== 'PAUSED') {
            this.transitionTo('READY', 'Iteration complete, returning to READY');
        }
        return {
            iterationId,
            traceId,
            sessionId,
            objectiveId: activeObjective.objectiveId,
            iterationNumber: this._iterationCount,
            state: this._state,
            observationRef: observation.observationId,
            decisionRef: decision.decisionId,
            planRef: plan.planId,
            authorizationState: authToken ? 'GRANTED' : 'NOT_REQUIRED',
            executionState: execRes.success ? 'EXECUTED' : 'FAILED',
            verificationState: verifRes.verified ? 'PASSED' : 'FAILED',
            outcome: {
                outcomeId: `out_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
                planId: plan.planId,
                success: isSuccess,
                verified: verifRes.verified,
                durationMs: Date.now() - execStartTime,
                error: execRes.error || verifRes.failureReason,
            },
            startedAt: observation.timestamp,
            completedAt: Date.now(),
        };
    }
    // -------------------------------------------------------------------------
    // 3. User Authority Control Plane Integration
    // -------------------------------------------------------------------------
    requestControl(params) {
        const cmd = globalAgentLoopControl.requestControl(params);
        if (params.type === 'USER_STOP') {
            this._pendingPlan = undefined;
            globalAgentLoopAudit.record('USER_STOPPED', { operatorId: params.operatorId, reason: params.payload?.reason });
            this.transitionTo('STOPPED', `USER_STOP commanded by ${params.operatorId}`);
        }
        else if (params.type === 'USER_PAUSE') {
            globalAgentLoopAudit.record('USER_PAUSED', { operatorId: params.operatorId });
            this.transitionTo('PAUSED', `USER_PAUSE commanded by ${params.operatorId}`);
        }
        else if (params.type === 'USER_RESUME') {
            globalAgentLoopAudit.record('USER_RESUMED', { operatorId: params.operatorId });
            this.transitionTo('READY', `USER_RESUME commanded by ${params.operatorId}`);
        }
        else if (params.type === 'USER_RESET') {
            globalAgentLoopAudit.record('RUNTIME_RESET', { operatorId: params.operatorId });
            this.transitionTo('READY', `RUNTIME_RESET by ${params.operatorId}`);
        }
    }
    // -------------------------------------------------------------------------
    // 4. Resume Authorization Execution
    // -------------------------------------------------------------------------
    async authorizeAndExecute(authorizationToken) {
        if (!this._pendingPlan) {
            throw new Error('NO_PENDING_PLAN: No plan is currently waiting for authorization.');
        }
        return this.tick({ authorizationToken });
    }
    // -------------------------------------------------------------------------
    // 5. Health Reporting
    // -------------------------------------------------------------------------
    getHealth() {
        const activeObj = globalAgentLoopObjectiveManager.getActiveObjective();
        return {
            state: this._state,
            isAutonomousExecutionAllowed: globalAgentLoopControl.isAutonomousExecutionAllowed(),
            isPaused: globalAgentLoopControl.isPaused(),
            isStopped: globalAgentLoopControl.isStopped(),
            activeObjectiveId: activeObj?.objectiveId,
            currentIteration: this._iterationCount,
            consecutiveFailures: this._consecutiveFailures,
            totalIterations: this._iterationCount,
            uptimeSeconds: Math.round((Date.now() - this._startTime) / 1000),
        };
    }
    // -------------------------------------------------------------------------
    // 6. Checkpoint Crash Recovery & Rehydration
    // -------------------------------------------------------------------------
    rehydrateFromCheckpoint() {
        const chk = globalAgentLoopPersistence.loadCheckpoint();
        if (!chk) {
            return { rehydrated: false, stale: false };
        }
        const isStale = globalAgentLoopPersistence.isCheckpointStale(chk);
        if (isStale) {
            return { rehydrated: false, stale: true, checkpoint: chk };
        }
        if (chk.objective) {
            globalAgentLoopObjectiveManager.createObjective({
                title: chk.objective.title,
                description: chk.objective.description,
                targetResource: chk.objective.targetResource,
                priority: chk.objective.priority,
            });
        }
        this._iterationCount = chk.iteration;
        this._consecutiveFailures = chk.recoveryAttempts;
        this._state = 'READY';
        return { rehydrated: true, stale: false, checkpoint: chk };
    }
}
export const globalAgentLoopRuntime = new AgentLoopRuntime();
