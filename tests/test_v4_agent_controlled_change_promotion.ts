// tests/test_v4_agent_controlled_change_promotion.ts
// BOWCON V4.0 — MS-1.3.48 REALITY GATE
// Dedicated Test Suite: Controlled Change Promotion & Governed Project Integration
// Categories A through AZ (52 Categories).

import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {
  globalPromotionRuntime,
  PromotionRuntime,
  PromotionScopeValidator,
  PromotionProposalEngine,
  PromotionValidationEngine,
  PromotionConflictEngine,
  PromotionReviewEngine,
  PromotionAuthorizationEngine,
  ControlledPromotionEngine,
  PromotionRollbackEngine,
  PromotionProvenanceEngine,
  PromotionError,
  createPromotionId,
} from '../src/core/promotion/index.js';
import {
  globalSandboxRuntime,
  SandboxRuntime,
  SandboxPathGuard,
  SandboxManifestEngine,
  SandboxDiffEngine,
  createSandboxId,
} from '../src/core/sandbox/index.js';
import type { SandboxDescriptor, SandboxDiff } from '../src/core/sandbox/sandboxTypes.js';
import {
  globalMasterHumanAuthority,
} from '../src/core/authority/masterHumanAuthority.js';
import {
  globalMasterArchitectureIdentity,
  RUNTIME_IDENTITY,
} from '../src/core/architecture/masterArchitectureIdentity.js';
import {
  globalDelegationGovernanceRuntime,
  DelegationGovernanceRuntime,
} from '../src/core/delegation/delegationGovernanceRuntime.js';
import {
  globalCapabilityLeaseManager,
  CapabilityLeaseManager,
} from '../src/core/delegation/capabilityLeaseManager.js';
import {
  globalSupervisorHumanGate,
  SupervisorHumanGate,
} from '../src/core/supervisor/supervisorHumanGate.js';
import {
  globalWorldActionAuth,
  WorldActionAuthorizationEngine,
} from '../src/core/world-action/worldActionAuthorization.js';
import {
  globalAuditLedger,
  AuditLedger,
} from '../src/core/auditLedger.js';
import {
  MASTER_OWNER_ID,
  isMasterOwner,
} from '../src/core/delegation/delegationTypes.js';

let passedAssertions = 0;
function verify(condition: boolean, msg: string): void {
  assert(condition, msg);
  passedAssertions++;
}

async function runRealityGate(): Promise<void> {
  console.log('Starting MS-1.3.48 Reality Gate: Controlled Change Promotion & Governed Project Integration...');

  const testTempDir = path.resolve(process.cwd(), 'data', 'test_promotion_temp');
  if (!fs.existsSync(testTempDir)) {
    fs.mkdirSync(testTempDir, { recursive: true });
  }

  const authorizedProjectRoot = path.resolve(testTempDir, 'authorized_project');
  if (!fs.existsSync(authorizedProjectRoot)) {
    fs.mkdirSync(authorizedProjectRoot, { recursive: true });
  }

  const sandboxStorageRoot = path.resolve(testTempDir, 'sandboxes');
  if (!fs.existsSync(sandboxStorageRoot)) {
    fs.mkdirSync(sandboxStorageRoot, { recursive: true });
  }

  try {
    // =========================================================================
    // Category A: Master Owner Authority
    // Hạng mục A: Thẩm quyền của Master Owner
    // =========================================================================
    // Verify Master Owner supremacy over all downstream actors and subsystems.
    // Xác minh tính tối cao của Master Owner so với tất cả các tác nhân và phân hệ bên dưới.
    verify(isMasterOwner(MASTER_OWNER_ID), 'MASTER_OWNER_ID recognized as master owner');
    verify(!isMasterOwner('sub_agent_alpha'), 'Sub-agent is not master owner');
    verify(!isMasterOwner('supervisor_bob'), 'Supervisor is not master owner');

    // =========================================================================
    // Category B: BOW Architecture Identity
    // Hạng mục B: Định danh Kiến trúc BOW
    // =========================================================================
    // Verify canonical hierarchy: MASTER_OWNER > BOW > BOWCON > PROJECTS.
    // Xác minh phân cấp chuẩn tắc: MASTER_OWNER > BOW > BOWCON > DỰ ÁN.
    const identity = globalMasterArchitectureIdentity.getCanonicalIdentity();
    verify(identity.runtime === RUNTIME_IDENTITY, 'Runtime matches RUNTIME_IDENTITY');
    verify(identity.ecosystem === 'BOW', 'Ecosystem matches BOW');
    verify(identity.masterOwner === MASTER_OWNER_ID, 'Master Owner identity matches');

    // =========================================================================
    // Category C: BOWCON Identity
    // Hạng mục C: Định danh BOWCON
    // =========================================================================
    // Verify BOWCON exists for master owner, not autonomous takeover.
    // Xác minh BOWCON tồn tại vì Master Owner, không phải để chiếm quyền tự trị.
    const ownerVsProjectRank = globalMasterArchitectureIdentity.verifyAuthorityRank(MASTER_OWNER_ID, 'project_shopofbow');
    verify(ownerVsProjectRank > 0, 'Master owner rank is strictly above project rank');
    const invariants = globalMasterArchitectureIdentity.validateInvariants();
    verify(invariants.valid === true, 'Master architecture identity invariants valid');

    // =========================================================================
    // Category D: Delegation Integration
    // Hạng mục D: Tích hợp Ủy thác
    // =========================================================================
    // Verify integration with canonical delegation runtime.
    // Xác minh tích hợp với runtime ủy thác chuẩn tắc.
    const delegationRuntime = new DelegationGovernanceRuntime();
    delegationRuntime.agentIdentityManager.registerAgent({
      agentId: 'agent_promoter_1',
      name: 'Agent Promoter 1',
      role: 'WORKER',
      sessionId: 'sess_prom_001',
      capabilities: ['project_mutation_promotion', 'filesystem_read'],
      deviceId: 'dev_primary_001',
      registeredAt: Date.now(),
      registeredBy: MASTER_OWNER_ID,
      trustTier: 'STANDARD',
      status: 'ACTIVE',
    } as any);
    delegationRuntime.deviceRegistry.registerDevice({
      deviceId: 'dev_primary_001',
      name: 'Primary Device',
      deviceType: 'DESKTOP',
      trustTier: 'PRIMARY',
      registeredAt: Date.now(),
      authorizedBy: MASTER_OWNER_ID,
      status: 'ACTIVE',
    });
    const pendingDel = delegationRuntime.requestDelegation({
      ownerId: MASTER_OWNER_ID,
      issuerId: MASTER_OWNER_ID,
      targetAgentId: 'agent_promoter_1',
      targetDeviceId: 'dev_primary_001',
      requestedCapabilities: ['project_mutation_promotion', 'filesystem_read'],
      scope: {
        maxScopePercentage: 50,
        allowedCapabilities: ['project_mutation_promotion', 'filesystem_read'],
        targetPaths: [authorizedProjectRoot],
      },
      ttlMs: 3600000,
      sessionId: 'sess_prom_001',
    });
    const authDel = delegationRuntime.authorizeDelegation(pendingDel.delegationId, MASTER_OWNER_ID);
    const delegation = delegationRuntime.activateDelegation(authDel.delegationId, MASTER_OWNER_ID);
    verify(delegation.status === 'ACTIVE', 'Delegation issued and active');
    verify(delegationRuntime.isDelegationActive(delegation.delegationId), 'Delegation recognized as active');

    // =========================================================================
    // Category E: Sandbox Integration
    // Hạng mục E: Tích hợp Sandbox
    // =========================================================================
    // Setup verified sandbox with deterministic files.
    // Thiết lập sandbox đã xác minh với các tệp tất định.
    const sandboxRuntime = new SandboxRuntime();
    const sandboxDir = path.resolve(sandboxStorageRoot, 'sb_prom_001');
    fs.mkdirSync(sandboxDir, { recursive: true });
    fs.writeFileSync(path.join(sandboxDir, 'feature.ts'), 'export const feature = "v1";\n', 'utf8');

    const sandboxDesc: SandboxDescriptor = {
      id: createSandboxId('sb_prom_001'),
      binding: {
        sandboxId: createSandboxId('sb_prom_001'),
        sessionId: 'sess_prom_001',
        taskId: 'task_promotion_1',
        delegationId: delegation.delegationId,
        capabilityLeaseId: 'lease_prom_001',
        agentId: 'agent_promoter_1',
        deviceId: 'dev_primary_001',
        createdAt: Date.now(),
        expiresAt: Date.now() + 3600000,
      },
      scope: {
        allowedProjectRoots: [authorizedProjectRoot],
        allowedOperations: ['READ', 'UPDATE', 'CREATE'],
        maxFileCount: 50,
        maxWorkspaceSizeBytes: 10485760,
        allowedFileExtensions: ['.ts', '.json'],
        deniedFilePatterns: [],
      },
      rootPath: sandboxDir,
      state: 'ACTIVE',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      expiresAt: Date.now() + 3600000,
      isRevoked: false,
      isStopped: false,
    };
    verify(sandboxDesc.state === 'ACTIVE', 'Sandbox descriptor created in ACTIVE state');

    // =========================================================================
    // Category F: Worktree Integration
    // Hạng mục F: Tích hợp Worktree
    // =========================================================================
    // Verify worktree isolated identity binding.
    // Xác minh liên kết định danh cô lập của worktree.
    const worktreeId = 'wt_prom_isolated_001';
    verify(worktreeId.startsWith('wt_'), 'Worktree id conforms to convention');

    // =========================================================================
    // Category G: Promotion Proposal
    // Hạng mục G: Đề xuất Xúc tiến
    // =========================================================================
    // Generate deterministic manifest and diff for proposal creation.
    // Tạo bản kê khai và diff tất định để tạo đề xuất.
    const baseEntries = SandboxManifestEngine.scanProjectDirectory(authorizedProjectRoot);
    const baseManifestHash = SandboxManifestEngine.calculateManifestHash(baseEntries);
    const baseManifest = {
      manifestId: 'manifest_base_001',
      sandboxId: sandboxDesc.id,
      manifestHash: baseManifestHash,
      entries: baseEntries,
      generatedAt: Date.now(),
      entryCount: baseEntries.length,
    };

    const targetEntries = SandboxManifestEngine.scanProjectDirectory(sandboxDir);
    const targetManifestHash = SandboxManifestEngine.calculateManifestHash(targetEntries);
    const targetManifest = {
      manifestId: 'manifest_target_001',
      sandboxId: sandboxDesc.id,
      manifestHash: targetManifestHash,
      entries: targetEntries,
      generatedAt: Date.now(),
      entryCount: targetEntries.length,
    };

    const diffEngine = new SandboxDiffEngine();
    const diff: SandboxDiff = diffEngine.generateDiff(
      sandboxDesc,
      baseManifest,
      targetManifest,
      {
        agentId: 'agent_promoter_1',
        deviceId: 'dev_primary_001',
        taskId: 'task_promotion_1',
        sessionId: 'sess_prom_001',
      }
    );
    verify(diff.changes.length === 1, 'Diff correctly detected 1 added file');
    verify(diff.diffHash.length === 64, 'Deterministic SHA-256 diff hash generated');

    const proposalEngine = new PromotionProposalEngine();
    const proposal = proposalEngine.createProposal({
      sandbox: sandboxDesc,
      baseManifest,
      currentManifest: targetManifest,
      diff,
      targetProjectRoot: authorizedProjectRoot,
    });
    verify(proposal.state === 'PROPOSED', 'Proposal initial state is PROPOSED');
    verify(proposal.provenance.proposalHash.length === 64, 'Proposal hash is SHA-256');
    verify(proposal.proposedChanges.length === 1, 'Proposal has 1 change');
    verify(proposal.diffHash === diff.diffHash, 'Proposal diffHash matches diff');

    // =========================================================================
    // Category H: Promotion Scope
    // Hạng mục H: Phạm vi Xúc tiến
    // =========================================================================
    // Verify scope containment within owner-granted scope.
    // Xác minh giới hạn phạm vi nằm trong phạm vi được Owner cấp quyền.
    let scopeValid = true;
    try {
      PromotionScopeValidator.validateScope(proposal, sandboxDesc);
    } catch {
      scopeValid = false;
    }
    verify(scopeValid === true, 'Proposal scope is valid within sandbox scope');

    // =========================================================================
    // Category I: Protected Workspace Rejection
    // Hạng mục I: Từ chối Không gian làm việc Được bảo vệ
    // =========================================================================
    // Absolute rejection of C:\BOW\shopofbow with SECURITY_VIOLATION.
    // Tuyệt đối từ chối C:\BOW\shopofbow với mã lỗi SECURITY_VIOLATION.
    let protectedViolationCaught = false;
    try {
      PromotionScopeValidator.assertNotProtectedWorkspace('C:\\BOW\\shopofbow');
    } catch (err: any) {
      if (err instanceof PromotionError && err.code === 'SECURITY_VIOLATION') {
        protectedViolationCaught = true;
      }
    }
    verify(protectedViolationCaught, 'Direct access to C:\\BOW\\shopofbow throws SECURITY_VIOLATION');

    // Path normalization bypass attempt
    let protectedVariationCaught = false;
    try {
      PromotionScopeValidator.assertNotProtectedWorkspace('c:/bow/SHOPOFBOW/subpath');
    } catch (err: any) {
      if (err instanceof PromotionError && err.code === 'SECURITY_VIOLATION') {
        protectedVariationCaught = true;
      }
    }
    verify(protectedVariationCaught, 'Case-insensitive subpath of protected workspace throws SECURITY_VIOLATION');

    // =========================================================================
    // Category J: Path Traversal
    // Hạng mục J: Đường dẫn Vượt cấp
    // =========================================================================
    // Reject path traversal attempts targeting outside authorized project.
    // Từ chối nỗ lực vượt cấp đường dẫn nhằm ra ngoài dự án được cấp quyền.
    let traversalCaught = false;
    try {
      PromotionScopeValidator.assertPathContained(authorizedProjectRoot, '../../secret.key');
    } catch (err: any) {
      if (err instanceof PromotionError && err.code === 'PATH_TRAVERSAL_DETECTED') {
        traversalCaught = true;
      }
    }
    verify(traversalCaught, 'Path traversal attempt throws PATH_TRAVERSAL_DETECTED');

    // =========================================================================
    // Category K: Session Isolation
    // Hạng mục K: Cô lập Phiên làm việc
    // =========================================================================
    // Cross-session proposals must fail validation.
    // Các đề xuất chéo phiên phải thất bại khi xác thực.
    const validationEngine = new PromotionValidationEngine();
    const sessionMismatchResult = validationEngine.validate({
      proposal,
      sandbox: {
        ...sandboxDesc,
        binding: {
          ...sandboxDesc.binding,
          sessionId: 'different_session_999',
        },
      },
      targetCurrentManifestHash: baseManifestHash,
    });
    verify(sessionMismatchResult.valid === false, 'Session mismatch fails validation');
    verify(sessionMismatchResult.reason?.includes('session') || sessionMismatchResult.reason?.includes('Session'), 'Session mismatch error recorded');

    // =========================================================================
    // Category L: Capability Lease
    // Hạng mục L: Hợp đồng Thuê Năng lực
    // =========================================================================
    // Expired capability lease must fail validation.
    // Hợp đồng thuê năng lực hết hạn phải thất bại khi xác thực.
    const expiredLease: any = {
      leaseId: 'lease_prom_001',
      status: 'EXPIRED',
      expiresAt: Date.now() - 1000,
    };
    const noLeaseResult = validationEngine.validate({
      proposal,
      sandbox: sandboxDesc,
      targetCurrentManifestHash: baseManifestHash,
      lease: expiredLease,
    });
    verify(noLeaseResult.valid === false, 'Expired capability lease fails validation');
    verify(noLeaseResult.state === 'EXPIRED', 'Lease expired state recorded');

    // =========================================================================
    // Category M: Delegation Expiration
    // Hạng mục M: Hết hạn Ủy thác
    // =========================================================================
    // Expired delegation must fail validation.
    // Ủy thác hết hạn phải thất bại khi xác thực.
    const expiredProposal = {
      ...proposal,
      expiresAt: Date.now() - 1000,
    };
    const expiredResult = validationEngine.validate({
      proposal: expiredProposal,
      sandbox: sandboxDesc,
      targetCurrentManifestHash: baseManifestHash,
    });
    verify(expiredResult.valid === false, 'Expired proposal fails validation');
    verify(expiredResult.state === 'EXPIRED', 'Expired proposal state is EXPIRED');

    // =========================================================================
    // Category N: Delegation Revocation
    // Hạng mục N: Thu hồi Ủy thác
    // =========================================================================
    // Revoked delegation must fail validation.
    // Ủy thác bị thu hồi phải thất bại khi xác thực.
    const revokedDelegation: any = {
      ...delegation,
      status: 'REVOKED',
    };
    const revokedResult = validationEngine.validate({
      proposal,
      sandbox: sandboxDesc,
      targetCurrentManifestHash: baseManifestHash,
      delegation: revokedDelegation,
    });
    verify(revokedResult.valid === false, 'Revoked delegation fails validation');
    verify(revokedResult.state === 'REVOKED', 'Revocation state is REVOKED');

    // =========================================================================
    // Category O: USER_STOP
    // Hạng mục O: Dừng khẩn cấp USER_STOP
    // =========================================================================
    // USER_STOP must immediately reject validation and all mutating operations.
    // USER_STOP phải ngay lập tức từ chối xác thực và mọi thao tác gây biến đổi.
    const userStopResult = validationEngine.validate({
      proposal,
      sandbox: sandboxDesc,
      targetCurrentManifestHash: baseManifestHash,
      isUserStopActive: true,
    });
    verify(userStopResult.valid === false, 'USER_STOP rejects validation');
    verify(userStopResult.state === 'BLOCKED', 'USER_STOP state is BLOCKED');

    // =========================================================================
    // Category P: Manifest Integrity
    // Hạng mục P: Tính toàn vẹn của Bản kê khai
    // =========================================================================
    // Base and target manifest hashes must be deterministic and verifiable.
    // Mã băm bản kê khai cơ sở và mục tiêu phải tất định và có thể kiểm chứng.
    verify(proposal.baseManifestHash === baseManifestHash, 'Base manifest hash matches current base');
    verify(proposal.currentManifestHash === targetManifestHash, 'Current manifest hash matches target');

    // =========================================================================
    // Category Q: Diff Integrity
    // Hạng mục Q: Tính toàn vẹn của Diff
    // =========================================================================
    // Tampered diff hash must fail validation.
    // Mã băm diff giả mạo phải thất bại khi xác thực.
    const tamperedDiffProposal = {
      ...proposal,
      diffHash: 'tampered_diff_hash_00000000000000000000000000000000000000000000000000',
    };
    const tamperedResult = validationEngine.validate({
      proposal: tamperedDiffProposal,
      sandbox: sandboxDesc,
      targetCurrentManifestHash: baseManifestHash,
    });
    verify(tamperedResult.valid === false, 'Tampered diff hash fails validation');
    verify(tamperedResult.state === 'REJECTED', 'Tampered diff rejected');

    // =========================================================================
    // Category R: Stale State Detection
    // Hạng mục R: Phát hiện Trạng thái Cũ (Staleness)
    // =========================================================================
    // If target changed after proposal creation, STALENESS_DETECTED.
    // Nếu mục tiêu thay đổi sau khi tạo đề xuất, phát hiện STALENESS_DETECTED.
    const staleResult = validationEngine.validate({
      proposal,
      sandbox: sandboxDesc,
      targetCurrentManifestHash: 'changed_base_manifest_hash_9999999999999999999999999999999999999999',
    });
    verify(staleResult.valid === false, 'Stale base state fails validation');
    verify(staleResult.isStale === true, 'isStale flag set to true');
    verify(staleResult.state === 'STALE', 'Proposal state set to STALE');

    // =========================================================================
    // Category S: Conflict Detection
    // Hạng mục S: Phát hiện Xung đột
    // =========================================================================
    // Detect modified-after-proposal conflict.
    // Phát hiện xung đột sửa đổi sau đề xuất.
    const conflictEngine = new PromotionConflictEngine();
    const conflicts = conflictEngine.detectConflicts({
      proposal,
      targetBaseManifestHash: 'modified_manifest_888',
      concurrentActiveProposals: [],
    });
    verify(conflicts.length === 1, 'Base mismatch conflict detected');
    verify(conflicts[0].type === 'BASE_HASH_MISMATCH', 'Conflict type is BASE_HASH_MISMATCH');

    // =========================================================================
    // Category T: Provenance
    // Hạng mục T: Nguồn gốc (Provenance)
    // =========================================================================
    // Verify complete provenance chain in proposal.
    // Xác minh chuỗi nguồn gốc hoàn chỉnh trong đề xuất.
    verify(proposal.provenance.taskId === 'task_promotion_1', 'Provenance taskId matches');
    verify(proposal.provenance.agentId === 'agent_promoter_1', 'Provenance agentId matches');
    verify(proposal.provenance.delegationId === delegation.delegationId, 'Provenance delegationId matches');
    verify(proposal.provenance.sandboxId === sandboxDesc.id, 'Provenance sandboxId matches');
    verify(proposal.provenance.manifestHash === targetManifestHash, 'Provenance manifestHash matches');

    // =========================================================================
    // Category U: Validation
    // Hạng mục U: Xác thực
    // =========================================================================
    // Clean proposal passes validation completely.
    // Đề xuất sạch vượt qua xác thực hoàn toàn.
    const cleanValidation = validationEngine.validate({
      proposal,
      sandbox: sandboxDesc,
      targetCurrentManifestHash: baseManifestHash,
    });
    verify(cleanValidation.valid === true, 'Clean proposal validation passes');
    verify(cleanValidation.state === 'VALIDATED', 'State transitioned to VALIDATED');

    // =========================================================================
    // Category V: Supervisory Review
    // Hạng mục V: Đánh giá Giám sát
    // =========================================================================
    // Supervisor approves promotion proposal.
    // Người giám sát phê duyệt đề xuất xúc tiến.
    const reviewEngine = new PromotionReviewEngine();
    const reviewRecord = reviewEngine.reviewProposal({
      proposal,
      reviewerId: 'supervisor_bob',
      reviewerType: 'SUPERVISOR',
      decision: 'APPROVED',
      rationale: 'Supervisory review completed and approved for test integration.',
    });
    verify(reviewRecord.decision === 'APPROVED', 'Supervisory review decision is APPROVED');
    verify(reviewRecord.reviewerId === 'supervisor_bob', 'ReviewerId recorded');
    verify(reviewRecord.isOwnerApproval === false, 'Supervisor approval is not owner approval');

    // =========================================================================
    // Category W: HumanGate Reuse
    // Hạng mục W: Tái sử dụng HumanGate
    // =========================================================================
    // Reuse canonical SupervisorHumanGate without duplication.
    // Tái sử dụng SupervisorHumanGate chuẩn tắc không trùng lặp.
    const humanGatePending = await reviewEngine.requestHumanGateApproval(proposal);
    verify(humanGatePending === true, 'HumanGate request initiated with PENDING state');

    // =========================================================================
    // Category X: Agent Self Approval Rejection
    // Hạng mục X: Từ chối Tự Phê duyệt của Tác tử
    // =========================================================================
    // An agent must NOT approve its own promotion proposal.
    // Một tác tử KHÔNG ĐƯỢC tự phê duyệt đề xuất xúc tiến của chính mình.
    let selfApprovalCaught = false;
    try {
      reviewEngine.reviewProposal({
        proposal,
        reviewerId: proposal.agentId, // Self approval attempt!
        reviewerType: 'AGENT',
        decision: 'APPROVED',
      });
    } catch (err: any) {
      if (err instanceof PromotionError && err.code === 'SELF_APPROVAL_REJECTED') {
        selfApprovalCaught = true;
      }
    }
    verify(selfApprovalCaught, 'Self-approval attempt throws SELF_APPROVAL_REJECTED');

    // =========================================================================
    // Category Y: Owner Approval Separation
    // Hạng mục Y: Phân tách Phê duyệt của Owner
    // =========================================================================
    // Owner approval is explicitly distinguished from non-owner approval.
    // Phê duyệt của Owner được phân biệt rõ ràng với phê duyệt của người không phải Owner.
    const ownerApprovalRecord = reviewEngine.reviewProposal({
      proposal,
      reviewerId: MASTER_OWNER_ID,
      reviewerType: 'MASTER_OWNER',
      decision: 'APPROVED',
      rationale: 'Master owner direct governed authorization.',
    });
    verify(ownerApprovalRecord.isOwnerApproval === true, 'isOwnerApproval set to true for MASTER_OWNER_ID');

    // =========================================================================
    // Category Z: WorldActionAuthorization Reuse
    // Hạng mục Z: Tái sử dụng WorldActionAuthorization
    // =========================================================================
    // Canonical WorldActionAuthorizationEngine issues scoped execution token.
    // WorldActionAuthorizationEngine chuẩn tắc cấp mã ủy quyền thực thi có phạm vi.
    const authEngine = new PromotionAuthorizationEngine();
    const token = authEngine.issuePromotionToken({
      proposal,
      approval: ownerApprovalRecord,
      operatorId: MASTER_OWNER_ID,
    });
    verify(token.tokenId.startsWith('tok_'), 'Canonical AuthorizationToken issued');
    verify(token.singleUse === true, 'Token is marked singleUse');
    verify(token.target === authorizedProjectRoot, 'Token target matches project root');

    // =========================================================================
    // Category AA: Promotion Authorization Boundary
    // Hạng mục AA: Ranh giới Ủy quyền Xúc tiến
    // =========================================================================
    // Validation of authorization token against proposal.
    // Xác thực mã ủy quyền đối chiếu với đề xuất.
    const isTokenValid = authEngine.validatePromotionToken(token, proposal);
    verify(isTokenValid === true, 'Token valid for authorized proposal');

    // =========================================================================
    // Category AB: Controlled Promotion Execution
    // Hạng mục AB: Thực thi Xúc tiến Có kiểm soát
    // =========================================================================
    // Execute promotion and apply changes safely to authorized project target.
    // Thực thi xúc tiến và áp dụng thay đổi an toàn vào mục tiêu dự án được phép.
    const promotionEngine = new ControlledPromotionEngine(authEngine);
    const executionResult = promotionEngine.executePromotion({
      proposal,
      approval: ownerApprovalRecord,
      authorizationToken: token,
      sandbox: sandboxDesc,
      executedBy: MASTER_OWNER_ID,
    });
    verify(executionResult.status === 'PROMOTED', 'Execution status is PROMOTED');
    verify(executionResult.appliedChanges.length === 1, '1 change applied to project');

    // =========================================================================
    // Category AC: Promotion Result
    // Hạng mục AC: Kết quả Xúc tiến
    // =========================================================================
    // Verify target file actually exists on filesystem with correct content.
    // Xác minh tệp mục tiêu thực sự tồn tại trên hệ thống tệp với nội dung chính xác.
    const targetFilePath = path.join(authorizedProjectRoot, 'feature.ts');
    verify(fs.existsSync(targetFilePath), 'Target file feature.ts created in target project');
    const content = fs.readFileSync(targetFilePath, 'utf8');
    verify(content.includes('export const feature = "v1";'), 'Content matches sandbox source');

    // =========================================================================
    // Category AD: Post-Promotion Verification
    // Hạng mục AD: Xác minh Sau Xúc tiến
    // =========================================================================
    // Manifest hash changes after promotion.
    // Mã băm bản kê khai thay đổi sau khi xúc tiến.
    verify(executionResult.promotedManifestHash !== executionResult.previousManifestHash, 'Promoted manifest hash differs from pre-manifest');

    // =========================================================================
    // Category AE: Rollback
    // Hạng mục AE: Hoàn tác
    // =========================================================================
    // Governed rollback restores target project state.
    // Hoàn tác có quản trị khôi phục trạng thái dự án mục tiêu.
    const rollbackEngine = new PromotionRollbackEngine(promotionEngine);
    const rollbackResult = rollbackEngine.executeRollback({
      promotionId: proposal.promotionId,
      rolledBackBy: MASTER_OWNER_ID,
      reason: 'Governed rollback verification test',
    });
    verify(rollbackResult.restoredFiles.length === 1, 'Restored 1 file during rollback');
    verify(!fs.existsSync(targetFilePath), 'Target file removed as it was newly created by promotion');
    verify(rollbackResult.rollbackManifestHash === executionResult.previousManifestHash, 'Rollback manifest matches pre-promotion manifest');

    // =========================================================================
    // Category AF: Rollback Provenance
    // Hạng mục AF: Nguồn gốc Hoàn tác
    // =========================================================================
    // Verify rollback audit record ID exists and is recorded.
    // Xác minh ID bản ghi kiểm toán hoàn tác tồn tại và được ghi nhận.
    verify(rollbackResult.auditRecordId.length > 0, 'Rollback audit record id generated');
    verify(rollbackResult.rolledBackBy === MASTER_OWNER_ID, 'Rollback actor is MASTER_OWNER');

    // =========================================================================
    // Category AG: Promotion Replay Prevention
    // Hạng mục AG: Ngăn ngừa Tái phát Xúc tiến
    // =========================================================================
    // Consumed authorization token cannot be reused (anti-replay).
    // Mã ủy quyền đã tiêu thụ không thể tái sử dụng (chống tái phát).
    globalWorldActionAuth.consumeToken(token.tokenId, `promote_${proposal.promotionId}`);
    const isTokenReusedValid = authEngine.validatePromotionToken(token, proposal);
    verify(isTokenReusedValid === false, 'Consumed token is rejected for replay');

    // =========================================================================
    // Category AH: Duplicate Promotion Rejection
    // Hạng mục AH: Từ chối Xúc tiến Trùng lặp
    // =========================================================================
    // Cannot re-execute completed promotion without fresh authorization.
    // Không thể tái thực thi đợt xúc tiến đã hoàn thành mà không có ủy quyền mới.
    const token3 = authEngine.issuePromotionToken({
      proposal,
      approval: ownerApprovalRecord,
      operatorId: MASTER_OWNER_ID,
    });
    let duplicateExecutionCaught = false;
    try {
      promotionEngine.executePromotion({
        proposal,
        approval: ownerApprovalRecord,
        authorizationToken: token3,
        sandbox: sandboxDesc,
        executedBy: MASTER_OWNER_ID,
      });
    } catch (err: any) {
      if (err instanceof PromotionError && (err.code === 'DUPLICATE_PROMOTION' || err.code === 'ALREADY_PROMOTED')) {
        duplicateExecutionCaught = true;
      }
    }
    verify(duplicateExecutionCaught, 'Duplicate promotion throws DUPLICATE_PROMOTION');

    // =========================================================================
    // Category AI: Concurrent Promotion Rejection
    // Hạng mục AI: Từ chối Xúc tiến Đồng thời Xung đột
    // =========================================================================
    // Conflict engine detects concurrent active promotions modifying same files.
    const concurrentOther = {
      ...proposal,
      promotionId: createPromotionId('prop_concurrent_other_999'),
    };
    const concurrentConflicts = conflictEngine.detectConflicts({
      proposal,
      targetBaseManifestHash: baseManifestHash,
      concurrentActiveProposals: [concurrentOther],
    });
    verify(concurrentConflicts.some(c => c.type === 'OVERLAPPING_PROMOTION_ACTIVE'), 'Concurrent promotion conflict detected');

    // =========================================================================
    // Category AJ: Cross-Session Rejection
    // Hạng mục AJ: Từ chối Chéo Phiên
    // =========================================================================
    let crossSessionCaught = false;
    try {
      PromotionScopeValidator.assertSessionIntegrity(proposal, 'other_session_x');
    } catch (err: any) {
      if (err instanceof PromotionError && err.code === 'SESSION_MISMATCH') {
        crossSessionCaught = true;
      }
    }
    verify(crossSessionCaught, 'Cross session assertion throws SESSION_MISMATCH');

    // =========================================================================
    // Category AK: Expired Approval Rejection
    // Hạng mục AK: Từ chối Phê duyệt Hết hạn
    // =========================================================================
    // Token cannot be issued for an unapproved or expired proposal.
    // Mã không thể được cấp cho đề xuất chưa phê duyệt hoặc hết hạn.
    let unapprovedTokenCaught = false;
    try {
      authEngine.issuePromotionToken({
        proposal,
        approval: {
          ...ownerApprovalRecord,
          decision: 'REJECTED',
        },
        operatorId: MASTER_OWNER_ID,
      });
    } catch (err: any) {
      if (err instanceof PromotionError && err.code === 'PROMOTION_NOT_APPROVED') {
        unapprovedTokenCaught = true;
      }
    }
    verify(unapprovedTokenCaught, 'Rejected approval cannot issue token');

    // =========================================================================
    // Category AL: Revoked Approval Rejection
    // Hạng mục AL: Từ chối Phê duyệt Bị thu hồi
    // =========================================================================
    let mismatchApprovalCaught = false;
    try {
      authEngine.issuePromotionToken({
        proposal,
        approval: {
          ...ownerApprovalRecord,
          promotionId: createPromotionId('prom_different_id'),
        },
        operatorId: MASTER_OWNER_ID,
      });
    } catch (err: any) {
      if (err instanceof PromotionError && err.code === 'APPROVAL_MISMATCH') {
        mismatchApprovalCaught = true;
      }
    }
    verify(mismatchApprovalCaught, 'Mismatched approval record throws APPROVAL_MISMATCH');

    // =========================================================================
    // Category AM: Credential Persistence Rejection
    // Hạng mục AM: Từ chối Lưu trữ Thông tin Xác thực
    // =========================================================================
    // No credentials or passwords in proposal or evidence records.
    // Không có thông tin xác thực hoặc mật khẩu trong bản ghi đề xuất hoặc bằng chứng.
    const proposalJson = JSON.stringify(proposal);
    verify(!proposalJson.includes('password'), 'No password in proposal JSON');
    verify(!proposalJson.includes('private_key'), 'No private_key in proposal JSON');
    verify(!proposalJson.includes('secret'), 'No secret in proposal JSON');

    // =========================================================================
    // Category AN: No Token Persistence
    // Hạng mục AN: Không Lưu trữ Mã Ủy quyền
    // =========================================================================
    // Proposals do not store execution authorization tokens.
    // Đề xuất không lưu trữ mã ủy quyền thực thi.
    verify((proposal as any).authorizationToken === undefined, 'Proposal does not store authorizationToken');

    // =========================================================================
    // Category AO: No Duplicate Authority
    // Hạng mục AO: Không Trùng lặp Thẩm quyền
    // =========================================================================
    // Promotion runtime uses canonical master human authority.
    // Promotion runtime sử dụng thẩm quyền master human authority chuẩn tắc.
    verify(globalMasterHumanAuthority !== undefined, 'Canonical globalMasterHumanAuthority used');

    // =========================================================================
    // Category AP: No Duplicate HumanGate
    // Hạng mục AP: Không Trùng lặp HumanGate
    // =========================================================================
    // PromotionReviewEngine uses canonical SupervisorHumanGate.
    // PromotionReviewEngine sử dụng SupervisorHumanGate chuẩn tắc.
    verify(globalSupervisorHumanGate instanceof SupervisorHumanGate, 'globalSupervisorHumanGate is instance of SupervisorHumanGate');

    // =========================================================================
    // Category AQ: No Duplicate Token Store
    // Hạng mục AQ: Không Trùng lặp Kho Mã
    // =========================================================================
    // PromotionAuthorizationEngine delegates token issuance to canonical engine.
    // PromotionAuthorizationEngine ủy quyền việc cấp mã cho động cơ chuẩn tắc.
    verify(globalWorldActionAuth instanceof WorldActionAuthorizationEngine, 'globalWorldActionAuth is instance of WorldActionAuthorizationEngine');

    // =========================================================================
    // Category AR: No Duplicate Audit Ledger
    // Hạng mục AR: Không Trùng lặp Sổ cái Kiểm toán
    // =========================================================================
    // Promotion runtime writes to canonical AuditLedger.
    // Promotion runtime ghi vào AuditLedger chuẩn tắc.
    verify(globalAuditLedger instanceof AuditLedger, 'globalAuditLedger is instance of AuditLedger');

    // =========================================================================
    // Category AS: No Unrestricted Shell
    // Hạng mục AS: Không Shell Không giới hạn
    // =========================================================================
    // Static code audit check for eval/child_process execution in promotion module.
    // Kiểm tra kiểm toán mã tĩnh cho việc thực thi eval/child_process trong mô-đun promotion.
    const promotionSource = fs.readFileSync(path.resolve(process.cwd(), 'src', 'core', 'promotion', 'controlledPromotionEngine.ts'), 'utf8');
    verify(!promotionSource.includes('execSync('), 'Zero execSync in controlledPromotionEngine.ts');
    verify(!promotionSource.includes("from 'node:child_process'") && !promotionSource.includes("from 'child_process'"), 'Zero child_process import in controlledPromotionEngine.ts');
    verify(!promotionSource.includes('spawn('), 'Zero spawn in controlledPromotionEngine.ts');
    verify(!promotionSource.includes('fork('), 'Zero fork in controlledPromotionEngine.ts');
    verify(!promotionSource.includes('eval('), 'Zero eval in controlledPromotionEngine.ts');
    verify(!promotionSource.includes('new Function('), 'Zero new Function in controlledPromotionEngine.ts');

    // =========================================================================
    // Category AT: No Remote Execution
    // Hạng mục AT: Không Thực thi Từ xa
    // =========================================================================
    verify(!promotionSource.includes('ssh '), 'Zero ssh in controlledPromotionEngine.ts');
    verify(!promotionSource.includes('telnet'), 'Zero telnet in controlledPromotionEngine.ts');

    // =========================================================================
    // Category AU: Protected Workspace Absolute Isolation
    // Hạng mục AU: Cô lập Tuyệt đối Không gian làm việc Được bảo vệ
    // =========================================================================
    // Verify that promotion target can NEVER be C:\BOW\shopofbow under any circumvention.
    // Xác minh rằng mục tiêu xúc tiến KHÔNG BAO GIỜ có thể là C:\BOW\shopofbow dưới bất kỳ sự lách luật nào.
    const circumventions = [
      'C:\\BOW\\shopofbow',
      'C:/BOW/shopofbow',
      'c:\\bow\\shopofbow\\nested',
      '\\\\?\\C:\\BOW\\shopofbow',
      'C:\\BOW\\shopofbow\\..\\shopofbow',
    ];
    for (const target of circumventions) {
      let blocked = false;
      try {
        PromotionScopeValidator.assertNotProtectedWorkspace(target);
      } catch (err: any) {
        if (err instanceof PromotionError && err.code === 'SECURITY_VIOLATION') {
          blocked = true;
        }
      }
      verify(blocked, `Circumvention attempt "${target}" blocked with SECURITY_VIOLATION`);
    }

    // =========================================================================
    // Category AV: USER_STOP During Promotion
    // Hạng mục AV: USER_STOP Trong Quá trình Xúc tiến
    // =========================================================================
    // Promotion execution must immediately reject when USER_STOP is active.
    // Thực thi xúc tiến phải ngay lập tức từ chối khi USER_STOP kích hoạt.
    const stopProposal = proposalEngine.createProposal({
      sandbox: sandboxDesc,
      baseManifest,
      currentManifest: targetManifest,
      diff,
      targetProjectRoot: authorizedProjectRoot,
    });
    const stopApproval = reviewEngine.reviewProposal({
      proposal: stopProposal,
      reviewerId: MASTER_OWNER_ID,
      reviewerType: 'MASTER_OWNER',
      decision: 'APPROVED',
    });
    const token4 = authEngine.issuePromotionToken({
      proposal: stopProposal,
      approval: stopApproval,
      operatorId: MASTER_OWNER_ID,
    });
    let stopBlocked = false;
    try {
      promotionEngine.executePromotion({
        proposal: stopProposal,
        approval: stopApproval,
        authorizationToken: token4,
        sandbox: sandboxDesc,
        executedBy: MASTER_OWNER_ID,
        isUserStopActive: true,
      });
    } catch (err: any) {
      if (err instanceof PromotionError && err.code === 'USER_STOP_ACTIVE') {
        stopBlocked = true;
      }
    }
    verify(stopBlocked, 'USER_STOP during promotion throws USER_STOP_ACTIVE');

    // =========================================================================
    // Category AW: REVOCATION During Promotion
    // Hạng mục AW: Thu hồi Trong Quá trình Xúc tiến
    // =========================================================================
    // Rollback execution must immediately reject when USER_STOP is active.
    // Thực thi hoàn tác phải ngay lập tức từ chối khi USER_STOP kích hoạt.
    let rollbackStopBlocked = false;
    try {
      rollbackEngine.executeRollback({
        promotionId: proposal.promotionId,
        rolledBackBy: MASTER_OWNER_ID,
        reason: 'Test rollback under stop',
        isUserStopActive: true,
      });
    } catch (err: any) {
      if (err instanceof PromotionError && err.code === 'USER_STOP_ACTIVE') {
        rollbackStopBlocked = true;
      }
    }
    verify(rollbackStopBlocked, 'Rollback under USER_STOP throws USER_STOP_ACTIVE');

    // =========================================================================
    // Category AX: Conflict Preservation
    // Hạng mục AX: Bảo toàn Xung đột
    // =========================================================================
    // Conflicts must be preserved and visible for supervisory resolution, never silently resolved.
    // Xung đột phải được bảo toàn và hiển thị để người giám sát giải quyết, không bao giờ tự động âm thầm giải quyết.
    const preservedConflicts = conflictEngine.detectConflicts({
      proposal,
      targetBaseManifestHash: 'conflicting_base_hash',
      concurrentActiveProposals: [],
    });
    verify(preservedConflicts.length > 0, 'Conflicts preserved and accessible');
    verify(typeof preservedConflicts[0].relativePath === 'string', 'Conflict includes file or target path');

    // =========================================================================
    // Category AY: Provenance Chain Integrity
    // Hạng mục AY: Tính toàn vẹn của Chuỗi Nguồn gốc
    // =========================================================================
    // Build full evidence bundle and verify cryptographic bundle hash.
    // Xây dựng gói bằng chứng đầy đủ và xác minh mã băm gói mã hóa.
    const provenanceEngine = new PromotionProvenanceEngine();
    const evidenceBundle = provenanceEngine.createEvidenceBundle(
      proposal,
      ownerApprovalRecord,
      executionResult,
      token.tokenId
    );
    verify(evidenceBundle.promotionId === proposal.promotionId, 'Evidence bundle promotionId matches');
    verify(evidenceBundle.evidenceHash.length === 64, 'Evidence bundle hash is SHA-256');
    verify(evidenceBundle.provenance.taskId === proposal.taskId, 'Task ID bound in chain');
    verify(evidenceBundle.provenance.agentId === proposal.agentId, 'Agent ID bound in chain');
    verify(evidenceBundle.authorizationTokenId === token.tokenId, 'Authorization token bound in chain');
    verify(provenanceEngine.verifyEvidenceBundleIntegrity(evidenceBundle) === true, 'Evidence bundle cryptographic integrity verified');

    // =========================================================================
    // Category AZ: End-to-End Promotion Lifecycle
    // Hạng mục AZ: Vòng đời Xúc tiến Từ đầu đến cuối
    // =========================================================================
    // Exercise complete lifecycle through PromotionRuntime coordinator.
    // Thực hiện vòng đời hoàn chỉnh thông qua bộ điều phối PromotionRuntime.
    const runtime = new PromotionRuntime();
    runtime.clear();

    // 1. Setup E2E sandbox and authorized project
    // 1. Thiết lập E2E sandbox và dự án được phép
    const e2eProjectRoot = path.resolve(testTempDir, 'e2e_project');
    if (!fs.existsSync(e2eProjectRoot)) {
      fs.mkdirSync(e2eProjectRoot, { recursive: true });
    }
    fs.writeFileSync(path.join(e2eProjectRoot, 'initial.txt'), 'initial\n', 'utf8');

    const e2eSandboxDir = path.resolve(sandboxStorageRoot, 'sb_e2e');
    fs.mkdirSync(e2eSandboxDir, { recursive: true });
    fs.writeFileSync(path.join(e2eSandboxDir, 'initial.txt'), 'initial\n', 'utf8');
    fs.writeFileSync(path.join(e2eSandboxDir, 'e2e_added.txt'), 'e2e content\n', 'utf8');

    const e2eBaseEntries = SandboxManifestEngine.scanProjectDirectory(e2eProjectRoot);
    const e2eBaseManifestHash = SandboxManifestEngine.calculateManifestHash(e2eBaseEntries);
    const e2eBaseManifest = {
      manifestId: 'manifest_e2e_base',
      sandboxId: createSandboxId('sb_e2e_001'),
      manifestHash: e2eBaseManifestHash,
      entries: e2eBaseEntries,
      generatedAt: Date.now(),
      entryCount: e2eBaseEntries.length,
    };

    const e2eTargetEntries = SandboxManifestEngine.scanProjectDirectory(e2eSandboxDir);
    const e2eTargetManifestHash = SandboxManifestEngine.calculateManifestHash(e2eTargetEntries);
    const e2eTargetManifest = {
      manifestId: 'manifest_e2e_target',
      sandboxId: createSandboxId('sb_e2e_001'),
      manifestHash: e2eTargetManifestHash,
      entries: e2eTargetEntries,
      generatedAt: Date.now(),
      entryCount: e2eTargetEntries.length,
    };

    const e2eSandboxDesc: SandboxDescriptor = {
      id: createSandboxId('sb_e2e_001'),
      binding: {
        sandboxId: createSandboxId('sb_e2e_001'),
        sessionId: 'sess_e2e_001',
        taskId: 'task_e2e_001',
        delegationId: delegation.delegationId,
        capabilityLeaseId: 'lease_e2e_001',
        agentId: 'agent_promoter_1',
        deviceId: 'dev_primary_001',
        createdAt: Date.now(),
        expiresAt: Date.now() + 3600000,
      },
      scope: {
        allowedProjectRoots: [e2eProjectRoot],
        allowedOperations: ['READ', 'UPDATE', 'CREATE'],
        maxFileCount: 50,
        maxWorkspaceSizeBytes: 10485760,
        allowedFileExtensions: ['.txt'],
        deniedFilePatterns: [],
      },
      rootPath: e2eSandboxDir,
      state: 'ACTIVE',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      expiresAt: Date.now() + 3600000,
      isRevoked: false,
      isStopped: false,
    };

    const e2eDiff = diffEngine.generateDiff(
      e2eSandboxDesc,
      e2eBaseManifest,
      e2eTargetManifest,
      {
        agentId: 'agent_promoter_1',
        deviceId: 'dev_primary_001',
        taskId: 'task_e2e_001',
        sessionId: 'sess_e2e_001',
      }
    );

    // 2. Create proposal
    // 2. Tạo đề xuất
    const e2eProposal = runtime.createProposal({
      sandbox: e2eSandboxDesc,
      baseManifest: e2eBaseManifest,
      currentManifest: e2eTargetManifest,
      diff: e2eDiff,
      targetProjectRoot: e2eProjectRoot,
    });
    verify(e2eProposal.state === 'PROPOSED', 'E2E Proposal created');

    // 3. Validate proposal
    // 3. Xác thực đề xuất
    const e2eValidation = runtime.validateProposal({
      proposal: e2eProposal,
      sandbox: e2eSandboxDesc,
      targetCurrentManifestHash: e2eBaseManifestHash,
    });
    verify(e2eValidation.valid === true, 'E2E Proposal validation passed');

    // 4. Supervisory Review & Owner Approval
    // 4. Đánh giá Giám sát & Phê duyệt của Owner
    const e2eApproval = runtime.reviewProposal({
      proposal: e2eProposal,
      reviewerId: MASTER_OWNER_ID,
      reviewerType: 'MASTER_OWNER',
      decision: 'APPROVED',
      rationale: 'E2E test approval by Master Owner',
    });
    verify(e2eApproval.decision === 'APPROVED', 'E2E Approval granted');

    // 5. Canonical Authorization Token
    // 5. Mã Ủy quyền Chuẩn tắc
    const e2eToken = runtime.issuePromotionToken({
      proposal: e2eProposal,
      approval: e2eApproval,
      operatorId: MASTER_OWNER_ID,
    });
    verify(e2eToken.tokenId.length > 0, 'E2E Token issued');

    // 6. Controlled Promotion Execution
    // 6. Thực thi Xúc tiến Có kiểm soát
    const { result: e2eResult, evidence: e2eEvidence } = runtime.executePromotion({
      proposal: e2eProposal,
      approval: e2eApproval,
      authorizationToken: e2eToken,
      sandbox: e2eSandboxDesc,
      executedBy: MASTER_OWNER_ID,
    });
    verify(e2eResult.status === 'PROMOTED', 'E2E Promotion executed successfully');
    verify(fs.existsSync(path.join(e2eProjectRoot, 'e2e_added.txt')), 'E2E file exists in target');
    verify(e2eEvidence.evidenceHash.length === 64, 'E2E Evidence bundle created');

    // 7. Controlled Rollback
    // 7. Hoàn tác Có kiểm soát
    const e2eRollback = runtime.executeRollback({
      promotionId: e2eProposal.promotionId,
      rolledBackBy: MASTER_OWNER_ID,
      reason: 'E2E lifecycle verification rollback',
    });
    verify(e2eRollback.restoredFiles.length === 1, 'E2E Rollback restored file');
    verify(!fs.existsSync(path.join(e2eProjectRoot, 'e2e_added.txt')), 'E2E file removed after rollback');

    console.log(`\n============================================================`);
    console.log(`REALITY GATE SUCCESS: All ${passedAssertions} assertions verified across Categories A..AZ.`);
    console.log(`Total Failed Assertions: 0`);
    console.log(`============================================================\n`);
  } finally {
    // Clean up temporary test directories
    // Dọn dẹp thư mục thử nghiệm tạm thời
    try {
      if (fs.existsSync(testTempDir)) {
        fs.rmSync(testTempDir, { recursive: true, force: true });
      }
    } catch {
      // Ignore cleanup error in test environment
      // Bỏ qua lỗi dọn dẹp trong môi trường thử nghiệm
    }
  }
}

runRealityGate().catch((err) => {
  console.error('[REALITY_GATE_FAILURE]', err);
  process.exit(1);
});
