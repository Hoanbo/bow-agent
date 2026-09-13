// src/core/episodicMemory/episodicMemoryTypes.ts
// BOWCON V4.0 — MS-1.4.09: EPISODIC MEMORY & SYNTHESIS TYPES
//
// EN:
// Authoritative type definitions, contracts, and error taxonomy for Episodic Memory & Synthesis.
// Enforces the strict governance invariant:
// TOOL_OUTPUT != REALITY_PROOF != DURABLE_COMMIT != MEMORY.
// Only durably committed records (status === 'COMMITTED') produced by MS-1.4.08 can become
// authoritative episodic memory. Memory and synthesis never possess execution or policy authority.
//
// VI:
// Các định nghĩa kiểu dữ liệu có thẩm quyền, hợp đồng và phân loại lỗi cho Bộ nhớ Episodic & Tổng hợp.
// Thực thi bất biến quản trị nghiêm ngặt:
// TOOL_OUTPUT != REALITY_PROOF != DURABLE_COMMIT != MEMORY.
// Chỉ các bản ghi đã commit bền vững (status === 'COMMITTED') bởi MS-1.4.08 mới trở thành bộ nhớ episodic có thẩm quyền.
export const EPISODIC_MEMORY_VERSION = '4.0.0';
export const EPISODIC_MEMORY_AUDIT_DOMAIN = 'agent_episodic_memory';
export const MAX_MEMORY_PAYLOAD_BYTES = 65536; // 64 KB
export const MAX_MEMORY_DEPTH = 10;
export const EPISODIC_MEMORY_BOUNDS = {
    MAX_PAYLOAD_BYTES: MAX_MEMORY_PAYLOAD_BYTES,
    MAX_DEPTH: MAX_MEMORY_DEPTH,
};
// ============================================================================
// TYPED ERROR HIERARCHY
// ============================================================================
export class EpisodicMemoryError extends Error {
    details;
    timestamp;
    constructor(message, details) {
        super(message);
        this.details = details;
        this.name = this.constructor.name;
        this.timestamp = new Date().toISOString();
    }
}
export class DuplicateMemoryError extends EpisodicMemoryError {
    code = 'DUPLICATE_MEMORY_ERROR';
}
export class CrossTenantMemoryError extends EpisodicMemoryError {
    code = 'CROSS_TENANT_MEMORY_ERROR';
}
export class MemorySecurityViolationError extends EpisodicMemoryError {
    code = 'MEMORY_SECURITY_VIOLATION';
}
export class MemoryAbortedError extends EpisodicMemoryError {
    code = 'MEMORY_ABORTED_ERROR';
}
export class MemoryValidationError extends EpisodicMemoryError {
    code = 'MEMORY_VALIDATION_ERROR';
}
export class MemoryPersistenceError extends EpisodicMemoryError {
    code = 'MEMORY_PERSISTENCE_ERROR';
}
