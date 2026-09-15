// src/core/longHorizonExecution/longHorizonExecutionValidator.ts
// BOWCON V4.0 — MS-1.5.11: LONG-HORIZON EXECUTION VALIDATOR
// Component 1079 — REAL
//
// EN: Fails-closed validator for long-horizon objectives, budgets, sessions, and records.
//     Enforces prototype pollution defense, CoT prohibition, and prompt injection quarantine.
// VI: Trình xác thực thất bại-đóng cho mục tiêu tầm nhìn dài, ngân sách, phiên và bản ghi.
//     Thực thi phòng thủ ô nhiễm prototype, cấm CoT và cách ly tiêm nhiễm prompt.
import { LongHorizonValidationError, LongHorizonSecurityBoundaryError, LongHorizonTenantIsolationError, LongHorizonSessionIsolationError, MAX_LONG_HORIZON_GENERATIONS, MAX_LONG_HORIZON_STEPS, MAX_REPLANNING_ATTEMPTS, MAX_WALL_CLOCK_MS, computeObjectiveProvenanceHash, } from './longHorizonExecutionTypes.js';
const PROHIBITED_COT_MARKERS = [
    '<thought>',
    '</thought>',
    '[scratchpad]',
    '[/scratchpad]',
    'chainOfThought',
    'modelThinking',
    'deliberation',
    'cot',
];
const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'];
const SUSPICIOUS_INJECTION_PATTERNS = [
    /ignore\s+(?:all\s+)?(?:previous|prior)\s+instructions/i,
    /system\s+override/i,
    /bypass\s+governance/i,
    /grant\s+(?:full\s+)?admin/i,
    /disable\s+(?:security|protection|user_stop)/i,
];
export class LongHorizonExecutionValidator {
    /**
     * EN: Recursively sanitizes and validates an object against prototype pollution, CoT, and prompt injection.
     * VI: Đệ quy khử trùng và xác thực đối tượng chống ô nhiễm prototype, CoT và tiêm nhiễm prompt.
     */
    static sanitizeAndValidateData(obj, path = 'root') {
        if (obj === null || obj === undefined) {
            return;
        }
        if (typeof obj === 'string') {
            // Check CoT markers
            for (const marker of PROHIBITED_COT_MARKERS) {
                if (obj.includes(marker)) {
                    throw new LongHorizonValidationError(`Prohibited CoT/deliberation marker detected in payload at ${path}: "${marker}"`);
                }
            }
            // Check Prompt Injection patterns
            for (const pattern of SUSPICIOUS_INJECTION_PATTERNS) {
                if (pattern.test(obj)) {
                    throw new LongHorizonValidationError(`Untrusted prompt injection pattern detected in payload at ${path}: "${obj.slice(0, 80)}..."`);
                }
            }
            return;
        }
        if (Array.isArray(obj)) {
            for (let i = 0; i < obj.length; i++) {
                this.sanitizeAndValidateData(obj[i], `${path}[${i}]`);
            }
            return;
        }
        if (typeof obj === 'object') {
            const keys = Object.keys(obj);
            for (const key of keys) {
                if (DANGEROUS_KEYS.includes(key)) {
                    throw new LongHorizonValidationError(`Prototype pollution attempt detected with key "${key}" at ${path}`);
                }
                this.sanitizeAndValidateData(obj[key], `${path}.${key}`);
            }
        }
    }
    /**
     * EN: Validates tenant and session IDs across boundaries.
     * VI: Xác thực mã định danh tenant và session qua các ranh giới.
     */
    static validateIsolation(expectedTenantId, expectedSessionId, actualTenantId, actualSessionId) {
        if (!expectedTenantId || !actualTenantId || expectedTenantId.trim() !== actualTenantId.trim()) {
            throw new LongHorizonTenantIsolationError(expectedTenantId, actualTenantId);
        }
        if (!expectedSessionId || !actualSessionId || expectedSessionId.trim() !== actualSessionId.trim()) {
            throw new LongHorizonSessionIsolationError(expectedSessionId, actualSessionId);
        }
    }
    /**
     * EN: Validates autonomy budget constraints against system-wide maximums.
     * VI: Xác thực các ràng buộc ngân sách tự chủ so với mức tối đa toàn hệ thống.
     */
    static validateBudget(budget) {
        if (!budget || typeof budget !== 'object') {
            throw new LongHorizonValidationError('Autonomy budget must be a non-null object');
        }
        this.sanitizeAndValidateData(budget, 'budget');
        if (budget.maxGenerations <= 0 || budget.maxGenerations > MAX_LONG_HORIZON_GENERATIONS) {
            throw new LongHorizonValidationError(`maxGenerations (${budget.maxGenerations}) must be between 1 and ${MAX_LONG_HORIZON_GENERATIONS}`);
        }
        if (budget.maxSteps <= 0 || budget.maxSteps > MAX_LONG_HORIZON_STEPS) {
            throw new LongHorizonValidationError(`maxSteps (${budget.maxSteps}) must be between 1 and ${MAX_LONG_HORIZON_STEPS}`);
        }
        if (budget.maxReplanningAttempts < 0 || budget.maxReplanningAttempts > MAX_REPLANNING_ATTEMPTS) {
            throw new LongHorizonValidationError(`maxReplanningAttempts (${budget.maxReplanningAttempts}) must be between 0 and ${MAX_REPLANNING_ATTEMPTS}`);
        }
        if (budget.maxWallClockMs <= 0 || budget.maxWallClockMs > MAX_WALL_CLOCK_MS) {
            throw new LongHorizonValidationError(`maxWallClockMs (${budget.maxWallClockMs}) must be between 1 and ${MAX_WALL_CLOCK_MS}`);
        }
    }
    /**
     * EN: Validates a GovernedLongHorizonObjective envelope.
     * VI: Xác thực một phong bì mục tiêu GovernedLongHorizonObjective.
     */
    static validateObjective(objective) {
        if (!objective || typeof objective !== 'object') {
            throw new LongHorizonValidationError('Objective must be a non-null object');
        }
        this.sanitizeAndValidateData(objective, 'objective');
        if (!objective.objectiveId || typeof objective.objectiveId !== 'string') {
            throw new LongHorizonValidationError('Invalid or missing objectiveId');
        }
        if (!objective.tenantId || typeof objective.tenantId !== 'string') {
            throw new LongHorizonValidationError('Invalid or missing tenantId');
        }
        if (!objective.sessionId || typeof objective.sessionId !== 'string') {
            throw new LongHorizonValidationError('Invalid or missing sessionId');
        }
        if (!objective.objectiveDescription || typeof objective.objectiveDescription !== 'string') {
            throw new LongHorizonValidationError('Invalid or missing objectiveDescription');
        }
        if (!Array.isArray(objective.successCriteria) || objective.successCriteria.length === 0) {
            throw new LongHorizonValidationError('successCriteria must be a non-empty array of criteria');
        }
        if (!Array.isArray(objective.failureCriteria)) {
            throw new LongHorizonValidationError('failureCriteria must be an array');
        }
        if (typeof objective.provenanceHash !== 'string' || objective.provenanceHash.length !== 64) {
            throw new LongHorizonValidationError('provenanceHash must be a valid 64-char SHA-256 hex string');
        }
        // Validate budget
        this.validateBudget(objective.autonomyBudget);
    }
    /**
     * EN: Validates a LongHorizonGeneration record.
     * VI: Xác thực một bản ghi thế hệ LongHorizonGeneration.
     */
    static validateGeneration(generation) {
        if (!generation || typeof generation !== 'object') {
            throw new LongHorizonValidationError('Generation must be a non-null object');
        }
        this.sanitizeAndValidateData(generation, 'generation');
        if (!generation.generationId || typeof generation.generationId !== 'string') {
            throw new LongHorizonValidationError('Invalid or missing generationId');
        }
        if (typeof generation.generationNumber !== 'number' || generation.generationNumber < 0) {
            throw new LongHorizonValidationError('generationNumber must be a non-negative integer');
        }
        if (generation.generationNumber >= MAX_LONG_HORIZON_GENERATIONS) {
            throw new LongHorizonValidationError(`generationNumber ${generation.generationNumber} exceeds ceiling ${MAX_LONG_HORIZON_GENERATIONS}`);
        }
        if (!generation.objectiveId || typeof generation.objectiveId !== 'string') {
            throw new LongHorizonValidationError('Invalid or missing objectiveId');
        }
        if (typeof generation.provenanceHash !== 'string' || generation.provenanceHash.length !== 64) {
            throw new LongHorizonValidationError('provenanceHash must be a valid 64-char SHA-256 hex string');
        }
    }
    /**
     * EN: Validates a LongHorizonProgressRecord.
     * VI: Xác thực một bản ghi tiến trình LongHorizonProgressRecord.
     */
    static validateProgressRecord(record) {
        if (!record || typeof record !== 'object') {
            throw new LongHorizonValidationError('Progress record must be a non-null object');
        }
        this.sanitizeAndValidateData(record, 'progressRecord');
        if (!record.recordId || typeof record.recordId !== 'string') {
            throw new LongHorizonValidationError('Invalid or missing recordId');
        }
        if (!record.objectiveId || typeof record.objectiveId !== 'string') {
            throw new LongHorizonValidationError('Invalid or missing objectiveId');
        }
        if (typeof record.progressScore !== 'number' || record.progressScore < 0 || record.progressScore > 1) {
            throw new LongHorizonValidationError('progressScore must be a number in [0.0, 1.0]');
        }
        if (typeof record.provenanceHash !== 'string' || record.provenanceHash.length !== 64) {
            throw new LongHorizonValidationError('provenanceHash must be a valid 64-char SHA-256 hex string');
        }
    }
    /**
     * EN: Validates a LongHorizonSession object.
     * VI: Xác thực đối tượng LongHorizonSession.
     */
    static validateSession(session) {
        if (!session || typeof session !== 'object') {
            throw new LongHorizonValidationError('Session must be a non-null object');
        }
        this.sanitizeAndValidateData(session, 'session');
        if (!session.horizonSessionId || typeof session.horizonSessionId !== 'string') {
            throw new LongHorizonValidationError('Invalid or missing horizonSessionId');
        }
        if (!session.tenantId || typeof session.tenantId !== 'string') {
            throw new LongHorizonValidationError('Invalid or missing tenantId');
        }
        if (!session.sessionId || typeof session.sessionId !== 'string') {
            throw new LongHorizonValidationError('Invalid or missing sessionId');
        }
        this.validateObjective(session.objective);
        this.validateBudget(session.budget);
        if (session.generations.length > session.budget.maxGenerations) {
            throw new LongHorizonValidationError(`Session generation count ${session.generations.length} exceeds max allowed ${session.budget.maxGenerations}`);
        }
        for (const gen of session.generations) {
            this.validateGeneration(gen);
        }
        if (typeof session.provenanceHash !== 'string' || session.provenanceHash.length !== 64) {
            throw new LongHorizonValidationError('session provenanceHash must be a valid 64-char SHA-256 hex string');
        }
    }
    /**
     * EN: Validates a LongHorizonSessionDocument for persistence.
     * VI: Xác thực tài liệu LongHorizonSessionDocument để lưu trữ.
     */
    static validateSessionDocument(doc) {
        if (!doc || typeof doc !== 'object') {
            throw new LongHorizonValidationError('Session document must be a non-null object');
        }
        this.sanitizeAndValidateData(doc, 'sessionDocument');
        if (!doc.schemaVersion || typeof doc.schemaVersion !== 'string') {
            throw new LongHorizonValidationError('Invalid or missing schemaVersion');
        }
        if (typeof doc.sessionVersion !== 'number' || doc.sessionVersion < 1) {
            throw new LongHorizonValidationError('sessionVersion must be a positive integer >= 1');
        }
        if (typeof doc.documentHash !== 'string' || doc.documentHash.length !== 64) {
            throw new LongHorizonValidationError('documentHash must be a valid 64-char SHA-256 hex string');
        }
        this.validateSession(doc.session);
    }
    // ==========================================================================
    // Instance Methods for Object-Oriented Pipelines
    // ==========================================================================
    validateObjectiveEnvelope(objective) {
        LongHorizonExecutionValidator.validateObjective(objective);
    }
    validateObjective(objective) {
        LongHorizonExecutionValidator.validateObjective(objective);
    }
    validateObjectiveScope(objective, requestedScope) {
        for (const scope of requestedScope) {
            if (!objective.authorizationScope.includes(scope)) {
                throw new LongHorizonSecurityBoundaryError(`Requested scope "${scope}" exceeds authorized objective scope [${objective.authorizationScope.join(', ')}]`);
            }
        }
    }
    validatePrototypePollution(obj) {
        const checkKeys = (val, currentPath = 'root') => {
            if (!val || typeof val !== 'object')
                return;
            if (Array.isArray(val)) {
                val.forEach((item, idx) => checkKeys(item, `${currentPath}[${idx}]`));
                return;
            }
            for (const k of Object.keys(val)) {
                if (DANGEROUS_KEYS.includes(k)) {
                    throw new LongHorizonSecurityBoundaryError(`Prototype pollution attempt detected with key "${k}" at ${currentPath}`);
                }
                checkKeys(val[k], `${currentPath}.${k}`);
            }
        };
        checkKeys(obj);
    }
    validateNoCoT(obj) {
        const checkCoT = (val, currentPath = 'root') => {
            if (typeof val === 'string') {
                for (const marker of PROHIBITED_COT_MARKERS) {
                    if (val.includes(marker)) {
                        throw new LongHorizonSecurityBoundaryError(`Prohibited CoT/deliberation marker detected at ${currentPath}: "${marker}"`);
                    }
                }
                return;
            }
            if (Array.isArray(val)) {
                val.forEach((item, idx) => checkCoT(item, `${currentPath}[${idx}]`));
                return;
            }
            if (val && typeof val === 'object') {
                for (const [k, v] of Object.entries(val)) {
                    checkCoT(v, `${currentPath}.${k}`);
                }
            }
        };
        checkCoT(obj);
    }
    validateObjectiveProvenance(objective) {
        const expected = computeObjectiveProvenanceHash(objective);
        if (objective.provenanceHash !== expected) {
            throw new LongHorizonSecurityBoundaryError(`Objective provenance mismatch: expected ${expected}, got ${objective.provenanceHash}`);
        }
    }
    validateReplanningRequest(req) {
        if (!req || typeof req !== 'object') {
            throw new LongHorizonValidationError('Replanning request must be a non-null object');
        }
        if (!req.requestId || !req.tenantId || !req.sessionId || !req.generationId || !req.reason) {
            throw new LongHorizonValidationError('Replanning request missing required fields');
        }
        if (!req.evidenceProvenanceHash || req.evidenceProvenanceHash.length !== 64) {
            throw new LongHorizonValidationError('Replanning request must contain a valid 64-char evidence hash');
        }
    }
}
