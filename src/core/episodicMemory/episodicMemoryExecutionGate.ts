// src/core/episodicMemory/episodicMemoryExecutionGate.ts
// BOWCON V4.0 — MS-1.4.09: EPISODIC MEMORY EXECUTION GATE
//
// EN:
// Synchronous 4-checkpoint USER_STOP execution gate for the Episodic Memory Engine.
// Enforces the supreme governance invariant: USER_STOP > ALL_MEMORY_MUTATION.
// Evaluates globalMasterHumanAuthority.isUserStopActive synchronously at every checkpoint.
//
// VI:
// Cổng thực thi USER_STOP đồng bộ 4 điểm kiểm tra cho Động cơ Bộ nhớ Episodic.
// Thực thi bất biến quản trị tối cao: USER_STOP > ALL_MEMORY_MUTATION.
// Đánh giá globalMasterHumanAuthority.isUserStopActive đồng bộ tại mọi điểm kiểm tra.

import {
  globalMasterHumanAuthority,
} from '../authority/masterHumanAuthority.js';
import {
  globalAuditLedger,
  type AuditLedger,
} from '../auditLedger.js';
import {
  MemoryAbortedError,
  EPISODIC_MEMORY_AUDIT_DOMAIN,
} from './episodicMemoryTypes.js';

export interface EpisodicMemoryGateContext {
  readonly taskId?: string;
  readonly tenantId?: string;
  readonly stepId?: string;
  readonly executionId?: string;
  readonly commitId?: string;
  readonly memoryId?: string;
}

export interface EpisodicMemoryExecutionGateOptions {
  readonly isUserStopActive?: () => boolean;
  readonly getUserStopReason?: () => string | undefined;
  readonly auditLedger?: AuditLedger;
}

export class EpisodicMemoryExecutionGate {
  private readonly isUserStopActiveFn: () => boolean;
  private readonly getUserStopReasonFn: () => string | undefined;
  private readonly auditLedger: AuditLedger;

  constructor(options?: EpisodicMemoryExecutionGateOptions) {
    this.isUserStopActiveFn =
      options?.isUserStopActive ?? (() => globalMasterHumanAuthority.isUserStopActive);
    this.getUserStopReasonFn =
      options?.getUserStopReason ?? (() => globalMasterHumanAuthority.userStopReason);
    this.auditLedger = options?.auditLedger ?? globalAuditLedger;
  }

  /**
   * EN: Returns whether USER_STOP is currently active.
   */
  public isUserStopActive(): boolean {
    return this.isUserStopActiveFn();
  }

  /**
   * EN: Returns the reason for the active USER_STOP signal.
   */
  public getUserStopReason(): string | undefined {
    return this.getUserStopReasonFn();
  }

  /**
   * EN: Checks USER_STOP status at a specific checkpoint.
   * Fails closed immediately if active by recording audit event and throwing MemoryAbortedError.
   */
  private checkCheckpoint(gateName: string, gateNumber: number, context?: EpisodicMemoryGateContext): void {
    if (this.isUserStopActiveFn()) {
      const nowIso = new Date().toISOString();
      const reason = this.getUserStopReasonFn() || 'Master Human Operator emergency stop';

      // Record audit event
      this.auditLedger.record({
        timestamp: nowIso,
        eventType: 'EPISODIC_MEMORY_USER_STOP_ABORTED',
        domain: EPISODIC_MEMORY_AUDIT_DOMAIN,
        toolName: 'episodic_memory_gate',
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
          commitId: context?.commitId,
          memoryId: context?.memoryId,
          reason,
        },
      } as any);

      throw new MemoryAbortedError(
        `Episodic memory aborted at Gate ${gateNumber} (${gateName}): USER_STOP is active (${reason})`,
        { gateName, gateNumber, taskId: context?.taskId, tenantId: context?.tenantId, reason }
      );
    }
  }

  /**
   * Gate 1: Before accepting the memory mutation request.
   */
  public assertGate1_RequestAcceptance(context?: EpisodicMemoryGateContext): void {
    this.checkCheckpoint('Gate 1 - Request Acceptance', 1, context);
  }

  /**
   * Gate 2: Before reading/checking persistence / duplicate state.
   */
  public assertGate2_StateRead(context?: EpisodicMemoryGateContext): void {
    this.checkCheckpoint('Gate 2 - Persistence Read / Duplicate Check', 2, context);
  }

  /**
   * Gate 3: Immediately before durable memory write.
   */
  public assertGate3_PreWrite(context?: EpisodicMemoryGateContext): void {
    this.checkCheckpoint('Gate 3 - Pre-Durable Memory Write', 3, context);
  }

  /**
   * Gate 4: After write and before emitting the final result.
   */
  public assertGate4_PostWrite(context?: EpisodicMemoryGateContext): void {
    this.checkCheckpoint('Gate 4 - Post-Durable Write Emission', 4, context);
  }
}

export const globalEpisodicMemoryExecutionGate = new EpisodicMemoryExecutionGate();
