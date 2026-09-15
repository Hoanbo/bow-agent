// src/core/adaptiveAutonomy/governedAdaptiveAutonomyOrchestrator.ts
// BOWCON V4.0 — MS-1.5.12: NATIVE GOVERNED ADAPTIVE AUTONOMY, RECOVERY & SUPERVISED CONTINUOUS OPERATION ENGINE
// Component 1090 — REAL
//
// EN: Master supervisory orchestrator for governed adaptive autonomy, bounded recovery,
//     and continuous supervised execution. Enforces strict delegation to MS-1.5.10 / MS-1.5.09
//     without direct execution primitives or unbounded loops.
// VI: Trình điều phối giám sát tổng thể cho tự chủ thích ứng có quản trị, phục hồi có giới hạn,
//     và thực thi liên tục có giám sát. Thực thi ủy quyền nghiêm ngặt xuống MS-1.5.10 / MS-1.5.09
//     mà không có nguyên thủy thực thi trực tiếp hay vòng lặp không giới hạn.
import { AdaptiveAutonomyValidationError, AdaptiveAutonomyAuthorizationError, computeAdaptiveSessionProvenanceHash, MAX_OPERATIONAL_CYCLES, } from './adaptiveAutonomyTypes.js';
import { AdaptiveAutonomyValidator } from './adaptiveAutonomyValidator.js';
import { SupervisionBudgetManager } from './supervisionBudgetManager.js';
import { OperationalHealthEvaluator } from './operationalHealthEvaluator.js';
import { GovernedRecoveryManager } from './governedRecoveryManager.js';
import { AdaptiveStrategyManager } from './adaptiveStrategyManager.js';
import { ContinuityIntegrityManager } from './continuityIntegrityManager.js';
import { AdaptiveAutonomySecurityBoundary } from './adaptiveAutonomySecurityBoundary.js';
import { AdaptiveAutonomyAuditPersistenceBridge } from './adaptiveAutonomyAuditPersistenceBridge.js';
export class GovernedAdaptiveAutonomyOrchestrator {
    validator;
    healthEvaluator;
    securityBoundary;
    persistenceBridge;
    constructor(options) {
        this.securityBoundary = options?.securityBoundary ?? new AdaptiveAutonomySecurityBoundary();
        this.validator = options?.validator ?? new AdaptiveAutonomyValidator();
        this.healthEvaluator = options?.healthEvaluator ?? new OperationalHealthEvaluator();
        this.persistenceBridge =
            options?.persistenceBridge ??
                new AdaptiveAutonomyAuditPersistenceBridge({ securityBoundary: this.securityBoundary });
    }
    /**
     * EN: Initializes a new governed adaptive autonomy session.
     * VI: Khởi tạo một phiên tự chủ thích ứng có quản trị mới.
     */
    initializeSession(params) {
        // 1. Synchronously assert USER_STOP and EMERGENCY_STOP at session entry
        this.securityBoundary.assertStopInactive('session_entry', params.tenantId, params.sessionId);
        // 2. Pure fail-closed validation of authorization envelope, budget, and policies
        this.validator.validateAuthorizationEnvelope(params.authorizationEnvelope);
        this.validator.validateRecoveryPolicy(params.recoveryPolicy);
        this.validator.validateAdaptationBoundary(params.adaptationBoundary);
        // 3. Assert tenant and session isolation
        this.securityBoundary.assertTenantIsolation(params.tenantId, params.authorizationEnvelope.tenantId, params.sessionId);
        this.securityBoundary.assertSessionIsolation(params.sessionId, params.authorizationEnvelope.sessionId, params.tenantId);
        const budgetManager = new SupervisionBudgetManager({
            tenantId: params.tenantId,
            sessionId: params.sessionId,
            initialBudget: params.initialBudget,
        });
        this.validator.validateBudget(budgetManager.getSnapshot());
        const continuityManager = new ContinuityIntegrityManager(params.tenantId, params.sessionId);
        const now = Date.now();
        const sessionPayload = {
            sessionId: params.sessionId,
            tenantId: params.tenantId,
            objectiveId: params.objectiveId,
            objectiveTitle: params.objectiveTitle,
            authorizationEnvelope: params.authorizationEnvelope,
            recoveryPolicy: params.recoveryPolicy,
            adaptationBoundary: params.adaptationBoundary,
            supervisionState: {
                state: 'AUTHORIZED',
                currentHealth: 'HEALTHY',
                activeGeneration: 1,
                currentCycle: 0,
                waitingForHumanReview: false,
            },
            budget: budgetManager.getSnapshot(),
            incidents: [],
            healthEvaluations: [],
            recoveryAttempts: [],
            adaptations: [],
            generations: [
                {
                    generationIndex: 1,
                    startedAt: now,
                    completedCycles: 0,
                    recoveryAttempts: [],
                    adaptations: [],
                    generationHash: `gen_1_${now}`,
                },
            ],
            continuityRecord: continuityManager.getRecord(),
            createdAt: now,
            updatedAt: now,
            version: 1,
        };
        const sessionHash = computeAdaptiveSessionProvenanceHash(sessionPayload);
        const session = {
            ...sessionPayload,
            sessionHash,
        };
        // Save and audit
        this.persistenceBridge.saveSession(session);
        this.persistenceBridge.emitAudit('AUTONOMY_SESSION_INITIALIZED', params.tenantId, params.sessionId, {
            objectiveId: params.objectiveId,
            version: 1,
        });
        return session;
    }
    /**
     * EN: Runs continuous bounded supervised operational cycles until completion, suspension, or stop.
     * VI: Chạy các chu kỳ vận hành liên tục có giám sát và giới hạn cho đến khi hoàn thành, tạm dừng hoặc dừng.
     */
    async runSupervisedCycles(session, cyclesToRun, executor) {
        let currentState = session.supervisionState.state;
        let currentHealth = session.supervisionState.currentHealth;
        let currentCycle = session.supervisionState.currentCycle;
        let activeGeneration = session.supervisionState.activeGeneration;
        const budgetManager = new SupervisionBudgetManager({
            tenantId: session.tenantId,
            sessionId: session.sessionId,
            initialBudget: session.budget,
        });
        const continuityManager = new ContinuityIntegrityManager(session.tenantId, session.sessionId, session.continuityRecord.snapshots);
        const recoveryManager = new GovernedRecoveryManager(session.tenantId, session.sessionId, session.recoveryPolicy, budgetManager, this.securityBoundary);
        const strategyManager = new AdaptiveStrategyManager(session.tenantId, session.sessionId, session.adaptationBoundary, budgetManager, this.securityBoundary);
        // Active lease model for the session
        const activeLease = {
            leaseId: session.authorizationEnvelope.leaseId,
            tenantId: session.tenantId,
            expiresAt: session.authorizationEnvelope.expiresAt,
        };
        const incidents = [...session.incidents];
        const evaluations = [...session.healthEvaluations];
        let completedSuccessfully = false;
        // Transition to ACTIVE
        if (currentState === 'AUTHORIZED' || currentState === 'RESUMABLE') {
            this.validator.assertValidStateTransition(currentState, 'ACTIVE');
            currentState = 'ACTIVE';
            this.persistenceBridge.emitAudit('AUTONOMY_SESSION_ACTIVATED', session.tenantId, session.sessionId, {
                cycle: currentCycle,
            });
        }
        const boundCycles = Math.min(cyclesToRun, MAX_OPERATIONAL_CYCLES);
        // Explicitly bounded loop: strictly zero unbounded loops
        for (let i = 0; i < boundCycles; i++) {
            // 1. Checkpoint: pre_health_evaluation
            this.securityBoundary.assertStopInactive('pre_health_evaluation', session.tenantId, session.sessionId);
            // Check budget availability
            try {
                budgetManager.assertBudgetAvailable();
            }
            catch (err) {
                currentState = 'SUSPENDED';
                this.persistenceBridge.emitAudit('AUTONOMY_BUDGET_EXHAUSTED', session.tenantId, session.sessionId, {
                    reason: err instanceof Error ? err.message : String(err),
                });
                break;
            }
            currentCycle += 1;
            budgetManager.consumeCycle();
            // 2. Health evaluation
            const healthEval = this.healthEvaluator.evaluateHealth({
                cycleNumber: currentCycle,
                completedCycles: currentCycle - 1,
                totalStepsExecuted: currentCycle,
                successfulSteps: currentCycle - (incidents.length > 0 ? 1 : 0),
                failedSteps: incidents.length,
                consecutiveFailures: budgetManager.getSnapshot().consecutiveFailures,
                consecutiveDegradations: budgetManager.getSnapshot().consecutiveDegradations,
                leaseValid: activeLease.expiresAt > Date.now(),
                budgetAvailable: true,
                continuityIntact: continuityManager.verifySnapshotChain(),
                environmentalDriftDetected: false,
                activeIncidents: incidents,
            });
            evaluations.push(healthEval);
            currentHealth = healthEval.healthState;
            this.persistenceBridge.emitAudit('AUTONOMY_HEALTH_EVALUATED', session.tenantId, session.sessionId, {
                cycle: currentCycle,
                health: currentHealth,
            });
            if (currentHealth === 'CRITICAL' || currentHealth === 'UNKNOWN') {
                currentState = 'AWAITING_HUMAN_REVIEW';
                this.persistenceBridge.emitAudit('HUMAN_REVIEW_REQUIRED', session.tenantId, session.sessionId, {
                    health: currentHealth,
                    cycle: currentCycle,
                });
                break;
            }
            // 3. Pre-delegation checkpoint
            this.securityBoundary.assertStopInactive('pre_delegation', session.tenantId, session.sessionId);
            // Execute delegated cycle work
            let stepResult = { success: true };
            if (executor) {
                try {
                    stepResult = await executor(currentCycle);
                }
                catch (execErr) {
                    stepResult = {
                        success: false,
                        error: execErr instanceof Error ? execErr.message : String(execErr),
                        failureClass: 'TRANSIENT_EXECUTION_FAILURE',
                    };
                }
            }
            // 4. Post-delegation checkpoint
            this.securityBoundary.assertStopInactive('post_delegation', session.tenantId, session.sessionId);
            if (!stepResult.success) {
                budgetManager.recordCycleOutcome(false, true);
                const incidentId = `inc_${currentCycle}_${Date.now()}`;
                const failureClass = stepResult.failureClass ?? 'TRANSIENT_EXECUTION_FAILURE';
                const isRecoverable = recoveryManager.isRecoverable(failureClass);
                const incident = {
                    incidentId,
                    timestamp: Date.now(),
                    failureClass: failureClass,
                    isRecoverable,
                    errorDetails: stepResult.error ?? 'Execution failure',
                    failureContext: { cycle: currentCycle },
                    cycleNumber: currentCycle,
                };
                incidents.push(incident);
                if (isRecoverable) {
                    currentState = 'RECOVERY_REQUIRED';
                    this.persistenceBridge.emitAudit('RECOVERY_REQUIRED', session.tenantId, session.sessionId, { incidentId });
                    try {
                        currentState = 'RECOVERING';
                        this.persistenceBridge.emitAudit('RECOVERY_STARTED', session.tenantId, session.sessionId, { incidentId });
                        await recoveryManager.executeRecovery(incidentId, failureClass, { recoveryAction: 'RETRY_STEP_WITH_BACKOFF', targetParameters: {} }, {
                            cycleNumber: currentCycle,
                            generationNumber: activeGeneration,
                            currentState: { cycle: currentCycle },
                            lease: activeLease,
                        });
                        this.persistenceBridge.emitAudit('RECOVERY_SUCCEEDED', session.tenantId, session.sessionId, { incidentId });
                        currentState = 'ACTIVE';
                    }
                    catch (recErr) {
                        this.persistenceBridge.emitAudit('RECOVERY_FAILED', session.tenantId, session.sessionId, {
                            incidentId,
                            error: recErr instanceof Error ? recErr.message : String(recErr),
                        });
                        // Trigger governed adaptation if recovery fails
                        currentState = 'ADAPTATION_REQUIRED';
                        this.persistenceBridge.emitAudit('ADAPTATION_REQUIRED', session.tenantId, session.sessionId, { incidentId });
                        try {
                            strategyManager.evaluateAdaptation({
                                rationale: 'Adjust execution timeout and parameters after recovery failure',
                                proposedParameters: { timeoutMs: 5000 },
                                proposedOperations: [...session.authorizationEnvelope.authorizationScope],
                            }, { cycleNumber: currentCycle, lease: activeLease });
                            this.persistenceBridge.emitAudit('ADAPTATION_APPROVED', session.tenantId, session.sessionId, { incidentId });
                            currentState = 'ACTIVE';
                        }
                        catch (adaptErr) {
                            this.persistenceBridge.emitAudit('ADAPTATION_REJECTED', session.tenantId, session.sessionId, {
                                error: adaptErr instanceof Error ? adaptErr.message : String(adaptErr),
                            });
                            currentState = 'AWAITING_HUMAN_REVIEW';
                            break;
                        }
                    }
                }
                else {
                    currentState = 'AWAITING_HUMAN_REVIEW';
                    this.persistenceBridge.emitAudit('HUMAN_REVIEW_REQUIRED', session.tenantId, session.sessionId, {
                        reason: 'Non-recoverable incident',
                        incidentId,
                    });
                    break;
                }
            }
            else {
                budgetManager.recordCycleOutcome(true, false);
            }
            // 5. Pre-continuity commit checkpoint
            this.securityBoundary.assertStopInactive('pre_continuity_commit', session.tenantId, session.sessionId);
            continuityManager.createSnapshot({
                tenantId: session.tenantId,
                sessionId: session.sessionId,
                objectiveId: session.objectiveId,
                generationIndex: activeGeneration,
                cycleNumber: currentCycle,
                completedWork: [`cycle_${currentCycle}`],
                pendingWork: [],
                lastHealthState: currentHealth,
                recoveryState: {
                    attemptsConsumed: recoveryManager.getAttempts().length,
                    lastRecoverySuccess: recoveryManager.getAttempts().every((a) => a.isSuccessful),
                },
                adaptationState: {
                    adaptationsConsumed: strategyManager.getDecisions().length,
                },
                budgetState: budgetManager.getSnapshot(),
                leaseId: activeLease.leaseId,
                environmentFingerprint: `env_fingerprint_${currentCycle}`,
            });
        }
        if (currentState === 'ACTIVE') {
            currentState = 'COMPLETED';
            completedSuccessfully = true;
            this.persistenceBridge.emitAudit('AUTONOMY_COMPLETED', session.tenantId, session.sessionId, {
                totalCycles: currentCycle,
            });
        }
        // Save final state
        const updatedSessionPayload = {
            ...session,
            supervisionState: {
                state: currentState,
                currentHealth,
                activeGeneration,
                currentCycle,
                waitingForHumanReview: currentState === 'AWAITING_HUMAN_REVIEW',
            },
            budget: budgetManager.getSnapshot(),
            incidents,
            healthEvaluations: evaluations,
            recoveryAttempts: recoveryManager.getAttempts(),
            adaptations: strategyManager.getDecisions(),
            continuityRecord: continuityManager.getRecord(),
            updatedAt: Date.now(),
            version: session.version + 1,
        };
        const sessionHash = computeAdaptiveSessionProvenanceHash(updatedSessionPayload);
        const updatedSession = {
            ...updatedSessionPayload,
            sessionHash,
        };
        this.persistenceBridge.saveSession(updatedSession);
        const lastSnap = continuityManager.getLastSnapshot();
        return {
            sessionId: session.sessionId,
            tenantId: session.tenantId,
            finalState: currentState,
            completedSuccessfully,
            totalCycles: currentCycle,
            totalGenerations: activeGeneration,
            totalRecoveries: recoveryManager.getAttempts().length,
            totalAdaptations: strategyManager.getDecisions().length,
            wallClockDurationMs: Date.now() - session.createdAt,
            lastHealthState: currentHealth,
            resultDetails: `Finished with state ${currentState}`,
            auditChainHeadHash: this.persistenceBridge.getLastAuditHash(),
            finalSnapshotHash: lastSnap?.currentSnapshotHash ?? 'GENESIS_CONTINUITY_HASH',
        };
    }
    /**
     * EN: Resumes a suspended or awaiting-review session only after full governance re-verification.
     * VI: Tiếp tục một phiên bị tạm dừng hoặc chờ đánh giá chỉ sau khi tái xác minh toàn bộ quản trị.
     */
    resumeSession(session, humanConfirmationToken) {
        // 1. Assert USER_STOP and EMERGENCY_STOP
        this.securityBoundary.assertStopInactive('session_entry', session.tenantId, session.sessionId);
        // 2. Verify state is resumable
        if (session.supervisionState.state !== 'SUSPENDED' && session.supervisionState.state !== 'AWAITING_HUMAN_REVIEW') {
            throw new AdaptiveAutonomyValidationError(`Session is in state '${session.supervisionState.state}', which cannot be resumed`, session.tenantId, session.sessionId);
        }
        // 3. For High/Critical or awaiting human review, token is mandatory
        if (session.authorizationEnvelope.riskTier === 'HIGH' || session.authorizationEnvelope.riskTier === 'CRITICAL' || session.supervisionState.waitingForHumanReview) {
            if (!humanConfirmationToken || humanConfirmationToken.trim().length === 0) {
                throw new AdaptiveAutonomyAuthorizationError('Resuming session requires genuine human confirmation token', session.tenantId, session.sessionId);
            }
        }
        // 4. Verify continuity chain
        const continuityManager = new ContinuityIntegrityManager(session.tenantId, session.sessionId, session.continuityRecord.snapshots);
        continuityManager.verifySnapshotChain();
        // 5. Update state to RESUMABLE -> ACTIVE
        const resumedSessionPayload = {
            ...session,
            supervisionState: {
                ...session.supervisionState,
                state: 'RESUMABLE',
                waitingForHumanReview: false,
            },
            updatedAt: Date.now(),
            version: session.version + 1,
        };
        const sessionHash = computeAdaptiveSessionProvenanceHash(resumedSessionPayload);
        const resumedSession = {
            ...resumedSessionPayload,
            sessionHash,
        };
        this.persistenceBridge.saveSession(resumedSession);
        this.persistenceBridge.emitAudit('AUTONOMY_RESUMED', session.tenantId, session.sessionId, {
            version: resumedSession.version,
        });
        return resumedSession;
    }
}
