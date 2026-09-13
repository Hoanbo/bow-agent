// src/core/agentLoopFacade/agentLoopExecutionGate.ts
// BOWCON V4.0 — MS-1.4.10: AGENT LOOP EXECUTION GATE
//
// EN:
// Synchronous 10-checkpoint USER_STOP execution gate for the Production Agent Loop Façade.
// Enforces the supreme governance invariant: USER_STOP > ALL_AGENT_ACTIVITY.
// Synchronously checks globalMasterHumanAuthority.isUserStopActive at all 10 transition boundaries.
//
// VI:
// Cổng thực thi USER_STOP đồng bộ 10 điểm kiểm tra cho Mặt tiền Chu trình Agent Sản xuất.
// Thực thi bất biến quản trị tối cao: USER_STOP > ALL_AGENT_ACTIVITY.
// Kiểm tra đồng bộ globalMasterHumanAuthority.isUserStopActive tại cả 10 ranh giới chuyển đổi.

import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';
import { globalAuditLedger, type AuditLedger } from '../auditLedger.js';
import {
  AgentLoopAbortedError,
  AGENT_LOOP_FACADE_AUDIT_DOMAIN,
} from './agentLoopFacadeTypes.js';

export interface AgentLoopGateContext {
  readonly taskId?: string;
  readonly tenantId?: string;
  readonly stepId?: string;
  readonly iteration?: number;
  readonly phase?: string;
}

export interface AgentLoopExecutionGateOptions {
  readonly isUserStopActive?: () => boolean;
  readonly getUserStopReason?: () => string | undefined;
  readonly auditLedger?: AuditLedger;
}

export class AgentLoopExecutionGate {
  private readonly isUserStopActiveFn: () => boolean;
  private readonly getUserStopReasonFn: () => string | undefined;
  private readonly auditLedger: AuditLedger;

  constructor(options?: AgentLoopExecutionGateOptions) {
    this.isUserStopActiveFn =
      options?.isUserStopActive ?? (() => {
        try {
          return globalMasterHumanAuthority.isUserStopActive;
        } catch {
          return false;
        }
      });
    this.getUserStopReasonFn =
      options?.getUserStopReason ?? (() => {
        try {
          return globalMasterHumanAuthority.userStopReason;
        } catch {
          return undefined;
        }
      });
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
   * EN: Synchronous checkpoint evaluation. Fails closed immediately if active.
   */
  private checkCheckpoint(checkpointName: string, checkpointNumber: number, context?: AgentLoopGateContext): void {
    if (this.isUserStopActiveFn()) {
      const nowIso = new Date().toISOString();
      const reason = this.getUserStopReasonFn() || 'Master Human Operator emergency stop';

      this.auditLedger.record({
        timestamp: nowIso,
        eventType: 'AGENT_LOOP_USER_STOP_ABORTED',
        domain: AGENT_LOOP_FACADE_AUDIT_DOMAIN,
        toolName: 'agent_loop_execution_gate',
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
          checkpointName,
          checkpointNumber,
          taskId: context?.taskId,
          stepId: context?.stepId,
          iteration: context?.iteration,
          phase: context?.phase,
          reason,
        },
      } as any);

      throw new AgentLoopAbortedError(
        `Agent loop aborted at Checkpoint ${checkpointNumber} (${checkpointName}): USER_STOP is active (${reason})`,
        {
          checkpointName,
          checkpointNumber,
          taskId: context?.taskId,
          tenantId: context?.tenantId,
          stepId: context?.stepId,
          iteration: context?.iteration,
          reason,
        }
      );
    }
  }

  // 1. Loop entry / request intake
  public assertGate1_LoopEntry(context?: AgentLoopGateContext): void {
    this.checkCheckpoint('Gate 1 - Loop Entry / Request Intake', 1, context);
  }

  // 2. Before context assembly
  public assertGate2_PreContextAssembly(context?: AgentLoopGateContext): void {
    this.checkCheckpoint('Gate 2 - Pre-Context Assembly', 2, context);
  }

  public assertGate2_PreContext(context?: AgentLoopGateContext): void {
    this.assertGate2_PreContextAssembly(context);
  }

  // 3. Before cognitive inference
  public assertGate3_PreCognition(context?: AgentLoopGateContext): void {
    this.checkCheckpoint('Gate 3 - Pre-Cognitive Inference', 3, context);
  }

  // 4. Before plan formulation
  public assertGate4_PrePlanning(context?: AgentLoopGateContext): void {
    this.checkCheckpoint('Gate 4 - Pre-Plan Formulation', 4, context);
  }

  // 5. Before PDP proposal evaluation
  public assertGate5_PreAuthorization(context?: AgentLoopGateContext): void {
    this.checkCheckpoint('Gate 5 - Pre-PDP Proposal Evaluation', 5, context);
  }

  // 6. Before tool execution
  public assertGate6_PreToolExecution(context?: AgentLoopGateContext): void {
    this.checkCheckpoint('Gate 6 - Pre-Tool Execution', 6, context);
  }

  // 7. Before reality verification
  public assertGate7_PreRealityVerification(context?: AgentLoopGateContext): void {
    this.checkCheckpoint('Gate 7 - Pre-Reality Verification', 7, context);
  }

  // 8. Before durable commit
  public assertGate8_PreDurableCommit(context?: AgentLoopGateContext): void {
    this.checkCheckpoint('Gate 8 - Pre-Durable Commit', 8, context);
  }

  // 9. Before episodic memory ingestion
  public assertGate9_PreEpisodicMemory(context?: AgentLoopGateContext): void {
    this.checkCheckpoint('Gate 9 - Pre-Episodic Memory Ingestion', 9, context);
  }

  // 10. Before next iteration
  public assertGate10_PreNextIteration(context?: AgentLoopGateContext): void {
    this.checkCheckpoint('Gate 10 - Pre-Next Iteration', 10, context);
  }
}

export const globalAgentLoopExecutionGate = new AgentLoopExecutionGate();
