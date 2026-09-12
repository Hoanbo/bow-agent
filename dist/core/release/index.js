// src/core/release/index.ts
// BOWCON V4.0 — MS-1.3.50: GOVERNED CONTINUOUS INTEGRATION & MILESTONE RELEASE VERIFICATION PIPELINE
//
// Barrel export for the governed release verification subsystem.
// Xuất barrel cho phân hệ xác minh phát hành có quản trị.
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.
// Types, identifiers, state machines, and error codes.
// Các kiểu, định danh, máy trạng thái và mã lỗi.
export * from './releaseTypes.js';
// Policy engine (USER_STOP, REVOCATION, protected workspace, candidate lifecycle guards).
// Động cơ chính sách (USER_STOP, REVOCATION, không gian làm việc bảo vệ, bảo vệ vòng đời ứng viên).
export * from './releasePolicyEngine.js';
// Release candidate lifecycle engine.
// Động cơ vòng đời ứng viên phát hành.
export * from './releaseCandidateEngine.js';
// 8-criterion acceptance criteria engine.
// Động cơ 8 tiêu chí chấp nhận.
export * from './releaseAcceptanceCriteriaEngine.js';
// Cross-agent contradiction detection engine.
// Động cơ phát hiện mâu thuẫn giữa các agent.
export * from './releaseContradictionEngine.js';
// 10-stage release verification pipeline.
// Đường ống xác minh phát hành 10 giai đoạn.
export * from './releaseVerificationPipeline.js';
// Central runtime coordinator and global singleton.
// Bộ điều phối runtime trung tâm và singleton toàn cục.
export * from './releaseRuntime.js';
