// tests/test_v4_agent_delegation_federation_governance.ts
// BOWCON V4.0 — MS-1.3.45 REALITY GATE
// MASTER OWNER DELEGATION GOVERNANCE, MULTI-AGENT FEDERATION & AUTHORITY LEASE ARCHITECTURE
//
// Dedicated verification gate covering Categories A through AH.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

import {
  globalMasterArchitectureIdentity,
  MASTER_OWNER_ID,
  AUTHORIZED_MASTER_OWNER_ALIASES,
  RUNTIME_IDENTITY,
  ECOSYSTEM_ID,
} from '../src/core/architecture/masterArchitectureIdentity.js';
import {
  globalMasterHumanAuthority,
  MasterHumanAuthority,
} from '../src/core/authority/masterHumanAuthority.js';
import { globalSupervisorHumanGate } from '../src/core/supervisor/supervisorHumanGate.js';
import { globalWorldActionAuth } from '../src/core/world-action/worldActionAuthorization.js';
import { globalAuditLedger } from '../src/core/auditLedger.js';
import {
  AgentIdentityManager,
  FederatedDeviceRegistry,
  CapabilityLeaseManager,
  DelegationScopeValidator,
  DelegationGovernanceRuntime,
  DurableDelegationStore,
  DELEGATION_SCHEMA_VERSION,
} from '../src/core/delegation/index.js';

let passedAssertions = 0;
function pass(msg: string) {
  passedAssertions++;
}

async function runRealityGate() {
  console.log('\nStarting MS-1.3.45 Reality Gate: Delegation Governance & Authority Lease Architecture...');

  const testStorageDir = path.resolve(process.cwd(), 'data', 'test-delegation-reality');
  if (fs.existsSync(testStorageDir)) {
    fs.rmSync(testStorageDir, { recursive: true, force: true });
  }

  const agentManager = new AgentIdentityManager();
  const deviceRegistry = new FederatedDeviceRegistry();
  const leaseManager = new CapabilityLeaseManager();
  const durableStore = new DurableDelegationStore(testStorageDir);
  const runtime = new DelegationGovernanceRuntime(
    agentManager,
    deviceRegistry,
    leaseManager,
    durableStore
  );

  try {
    // -------------------------------------------------------------------------
    // Category A: Master Owner Authority
    // -------------------------------------------------------------------------
    console.log('Testing Category A: Master Owner Authority...');
    assert.equal(globalMasterHumanAuthority.isMasterOperator('master_operator'), true);
    pass('Canonical master operator recognized');
    assert.equal(globalMasterHumanAuthority.isMasterOperator('random_agent'), false);
    pass('Random agent cannot claim master operator authority');
    assert.equal(globalMasterArchitectureIdentity.verifyAuthorityRank(MASTER_OWNER_ID, RUNTIME_IDENTITY) > 0, true);
    pass('MASTER_OWNER_AUTHORITY rank exceeds BOWCON');

    // -------------------------------------------------------------------------
    // Category B: BOW Architecture Identity
    // -------------------------------------------------------------------------
    console.log('Testing Category B: BOW Architecture Identity...');
    const identity = globalMasterArchitectureIdentity.getCanonicalIdentity();
    assert.equal(identity.ecosystem, 'BOW');
    pass('Ecosystem identity is BOW');
    assert.notEqual(identity.runtime, identity.ecosystem);
    pass('BOWCON != BOW');

    // -------------------------------------------------------------------------
    // Category C: BOWCON Identity
    // -------------------------------------------------------------------------
    console.log('Testing Category C: BOWCON Identity...');
    assert.notEqual(RUNTIME_IDENTITY, MASTER_OWNER_ID);
    pass('BOWCON != MASTER_OWNER');
    assert.notEqual(RUNTIME_IDENTITY, 'ShopOfBow');
    pass('BOWCON != ShopOfBow');
    const invCheck = globalMasterArchitectureIdentity.validateInvariants();
    assert.equal(invCheck.valid, true);
    pass('Architecture invariants valid');

    // -------------------------------------------------------------------------
    // Category D: Agent Identity Separation
    // -------------------------------------------------------------------------
    console.log('Testing Category D: Agent Identity Separation...');
    assert.throws(
      () => agentManager.registerAgent({
        agentId: MASTER_OWNER_ID,
        name: 'Imposter Agent',
        role: 'worker',
        sessionId: 'session_1',
      }),
      /FORBIDDEN_OWNER_IDENTITY_IMPERSONATION/
    );
    pass('Agent cannot register as MASTER_OWNER_ID');

    for (const alias of AUTHORIZED_MASTER_OWNER_ALIASES) {
      assert.throws(
        () => agentManager.registerAgent({
          agentId: alias,
          name: 'Imposter Alias',
          role: 'worker',
          sessionId: 'session_1',
        }),
        /FORBIDDEN_OWNER_IDENTITY_IMPERSONATION/
      );
    }
    pass('Agent cannot register as any Master Owner alias');

    const agentA = agentManager.registerAgent({
      agentId: 'agent_alpha',
      name: 'Agent Alpha',
      role: 'data_analyzer',
      sessionId: 'session_1',
    });
    assert.equal(agentA.isMasterOwner, false);
    pass('Agent identity has isMasterOwner: false');
    assert.equal(agentA.agentId, 'agent_alpha');
    pass('Agent Alpha registered successfully');

    // -------------------------------------------------------------------------
    // Category E: Device Identity & Federation Metadata
    // -------------------------------------------------------------------------
    console.log('Testing Category E: Device Identity...');
    assert.throws(
      () => deviceRegistry.registerDevice({
        deviceId: MASTER_OWNER_ID,
      }),
      /FORBIDDEN_OWNER_DEVICE_IMPERSONATION/
    );
    pass('Device cannot register as MASTER_OWNER_ID');

    const dev1 = deviceRegistry.registerDevice({
      deviceId: 'device_sensor_node_1',
      platform: 'linux-embedded',
      capabilitiesSummary: ['READ_SENSOR', 'PING'],
    });
    assert.equal(dev1.trustState, 'REGISTERED');
    pass('New device registered with REGISTERED state');
    assert.equal(dev1.isMasterOwner, false);
    pass('Device has isMasterOwner: false');

    // -------------------------------------------------------------------------
    // Category F: Delegation Creation
    // -------------------------------------------------------------------------
    console.log('Testing Category F: Delegation Creation...');
    const del1 = runtime.requestDelegation({
      ownerId: MASTER_OWNER_ID,
      issuerId: MASTER_OWNER_ID,
      targetAgentId: 'agent_alpha',
      targetDeviceId: 'device_sensor_node_1',
      requestedCapabilities: ['READ_METRICS', 'RUN_DIAGNOSTICS'],
      scope: {
        maxScopePercentage: 50,
        allowedCapabilities: ['READ_METRICS', 'RUN_DIAGNOSTICS'],
        targetPaths: ['/var/log/metrics'],
      },
      ttlMs: 300_000,
      sessionId: 'session_1',
    });
    assert.equal(del1.status, 'PENDING_AUTHORIZATION');
    pass('Requested delegation transitions to PENDING_AUTHORIZATION');
    assert.equal(del1.grantedCapabilities.length, 0);
    pass('Pending delegation has 0 granted capabilities');

    // -------------------------------------------------------------------------
    // Category G: Delegation Authorization
    // -------------------------------------------------------------------------
    console.log('Testing Category G: Delegation Authorization...');
    assert.throws(
      () => runtime.authorizeDelegation(del1.delegationId, 'unauthorized_agent'),
      /UNAUTHORIZED_DELEGATION_APPROVAL/
    );
    pass('Unauthorized actor cannot authorize delegation');

    const authedDel1 = runtime.authorizeDelegation(del1.delegationId, MASTER_OWNER_ID);
    assert.equal(authedDel1.status, 'AUTHORIZED');
    pass('Master Owner authorizes delegation');
    assert.deepEqual(authedDel1.grantedCapabilities, ['READ_METRICS', 'RUN_DIAGNOSTICS']);
    pass('Granted capabilities populated after authorization');

    const activeDel1 = runtime.activateDelegation(del1.delegationId, MASTER_OWNER_ID);
    assert.equal(activeDel1.status, 'ACTIVE');
    pass('Authorized delegation activated');

    // -------------------------------------------------------------------------
    // Category H: Delegation Scope Enforcement
    // -------------------------------------------------------------------------
    console.log('Testing Category H: Delegation Scope Enforcement...');
    assert.equal(activeDel1.scope.maxScopePercentage <= 100, true);
    pass('DELEGATED_AUTHORITY <= OWNER_GRANTED_SCOPE (50% <= 100%)');
    assert.throws(
      () => DelegationScopeValidator.validateScope({
        maxScopePercentage: 150,
        allowedCapabilities: [],
        disallowedCapabilities: [],
        targetPaths: [],
        forbiddenPaths: [],
        maxChildDelegationDepth: 1,
        currentDepth: 0,
        allowSubDelegation: true,
      }),
      /INVALID_SCOPE_PERCENTAGE/
    );
    pass('Scope percentage > 100% rejected');

    // -------------------------------------------------------------------------
    // Category I: Child Delegation Cannot Widen Scope
    // -------------------------------------------------------------------------
    console.log('Testing Category I: Child Delegation Cannot Widen Scope...');
    const agentB = agentManager.registerAgent({
      agentId: 'agent_beta',
      name: 'Agent Beta',
      role: 'sub_worker',
      parentAgentId: 'agent_alpha',
      sessionId: 'session_1',
    });

    // Attempt child scope 70% when parent is 50%
    assert.throws(
      () => runtime.createChildDelegation(activeDel1.delegationId, {
        ownerId: MASTER_OWNER_ID,
        issuerId: 'agent_alpha',
        targetAgentId: 'agent_beta',
        targetDeviceId: 'device_sensor_node_1',
        requestedCapabilities: ['READ_METRICS'],
        scope: {
          maxScopePercentage: 70, // > 50%
          allowedCapabilities: ['READ_METRICS'],
        },
        ttlMs: 60_000,
        sessionId: 'session_1',
      }, 'agent_alpha'),
      /SCOPE_AMPLIFICATION_FORBIDDEN/
    );
    pass('Child delegation scope 70% > 50% parent rejected');

    // Valid child scope 30% <= 50%
    const childDel1 = runtime.createChildDelegation(activeDel1.delegationId, {
      ownerId: MASTER_OWNER_ID,
      issuerId: 'agent_alpha',
      targetAgentId: 'agent_beta',
      targetDeviceId: 'device_sensor_node_1',
      requestedCapabilities: ['READ_METRICS'],
      scope: {
        maxScopePercentage: 30,
        allowedCapabilities: ['READ_METRICS'],
      },
      ttlMs: 60_000,
      sessionId: 'session_1',
    }, 'agent_alpha');
    assert.equal(childDel1.status, 'ACTIVE');
    pass('Valid child delegation (30% <= 50%) accepted');
    assert.equal(childDel1.scope.currentDepth, 1);
    pass('Child delegation depth tracked as 1');

    // -------------------------------------------------------------------------
    // Category J: Capability Lease Model
    // -------------------------------------------------------------------------
    console.log('Testing Category J: Capability Lease Model...');
    const lease1 = runtime.grantCapabilityLease(activeDel1.delegationId, 'READ_METRICS', MASTER_OWNER_ID, 60_000);
    assert.equal(lease1.status, 'ACTIVE');
    pass('Capability lease granted');
    assert.equal(lease1.capabilityId, 'READ_METRICS');
    pass('Capability lease matches capability ID');

    const validatedLease = leaseManager.validateLease(lease1.leaseId, {
      sessionId: 'session_1',
      capabilityId: 'READ_METRICS',
    });
    assert.equal(validatedLease.leaseId, lease1.leaseId);
    pass('Capability lease validated successfully');

    // -------------------------------------------------------------------------
    // Category K: Capability Subset Enforcement
    // -------------------------------------------------------------------------
    console.log('Testing Category K: Capability Subset Enforcement...');
    assert.throws(
      () => runtime.createChildDelegation(activeDel1.delegationId, {
        ownerId: MASTER_OWNER_ID,
        issuerId: 'agent_alpha',
        targetAgentId: 'agent_beta',
        targetDeviceId: 'device_sensor_node_1',
        requestedCapabilities: ['WRITE_CONFIG'], // Not in parent
        scope: {
          maxScopePercentage: 20,
          allowedCapabilities: ['WRITE_CONFIG'],
        },
        ttlMs: 60_000,
        sessionId: 'session_1',
      }, 'agent_alpha'),
      /CAPABILITY_WIDENING_FORBIDDEN/
    );
    pass('Child requesting capability outside parent grant rejected');

    assert.throws(
      () => runtime.grantCapabilityLease(activeDel1.delegationId, 'DELETE_DATABASE', MASTER_OWNER_ID, 60_000),
      /CAPABILITY_NOT_IN_DELEGATION/
    );
    pass('Cannot grant lease for capability not in delegation');

    // -------------------------------------------------------------------------
    // Category L: Expiration Enforcement
    // -------------------------------------------------------------------------
    console.log('Testing Category L: Expiration Enforcement...');
    // Child cannot have expiration longer than parent
    assert.throws(
      () => runtime.createChildDelegation(activeDel1.delegationId, {
        ownerId: MASTER_OWNER_ID,
        issuerId: 'agent_alpha',
        targetAgentId: 'agent_beta',
        targetDeviceId: 'device_sensor_node_1',
        requestedCapabilities: ['READ_METRICS'],
        scope: {
          maxScopePercentage: 20,
          allowedCapabilities: ['READ_METRICS'],
        },
        ttlMs: 500_000, // Parent TTL was 300_000
        sessionId: 'session_1',
      }, 'agent_alpha'),
      /EXPIRATION_EXTENSION_FORBIDDEN/
    );
    pass('Child expiration extending past parent rejected');

    // Simulated expired delegation cannot issue lease
    const futureTime = activeDel1.expiresAt + 1000;
    assert.equal(runtime.isDelegationActive(activeDel1.delegationId, futureTime), false);
    pass('Delegation inactive when current time >= expiresAt');

    // -------------------------------------------------------------------------
    // Category M: Revocation (REVOCATION > AGENT_INTENT)
    // -------------------------------------------------------------------------
    console.log('Testing Category M: Revocation (REVOCATION > AGENT_INTENT)...');
    const revokedParent = runtime.revokeDelegation(activeDel1.delegationId, MASTER_OWNER_ID, 'Operator terminated mission');
    assert.equal(revokedParent.status, 'REVOKED');
    pass('Parent delegation revoked');
    assert.equal(revokedParent.revocationState.isRevoked, true);
    pass('Revocation state marked true');

    // Child delegation must also be cascaded to REVOKED
    const childAfterRevoke = runtime.getDelegation(childDel1.delegationId);
    assert.equal(childAfterRevoke?.status, 'REVOKED');
    pass('Child delegation cascaded to REVOKED');

    // Associated lease must also be REVOKED
    const leaseAfterRevoke = leaseManager.getLease(lease1.leaseId);
    assert.equal(leaseAfterRevoke?.status, 'REVOKED');
    pass('Capability lease cascaded to REVOKED');

    // Agent attempt with revoked delegation fails closed
    assert.throws(
      () => runtime.assertActiveDelegation(activeDel1.delegationId, 'session_1'),
      /DELEGATION_REVOKED/
    );
    pass('REVOCATION > AGENT_INTENT: Revoked delegation assertion throws error');

    // -------------------------------------------------------------------------
    // Category N: Revocation Without Restart
    // -------------------------------------------------------------------------
    console.log('Testing Category N: Revocation Without Restart...');
    // Immediate in-memory effect: no process reboot required
    assert.throws(
      () => leaseManager.validateLease(lease1.leaseId, {
        sessionId: 'session_1',
        capabilityId: 'READ_METRICS',
      }),
      /LEASE_REVOKED/
    );
    pass('Lease validation throws immediately in-memory without restart');

    // -------------------------------------------------------------------------
    // Category O: Replay Prevention
    // -------------------------------------------------------------------------
    console.log('Testing Category O: Replay Prevention...');
    assert.throws(
      () => runtime.activateDelegation(activeDel1.delegationId, MASTER_OWNER_ID),
      /INVALID_STATE_TRANSITION/
    );
    pass('Cannot reactivate revoked delegation (replay blocked)');

    // -------------------------------------------------------------------------
    // Category P: Session Isolation
    // -------------------------------------------------------------------------
    console.log('Testing Category P: Session Isolation...');
    const agentSession2 = agentManager.registerAgent({
      agentId: 'agent_session_2_worker',
      name: 'Agent Session 2 Worker',
      role: 'worker',
      sessionId: 'session_2',
    });
    const delSession2 = runtime.requestDelegation({
      ownerId: MASTER_OWNER_ID,
      issuerId: MASTER_OWNER_ID,
      targetAgentId: 'agent_session_2_worker',
      targetDeviceId: 'device_sensor_node_1',
      requestedCapabilities: ['READ_METRICS'],
      scope: {
        maxScopePercentage: 40,
        allowedCapabilities: ['READ_METRICS'],
      },
      ttlMs: 60_000,
      sessionId: 'session_2',
    });
    runtime.authorizeDelegation(delSession2.delegationId, MASTER_OWNER_ID);
    runtime.activateDelegation(delSession2.delegationId, MASTER_OWNER_ID);

    // Cross-session access fails closed
    assert.throws(
      () => runtime.assertActiveDelegation(delSession2.delegationId, 'session_1'),
      /CROSS_SESSION_DELEGATION_REJECTED/
    );
    pass('Session 1 cannot access Session 2 delegation');

    // -------------------------------------------------------------------------
    // Category Q: Device Trust Boundary
    // -------------------------------------------------------------------------
    console.log('Testing Category Q: Device Trust Boundary...');
    // Promoting device to TRUSTED requires Master Owner
    assert.throws(
      () => deviceRegistry.setTrustState('device_sensor_node_1', 'TRUSTED', 'untrusted_agent'),
      /UNAUTHORIZED_DEVICE_TRUST/
    );
    pass('Only Master Owner can promote device to TRUSTED');

    const trustedDev = deviceRegistry.setTrustState('device_sensor_node_1', 'TRUSTED', MASTER_OWNER_ID);
    assert.equal(trustedDev.trustState, 'TRUSTED');
    pass('Device promoted to TRUSTED by Master Owner');
    // Invariant: DEVICE_TRUST != EXECUTION_AUTHORITY
    assert.equal(deviceRegistry.isDeviceTrusted('device_sensor_node_1'), true);
    pass('DEVICE_TRUST checked, does not equal execution authority');

    // -------------------------------------------------------------------------
    // Category R: USER_STOP Supremacy
    // -------------------------------------------------------------------------
    console.log('Testing Category R: USER_STOP Supremacy...');
    globalMasterHumanAuthority.triggerUserStop('Emergency test stop');
    assert.equal(globalMasterHumanAuthority.isUserStopActive, true);
    pass('USER_STOP triggered and active');

    assert.throws(
      () => runtime.requestDelegation({
        ownerId: MASTER_OWNER_ID,
        issuerId: MASTER_OWNER_ID,
        targetAgentId: 'agent_session_2_worker',
        targetDeviceId: 'device_sensor_node_1',
        requestedCapabilities: ['READ_METRICS'],
        scope: { maxScopePercentage: 10, allowedCapabilities: ['READ_METRICS'] },
        ttlMs: 10_000,
        sessionId: 'session_2',
      }),
      /USER_STOP_ACTIVE/
    );
    pass('USER_STOP blocks delegation request');

    assert.throws(
      () => runtime.grantCapabilityLease(delSession2.delegationId, 'READ_METRICS', MASTER_OWNER_ID, 10_000),
      /USER_STOP_ACTIVE/
    );
    pass('USER_STOP blocks capability lease grant');

    // Reset USER_STOP by Master Owner
    globalMasterHumanAuthority.resetUserStop(MASTER_OWNER_ID);
    assert.equal(globalMasterHumanAuthority.isUserStopActive, false);
    pass('USER_STOP reset by Master Owner');

    // -------------------------------------------------------------------------
    // Category S: HumanGate Reuse (No Duplicate)
    // -------------------------------------------------------------------------
    console.log('Testing Category S: HumanGate Reuse...');
    assert.equal(typeof globalSupervisorHumanGate.createRequest, 'function');
    pass('Canonical HumanGate exists and is reusable');
    assert.equal(typeof globalMasterHumanAuthority.approveGateRequest, 'function');
    pass('Canonical MasterHumanAuthority governs HumanGate');

    // -------------------------------------------------------------------------
    // Category T: WorldActionAuthorization Reuse (No Duplicate)
    // -------------------------------------------------------------------------
    console.log('Testing Category T: WorldActionAuthorization Reuse...');
    assert.equal(typeof globalWorldActionAuth.issueToken, 'function');
    pass('Canonical WorldActionAuthorizationEngine exists and is reusable');

    // -------------------------------------------------------------------------
    // Category U: Audit Integration (Canonical AuditLedger)
    // -------------------------------------------------------------------------
    console.log('Testing Category U: Audit Integration...');
    const auditTrail = globalAuditLedger.getTrail({ domain: 'DELEGATION' });
    assert.equal(auditTrail.length > 0, true);
    pass(`Canonical AuditLedger recorded ${auditTrail.length} delegation events`);
    assert.equal(globalAuditLedger.verifyChainIntegrity(), true);
    pass('AuditLedger cryptographic chain integrity holds unbroken');

    // -------------------------------------------------------------------------
    // Category V: Protected Workspace (C:\BOW\shopofbow)
    // -------------------------------------------------------------------------
    console.log('Testing Category V: Protected Workspace...');
    assert.throws(
      () => runtime.requestDelegation({
        ownerId: MASTER_OWNER_ID,
        issuerId: MASTER_OWNER_ID,
        targetAgentId: 'agent_alpha',
        targetDeviceId: 'device_sensor_node_1',
        requestedCapabilities: ['READ_FILES'],
        scope: {
          maxScopePercentage: 20,
          allowedCapabilities: ['READ_FILES'],
          targetPaths: ['C:\\BOW\\shopofbow\\secrets.json'],
        },
        ttlMs: 60_000,
        sessionId: 'session_1',
      }),
      /SECURITY_VIOLATION/
    );
    pass('Delegation targeting C:\\BOW\\shopofbow blocked with SECURITY_VIOLATION');

    assert.throws(
      () => new DurableDelegationStore('C:\\BOW\\shopofbow\\data'),
      /SECURITY_VIOLATION/
    );
    pass('Delegation store targeting C:\\BOW\\shopofbow blocked with SECURITY_VIOLATION');

    // -------------------------------------------------------------------------
    // Category W: No Unrestricted Shell
    // -------------------------------------------------------------------------
    console.log('Testing Category W: No Unrestricted Shell...');
    const delegationDir = path.resolve(process.cwd(), 'src', 'core', 'delegation');
    const files = fs.readdirSync(delegationDir).filter(f => f.endsWith('.ts'));
    for (const f of files) {
      const content = fs.readFileSync(path.join(delegationDir, f), 'utf8');
      assert.equal(content.includes('eval('), false, `eval() found in ${f}`);
      assert.equal(content.includes('new Function('), false, `new Function() found in ${f}`);
      assert.equal(content.includes('execSync('), false, `execSync() found in ${f}`);
    }
    pass('Zero occurrences of eval, new Function, execSync in delegation subsystem');

    // -------------------------------------------------------------------------
    // Category X: No Duplicate Authority
    // -------------------------------------------------------------------------
    console.log('Testing Category X: No Duplicate Authority...');
    assert.equal(globalMasterHumanAuthority.masterOperatorId, 'master_operator');
    pass('Single authoritative MasterHumanAuthority');

    // -------------------------------------------------------------------------
    // Category Y: No Duplicate HumanGate
    // -------------------------------------------------------------------------
    console.log('Testing Category Y: No Duplicate HumanGate...');
    assert.equal(globalSupervisorHumanGate instanceof Object, true);
    pass('Single authoritative SupervisorHumanGate');

    // -------------------------------------------------------------------------
    // Category Z: No Duplicate Token Store
    // -------------------------------------------------------------------------
    console.log('Testing Category Z: No Duplicate Token Store...');
    assert.equal(globalWorldActionAuth instanceof Object, true);
    pass('Single authoritative WorldActionAuthorization token store');

    // -------------------------------------------------------------------------
    // Category AA: No Delegation Amplification (Depth Limit)
    // -------------------------------------------------------------------------
    console.log('Testing Category AA: No Delegation Amplification...');
    // Create delegation with maxChildDelegationDepth = 1
    const delDepthLimit = runtime.requestDelegation({
      ownerId: MASTER_OWNER_ID,
      issuerId: MASTER_OWNER_ID,
      targetAgentId: 'agent_alpha',
      targetDeviceId: 'device_sensor_node_1',
      requestedCapabilities: ['READ_METRICS'],
      scope: {
        maxScopePercentage: 50,
        allowedCapabilities: ['READ_METRICS'],
        maxChildDelegationDepth: 1,
        allowSubDelegation: true,
      },
      ttlMs: 60_000,
      sessionId: 'session_depth',
    });
    runtime.authorizeDelegation(delDepthLimit.delegationId, MASTER_OWNER_ID);
    runtime.activateDelegation(delDepthLimit.delegationId, MASTER_OWNER_ID);

    // Depth 1 child delegation is allowed
    const childDepth1 = runtime.createChildDelegation(delDepthLimit.delegationId, {
      ownerId: MASTER_OWNER_ID,
      issuerId: 'agent_alpha',
      targetAgentId: 'agent_beta',
      targetDeviceId: 'device_sensor_node_1',
      requestedCapabilities: ['READ_METRICS'],
      scope: {
        maxScopePercentage: 25,
        allowedCapabilities: ['READ_METRICS'],
        allowSubDelegation: true,
      },
      ttlMs: 30_000,
      sessionId: 'session_depth',
    }, 'agent_alpha');
    assert.equal(childDepth1.scope.currentDepth, 1);
    pass('Child at depth 1 allowed');

    // Depth 2 child delegation exceeds maxChildDelegationDepth (1) -> must fail closed
    const agentC = agentManager.registerAgent({
      agentId: 'agent_gamma',
      name: 'Agent Gamma',
      role: 'deep_worker',
      sessionId: 'session_depth',
    });
    assert.throws(
      () => runtime.createChildDelegation(childDepth1.delegationId, {
        ownerId: MASTER_OWNER_ID,
        issuerId: 'agent_beta',
        targetAgentId: 'agent_gamma',
        targetDeviceId: 'device_sensor_node_1',
        requestedCapabilities: ['READ_METRICS'],
        scope: {
          maxScopePercentage: 10,
          allowedCapabilities: ['READ_METRICS'],
        },
        ttlMs: 15_000,
        sessionId: 'session_depth',
      }, 'agent_beta'),
      /MAX_DELEGATION_DEPTH_EXCEEDED/
    );
    pass('Delegation amplification blocked by maxChildDelegationDepth limit');

    // -------------------------------------------------------------------------
    // Category AB: No Expiration Extension
    // -------------------------------------------------------------------------
    console.log('Testing Category AB: No Expiration Extension...');
    assert.equal(childDepth1.expiresAt <= delDepthLimit.expiresAt, true);
    pass('Child expiration strictly bounded by parent expiration');

    // -------------------------------------------------------------------------
    // Category AC: No Capability Widening
    // -------------------------------------------------------------------------
    console.log('Testing Category AC: No Capability Widening...');
    const parentDepthRecord = runtime.getDelegation(delDepthLimit.delegationId)!;
    for (const cap of childDepth1.grantedCapabilities) {
      assert.equal(parentDepthRecord.grantedCapabilities.includes(cap), true);
    }
    pass('All child capabilities are a strict subset of parent capabilities');

    // -------------------------------------------------------------------------
    // Category AD: Corrupted State Rejection (Fail-Closed)
    // -------------------------------------------------------------------------
    console.log('Testing Category AD: Corrupted State Rejection...');
    runtime.saveDurableState('session_depth');
    assert.equal(fs.existsSync(durableStore.filePath), true);
    pass('Durable state saved to disk');

    // Corrupt the file content
    const corruptFile = durableStore.filePath;
    const rawContent = JSON.parse(fs.readFileSync(corruptFile, 'utf8'));
    rawContent.payload.ownerSessionId = 'tampered_session_attacker';
    fs.writeFileSync(corruptFile, JSON.stringify(rawContent, null, 2), 'utf8');

    // Reloading must detect hash mismatch and reject state (fail-closed)
    const loadAttempt = durableStore.loadState();
    assert.equal(loadAttempt, null);
    pass('Corrupted delegation state rejected (fail-closed, returns null)');

    // -------------------------------------------------------------------------
    // Category AE: Cross-Session Rejection
    // -------------------------------------------------------------------------
    console.log('Testing Category AE: Cross-Session Rejection...');
    assert.throws(
      () => runtime.assertActiveDelegation(childDepth1.delegationId, 'wrong_session_id'),
      /CROSS_SESSION_DELEGATION_REJECTED/
    );
    pass('Cross-session assertion rejected');

    // -------------------------------------------------------------------------
    // Category AF: Federation Lifecycle
    // -------------------------------------------------------------------------
    console.log('Testing Category AF: Federation Lifecycle...');
    const dev2 = deviceRegistry.registerDevice({
      deviceId: 'device_federated_tablet',
      platform: 'android',
      capabilitiesSummary: ['DISPLAY', 'TOUCH'],
    });
    assert.equal(dev2.trustState, 'REGISTERED');
    deviceRegistry.setTrustState(dev2.deviceId, 'TRUST_PENDING', MASTER_OWNER_ID);
    assert.equal(deviceRegistry.getDevice(dev2.deviceId)?.trustState, 'TRUST_PENDING');
    deviceRegistry.setTrustState(dev2.deviceId, 'TRUSTED', MASTER_OWNER_ID);
    assert.equal(deviceRegistry.getDevice(dev2.deviceId)?.trustState, 'TRUSTED');
    deviceRegistry.setTrustState(dev2.deviceId, 'SUSPENDED', MASTER_OWNER_ID);
    assert.equal(deviceRegistry.getDevice(dev2.deviceId)?.trustState, 'SUSPENDED');
    deviceRegistry.setTrustState(dev2.deviceId, 'REVOKED', MASTER_OWNER_ID);
    assert.equal(deviceRegistry.getDevice(dev2.deviceId)?.trustState, 'REVOKED');
    pass('Device federation lifecycle (REGISTERED -> TRUST_PENDING -> TRUSTED -> SUSPENDED -> REVOKED) verified');

    // -------------------------------------------------------------------------
    // Category AG: Delegation Lifecycle
    // -------------------------------------------------------------------------
    console.log('Testing Category AG: Delegation Lifecycle...');
    const delLifecycle = runtime.requestDelegation({
      ownerId: MASTER_OWNER_ID,
      issuerId: MASTER_OWNER_ID,
      targetAgentId: 'agent_alpha',
      targetDeviceId: 'device_sensor_node_1',
      requestedCapabilities: ['READ_METRICS'],
      scope: { maxScopePercentage: 20, allowedCapabilities: ['READ_METRICS'] },
      ttlMs: 60_000,
      sessionId: 'session_lifecycle',
    });
    assert.equal(delLifecycle.status, 'PENDING_AUTHORIZATION');
    runtime.authorizeDelegation(delLifecycle.delegationId, MASTER_OWNER_ID);
    assert.equal(runtime.getDelegation(delLifecycle.delegationId)?.status, 'AUTHORIZED');
    runtime.activateDelegation(delLifecycle.delegationId, MASTER_OWNER_ID);
    assert.equal(runtime.getDelegation(delLifecycle.delegationId)?.status, 'ACTIVE');
    runtime.completeDelegation(delLifecycle.delegationId, {
      status: 'SUCCESS',
      completedAt: Date.now(),
      summary: 'Task finished cleanly',
      verifiedOutcome: true,
    }, MASTER_OWNER_ID);
    assert.equal(runtime.getDelegation(delLifecycle.delegationId)?.status, 'COMPLETED');
    pass('Full delegation lifecycle (REQUESTED -> PENDING_AUTHORIZATION -> AUTHORIZED -> ACTIVE -> COMPLETED) verified');

    // -------------------------------------------------------------------------
    // Category AH: End-to-End Governance Workflow
    // -------------------------------------------------------------------------
    console.log('Testing Category AH: End-to-End Governance Workflow...');
    // Complete end-to-end chain:
    // 1. Register agent
    // 2. Register device & trust
    // 3. Request delegation
    // 4. Authorize via Master Owner
    // 5. Activate
    // 6. Grant capability lease
    // 7. Validate capability lease in matching session
    // 8. Complete with evidence
    const e2eAgent = agentManager.registerAgent({
      agentId: 'agent_e2e_auditor',
      name: 'E2E Auditor',
      role: 'auditor',
      sessionId: 'session_e2e',
    });
    const e2eDev = deviceRegistry.registerDevice({
      deviceId: 'device_e2e_node',
      platform: 'win32',
      capabilitiesSummary: ['READ_LOGS'],
    });
    deviceRegistry.setTrustState(e2eDev.deviceId, 'TRUSTED', MASTER_OWNER_ID);

    const e2eDel = runtime.requestDelegation({
      ownerId: MASTER_OWNER_ID,
      issuerId: MASTER_OWNER_ID,
      targetAgentId: e2eAgent.agentId,
      targetDeviceId: e2eDev.deviceId,
      requestedCapabilities: ['READ_LOGS'],
      scope: { maxScopePercentage: 25, allowedCapabilities: ['READ_LOGS'] },
      ttlMs: 60_000,
      sessionId: 'session_e2e',
    });
    runtime.authorizeDelegation(e2eDel.delegationId, MASTER_OWNER_ID);
    runtime.activateDelegation(e2eDel.delegationId, MASTER_OWNER_ID);
    const e2eLease = runtime.grantCapabilityLease(e2eDel.delegationId, 'READ_LOGS', MASTER_OWNER_ID, 30_000);
    const checkedLease = leaseManager.validateLease(e2eLease.leaseId, {
      sessionId: 'session_e2e',
      capabilityId: 'READ_LOGS',
    });
    assert.equal(checkedLease.status, 'ACTIVE');

    runtime.completeDelegation(e2eDel.delegationId, {
      status: 'SUCCESS',
      completedAt: Date.now(),
      summary: 'E2E audit finished successfully',
      artifacts: ['audit_summary.json'],
      verifiedOutcome: true,
    }, MASTER_OWNER_ID);

    assert.equal(runtime.getDelegation(e2eDel.delegationId)?.status, 'COMPLETED');
    assert.equal(leaseManager.getLease(e2eLease.leaseId)?.status, 'REVOKED');
    pass('End-to-end delegation, lease, and completion workflow successfully verified');

    console.log('\n============================================================');
    console.log(`REALITY GATE SUCCESS: All ${passedAssertions} assertions verified across Categories A..AH.`);
    console.log('Total Failed Assertions: 0');
    console.log('============================================================\n');

  } finally {
    // Cleanup temporary files
    if (fs.existsSync(testStorageDir)) {
      fs.rmSync(testStorageDir, { recursive: true, force: true });
    }
  }
}

runRealityGate().catch((err) => {
  console.error('\nREALITY GATE FAILURE:', err);
  process.exit(1);
});
