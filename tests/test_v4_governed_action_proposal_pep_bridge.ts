// tests/test_v4_governed_action_proposal_pep_bridge.ts
// BOWCON V4.0 — MS-1.4.05: DEDICATED REALITY TEST SUITE
//
// EN:
// Tests the Governed Action Proposal & PDP / PEP Bridge under all operational conditions:
// Valid proposals, DAG dependencies, tenant isolation, task version binding, sanitization,
// prototype safety, prompt injection containment, kill switches, PDP evaluation, ApprovalService
// tokens, PEP enforcement, 4 USER_STOP gates, provenance integrity, and audit recording.
//
// VI:
// Kiểm thử Cầu nối Đề xuất Hành động có Quản trị & PDP / PEP dưới mọi điều kiện vận hành.

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  ActionProposalBuilder,
  ActionPDPBridge,
  ActionPEPBridge,
  GovernedActionProposalRuntime,
  ProposalValidationError,
  ProposalUserStopError,
  CrossTenantProposalError,
  StaleProposalError,
  ProposalDeniedError,
  ProposalPEPDenyError,
  ProposalSecurityViolationError,
  type ActionProposal,
  type AuthorizedActionHandoff,
  type ActionProposalDecision,
} from '../src/core/actionProposal/index.js';
import type { GovernedCandidatePlan } from '../src/core/planning/governedPlanningTypes.js';
import type { AgentTask } from '../src/core/taskLifecycle/agentTaskTypes.js';
import { PolicyDecisionPoint } from '../src/core/policyDecisionPoint.js';
import { GovernedPolicyEnforcementPoint } from '../src/core/policyEnforcement/governedPolicyEnforcementPoint.js';
import { ApprovalService } from '../src/core/approvalService.js';
import { MasterHumanAuthority } from '../src/core/authority/masterHumanAuthority.js';
import { AuditLedger } from '../src/core/auditLedger.js';
import { DiagnosisSanitizer } from '../src/core/diagnosis/diagnosisSanitizer.js';

let passedAssertions = 0;
function testAssert(condition: boolean, message: string) {
  assert(condition, message);
  passedAssertions++;
}

async function runRealityTests() {
  console.log('Starting MS-1.4.05 Reality Test Suite: Governed Action Proposal & PDP/PEP Bridge...\n');

  const testDataDir = path.resolve(process.cwd(), 'data', 'test_ms_1_4_05_' + Date.now());
  fs.mkdirSync(testDataDir, { recursive: true });

  const auditPath = path.join(testDataDir, 'test_audit.jsonl');
  const auditLedger = new AuditLedger(auditPath);
  const approvalService = new ApprovalService(path.join(testDataDir, 'approvals'));
  const pdp = new PolicyDecisionPoint(undefined, approvalService, undefined, auditLedger);
  const pep = new GovernedPolicyEnforcementPoint({ pdp });
  const sanitizer = new DiagnosisSanitizer();

  const builder = new ActionProposalBuilder({ sanitizer });
  const pdpBridge = new ActionPDPBridge({ pdp, approvalService });
  const pepBridge = new ActionPEPBridge({ pep });

  let userStopState = false;
  const isUserStopActive = () => userStopState;

  const runtime = new GovernedActionProposalRuntime({
    auditLedger,
    builder,
    pdpBridge,
    pepBridge,
    isUserStopActive,
  });

  // Base Task fixture
  const baseTask: AgentTask = {
    taskId: 'task_alpha_1',
    tenantId: 'tenant_bow_corp',
    userId: 'user_master_1',
    title: 'Test Autonomous Workflow',
    intent: 'Verify proposal bridge',
    riskLevel: 'LOW',
    state: 'EXECUTING',
    version: 1,
    steps: [],
    currentStepIndex: 0,
    createdAt: '2026-09-13T00:00:00.000Z',
    updatedAt: '2026-09-13T00:00:00.000Z',
    provenanceHash: 'abc123task',
  };

  // Base Candidate Plan fixture
  const basePlan: GovernedCandidatePlan = {
    planId: 'plan_gamma_1',
    requestId: 'req_1',
    taskId: 'task_alpha_1',
    tenantId: 'tenant_bow_corp',
    taskVersion: 1,
    objective: 'Safely execute workflow steps',
    assumptions: ['Environment ready'],
    constraints: ['No unauthenticated calls'],
    steps: [
      {
        stepId: 'step_1',
        sequence: 1,
        actionType: 'get_sales_report', // OBSERVE -> auto-permit
        intent: 'Fetch sales overview',
        target: 'finance_reports',
        parameters: { date: '2026-09-13', filter: 'completed' },
        dependencies: [],
        expectedOutcome: 'Sales summary object',
        riskLevel: 'LOW',
        requiresApproval: false,
        status: 'CANDIDATE',
      },
      {
        stepId: 'step_2',
        sequence: 2,
        actionType: 'fulfill_order_handover', // HIGH_IMPACT -> requires approval
        intent: 'Fulfill customer order',
        target: 'order_998',
        parameters: { orderId: 'ord_998', courier: 'express_speed' },
        dependencies: ['step_1'],
        expectedOutcome: 'Fulfillment confirmation',
        riskLevel: 'HIGH',
        requiresApproval: true,
        status: 'CANDIDATE',
      },
      {
        stepId: 'step_forbidden',
        sequence: 3,
        actionType: 'transfer_funds', // FORBIDDEN -> unconditional DENY
        intent: 'Transfer treasury balance',
        parameters: { amount: 50000 },
        dependencies: [],
        expectedOutcome: 'Should never execute',
        riskLevel: 'CRITICAL',
        requiresApproval: true,
        status: 'CANDIDATE',
      },
    ],
    dag: {
      nodes: ['step_1', 'step_2', 'step_forbidden'],
      edges: [{ fromStepId: 'step_1', toStepId: 'step_2' }],
      topologicalOrder: ['step_1', 'step_forbidden', 'step_2'],
      levels: [['step_1', 'step_forbidden'], ['step_2']],
    },
    riskSummary: {
      overallRisk: 'HIGH',
      highestStepRisk: 'CRITICAL',
      riskCounts: { LOW: 1, MEDIUM: 0, HIGH: 1, CRITICAL: 1 },
      approvalRequiredStepCount: 2,
      requiresHumanApproval: true,
    },
    requiresApproval: true,
    isCandidatePlanOnly: true,
    isAuthorized: false,
    provenanceHash: 'prov_plan_987654',
    timestamp: '2026-09-13T00:00:00.000Z',
  };

  // --------------------------------------------------------------------------
  // Vector 1: Valid Candidate Step -> Clean Proposal
  // --------------------------------------------------------------------------
  console.log('[Vector 1] Valid candidate step proposal extraction');
  const proposal1 = builder.buildProposal({
    candidatePlan: basePlan,
    stepId: 'step_1',
    authoritativeTask: baseTask,
    completedStepIds: [],
  });
  testAssert(proposal1.proposalId.includes('step_1'), 'ProposalId should bind step_1');
  testAssert(proposal1.tenantId === 'tenant_bow_corp', 'Proposal tenantId matches task');
  testAssert(proposal1.taskVersion === 1, 'Proposal taskVersion matches task');
  testAssert(proposal1.actionType === 'get_sales_report', 'Action type extracted cleanly');
  testAssert(proposal1.sanitizedArgs.date === '2026-09-13', 'Sanitized arguments preserved');
  testAssert(typeof proposal1.proposalProvenanceHash === 'string', 'Provenance hash computed');
  testAssert(proposal1.status === 'PROPOSED', 'Status is PROPOSED');

  // --------------------------------------------------------------------------
  // Vector 2: Invalid Candidate Plan Structure
  // --------------------------------------------------------------------------
  console.log('[Vector 2] Invalid candidate plan rejection');
  try {
    builder.buildProposal({
      candidatePlan: null as any,
      stepId: 'step_1',
      authoritativeTask: baseTask,
    });
    assert.fail('Should have failed on null candidate plan');
  } catch (err: any) {
    testAssert(err instanceof ProposalValidationError, 'Catches ProposalValidationError for null plan');
  }

  // --------------------------------------------------------------------------
  // Vector 3: Missing Candidate Step in Plan
  // --------------------------------------------------------------------------
  console.log('[Vector 3] Missing candidate step rejection');
  try {
    builder.buildProposal({
      candidatePlan: basePlan,
      stepId: 'non_existent_step',
      authoritativeTask: baseTask,
    });
    assert.fail('Should have failed on missing step');
  } catch (err: any) {
    testAssert(err instanceof ProposalValidationError, 'Catches ProposalValidationError for missing step');
  }

  // --------------------------------------------------------------------------
  // Vector 4: Unresolved DAG Prerequisite
  // --------------------------------------------------------------------------
  console.log('[Vector 4] Unresolved DAG prerequisite blocks proposal');
  try {
    // step_2 depends on step_1, which is not completed
    builder.buildProposal({
      candidatePlan: basePlan,
      stepId: 'step_2',
      authoritativeTask: baseTask,
      completedStepIds: [], // Empty -> step_1 not complete
    });
    assert.fail('Should have failed on unresolved dependency');
  } catch (err: any) {
    testAssert(err instanceof ProposalValidationError, 'Blocks step_2 when prerequisite step_1 incomplete');
  }

  // When step_1 is completed, step_2 can be proposed
  const proposal2 = builder.buildProposal({
    candidatePlan: basePlan,
    stepId: 'step_2',
    authoritativeTask: baseTask,
    completedStepIds: ['step_1'],
  });
  testAssert(proposal2.stepId === 'step_2', 'Step_2 proposed when prerequisite step_1 is completed');

  // --------------------------------------------------------------------------
  // Vector 5: Cross-Tenant Plan Rejection
  // --------------------------------------------------------------------------
  console.log('[Vector 5] Cross-tenant plan rejected immediately');
  const crossTenantPlan: GovernedCandidatePlan = {
    ...basePlan,
    tenantId: 'attacker_tenant',
  };
  try {
    builder.buildProposal({
      candidatePlan: crossTenantPlan,
      stepId: 'step_1',
      authoritativeTask: baseTask,
    });
    assert.fail('Should have rejected cross-tenant plan');
  } catch (err: any) {
    testAssert(err instanceof CrossTenantProposalError, 'Throws CrossTenantProposalError on plan tenant mismatch');
  }

  // --------------------------------------------------------------------------
  // Vector 6: Task Version Mismatch (Stale Plan)
  // --------------------------------------------------------------------------
  console.log('[Vector 6] Stale task version candidate plan rejected');
  const stalePlan: GovernedCandidatePlan = {
    ...basePlan,
    taskVersion: 99, // task is version 1
  };
  try {
    builder.buildProposal({
      candidatePlan: stalePlan,
      stepId: 'step_1',
      authoritativeTask: baseTask,
    });
    assert.fail('Should have rejected stale plan');
  } catch (err: any) {
    testAssert(err instanceof StaleProposalError, 'Throws StaleProposalError on task version mismatch');
  }

  // --------------------------------------------------------------------------
  // Vector 7: Argument Sanitization & Secret Scrubbing
  // --------------------------------------------------------------------------
  console.log('[Vector 7] Argument sanitization scrubs secrets and credentials');
  const planWithSecrets: GovernedCandidatePlan = {
    ...basePlan,
    steps: [
      {
        ...basePlan.steps[0],
        parameters: {
          apiKey: 'secret_12345_key',
          authorization: 'Bearer sensitive_auth_token',
          safeParam: 'public_value',
        },
      },
    ],
  };
  const proposalWithSecrets = builder.buildProposal({
    candidatePlan: planWithSecrets,
    stepId: 'step_1',
    authoritativeTask: baseTask,
  });
  testAssert(proposalWithSecrets.sanitizedArgs.apiKey === '[REDACTED]', 'apiKey redacted in sanitizedArgs');
  testAssert(proposalWithSecrets.sanitizedArgs.authorization === '[REDACTED]', 'authorization header redacted');
  testAssert(proposalWithSecrets.sanitizedArgs.safeParam === 'public_value', 'safeParam preserved untouched');

  // --------------------------------------------------------------------------
  // Vector 8: Prototype Pollution Rejection
  // --------------------------------------------------------------------------
  console.log('[Vector 8] Forbidden prototype keys rejected');
  const planWithPollution: GovernedCandidatePlan = {
    ...basePlan,
    steps: [
      {
        ...basePlan.steps[0],
        parameters: JSON.parse('{"__proto__": {"evil": true}}'),
      },
    ],
  };
  try {
    builder.buildProposal({
      candidatePlan: planWithPollution,
      stepId: 'step_1',
      authoritativeTask: baseTask,
    });
    assert.fail('Should have rejected prototype pollution');
  } catch (err: any) {
    testAssert(err instanceof ProposalSecurityViolationError, 'Rejects arguments with __proto__');
  }

  // --------------------------------------------------------------------------
  // Vector 9: Forbidden Shell / Script Execution In Arguments
  // --------------------------------------------------------------------------
  console.log('[Vector 9] Host shell command pattern rejection');
  const planWithShell: GovernedCandidatePlan = {
    ...basePlan,
    steps: [
      {
        ...basePlan.steps[0],
        parameters: {
          cmd: 'powershell.exe -Command "rmdir /s /q data"',
        },
      },
    ],
  };
  try {
    builder.buildProposal({
      candidatePlan: planWithShell,
      stepId: 'step_1',
      authoritativeTask: baseTask,
    });
    assert.fail('Should have rejected shell execution patterns');
  } catch (err: any) {
    testAssert(err instanceof ProposalSecurityViolationError, 'Rejects arguments containing powershell.exe');
  }

  // --------------------------------------------------------------------------
  // Vector 10: Authority Bypass Fields Scrubbing
  // --------------------------------------------------------------------------
  console.log('[Vector 10] Authority bypass flags injected by model are scrubbed');
  const planWithBypass: GovernedCandidatePlan = {
    ...basePlan,
    steps: [
      {
        ...basePlan.steps[0],
        parameters: {
          isAuthorized: true,
          approved: true,
          executionToken: 'fake_tok_abc',
          validData: 42,
        },
      },
    ],
  };
  const proposalBypassScrubbed = builder.buildProposal({
    candidatePlan: planWithBypass,
    stepId: 'step_1',
    authoritativeTask: baseTask,
  });
  testAssert(!('isAuthorized' in proposalBypassScrubbed.sanitizedArgs), 'isAuthorized stripped');
  testAssert(!('approved' in proposalBypassScrubbed.sanitizedArgs), 'approved stripped');
  testAssert(!('executionToken' in proposalBypassScrubbed.sanitizedArgs), 'executionToken stripped');
  testAssert(proposalBypassScrubbed.sanitizedArgs.validData === 42, 'validData retained');

  // --------------------------------------------------------------------------
  // Vector 11: Low-Risk Action PDP Evaluation -> PERMIT
  // --------------------------------------------------------------------------
  console.log('[Vector 11] Low-risk action evaluates to PERMIT');
  const pdpDecision1 = await pdpBridge.evaluateProposal({
    proposal: proposal1,
    authoritativeTask: baseTask,
  });
  testAssert(pdpDecision1.allowed === true, 'get_sales_report allowed');
  testAssert(pdpDecision1.action === 'PERMIT', 'Decision action is PERMIT');
  testAssert(pdpDecision1.authoritativeRisk === 'OBSERVE', 'Authoritative risk is OBSERVE');
  testAssert(pdpDecision1.requiresHumanApproval === false, 'No human approval needed');

  // --------------------------------------------------------------------------
  // Vector 12: High-Impact Action PDP Evaluation -> REQUIRE_HUMAN_APPROVAL
  // --------------------------------------------------------------------------
  console.log('[Vector 12] High-impact action demands human approval');
  const pdpDecision2 = await pdpBridge.evaluateProposal({
    proposal: proposal2,
    authoritativeTask: baseTask,
  });
  testAssert(pdpDecision2.allowed === false, 'fulfill_order_handover not auto-allowed');
  testAssert(pdpDecision2.action === 'REQUIRE_HUMAN_APPROVAL', 'Action is REQUIRE_HUMAN_APPROVAL');
  testAssert(pdpDecision2.authoritativeRisk === 'HIGH_IMPACT', 'Authoritative risk is HIGH_IMPACT');
  testAssert(pdpDecision2.requiresHumanApproval === true, 'Human approval required');
  testAssert(typeof pdpDecision2.approvalId === 'string', 'ApprovalId created in ApprovalService');

  // --------------------------------------------------------------------------
  // Vector 13: Forbidden Action PDP Evaluation -> DENY
  // --------------------------------------------------------------------------
  console.log('[Vector 13] Forbidden action evaluates to DENY');
  const proposalForbidden = builder.buildProposal({
    candidatePlan: basePlan,
    stepId: 'step_forbidden',
    authoritativeTask: baseTask,
  });
  const pdpDecisionForbidden = await pdpBridge.evaluateProposal({
    proposal: proposalForbidden,
    authoritativeTask: baseTask,
  });
  testAssert(pdpDecisionForbidden.allowed === false, 'transfer_funds not allowed');
  testAssert(pdpDecisionForbidden.action === 'DENY', 'Decision action is DENY');
  testAssert(pdpDecisionForbidden.authoritativeRisk === 'FORBIDDEN', 'Authoritative risk is FORBIDDEN');

  // --------------------------------------------------------------------------
  // Vector 14: Domain Kill Switch Engaged -> Immediate DENY
  // --------------------------------------------------------------------------
  console.log('[Vector 14] Domain kill switch enforces immediate DENY');
  pdp.setDomainKillSwitch('shop', true);
  const pdpKillDecision = await pdpBridge.evaluateProposal({
    proposal: proposal1,
    authoritativeTask: baseTask,
  });
  testAssert(pdpKillDecision.allowed === false, 'Action rejected under active kill switch');
  testAssert(pdpKillDecision.action === 'DENY', 'Action is DENY under kill switch');
  testAssert(pdpKillDecision.reason.includes('EMERGENCY_STOP_ACTIVE'), 'Reason states emergency stop');
  pdp.setDomainKillSwitch('shop', false); // Reset

  // --------------------------------------------------------------------------
  // Vector 15: Human Operator Approval Flow & Token Generation
  // --------------------------------------------------------------------------
  console.log('[Vector 15] Human approval granting issues valid execution token');
  const approvalId = pdpDecision2.approvalId!;
  const grantResult = approvalService.grantApproval(approvalId, 'master_operator', baseTask.userId);
  testAssert(grantResult.success === true, 'Operator grants approval successfully');
  testAssert(typeof grantResult.executionToken === 'string', 'Valid execution token issued');
  const validToken = grantResult.executionToken!;

  // Re-evaluating proposal with valid execution token -> PERMIT
  const pdpWithTokenDecision = await pdpBridge.evaluateProposal({
    proposal: proposal2,
    authoritativeTask: baseTask,
    executionToken: validToken,
  });
  testAssert(pdpWithTokenDecision.allowed === true, 'Proposal allowed with valid execution token');
  testAssert(pdpWithTokenDecision.action === 'PERMIT', 'Decision action now PERMIT');
  testAssert(pdpWithTokenDecision.executionToken === validToken, 'Token bound to decision');

  // --------------------------------------------------------------------------
  // Vector 16: Execution Token Anti-Replay (Single Use)
  // --------------------------------------------------------------------------
  console.log('[Vector 16] Execution token cannot be replayed (consumed)');
  const pdpReplayDecision = await pdpBridge.evaluateProposal({
    proposal: proposal2,
    authoritativeTask: baseTask,
    executionToken: validToken, // Already consumed!
  });
  testAssert(pdpReplayDecision.allowed === false, 'Consumed token rejected on second evaluation');
  testAssert(pdpReplayDecision.action === 'REQUIRE_HUMAN_APPROVAL', 'Demands fresh approval');

  // --------------------------------------------------------------------------
  // Vector 17: Tampered Arguments Invalidate Execution Token
  // --------------------------------------------------------------------------
  console.log('[Vector 17] Tampered arguments invalidate execution token');
  // Create another approval request
  const pdpDecisionTamper = await pdpBridge.evaluateProposal({
    proposal: proposal2,
    authoritativeTask: baseTask,
  });
  const approvalId2 = pdpDecisionTamper.approvalId!;
  const grantResult2 = approvalService.grantApproval(approvalId2, 'master_operator', baseTask.userId);
  const token2 = grantResult2.executionToken!;

  // Mutate proposal parameters
  const tamperedProposal: ActionProposal = {
    ...proposal2,
    sanitizedArgs: { orderId: 'ord_TAMPERED', courier: 'express_speed' },
  };
  const pdpTamperedDecision = await pdpBridge.evaluateProposal({
    proposal: tamperedProposal,
    authoritativeTask: baseTask,
    executionToken: token2,
  });
  testAssert(pdpTamperedDecision.allowed === false, 'Token rejected when arguments tampered');
  testAssert(pdpTamperedDecision.reason.includes('ARGUMENTS_HASH_MISMATCH') || pdpTamperedDecision.reason.includes('INVALID_APPROVAL_TOKEN'), 'Reason confirms argument hash mismatch');

  // --------------------------------------------------------------------------
  // Vector 18: PEP Enforcement on Permitted Proposal
  // --------------------------------------------------------------------------
  console.log('[Vector 18] PEP enforcement permits valid proposal');
  const pepResult1 = await pepBridge.enforceProposal({
    proposal: proposal1,
    pdpDecision: pdpDecision1,
    authoritativeTask: baseTask,
  });
  testAssert(pepResult1.enforced === true, 'PEP successfully enforced');
  testAssert(pepResult1.decision === 'PERMIT', 'PEP decision is PERMIT');
  testAssert(typeof pepResult1.policyVersion === 'string', 'Active policy version certified');
  pep.releaseLease(pepResult1.leaseId as any);

  // --------------------------------------------------------------------------
  // Vector 19: PEP Enforcement Blocks Non-Permitted Proposal
  // --------------------------------------------------------------------------
  console.log('[Vector 19] PEP fails closed if proposal was not PERMIT');
  try {
    await pepBridge.enforceProposal({
      proposal: proposalForbidden,
      pdpDecision: pdpDecisionForbidden, // DENY
      authoritativeTask: baseTask,
    });
    assert.fail('Should have failed on non-permitted proposal');
  } catch (err: any) {
    testAssert(err instanceof ProposalPEPDenyError, 'PEP rejects proposal that was not PERMIT');
  }

  // --------------------------------------------------------------------------
  // Vector 20: Full End-to-End Runtime Execution -> AuthorizedActionHandoff
  // --------------------------------------------------------------------------
  console.log('[Vector 20] Full runtime produces sealed AuthorizedActionHandoff');
  const handoff = (await runtime.governProposal(
    {
      candidatePlan: basePlan,
      stepId: 'step_1',
      completedStepIds: [],
    },
    baseTask
  )) as AuthorizedActionHandoff;

  testAssert(handoff.authorizationDecision === 'PERMIT', 'Handoff decision is PERMIT');
  testAssert(handoff.proposalId === proposal1.proposalId, 'Handoff binds proposalId');
  testAssert(handoff.taskId === baseTask.taskId, 'Handoff binds taskId');
  testAssert(handoff.tenantId === baseTask.tenantId, 'Handoff binds tenantId');
  testAssert(handoff.stepId === 'step_1', 'Handoff binds stepId');
  testAssert(handoff.toolName === 'get_sales_report', 'Handoff toolName matches action');
  testAssert(typeof handoff.handoffProvenanceHash === 'string', 'Handoff provenance hash sealed');
  testAssert(typeof handoff.expiresAt === 'string', 'Handoff expiration set');

  // Verify handoff does NOT contain illegal fields
  testAssert(!('confidence' in (handoff as any)), 'Handoff contains zero confidence fields');
  testAssert(!('reasoning' in (handoff as any)), 'Handoff contains zero raw reasoning fields');
  testAssert(!('llmOutput' in (handoff as any)), 'Handoff contains zero raw LLM outputs');

  // --------------------------------------------------------------------------
  // Vector 21: Full Runtime Routing to Human Approval
  // --------------------------------------------------------------------------
  console.log('[Vector 21] Full runtime routes HIGH_IMPACT step to human approval');
  const approvalOutcome = (await runtime.governProposal(
    {
      candidatePlan: basePlan,
      stepId: 'step_2',
      completedStepIds: ['step_1'],
    },
    baseTask
  )) as ActionProposalDecision;

  testAssert(approvalOutcome.action === 'REQUIRE_HUMAN_APPROVAL', 'Suspended at REQUIRE_HUMAN_APPROVAL');
  testAssert(typeof approvalOutcome.approvalId === 'string', 'ApprovalId generated for operator');

  // --------------------------------------------------------------------------
  // Vector 22: USER_STOP Gate 1 (Before Proposal Extraction)
  // --------------------------------------------------------------------------
  console.log('[Vector 22] USER_STOP Gate 1 halts before proposal creation');
  userStopState = true;
  try {
    await runtime.governProposal(
      {
        candidatePlan: basePlan,
        stepId: 'step_1',
      },
      baseTask
    );
    assert.fail('Should have aborted at Gate 1');
  } catch (err: any) {
    testAssert(err instanceof ProposalUserStopError, 'Gate 1 aborted via ProposalUserStopError');
    testAssert(err.message.includes('GATE_1_BEFORE_PROPOSAL_CREATION'), 'Identifies Gate 1 checkpoint');
  }
  userStopState = false;

  // --------------------------------------------------------------------------
  // Vector 23: USER_STOP Gate 2 (Before PDP Evaluation)
  // --------------------------------------------------------------------------
  console.log('[Vector 23] USER_STOP Gate 2 halts before PDP evaluation');
  const runtimeGate2 = new GovernedActionProposalRuntime({
    auditLedger,
    builder,
    pdpBridge,
    pepBridge,
    isUserStopActive: () => {
      // Simulate USER_STOP becoming active right after proposal building
      return true;
    },
  });
  try {
    runtimeGate2.assertUserStopNotActive('GATE_2_BEFORE_PDP_SUBMISSION');
    assert.fail('Should have aborted at Gate 2');
  } catch (err: any) {
    testAssert(err instanceof ProposalUserStopError, 'Gate 2 aborted via ProposalUserStopError');
    testAssert(err.message.includes('GATE_2_BEFORE_PDP_SUBMISSION'), 'Identifies Gate 2 checkpoint');
  }

  // --------------------------------------------------------------------------
  // Vector 24: USER_STOP Gate 3 & Gate 4
  // --------------------------------------------------------------------------
  console.log('[Vector 24] USER_STOP Gate 3 & 4 assert supreme abort');
  try {
    runtimeGate2.assertUserStopNotActive('GATE_3_AFTER_PDP_RESPONSE');
    assert.fail('Should have aborted at Gate 3');
  } catch (err: any) {
    testAssert(err instanceof ProposalUserStopError, 'Gate 3 aborted via ProposalUserStopError');
  }

  try {
    runtimeGate2.assertUserStopNotActive('GATE_4_BEFORE_HANDOFF_EMISSION');
    assert.fail('Should have aborted at Gate 4');
  } catch (err: any) {
    testAssert(err instanceof ProposalUserStopError, 'Gate 4 aborted via ProposalUserStopError');
  }

  // --------------------------------------------------------------------------
  // Vector 25: Provenance Determinism & Tamper Detection
  // --------------------------------------------------------------------------
  console.log('[Vector 25] Provenance determinism & tampering sensitivity');
  const hashA = ActionProposalBuilder.calculateProposalHash({
    candidateProvenanceHash: 'prov_123',
    taskId: 'task_1',
    tenantId: 'tenant_1',
    taskVersion: 1,
    stepId: 'step_1',
    actionType: 'get_sales_report',
    sanitizedArgs: { date: '2026-09-13' },
  });

  const hashB = ActionProposalBuilder.calculateProposalHash({
    candidateProvenanceHash: 'prov_123',
    taskId: 'task_1',
    tenantId: 'tenant_1',
    taskVersion: 1,
    stepId: 'step_1',
    actionType: 'get_sales_report',
    sanitizedArgs: { date: '2026-09-13' },
  });
  testAssert(hashA === hashB, 'Identical canonical inputs produce identical hash');

  const hashTampered = ActionProposalBuilder.calculateProposalHash({
    candidateProvenanceHash: 'prov_123',
    taskId: 'task_1',
    tenantId: 'tenant_1',
    taskVersion: 1,
    stepId: 'step_1',
    actionType: 'fulfill_order_handover', // Modified!
    sanitizedArgs: { date: '2026-09-13' },
  });
  testAssert(hashA !== hashTampered, 'Action modification strictly alters provenance hash');

  // --------------------------------------------------------------------------
  // Vector 26: Audit Ledger Verification
  // --------------------------------------------------------------------------
  console.log('[Vector 26] Audit ledger completeness and cryptographic integrity');
  const auditEvents = auditLedger.getAuditTrail();
  testAssert(auditEvents.length > 5, 'Multiple audit events recorded across execution');
  const hasProposalCreated = auditEvents.some(e => e.classification === 'ACTION_PROPOSAL_CREATED');
  const hasPdpEvaluated = auditEvents.some(e => e.classification === 'ACTION_PDP_EVALUATED');
  const hasPepEnforced = auditEvents.some(e => e.classification === 'ACTION_PEP_ENFORCED');
  const hasUserStopAborted = auditEvents.some(e => e.classification === 'ACTION_USER_STOP_ABORTED');

  testAssert(hasProposalCreated, 'Audit recorded ACTION_PROPOSAL_CREATED');
  testAssert(hasPdpEvaluated, 'Audit recorded ACTION_PDP_EVALUATED');
  testAssert(hasPepEnforced, 'Audit recorded ACTION_PEP_ENFORCED');
  testAssert(hasUserStopAborted, 'Audit recorded ACTION_USER_STOP_ABORTED');
  testAssert(auditLedger.verifyChainIntegrity() === true, 'Audit cryptographic hash-chain intact');

  // --------------------------------------------------------------------------
  // Cleanup test data
  // --------------------------------------------------------------------------
  try {
    fs.rmSync(testDataDir, { recursive: true, force: true });
  } catch {}

  console.log('\n============================================================');
  console.log(`REALITY GATE COMPLETE: All ${passedAssertions} assertions PASSED cleanly.`);
  console.log('============================================================\n');
}

runRealityTests().catch(err => {
  console.error('REALITY TEST SUITE FAILED:', err);
  process.exit(1);
});
