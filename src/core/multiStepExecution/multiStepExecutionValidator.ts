// src/core/multiStepExecution/multiStepExecutionValidator.ts
// BOWCON V4.0 — MS-1.5.10: MULTI-STEP EXECUTION VALIDATOR
// Component 1069 — REAL
//
// EN: Pure fail-closed validator for multi-step execution sessions, generations,
//     dependencies, environment snapshots, and replanning requests.
//     Enforces prototype pollution defense, CoT marker rejection, and prompt injection quarantine.
// VI: Bộ xác thực thuần túy đóng khi lỗi (fail-closed) cho các phiên thực thi nhiều bước, thế hệ,
//     phụ thuộc, ảnh chụp môi trường và yêu cầu lập kế hoạch lại.
//     Thực thi phòng thủ prototype pollution, từ chối dấu vết CoT và cách ly tiêm nhiễm prompt.

import {
  type MultiStepExecutionSession,
  type MultiStepExecutionGeneration,
  type MultiStepExecutionStepState,
  type ExecutionEnvironmentSnapshot,
  type ReplanningRequest,
  type MultiStepExecutionSessionDocument,
  MAX_EXECUTION_STEPS,
  MAX_REPLANNING_GENERATIONS,
  MultiStepExecutionValidationError,
  MultiStepExecutionDependencyError,
  MultiStepExecutionTenantIsolationError,
  MultiStepExecutionSessionIsolationError,
  computeGenerationProvenanceHash,
  computeEnvironmentSnapshotProvenanceHash,
  computeReplanningRequestProvenanceHash,
  computeMultiStepSessionProvenanceHash,
} from './multiStepExecutionTypes.js';

export const PROHIBITED_COT_MARKERS: readonly string[] = [
  '<thought>',
  '</thought>',
  '[scratchpad]',
  'chainOfThought',
  'internalReasoning',
  'reasoning_trace',
  'hidden_reasoning',
  'privateDeliberation',
  'modelThinking',
];

export const SUSPICIOUS_INJECTION_PATTERNS: readonly RegExp[] = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /system\s+override/i,
  /you\s+are\s+now/i,
  /jailbreak/i,
  /disable\s+(safety|governance|policy)/i,
  /reveal\s+(secret|password|key|token)/i,
  /bypass\s+policy/i,
];

export const DANGEROUS_KEYS: readonly string[] = ['__proto__', 'constructor', 'prototype'];

export class MultiStepExecutionValidator {
  /**
   * EN: Recursively scans an object or string for prototype pollution keys, CoT markers, and prompt injection patterns.
   * VI: Quét đệ quy đối tượng hoặc chuỗi để tìm các khóa prototype pollution, dấu vết CoT và mẫu tiêm prompt.
   */
  public static sanitizeAndValidateData(obj: unknown, path = 'root'): void {
    if (obj === null || obj === undefined) {
      return;
    }

    if (typeof obj === 'string') {
      // Check CoT markers
      for (const marker of PROHIBITED_COT_MARKERS) {
        if (obj.includes(marker)) {
          throw new MultiStepExecutionValidationError(
            `Prohibited CoT/deliberation marker detected in payload at ${path}: "${marker}"`
          );
        }
      }

      // Check Prompt Injection patterns
      for (const pattern of SUSPICIOUS_INJECTION_PATTERNS) {
        if (pattern.test(obj)) {
          throw new MultiStepExecutionValidationError(
            `Untrusted prompt injection pattern detected in payload at ${path}: "${obj.slice(0, 80)}..."`
          );
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
          throw new MultiStepExecutionValidationError(
            `Prototype pollution attempt detected with key "${key}" at ${path}`
          );
        }
        this.sanitizeAndValidateData((obj as Record<string, unknown>)[key], `${path}.${key}`);
      }
    }
  }

  /**
   * EN: Validates tenant and session IDs across boundaries.
   * VI: Xác thực mã định danh tenant và session qua các ranh giới.
   */
  public static validateIsolation(
    expectedTenantId: string,
    expectedSessionId: string,
    actualTenantId: string,
    actualSessionId: string
  ): void {
    if (!expectedTenantId || !actualTenantId || expectedTenantId.trim() !== actualTenantId.trim()) {
      throw new MultiStepExecutionTenantIsolationError(
        `Tenant isolation breach: expected "${expectedTenantId}", received "${actualTenantId}"`
      );
    }
    if (!expectedSessionId || !actualSessionId || expectedSessionId.trim() !== actualSessionId.trim()) {
      throw new MultiStepExecutionSessionIsolationError(
        `Session isolation breach: expected "${expectedSessionId}", received "${actualSessionId}"`
      );
    }
  }

  /**
   * EN: Validates a MultiStepExecutionGeneration object.
   * VI: Xác thực đối tượng MultiStepExecutionGeneration.
   */
  public static validateGeneration(generation: MultiStepExecutionGeneration): void {
    if (!generation || typeof generation !== 'object') {
      throw new MultiStepExecutionValidationError('Generation must be a non-null object');
    }

    this.sanitizeAndValidateData(generation, 'generation');

    if (!generation.generationId || typeof generation.generationId !== 'string') {
      throw new MultiStepExecutionValidationError('Invalid or missing generationId');
    }

    if (typeof generation.generationIndex !== 'number' || generation.generationIndex < 0 || generation.generationIndex >= MAX_REPLANNING_GENERATIONS) {
      throw new MultiStepExecutionValidationError(
        `generationIndex must be within [0, ${MAX_REPLANNING_GENERATIONS - 1}], got ${generation.generationIndex}`
      );
    }

    if (!generation.tenantId || !generation.sessionId || !generation.taskId || !generation.planId) {
      throw new MultiStepExecutionValidationError('Missing mandatory identity fields in generation');
    }

    if (!generation.bindingSnapshot || typeof generation.bindingSnapshot !== 'object') {
      throw new MultiStepExecutionValidationError('Missing bindingSnapshot in generation');
    }

    if (!generation.taskSnapshot || typeof generation.taskSnapshot !== 'object') {
      throw new MultiStepExecutionValidationError('Missing taskSnapshot in generation');
    }

    if (!generation.stepStates || typeof generation.stepStates !== 'object') {
      throw new MultiStepExecutionValidationError('Missing stepStates dictionary in generation');
    }

    const stepEntries = Object.entries(generation.stepStates);
    if (stepEntries.length === 0) {
      throw new MultiStepExecutionValidationError('Generation must contain at least one step state');
    }
    if (stepEntries.length > MAX_EXECUTION_STEPS) {
      throw new MultiStepExecutionValidationError(
        `Generation step count exceeds limit of ${MAX_EXECUTION_STEPS}: got ${stepEntries.length}`
      );
    }

    // Validate each step state and track indexes
    const seenIndexes = new Set<number>();
    const seenIds = new Set<string>();

    for (const [key, step] of stepEntries) {
      if (key !== step.stepId) {
        throw new MultiStepExecutionValidationError(
          `Dictionary key "${key}" does not match stepId "${step.stepId}"`
        );
      }
      this.validateStepState(step, stepEntries.length);

      if (seenIds.has(step.stepId)) {
        throw new MultiStepExecutionValidationError(`Duplicate stepId detected: ${step.stepId}`);
      }
      seenIds.add(step.stepId);

      if (seenIndexes.has(step.stepIndex)) {
        throw new MultiStepExecutionValidationError(`Duplicate stepIndex detected: ${step.stepIndex}`);
      }
      seenIndexes.add(step.stepIndex);
    }

    // Verify dependencies are valid and form no cycles
    this.validateStepDependencies(generation.stepStates);

    // Verify provenance hash
    const expectedHash = computeGenerationProvenanceHash(generation);
    if (generation.provenanceHash !== expectedHash) {
      throw new MultiStepExecutionValidationError(
        `Generation provenance hash mismatch: expected ${expectedHash}, got ${generation.provenanceHash}`
      );
    }
  }

  /**
   * EN: Validates an individual step state.
   * VI: Xác thực trạng thái của từng bước riêng lẻ.
   */
  public static validateStepState(step: MultiStepExecutionStepState, totalSteps: number): void {
    if (!step || typeof step !== 'object') {
      throw new MultiStepExecutionValidationError('Step state must be a non-null object');
    }
    if (!step.stepId || typeof step.stepId !== 'string') {
      throw new MultiStepExecutionValidationError('Missing stepId');
    }
    if (typeof step.stepIndex !== 'number' || step.stepIndex < 0 || step.stepIndex >= totalSteps) {
      throw new MultiStepExecutionValidationError(
        `stepIndex must be within [0, ${totalSteps - 1}], got ${step.stepIndex}`
      );
    }
    if (!step.title || typeof step.title !== 'string') {
      throw new MultiStepExecutionValidationError('Missing or invalid title in step state');
    }
    if (!step.operationKind || typeof step.operationKind !== 'string') {
      throw new MultiStepExecutionValidationError('Missing operationKind in step state');
    }
    if (!Array.isArray(step.dependencies)) {
      throw new MultiStepExecutionValidationError('step dependencies must be an array');
    }
  }

  /**
   * EN: Validates step dependencies, ensuring all referenced steps exist and DAG contains no cycles.
   * VI: Xác thực các phụ thuộc bước, đảm bảo mọi bước được tham chiếu đều tồn tại và DAG không chứa chu trình.
   */
  public static validateStepDependencies(steps: Readonly<Record<string, MultiStepExecutionStepState>>): void {
    const seenIds = new Set<string>();
    for (const [key, step] of Object.entries(steps)) {
      if (key !== step.stepId || seenIds.has(step.stepId)) {
        throw new MultiStepExecutionValidationError(
          `Duplicate or mismatched stepId detected: "${step.stepId}" (key: "${key}")`
        );
      }
      seenIds.add(step.stepId);
    }

    const stepIds = new Set(Object.keys(steps));

    // 1. Check referential integrity
    for (const [stepId, step] of Object.entries(steps)) {
      for (const depId of step.dependencies) {
        if (!stepIds.has(depId)) {
          throw new MultiStepExecutionDependencyError(
            `Step "${stepId}" depends on unknown step "${depId}"`
          );
        }
        if (depId === stepId) {
          throw new MultiStepExecutionDependencyError(
            `Self-dependency detected for step "${stepId}"`
          );
        }
      }
    }

    // 2. Check for cycles via DFS
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const dfs = (curr: string) => {
      visited.add(curr);
      recStack.add(curr);

      const deps = steps[curr]?.dependencies ?? [];
      for (const dep of deps) {
        if (!visited.has(dep)) {
          dfs(dep);
        } else if (recStack.has(dep)) {
          throw new MultiStepExecutionDependencyError(
            `Cyclic dependency detected in execution graph involving step "${curr}" -> "${dep}"`
          );
        }
      }

      recStack.delete(curr);
    };

    for (const stepId of stepIds) {
      if (!visited.has(stepId)) {
        dfs(stepId);
      }
    }
  }

  /**
   * EN: Validates an ExecutionEnvironmentSnapshot object.
   * VI: Xác thực đối tượng ExecutionEnvironmentSnapshot.
   */
  public static validateEnvironmentSnapshot(snapshot: ExecutionEnvironmentSnapshot): void {
    if (!snapshot || typeof snapshot !== 'object') {
      throw new MultiStepExecutionValidationError('Environment snapshot must be a non-null object');
    }

    this.sanitizeAndValidateData(snapshot, 'environmentSnapshot');

    if (!snapshot.snapshotId || !snapshot.tenantId || !snapshot.sessionId || !snapshot.generationId) {
      throw new MultiStepExecutionValidationError('Missing mandatory identity fields in snapshot');
    }

    if (!snapshot.systemPreconditions || typeof snapshot.systemPreconditions !== 'object') {
      throw new MultiStepExecutionValidationError('systemPreconditions must be an object');
    }

    if (!snapshot.observedPreconditions || typeof snapshot.observedPreconditions !== 'object') {
      throw new MultiStepExecutionValidationError('observedPreconditions must be an object');
    }

    const expectedHash = computeEnvironmentSnapshotProvenanceHash(snapshot);
    if (snapshot.provenanceHash !== expectedHash) {
      throw new MultiStepExecutionValidationError(
        `Environment snapshot provenance mismatch: expected ${expectedHash}, got ${snapshot.provenanceHash}`
      );
    }
  }

  /**
   * EN: Validates a ReplanningRequest structure.
   * VI: Xác thực cấu trúc ReplanningRequest.
   */
  public static validateReplanningRequest(request: ReplanningRequest): void {
    if (!request || typeof request !== 'object') {
      throw new MultiStepExecutionValidationError('Replanning request must be a non-null object');
    }

    this.sanitizeAndValidateData(request, 'replanningRequest');

    if (!request.requestId || !request.tenantId || !request.sessionId || !request.sourceGenerationId) {
      throw new MultiStepExecutionValidationError('Missing mandatory fields in replanning request');
    }

    if (!request.reason || typeof request.reason !== 'string' || request.reason.trim().length === 0) {
      throw new MultiStepExecutionValidationError('Replanning reason must be a non-empty string');
    }

    if (!Array.isArray(request.completedStepIds) || !Array.isArray(request.invalidatedStepIds)) {
      throw new MultiStepExecutionValidationError('completedStepIds and invalidatedStepIds must be arrays');
    }

    this.validateEnvironmentSnapshot(request.environmentSnapshot);

    const expectedHash = computeReplanningRequestProvenanceHash(request);
    if (request.provenanceHash !== expectedHash) {
      throw new MultiStepExecutionValidationError(
        `Replanning request provenance hash mismatch: expected ${expectedHash}, got ${request.provenanceHash}`
      );
    }
  }

  /**
   * EN: Validates an entire MultiStepExecutionSession.
   * VI: Xác thực toàn bộ một MultiStepExecutionSession.
   */
  public static validateSession(session: MultiStepExecutionSession): void {
    if (!session || typeof session !== 'object') {
      throw new MultiStepExecutionValidationError('Session must be a non-null object');
    }

    this.sanitizeAndValidateData(session, 'session');

    if (!session.sessionId || !session.tenantId || !session.taskId || !session.planId) {
      throw new MultiStepExecutionValidationError('Missing mandatory identity fields in session');
    }

    if (typeof session.sessionVersion !== 'number' || session.sessionVersion < 1) {
      throw new MultiStepExecutionValidationError(
        `sessionVersion must be a positive integer >= 1, got ${session.sessionVersion}`
      );
    }

    if (!Array.isArray(session.generations) || session.generations.length === 0) {
      throw new MultiStepExecutionValidationError('Session must have at least one generation');
    }

    if (session.generations.length > MAX_REPLANNING_GENERATIONS) {
      throw new MultiStepExecutionValidationError(
        `Generations count exceeds limit ${MAX_REPLANNING_GENERATIONS}: got ${session.generations.length}`
      );
    }

    for (const gen of session.generations) {
      this.validateGeneration(gen);
      this.validateIsolation(session.tenantId, session.sessionId, gen.tenantId, gen.sessionId);
    }

    const expectedRoot = computeMultiStepSessionProvenanceHash(session);
    if (session.provenanceRoot !== expectedRoot) {
      throw new MultiStepExecutionValidationError(
        `Session provenance root mismatch: expected ${expectedRoot}, got ${session.provenanceRoot}`
      );
    }
  }

  /**
   * EN: Validates a full session persistence document.
   * VI: Xác thực toàn bộ tài liệu lưu trữ phiên.
   */
  public static validateSessionDocument(doc: MultiStepExecutionSessionDocument): void {
    if (!doc || typeof doc !== 'object') {
      throw new MultiStepExecutionValidationError('Session document must be a non-null object');
    }
    if (doc.schemaVersion !== '4.0.0') {
      throw new MultiStepExecutionValidationError(`Unsupported schemaVersion: ${doc.schemaVersion}`);
    }
    this.validateSession(doc.session);
  }
}
