// src/core/actionProposal/actionProposalTypes.ts
// BOWCON V4.0 — MS-1.4.05: GOVERNED ACTION PROPOSAL & PDP / PEP BRIDGE TYPES
//
// EN:
// Authoritative type definitions and error taxonomy for the Action Proposal
// and Policy Decision Point (PDP) / Policy Enforcement Point (PEP) Bridge.
// Establishes the mandatory governance air-gap between candidate planning and execution.
//
// VI:
// Các định nghĩa kiểu dữ liệu có thẩm quyền và phân loại lỗi cho Đề xuất Hành động
// và Cầu nối Điểm Quyết định Chính sách (PDP) / Điểm Thực thi Chính sách (PEP).
// Thiết lập khoảng cách an ninh quản trị bắt buộc giữa lập kế hoạch ứng viên và thực thi.
//
// Invariants:
// LLM_OUTPUT != AUTHORITY
// LLM_PROPOSAL != EXECUTION
// CONFIDENCE != AUTHORIZATION
// PLAN != EXECUTION
// PLANNER != TOOL_EXECUTOR
// COGNITION != AUTHORIZATION
// USER_STOP > ALL_ACTION_PROPOSALS
// PDP = AUTHORITATIVE POLICY DECISION
// PEP = AUTHORITATIVE ENFORCEMENT GATE
// ApprovalService = AUTHORITATIVE HUMAN APPROVAL TOKEN SOURCE
// AgentTaskStore = AUTHORITATIVE TASK / VERSION SOURCE

import type { ActionClassification } from '../policyDecisionPoint.js';
import type { PlanRiskLevel } from '../planning/planningTypes.js';

export const ACTION_PROPOSAL_VERSION = '4.0.0';
export const ACTION_PROPOSAL_AUDIT_DOMAIN = 'agent_action_proposal';

/**
 * Audit event types emitted by the action proposal and PDP/PEP bridge.
 */
export type ActionProposalAuditEventType =
  | 'ACTION_PROPOSAL_CREATED'
  | 'ACTION_PROPOSAL_REJECTED'
  | 'ACTION_PDP_EVALUATED'
  | 'ACTION_HUMAN_APPROVAL_DEMANDED'
  | 'ACTION_PEP_ENFORCED'
  | 'ACTION_USER_STOP_ABORTED'
  | 'ACTION_STALE_REJECTED'
  | 'ACTION_TENANT_VIOLATION'
  | 'ACTION_POLICY_UNAVAILABLE';

/**
 * Lifecycle status of an individual ActionProposal.
 */
export type ActionProposalStatus =
  | 'PROPOSED'
  | 'EVALUATING_POLICY'
  | 'AWAITING_HUMAN_APPROVAL'
  | 'AUTHORIZED'
  | 'DENIED'
  | 'BLOCKED_USER_STOP'
  | 'STALE_REJECTED';

/**
 * Canonical ActionProposal data structure.
 * Represents a sanitized, validated candidate step bound to authoritative task and tenant state.
 */
export interface ActionProposal {
  // Authoritative bindings from AgentTask & runtime state
  readonly proposalId: string;
  readonly taskId: string;
  readonly tenantId: string;
  readonly taskVersion: number;
  readonly createdAt: string;

  // Sourced from CandidateStep and deeply sanitized
  readonly candidatePlanId: string;
  readonly stepId: string;
  readonly sequenceIndex: number;
  readonly actionType: string;
  readonly targetResource?: string;
  readonly sanitizedArgs: Readonly<Record<string, unknown>>;
  readonly proposedRisk: PlanRiskLevel;

  // Cryptographic provenance
  readonly candidateProvenanceHash: string;
  readonly proposalProvenanceHash: string;

  // Lifecycle status
  readonly status: ActionProposalStatus;
}

/**
 * Result of PDP evaluation for an ActionProposal.
 */
export interface ActionProposalDecision {
  readonly proposalId: string;
  readonly allowed: boolean;
  readonly action: 'PERMIT' | 'DENY' | 'REQUIRE_HUMAN_APPROVAL';
  readonly authoritativeRisk: ActionClassification;
  readonly requiresHumanApproval: boolean;
  readonly reason: string;
  readonly approvalId?: string;
  readonly policyVersion: string;
  readonly evaluatedAt: string;
  readonly executionToken?: string;
}

/**
 * Result of PEP enforcement check.
 */
export interface PEPEnforcementResult {
  readonly proposalId: string;
  readonly enforced: boolean;
  readonly decision: 'PERMIT' | 'DENY' | 'QUARANTINE';
  readonly reason: string;
  readonly policyVersion: string;
  readonly policyChecksum: string;
  readonly leaseId?: string;
  readonly enforcedAt: string;
}

/**
 * Sealed, immutable authorization handoff envelope for downstream tool adapters (MS-1.4.06).
 * Contains ONLY authorized, sanitized, and cryptographic fields required for execution.
 * MS-1.4.05 NEVER executes this envelope.
 */
export interface AuthorizedActionHandoff {
  readonly proposalId: string;
  readonly taskId: string;
  readonly tenantId: string;
  readonly stepId: string;
  readonly toolName: string;
  readonly sanitizedArgs: Readonly<Record<string, unknown>>;
  readonly authorizationDecision: 'PERMIT';
  readonly policyVersion: string;
  readonly executionToken?: string;
  readonly leaseId?: string;
  readonly handoffProvenanceHash: string;
  readonly authorizedAt: string;
  readonly expiresAt: string;
}

/**
 * Request options for generating and governing an action proposal.
 */
export interface GovernedProposalRequest {
  readonly candidatePlan: import('../planning/governedPlanningTypes.js').GovernedCandidatePlan;
  readonly stepId: string;
  readonly completedStepIds?: readonly string[];
  readonly executionToken?: string;
  readonly ttlSeconds?: number;
  readonly operatorId?: string;
  readonly correlationId?: string;
}

// ============================================================================
// TYPED ERROR HIERARCHY
// ============================================================================

export abstract class ActionProposalError extends Error {
  public abstract readonly code: string;
  public readonly timestamp: string;

  constructor(message: string, public readonly details?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date().toISOString();
  }
}

export class ProposalValidationError extends ActionProposalError {
  public readonly code = 'PROPOSAL_VALIDATION_ERROR';
}

export class ProposalUserStopError extends ActionProposalError {
  public readonly code = 'PROPOSAL_USER_STOP_ERROR';
}

export class CrossTenantProposalError extends ActionProposalError {
  public readonly code = 'CROSS_TENANT_PROPOSAL_ERROR';
}

export class StaleProposalError extends ActionProposalError {
  public readonly code = 'STALE_PROPOSAL_ERROR';
}

export class ProposalPolicyUnavailableError extends ActionProposalError {
  public readonly code = 'PROPOSAL_POLICY_UNAVAILABLE_ERROR';
}

export class ProposalDeniedError extends ActionProposalError {
  public readonly code = 'PROPOSAL_DENIED_ERROR';
}

export class ProposalApprovalRequiredError extends ActionProposalError {
  public readonly code = 'PROPOSAL_APPROVAL_REQUIRED_ERROR';
}

export class ProposalPEPDenyError extends ActionProposalError {
  public readonly code = 'PROPOSAL_PEP_DENY_ERROR';
}

export class ProposalSourceCorruptedError extends ActionProposalError {
  public readonly code = 'PROPOSAL_SOURCE_CORRUPTED_ERROR';
}

export class ProposalSecurityViolationError extends ActionProposalError {
  public readonly code = 'PROPOSAL_SECURITY_VIOLATION_ERROR';
}
