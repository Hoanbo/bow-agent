// src/core/missionCoordination/governedMissionCoordinator.ts
// BOWCON V4.0 — MS-1.5.13: NATIVE GOVERNED MISSION COORDINATION, MULTI-OBJECTIVE PRIORITIZATION & SUPERVISED CONTINUATION ENGINE
// Component 1100 — REAL
//
// EN: Master governed mission coordinator.
//     Coordinates multi-objective dependency DAGs, deterministic priority scheduling,
//     conflict detection, and bounded execution delegation through MS-1.5.12 without direct execution primitives.
// VI: Trình điều phối sứ mệnh có quản trị tổng thể.
//     Điều phối các DAG phụ thuộc đa mục tiêu, lập lịch ưu tiên xác định,
//     phát hiện xung đột và ủy quyền thực thi có giới hạn qua MS-1.5.12 mà không có nguyên thủy thực thi trực tiếp.
import { MissionCoordinationValidationError, MissionCoordinationAuthorizationError, computeMissionProvenanceHash, MAX_OBJECTIVES_PER_MISSION, MAX_ACTIVE_OBJECTIVE_SESSIONS, MAX_COORDINATION_CYCLES, MAX_REASSESSMENTS, MAX_MISSION_DURATION_MS, MAX_CONSECUTIVE_MISSION_FAILURES, } from './missionCoordinationTypes.js';
import { MissionCoordinationValidator } from './missionCoordinationValidator.js';
import { MissionObjectiveScheduler } from './missionObjectiveScheduler.js';
import { MissionPriorityEngine } from './missionPriorityEngine.js';
import { MissionConflictResolver } from './missionConflictResolver.js';
import { MissionContinuityManager } from './missionContinuityManager.js';
import { MissionGovernanceSecurityBoundary } from './missionGovernanceSecurityBoundary.js';
import { MissionAuditPersistenceBridge } from './missionAuditPersistenceBridge.js';
export class GovernedMissionCoordinator {
    validator;
    securityBoundary;
    persistenceBridge;
    priorityEngine;
    conflictResolver;
    constructor(options) {
        this.securityBoundary = options?.securityBoundary ?? new MissionGovernanceSecurityBoundary();
        this.validator = options?.validator ?? new MissionCoordinationValidator();
        this.persistenceBridge =
            options?.persistenceBridge ??
                new MissionAuditPersistenceBridge({ securityBoundary: this.securityBoundary });
        this.priorityEngine = options?.priorityEngine ?? new MissionPriorityEngine();
        this.conflictResolver = options?.conflictResolver ?? new MissionConflictResolver();
    }
    /**
     * EN: Initializes and persists a new governed mission container with pre-authorized objectives.
     * VI: Khởi tạo và lưu trữ vùng chứa sứ mệnh có quản trị mới với các mục tiêu đã được ủy quyền trước.
     */
    initializeMission(params) {
        // 1. Checkpoint: MISSION_ENTRY
        this.securityBoundary.assertStopInactive('MISSION_ENTRY', params.tenantId, params.missionId);
        // 2. Checkpoint: PRE_MISSION_VALIDATION
        this.securityBoundary.assertStopInactive('PRE_MISSION_VALIDATION', params.tenantId, params.missionId);
        // Validate mission authorization envelope
        this.validator.validateAuthorizationEnvelope(params.authorizationEnvelope);
        // Assert tenant & session isolation
        this.securityBoundary.assertTenantIsolation(params.tenantId, params.authorizationEnvelope.tenantId, params.missionId);
        this.securityBoundary.assertSessionIsolation(params.sessionId, params.authorizationEnvelope.sessionId, params.tenantId, params.missionId);
        if (params.objectives.length === 0) {
            throw new MissionCoordinationValidationError('Mission must contain at least one objective');
        }
        if (params.objectives.length > MAX_OBJECTIVES_PER_MISSION) {
            throw new MissionCoordinationValidationError(`Objective count (${params.objectives.length}) exceeds ceiling of ${MAX_OBJECTIVES_PER_MISSION}`);
        }
        const scheduler = new MissionObjectiveScheduler();
        const objectivesMap = {};
        for (const obj of params.objectives) {
            // Validate objective tenant & session isolation
            this.securityBoundary.assertTenantIsolation(obj.tenantId, params.tenantId, params.missionId);
            this.securityBoundary.assertSessionIsolation(obj.sessionId, params.sessionId, params.tenantId, params.missionId);
            // Validate scope bound
            this.securityBoundary.assertScopeBound(obj.authorizationScope, params.authorizationEnvelope.authorizationScope, params.tenantId, params.missionId);
            // Validate lease
            this.securityBoundary.assertLeaseValidity({ leaseId: obj.leaseId, tenantId: obj.tenantId, sessionId: obj.sessionId, expiresAt: params.authorizationEnvelope.expiresAt }, params.tenantId, params.sessionId, params.missionId);
            scheduler.registerObjective(obj);
            objectivesMap[obj.objectiveId] = obj;
        }
        const dependencyGraph = scheduler.getDependencyGraph();
        this.validator.validateDependencyGraph(dependencyGraph);
        const now = Date.now();
        const initialBudget = {
            maxObjectives: MAX_OBJECTIVES_PER_MISSION,
            objectivesRegistered: params.objectives.length,
            maxActiveObjectiveSessions: MAX_ACTIVE_OBJECTIVE_SESSIONS,
            activeObjectiveSessions: 0,
            maxCoordinationCycles: MAX_COORDINATION_CYCLES,
            coordinationCyclesConsumed: 0,
            maxReassessments: MAX_REASSESSMENTS,
            reassessmentsConsumed: 0,
            missionDurationLimitMs: MAX_MISSION_DURATION_MS,
            missionStartedAt: now,
            consecutiveFailures: 0,
        };
        this.validator.validateBudget(initialBudget);
        const continuity = new MissionContinuityManager(params.missionId, params.tenantId, params.sessionId);
        const initialSnapshot = continuity.createSnapshot({
            coordinationCycle: 0,
            missionState: 'AUTHORIZED',
            completedObjectiveIds: [],
            activeObjectiveIds: [],
            pendingObjectiveIds: params.objectives.map((o) => o.objectiveId),
            blockedObjectiveIds: [],
            priorityOrder: params.objectives.map((o) => o.objectiveId),
            activeConflicts: [],
            budgetState: initialBudget,
            environmentFingerprint: `env_${params.missionId}_init`,
        });
        const priorityPolicy = {
            basePriorityWeight: params.priorityPolicy?.basePriorityWeight ?? 10.0,
            dependencyReadinessWeight: params.priorityPolicy?.dependencyReadinessWeight ?? 5.0,
            urgencyWeight: params.priorityPolicy?.urgencyWeight ?? 3.0,
            starvationWeight: params.priorityPolicy?.starvationWeight ?? 2.0,
            riskTierPenaltyWeight: params.priorityPolicy?.riskTierPenaltyWeight ?? 1.0,
            immutableHumanPriorityOverride: params.priorityPolicy?.immutableHumanPriorityOverride ?? true,
        };
        const missionPayload = {
            missionId: params.missionId,
            tenantId: params.tenantId,
            sessionId: params.sessionId,
            humanOperatorId: params.humanOperatorId,
            title: params.title,
            description: params.description,
            objectiveIds: params.objectives.map((o) => o.objectiveId),
            authorizationScope: [...params.authorizationEnvelope.authorizationScope],
            riskTier: params.authorizationEnvelope.riskTier,
            status: 'AUTHORIZED',
            priorityPolicy,
            dependencyGraph,
            objectives: objectivesMap,
            conflicts: [],
            budget: initialBudget,
            authorizationEnvelope: params.authorizationEnvelope,
            continuitySnapshots: [initialSnapshot],
            createdAt: now,
            updatedAt: now,
            generation: 1,
            missionVersion: 1,
        };
        const provenanceHash = computeMissionProvenanceHash(missionPayload);
        const mission = {
            ...missionPayload,
            provenanceHash,
        };
        this.persistenceBridge.saveMission(mission);
        this.persistenceBridge.emitAudit('MISSION_CREATED', params.tenantId, params.missionId, {
            title: params.title,
            objectivesCount: params.objectives.length,
        });
        this.persistenceBridge.emitAudit('MISSION_AUTHORIZED', params.tenantId, params.missionId, {
            envelopeId: params.authorizationEnvelope.envelopeId,
        });
        return mission;
    }
    /**
     * EN: Runs bounded mission coordination cycles to execute eligible objectives in deterministic priority order.
     * VI: Chạy các chu kỳ điều phối sứ mệnh có giới hạn để thực thi các mục tiêu đủ điều kiện theo thứ tự ưu tiên xác định.
     */
    async coordinateMission(mission, cyclesToRun = MAX_COORDINATION_CYCLES, executor) {
        let currentState = mission.status;
        let cyclesConsumed = mission.budget.coordinationCyclesConsumed;
        let reassessmentsConsumed = mission.budget.reassessmentsConsumed;
        let consecutiveFailures = mission.budget.consecutiveFailures;
        const scheduler = new MissionObjectiveScheduler(Object.values(mission.objectives));
        const continuity = new MissionContinuityManager(mission.missionId, mission.tenantId, mission.sessionId, mission.continuitySnapshots);
        if (currentState === 'AUTHORIZED' || currentState === 'RESUMABLE') {
            this.validator.assertValidStateTransition(currentState, 'READY');
            currentState = 'READY';
            this.persistenceBridge.emitAudit('MISSION_READY', mission.tenantId, mission.missionId, {});
        }
        if (currentState === 'READY') {
            this.validator.assertValidStateTransition(currentState, 'COORDINATING');
            currentState = 'COORDINATING';
            this.persistenceBridge.emitAudit('MISSION_COORDINATION_STARTED', mission.tenantId, mission.missionId, {
                cycle: cyclesConsumed,
            });
        }
        const boundCycles = Math.min(cyclesToRun, MAX_COORDINATION_CYCLES);
        // Bounded coordination loop: zero unbounded loops
        for (let c = 0; c < boundCycles; c++) {
            // 1. Check budget limits
            if (cyclesConsumed >= MAX_COORDINATION_CYCLES) {
                currentState = 'SUSPENDED';
                this.persistenceBridge.emitAudit('MISSION_SUSPENDED', mission.tenantId, mission.missionId, {
                    reason: 'MAX_COORDINATION_CYCLES exhausted',
                });
                break;
            }
            if (Date.now() - mission.budget.missionStartedAt >= MAX_MISSION_DURATION_MS) {
                currentState = 'SUSPENDED';
                this.persistenceBridge.emitAudit('MISSION_SUSPENDED', mission.tenantId, mission.missionId, {
                    reason: 'MAX_MISSION_DURATION_MS exhausted',
                });
                break;
            }
            if (consecutiveFailures >= MAX_CONSECUTIVE_MISSION_FAILURES) {
                currentState = 'REVIEW_REQUIRED';
                this.persistenceBridge.emitAudit('MISSION_REVIEW_REQUIRED', mission.tenantId, mission.missionId, {
                    reason: 'MAX_CONSECUTIVE_MISSION_FAILURES reached',
                });
                break;
            }
            cyclesConsumed += 1;
            // 2. Checkpoint: PRE_OBJECTIVE_SELECTION
            this.securityBoundary.assertStopInactive('PRE_OBJECTIVE_SELECTION', mission.tenantId, mission.missionId);
            // Re-evaluate readiness
            const readiness = scheduler.evaluateReadiness();
            // Check if all objectives are completed
            if (readiness.completed.length === scheduler.getObjectives().length) {
                currentState = 'COMPLETED';
                this.persistenceBridge.emitAudit('MISSION_COMPLETED', mission.tenantId, mission.missionId, {
                    completedCount: readiness.completed.length,
                });
                break;
            }
            // Check if no eligible objectives are ready
            if (readiness.ready.length === 0) {
                if (readiness.active.length === 0) {
                    // Deadlock or all remaining are blocked/failed
                    currentState = 'REVIEW_REQUIRED';
                    this.persistenceBridge.emitAudit('MISSION_REVIEW_REQUIRED', mission.tenantId, mission.missionId, {
                        reason: 'All remaining objectives are blocked or unschedulable',
                        blockedCount: readiness.blocked.length,
                    });
                    break;
                }
            }
            // 3. Priority evaluation
            const readyObjectives = readiness.ready.map((id) => scheduler.getObjective(id)).filter(Boolean);
            const activeObjectives = readiness.active.map((id) => scheduler.getObjective(id)).filter(Boolean);
            const priorityResult = this.priorityEngine.evaluatePriorities(readyObjectives, activeObjectives);
            this.persistenceBridge.emitAudit('PRIORITY_RECALCULATED', mission.tenantId, mission.missionId, {
                rankedOrder: priorityResult.rankedObjectiveIds,
            });
            // Starvation check
            if (priorityResult.starvationDetected) {
                currentState = 'REVIEW_REQUIRED';
                this.persistenceBridge.emitAudit('MISSION_REVIEW_REQUIRED', mission.tenantId, mission.missionId, {
                    reason: 'STARVATION_DETECTED',
                    starvedIds: priorityResult.starvedObjectiveIds,
                });
                break;
            }
            // 4. Conflict detection
            // Checkpoint: PRE_CONFLICT_RESOLUTION
            this.securityBoundary.assertStopInactive('PRE_CONFLICT_RESOLUTION', mission.tenantId, mission.missionId);
            const conflicts = this.conflictResolver.detectConflicts(readyObjectives, activeObjectives);
            if (conflicts.length > 0) {
                let hasUnresolved = false;
                for (const conf of conflicts) {
                    this.persistenceBridge.emitAudit('CONFLICT_DETECTED', mission.tenantId, mission.missionId, {
                        conflictId: conf.conflictId,
                        category: conf.category,
                    });
                    const resolution = this.conflictResolver.resolveConflict(conf);
                    if (resolution.isResolved) {
                        this.persistenceBridge.emitAudit('CONFLICT_RESOLVED', mission.tenantId, mission.missionId, {
                            conflictId: conf.conflictId,
                            strategy: resolution.strategy,
                        });
                    }
                    else {
                        hasUnresolved = true;
                    }
                }
                if (hasUnresolved) {
                    currentState = 'REVIEW_REQUIRED';
                    this.persistenceBridge.emitAudit('MISSION_REVIEW_REQUIRED', mission.tenantId, mission.missionId, {
                        reason: 'Unresolved mission conflicts detected',
                    });
                    break;
                }
            }
            // 5. Select top priority eligible objective
            const selectedObjectiveId = priorityResult.rankedObjectiveIds[0];
            const selectedObjective = scheduler.getObjective(selectedObjectiveId);
            // Record cycle selection in priority engine to update starvation ages
            this.priorityEngine.recordCycleSelection(priorityResult.rankedObjectiveIds, selectedObjectiveId);
            // Checkpoint: POST_OBJECTIVE_SELECTION
            this.securityBoundary.assertStopInactive('POST_OBJECTIVE_SELECTION', mission.tenantId, mission.missionId);
            if (!selectedObjective) {
                continue;
            }
            this.persistenceBridge.emitAudit('OBJECTIVE_SELECTED', mission.tenantId, mission.missionId, {
                objectiveId: selectedObjectiveId,
                cycle: cyclesConsumed,
            });
            // 6. Checkpoint: PRE_OBJECTIVE_DELEGATION
            this.securityBoundary.assertStopInactive('PRE_OBJECTIVE_DELEGATION', mission.tenantId, mission.missionId);
            // Transition objective to DELEGATED -> ACTIVE
            scheduler.updateObjectiveState(selectedObjectiveId, 'ACTIVE');
            this.persistenceBridge.emitAudit('OBJECTIVE_DELEGATED', mission.tenantId, mission.missionId, {
                objectiveId: selectedObjectiveId,
            });
            // Execute delegation (delegated downward strictly to lower layers or executor)
            let executionSuccess = true;
            let summary = 'Objective execution completed';
            if (executor) {
                try {
                    const res = await executor(selectedObjective, cyclesConsumed);
                    executionSuccess = res.success;
                    summary = res.resultSummary ?? res.failureError ?? summary;
                }
                catch (err) {
                    executionSuccess = false;
                    summary = err instanceof Error ? err.message : String(err);
                }
            }
            // 7. Checkpoint: POST_OBJECTIVE_DELEGATION
            this.securityBoundary.assertStopInactive('POST_OBJECTIVE_DELEGATION', mission.tenantId, mission.missionId);
            if (executionSuccess) {
                scheduler.updateObjectiveState(selectedObjectiveId, 'COMPLETED', summary);
                consecutiveFailures = 0;
                this.persistenceBridge.emitAudit('OBJECTIVE_COMPLETED', mission.tenantId, mission.missionId, {
                    objectiveId: selectedObjectiveId,
                    summary,
                });
            }
            else {
                scheduler.updateObjectiveState(selectedObjectiveId, 'FAILED', summary);
                consecutiveFailures += 1;
                this.persistenceBridge.emitAudit('OBJECTIVE_FAILED', mission.tenantId, mission.missionId, {
                    objectiveId: selectedObjectiveId,
                    error: summary,
                });
            }
            // 8. Checkpoint: PRE_MISSION_REASSESSMENT
            this.securityBoundary.assertStopInactive('PRE_MISSION_REASSESSMENT', mission.tenantId, mission.missionId);
            reassessmentsConsumed += 1;
            this.persistenceBridge.emitAudit('MISSION_REASSESSED', mission.tenantId, mission.missionId, {
                reassessmentCount: reassessmentsConsumed,
            });
            // 9. Checkpoint: PRE_CONTINUITY_COMMIT
            this.securityBoundary.assertStopInactive('PRE_CONTINUITY_COMMIT', mission.tenantId, mission.missionId);
            const currentReadiness = scheduler.evaluateReadiness();
            // Check if all objectives are completed after this step
            if (currentReadiness.completed.length === scheduler.getObjectives().length) {
                currentState = 'COMPLETED';
                this.persistenceBridge.emitAudit('MISSION_COMPLETED', mission.tenantId, mission.missionId, {
                    completedCount: currentReadiness.completed.length,
                });
            }
            continuity.createSnapshot({
                coordinationCycle: cyclesConsumed,
                missionState: currentState,
                completedObjectiveIds: currentReadiness.completed,
                activeObjectiveIds: currentReadiness.active,
                pendingObjectiveIds: currentReadiness.ready,
                blockedObjectiveIds: currentReadiness.blocked,
                priorityOrder: priorityResult.rankedObjectiveIds,
                activeConflicts: conflicts,
                budgetState: {
                    ...mission.budget,
                    coordinationCyclesConsumed: cyclesConsumed,
                    reassessmentsConsumed,
                    consecutiveFailures,
                },
                environmentFingerprint: `env_${mission.missionId}_cycle_${cyclesConsumed}`,
            });
            if (currentState === 'COMPLETED') {
                break;
            }
        }
        const finalObjectivesMap = {};
        for (const obj of scheduler.getObjectives()) {
            finalObjectivesMap[obj.objectiveId] = obj;
        }
        const updatedMissionPayload = {
            ...mission,
            status: currentState,
            objectives: finalObjectivesMap,
            budget: {
                ...mission.budget,
                coordinationCyclesConsumed: cyclesConsumed,
                reassessmentsConsumed,
                consecutiveFailures,
            },
            continuitySnapshots: continuity.getSnapshots(),
            updatedAt: Date.now(),
            missionVersion: mission.missionVersion + 1,
        };
        const provenanceHash = computeMissionProvenanceHash(updatedMissionPayload);
        const updatedMission = {
            ...updatedMissionPayload,
            provenanceHash,
        };
        this.persistenceBridge.saveMission(updatedMission);
        const completedCount = Object.values(finalObjectivesMap).filter((o) => o.state === 'COMPLETED').length;
        const failedCount = Object.values(finalObjectivesMap).filter((o) => o.state === 'FAILED').length;
        const lastSnap = continuity.getLastSnapshot();
        return {
            missionId: mission.missionId,
            tenantId: mission.tenantId,
            finalState: currentState,
            completedSuccessfully: currentState === 'COMPLETED',
            completedObjectiveCount: completedCount,
            failedObjectiveCount: failedCount,
            totalCyclesExecuted: cyclesConsumed,
            totalReassessments: reassessmentsConsumed,
            wallClockDurationMs: Date.now() - mission.createdAt,
            finalSnapshotHash: lastSnap?.currentSnapshotHash ?? 'GENESIS_MISSION_SNAPSHOT_HASH',
            auditChainHeadHash: this.persistenceBridge.getLastAuditHash(),
            summaryDetails: `Mission concluded in state ${currentState}`,
        };
    }
    /**
     * EN: Resumes a suspended or awaiting-review mission only after full governance re-verification.
     * VI: Tiếp tục một sứ mệnh bị tạm dừng hoặc chờ đánh giá chỉ sau khi tái xác minh toàn bộ quản trị.
     */
    resumeMission(mission, humanConfirmationToken) {
        // 1. Assert USER_STOP and EMERGENCY_STOP
        this.securityBoundary.assertStopInactive('MISSION_ENTRY', mission.tenantId, mission.missionId);
        // 2. Validate resumable state
        if (mission.status !== 'SUSPENDED' && mission.status !== 'REVIEW_REQUIRED') {
            throw new MissionCoordinationValidationError(`Mission in status '${mission.status}' cannot be resumed`, mission.tenantId, mission.missionId);
        }
        // 3. For High/Critical risk or REVIEW_REQUIRED, genuine human token is mandatory
        if (mission.riskTier === 'HIGH' || mission.riskTier === 'CRITICAL' || mission.status === 'REVIEW_REQUIRED') {
            if (!humanConfirmationToken || humanConfirmationToken.trim().length === 0) {
                throw new MissionCoordinationAuthorizationError('Resuming mission requires genuine human confirmation token', mission.tenantId, mission.missionId);
            }
        }
        // 4. Verify continuity chain
        const continuity = new MissionContinuityManager(mission.missionId, mission.tenantId, mission.sessionId, mission.continuitySnapshots);
        continuity.verifySnapshotChain();
        // 5. Transition to RESUMABLE
        const resumedPayload = {
            ...mission,
            status: 'RESUMABLE',
            updatedAt: Date.now(),
            missionVersion: mission.missionVersion + 1,
        };
        const provenanceHash = computeMissionProvenanceHash(resumedPayload);
        const resumedMission = {
            ...resumedPayload,
            provenanceHash,
        };
        this.persistenceBridge.saveMission(resumedMission);
        this.persistenceBridge.emitAudit('MISSION_RESUMED', mission.tenantId, mission.missionId, {
            version: resumedMission.missionVersion,
        });
        return resumedMission;
    }
}
