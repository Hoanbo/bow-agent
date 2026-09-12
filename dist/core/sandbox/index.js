// src/core/sandbox/index.ts
// BOWCON V4.0 — MS-1.3.47: GOVERNED AUTONOMOUS PROJECT SANDBOX & CONTROLLED WORKTREE ISOLATION
//
// Invariants:
// - MASTER_OWNER_AUTHORITY > BOW > BOWCON > PROJECTS
// - OWNER_DECISION > BOWCON_RECOMMENDATION
// - USER_STOP > EVERYTHING_AUTONOMOUS
// - REVOCATION > AGENT_INTENT
// - SANDBOX != AUTHORITY
// - WORKTREE != AUTHORITY
// - DIFF != AUTHORIZATION
// - VALIDATION != AUTHORIZATION
// - EVIDENCE != AUTHORITY
// - CAPABILITY != AUTHORIZATION
// - DELEGATION != EXECUTION
// - AGENT != MASTER_OWNER
// - DEVICE != MASTER_OWNER
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0 (Fail closed with SECURITY_VIOLATION).
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.
export * from './sandboxTypes.js';
export * from './sandboxPathGuard.js';
export * from './sandboxPolicyEngine.js';
export * from './governedSandboxManager.js';
export * from './sandboxFilesystemEngine.js';
export * from './worktreeIsolationEngine.js';
export * from './sandboxManifestEngine.js';
export * from './sandboxDiffEngine.js';
export * from './sandboxRollbackEngine.js';
export * from './sandboxReviewEngine.js';
export * from './sandboxExportEngine.js';
export * from './sandboxRuntime.js';
