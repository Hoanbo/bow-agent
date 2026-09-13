// src/core/episodicMemory/index.ts
// BOWCON V4.0 — MS-1.4.09: EPISODIC MEMORY & SYNTHESIS BARREL
//
// EN:
// Canonical public module exports for the Episodic Memory & Synthesis subsystem.
// Exposes types, errors, validator, execution gate, store, synthesizer, and runtime.
//
// VI:
// Điểm xuất module công khai chuẩn hóa cho phân hệ Bộ nhớ Episodic & Tổng hợp.
export { EPISODIC_MEMORY_VERSION, EPISODIC_MEMORY_AUDIT_DOMAIN, MAX_MEMORY_PAYLOAD_BYTES, MAX_MEMORY_DEPTH, EPISODIC_MEMORY_BOUNDS, EpisodicMemoryError, DuplicateMemoryError, CrossTenantMemoryError, MemorySecurityViolationError, MemoryAbortedError, MemoryValidationError, MemoryPersistenceError, } from './episodicMemoryTypes.js';
export { EpisodicMemoryValidator, globalEpisodicMemoryValidator, } from './episodicMemoryValidator.js';
export { EpisodicMemoryExecutionGate, globalEpisodicMemoryExecutionGate, } from './episodicMemoryExecutionGate.js';
export { EpisodicMemoryStore, globalEpisodicMemoryStore, } from './episodicMemoryStore.js';
export { EpisodicMemorySynthesizer, globalEpisodicMemorySynthesizer, } from './episodicMemorySynthesizer.js';
export { EpisodicMemoryRuntime, globalEpisodicMemoryRuntime, } from './episodicMemoryRuntime.js';
