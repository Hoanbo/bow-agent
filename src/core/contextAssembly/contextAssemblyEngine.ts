// src/core/contextAssembly/contextAssemblyEngine.ts
// BOWCON V4.0 — MS-1.4.03: CONTEXT ASSEMBLY ENGINE FAÇADE
//
// Invariants:
// USER_STOP > CONTEXT_ASSEMBLY
// STRICT_TENANT_ISOLATION == TRUE
// DETERMINISTIC_PROVENANCE == SHA-256
// AUDIT_DOMAIN == 'agent_context_assembly'
// ZERO_TOOL_EXECUTION == TRUE
// ZERO_TASK_MUTATION == TRUE
// CONTEXT != AUTHORITY

import crypto from 'node:crypto';
import {
  type ContextAssemblyRequest,
  type ContextAssemblyResult,
  type AssembledContext,
  type ContextFragment,
  ContextUserStopError,
  ContextValidationError,
  ContextBudgetExceededError,
  CrossTenantContextError,
  StaleTaskContextError,
  ContextSourceCorruptedError,
} from './contextTypes.js';
import { ContextSourceResolver, type ContextSourceResolverOptions } from './contextSourceResolver.js';
import { TokenBudgetManager } from './tokenBudgetManager.js';
import { DynamicContextCompactor } from './dynamicContextCompactor.js';
import { AuditLedger } from '../auditLedger.js';
import { DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';
import type { CognitivePromptContext } from '../cognitive/cognitiveTypes.js';

export interface ContextAssemblyEngineOptions extends ContextSourceResolverOptions {
  readonly auditLedger?: AuditLedger;
  readonly isUserStopActive?: () => boolean;
  readonly deterministicTimestamp?: number | string;
}

export class ContextAssemblyEngine {
  private readonly resolver: ContextSourceResolver;
  private readonly auditLedger?: AuditLedger;
  private readonly sanitizer: DiagnosisSanitizer;
  private readonly externalUserStopFn?: () => boolean;
  private readonly deterministicTimestamp?: string;
  private internalUserStop = false;

  constructor(options?: ContextAssemblyEngineOptions) {
    this.resolver = new ContextSourceResolver(options);
    this.auditLedger = options?.auditLedger;
    this.sanitizer = options?.sanitizer ?? new DiagnosisSanitizer();
    this.deterministicTimestamp = options?.deterministicTimestamp !== undefined ? String(options.deterministicTimestamp) : undefined;
    this.externalUserStopFn = options?.isUserStopActive ?? (() => {
      try {
        return globalMasterHumanAuthority.isUserStopActive;
      } catch {
        return false;
      }
    });
  }

  public setUserStop(active: boolean): void {
    this.internalUserStop = active;
  }

  public isUserStopActive(): boolean {
    if (this.internalUserStop) return true;
    if (this.externalUserStopFn && this.externalUserStopFn()) return true;
    return false;
  }

  /**
   * Master execution entrance for Context Assembly.
   */
  public async assembleContext(request: ContextAssemblyRequest): Promise<ContextAssemblyResult> {
    const timestamp = this.deterministicTimestamp ?? new Date().toISOString();
    const assemblyId = request.assemblyId || `ctxasm_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const tenantId = request.tenantId;
    const taskId = request.taskId;

    // ------------------------------------------------------------------------
    // GATE 1: Pre-execution USER_STOP & Request Validation
    // ------------------------------------------------------------------------
    if (this.isUserStopActive()) {
      this.recordAuditEvent('CONTEXT_USER_STOP_ABORTED', tenantId, taskId, {
        assemblyId,
        stage: 'pre_assembly_gate',
      });
      throw new ContextUserStopError('pre_assembly_gate');
    }

    if (!tenantId || typeof tenantId !== 'string' || !tenantId.trim()) {
      throw new ContextValidationError('tenantId is required');
    }
    if (!request.promptInputs) {
      throw new ContextValidationError('promptInputs is required');
    }

    this.recordAuditEvent('CONTEXT_ASSEMBLY_STARTED', tenantId, taskId, {
      assemblyId,
      expectedTaskVersion: request.expectedTaskVersion,
    });

    try {
      // ----------------------------------------------------------------------
      // STEP 2: Source Resolution & Sanitization
      // ----------------------------------------------------------------------
      const { task, fragments } = await this.resolver.resolveSources(request);

      // Verify task version freshness if expected version is specified
      const taskVersion = task?.version;
      if (
        request.expectedTaskVersion !== undefined &&
        task &&
        task.version !== request.expectedTaskVersion
      ) {
        this.recordAuditEvent('CONTEXT_STALE_REJECTED', tenantId, taskId, {
          assemblyId,
          expectedVersion: request.expectedTaskVersion,
          actualVersion: task.version,
        });
        throw new StaleTaskContextError(task.taskId, request.expectedTaskVersion, task.version);
      }

      // ----------------------------------------------------------------------
      // STEP 3: Token Budgeting & Compaction
      // ----------------------------------------------------------------------
      const budgetManager = new TokenBudgetManager(request.budget);
      const compactor = new DynamicContextCompactor(budgetManager);

      // Gate 2: USER_STOP check before compaction
      if (this.isUserStopActive()) {
        this.recordAuditEvent('CONTEXT_USER_STOP_ABORTED', tenantId, taskId, {
          assemblyId,
          stage: 'pre_compaction_gate',
        });
        throw new ContextUserStopError('pre_compaction_gate');
      }

      const { compactedFragments, metrics } = compactor.compact(fragments, (stage) => {
        if (this.isUserStopActive()) {
          throw new ContextUserStopError(`compactor_${stage}`);
        }
      });

      if (metrics.compactionApplied) {
        this.recordAuditEvent('CONTEXT_COMPACTION_PERFORMED', tenantId, taskId, {
          assemblyId,
          originalTokens: metrics.originalTokenEstimate,
          finalTokens: metrics.finalTokenEstimate,
          tokensSaved: metrics.tokensSaved,
          droppedFragments: metrics.droppedFragmentCount,
          compactedTiers: metrics.compactedTiers,
        });
      }

      // ----------------------------------------------------------------------
      // STEP 4: Format Assembled Context & CognitivePromptContext
      // ----------------------------------------------------------------------
      const assembled = this.formatAssembledContext(compactedFragments, metrics.finalTokenEstimate);
      const cognitivePromptContext: CognitivePromptContext = {
        systemContext: assembled.systemContext,
        systemPrompt: assembled.systemPrompt,
        userContext: assembled.userContext,
        taskContext: assembled.taskContext,
        memoryContext: assembled.memoryContext,
        capabilitiesContext: assembled.capabilitiesContext,
        policyConstraints: assembled.policyConstraints,
        previousTurns: assembled.previousTurns,
      };

      // ----------------------------------------------------------------------
      // GATE 3: Final Pre-Emission USER_STOP Check
      // ----------------------------------------------------------------------
      if (this.isUserStopActive()) {
        this.recordAuditEvent('CONTEXT_USER_STOP_ABORTED', tenantId, taskId, {
          assemblyId,
          stage: 'post_assembly_gate',
        });
        throw new ContextUserStopError('post_assembly_gate');
      }

      // ----------------------------------------------------------------------
      // STEP 5: Calculate Cryptographic SHA-256 Provenance
      // ----------------------------------------------------------------------
      const provenanceHash = this.calculateProvenanceHash({
        assemblyId,
        tenantId,
        taskId: taskId || 'none',
        taskVersion: taskVersion ?? 0,
        sourcesHash: this.calculateSourcesHash(compactedFragments),
        sanitizedContentHash: this.calculateContentHash(assembled.formattedPrompt),
        timestamp,
      });

      const result: ContextAssemblyResult = {
        status: 'SUCCESS',
        assemblyId,
        tenantId,
        taskId,
        taskVersion,
        assembledContext: Object.freeze(assembled),
        cognitivePromptContext: Object.freeze(cognitivePromptContext),
        totalEstimatedTokens: metrics.finalTokenEstimate,
        fragments: Object.freeze(compactedFragments),
        compactionMetrics: Object.freeze(metrics),
        provenanceHash,
        timestamp,
      };

      this.recordAuditEvent('CONTEXT_ASSEMBLY_COMPLETED', tenantId, taskId, {
        assemblyId,
        taskVersion,
        totalTokens: metrics.finalTokenEstimate,
        provenanceHash,
      });

      return Object.freeze(result);
    } catch (err: any) {
      if (err instanceof ContextBudgetExceededError) {
        this.recordAuditEvent('CONTEXT_BUDGET_EXCEEDED', tenantId, taskId, {
          assemblyId,
          limit: err.limit,
          actual: err.actual,
        });
      } else if (err instanceof StaleTaskContextError) {
        this.recordAuditEvent('CONTEXT_STALE_REJECTED', tenantId, taskId, {
          assemblyId,
          expectedVersion: err.expectedVersion,
          actualVersion: err.actualVersion,
        });
      } else if (err instanceof CrossTenantContextError) {
        this.recordAuditEvent('CONTEXT_SOURCE_REJECTED', tenantId, taskId, {
          assemblyId,
          reason: 'cross_tenant_violation',
          requestedTenant: err.requestedTenantId,
          actualTenant: err.actualTenantId,
        });
      } else if (err instanceof ContextSourceCorruptedError) {
        this.recordAuditEvent('CONTEXT_SOURCE_REJECTED', tenantId, taskId, {
          assemblyId,
          reason: 'source_corrupted',
          details: err.message,
        });
      }
      throw err;
    }
  }

  /**
   * Deterministically formats fragments into an AssembledContext structure.
   */
  private formatAssembledContext(
    fragments: readonly ContextFragment[],
    tokenCount: number
  ): AssembledContext {
    const sysFrags = fragments.filter((f) => f.category === 'SYSTEM_SAFETY_DIRECTIVES');
    const policyFrags = fragments.filter((f) => f.category === 'GOVERNANCE_CONSTRAINTS');
    const userFrags = fragments.filter((f) => f.category === 'SANITIZED_USER_PROMPT');
    const taskFrags = fragments.filter((f) =>
      ['TASK_METADATA', 'ACTIVE_STEP', 'PREVIOUS_STEP_RESULT', 'FAILURE_TELEMETRY', 'EXPLICIT_USER_CONSTRAINTS'].includes(f.category)
    );
    const memFrags = fragments.filter((f) =>
      ['RECENT_CONVERSATION_TURNS', 'HISTORICAL_COMPLETED_STEPS'].includes(f.category)
    );
    const capFrags = fragments.filter((f) => f.category === 'CAPABILITY_SCHEMAS');

    const systemContext = sysFrags.map((f) => f.content).join('\n\n');
    const policyConstraints = policyFrags.map((f) => f.content).join('\n\n');
    const userContext = userFrags.map((f) => f.content).join('\n\n');
    const taskContext = taskFrags.map((f) => f.content).join('\n\n');
    const memoryContext = memFrags.map((f) => f.content).join('\n\n');
    const capabilitiesContext = capFrags.map((f) => f.content).join('\n\n');

    const formattedPrompt = [
      '### SYSTEM CONTEXT',
      systemContext || 'None',
      '',
      '### POLICY CONSTRAINTS',
      policyConstraints || 'None',
      '',
      '### TASK CONTEXT',
      taskContext || 'None',
      '',
      '### USER INPUT',
      userContext || 'None',
      '',
      '### WORKING MEMORY',
      memoryContext || 'None',
      '',
      '### CAPABILITIES',
      capabilitiesContext || 'None',
    ].join('\n');

    return {
      systemContext,
      systemPrompt: systemContext,
      userContext,
      taskContext,
      memoryContext,
      capabilitiesContext,
      policyConstraints,
      previousTurns: Object.freeze([]),
      formattedPrompt,
      rawPrompt: formattedPrompt,
      tokenCount,
    };
  }

  public calculateProvenanceHash(params: {
    assemblyId: string;
    tenantId: string;
    taskId: string;
    taskVersion: number;
    sourcesHash: string;
    sanitizedContentHash: string;
    timestamp: string;
  }): string {
    const canonicalStr = [
      `assemblyId:${params.assemblyId}`,
      `tenantId:${params.tenantId}`,
      `taskId:${params.taskId}`,
      `taskVersion:${params.taskVersion}`,
      `sourcesHash:${params.sourcesHash}`,
      `sanitizedContentHash:${params.sanitizedContentHash}`,
      `timestamp:${params.timestamp}`,
    ].join('\n');

    return 'sha256:' + crypto.createHash('sha256').update(canonicalStr, 'utf8').digest('hex');
  }

  public calculateSourcesHash(fragments: readonly ContextFragment[]): string {
    const sourceIds = fragments.map((f) => `${f.fragmentId}:${f.source}`).sort().join('|');
    return crypto.createHash('sha256').update(sourceIds, 'utf8').digest('hex');
  }

  public calculateContentHash(content: string): string {
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
  }

  private recordAuditEvent(
    eventType: string,
    tenantId: string,
    taskId: string | undefined,
    metadata: Record<string, unknown>
  ): void {
    if (!this.auditLedger) return;
    const sanitizedMeta = this.sanitizer.sanitize(metadata) as Record<string, unknown>;
    this.auditLedger.record({
      timestamp: new Date().toISOString(),
      eventType,
      action: eventType,
      domain: 'agent_context_assembly',
      toolName: 'context_assembly',
      classification: 'OBSERVE',
      argumentsHash: '',
      policyDecision: 'PERMIT',
      executionStatus: 'SUCCESS',
      resultHash: (metadata.provenanceHash as string) || '',
      actor: {
        userId: 'system',
        role: 'SYSTEM',
        channel: 'CONTEXT_ASSEMBLY',
      },
      tenantId,
      metadata: {
        ...sanitizedMeta,
        taskId,
      },
    } as any);
  }
}
