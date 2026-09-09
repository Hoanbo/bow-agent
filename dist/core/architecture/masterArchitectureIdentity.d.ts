import { MASTER_OWNER_ID, AUTHORIZED_MASTER_OWNER_ALIASES, isMasterOwner, assertMasterOwner } from '../partnership/partnershipTypes.js';
export { MASTER_OWNER_ID, AUTHORIZED_MASTER_OWNER_ALIASES, isMasterOwner, assertMasterOwner, };
export declare const ECOSYSTEM_ID: "BOW";
export declare const RUNTIME_IDENTITY: "BOWCON";
export declare const CANONICAL_VERSION: "4.0.0";
export type ArchitecturalTier = 'MASTER_OWNER' | 'ECOSYSTEM' | 'RUNTIME' | 'PROJECT';
export interface ArchitectureNode {
    readonly id: string;
    readonly name: string;
    readonly tier: ArchitecturalTier;
    readonly parentId?: string;
    readonly description: string;
}
export declare const CANONICAL_ARCHITECTURE_HIERARCHY: readonly ArchitectureNode[];
export interface ProjectDescriptor {
    readonly projectId: string;
    readonly name: string;
    readonly relationship: 'OPTIONAL_SURFACE' | 'INDEPENDENT_PROJECT' | 'FUTURE_INTEGRATION';
    readonly isParentOfBowcon: false;
    readonly coreDependency: false;
    readonly protectedWorkspace?: string;
}
export declare const REGISTERED_PROJECTS: Record<string, ProjectDescriptor>;
export declare class MasterArchitectureIdentity {
    private readonly _masterOwnerId;
    private readonly _ecosystemId;
    private readonly _runtimeId;
    /**
     * Returns canonical identity descriptor of BOWCON.
     */
    getCanonicalIdentity(): {
        runtime: typeof RUNTIME_IDENTITY;
        ecosystem: typeof ECOSYSTEM_ID;
        masterOwner: typeof MASTER_OWNER_ID;
        version: typeof CANONICAL_VERSION;
        canonicalDefinition: string;
    };
    /**
     * Verifies the strict authority hierarchy:
     * MASTER_OWNER > BOW > BOWCON > PROJECTS
     */
    verifyAuthorityRank(entityA: string, entityB: string): number;
    /**
     * Validates non-identity invariants.
     */
    validateInvariants(): {
        valid: boolean;
        violations: string[];
    };
    /**
     * Validates architectural terminology against prohibited buzzwords.
     */
    validateTerminology(statement: string): {
        valid: boolean;
        flaggedTerms: string[];
        recommendation: string;
    };
    /**
     * Confirms BOWCON core can initialize independently of any external project.
     */
    verifyCoreDecoupling(): {
        decoupled: boolean;
        projectRequired: boolean;
        shopOfBowParent: boolean;
    };
}
export declare const globalMasterArchitectureIdentity: MasterArchitectureIdentity;
