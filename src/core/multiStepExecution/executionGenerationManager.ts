// src/core/multiStepExecution/executionGenerationManager.ts
// BOWCON V4.0 — MS-1.5.10: EXECUTION GENERATION MANAGER
// Component 1074 — REAL
//
// EN: Governed execution generation manager. Enforces generation immutability,
//     fresh provenance roots per generation, OCC-protected transitions, and strict lease isolation.
//     Strictly upholds: OLD LEASES & AUTHORIZATIONS DO NOT TRANSFER TO NEW GENERATIONS.
// VI: Bộ quản lý thế hệ thực thi có quản trị. Thực thi tính bất biến của thế hệ,
//     gốc provenance mới cho mỗi thế hệ, các bước chuyển được bảo vệ bởi OCC và cô lập hợp đồng thuê nghiêm ngặt.
//     Tuân thủ nghiêm ngặt: HỢP ĐỒNG THUÊ & ỦY QUYỀN CŨ KHÔNG ĐƯỢC CHUYỂN SANG THẾ HỆ MỚI.

import crypto from 'node:crypto';
import {
  type MultiStepExecutionGeneration,
  type MultiStepExecutionStepState,
  type MultiStepExecutionSession,
  MAX_REPLANNING_GENERATIONS,
  computeGenerationProvenanceHash,
  computeMultiStepSessionProvenanceHash,
  MultiStepExecutionGenerationError,
  MultiStepExecutionConcurrencyError,
} from './multiStepExecutionTypes.js';
import { MultiStepExecutionValidator } from './multiStepExecutionValidator.js';
import type { GroundedPlanTaskBinding } from '../groundedPlanTaskBridge/groundedPlanTaskTypes.js';
import type { AgentTask } from '../taskLifecycle/agentTaskTypes.js';
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';

export interface CreateGenerationParams {
  readonly tenantId: string;
  readonly sessionId: string;
  readonly taskId: string;
  readonly planId: string;
  readonly planVersion: number;
  readonly generationIndex: number;
  readonly bindingSnapshot: GroundedPlanTaskBinding;
  readonly taskSnapshot: AgentTask;
  readonly status?: 'PENDING' | 'ACTIVE' | 'PAUSED' | 'SUPERSEDED' | 'COMPLETED' | 'FAILED' | 'INVALIDATED';
}

export class ExecutionGenerationManager {
  private readonly userStopProvider: () => boolean;

  constructor(options?: { readonly userStopProvider?: () => boolean }) {
    this.userStopProvider = options?.userStopProvider ?? (() => globalMasterHumanAuthority.isUserStopActive);
  }

  /**
   * EN: Creates a new immutable execution generation (Gen 0 or subsequent Gen N).
   * VI: Tạo một thế hệ thực thi bất biến mới (Gen 0 hoặc Gen N tiếp theo).
   */
  public createGeneration(params: CreateGenerationParams): MultiStepExecutionGeneration {
    if (params.generationIndex >= MAX_REPLANNING_GENERATIONS) {
      throw new MultiStepExecutionGenerationError(
        `Cannot create generation ${params.generationIndex}: exceeds limit of ${MAX_REPLANNING_GENERATIONS}`
      );
    }

    const generationId = `gen_${params.tenantId}_${params.sessionId}_idx${params.generationIndex}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const timestamp = new Date().toISOString();

    // Adapt step bindings from bindingSnapshot into MultiStepExecutionStepState
    const allStepIds = new Set(params.bindingSnapshot.stepBindings.map((b) => b.sourceStepId));
    const stepStates: Record<string, MultiStepExecutionStepState> = {};
    for (const binding of params.bindingSnapshot.stepBindings) {
      const stepId = binding.sourceStepId;
      const opKind = binding.taskStepOptions.actionName?.toLowerCase().includes('inspect')
        ? 'INSPECT_ELEMENT'
        : binding.taskStepOptions.actionName?.toLowerCase().includes('verify')
        ? 'VERIFY_ASSERTION'
        : 'EXECUTE_GOVERNED_ACTION';

      const stepDeps = (binding.preconditions ?? []).filter((p) => allStepIds.has(p));

      stepStates[stepId] = Object.freeze({
        stepId,
        stepIndex: binding.stepIndex,
        title: binding.taskStepOptions.description ?? `Step ${binding.stepIndex}`,
        operationKind: opKind as any,
        dependencies: Object.freeze(stepDeps),
        status: 'PENDING',
        updatedAt: timestamp,
      });
    }

    const rawGeneration = {
      generationId,
      generationIndex: params.generationIndex,
      tenantId: params.tenantId,
      sessionId: params.sessionId,
      taskId: params.taskId,
      planId: params.planId,
      planVersion: params.planVersion,
      bindingSnapshot: params.bindingSnapshot,
      taskSnapshot: params.taskSnapshot,
      stepStates: Object.freeze(stepStates),
      status: (params.status ?? 'ACTIVE') as any,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const provenanceHash = computeGenerationProvenanceHash(rawGeneration);
    const sealedGeneration: MultiStepExecutionGeneration = Object.freeze({
      ...rawGeneration,
      provenanceHash,
    });

    MultiStepExecutionValidator.validateGeneration(sealedGeneration);
    return sealedGeneration;
  }

  /**
   * EN: Transitions an active session to a new generation via OCC CAS verification.
   * VI: Chuyển đổi một phiên hoạt động sang thế hệ mới thông qua xác minh OCC CAS.
   */
  public transitionToNewGeneration(
    session: MultiStepExecutionSession,
    newGeneration: MultiStepExecutionGeneration,
    expectedSessionVersion: number
  ): MultiStepExecutionSession {
    if (session.sessionVersion !== expectedSessionVersion) {
      throw new MultiStepExecutionConcurrencyError(
        `OCC conflict in generation transition: expected version ${expectedSessionVersion}, found ${session.sessionVersion}`
      );
    }

    MultiStepExecutionValidator.validateIsolation(
      session.tenantId,
      session.sessionId,
      newGeneration.tenantId,
      newGeneration.sessionId
    );

    if (newGeneration.generationIndex !== session.generations.length) {
      throw new MultiStepExecutionGenerationError(
        `Invalid generation sequence: expected generationIndex ${session.generations.length}, got ${newGeneration.generationIndex}`
      );
    }

    // Mark previous generation as SUPERSEDED
    const updatedGenerations = session.generations.map((g) => {
      if (g.status === 'ACTIVE' || g.status === 'PAUSED' || g.status === 'PENDING') {
        const supersededRaw = {
          ...g,
          status: 'SUPERSEDED' as const,
          updatedAt: new Date().toISOString(),
        };
        const supersededHash = computeGenerationProvenanceHash(supersededRaw);
        return Object.freeze({ ...supersededRaw, provenanceHash: supersededHash });
      }
      return g;
    });

    // Make new generation ACTIVE
    const activeRaw = {
      ...newGeneration,
      status: 'ACTIVE' as const,
      updatedAt: new Date().toISOString(),
    };
    const activeHash = computeGenerationProvenanceHash(activeRaw);
    const activeGen: MultiStepExecutionGeneration = Object.freeze({ ...activeRaw, provenanceHash: activeHash });

    updatedGenerations.push(activeGen);

    const timestamp = new Date().toISOString();
    const updatedSessionRaw = {
      ...session,
      activeGenerationId: activeGen.generationId,
      status: 'NEW_GENERATION' as const,
      sessionVersion: session.sessionVersion + 1,
      generations: Object.freeze(updatedGenerations),
      updatedAt: timestamp,
    };

    // Recalculate provenance root
    const { provenanceRoot: _, ...sessionWithoutRoot } = updatedSessionRaw;
    const provenanceRoot = computeMultiStepSessionProvenanceHash(sessionWithoutRoot);

    return Object.freeze({
      ...updatedSessionRaw,
      provenanceRoot,
    });
  }
}
