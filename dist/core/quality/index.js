// src/core/quality/index.ts
// BOWCON V4.0 — MS-1.3.49: GOVERNED PROJECT BUILD, TEST & CONTINUOUS QUALITY GATE PIPELINE
//
// Public entry point and canonical exports for the Governed Quality Pipeline subsystem.
// Điểm truy cập công khai và xuất khẩu chuẩn tắc cho hệ thống con Đường ống Chất lượng Có quản trị.
//
// STRICT INVARIANTS:
// - MASTER_OWNER_AUTHORITY > BOW > BOWCON > PROJECTS
// - OWNER_DECISION > BOWCON_RECOMMENDATION
// - USER_STOP > EVERYTHING_AUTONOMOUS
// - REVOCATION > AGENT_INTENT
// - BUILD_SUCCESS != OWNER_APPROVAL
// - TEST_SUCCESS != OWNER_APPROVAL
// - QUALITY_PASS != PROMOTION_AUTHORIZATION
// - QUALITY_REPORT != AUTHORIZATION
// - EVIDENCE != AUTHORITY
// - VERIFICATION != AUTHORIZATION
// - ZERO SHELL EXECUTION (Zero eval, new Function, execSync, child_process, SSH).
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0 (Fail closed with SECURITY_VIOLATION).
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.
export * from './qualityTypes.js';
export * from './qualityCommandRegistry.js';
export * from './qualityPolicyEngine.js';
export * from './governedExecutionEngine.js';
export * from './buildExecutionEngine.js';
export * from './testExecutionEngine.js';
export * from './qualityEvidenceEngine.js';
export * from './qualityVerificationEngine.js';
export * from './qualityContradictionEngine.js';
export * from './qualityGateEngine.js';
export * from './qualityReportEngine.js';
export * from './qualityRuntime.js';
