// src/core/federatedCollaborationMemory/collaborationMemoryEngine.ts
// BOWCON V4.0 — MS-1.5.15: NATIVE GOVERNED FEDERATED COLLABORATION MEMORY, SHARED CONTEXT & CONSENSUS GOVERNANCE ENGINE
// Component 1121 — REAL
//
// EN: Governed federation-local collaboration memory engine enforcing capacity bounds,
//     secret scrubbing, CoT exclusion, prompt injection quarantine, and expiration pruning.
// VI: Động cơ bộ nhớ hợp tác cục bộ liên đoàn có quản trị thực thi giới hạn dung lượng,
//     lọc bỏ bí mật, loại trừ CoT, cách ly tiêm nhiễm prompt, và dọn dẹp mục hết hạn.
import { MAX_MEMORY_ENTRIES_PER_FEDERATION, MAX_MEMORY_ENTRIES_PER_AGENT, FederatedCollaborationMemoryValidationError, FederatedCollaborationMemoryTenantIsolationError, FederatedCollaborationMemorySessionIsolationError, FederatedCollaborationMemoryBudgetError, computeMemoryEntryHash, } from './federatedCollaborationMemoryTypes.js';
import { CollaborationMemorySecurityBoundary } from './collaborationMemorySecurityBoundary.js';
export class CollaborationMemoryEngine {
    securityBoundary;
    entries = new Map();
    constructor(options) {
        this.securityBoundary = options?.securityBoundary ?? new CollaborationMemorySecurityBoundary();
    }
    /**
     * EN: Scrubs content for secrets, tokens, PII, and CoT deliberation markers.
     * VI: Lọc nội dung chống lại bí mật, token, PII, và các dấu hiệu suy nghĩ CoT.
     */
    sanitizeContent(content) {
        if (!content || typeof content !== 'string') {
            throw new FederatedCollaborationMemoryValidationError('Memory content must be a non-empty string');
        }
        // CoT / deliberation markers check
        const cotMarkers = [
            '<thought>',
            '</thought>',
            '[scratchpad]',
            'chainOfThought',
            'modelThinking',
            '<deliberation>',
            '</deliberation>',
            '<cot>',
            '</cot>',
        ];
        for (const marker of cotMarkers) {
            if (content.includes(marker)) {
                throw new FederatedCollaborationMemoryValidationError(`Deliberation or CoT marker '${marker}' forbidden in collaboration memory`);
            }
        }
        // Prompt injection check
        const injectionPatterns = [
            /ignore\s+previous\s+instructions/i,
            /system\s+override/i,
            /disable\s+safety/i,
            /bypass\s+(policy|governance|authorization)/i,
            /jailbreak/i,
            /override\s+governance/i,
        ];
        for (const pattern of injectionPatterns) {
            if (pattern.test(content)) {
                throw new FederatedCollaborationMemoryValidationError(`Prompt injection pattern forbidden in collaboration memory: "${pattern.source}"`);
            }
        }
        // Secret / credential patterns check
        const secretPatterns = [
            /bearer\s+[a-zA-Z0-9_\-\.]{20,}/i,
            /eyJ[a-zA-Z0-9_\-]+\.eyJ[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+/, // JWT
            /-----BEGIN (RSA|EC|OPENSSH|PRIVATE) KEY-----/,
            /api[_-]?key\s*[:=]\s*['"][a-zA-Z0-9_\-]{16,}['"]/i,
            /password\s*[:=]\s*['"][^'"]{8,}['"]/i,
        ];
        for (const sp of secretPatterns) {
            if (sp.test(content)) {
                throw new FederatedCollaborationMemoryValidationError('Credential, private key, or secret pattern detected in collaboration memory');
            }
        }
    }
    /**
     * EN: Writes or updates a memory entry with synchronous security checkpoint.
     * VI: Ghi hoặc cập nhật một mục bộ nhớ với điểm kiểm tra bảo mật đồng bộ.
     */
    writeMemory(params) {
        // 1. Checkpoint: PRE_MEMORY_WRITE
        this.securityBoundary.assertStopInactive('PRE_MEMORY_WRITE', params.tenantId, params.federationId);
        // 2. Validate content
        this.sanitizeContent(params.content);
        // 3. Expiry check
        if (params.expiresAt <= Date.now()) {
            throw new FederatedCollaborationMemoryValidationError('Memory entry expiration must be in the future');
        }
        // 4. Capacity bounds check
        const fedEntries = Array.from(this.entries.values()).filter((e) => e.tenantId === params.tenantId && e.federationId === params.federationId && e.expiresAt > Date.now());
        if (!this.entries.has(params.memoryId) && fedEntries.length >= MAX_MEMORY_ENTRIES_PER_FEDERATION) {
            throw new FederatedCollaborationMemoryBudgetError(`Federation reached MAX_MEMORY_ENTRIES_PER_FEDERATION limit (${MAX_MEMORY_ENTRIES_PER_FEDERATION})`, params.tenantId, params.federationId);
        }
        const agentEntries = fedEntries.filter((e) => e.agentId === params.agentId);
        if (!this.entries.has(params.memoryId) && agentEntries.length >= MAX_MEMORY_ENTRIES_PER_AGENT) {
            throw new FederatedCollaborationMemoryBudgetError(`Agent '${params.agentId}' reached MAX_MEMORY_ENTRIES_PER_AGENT limit (${MAX_MEMORY_ENTRIES_PER_AGENT})`, params.tenantId, params.federationId);
        }
        const existing = this.entries.get(params.memoryId);
        let version = 1;
        if (existing) {
            // Validate isolation consistency
            if (existing.tenantId !== params.tenantId) {
                throw new FederatedCollaborationMemoryTenantIsolationError(`Cross-tenant overwrite attempt: '${existing.tenantId}' != '${params.tenantId}'`, params.tenantId);
            }
            if (existing.sessionId !== params.sessionId) {
                throw new FederatedCollaborationMemorySessionIsolationError(`Cross-session overwrite attempt: '${existing.sessionId}' != '${params.sessionId}'`, params.tenantId);
            }
            version = existing.version + 1;
        }
        const now = Date.now();
        const base = {
            memoryId: params.memoryId,
            tenantId: params.tenantId,
            sessionId: params.sessionId,
            missionId: params.missionId,
            objectiveId: params.objectiveId,
            federationId: params.federationId,
            agentId: params.agentId,
            generation: params.generation,
            memoryType: params.memoryType,
            content: params.content,
            confidence: Math.max(0, Math.min(1, params.confidence)),
            version,
            createdAt: existing ? existing.createdAt : now,
            expiresAt: params.expiresAt,
        };
        const provenanceHash = computeMemoryEntryHash(base);
        const entry = {
            ...base,
            provenanceHash,
        };
        this.entries.set(entry.memoryId, entry);
        return entry;
    }
    /**
     * EN: Reads a memory entry by ID enforcing tenant, session, and active lease/expiration.
     * VI: Đọc một mục bộ nhớ theo mã định danh, thực thi tenant, phiên và thời hạn hết hạn.
     */
    readMemory(memoryId, tenantId, sessionId, federationId) {
        this.securityBoundary.assertStopInactive('PRE_MEMORY_READ', tenantId, federationId);
        const entry = this.entries.get(memoryId);
        if (!entry) {
            throw new FederatedCollaborationMemoryValidationError(`Memory entry '${memoryId}' not found`);
        }
        if (entry.tenantId !== tenantId) {
            throw new FederatedCollaborationMemoryTenantIsolationError(`Cross-tenant read rejected: entry tenant '${entry.tenantId}' != caller '${tenantId}'`, tenantId);
        }
        if (entry.sessionId !== sessionId) {
            throw new FederatedCollaborationMemorySessionIsolationError(`Cross-session read rejected: entry session '${entry.sessionId}' != caller '${sessionId}'`, tenantId);
        }
        if (entry.federationId !== federationId) {
            throw new FederatedCollaborationMemoryValidationError(`Cross-federation read rejected: entry federation '${entry.federationId}' != caller '${federationId}'`);
        }
        if (entry.expiresAt <= Date.now()) {
            throw new FederatedCollaborationMemoryValidationError(`Memory entry '${memoryId}' has expired`);
        }
        return entry;
    }
    /**
     * EN: Queries active non-expired memory entries for a federation.
     * VI: Truy vấn các mục bộ nhớ hoạt động chưa hết hạn cho một liên đoàn.
     */
    queryActiveMemories(tenantId, sessionId, federationId) {
        const now = Date.now();
        return Array.from(this.entries.values()).filter((e) => e.tenantId === tenantId &&
            e.sessionId === sessionId &&
            e.federationId === federationId &&
            e.expiresAt > now);
    }
    /**
     * EN: Prunes expired memory entries.
     * VI: Thu gom và loại bỏ các mục bộ nhớ đã hết hạn.
     */
    pruneExpired() {
        const now = Date.now();
        let count = 0;
        for (const [id, entry] of this.entries.entries()) {
            if (entry.expiresAt <= now) {
                this.entries.delete(id);
                count++;
            }
        }
        return count;
    }
    /**
     * EN: Clears all memory entries (for test tear down or partition purge).
     * VI: Xóa tất cả các mục bộ nhớ (dùng cho dọn dẹp kiểm thử hoặc xóa phân vùng).
     */
    clear() {
        this.entries.clear();
    }
}
