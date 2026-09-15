// ============================================================================
// BOWCON V4.0 — MILESTONE MS-1.5.18
// Component 1149: CrossFederationStrategicMemoryRegistry
// Strategic Memory Entity Registry, Admission Guard, & Security Sanitizer
// ============================================================================

import {
  StrategicMemoryRecord,
  MAX_STRATEGIC_MEMORY_RECORDS_PER_TENANT,
  GovernedStrategicMemorySecurityError,
  computeStrategicMemoryRecordHash,
} from './GovernedStrategicMemoryTypes';

export class CrossFederationStrategicMemoryRegistry {
  private readonly records = new Map<string, StrategicMemoryRecord>();
  private readonly tenantRecordMap = new Map<string, Set<string>>();

  // EN: Registers and admits a strategic memory record into the governed registry.
  // VI: Đăng ký và tiếp nhận bản ghi bộ nhớ chiến lược vào sổ đăng ký có kiểm soát.
  public admitRecord(record: StrategicMemoryRecord): StrategicMemoryRecord {
    this.validateRecordStructure(record);
    this.enforceTenantBoundary(record.tenantId);
    this.sanitizeAgainstPrototypePollution(record);
    const sanitizedRecord = this.deepSanitizeSecretsAndCoT(record);

    // Compute cryptographic provenance hash
    const provenanceHash = computeStrategicMemoryRecordHash(sanitizedRecord);
    const admittedRecord: StrategicMemoryRecord = {
      ...sanitizedRecord,
      provenanceHash,
    };

    // Store in partition
    this.records.set(admittedRecord.recordId, admittedRecord);

    let tenantRecords = this.tenantRecordMap.get(admittedRecord.tenantId);
    if (!tenantRecords) {
      tenantRecords = new Set<string>();
      this.tenantRecordMap.set(admittedRecord.tenantId, tenantRecords);
    }
    tenantRecords.add(admittedRecord.recordId);

    return admittedRecord;
  }

  // EN: Retrieves a record by ID ensuring strict tenant isolation.
  // VI: Truy xuất bản ghi theo ID đảm bảo cô lập tenant nghiêm ngặt.
  public getRecord(tenantId: string, recordId: string): StrategicMemoryRecord | undefined {
    this.assertValidTenant(tenantId);
    const record = this.records.get(recordId);
    if (!record) {
      return undefined;
    }
    if (record.tenantId !== tenantId) {
      // EN: Fail-closed on cross-tenant access attempt.
      // VI: Đóng kín khi có nỗ lực truy cập chéo tenant.
      throw new GovernedStrategicMemorySecurityError(
        `Cross-tenant access violation: Caller tenant '${tenantId}' cannot access record of tenant '${record.tenantId}'`
      );
    }
    return record;
  }

  // EN: Lists all records for a specific tenant partition.
  // VI: Liệt kê tất cả bản ghi của một phân vùng tenant cụ thể.
  public listRecordsByTenant(tenantId: string): StrategicMemoryRecord[] {
    this.assertValidTenant(tenantId);
    const recordIds = this.tenantRecordMap.get(tenantId);
    if (!recordIds) {
      return [];
    }
    const result: StrategicMemoryRecord[] = [];
    for (const id of recordIds) {
      const rec = this.records.get(id);
      if (rec && rec.tenantId === tenantId) {
        result.push(rec);
      }
    }
    return result;
  }

  // EN: Removes a record from the registry for a specific tenant.
  // VI: Xoá bản ghi khỏi sổ đăng ký cho tenant cụ thể.
  public removeRecord(tenantId: string, recordId: string): boolean {
    this.assertValidTenant(tenantId);
    const record = this.records.get(recordId);
    if (!record) {
      return false;
    }
    if (record.tenantId !== tenantId) {
      throw new GovernedStrategicMemorySecurityError(
        `Cross-tenant deletion violation: Caller tenant '${tenantId}' cannot delete record of tenant '${record.tenantId}'`
      );
    }
    this.records.delete(recordId);
    const tenantRecords = this.tenantRecordMap.get(tenantId);
    if (tenantRecords) {
      tenantRecords.delete(recordId);
    }
    return true;
  }

  // EN: Clears in-memory records (used during test teardown).
  // VI: Xoá sạch bản ghi trong bộ nhớ (dùng khi dọn dẹp kiểm thử).
  public clear(): void {
    this.records.clear();
    this.tenantRecordMap.clear();
  }

  // --------------------------------------------------------------------------
  // Security & Sanitization Helpers
  // --------------------------------------------------------------------------

  private validateRecordStructure(record: StrategicMemoryRecord): void {
    if (!record.recordId || typeof record.recordId !== 'string') {
      throw new GovernedStrategicMemorySecurityError('Invalid strategic memory record: missing recordId');
    }
    if (!record.tenantId || typeof record.tenantId !== 'string') {
      throw new GovernedStrategicMemorySecurityError('Invalid strategic memory record: missing tenantId');
    }
    if (!record.sessionId || typeof record.sessionId !== 'string') {
      throw new GovernedStrategicMemorySecurityError('Invalid strategic memory record: missing sessionId');
    }
    if (record.confidenceScore < 0 || record.confidenceScore > 1 || isNaN(record.confidenceScore)) {
      throw new GovernedStrategicMemorySecurityError('Invalid strategic memory record: confidenceScore must be between 0.0 and 1.0');
    }
    if (record.stabilityScore < 0 || record.stabilityScore > 1 || isNaN(record.stabilityScore)) {
      throw new GovernedStrategicMemorySecurityError('Invalid strategic memory record: stabilityScore must be between 0.0 and 1.0');
    }
  }

  private enforceTenantBoundary(tenantId: string): void {
    this.assertValidTenant(tenantId);
    const tenantRecords = this.tenantRecordMap.get(tenantId);
    if (tenantRecords && tenantRecords.size >= MAX_STRATEGIC_MEMORY_RECORDS_PER_TENANT) {
      throw new GovernedStrategicMemorySecurityError(
        `Tenant capacity ceiling exceeded: max ${MAX_STRATEGIC_MEMORY_RECORDS_PER_TENANT} records per tenant`
      );
    }
  }

  private assertValidTenant(tenantId: string): void {
    if (!tenantId || tenantId.trim().length === 0) {
      throw new GovernedStrategicMemorySecurityError('Tenant identifier must not be empty');
    }
    // Reject path traversal attempts in tenant ID
    if (tenantId.includes('..') || tenantId.includes('/') || tenantId.includes('\\') || tenantId.includes('\0')) {
      throw new GovernedStrategicMemorySecurityError(`Malicious tenant identifier detected: '${tenantId}'`);
    }
  }

  // EN: Defends against prototype pollution by sanitizing keys across objects.
  // VI: Phòng thủ chống prototype pollution bằng cách làm sạch các khoá trên toàn bộ đối tượng.
  public sanitizeAgainstPrototypePollution(obj: unknown): void {
    if (obj === null || typeof obj !== 'object') {
      return;
    }
    if (Array.isArray(obj)) {
      for (const item of obj) {
        this.sanitizeAgainstPrototypePollution(item);
      }
      return;
    }
    const record = obj as Record<string, unknown>;
    const propNames = Object.getOwnPropertyNames(record);
    for (const key of propNames) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        delete record[key];
        throw new GovernedStrategicMemorySecurityError(`Prototype pollution attempt detected and blocked: '${key}'`);
      }
      this.sanitizeAgainstPrototypePollution(record[key]);
    }
  }

  // EN: Deeply sanitizes credentials, secrets, and eliminates chain-of-thought scratchpads.
  // VI: Làm sạch sâu thông tin xác thực, bí mật và loại bỏ bản nháp suy luận từng bước (CoT).
  public deepSanitizeSecretsAndCoT(record: StrategicMemoryRecord): StrategicMemoryRecord {
    const raw = JSON.stringify(record);

    // Prompt injection check: flag untrusted prompt injection patterns
    const injectionPatterns = [
      /ignore\s+previous\s+instructions/i,
      /system\s*override/i,
      /you\s+are\s+now\s+in\s+god\s+mode/i,
      /bypass\s+governance/i,
    ];

    let hasInjectionAttempt = false;
    for (const pattern of injectionPatterns) {
      if (pattern.test(raw)) {
        hasInjectionAttempt = true;
        break;
      }
    }

    // CoT markers check: reject or quarantine reasoning scratchpad markers
    const cotPatterns = [
      /<thought>[\s\S]*?<\/thought>/gi,
      /<cot>[\s\S]*?<\/cot>/gi,
      /<deliberation>[\s\S]*?<\/deliberation>/gi,
      /\[scratchpad\][\s\S]*?\[\/scratchpad\]/gi,
    ];

    let sanitizedString = raw;
    for (const pattern of cotPatterns) {
      sanitizedString = sanitizedString.replace(pattern, '[SCRUBBED_COT]');
    }

    // Secret scrubbers (API keys, bearer tokens, passwords)
    const secretPatterns = [
      /bearer\s+[a-zA-Z0-9_\-\.]{15,}/gi,
      /api[_-]?key\s*[:=]\s*(?:\\*["'])?[a-zA-Z0-9_\-]{16,}(?:\\*["'])?/gi,
      /password\s*[:=]\s*(?:\\*["'])?[^"'\s\\]{6,}(?:\\*["'])?/gi,
      /private[_-]?key\s*[:=]\s*(?:\\*["'])?[a-zA-Z0-9_\-]{16,}(?:\\*["'])?/gi,
    ];

    for (const pattern of secretPatterns) {
      sanitizedString = sanitizedString.replace(pattern, '[SCRUBBED_SECRET]');
    }

    const sanitizedObj = JSON.parse(sanitizedString) as StrategicMemoryRecord;

    // If injection was detected, quarantine the converged strategy digest
    if (hasInjectionAttempt) {
      sanitizedObj.convergedStrategyDigest = `[QUARANTINED_UNTRUSTED_INJECTION]: ${sanitizedObj.convergedStrategyDigest.substring(0, 100)}`;
    }

    return sanitizedObj;
  }
}
