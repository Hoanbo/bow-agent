// src/core/actionProposal/actionProposalBuilder.ts
// BOWCON V4.0 — MS-1.4.05: ACTION PROPOSAL BUILDER
//
// EN:
// Extracts, validates, and deeply sanitizes candidate steps from a GovernedCandidatePlan
// into an immutable, tenant-bound, and version-bound ActionProposal.
//
// VI:
// Trích xuất, xác thực và làm sạch sâu các bước ứng viên từ GovernedCandidatePlan
// thành một ActionProposal bất biến, ràng buộc tenant và ràng buộc phiên bản.
//
// Invariants:
// - LLM_OUTPUT != AUTHORITY
// - LLM_PROPOSAL != EXECUTION
// - CONFIDENCE != AUTHORIZATION
// - PLAN != EXECUTION
// - ZERO_TOOL_EXECUTION
// - ZERO_PROTOTYPE_POLLUTION
// - STRICT_TENANT_ISOLATION
// - STRICT_TASK_VERSION_BINDING

import crypto from 'node:crypto';
import type { AgentTask } from '../taskLifecycle/agentTaskTypes.js';
import type { GovernedCandidatePlan, GovernedCandidateStep } from '../planning/governedPlanningTypes.js';
import { DiagnosisSanitizer, globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import {
  type ActionProposal,
  ProposalValidationError,
  CrossTenantProposalError,
  StaleProposalError,
  ProposalSecurityViolationError,
} from './actionProposalTypes.js';

export const FORBIDDEN_PROTOTYPE_KEYS = ['__proto__', 'prototype', 'constructor'] as const;

export const FORBIDDEN_SHELL_PATTERNS = [
  'cmd.exe',
  'powershell.exe',
  '/bin/sh',
  '/bin/bash',
  'execSync',
  'child_process',
  'eval(',
  'new Function',
  'spawn(',
  'fork(',
] as const;

export const MAX_ARGUMENT_PAYLOAD_BYTES = 65536; // 64 KB

export interface ActionProposalBuilderOptions {
  readonly sanitizer?: DiagnosisSanitizer;
  readonly deterministicTimestamp?: string;
}

export class ActionProposalBuilder {
  private readonly sanitizer: DiagnosisSanitizer;
  private readonly deterministicTimestamp?: string;

  constructor(options?: ActionProposalBuilderOptions) {
    this.sanitizer = options?.sanitizer ?? globalDiagnosisSanitizer;
    this.deterministicTimestamp = options?.deterministicTimestamp;
  }

  /**
   * Deterministically canonicalizes a JSON structure for hashing.
   */
  public static canonicalJson(obj: unknown): string {
    if (obj === null || typeof obj !== 'object') {
      return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
      return `[${obj.map(item => ActionProposalBuilder.canonicalJson(item)).join(',')}]`;
    }
    const keys = Object.keys(obj as Record<string, unknown>).sort();
    const parts = keys.map(
      key => `${JSON.stringify(key)}:${ActionProposalBuilder.canonicalJson((obj as Record<string, unknown>)[key])}`
    );
    return `{${parts.join(',')}}`;
  }

  /**
   * Calculates the deterministic SHA-256 provenance hash for an ActionProposal.
   */
  public static calculateProposalHash(params: {
    candidateProvenanceHash: string;
    taskId: string;
    tenantId: string;
    taskVersion: number;
    stepId: string;
    actionType: string;
    sanitizedArgs: Record<string, unknown>;
  }): string {
    const raw = [
      params.candidateProvenanceHash,
      params.taskId,
      params.tenantId,
      params.taskVersion.toString(),
      params.stepId,
      params.actionType,
      ActionProposalBuilder.canonicalJson(params.sanitizedArgs),
    ].join('|');

    return crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
  }

  /**
   * Extracts and builds an ActionProposal from a candidate plan and step.
   */
  public buildProposal(params: {
    candidatePlan: GovernedCandidatePlan;
    stepId: string;
    authoritativeTask: AgentTask;
    completedStepIds?: readonly string[];
  }): ActionProposal {
    const { candidatePlan, stepId, authoritativeTask, completedStepIds = [] } = params;

    // 1. Candidate Plan Structural Integrity
    if (!candidatePlan || !candidatePlan.planId || !Array.isArray(candidatePlan.steps)) {
      throw new ProposalValidationError('INVALID_CANDIDATE_PLAN: Candidate plan is missing or malformed.');
    }

    // 2. Authoritative Tenant Isolation Check
    if (candidatePlan.tenantId !== authoritativeTask.tenantId) {
      throw new CrossTenantProposalError(
        `CROSS_TENANT_MISMATCH: Candidate plan tenant "${candidatePlan.tenantId}" does not match task tenant "${authoritativeTask.tenantId}".`,
        { candidateTenantId: candidatePlan.tenantId, taskTenantId: authoritativeTask.tenantId }
      );
    }

    // 3. Authoritative Task Binding Check
    if (candidatePlan.taskId !== authoritativeTask.taskId) {
      throw new ProposalValidationError(
        `TASK_ID_MISMATCH: Candidate plan task "${candidatePlan.taskId}" does not match authoritative task "${authoritativeTask.taskId}".`,
        { candidateTaskId: candidatePlan.taskId, authoritativeTaskId: authoritativeTask.taskId }
      );
    }

    // 4. Authoritative Task Version Staleness Check
    if (candidatePlan.taskVersion !== authoritativeTask.version) {
      throw new StaleProposalError(
        `STALE_CANDIDATE_PLAN: Candidate plan version ${candidatePlan.taskVersion} does not match authoritative task version ${authoritativeTask.version}.`,
        { candidateTaskVersion: candidatePlan.taskVersion, authoritativeTaskVersion: authoritativeTask.version }
      );
    }

    // 5. Candidate Step Resolution
    const candidateStep = candidatePlan.steps.find((s: GovernedCandidateStep) => s.stepId === stepId);
    if (!candidateStep) {
      throw new ProposalValidationError(
        `STEP_NOT_FOUND: Step "${stepId}" was not found in candidate plan "${candidatePlan.planId}".`,
        { stepId, planId: candidatePlan.planId }
      );
    }

    // 6. DAG Dependency Check
    this.verifyDependencies(candidateStep, completedStepIds, candidatePlan);

    // 7. Parameter & Argument Security Validation
    this.assertSecurityBounds(candidateStep.parameters);

    // 8. Deep Argument Sanitization (Scrub tokens, credentials, and sensitive headers)
    const sanitizedArgs = this.sanitizer.sanitize(candidateStep.parameters) as Record<string, unknown>;

    // 9. Cleanse any illegal authority/bypass properties
    this.scrubAuthorityBypassFields(sanitizedArgs);

    // 10. Generate Proposal ID and Provenance Hash
    const timestamp = this.deterministicTimestamp || new Date().toISOString();
    const proposalId = `prop_${candidatePlan.taskId}_${candidateStep.stepId}_v${authoritativeTask.version}`;

    const proposalProvenanceHash = ActionProposalBuilder.calculateProposalHash({
      candidateProvenanceHash: candidatePlan.provenanceHash || '',
      taskId: authoritativeTask.taskId,
      tenantId: authoritativeTask.tenantId,
      taskVersion: authoritativeTask.version,
      stepId: candidateStep.stepId,
      actionType: candidateStep.actionType,
      sanitizedArgs,
    });

    return {
      proposalId,
      taskId: authoritativeTask.taskId,
      tenantId: authoritativeTask.tenantId,
      taskVersion: authoritativeTask.version,
      createdAt: timestamp,
      candidatePlanId: candidatePlan.planId,
      stepId: candidateStep.stepId,
      sequenceIndex: candidateStep.sequence,
      actionType: candidateStep.actionType,
      targetResource: candidateStep.target,
      sanitizedArgs: Object.freeze(sanitizedArgs),
      proposedRisk: candidateStep.riskLevel,
      candidateProvenanceHash: candidatePlan.provenanceHash || '',
      proposalProvenanceHash,
      status: 'PROPOSED',
    };
  }

  /**
   * Verifies that all prerequisites of the candidate step are already resolved.
   */
  private verifyDependencies(
    step: GovernedCandidateStep,
    completedStepIds: readonly string[],
    plan: GovernedCandidatePlan
  ): void {
    if (!step.dependencies || step.dependencies.length === 0) {
      return;
    }

    const completedSet = new Set(completedStepIds);
    for (const depId of step.dependencies) {
      if (!completedSet.has(depId)) {
        throw new ProposalValidationError(
          `UNRESOLVED_DEPENDENCY: Step "${step.stepId}" depends on prerequisite "${depId}" which has not completed.`,
          { stepId: step.stepId, missingDependency: depId, completedStepIds }
        );
      }
    }
  }

  /**
   * Enforces argument payload size bounds, prototype safety, and forbidden shell commands.
   */
  private assertSecurityBounds(params: Record<string, unknown>): void {
    if (!params || typeof params !== 'object') {
      return;
    }

    const serialized = JSON.stringify(params);
    if (Buffer.byteLength(serialized, 'utf8') > MAX_ARGUMENT_PAYLOAD_BYTES) {
      throw new ProposalSecurityViolationError(
        `PAYLOAD_SIZE_EXCEEDED: Proposed arguments exceed maximum allowed payload of ${MAX_ARGUMENT_PAYLOAD_BYTES} bytes.`
      );
    }

    this.checkPrototypePollution(params, serialized);
    this.checkForbiddenShellExecution(serialized);
  }

  /**
   * Recursively verifies that forbidden prototype pollution keys do not exist.
   */
  private checkPrototypePollution(obj: unknown, rawString?: string): void {
    if (rawString) {
      for (const key of FORBIDDEN_PROTOTYPE_KEYS) {
        // Look for "__proto__", "prototype", "constructor" as json keys
        const regex = new RegExp(`["']${key}["']\\s*:`, 'i');
        if (regex.test(rawString)) {
          throw new ProposalSecurityViolationError(
            `PROTOTYPE_POLLUTION_DETECTED: Forbidden prototype key "${key}" detected in arguments.`
          );
        }
      }
    }

    if (!obj || typeof obj !== 'object') return;

    if (Array.isArray(obj)) {
      for (const item of obj) this.checkPrototypePollution(item);
      return;
    }

    const propNames = Object.getOwnPropertyNames(obj);
    for (const key of propNames) {
      if (FORBIDDEN_PROTOTYPE_KEYS.includes(key as any)) {
        throw new ProposalSecurityViolationError(
          `PROTOTYPE_POLLUTION_DETECTED: Forbidden prototype key "${key}" detected in arguments.`
        );
      }
      this.checkPrototypePollution((obj as Record<string, unknown>)[key]);
    }
  }

  /**
   * Verifies that raw parameters do not contain forbidden host shell patterns.
   */
  private checkForbiddenShellExecution(serialized: string): void {
    const lower = serialized.toLowerCase();
    for (const pattern of FORBIDDEN_SHELL_PATTERNS) {
      if (lower.includes(pattern.toLowerCase())) {
        throw new ProposalSecurityViolationError(
          `FORBIDDEN_EXECUTION_PRIMITIVE: Arguments contain prohibited execution pattern "${pattern}".`
        );
      }
    }
  }

  /**
   * Removes any self-authorized or bypass attributes injected by an untrusted source.
   */
  private scrubAuthorityBypassFields(args: Record<string, unknown>): void {
    const bypassFields = [
      'isAuthorized',
      'authorized',
      'approved',
      'policyChecked',
      'executionToken',
      'bypassPDP',
      'bypassPEP',
      'forceAllow',
      'skipApproval',
    ];

    for (const field of bypassFields) {
      if (field in args) {
        delete args[field];
      }
    }
  }
}
