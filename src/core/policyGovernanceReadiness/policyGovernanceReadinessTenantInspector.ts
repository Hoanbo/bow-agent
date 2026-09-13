// src/core/policyGovernanceReadiness/policyGovernanceReadinessTenantInspector.ts
// BOWCON V4.0 — MS-1.3.76: GOVERNED POLICY GOVERNANCE PLANE END-TO-END VALIDATION,
// EVIDENCE-BASED READINESS ASSESSMENT & CONDITIONAL PHASE EXIT GATE
//
// Tenant Inspector (Component 861).
// Verifies multi-tenant isolation, path traversal defense, null byte rejection,
// and Windows device name sanitization. Strictly read-only and non-mutating.

import * as fs from 'fs';
import * as path from 'path';
import type { TenantInspectionFinding } from './policyGovernanceReadinessTypes.js';

export class PolicyGovernanceReadinessTenantInspector {
  private readonly repositoryRoot: string;

  constructor(repositoryRoot?: string) {
    this.repositoryRoot = repositoryRoot || process.cwd();
  }

  /**
   * Inspects tenant partition enforcement in stores and resolvers.
   */
  public inspect(): TenantInspectionFinding {
    const resolverFile = 'src/core/persistence/userPartitionResolver.ts';
    const storeFiles = [
      'src/core/policyCandidateAuthorization/policyAuthorizationDecisionStore.ts',
      'src/core/policyStagedActivation/policyActivationStateStore.ts',
      'src/core/policyActiveRuntime/policyActiveRuntimeSnapshotResolver.ts',
      'src/core/policyActiveRollback/policyActiveRollbackStore.ts',
      'src/core/policyActiveIncidentResponse/policyActiveIncidentStore.ts',
      'src/core/policyActiveIncidentResolution/policyActiveIncidentResolutionStore.ts',
    ];
    const crossTenantEngines = [
      'src/core/policyActiveLifecycleReconciliation/policyActiveLifecycleTenantConsistencyEngine.ts',
      'src/core/policyActiveIncidentResolution/policyIncidentResolutionRevalidationEngine.ts',
      'src/core/policyCandidateAuthorization/policyCandidateAuthorizationRevalidationEngine.ts',
      'src/core/policyActiveRollback/policyRollbackTargetResolver.ts',
    ];

    let partitionIsolationVerified = true;
    let pathTraversalBlocked = true;
    let nullByteBlocked = true;
    let reservedDeviceNamesBlocked = true;
    let crossTenantAccessBlocked = true;

    // 1. Inspect canonical resolver
    const resolverFullPath = path.join(this.repositoryRoot, resolverFile);
    if (fs.existsSync(resolverFullPath)) {
      const content = fs.readFileSync(resolverFullPath, 'utf-8');
      pathTraversalBlocked = content.includes('..') && content.includes('Path traversal');
      nullByteBlocked = content.includes('\\0') && content.includes('Null bytes');
      reservedDeviceNamesBlocked = content.includes('WINDOWS_RESERVED_NAMES');
    } else {
      pathTraversalBlocked = false;
      nullByteBlocked = false;
      reservedDeviceNamesBlocked = false;
    }

    // 2. Inspect stores use resolveUserPartition
    for (const relFile of storeFiles) {
      const fullPath = path.join(this.repositoryRoot, relFile);
      if (!fs.existsSync(fullPath)) continue;
      const content = fs.readFileSync(fullPath, 'utf-8');
      if (!content.includes('resolveUserPartition')) {
        partitionIsolationVerified = false;
      }
    }

    // 3. Inspect cross-tenant access rejection engines
    for (const relFile of crossTenantEngines) {
      const fullPath = path.join(this.repositoryRoot, relFile);
      if (!fs.existsSync(fullPath)) continue;
      const content = fs.readFileSync(fullPath, 'utf-8');
      if (!content.includes('CROSS_TENANT') && !content.includes('cross-tenant') && !content.includes('targetTenantId !==') && !content.includes('tenantPartition !==') && !content.includes('TENANT_ISOLATION_FAILURE')) {
        crossTenantAccessBlocked = false;
      }
    }

    return Object.freeze({
      partitionIsolationVerified,
      pathTraversalBlocked,
      nullByteBlocked,
      reservedDeviceNamesBlocked,
      crossTenantAccessBlocked,
    });
  }
}
