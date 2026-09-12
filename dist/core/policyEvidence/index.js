// src/core/policyEvidence/index.ts
// BOWCON V4.0 — MS-1.3.63: GOVERNED POLICY EVIDENCE QUERY,
// AUDIT CORRELATION & INTEGRITY VERIFICATION LAYER
//
// Public module export interface for the Governed Policy Evidence Investigation Layer.
// Re-exports all canonical contracts, types, query engines, lifecycle tracers,
// audit correlators, integrity verifiers, and the investigation service facade.
//
// Giao diện xuất mô-đun công khai cho Lớp Điều tra Bằng chứng Chính sách Có quản trị.
// Xuất lại tất cả các hợp đồng, loại, động cơ truy vấn, bộ theo dõi vòng đời,
// bộ tương quan kiểm toán, bộ xác minh toàn vẹn và mặt tiền dịch vụ điều tra chuẩn tắc.
export * from './policyEvidenceQueryTypes.js';
export * from './policyEvidenceQueryEngine.js';
export * from './policyLifecycleTraceEngine.js';
export * from './policyAuditCorrelationEngine.js';
export * from './policyEvidenceIntegrityVerifier.js';
export * from './policyEvidenceInvestigationService.js';
