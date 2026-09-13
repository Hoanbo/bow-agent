// src/core/durableCommit/durableCommitExecutionGate.ts
// BOWCON V4.0 — MS-1.4.08: DURABLE COMMIT EXECUTION GATE
//
// EN:
// Synchronous 4-checkpoint USER_STOP execution gate for the Durable Commit Engine.
// Enforces the supreme governance invariant: USER_STOP > ALL_COMMIT.
// Evaluates globalMasterHumanAuthority.isUserStopActive synchronously at every checkpoint.
//
// VI:
// Cổng thực thi USER_STOP đồng bộ 4 điểm kiểm tra cho Động cơ Commit Bền vững.
// Thực thi bất biến quản trị tối cao: USER_STOP > ALL_COMMIT.
// Đánh giá globalMasterHumanAuthority.isUserStopActive đồng bộ tại mọi điểm kiểm tra.
import { globalMasterHumanAuthority, } from '../authority/masterHumanAuthority.js';
import { globalAuditLedger, } from '../auditLedger.js';
import { CommitAbortedError, DURABLE_COMMIT_AUDIT_DOMAIN, } from './durableCommitTypes.js';
export class DurableCommitExecutionGate {
    isUserStopActiveFn;
    getUserStopReasonFn;
    auditLedger;
    constructor(options) {
        this.isUserStopActiveFn =
            options?.isUserStopActive ?? (() => globalMasterHumanAuthority.isUserStopActive);
        this.getUserStopReasonFn =
            options?.getUserStopReason ?? (() => globalMasterHumanAuthority.userStopReason);
        this.auditLedger = options?.auditLedger ?? globalAuditLedger;
    }
    /**
     * EN: Returns whether USER_STOP is currently active.
     */
    isUserStopActive() {
        return this.isUserStopActiveFn();
    }
    /**
     * EN: Returns the reason for the active USER_STOP signal.
     */
    getUserStopReason() {
        return this.getUserStopReasonFn();
    }
    /**
     * EN: Checks USER_STOP status at a specific checkpoint.
     * Fails closed immediately if active by recording audit event and throwing CommitAbortedError.
     */
    checkCheckpoint(gateName, gateNumber, context) {
        if (this.isUserStopActiveFn()) {
            const nowIso = new Date().toISOString();
            const reason = this.getUserStopReasonFn() || 'Master Human Operator emergency stop';
            // Record audit event
            this.auditLedger.record({
                timestamp: nowIso,
                eventType: 'DURABLE_COMMIT_USER_STOP_ABORTED',
                domain: DURABLE_COMMIT_AUDIT_DOMAIN,
                toolName: 'durable_commit_gate',
                classification: 'INTERRUPT',
                argumentsHash: '',
                policyDecision: 'DENY',
                executionStatus: 'FAILURE',
                resultHash: '',
                actor: {
                    userId: 'master_human_authority',
                    role: 'ADMIN',
                    channel: 'USER_STOP',
                },
                tenantId: context?.tenantId ?? 'system',
                metadata: {
                    gateName,
                    gateNumber,
                    taskId: context?.taskId,
                    stepId: context?.stepId,
                    executionId: context?.executionId,
                    verificationId: context?.verificationId,
                    commitId: context?.commitId,
                    reason,
                },
            });
            throw new CommitAbortedError(`Durable commit aborted at Gate ${gateNumber} (${gateName}): USER_STOP is active (${reason})`, { gateName, gateNumber, taskId: context?.taskId, tenantId: context?.tenantId, reason });
        }
    }
    /**
     * Gate 1: Before request acceptance.
     */
    assertGate1_RequestAcceptance(context) {
        this.checkCheckpoint('Gate 1 - Request Acceptance', 1, context);
    }
    /**
     * Gate 2: Before reading/checking durable commit state / duplicate state.
     */
    assertGate2_StateRead(context) {
        this.checkCheckpoint('Gate 2 - State Read / Duplicate Check', 2, context);
    }
    /**
     * Gate 3: Immediately before durable write.
     */
    assertGate3_PreWrite(context) {
        this.checkCheckpoint('Gate 3 - Pre-Durable Write', 3, context);
    }
    /**
     * Gate 4: After write and before sealed result emission.
     */
    assertGate4_PostWrite(context) {
        this.checkCheckpoint('Gate 4 - Post-Durable Write Emission', 4, context);
    }
}
export const globalDurableCommitExecutionGate = new DurableCommitExecutionGate();
