// src/core/vision/index.ts
// BOWCON V4.0 — MS-1.5.06: NATIVE BRAIN INTEGRATION & SCREEN VISION LOCALIZATION
// Component 1037 — REAL
//
// EN: Public module interface for the Screen Vision Localization subsystem.
//     Exports canonical domain ontology, fails-closed validators, normalizers,
//     element detectors, spatial relationship engine, visual grounding engine,
//     security boundary, and persistence recovery engine with zero execution authority.
// VI: Giao diện module công khai cho phân hệ Định vị Thị giác Màn hình.
//     Xuất bản hệ thống kiểu chuẩn, bộ xác thực đóng-khi-lỗi, bộ chuẩn hóa,
//     bộ phát hiện phần tử, động cơ quan hệ không gian, động cơ định vị thị giác,
//     ranh giới bảo mật và động cơ lưu trữ phục hồi mà không chứa thẩm quyền thực thi.

// 1028: Vision Types, Error Hierarchy, Bounds, and Provenance Functions
export * from './visionTypes.js';

// 1029: Vision Input Validator (Fails-Closed, Viewport, Prototype Pollution, CoT Defense)
export * from './visionInputValidator.js';

// 1030: Visual Frame Normalizer (Geometry Normalization [0.0, 1.0], Centroid Math)
export * from './visualFrameNormalizer.js';

// 1031: Visual Element Detection Engine (Element Categorization, Stable Deterministic IDs)
export * from './visualElementDetectionEngine.js';

// 1032: Visual Localization Engine (Containment, Overlap, Euclidean Distance)
export * from './visualLocalizationEngine.js';

// 1033: Visual Relationship Engine (Bounded Spatial Graph: LEFT_OF, ABOVE, CONTAINS, etc.)
export * from './visualRelationshipEngine.js';

// 1034: Visual Grounding Engine (Cognitive Reference Resolution, Ambiguity Rule)
export * from './visualGroundingEngine.js';

// 1035: Visual Security Boundary (Screenshot Injection Defense, Quarantine, USER_STOP)
export * from './visualSecurityBoundary.js';

// 1036: Vision Persistence & Recovery Engine (Crash-Safe Atomic Write, .bak Fallback, OCC)
export * from './visionPersistenceRecoveryEngine.js';
