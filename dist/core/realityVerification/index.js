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
// Constants & Bounds
REALITY_VERIFICATION_VERSION, REALITY_VERIFICATION_AUDIT_DOMAIN, REALITY_VERIFICATION_BOUNDS, MAX_EVIDENCE_PAYLOAD_BYTES, MAX_EVIDENCE_DEPTH, DEFAULT_MAX_EVIDENCE_AGE_MS, 
// Errors & Error Types
RealityVerificationError, VerificationAbortedError, VerificationValidationError, CrossTenantVerificationError, StaleTaskVerificationError, ContradictoryEvidenceError, VerificationSecurityViolationError, } from './realityVerificationTypes.js';
// Component 935: Evidence Collector
export { RealityEvidenceCollector, } from './realityEvidenceCollector.js';
// Component 936: Postcondition Verification Oracle
export { PostconditionVerificationOracle, } from './postconditionVerificationOracle.js';
// Component 937: Verification Execution Gate
export { VerificationExecutionGate, } from './verificationExecutionGate.js';
// Component 938: Reality Verification Runtime
export { RealityVerificationRuntime, } from './realityVerificationRuntime.js';
