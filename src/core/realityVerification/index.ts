/**
 * BOWCON V4 — Component 939: RealityVerificationModuleIndex
 * MS-1.4.07: Empirical Reality Verification Engine
 *
 * Clean public barrel export for the Reality Verification subsystem.
 * Exposes authoritative contracts, evidence collection, deterministic oracle,
 * execution gates, and runtime facade.
 */

// Component 934: Authoritative Types & Contracts
export {
  // Types & Enums
  type RealityVerificationStatus,
  type VerificationStatus,
  type VerificationRecommendation,
  type RealityVerificationRecommendation,
  type EvidenceSource,
  type RealityEvidenceSource,
  type EvidenceIntegrity,
  type RealityEvidence,
  type RealityVerificationSummary,
  type VerificationFailure,
  type RealityVerificationFailure,
  type RealityVerificationRequest,
  type VerificationRequest,
  type RealityVerificationResult,
  type VerificationContext,
  type RealityVerificationAuditEventType,

  // Constants & Bounds
  REALITY_VERIFICATION_VERSION,
  REALITY_VERIFICATION_AUDIT_DOMAIN,
  REALITY_VERIFICATION_BOUNDS,
  MAX_EVIDENCE_PAYLOAD_BYTES,
  MAX_EVIDENCE_DEPTH,
  DEFAULT_MAX_EVIDENCE_AGE_MS,

  // Errors & Error Types
  RealityVerificationError,
  VerificationAbortedError,
  VerificationValidationError,
  CrossTenantVerificationError,
  StaleTaskVerificationError,
  ContradictoryEvidenceError,
  VerificationSecurityViolationError,
  type VerificationError,
  type VerificationSecurityError,
  type VerificationTenantMismatchError,
  type VerificationStaleError,
  type VerificationMalformedError,
} from './realityVerificationTypes.js';

// Component 935: Evidence Collector
export {
  RealityEvidenceCollector,
  type RealityEvidenceCollectorOptions,
} from './realityEvidenceCollector.js';

// Component 936: Postcondition Verification Oracle
export {
  PostconditionVerificationOracle,
  type OracleEvaluationOutcome,
} from './postconditionVerificationOracle.js';

// Component 937: Verification Execution Gate
export {
  VerificationExecutionGate,
  type VerificationGateCheckpoint,
  type VerificationExecutionGateOptions,
} from './verificationExecutionGate.js';

// Component 938: Reality Verification Runtime
export {
  RealityVerificationRuntime,
  type RealityVerificationRuntimeOptions,
} from './realityVerificationRuntime.js';
