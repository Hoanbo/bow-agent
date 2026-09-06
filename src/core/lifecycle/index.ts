// src/core/lifecycle/index.ts
// BOWCON V4.0 — MILESTONE 1.3.13: AGENT STATE & LIFECYCLE MANAGEMENT SUBSYSTEM
//
// EN: Public API exports for Agent State & Lifecycle Management.
// VI: Xuất bản giao diện công khai cho Quản lý Trạng thái & Vòng đời Agent.

export * from './lifecycleTypes.js';
export * from './lifecycleStates.js';
export * from './lifecycleTransitions.js';
export {
  redactLifecycleSecrets,
  containsLifecycleSecret,
  hasLifecyclePrototypePollution,
  validateScope,
  validateSafeMetadata,
  assertRiskPreservation,
  assertGovernancePreservation,
} from './lifecycleValidator.js';
export * from './lifecycleFingerprint.js';
export * from './lifecycleFailure.js';
export * from './lifecycleRecovery.js';
export * from './lifecycleCheckpoint.js';
export * from './lifecycleService.js';
