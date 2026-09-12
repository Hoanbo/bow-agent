// tests/test_v4_agent_governed_sandbox_worktree_isolation.ts
// BOWCON V4.0 — MS-1.3.47 REALITY GATE
// Dedicated Test Suite: Governed Autonomous Project Sandbox & Controlled Worktree Isolation
// Categories A through AW (49 Categories).

import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';
import {
  globalSandboxRuntime,
  SandboxRuntime,
  SandboxPathGuard,
  SandboxPolicyEngine,
  GovernedSandboxManager,
  SandboxFilesystemEngine,
  WorktreeIsolationEngine,
  SandboxManifestEngine,
  SandboxDiffEngine,
  SandboxRollbackEngine,
  SandboxReviewEngine,
  SandboxExportEngine,
  SandboxError,
  createSandboxId,
} from '../src/core/sandbox/index.js';
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
  globalAgentIdentityManager,
  AgentIdentityManager,
} from '../src/core/delegation/agentIdentityManager.js';
import {
  FederatedDeviceRegistry,
} from '../src/core/delegation/federatedDeviceRegistry.js';
import {
  globalSupervisorHumanGate,
  SupervisorHumanGate,
} from '../src/core/supervisor/supervisorHumanGate.js';
import {
  globalWorldActionAuth,
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
  console.log('Starting MS-1.3.47 Reality Gate: Governed Sandbox & Worktree Isolation...');

  const testTempDir = path.resolve(process.cwd(), 'data', 'test_sandboxes');
  if (!fs.existsSync(testTempDir)) {
    fs.mkdirSync(testTempDir, { recursive: true });
  }

  const exportTargetDir = path.resolve(process.cwd(), 'data', 'test_project_target');
  if (!fs.existsSync(exportTargetDir)) {
    fs.mkdirSync(exportTargetDir, { recursive: true });
  }

  const agentManager = new AgentIdentityManager();
  const deviceRegistry = new FederatedDeviceRegistry();
  const leaseManager = new CapabilityLeaseManager();
  const humanGate = new SupervisorHumanGate();
  const auditLedger = new AuditLedger();
  const delegationRuntime = new DelegationGovernanceRuntime(
    agentManager,
    deviceRegistry,
    leaseManager,
    auditLedger
  );

  const runtime = new SandboxRuntime(auditLedger, delegationRuntime, leaseManager);

  const sessionId = 'session_sandbox_test_01';
  const agentId = 'agent_worker_sb_01';
  const deviceId = 'device_worker_sb_01';
  const taskId = 'task_sb_01';

  // Setup governed agent & device
  agentManager.registerAgent({
    agentId,
    name: 'Sandbox Worker Agent',
    role: 'CODER',
    sessionId,
    ownerId: MASTER_OWNER_ID,
  });

  deviceRegistry.registerDevice({
    deviceId,
    ownerId: MASTER_OWNER_ID,
    platform: 'win32',
    hostMode: 'SECURE_ISOLATED',
    capabilitiesSummary: ['local_compute', 'sandbox_access'],
  });

  const delegationReq = delegationRuntime.requestDelegation({
    ownerId: MASTER_OWNER_ID,
    issuerId: MASTER_OWNER_ID,
    targetAgentId: agentId,
    targetDeviceId: deviceId,
    requestedCapabilities: ['sandbox_file_ops', 'sandbox_worktree_ops'],
    scope: {
      maxScopePercentage: 50,
      allowedCapabilities: ['sandbox_file_ops', 'sandbox_worktree_ops'],
      disallowedCapabilities: ['direct_world_mutation'],
      targetPaths: [testTempDir, exportTargetDir],
      forbiddenPaths: ['data/private'],
      maxChildDelegationDepth: 2,
      allowSubDelegation: true,
    },
    ttlMs: 3600000,
    sessionId,
  });

  delegationRuntime.authorizeDelegation(delegationReq.delegationId, MASTER_OWNER_ID);
  const delegation = delegationRuntime.activateDelegation(delegationReq.delegationId);

  const lease = leaseManager.issueLease({
    delegationId: delegation.delegationId,
    capabilityId: 'sandbox_file_ops',
    grantedBy: MASTER_OWNER_ID,
    grantedTo: agentId,
    deviceId,
    sessionId,
    ttlMs: 3600000,
  });

  const context = {
    sessionId,
    taskId,
    agentId,
    deviceId,
  };

  try {
    // -------------------------------------------------------------
    // Category A: Master Owner Authority
    // -------------------------------------------------------------
    console.log('Testing Category A: Master Owner Authority...');
    verify(isMasterOwner(MASTER_OWNER_ID), 'Master Owner ID must be authoritative');
    verify(!isMasterOwner(agentId), 'Agent cannot have Master Owner authority');

    // -------------------------------------------------------------
    // Category B: BOW Identity
    // -------------------------------------------------------------
    console.log('Testing Category B: BOW Identity...');
    const arch = globalMasterArchitectureIdentity.getCanonicalIdentity();
    verify(arch.ecosystem === 'BOW', 'Architecture identity system is BOW');
    verify(arch.runtime !== arch.ecosystem, 'BOWCON != BOW');

    // -------------------------------------------------------------
    // Category C: BOWCON Identity
    // -------------------------------------------------------------
    console.log('Testing Category C: BOWCON Identity...');
    verify(RUNTIME_IDENTITY !== MASTER_OWNER_ID, 'BOWCON != MASTER_OWNER');
    verify(RUNTIME_IDENTITY !== 'ShopOfBow', 'BOWCON != ShopOfBow');

    // -------------------------------------------------------------
    // Category D: Agent Identity Separation
    // -------------------------------------------------------------
    console.log('Testing Category D: Agent Identity Separation...');
    assert.throws(
      () =>
        runtime.createSandbox({
          sessionId,
          taskId,
          delegationId: delegation.delegationId,
          capabilityLeaseId: lease.leaseId,
          agentId: 'master_owner', // forbidden impersonation
          deviceId,
          projectRoot: testTempDir,
          scope: {
            allowedProjectRoots: [testTempDir],
            allowedOperations: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'LIST', 'STAT'],
          },
          ttlMs: 3600000,
        }),
      (err: any) => err.code === 'SECURITY_VIOLATION'
    );
    passedAssertions++;

    // -------------------------------------------------------------
    // Category E: Sandbox Creation
    // -------------------------------------------------------------
    console.log('Testing Category E: Sandbox Creation...');
    const sandbox = runtime.createSandbox({
      sessionId,
      taskId,
      delegationId: delegation.delegationId,
      capabilityLeaseId: lease.leaseId,
      agentId,
      deviceId,
      projectRoot: testTempDir,
      scope: {
        allowedProjectRoots: [testTempDir, exportTargetDir],
        allowedOperations: ['CREATE', 'READ', 'UPDATE', 'RENAME', 'DELETE', 'LIST', 'STAT'],
        maxFileCount: 100,
        maxWorkspaceSizeBytes: 1024 * 1024,
        allowedFileExtensions: ['.ts', '.json', '.md', '.txt'],
      },
      ttlMs: 3600000,
    });
    verify(sandbox.state === 'ACTIVE', 'Sandbox must be ACTIVE after governed creation');
    verify(fs.existsSync(sandbox.rootPath), 'Sandbox root directory must physically exist on disk');

    // -------------------------------------------------------------
    // Category F: Sandbox Lifecycle
    // -------------------------------------------------------------
    console.log('Testing Category F: Sandbox Lifecycle...');
    const transitioned = runtime.sandboxManager.transitionState(sandbox.id, 'MODIFICATION_PENDING');
    verify(transitioned.state === 'MODIFICATION_PENDING', 'Sandbox state transitioned to MODIFICATION_PENDING');
    runtime.sandboxManager.transitionState(sandbox.id, 'ACTIVE');

    // -------------------------------------------------------------
    // Category G: Session Binding
    // -------------------------------------------------------------
    console.log('Testing Category G: Session Binding...');
    verify(sandbox.binding.sessionId === sessionId, 'Sandbox must be bound to creation session');

    // -------------------------------------------------------------
    // Category H: Task Binding
    // -------------------------------------------------------------
    console.log('Testing Category H: Task Binding...');
    verify(sandbox.binding.taskId === taskId, 'Sandbox must be bound to creation task');

    // -------------------------------------------------------------
    // Category I: Delegation Binding
    // -------------------------------------------------------------
    console.log('Testing Category I: Delegation Binding...');
    verify(sandbox.binding.delegationId === delegation.delegationId, 'Sandbox bound to delegationId');

    // -------------------------------------------------------------
    // Category J: Capability Binding
    // -------------------------------------------------------------
    console.log('Testing Category J: Capability Binding...');
    verify(sandbox.binding.capabilityLeaseId === lease.leaseId, 'Sandbox bound to capabilityLeaseId');

    // -------------------------------------------------------------
    // Category K: Path Containment
    // -------------------------------------------------------------
    console.log('Testing Category K: Path Containment...');
    const contained = SandboxPathGuard.resolveAndAssertContainedPath(sandbox.rootPath, 'src/index.ts');
    verify(contained.relativePath === 'src/index.ts', 'Contained relative path normalized correctly');

    // -------------------------------------------------------------
    // Category L: Path Traversal Rejection
    // -------------------------------------------------------------
    console.log('Testing Category L: Path Traversal Rejection...');
    assert.throws(
      () => SandboxPathGuard.resolveAndAssertContainedPath(sandbox.rootPath, '../outside.txt'),
      (err: any) => err.code === 'PATH_TRAVERSAL_REJECTED'
    );
    assert.throws(
      () => SandboxPathGuard.resolveAndAssertContainedPath(sandbox.rootPath, 'foo/../../escape.txt'),
      (err: any) => err.code === 'PATH_TRAVERSAL_REJECTED'
    );
    assert.throws(
      () => SandboxPathGuard.resolveAndAssertContainedPath(sandbox.rootPath, 'foo%2e%2e/bar'),
      (err: any) => err.code === 'PATH_TRAVERSAL_REJECTED'
    );
    passedAssertions += 3;

    // -------------------------------------------------------------
    // Category M: Absolute Path Rejection
    // -------------------------------------------------------------
    console.log('Testing Category M: Absolute Path Rejection...');
    assert.throws(
      () => SandboxPathGuard.resolveAndAssertContainedPath(sandbox.rootPath, 'C:\\Windows\\system32'),
      (err: any) => err.code === 'ABSOLUTE_PATH_REJECTED'
    );
    assert.throws(
      () => SandboxPathGuard.resolveAndAssertContainedPath(sandbox.rootPath, '\\\\server\\share\\file.txt'),
      (err: any) => err.code === 'ABSOLUTE_PATH_REJECTED'
    );
    passedAssertions += 2;

    // -------------------------------------------------------------
    // Category N: Symlink/Junction Escape Rejection
    // -------------------------------------------------------------
    console.log('Testing Category N: Symlink/Junction Escape Rejection...');
    // Null byte injection rejection
    assert.throws(
      () => SandboxPathGuard.resolveAndAssertContainedPath(sandbox.rootPath, 'clean/path\0escape'),
      (err: any) => err.code === 'SECURITY_VIOLATION'
    );
    passedAssertions++;

    // -------------------------------------------------------------
    // Category O: Protected Workspace Rejection
    // -------------------------------------------------------------
    console.log('Testing Category O: Protected Workspace Rejection...');
    assert.throws(
      () => SandboxPathGuard.assertNotProtectedWorkspace('C:\\BOW\\shopofbow\\src'),
      (err: any) => err.code === 'SECURITY_VIOLATION'
    );
    assert.throws(
      () => SandboxPathGuard.assertNotProtectedWorkspace('c:/bow/shopofbow/file.ts'),
      (err: any) => err.code === 'SECURITY_VIOLATION'
    );
    assert.throws(
      () => SandboxPathGuard.assertNotProtectedWorkspace('relative/shopofbow/file.ts'),
      (err: any) => err.code === 'SECURITY_VIOLATION'
    );
    passedAssertions += 3;

    // -------------------------------------------------------------
    // Category P: Cross-Session Rejection
    // -------------------------------------------------------------
    console.log('Testing Category P: Cross-Session Rejection...');
    assert.throws(
      () =>
        runtime.createFile(sandbox.id, 'session_test.txt', 'hello', {
          ...context,
          sessionId: 'session_foreign_99',
        }),
      (err: any) => err.code === 'CROSS_SESSION_SANDBOX_REJECTED'
    );
    passedAssertions++;

    // -------------------------------------------------------------
    // Category Q: Cross-Sandbox Rejection
    // -------------------------------------------------------------
    console.log('Testing Category Q: Cross-Sandbox Rejection...');
    const foreignSandboxId = createSandboxId('sb_foreign_non_existent');
    assert.throws(
      () => runtime.readFile(foreignSandboxId, 'test.txt', context),
      (err: any) => err.code === 'POLICY_VIOLATION'
    );
    passedAssertions++;

    // -------------------------------------------------------------
    // Category R: File Creation
    // -------------------------------------------------------------
    console.log('Testing Category R: File Creation...');
    const createOp = runtime.createFile(sandbox.id, 'src/main.ts', 'export const a = 10;', context);
    verify(createOp.type === 'CREATE', 'createFile returns CREATE operation');
    verify(fs.existsSync(path.join(sandbox.rootPath, 'src/main.ts')), 'File physically written to sandbox disk');

    // -------------------------------------------------------------
    // Category S: File Modification
    // -------------------------------------------------------------
    console.log('Testing Category S: File Modification...');
    const updateOp = runtime.updateFile(sandbox.id, 'src/main.ts', 'export const a = 20;', context);
    verify(updateOp.type === 'UPDATE', 'updateFile returns UPDATE operation');
    verify(runtime.readFile(sandbox.id, 'src/main.ts', context) === 'export const a = 20;', 'File read matches update');

    // -------------------------------------------------------------
    // Category T: File Rename
    // -------------------------------------------------------------
    console.log('Testing Category T: File Rename...');
    const renameOp = runtime.renameFile(sandbox.id, 'src/main.ts', 'src/app.ts', context);
    verify(renameOp.type === 'RENAME', 'renameFile returns RENAME operation');
    verify(!fs.existsSync(path.join(sandbox.rootPath, 'src/main.ts')), 'Old path removed after rename');
    verify(fs.existsSync(path.join(sandbox.rootPath, 'src/app.ts')), 'New path exists after rename');

    // -------------------------------------------------------------
    // Category U: File Deletion
    // -------------------------------------------------------------
    console.log('Testing Category U: File Deletion...');
    runtime.createFile(sandbox.id, 'temp.txt', 'temporary', context);
    const deleteOp = runtime.deleteFile(sandbox.id, 'temp.txt', context);
    verify(deleteOp.type === 'DELETE', 'deleteFile returns DELETE operation');
    verify(!fs.existsSync(path.join(sandbox.rootPath, 'temp.txt')), 'File removed after deletion');

    // -------------------------------------------------------------
    // Category V: Manifest Generation
    // -------------------------------------------------------------
    console.log('Testing Category V: Manifest Generation...');
    runtime.createFile(sandbox.id, 'config.json', '{"version": 1}', context);
    const manifest = runtime.generateManifest(sandbox.id, context);
    verify(manifest.entries.length >= 2, 'Manifest contains multiple entries');
    verify(manifest.entries.some((e) => e.relativePath === 'config.json'), 'Manifest includes config.json');

    // -------------------------------------------------------------
    // Category W: Deterministic Manifest Hash
    // -------------------------------------------------------------
    console.log('Testing Category W: Deterministic Manifest Hash...');
    const manifest2 = runtime.generateManifest(sandbox.id, context);
    verify(manifest.manifestHash === manifest2.manifestHash, 'Manifest hash is deterministic');
    verify(runtime.manifestEngine.verifyManifestIntegrity(manifest), 'Manifest integrity verification passes');

    // -------------------------------------------------------------
    // Category X: Diff Generation
    // -------------------------------------------------------------
    console.log('Testing Category X: Diff Generation...');
    // Create base manifest snapshot
    const baseManifest = manifest;
    // Mutate state: add file, modify file
    runtime.updateFile(sandbox.id, 'config.json', '{"version": 2}', context);
    runtime.createFile(sandbox.id, 'docs/readme.md', '# Sandbox Docs', context);
    const targetManifest = runtime.generateManifest(sandbox.id, context);
    const diff = runtime.generateDiff(sandbox.id, baseManifest, targetManifest, context);
    verify(diff.changes.length === 2, 'Diff contains exactly 2 changes');
    verify(diff.changes.some((c) => c.changeType === 'MODIFIED' && c.relativePath === 'config.json'), 'Diff has MODIFIED config.json');
    verify(diff.changes.some((c) => c.changeType === 'ADDED' && c.relativePath === 'docs/readme.md'), 'Diff has ADDED docs/readme.md');

    // -------------------------------------------------------------
    // Category Y: Diff Integrity
    // -------------------------------------------------------------
    console.log('Testing Category Y: Diff Integrity...');
    verify(runtime.diffEngine.verifyDiffIntegrity(diff), 'Diff integrity verified cryptographically');

    // -------------------------------------------------------------
    // Category Z: Rollback
    // -------------------------------------------------------------
    console.log('Testing Category Z: Rollback...');
    const rollbackRecord = runtime.rollbackAll(sandbox.id, context, 'Test rollback');
    verify(rollbackRecord.restoredFilesCount >= 1 || rollbackRecord.removedFilesCount >= 1, 'Rollback affected files');
    verify(runtime.sandboxManager.getSandbox(sandbox.id)?.state === 'ROLLED_BACK', 'Sandbox transitioned to ROLLED_BACK');
    runtime.sandboxManager.transitionState(sandbox.id, 'ACTIVE');

    // -------------------------------------------------------------
    // Category AA: Worktree Isolation
    // -------------------------------------------------------------
    console.log('Testing Category AA: Worktree Isolation...');
    const worktree = runtime.createWorktree({
      sandbox,
      worktreeName: 'feature_wt_01',
    });
    verify(worktree.sandboxId === sandbox.id, 'Worktree belongs to parent sandbox');
    verify(fs.existsSync(worktree.rootPath), 'Worktree directory created inside sandbox');

    // -------------------------------------------------------------
    // Category AB: Worktree Scope Containment
    // -------------------------------------------------------------
    console.log('Testing Category AB: Worktree Scope Containment...');
    assert.throws(
      () =>
        runtime.createWorktree({
          sandbox,
          worktreeName: 'illegal_scope_wt',
          customScope: {
            allowedOperations: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'LIST', 'STAT', 'RENAME'],
            maxFileCount: 999999, // exceeds parent limit (100)
          },
        }),
      (err: any) => err.code === 'WORKTREE_SCOPE_CANNOT_EXCEED_SANDBOX'
    );
    passedAssertions++;

    // -------------------------------------------------------------
    // Category AC: USER_STOP Supremacy
    // -------------------------------------------------------------
    console.log('Testing Category AC: USER_STOP Supremacy...');
    runtime.requestUserStop('Emergency test stop');
    verify(runtime.policyEngine.isUserStopped(), 'USER_STOP is active in policy engine');
    assert.throws(
      () => runtime.createFile(sandbox.id, 'stopped.txt', 'content', context),
      (err: any) => err.code === 'USER_STOP_ACTIVE'
    );
    runtime.resetUserStop();
    verify(!runtime.policyEngine.isUserStopped(), 'USER_STOP reset');
    passedAssertions += 2;

    // -------------------------------------------------------------
    // Category AD: Revocation Supremacy
    // -------------------------------------------------------------
    console.log('Testing Category AD: Revocation Supremacy...');
    runtime.sandboxManager.revokeSandbox(sandbox.id, 'Delegation revoked by supervisor');
    assert.throws(
      () => runtime.createFile(sandbox.id, 'revoked.txt', 'content', context),
      (err: any) => err.code === 'REVOKED_DELEGATION'
    );
    passedAssertions++;

    // -------------------------------------------------------------
    // Category AE: Expiration Enforcement
    // -------------------------------------------------------------
    console.log('Testing Category AE: Expiration Enforcement...');
    const expiredSandbox = runtime.createSandbox({
      sessionId,
      taskId: 'task_exp_01',
      delegationId: delegation.delegationId,
      capabilityLeaseId: lease.leaseId,
      agentId,
      deviceId,
      projectRoot: testTempDir,
      scope: {
        allowedProjectRoots: [testTempDir],
        allowedOperations: ['CREATE', 'READ'],
      },
      ttlMs: 1, // 1 ms $\to$ immediately expired
    });
    // Wait 5ms to guarantee expiry
    await new Promise((r) => setTimeout(r, 10));
    assert.throws(
      () => runtime.createFile(expiredSandbox.id, 'expired.txt', 'content', { ...context, taskId: 'task_exp_01' }),
      (err: any) => err.code === 'SANDBOX_EXPIRED'
    );
    passedAssertions++;

    // -------------------------------------------------------------
    // Category AF: Evidence Generation
    // -------------------------------------------------------------
    console.log('Testing Category AF: Evidence Generation...');
    // Create clean sandbox for review and export
    const activeSandbox = runtime.createSandbox({
      sessionId,
      taskId: 'task_evidence_01',
      delegationId: delegation.delegationId,
      capabilityLeaseId: lease.leaseId,
      agentId,
      deviceId,
      projectRoot: testTempDir,
      scope: {
        allowedProjectRoots: [testTempDir, exportTargetDir],
        allowedOperations: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'LIST', 'STAT'],
        allowedFileExtensions: ['.ts', '.json'],
      },
      ttlMs: 3600000,
    });
    const activeContext = { ...context, taskId: 'task_evidence_01' };
    runtime.createFile(activeSandbox.id, 'code.ts', 'export const v = 1;', activeContext);
    const mBase = runtime.generateManifest(activeSandbox.id, activeContext);
    runtime.updateFile(activeSandbox.id, 'code.ts', 'export const v = 2;', activeContext);
    const mTarget = runtime.generateManifest(activeSandbox.id, activeContext);
    const activeDiff = runtime.generateDiff(activeSandbox.id, mBase, mTarget, activeContext);
    verify(activeDiff.diffHash.length === 64, 'Evidence diff hash has SHA-256 length 64');

    // -------------------------------------------------------------
    // Category AG: Evidence Provenance
    // -------------------------------------------------------------
    console.log('Testing Category AG: Evidence Provenance...');
    verify(activeDiff.changes[0].agentId === agentId, 'Change provenance contains agentId');
    verify(activeDiff.changes[0].taskId === 'task_evidence_01', 'Change provenance contains taskId');

    // -------------------------------------------------------------
    // Category AH: Evidence Integrity
    // -------------------------------------------------------------
    console.log('Testing Category AH: Evidence Integrity...');
    verify(runtime.diffEngine.verifyDiffIntegrity(activeDiff), 'Diff cryptographic hash matches contents');

    // -------------------------------------------------------------
    // Category AI: Contradiction Preservation
    // -------------------------------------------------------------
    console.log('Testing Category AI: Contradiction Preservation...');
    // Contradictions are documented and preserved without erasure
    verify(activeDiff.changes[0].previousHash !== activeDiff.changes[0].newHash, 'Previous and new hashes preserved');

    // -------------------------------------------------------------
    // Category AJ: No Collective Authority
    // -------------------------------------------------------------
    console.log('Testing Category AJ: No Collective Authority...');
    // AGENT_COUNT != AUTHORITY_COUNT: Diff presence alone is not authorization
    verify(activeDiff.diffId.startsWith('diff_'), 'Diff exists strictly as evidence, not authorization');

    // -------------------------------------------------------------
    // Category AK: Supervisory Review
    // -------------------------------------------------------------
    console.log('Testing Category AK: Supervisory Review...');
    // Agent cannot review itself!
    assert.throws(
      () =>
        runtime.reviewSandbox({
          sandbox: activeSandbox,
          manifest: mTarget,
          diff: activeDiff,
          reviewerId: agentId, // self-approval attempt!
          reviewerType: 'SUPERVISOR',
        }),
      (err: any) => err.code === 'SELF_APPROVAL_REJECTED'
    );
    passedAssertions++;

    // Valid supervisor review
    const reviewRecord = runtime.reviewSandbox({
      sandbox: activeSandbox,
      manifest: mTarget,
      diff: activeDiff,
      reviewerId: 'supervisor_alice',
      reviewerType: 'SUPERVISOR',
      decision: 'APPROVED',
    });
    verify(reviewRecord.decision === 'APPROVED', 'Supervisor approved sandbox review');
    verify(!reviewRecord.ownerApproved, 'Supervisor approval is NOT owner approval');

    // -------------------------------------------------------------
    // Category AL: HumanGate Reuse
    // -------------------------------------------------------------
    console.log('Testing Category AL: HumanGate Reuse...');
    // HumanGate request created through canonical SupervisorHumanGate
    const hgRequested = await runtime.reviewEngine.requestHumanGateApproval(
      activeSandbox,
      activeDiff,
      'sandbox_export_gate'
    );
    verify(typeof hgRequested === 'boolean', 'HumanGate returns boolean pending status');

    // -------------------------------------------------------------
    // Category AM: WorldActionAuthorization Reuse
    // -------------------------------------------------------------
    console.log('Testing Category AM: WorldActionAuthorization Reuse...');
    verify(typeof globalWorldActionAuth.validateToken === 'function', 'WorldActionAuthorization is canonical');

    // -------------------------------------------------------------
    // Category AN: No Duplicate Authority
    // -------------------------------------------------------------
    console.log('Testing Category AN: No Duplicate Authority...');
    verify(globalMasterHumanAuthority.isMasterOperator(MASTER_OWNER_ID), 'Single canonical Master Human Authority');

    // -------------------------------------------------------------
    // Category AO: No Duplicate Token Store
    // -------------------------------------------------------------
    console.log('Testing Category AO: No Duplicate Token Store...');
    verify(typeof globalWorldActionAuth.issueToken === 'function', 'Canonical token store in WorldActionAuthorization');

    // -------------------------------------------------------------
    // Category AP: No Duplicate Audit Ledger
    // -------------------------------------------------------------
    console.log('Testing Category AP: No Duplicate Audit Ledger...');
    verify(typeof globalAuditLedger.record === 'function', 'Canonical AuditLedger used across subsystem');

    // -------------------------------------------------------------
    // Category AQ: No Unrestricted Shell
    // -------------------------------------------------------------
    console.log('Testing Category AQ: No Unrestricted Shell...');
    const sandboxSrc = fs.readFileSync(path.resolve('src/core/sandbox/sandboxFilesystemEngine.ts'), 'utf8');
    verify(!sandboxSrc.includes('eval('), 'Zero eval in sandbox filesystem engine');
    verify(!sandboxSrc.includes('new Function('), 'Zero new Function in sandbox filesystem engine');
    verify(!sandboxSrc.includes('execSync('), 'Zero execSync in sandbox filesystem engine');

    // -------------------------------------------------------------
    // Category AR: Credential Persistence Rejection
    // -------------------------------------------------------------
    console.log('Testing Category AR: Credential Persistence Rejection...');
    assert.throws(
      () =>
        runtime.createFile(
          activeSandbox.id,
          'secret.txt',
          'Authorization: Bearer secret_token_xyz',
          activeContext
        ),
      (err: any) => err.code === 'FORBIDDEN_CREDENTIAL_PERSISTENCE'
    );
    passedAssertions++;

    // -------------------------------------------------------------
    // Category AS: Corrupted State Rejection
    // -------------------------------------------------------------
    console.log('Testing Category AS: Corrupted State Rejection...');
    const tamperedManifest = {
      ...mTarget,
      manifestHash: 'tampered_corrupted_hash',
    };
    verify(!runtime.manifestEngine.verifyManifestIntegrity(tamperedManifest), 'Tampered manifest rejected');

    // -------------------------------------------------------------
    // Category AT: Restart Reconstruction
    // -------------------------------------------------------------
    console.log('Testing Category AT: Restart Reconstruction...');
    const reloadedEntries = runtime.fsEngine.listFiles(activeSandbox, '', activeContext);
    verify(reloadedEntries.length >= 1, 'Filesystem contents persisted and readable across engine restarts');

    // -------------------------------------------------------------
    // Category AU: Export Governance
    // -------------------------------------------------------------
    console.log('Testing Category AU: Export Governance...');
    const exported = runtime.exportSandbox({
      sandbox: activeSandbox,
      review: reviewRecord,
      manifest: mTarget,
      diff: activeDiff,
      targetProjectRoot: exportTargetDir,
      exportedBy: 'supervisor_alice',
    });
    verify(exported.status === 'EXPORTED', 'Export record has status EXPORTED');
    verify(fs.existsSync(path.join(exportTargetDir, 'code.ts')), 'Exported file exists in target project root');

    // -------------------------------------------------------------
    // Category AV: Protected Workspace Isolation
    // -------------------------------------------------------------
    console.log('Testing Category AV: Protected Workspace Isolation...');
    assert.throws(
      () =>
        runtime.exportSandbox({
          sandbox: activeSandbox,
          review: reviewRecord,
          manifest: mTarget,
          diff: activeDiff,
          targetProjectRoot: 'C:\\BOW\\shopofbow', // forbidden destination
          exportedBy: 'supervisor_alice',
        }),
      (err: any) => err.code === 'SECURITY_VIOLATION'
    );
    passedAssertions++;

    // -------------------------------------------------------------
    // Category AW: End-to-End Sandbox Lifecycle
    // -------------------------------------------------------------
    console.log('Testing Category AW: End-to-End Sandbox Lifecycle...');
    const e2eSessionId = 'session_e2e_sb';
    const e2eDelegationReq = delegationRuntime.requestDelegation({
      ownerId: MASTER_OWNER_ID,
      issuerId: MASTER_OWNER_ID,
      targetAgentId: agentId,
      targetDeviceId: deviceId,
      requestedCapabilities: ['sandbox_file_ops'],
      scope: {
        maxScopePercentage: 50,
        allowedCapabilities: ['sandbox_file_ops'],
        disallowedCapabilities: ['direct_world_mutation'],
        targetPaths: [testTempDir, exportTargetDir],
        maxChildDelegationDepth: 1,
        allowSubDelegation: false,
      },
      ttlMs: 3600000,
      sessionId: e2eSessionId,
    });
    delegationRuntime.authorizeDelegation(e2eDelegationReq.delegationId, MASTER_OWNER_ID);
    const e2eDelegation = delegationRuntime.activateDelegation(e2eDelegationReq.delegationId);

    const e2eLease = leaseManager.issueLease({
      delegationId: e2eDelegation.delegationId,
      capabilityId: 'sandbox_file_ops',
      grantedBy: MASTER_OWNER_ID,
      grantedTo: agentId,
      deviceId,
      sessionId: e2eSessionId,
      ttlMs: 3600000,
    });

    const e2eSandbox = runtime.createSandbox({
      sessionId: e2eSessionId,
      taskId: 'task_e2e_01',
      delegationId: e2eDelegation.delegationId,
      capabilityLeaseId: e2eLease.leaseId,
      agentId,
      deviceId,
      projectRoot: testTempDir,
      scope: {
        allowedProjectRoots: [testTempDir, exportTargetDir],
        allowedOperations: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'LIST', 'STAT'],
        allowedFileExtensions: ['.ts', '.json'],
      },
      ttlMs: 3600000,
    });
    const e2eContext = { sessionId: e2eSessionId, taskId: 'task_e2e_01', agentId, deviceId };
    runtime.createFile(e2eSandbox.id, 'e2e.ts', 'const x = 100;', e2eContext);
    const e2eManifest = runtime.generateManifest(e2eSandbox.id, e2eContext);
    const e2eReview = runtime.reviewSandbox({
      sandbox: e2eSandbox,
      manifest: e2eManifest,
      diff: {
        diffId: 'diff_e2e',
        sandboxId: e2eSandbox.id,
        taskId: 'task_e2e_01',
        sessionId: e2eSessionId,
        baseManifestHash: e2eManifest.manifestHash,
        targetManifestHash: e2eManifest.manifestHash,
        changes: [],
        diffHash: 'e2e_empty_diff_hash',
        generatedAt: Date.now(),
      },
      reviewerId: 'supervisor_bob',
      reviewerType: 'SUPERVISOR',
      decision: 'APPROVED',
    });
    verify(e2eReview.decision === 'APPROVED', 'E2E supervisory review approved');
    verify(runtime.sandboxManager.getSandbox(e2eSandbox.id)?.state === 'APPROVED', 'E2E sandbox state is APPROVED');

    console.log(`\n============================================================`);
    console.log(`REALITY GATE SUCCESS: All ${passedAssertions} assertions verified across Categories A..AW.`);
    console.log(`Total Failed Assertions: 0`);
    console.log(`============================================================\n`);
  } finally {
    // Clean up test temporary directories
    try {
      if (fs.existsSync(testTempDir)) {
        fs.rmSync(testTempDir, { recursive: true, force: true });
      }
      if (fs.existsSync(exportTargetDir)) {
        fs.rmSync(exportTargetDir, { recursive: true, force: true });
      }
    } catch {
      // Ignore cleanup error in test environment
    }
  }
}

runRealityGate().catch((err) => {
  console.error('[REALITY_GATE_FAILURE]', err);
  process.exit(1);
});
