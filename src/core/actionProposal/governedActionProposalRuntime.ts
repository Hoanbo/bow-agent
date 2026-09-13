// src/core/actionProposal/governedActionProposalRuntime.ts
// BOWCON V4.0 — MS-1.4.05: GOVERNED ACTION PROPOSAL RUNTIME
//
// EN:
// Master coordinator façade for Governed Action Proposal & PDP / PEP Bridge.
// Coordinates proposal extraction, 4 synchronous USER_STOP gates, PDP policy evaluation,
// human approval routing, PEP enforcement, cryptographic provenance, and audit logging.
// Produces an AuthorizedActionHandoff envelope without ever executing tools.
//
// VI:
// Mặt tiền điều phối chính cho Đề xuất Hành động có Quản trị & Cầu nối PDP / PEP.
// Điều phối trích xuất đề xuất, 4 cổng USER_STOP đồng bộ, đánh giá chính sách PDP,
// định tuyến phê duyệt con người, thực thi PEP, provenance mật mã và ghi sổ kiểm toán.
// Tạo phong bì AuthorizedActionHandoff mà không bao giờ thực thi công cụ.
//
// Invariants:
// - LLM_OUTPUT != AUTHORITY
// - LLM_PROPOSAL != EXECUTION
// - CONFIDENCE != AUTHORIZATION
// - PLAN != EXECUTION
// - PLANNER != TOOL_EXECUTOR
// - COGNITION != AUTHORIZATION
// - USER_STOP > ALL_ACTION_PROPOSALS
// - ZERO_TOOL_EXECUTION
// - ZERO_TASK_STATE_MUTATION
// - STRICT_FAIL_CLOSED

import crypto from 'node:crypto';
import type { AuditLedger, AuditEvent } from '../auditLedger.js';
import { globalAuditLedger } from '../auditLedger.js';
import { globalMasterHumanAuthority, MasterHumanAuthority } from '../authority/masterHumanAuthority.js';
import type { AgentTaskStore } from '../taskLifecycle/agentTaskStore.js';
import type { AgentTask } from '../taskLifecycle/agentTaskTypes.js';
import { ActionProposalBuilder } from './actionProposalBuilder.js';
import { ActionPDPBridge } from './actionPDPBridge.js';
import { ActionPEPBridge } from './actionPEPBridge.js';
import {
  type ActionProposal,
  type ActionProposalDecision,
  type PEPEnforcementResult,
  type AuthorizedActionHandoff,
  type GovernedProposalRequest,
  type ActionProposalAuditEventType,
  ACTION_PROPOSAL_AUDIT_DOMAIN,
  ProposalUserStopError,
  StaleProposalError,
  CrossTenantProposalError,
  ProposalValidationError,
  ProposalDeniedError,
  ProposalApprovalRequiredError,
} from './actionProposalTypes.js';

export interface GovernedActionProposalRuntimeOptions {
  readonly taskStore?: AgentTaskStore;
  readonly auditLedger?: AuditLedger;
  readonly builder?: ActionProposalBuilder;
  readonly pdpBridge?: ActionPDPBridge;
  readonly pepBridge?: ActionPEPBridge;
  readonly isUserStopActive?: () => boolean;
  readonly deterministicTimestamp?: string;
}

export class GovernedActionProposalRuntime {
  private readonly taskStore?: AgentTaskStore;
  private readonly auditLedger: AuditLedger;
  private readonly builder: ActionProposalBuilder;
  private readonly pdpBridge: ActionPDPBridge;
  private readonly pepBridge: ActionPEPBridge;
  private readonly isUserStopActiveFn?: () => boolean;
  private readonly deterministicTimestamp?: string;

  constructor(options?: GovernedActionProposalRuntimeOptions) {
    this.taskStore = options?.taskStore;
    this.auditLedger = options?.auditLedger ?? globalAuditLedger;
    this.builder = options?.builder ?? new ActionProposalBuilder();
    this.pdpBridge = options?.pdpBridge ?? new ActionPDPBridge();
    this.pepBridge = options?.pepBridge ?? new ActionPEPBridge();
    this.isUserStopActiveFn = options?.isUserStopActive;
    this.deterministicTimestamp = options?.deterministicTimestamp;
  }

  /**
   * Evaluates the absolute supremacy of USER_STOP across all 4 synchronous gates.
   */
  public assertUserStopNotActive(checkpointName: string, context?: Record<string, unknown>): void {
    const isStopped =
      (this.isUserStopActiveFn && this.isUserStopActiveFn()) ||
      globalMasterHumanAuthority.isUserStopActive;

    if (isStopped) {
      this.recordAudit({
        eventType: 'ACTION_USER_STOP_ABORTED',
        toolName: (context?.actionType as string) || 'UNKNOWN_ACTION',
        policyDecision: 'DENY',
        details: { checkpoint: checkpointName, reason: 'USER_STOP_ACTIVE', ...context },
      });

      throw new ProposalUserStopError(
        `EMERGENCY_USER_STOP_ACTIVE: Processing aborted at ${checkpointName} due to active Master Human USER_STOP.`,
        { checkpoint: checkpointName, ...context }
      );
    }
  }

  /**
   * Primary entrypoint: Extracts candidate step, verifies policies, routes approval,
   * enforces runtime constraints, and produces a sealed AuthorizedActionHandoff envelope.
   */
  public async governProposal(
    request: GovernedProposalRequest,
    injectedTask?: AgentTask
  ): Promise<AuthorizedActionHandoff | ActionProposalDecision> {
    const { candidatePlan, stepId, completedStepIds = [], executionToken, ttlSeconds = 300 } = request;

    // ------------------------------------------------------------------------
    // GATE 1: USER_STOP Check before extraction
    // ------------------------------------------------------------------------
    this.assertUserStopNotActive('GATE_1_BEFORE_PROPOSAL_CREATION', {
      taskId: candidatePlan?.taskId,
      stepId,
    });

    // Resolve authoritative task state (Read-Only)
    const task = await this.resolveAuthoritativeTask(candidatePlan.taskId, candidatePlan.tenantId, injectedTask);

    // Build the sanitized, bound ActionProposal
    let proposal: ActionProposal;
    try {
      proposal = this.builder.buildProposal({
        candidatePlan,
        stepId,
        authoritativeTask: task,
        completedStepIds,
      });
    } catch (err: any) {
      this.recordAudit({
        eventType: 'ACTION_PROPOSAL_REJECTED',
        toolName: 'UNKNOWN',
        policyDecision: 'DENY',
        details: { taskId: task.taskId, stepId, error: err.message },
      });
      throw err;
    }

    this.recordAudit({
      eventType: 'ACTION_PROPOSAL_CREATED',
      toolName: proposal.actionType,
      policyDecision: 'PERMIT',
      details: {
        proposalId: proposal.proposalId,
        taskId: proposal.taskId,
        stepId: proposal.stepId,
        provenanceHash: proposal.proposalProvenanceHash,
      },
    });

    // ------------------------------------------------------------------------
    // GATE 2: USER_STOP Check before PDP Evaluation
    // ------------------------------------------------------------------------
    this.assertUserStopNotActive('GATE_2_BEFORE_PDP_SUBMISSION', {
      proposalId: proposal.proposalId,
      actionType: proposal.actionType,
    });

    // Verify task version freshness before PDP submission
    await this.assertTaskVersionFresh(task, proposal.taskVersion);

    // Evaluate via PolicyDecisionPoint & ApprovalService
    let pdpDecision: ActionProposalDecision;
    try {
      pdpDecision = await this.pdpBridge.evaluateProposal({
        proposal,
        authoritativeTask: task,
        executionToken,
        operatorId: request.operatorId,
        ttlSeconds,
      });
    } catch (err: any) {
      this.recordAudit({
        eventType: 'ACTION_POLICY_UNAVAILABLE',
        toolName: proposal.actionType,
        policyDecision: 'DENY',
        details: { proposalId: proposal.proposalId, error: err.message },
      });
      throw err;
    }

    this.recordAudit({
      eventType: 'ACTION_PDP_EVALUATED',
      toolName: proposal.actionType,
      policyDecision: pdpDecision.allowed ? 'PERMIT' : 'DENY',
      details: {
        proposalId: proposal.proposalId,
        action: pdpDecision.action,
        risk: pdpDecision.authoritativeRisk,
        requiresApproval: pdpDecision.requiresHumanApproval,
        reason: pdpDecision.reason,
      },
    });

    // If human approval is demanded, suspend proposal flow and return decision
    if (pdpDecision.action === 'REQUIRE_HUMAN_APPROVAL') {
      this.recordAudit({
        eventType: 'ACTION_HUMAN_APPROVAL_DEMANDED',
        toolName: proposal.actionType,
        policyDecision: 'DENY',
        details: {
          proposalId: proposal.proposalId,
          approvalId: pdpDecision.approvalId,
          risk: pdpDecision.authoritativeRisk,
        },
      });
      return pdpDecision;
    }

    // If policy explicitly denied the proposal, fail closed
    if (!pdpDecision.allowed || pdpDecision.action === 'DENY') {
      this.recordAudit({
        eventType: 'ACTION_PROPOSAL_REJECTED',
        toolName: proposal.actionType,
        policyDecision: 'DENY',
        details: {
          proposalId: proposal.proposalId,
          reason: pdpDecision.reason,
        },
      });
      throw new ProposalDeniedError(
        `PDP_DENIED: PolicyDecisionPoint rejected action "${proposal.actionType}". Reason: ${pdpDecision.reason}`,
        { proposalId: proposal.proposalId, reason: pdpDecision.reason }
      );
    }

    // ------------------------------------------------------------------------
    // GATE 3: USER_STOP Check after PDP Decision
    // ------------------------------------------------------------------------
    this.assertUserStopNotActive('GATE_3_AFTER_PDP_RESPONSE', {
      proposalId: proposal.proposalId,
      actionType: proposal.actionType,
    });

    // Enforce via Governed Policy Enforcement Point (PEP)
    let pepResult: PEPEnforcementResult;
    try {
      pepResult = await this.pepBridge.enforceProposal({
        proposal,
        pdpDecision,
        authoritativeTask: task,
      });
    } catch (err: any) {
      this.recordAudit({
        eventType: 'ACTION_PROPOSAL_REJECTED',
        toolName: proposal.actionType,
        policyDecision: 'DENY',
        details: { proposalId: proposal.proposalId, error: err.message },
      });
      throw err;
    }

    this.recordAudit({
      eventType: 'ACTION_PEP_ENFORCED',
      toolName: proposal.actionType,
      policyDecision: 'PERMIT',
      details: {
        proposalId: proposal.proposalId,
        leaseId: pepResult.leaseId,
        policyVersion: pepResult.policyVersion,
      },
    });

    // ------------------------------------------------------------------------
    // GATE 4: USER_STOP Check before emitting AuthorizedActionHandoff
    // ------------------------------------------------------------------------
    this.assertUserStopNotActive('GATE_4_BEFORE_HANDOFF_EMISSION', {
      proposalId: proposal.proposalId,
      actionType: proposal.actionType,
    });

    // Calculate final sealed cryptographic handoff provenance hash
    const handoffProvenanceHash = this.calculateHandoffHash({
      proposalProvenanceHash: proposal.proposalProvenanceHash,
      policyVersion: pepResult.policyVersion,
      authorizationDecision: 'PERMIT',
      executionToken: pdpDecision.executionToken,
    });

    const now = this.deterministicTimestamp || new Date().toISOString();
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

    const handoff: AuthorizedActionHandoff = {
      proposalId: proposal.proposalId,
      taskId: proposal.taskId,
      tenantId: proposal.tenantId,
      stepId: proposal.stepId,
      toolName: proposal.actionType,
      sanitizedArgs: proposal.sanitizedArgs,
      authorizationDecision: 'PERMIT',
      policyVersion: pepResult.policyVersion,
      executionToken: pdpDecision.executionToken,
      leaseId: pepResult.leaseId,
      handoffProvenanceHash,
      authorizedAt: now,
      expiresAt,
    };

    return Object.freeze(handoff);
  }

  /**
   * Deterministically calculates the SHA-256 handoff provenance hash.
   */
  private calculateHandoffHash(params: {
    proposalProvenanceHash: string;
    policyVersion: string;
    authorizationDecision: string;
    executionToken?: string;
  }): string {
    const raw = [
      params.proposalProvenanceHash,
      params.policyVersion,
      params.authorizationDecision,
      params.executionToken || '',
    ].join('|');

    return crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
  }

  /**
   * Resolves the authoritative task without mutating it.
   */
  private async resolveAuthoritativeTask(
    taskId: string,
    tenantId: string,
    injectedTask?: AgentTask
  ): Promise<AgentTask> {
    if (injectedTask) {
      if (injectedTask.taskId !== taskId) {
        throw new ProposalValidationError(
          `TASK_ID_MISMATCH: Injected task "${injectedTask.taskId}" does not match requested taskId "${taskId}".`
        );
      }
      if (injectedTask.tenantId !== tenantId) {
        throw new CrossTenantProposalError(
          `CROSS_TENANT_TASK: Injected task tenant "${injectedTask.tenantId}" does not match plan tenant "${tenantId}".`
        );
      }
      return injectedTask;
    }

    if (this.taskStore) {
      const task = await this.taskStore.getTask(tenantId, taskId);
      if (!task) {
        throw new ProposalValidationError(`TASK_NOT_FOUND: Authoritative task "${taskId}" does not exist.`);
      }
      if (task.tenantId !== tenantId) {
        throw new CrossTenantProposalError(
          `CROSS_TENANT_TASK: Stored task tenant "${task.tenantId}" does not match plan tenant "${tenantId}".`
        );
      }
      return task;
    }

    throw new ProposalValidationError(
      'TASK_RESOLUTION_FAILED: Neither an injected task nor an AgentTaskStore was provided to the runtime.'
    );
  }

  /**
   * Verifies that the task version has not changed.
   */
  private async assertTaskVersionFresh(task: AgentTask, expectedVersion: number): Promise<void> {
    if (this.taskStore) {
      const current = await this.taskStore.getTask(task.tenantId, task.taskId);
      if (current && current.version !== expectedVersion) {
        this.recordAudit({
          eventType: 'ACTION_STALE_REJECTED',
          toolName: 'TASK_VERSION_CHECK',
          policyDecision: 'DENY',
          details: { taskId: task.taskId, currentVersion: current.version, expectedVersion },
        });
        throw new StaleProposalError(
          `STALE_TASK_VERSION: Task version has changed from ${expectedVersion} to ${current.version}. Proposal rejected.`
        );
      }
    }
  }

  /**
   * Appends an event to the global audit ledger.
   */
  private recordAudit(params: {
    eventType: ActionProposalAuditEventType;
    toolName: string;
    policyDecision: 'PERMIT' | 'DENY';
    details: Record<string, unknown>;
  }): void {
    try {
      const timestamp = this.deterministicTimestamp || new Date().toISOString();
      const sanitizedDetails = { ...params.details };

      this.auditLedger.record({
        timestamp,
        actor: {
          userId: (sanitizedDetails.userId as string) || 'action_proposal_runtime',
          role: 'agent',
          channel: 'governance',
        },
        domain: ACTION_PROPOSAL_AUDIT_DOMAIN,
        toolName: params.toolName,
        classification: params.eventType,
        argumentsHash: crypto.createHash('sha256').update(JSON.stringify(sanitizedDetails)).digest('hex'),
        policyDecision: params.policyDecision,
        executionStatus: params.policyDecision === 'PERMIT' ? 'SUCCESS' : 'BLOCKED',
      });
    } catch {
      // Audit ledger failure must not silently compromise execution
    }
  }
}
