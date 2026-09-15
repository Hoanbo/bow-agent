// src/core/governedFederatedKnowledgeState/FederatedKnowledgeRegistry.ts
// BOWCON V4.0 — MS-1.5.16: GOVERNED FEDERATED KNOWLEDGE STATE & COLLECTIVE INTELLIGENCE ENGINE
// Component 1129 — REAL
//
// EN: Governed registry validating knowledge entities, enforcing tenant/session/mission/federation binding,
//     prototype pollution defense, prompt injection quarantine, and CoT/deliberation exclusion.
// VI: Sổ đăng ký có quản trị xác thực các thực thể tri thức, thực thi liên kết tenant/phiên/nhiệm vụ/liên đoàn,
//     phòng chống ô nhiễm nguyên mẫu, cách ly tiêm nhiễm prompt, và loại trừ suy nghĩ CoT.
import { GovernedFederatedKnowledgeStateValidationError, GovernedFederatedKnowledgeStateTenantIsolationError, GovernedFederatedKnowledgeStateSessionIsolationError, GovernedFederatedKnowledgeStateAuthorizationError, computeKnowledgeEntryHash, } from './GovernedFederatedKnowledgeStateTypes.js';
export class FederatedKnowledgeRegistry {
    entries = new Map();
    /**
     * EN: Scrubs content for prototype pollution, prompt injection, CoT deliberation, and credentials.
     * VI: Lọc sạch nội dung chống lại ô nhiễm nguyên mẫu, tiêm nhiễm prompt, suy luận CoT, và thông tin xác thực.
     */
    validateUntrustedContent(content) {
        if (!content || typeof content !== 'string' || content.trim().length === 0) {
            throw new GovernedFederatedKnowledgeStateValidationError('Knowledge content cannot be empty');
        }
        // CoT deliberation markers check
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
                throw new GovernedFederatedKnowledgeStateValidationError(`CoT or deliberation marker '${marker}' detected in knowledge content`);
            }
        }
        // Prompt injection check
        const injectionPatterns = [
            /ignore\s+previous\s+instructions/i,
            /system\s+override/i,
            /disable\s+safety/i,
            /bypass\s+(policy|governance|authorization)/i,
            /jailbreak/i,
            /override\s+human\s+authority/i,
        ];
        for (const pattern of injectionPatterns) {
            if (pattern.test(content)) {
                throw new GovernedFederatedKnowledgeStateValidationError(`Prompt injection pattern detected in knowledge content: "${pattern.source}"`);
            }
        }
        // Secret / credential check
        const secretPatterns = [
            /bearer\s+[a-zA-Z0-9_\-\.]{20,}/i,
            /eyJ[a-zA-Z0-9_\-]+\.eyJ[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+/,
            /-----BEGIN (RSA|EC|OPENSSH|PRIVATE) KEY-----/,
            /api[_-]?key\s*[:=]\s*['"][a-zA-Z0-9_\-]{16,}['"]/i,
        ];
        for (const sp of secretPatterns) {
            if (sp.test(content)) {
                throw new GovernedFederatedKnowledgeStateValidationError('Credential, private key, or bearer token detected in knowledge content');
            }
        }
    }
    /**
     * EN: Validates objects against prototype pollution keys.
     * VI: Xác thực đối tượng chống lại các khóa ô nhiễm nguyên mẫu.
     */
    assertNoPrototypePollution(obj) {
        if (Object.prototype.hasOwnProperty.call(obj, '__proto__') ||
            Object.prototype.hasOwnProperty.call(obj, 'constructor') ||
            Object.prototype.hasOwnProperty.call(obj, 'prototype')) {
            throw new GovernedFederatedKnowledgeStateValidationError('Prototype pollution key detected in knowledge data');
        }
    }
    /**
     * EN: Registers a new governed knowledge entry.
     * VI: Đăng ký một mục tri thức có quản trị mới.
     */
    registerKnowledgeEntry(params) {
        if (!params.knowledgeId || params.knowledgeId.trim().length === 0) {
            throw new GovernedFederatedKnowledgeStateValidationError('Knowledge ID cannot be empty');
        }
        if (this.entries.has(params.knowledgeId)) {
            throw new GovernedFederatedKnowledgeStateValidationError(`Knowledge entry '${params.knowledgeId}' already exists`);
        }
        if (!params.tenantId || params.tenantId.trim().length === 0) {
            throw new GovernedFederatedKnowledgeStateTenantIsolationError('Tenant ID cannot be empty');
        }
        if (!params.sessionId || params.sessionId.trim().length === 0) {
            throw new GovernedFederatedKnowledgeStateSessionIsolationError('Session ID cannot be empty');
        }
        if (!params.humanOperatorId || !params.missionId || !params.objectiveId || !params.federationId) {
            throw new GovernedFederatedKnowledgeStateValidationError('Human operator ID, mission ID, objective ID, and federation ID are mandatory');
        }
        if (!params.authorizationEnvelopeId || params.authorizationEnvelopeId.trim().length === 0) {
            throw new GovernedFederatedKnowledgeStateAuthorizationError('Authorization envelope ID is mandatory');
        }
        if (params.expiresAt <= Date.now()) {
            throw new GovernedFederatedKnowledgeStateValidationError('Knowledge entry expiration must be in the future');
        }
        this.validateUntrustedContent(params.content);
        const now = Date.now();
        const base = {
            knowledgeId: params.knowledgeId,
            tenantId: params.tenantId,
            sessionId: params.sessionId,
            humanOperatorId: params.humanOperatorId,
            missionId: params.missionId,
            objectiveId: params.objectiveId,
            federationId: params.federationId,
            sourceAgentId: params.sourceAgentId,
            knowledgeType: params.knowledgeType,
            content: params.content,
            confidence: Math.max(0, Math.min(1, params.confidence)),
            evidenceIds: [...params.evidenceIds],
            lineageId: params.lineageId,
            generation: params.generation,
            version: 1,
            createdAt: now,
            updatedAt: now,
            expiresAt: params.expiresAt,
            authorizationEnvelopeId: params.authorizationEnvelopeId,
            leaseId: params.leaseId,
        };
        const provenanceHash = computeKnowledgeEntryHash(base);
        const entry = {
            ...base,
            provenanceHash,
        };
        this.entries.set(entry.knowledgeId, entry);
        return entry;
    }
    /**
     * EN: Retrieves a knowledge entry by ID.
     * VI: Lấy một mục tri thức theo mã định danh.
     */
    getEntry(knowledgeId) {
        return this.entries.get(knowledgeId);
    }
    /**
     * EN: Asserts boundary invariants between caller and knowledge entry.
     * VI: Khẳng định các bất biến ranh giới giữa bên gọi và mục tri thức.
     */
    assertEntryBoundaries(knowledgeId, tenantId, sessionId) {
        const entry = this.entries.get(knowledgeId);
        if (!entry) {
            throw new GovernedFederatedKnowledgeStateValidationError(`Knowledge entry '${knowledgeId}' not found`);
        }
        if (entry.tenantId !== tenantId) {
            throw new GovernedFederatedKnowledgeStateTenantIsolationError(`Cross-tenant access rejected: entry tenant '${entry.tenantId}' != caller '${tenantId}'`, tenantId);
        }
        if (entry.sessionId !== sessionId) {
            throw new GovernedFederatedKnowledgeStateSessionIsolationError(`Cross-session access rejected: entry session '${entry.sessionId}' != caller '${sessionId}'`, tenantId);
        }
        return entry;
    }
    /**
     * EN: Lists active non-expired entries for a federation.
     * VI: Liệt kê các mục hoạt động chưa hết hạn cho một liên đoàn.
     */
    listActiveEntries(tenantId, sessionId, federationId) {
        const now = Date.now();
        return Array.from(this.entries.values()).filter((e) => e.tenantId === tenantId &&
            e.sessionId === sessionId &&
            e.federationId === federationId &&
            e.expiresAt > now);
    }
    /**
     * EN: Clears registry in-memory state.
     * VI: Xóa trạng thái trong bộ nhớ của sổ đăng ký.
     */
    clear() {
        this.entries.clear();
    }
}
