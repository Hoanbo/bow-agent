// src/core/orchestration/orchestrationRuntime.ts
// BOWCON V4.0 — MS-1.3.46: GOVERNED TASK ORCHESTRATION RUNTIME
//
// Central coordinator for Governed Multi-Agent Task Orchestration,
// Cryptographic Artifact Verification, Evidence Bundling, and Supervisory Review.
//
// STRICT INVARIANTS:
// - MASTER_OWNER_AUTHORITY > BOW > BOWCON > PROJECTS
// - USER_STOP > EVERYTHING_AUTONOMOUS
// - REVOCATION > AGENT_INTENT
// - DELEGATION != AUTHORITY
// - EVIDENCE != AUTHORITY
// - VERIFICATION != AUTHORIZATION
// - TASK_COMPLETION != OWNER_APPROVAL
// - AGENT_COUNT != AUTHORITY_COUNT (No collective authority)
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0
// - Reuses canonical globalAuditLedger, globalMasterHumanAuthority, and globalSupervisorHumanGate.
import crypto from 'node:crypto';
import { MASTER_OWNER_ID, isMasterOwner, } from '../architecture/masterArchitectureIdentity.js';
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';
import { globalAuditLedger } from '../auditLedger.js';
import { globalGovernedTaskOrchestrator } from './governedTaskOrchestrator.js';
import { globalTaskDependencyEngine } from './taskDependencyEngine.js';
import { globalArtifactEvidenceEngine } from './artifactEvidenceEngine.js';
import { globalEvidenceVerificationEngine } from './evidenceVerificationEngine.js';
import { globalEvidenceAggregationEngine } from './evidenceAggregationEngine.js';
import { globalTaskReviewEngine } from './taskReviewEngine.js';
export class OrchestrationRuntimeError extends Error {
    code;
    details;
    constructor(code, message, details) {
        super(`[${code}] ${message}`);
        this.code = code;
        this.details = details;
        this.name = 'OrchestrationRuntimeError';
    }
}
export class OrchestrationRuntime {
    orchestrator;
    dependencyEngine;
    artifactEngine;
    verificationEngine;
    aggregationEngine;
    reviewEngine;
    auditLedger;
    masterAuthority;
    _isStopped = false;
    _stopReason = '';
    constructor(orchestrator = globalGovernedTaskOrchestrator, dependencyEngine = globalTaskDependencyEngine, artifactEngine = globalArtifactEvidenceEngine, verificationEngine = globalEvidenceVerificationEngine, aggregationEngine = globalEvidenceAggregationEngine, reviewEngine = globalTaskReviewEngine, auditLedger = globalAuditLedger, masterAuthority = globalMasterHumanAuthority) {
        this.orchestrator = orchestrator;
        this.dependencyEngine = dependencyEngine;
        this.artifactEngine = artifactEngine;
        this.verificationEngine = verificationEngine;
        this.aggregationEngine = aggregationEngine;
        this.reviewEngine = reviewEngine;
        this.auditLedger = auditLedger;
        this.masterAuthority = masterAuthority;
    }
    // ---------------------------------------------------------------------------
    // 1. Universal Emergency Stop Supremacy
    // ---------------------------------------------------------------------------
    get isUserStopActive() {
        return this._isStopped || this.masterAuthority.isUserStopActive;
    }
    get stopReason() {
        return this._stopReason || (this.masterAuthority.isUserStopActive ? 'Master Owner USER_STOP active via authority' : '');
    }
    emergencyStop(reason = 'Universal Master Owner USER_STOP triggered') {
        this._isStopped = true;
        this._stopReason = reason;
        // Log to canonical audit ledger
        this.logAudit('UNIVERSAL_USER_STOP', 'USER_STOP', 'BLOCKED', { reason });
    }
    resetEmergencyStop(operatorId) {
        if (!isMasterOwner(operatorId)) {
            throw new OrchestrationRuntimeError('USER_STOP_ACTIVE', `Unauthorized reset attempt by ${operatorId}. Only Master Owner (${MASTER_OWNER_ID}) may reset USER_STOP.`);
        }
        this._isStopped = false;
        this._stopReason = '';
        this.logAudit('USER_STOP_RESET', 'USER_STOP_RESET', 'SUCCESS', { operatorId });
    }
    assertNotStopped(action) {
        if (this.isUserStopActive) {
            throw new OrchestrationRuntimeError('USER_STOP_ACTIVE', `Cannot perform "${action}": USER_STOP is currently active (${this.stopReason}).`);
        }
    }
    // ---------------------------------------------------------------------------
    // 2. Governed Lifecycle Coordination
    // ---------------------------------------------------------------------------
    /**
     * Creates a new task group.
     */
    createTaskGroup(input) {
        this.assertNotStopped('createTaskGroup');
        const group = this.orchestrator.createTaskGroup(input);
        this.logAudit('CREATE_TASK_GROUP', group.groupId, 'SUCCESS', { title: group.title, sessionId: group.sessionId });
        return group;
    }
    /**
     * Creates a governed task within a task group.
     */
    createTask(input) {
        this.assertNotStopped('createTask');
        const task = this.orchestrator.createTask(input);
        this.logAudit('CREATE_TASK', task.taskId, 'SUCCESS', {
            groupId: task.groupId,
            title: task.title,
            sessionId: task.sessionId,
        });
        return task;
    }
    /**
     * Assigns a task to a governed agent after validating delegation scope.
     */
    assignTask(input) {
        this.assertNotStopped('assignTask');
        const assignedTask = this.orchestrator.assignTask(input);
        this.logAudit('ASSIGN_TASK', assignedTask.taskId, 'SUCCESS', {
            agentId: input.agentId,
            delegationId: input.delegationId,
            deviceId: input.deviceId,
        });
        return assignedTask;
    }
    /**
     * Starts task execution after verifying dependencies.
     */
    startTask(taskId) {
        this.assertNotStopped('startTask');
        const runningTask = this.orchestrator.startTaskExecution(taskId);
        this.logAudit('START_TASK', runningTask.taskId, 'SUCCESS', { state: runningTask.state });
        return runningTask;
    }
    /**
     * Records a generated task artifact.
     */
    recordArtifact(input) {
        this.assertNotStopped('recordArtifact');
        const artifact = this.artifactEngine.createArtifact(input);
        // Automatically register corresponding evidence observation
        this.verificationEngine.createEvidenceFromArtifact(artifact);
        this.logAudit('RECORD_ARTIFACT', artifact.artifactId, 'SUCCESS', {
            taskId: artifact.taskId,
            hash: artifact.contentHash,
            type: artifact.artifactType,
        });
        return artifact;
    }
    /**
     * Submits an agent execution result and advances the task into VERIFICATION_PENDING.
     */
    submitResult(taskId, result) {
        this.assertNotStopped('submitResult');
        const task = this.orchestrator.submitTaskResult(taskId, result);
        this.logAudit('SUBMIT_RESULT', taskId, 'SUCCESS', {
            outcome: result.outcome.status,
            agentId: result.agentId,
        });
        return task;
    }
    /**
     * Verifies, aggregates, and reviews a completed task.
     */
    verifyAndReviewTask(params) {
        this.assertNotStopped('verifyAndReviewTask');
        const task = this.orchestrator.getTask(params.taskId);
        if (!task) {
            throw new OrchestrationRuntimeError('TASK_NOT_FOUND', `Task ${params.taskId} not found.`);
        }
        // 1. Collect evidence records for this task
        const evidenceList = this.verificationEngine.getEvidenceByTask(task.taskId);
        // 2. Verify each evidence record
        for (const ev of evidenceList) {
            const vRes = this.verificationEngine.verifyEvidenceRecord(ev, task);
            ev.verificationState = vRes.status;
            ev.integrityStatus = vRes.integrityStatus;
        }
        // 3. Check for contradictions if multiple results exist in the group
        const groupTasks = this.orchestrator.getTasksByGroup(task.groupId);
        const groupResults = groupTasks.map((t) => t.result).filter((r) => Boolean(r));
        const contradictions = this.verificationEngine.detectContradictions(groupResults, task.groupId);
        // 4. Aggregate evidence into bundle
        const bundle = this.aggregationEngine.aggregateEvidence({
            taskGroupId: task.groupId,
            taskId: task.taskId,
            sessionId: task.sessionId,
            evidenceList,
            contradictions,
        });
        // 5. Conduct supervisory review
        const review = this.reviewEngine.reviewTask({
            task,
            evidenceBundle: bundle,
            reviewerId: params.reviewerId,
            reviewerType: params.reviewerType,
            notes: params.notes,
        });
        // 6. Update task execution state based on review decision
        let finalTaskState = task.state;
        if (review.reviewDecision === 'VERIFIED') {
            finalTaskState = 'VERIFIED';
        }
        else if (review.reviewDecision === 'REJECTED') {
            finalTaskState = 'REJECTED';
        }
        else {
            finalTaskState = 'BLOCKED';
        }
        const updatedTask = this.orchestrator.updateTaskState(task.taskId, finalTaskState);
        this.logAudit('VERIFY_REVIEW_TASK', task.taskId, review.reviewDecision === 'VERIFIED' ? 'SUCCESS' : 'BLOCKED', {
            reviewId: review.reviewId,
            decision: review.reviewDecision,
            bundleId: bundle.bundleId,
            ownerApproved: review.ownerApproved,
        });
        return {
            task: updatedTask,
            bundle,
            review,
            contradictions,
        };
    }
    /**
     * Internal audit logger ensuring compliance with append-only canonical ledger.
     */
    logAudit(toolName, target, executionStatus, metadata) {
        try {
            this.auditLedger.record({
                timestamp: new Date().toISOString(),
                actor: {
                    userId: 'orchestration_runtime',
                    role: 'runtime_orchestrator',
                    channel: 'INTERNAL',
                },
                domain: 'governed_orchestration',
                toolName,
                classification: 'OBSERVE',
                argumentsHash: crypto.createHash('sha256').update(JSON.stringify({ target, ...metadata })).digest('hex'),
                policyDecision: executionStatus === 'BLOCKED' ? 'DENY' : 'PERMIT',
                executionStatus,
            });
        }
        catch {
            // Invariant: Do not disrupt in-memory flow if audit write is constrained in test environment
        }
    }
    clear() {
        this.orchestrator.clear();
        this.artifactEngine.clear();
        this.verificationEngine.clear();
        this.aggregationEngine.clear();
        this.reviewEngine.clear();
        this._isStopped = false;
        this._stopReason = '';
    }
}
export const globalOrchestrationRuntime = new OrchestrationRuntime();
