// src/core/groundedPlanning/index.ts
// BOWCON V4.0 — MS-1.5.07: NATIVE GROUNDED ACTION PLAN SYNTHESIS & GOVERNED PROPOSAL ENGINE
// Component 1047 — REAL
//
// EN: Public module export interface for the Grounded Action Planning subsystem.
//     Exports canonical domain ontology, fails-closed validators, synthesis engines,
//     DAG dependency graph engines, risk classifiers, lifecycle managers, PDP bridge,
//     security boundary, and persistence recovery engine with zero execution authority.
// VI: Giao diện xuất bản module công khai cho phân hệ Lập kế hoạch Hành động Gắn kết.
//     Xuất bản bản thể học miền chuẩn, bộ xác thực đóng-khi-lỗi, động cơ tổng hợp,
//     động cơ đồ thị phụ thuộc DAG, bộ phân loại rủi ro, quản lý vòng đời, cầu nối PDP,
//     ranh giới bảo mật và động cơ lưu trữ phục hồi mà không chứa thẩm quyền thực thi.

// 1038: Plan Types, Error Hierarchy, Bounds, and Provenance Functions
export * from './groundedPlanTypes.js';

// 1039: Grounded Plan Validator (Fails-Closed, Steps, Bounds, Prototype Pollution, CoT Defense)
export * from './groundedPlanValidator.js';

// 1040: Grounded Action Synthesis Engine (Multi-Modal Synthesis, Step Generation, Secret Sanitization)
export * from './groundedActionSynthesisEngine.js';

// 1041: Plan Dependency Graph Engine (DAG Validation, Cycle Detection via DFS, Topological Sort)
export * from './planDependencyGraphEngine.js';

// 1042: Plan Risk Assessment Engine (Multi-Dimensional Risk Classification, Human Confirmation)
export * from './planRiskAssessmentEngine.js';

// 1043: Grounded Plan Lifecycle Manager (State Machine Transitions, OCC CAS Versioning, USER_STOP)
export * from './groundedPlanLifecycleManager.js';

// 1044: Grounded Plan PDP Bridge (Policy Evaluation Delegation, Non-Executable Action Proposals)
export * from './groundedPlanPDPBridge.js';

// 1045: Grounded Plan Security Boundary (Prompt-Injection Defense, Quarantine, Tenant Isolation)
export * from './groundedPlanSecurityBoundary.js';

// 1046: Grounded Plan Persistence & Recovery Engine (Atomic Write .tmp -> .bak -> rename, OCC)
export * from './groundedPlanPersistenceRecoveryEngine.js';
