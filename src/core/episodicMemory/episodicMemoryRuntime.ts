// src/core/episodicMemory/episodicMemoryRuntime.ts
// BOWCON V4.0 — MS-1.4.09: EPISODIC MEMORY RUNTIME
//
// EN:
// Master runtime façade coordinating the Episodic Memory Engine lifecycle:
// Gate 1 -> Request Validation -> Commit Authority Gating -> Binding Validation ->
// Gate 2 -> Duplicate Detection -> Memory Provenance Calculation -> Gate 3 -> Atomic Persistence ->
// Synthesis -> Gate 4 -> Audit Logging -> Deeply Immutable Result.
//
// VI:
// Façade runtime trung tâm điều phối toàn bộ vòng đời của Động cơ Bộ nhớ Episodic:
// Cổng 1 -> Xác thực Yêu cầu -> Gating Thẩm quyền Commit -> Xác thực Liên kết ->
// Cổng 2 -> Phát hiện Trùng lặp -> Tính toán Memory Provenance -> Cổng 3 -> Lưu trữ Nguyên tử ->
// Tổng hợp -> Cổng 4 -> Ghi Audit -> Kết quả Bất biến Sâu.

import crypto from 'node:crypto';
import {
  type EpisodicMemoryRequest,
  type EpisodicMemoryResult,
  type EpisodicMemoryRecord,
  type EpisodicMemorySynthesis,
  type EpisodicMemoryStatus,
  type EpisodicMemoryAuditEventType,
  EPISODIC_MEMORY_AUDIT_DOMAIN,
  DuplicateMemoryError,
} from './episodicMemoryTypes.js';
import {
  EpisodicMemoryValidator,
  globalEpisodicMemoryValidator,
} from './episodicMemoryValidator.js';
import {
  EpisodicMemoryExecutionGate,
  globalEpisodicMemoryExecutionGate,
} from './episodicMemoryExecutionGate.js';
import {
  EpisodicMemoryStore,
  globalEpisodicMemoryStore,
} from './episodicMemoryStore.js';
import {
  EpisodicMemorySynthesizer,
  globalEpisodicMemorySynthesizer,
} from './episodicMemorySynthesizer.js';
import {
  globalAuditLedger,
  type AuditLedger,
} from '../auditLedger.js';
import {
  globalDiagnosisSanitizer,
  type DiagnosisSanitizer,
} from '../diagnosis/diagnosisSanitizer.js';
import type { DurableCommitRecord } from '../durableCommit/durableCommitTypes.js';

export interface EpisodicMemoryRuntimeOptions {
  readonly validator?: EpisodicMemoryValidator;
  readonly gate?: EpisodicMemoryExecutionGate;
  readonly store?: EpisodicMemoryStore;
  readonly synthesizer?: EpisodicMemorySynthesizer;
  readonly auditLedger?: AuditLedger;
  readonly sanitizer?: DiagnosisSanitizer;
}

export class EpisodicMemoryRuntime {
  private readonly validator: EpisodicMemoryValidator;
  private readonly gate: EpisodicMemoryExecutionGate;
  private readonly store: EpisodicMemoryStore;
  private readonly synthesizer: EpisodicMemorySynthesizer;
  private readonly auditLedger: AuditLedger;
  private readonly sanitizer: DiagnosisSanitizer;

  constructor(options?: EpisodicMemoryRuntimeOptions) {
    this.validator = options?.validator ?? globalEpisodicMemoryValidator;
    this.gate = options?.gate ?? globalEpisodicMemoryExecutionGate;
    this.store = options?.store ?? globalEpisodicMemoryStore;
    this.synthesizer = options?.synthesizer ?? globalEpisodicMemorySynthesizer;
    this.auditLedger = options?.auditLedger ?? globalAuditLedger;
    this.sanitizer = options?.sanitizer ?? globalDiagnosisSanitizer;
  }

  /**
   * EN: Recursively deep-freezes an object to guarantee absolute immutability.
   */
  private deepFreeze<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    Object.freeze(obj);
    for (const key of Object.getOwnPropertyNames(obj)) {
      const val = (obj as any)[key];
      if (val !== null && typeof val === 'object' && !Object.isFrozen(val)) {
        this.deepFreeze(val);
      }
    }
    return obj;
  }

  /**
   * EN: Produces a canonical JSON string with deterministically sorted keys.
   */
  private canonicalJSON(obj: unknown): string {
    if (obj === null || typeof obj !== 'object') {
      return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
      return '[' + obj.map((x) => this.canonicalJSON(x)).join(',') + ']';
    }
    const keys = Object.keys(obj).sort();
    const pairs = keys.map((k) => JSON.stringify(k) + ':' + this.canonicalJSON((obj as any)[k]));
    return '{' + pairs.join(',') + '}';
  }

  /**
   * EN: Calculates SHA-256 cryptographic memory provenance hash.
   */
  public calculateMemoryProvenanceHash(params: {
    readonly commitProvenanceHash: string;
    readonly commitId: string;
    readonly taskId: string;
    readonly tenantId: string;
    readonly stepId: string;
    readonly executionId: string;
    readonly status: EpisodicMemoryStatus;
    readonly stateDelta: Readonly<Record<string, unknown>>;
    readonly recordedAt: string;
  }): string {
    const canonicalState = this.canonicalJSON(params.stateDelta);
    const raw = [
      params.commitProvenanceHash.trim(),
      params.commitId.trim(),
      params.taskId.trim(),
      params.tenantId.trim(),
      params.stepId.trim(),
      params.executionId.trim(),
      params.status.trim(),
      canonicalState,
      params.recordedAt.trim(),
    ].join(':');

    return crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
  }

  /**
   * EN: Records structured audit event in globalAuditLedger.
   */
  private recordAudit(
    eventType: EpisodicMemoryAuditEventType,
    tenantId: string,
    metadata: Record<string, unknown>
  ): void {
    const sanitizedMetadata = this.sanitizer.sanitize(metadata) as Record<string, unknown>;
    const nowIso = new Date().toISOString();

    this.auditLedger.record({
      timestamp: nowIso,
      eventType,
      domain: EPISODIC_MEMORY_AUDIT_DOMAIN,
      toolName: 'agent_episodic_memory_runtime',
      classification: eventType.includes('ABORTED')
        ? 'INTERRUPT'
        : eventType.includes('FAILED') || eventType.includes('REJECTED') || eventType.includes('VIOLATION')
        ? 'SECURITY'
        : 'OBSERVE',
      argumentsHash: '',
      policyDecision: eventType.includes('RECORDED') || eventType.includes('SYNTHESIZED') ? 'PERMIT' : 'DENY',
      executionStatus: eventType.includes('RECORDED') || eventType.includes('SYNTHESIZED') ? 'SUCCESS' : 'FAILURE',
      resultHash: (metadata.memoryProvenanceHash as string) ?? '',
      actor: {
        userId: 'agent_episodic_memory_runtime',
        role: 'SYSTEM',
        channel: 'EPISODIC_MEMORY',
      },
      tenantId,
      metadata: sanitizedMetadata,
    } as any);
  }

  /**
   * EN: Primary execution entrypoint: ingests committed evidence into episodic memory.
   * Throws typed errors on gate aborts, binding violations, stale versions, duplicate memories,
   * security violations, and uncommitted inputs.
   */
  public async recordMemory(request: EpisodicMemoryRequest): Promise<EpisodicMemoryResult> {
    const commit = request?.commitRecord;
    const task = request?.authoritativeTask;

    const gateContext = {
      taskId: task?.taskId ?? commit?.taskId,
      tenantId: task?.tenantId ?? commit?.tenantId,
      stepId: commit?.stepId,
      executionId: commit?.executionId,
      commitId: commit?.commitId,
    };

    // 1. Gate 1: Request Acceptance Checkpoint
    this.gate.assertGate1_RequestAcceptance(gateContext);

    // 2. Request Envelope Structural Validation
    this.validator.validateRequestEnvelope(request);

    // Record request audit
    this.recordAudit('EPISODIC_MEMORY_REQUESTED', task.tenantId, {
      taskId: task.taskId,
      tenantId: task.tenantId,
      commitId: commit.commitId,
      stepId: commit.stepId,
      executionId: commit.executionId,
      taskVersion: task.version,
    });

    // 3. Commit Authority Validation (must be 'COMMITTED')
    this.validator.validateCommitAuthority(commit);

    // 4. Multi-Tuple Bindings & Task Version Concurrency Validation
    this.validator.validateBindings(
      commit,
      task,
      request.context,
      request.expectedTaskVersion
    );

    // 5. Gate 2: Pre-State Read / Duplicate Check
    this.gate.assertGate2_StateRead(gateContext);

    // 6. Compute Deterministic Memory ID & Replay Check
    const memoryId = this.store.computeMemoryId({
      tenantId: task.tenantId,
      taskId: task.taskId,
      stepId: commit.stepId,
      executionId: commit.executionId,
      commitId: commit.commitId,
      taskVersion: task.version,
    });

    if (this.store.hasMemory(task.tenantId, memoryId)) {
      this.recordAudit('EPISODIC_MEMORY_DUPLICATE_REJECTED', task.tenantId, {
        memoryId,
        commitId: commit.commitId,
        taskId: task.taskId,
        tenantId: task.tenantId,
        stepId: commit.stepId,
        executionId: commit.executionId,
      });
      throw new DuplicateMemoryError(
        `Memory record '${memoryId}' has already been persisted for tenant '${task.tenantId}'. Replay rejected.`,
        { memoryId, commitId: commit.commitId, taskId: task.taskId, tenantId: task.tenantId }
      );
    }

    // 7. Prepare State Payload & Memory Provenance
    const recordedAt = new Date().toISOString();
    const stateDelta: Readonly<Record<string, unknown>> = commit.committedState ?? {};

    const memoryProvenanceHash = this.calculateMemoryProvenanceHash({
      commitProvenanceHash: commit.commitProvenanceHash,
      commitId: commit.commitId,
      taskId: task.taskId,
      tenantId: task.tenantId,
      stepId: commit.stepId,
      executionId: commit.executionId,
      status: 'RECORDED',
      stateDelta,
      recordedAt,
    });

    const memoryRecord: EpisodicMemoryRecord = {
      memoryId,
      commitId: commit.commitId,
      taskId: task.taskId,
      tenantId: task.tenantId,
      stepId: commit.stepId,
      executionId: commit.executionId,
      verificationId: commit.verificationId,
      toolName: commit.toolName,
      stateDelta,
      taskVersion: task.version,
      status: 'RECORDED',
      commitProvenanceHash: commit.commitProvenanceHash,
      memoryProvenanceHash,
      recordedAt,
    };

    // 8. Gate 3: Immediately before durable write
    this.gate.assertGate3_PreWrite({ ...gateContext, memoryId });

    // 9. Atomic Persistence Write
    try {
      this.store.saveMemory(memoryRecord);
    } catch (err: any) {
      this.recordAudit('EPISODIC_MEMORY_PERSISTENCE_FAILED', task.tenantId, {
        memoryId,
        commitId: commit.commitId,
        taskId: task.taskId,
        tenantId: task.tenantId,
        error: err.message,
      });
      throw err;
    }

    // Record recorded audit
    this.recordAudit('EPISODIC_MEMORY_RECORDED', task.tenantId, {
      memoryId,
      commitId: commit.commitId,
      taskId: task.taskId,
      tenantId: task.tenantId,
      stepId: commit.stepId,
      executionId: commit.executionId,
      verificationId: commit.verificationId,
      memoryProvenanceHash,
      recordedAt,
    });

    // 10. Pure Deterministic Synthesis (if enabled)
    let synthesis: EpisodicMemorySynthesis | undefined = undefined;
    const shouldSynthesize = request.synthesizeLessons !== false;

    if (shouldSynthesize) {
      const historicalMemories = this.store.listMemories(task.tenantId, task.taskId);
      synthesis = this.synthesizer.synthesize({
        commitRecord: commit,
        memoryRecord,
        contextRecords: historicalMemories,
      });

      this.recordAudit('EPISODIC_MEMORY_SYNTHESIZED', task.tenantId, {
        memoryId,
        commitId: commit.commitId,
        synthesisId: synthesis.synthesisId,
        synthesisHash: synthesis.synthesisHash,
        lessonsCount: synthesis.lessons.length,
      });
    }

    // 11. Gate 4: After write and before result emission
    this.gate.assertGate4_PostWrite({ ...gateContext, memoryId });

    // 12. Emit Sealed Deeply Immutable Result
    const finalStatus: EpisodicMemoryStatus = synthesis ? 'SYNTHESIZED' : 'RECORDED';

    const result: EpisodicMemoryResult = {
      memoryId,
      commitId: commit.commitId,
      taskId: task.taskId,
      tenantId: task.tenantId,
      status: finalStatus,
      recordedAt,
      record: memoryRecord,
      synthesis,
      memoryProvenanceHash,
    };

    return this.deepFreeze(result);
  }

  /**
   * EN: Retrieves an existing episodic memory record by ID.
   */
  public getMemory(tenantId: string, memoryId: string): EpisodicMemoryRecord | undefined {
    return this.store.getMemory(tenantId, memoryId);
  }

  /**
   * EN: Lists historical memory records for a tenant and optional taskId.
   */
  public listMemories(tenantId: string, taskId?: string): readonly EpisodicMemoryRecord[] {
    return this.store.listMemories(tenantId, taskId);
  }

  /**
   * EN: Synthesizes insights on-demand from historical evidence for a committed record.
   */
  public synthesizeFromHistory(tenantId: string, commitRecord: DurableCommitRecord): EpisodicMemorySynthesis {
    const historical = this.store.listMemories(tenantId, commitRecord.taskId);
    return this.synthesizer.synthesize({
      commitRecord,
      contextRecords: historical,
    });
  }
}

export const globalEpisodicMemoryRuntime = new EpisodicMemoryRuntime();
