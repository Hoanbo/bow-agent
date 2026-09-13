import type { ActionClassification } from '../policyDecisionPoint.js';
import type { PlanRiskLevel } from '../planning/planningTypes.js';
export declare const ACTION_PROPOSAL_VERSION = "4.0.0";
export declare const ACTION_PROPOSAL_AUDIT_DOMAIN = "agent_action_proposal";
/**
 * Audit event types emitted by the action proposal and PDP/PEP bridge.
 */
export type ActionProposalAuditEventType = 'ACTION_PROPOSAL_CREATED' | 'ACTION_PROPOSAL_REJECTED' | 'ACTION_PDP_EVALUATED' | 'ACTION_HUMAN_APPROVAL_DEMANDED' | 'ACTION_PEP_ENFORCED' | 'ACTION_USER_STOP_ABORTED' | 'ACTION_STALE_REJECTED' | 'ACTION_TENANT_VIOLATION' | 'ACTION_POLICY_UNAVAILABLE';
/**
 * Lifecycle status of an individual ActionProposal.
 */
export type ActionProposalStatus = 'PROPOSED' | 'EVALUATING_POLICY' | 'AWAITING_HUMAN_APPROVAL' | 'AUTHORIZED' | 'DENIED' | 'BLOCKED_USER_STOP' | 'STALE_REJECTED';
/**
 * Canonical ActionProposal data structure.
 * Represents a sanitized, validated candidate step bound to authoritative task and tenant state.
 */
export interface ActionProposal {
    readonly proposalId: string;
    readonly taskId: string;
    readonly tenantId: string;
    readonly taskVersion: number;
    readonly createdAt: string;
    readonly candidatePlanId: string;
    readonly stepId: string;
    readonly sequenceIndex: number;
    readonly actionType: string;
    readonly targetResource?: string;
    readonly sanitizedArgs: Readonly<Record<string, unknown>>;
    readonly proposedRisk: PlanRiskLevel;
    readonly candidateProvenanceHash: string;
    readonly proposalProvenanceHash: string;
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
export declare abstract class ActionProposalError extends Error {
    readonly details?: Record<string, unknown> | undefined;
    abstract readonly code: string;
    readonly timestamp: string;
    constructor(message: string, details?: Record<string, unknown> | undefined);
}
export declare class ProposalValidationError extends ActionProposalError {
    readonly code = "PROPOSAL_VALIDATION_ERROR";
}
export declare class ProposalUserStopError extends ActionProposalError {
    readonly code = "PROPOSAL_USER_STOP_ERROR";
}
export declare class CrossTenantProposalError extends ActionProposalError {
    readonly code = "CROSS_TENANT_PROPOSAL_ERROR";
}
export declare class StaleProposalError extends ActionProposalError {
    readonly code = "STALE_PROPOSAL_ERROR";
}
export declare class ProposalPolicyUnavailableError extends ActionProposalError {
    readonly code = "PROPOSAL_POLICY_UNAVAILABLE_ERROR";
}
export declare class ProposalDeniedError extends ActionProposalError {
    readonly code = "PROPOSAL_DENIED_ERROR";
}
export declare class ProposalApprovalRequiredError extends ActionProposalError {
    readonly code = "PROPOSAL_APPROVAL_REQUIRED_ERROR";
}
export declare class ProposalPEPDenyError extends ActionProposalError {
    readonly code = "PROPOSAL_PEP_DENY_ERROR";
}
export declare class ProposalSourceCorruptedError extends ActionProposalError {
    readonly code = "PROPOSAL_SOURCE_CORRUPTED_ERROR";
}
export declare class ProposalSecurityViolationError extends ActionProposalError {
    readonly code = "PROPOSAL_SECURITY_VIOLATION_ERROR";
}
