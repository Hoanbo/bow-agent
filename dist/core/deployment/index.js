// src/core/deployment/index.ts
// BOWCON V4.0 — MS-1.3.52: GOVERNED PRODUCTION DEPLOYMENT & CANARY VERIFICATION PIPELINE
//
// Public module exports for governed production deployment and canary verification pipeline.
// Xuất khẩu mô-đun công khai cho triển khai sản xuất có quản trị và đường ống xác minh canary.
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.
export * from './deploymentTypes.js';
export * from './deploymentPolicyEngine.js';
export * from './deploymentRingEngine.js';
export * from './sloPolicyEngine.js';
export * from './canaryVerificationEngine.js';
export * from './deploymentCircuitBreaker.js';
export * from './deploymentExecutionEngine.js';
export * from './deploymentRollbackEngine.js';
export * from './deploymentProvenanceEngine.js';
export * from './deploymentContradictionEngine.js';
export * from './deploymentReportEngine.js';
export * from './deploymentRuntime.js';
