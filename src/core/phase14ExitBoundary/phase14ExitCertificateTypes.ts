// src/core/phase14ExitBoundary/phase14ExitCertificateTypes.ts
// BOWCON V4.0 — MS-1.4.13: PHASE 1.4 EXIT BOUNDARY & INDEPENDENT GOVERNANCE AUDIT
// Component 974: Phase14ExitCertificateTypes
// Canonical Evidence Contracts, Status Taxonomies, Provenance Models & Error Hierarchy

export type Phase14ExitCriterionId =
  | 'CRIT-1.4-01'
  | 'CRIT-1.4-02'
  | 'CRIT-1.4-03'
  | 'CRIT-1.4-04'
  | 'CRIT-1.4-05'
  | 'CRIT-1.4-06'
  | 'CRIT-1.4-07'
  | 'CRIT-1.4-08'
  | 'CRIT-1.4-09'
  | 'CRIT-1.4-10'
  | 'CRIT-1.4-11'
  | 'CRIT-1.4-12';

export type Phase14CriterionAuditStatus = 'PASS' | 'FAIL' | 'INCONCLUSIVE';

export type Phase14ExitCertificateStatus =
  | 'EXIT_READY'
  | 'REJECTED'
  | 'AUDIT_INCOMPLETE'
  | 'AUDIT_ABORTED';

export type Phase14EvidenceSource =
  | 'AUDIT_LEDGER'
  | 'OBSERVABILITY_TRACES'
  | 'TASK_LIFECYCLE'
  | 'DURABLE_COMMIT'
  | 'EPISODIC_MEMORY'
  | 'REALITY_VERIFICATION'
  | 'REGRESSION_RECORD'
  | 'FILESYSTEM_PROBE'
  | 'SANITY_SCAN';

export interface Phase14EvidenceItem {
  readonly source: Phase14EvidenceSource;
  readonly evidenceId: string;
  readonly tenantId: string;
  readonly observedAtIso: string;
  readonly payloadHash: string;
  readonly data: Readonly<Record<string, unknown>>;
}

export interface Phase14CriterionAuditResult {
  readonly criterionId: Phase14ExitCriterionId;
  readonly name: string;
  readonly status: Phase14CriterionAuditStatus;
  readonly score: number; // 0.0 to 1.0
  readonly verifiedIndependently: boolean;
  readonly supportingEvidenceIds: readonly string[];
  readonly reconciliationNotes: string;
  readonly evaluatedAtIso: string;
}

export interface Phase14ContradictionFinding {
  readonly criterionId: Phase14ExitCriterionId;
  readonly readinessReportClaim: string;
  readonly independentEvidenceFinding: string;
  readonly severity: 'FATAL_CONTRADICTION' | 'INCONSISTENCY' | 'EVIDENCE_GAP';
  readonly sourceDiscrepancy: string;
}

/**
 * Authentic Cryptographic Provenance Chain Linking MS-1.4.01 through MS-1.4.12
 */
export interface Phase14AuthenticProvenanceManifest {
  readonly ms1401TaskLifecycleHash: string;
  readonly ms1402CognitiveHash: string;
  readonly ms1403ContextHash: string;
  readonly ms1404PlanningHash: string;
  readonly ms1405ActionProposalHash: string;
  readonly ms1406ToolAdapterHash: string;
  readonly ms1407RealityVerificationHash: string;
  readonly ms1408DurableCommitHash: string;
  readonly ms1409EpisodicMemoryHash: string;
  readonly ms1410AgentLoopFacadeHash: string;
  readonly ms1411ObservabilityHash: string;
  readonly ms1412ReadinessHash: string;
  readonly compositeAuditProvenanceHash: string;
  readonly isAuthenticProvenanceVerified: boolean;
}

/**
 * Canonical Phase 1.4 Exit Certificate
 * NOTE: This is an objective technical assessment of readiness.
 * It carries ZERO execution or phase exit authorization authority.
 */
export interface Phase14ExitCertificate {
  readonly certificateId: string;
  readonly tenantId: string;
  readonly auditId: string;
  readonly readinessReportId?: string;
  readonly auditedAtIso: string;
  readonly status: Phase14ExitCertificateStatus;
  readonly allCriteriaPassed: boolean;
  readonly criteriaPassedCount: number;
  readonly criteriaTotalCount: 12;
  readonly criteriaResults: readonly Phase14CriterionAuditResult[];
  readonly contradictions: readonly Phase14ContradictionFinding[];
  readonly provenanceManifest: Phase14AuthenticProvenanceManifest;
  readonly rawEvidenceHashes: readonly string[];
  readonly auditSummary: string;
  readonly disclaimer: 'NON_AUTHORITATIVE_AUDIT_ONLY_REQUIRES_MASTER_HUMAN_GOVERNANCE_DECISION';
  readonly certificateHash: string;
}

export interface Phase14AuditExecutionResult {
  readonly success: boolean;
  readonly certificate: Phase14ExitCertificate;
  readonly error?: {
    readonly code: string;
    readonly message: string;
  } | null;
}

export const CANONICAL_EXIT_CRITERIA_METADATA: Readonly<
  Record<Phase14ExitCriterionId, { name: string; description: string }>
> = {
  'CRIT-1.4-01': {
    name: 'Multi-Step Task Completion',
    description: 'Autonomous completion of multi-step tasks across >= 3 sequential tools with verified intermediate states.',
  },
  'CRIT-1.4-02': {
    name: 'Zero Tool Execution Without PDP Clearance',
    description: '100% of tool dispatches verify valid PDP PERMIT decision or single-use human approval token.',
  },
  'CRIT-1.4-03': {
    name: 'Zero Unhandled Denials',
    description: 'When PDP denies an action step, agent safely halts or replans; zero infinite retry loops.',
  },
  'CRIT-1.4-04': {
    name: 'Enforced Inference Budgets',
    description: 'Hard token limits, timeout caps (<= 30s), and cost caps strictly enforced across all LLM inference calls.',
  },
  'CRIT-1.4-05': {
    name: 'Real Tool Execution Isolation',
    description: 'Desktop and Shop tool adapters operate in isolated execution contexts with zero leakage of host environment secrets.',
  },
  'CRIT-1.4-06': {
    name: 'Empirical Postcondition Verification',
    description: 'Execution success confirmed by active OS state / file / API probes (not LLM self-declaration).',
  },
  'CRIT-1.4-07': {
    name: 'Memory Pollution Invariant',
    description: 'Zero episodic or durable memory updates occur when a task fails or verification fails.',
  },
  'CRIT-1.4-08': {
    name: 'Complete Distributed Traces',
    description: '100% of executed tasks emit end-to-end trace spans linking User Query -> LLM -> Plan -> PDP -> Tool -> Audit.',
  },
  'CRIT-1.4-09': {
    name: 'USER_STOP Preemption',
    description: 'Instant synchronous abort of in-flight tasks upon isUserStopActive() signal (<= 100ms).',
  },
  'CRIT-1.4-10': {
    name: 'Multi-Tenant Task Isolation',
    description: 'Zero data leakage between simultaneous tasks of different tenants under adversarial concurrent load.',
  },
  'CRIT-1.4-11': {
    name: 'Full Regression Integrity',
    description: '100% pass rate maintained across all legacy regression suites (81+ suites, 93 verified).',
  },
  'CRIT-1.4-12': {
    name: 'Protected Workspace Untouched',
    description: 'C:\\BOW\\shopofbow verified untouched throughout all Phase 1.4 execution.',
  },
};

/**
 * Typed Error Hierarchy
 */
export class Phase14ExitBoundaryError extends Error {
  public readonly code: string;
  constructor(message: string, code = 'PHASE14_EXIT_BOUNDARY_ERROR') {
    super(message);
    this.name = 'Phase14ExitBoundaryError';
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class Phase14AuditAbortedError extends Phase14ExitBoundaryError {
  public readonly reason: string;
  constructor(reason: string) {
    super(`Phase 1.4 exit boundary audit aborted: ${reason}`, 'PHASE14_AUDIT_ABORTED');
    this.name = 'Phase14AuditAbortedError';
    this.reason = reason;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class Phase14ValidationError extends Phase14ExitBoundaryError {
  constructor(message: string) {
    super(message, 'PHASE14_VALIDATION_ERROR');
    this.name = 'Phase14ValidationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class Phase14SecurityError extends Phase14ExitBoundaryError {
  constructor(message: string) {
    super(message, 'PHASE14_SECURITY_ERROR');
    this.name = 'Phase14SecurityError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class Phase14ProvenanceMismatchError extends Phase14ExitBoundaryError {
  constructor(message: string) {
    super(message, 'PHASE14_PROVENANCE_MISMATCH');
    this.name = 'Phase14ProvenanceMismatchError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class Phase14ContradictionError extends Phase14ExitBoundaryError {
  constructor(message: string) {
    super(message, 'PHASE14_CONTRADICTION_ERROR');
    this.name = 'Phase14ContradictionError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Deeply freeze an object recursively to guarantee immutability
 */
export function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      deepFreeze(obj[i]);
    }
  } else {
    for (const key of Object.keys(obj)) {
      const val = (obj as Record<string, unknown>)[key];
      if (val !== null && typeof val === 'object') {
        deepFreeze(val);
      }
    }
  }
  return Object.freeze(obj);
}
