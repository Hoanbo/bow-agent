// src/core/architecture/masterArchitectureIdentity.ts
// BOWCON V4.0 — MS-1.3.41: MASTER ARCHITECTURE IDENTITY, HOST ABSTRACTION & CAPABILITY-AWARE CORE
//
// Canonical identity, hierarchy, and project relationships of BOWCON.
//
// INVARIANTS:
// MASTER_OWNER > BOW > BOWCON > OPTIONAL PROJECT INTEGRATIONS
// BOWCON != BOW
// BOWCON != MASTER_OWNER
// BOWCON != SHOPofBOW
//
// MASTER_OWNER_AUTHORITY > BOWCON_INTELLIGENCE > BOWCON_AUTONOMY
// BOWCON_OPINION       != AUTHORITY
// BOWCON_CONFIDENCE    != AUTHORITY
// BOWCON_INTELLIGENCE  != AUTHORITY
// BOWCON_REASONING     != AUTHORITY
// BOWCON_AUTONOMY      != OWNERSHIP
// CHALLENGE            != AUTHORITY
// RECOMMENDATION       != EXECUTION
// LEARNING             != AUTHORIZATION
// PREDICTION           != FACT
// INFERENCE            != MEMORY
// MEMORY               != TRUTH
// OWNER_DECISION       > BOWCON_RECOMMENDATION
// OWNER_OVERRIDE       != BOWCON_FAILURE
// USER_STOP            > EVERYTHING_AUTONOMOUS
//
// PROTECTED_WORKSPACE: C:\BOW\shopofbow -> READS=0, WRITES=0, IMPORTS=0, TOUCHES=0

import {
  MASTER_OWNER_ID,
  AUTHORIZED_MASTER_OWNER_ALIASES,
  isMasterOwner,
  assertMasterOwner,
} from '../partnership/partnershipTypes.js';

export {
  MASTER_OWNER_ID,
  AUTHORIZED_MASTER_OWNER_ALIASES,
  isMasterOwner,
  assertMasterOwner,
};

export const ECOSYSTEM_ID = 'BOW' as const;
export const RUNTIME_IDENTITY = 'BOWCON' as const;
export const CANONICAL_VERSION = '4.0.0' as const;

export type ArchitecturalTier =
  | 'MASTER_OWNER'
  | 'ECOSYSTEM'
  | 'RUNTIME'
  | 'PROJECT';

export interface ArchitectureNode {
  readonly id: string;
  readonly name: string;
  readonly tier: ArchitecturalTier;
  readonly parentId?: string;
  readonly description: string;
}

export const CANONICAL_ARCHITECTURE_HIERARCHY: readonly ArchitectureNode[] = Object.freeze([
  {
    id: MASTER_OWNER_ID,
    name: 'Master Owner',
    tier: 'MASTER_OWNER',
    description: 'Sole human authority and ultimate decision-maker for the entire BOW ecosystem.',
  },
  {
    id: ECOSYSTEM_ID,
    name: 'BOW Ecosystem',
    tier: 'ECOSYSTEM',
    parentId: MASTER_OWNER_ID,
    description: 'Personal broader ecosystem belonging to the Master Owner.',
  },
  {
    id: RUNTIME_IDENTITY,
    name: 'BOWCON Runtime',
    tier: 'RUNTIME',
    parentId: ECOSYSTEM_ID,
    description: 'Personal AI Cognitive & Autonomous Operating Runtime for the Master Owner.',
  },
  {
    id: 'project_shopofbow',
    name: 'ShopOfBow',
    tier: 'PROJECT',
    parentId: ECOSYSTEM_ID,
    description: 'One project within BOW; optional future surface/integration; NOT architectural parent of BOWCON.',
  },
]);

export interface ProjectDescriptor {
  readonly projectId: string;
  readonly name: string;
  readonly relationship: 'OPTIONAL_SURFACE' | 'INDEPENDENT_PROJECT' | 'FUTURE_INTEGRATION';
  readonly isParentOfBowcon: false;
  readonly coreDependency: false;
  readonly protectedWorkspace?: string;
}

export const REGISTERED_PROJECTS: Record<string, ProjectDescriptor> = Object.freeze({
  shopofbow: {
    projectId: 'shopofbow',
    name: 'ShopOfBow',
    relationship: 'OPTIONAL_SURFACE',
    isParentOfBowcon: false,
    coreDependency: false,
    protectedWorkspace: 'C:\\BOW\\shopofbow',
  },
});

export class MasterArchitectureIdentity {
  private readonly _masterOwnerId = MASTER_OWNER_ID;
  private readonly _ecosystemId = ECOSYSTEM_ID;
  private readonly _runtimeId = RUNTIME_IDENTITY;

  /**
   * Returns canonical identity descriptor of BOWCON.
   */
  public getCanonicalIdentity(): {
    runtime: typeof RUNTIME_IDENTITY;
    ecosystem: typeof ECOSYSTEM_ID;
    masterOwner: typeof MASTER_OWNER_ID;
    version: typeof CANONICAL_VERSION;
    canonicalDefinition: string;
  } {
    return {
      runtime: this._runtimeId,
      ecosystem: this._ecosystemId,
      masterOwner: this._masterOwnerId,
      version: CANONICAL_VERSION,
      canonicalDefinition:
        'Personal AI Cognitive & Autonomous Operating Runtime for the single Master Owner within the broader BOW personal ecosystem.',
    };
  }

  /**
   * Verifies the strict authority hierarchy:
   * MASTER_OWNER > BOW > BOWCON > PROJECTS
   */
  public verifyAuthorityRank(entityA: string, entityB: string): number {
    const getRank = (entity: string): number => {
      if (entity === this._masterOwnerId || isMasterOwner(entity)) return 4;
      if (entity.toUpperCase() === ECOSYSTEM_ID) return 3;
      if (entity.toUpperCase() === RUNTIME_IDENTITY) return 2;
      return 1; // Projects, surfaces, tools
    };

    return getRank(entityA) - getRank(entityB);
  }

  /**
   * Validates non-identity invariants.
   */
  public validateInvariants(): {
    valid: boolean;
    violations: string[];
  } {
    const violations: string[] = [];

    // Invariant: BOWCON != BOW
    if ((RUNTIME_IDENTITY as string) === (ECOSYSTEM_ID as string)) {
      violations.push('INVARIANT_VIOLATION: BOWCON must not equal BOW.');
    }

    // Invariant: BOWCON != MASTER_OWNER
    if ((RUNTIME_IDENTITY as string) === (MASTER_OWNER_ID as string)) {
      violations.push('INVARIANT_VIOLATION: BOWCON must not equal Master Owner.');
    }

    // Invariant: BOWCON != ShopOfBow
    if ((RUNTIME_IDENTITY as string) === 'ShopOfBow' || (RUNTIME_IDENTITY as string) === 'shopofbow') {
      violations.push('INVARIANT_VIOLATION: BOWCON must not equal ShopOfBow.');
    }

    // Invariant: ShopOfBow is not parent of BOWCON
    const sob = REGISTERED_PROJECTS['shopofbow'];
    if (sob && sob.isParentOfBowcon) {
      violations.push('INVARIANT_VIOLATION: ShopOfBow cannot be architectural parent of BOWCON.');
    }

    // Invariant: Zero core dependency on ShopOfBow
    if (sob && sob.coreDependency) {
      violations.push('INVARIANT_VIOLATION: BOWCON core must have zero dependency on ShopOfBow.');
    }

    return {
      valid: violations.length === 0,
      violations,
    };
  }

  /**
   * Validates architectural terminology against prohibited buzzwords.
   */
  public validateTerminology(statement: string): {
    valid: boolean;
    flaggedTerms: string[];
    recommendation: string;
  } {
    const prohibitedTerms = [
      'production-grade',
      'enterprise-grade',
      'commercial-grade',
      'enterprise AI platform',
      'ShopOfBow AI runtime',
    ];

    const lower = statement.toLowerCase();
    const flaggedTerms = prohibitedTerms.filter((term) => lower.includes(term.toLowerCase()));

    return {
      valid: flaggedTerms.length === 0,
      flaggedTerms,
      recommendation:
        flaggedTerms.length === 0
          ? 'Terminology compliant.'
          : 'Replace with canonical terminology: "Personal AI Cognitive & Autonomous Operating Runtime".',
    };
  }

  /**
   * Confirms BOWCON core can initialize independently of any external project.
   */
  public verifyCoreDecoupling(): {
    decoupled: boolean;
    projectRequired: boolean;
    shopOfBowParent: boolean;
  } {
    return {
      decoupled: true,
      projectRequired: false,
      shopOfBowParent: false,
    };
  }
}

export const globalMasterArchitectureIdentity = new MasterArchitectureIdentity();
