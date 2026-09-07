// src/core/coordination/coordinationService.ts
// BOWCON V4.0 — MILESTONE 1.3.17: BRAIN COORDINATION SERVICE
//
// EN:
// Authoritative coordinator for Brain identity, multi-surface topologies, and session continuity.
// Enforces ONE Brain across multiple presentation and embodiment surfaces (e.g. Mobile, Robot).
// Pure data & control architecture: ZERO hardware, ZERO network, ZERO tool execution.
//
// VI:
// Bộ điều phối có thẩm quyền cho định danh Não bộ, cấu trúc liên kết đa bề mặt và tính liên tục của phiên.
// Thực thi MỘT Não bộ duy nhất trên nhiều bề mặt trình bày và hiện thân (ví dụ: Mobile, Robot).
// Kiến trúc thuần dữ liệu & kiểm soát: KHÔNG phần cứng, KHÔNG mạng, KHÔNG thực thi công cụ.

import type {
  BrainIdentity,
  SurfaceIdentity,
  SurfaceType,
  SurfaceStatus,
  SurfaceCapabilities,
  ActiveSurface,
  SurfaceAttachment,
  SurfaceDetachment,
  ContinuityContext,
  HandoffRequest,
  HandoffResult,
  CoordinationCheckpoint,
  CoordinationRecord,
} from './coordinationTypes.js';
import {
  computeBrainIdentity,
  computeContinuityFingerprint,
} from './coordinationFingerprint.js';
import {
  validateCoordinationScope,
  hasCoordinationPrototypePollution,
  containsCoordinationSecret,
} from './coordinationValidator.js';
import {
  createSurface,
  createActiveSurface,
} from './coordinationSurface.js';
import { assertValidSurfaceTransition } from './coordinationTransitions.js';
import {
  validateHandoff,
  acceptHandoff,
  rejectHandoff,
} from './coordinationHandoff.js';
import {
  detectSplitBrainConflict,
  detectStaleUpdate,
} from './coordinationConsistency.js';
import { createCoordinationCheckpoint } from './coordinationCheckpoint.js';
import {
  createCoordinationRecord,
  createCoordinationFailure,
} from './coordinationResult.js';

/**
 * EN: Deep freezes an object recursively.
 * VI: Đóng băng sâu một đối tượng một cách đệ quy.
 */
function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  Object.freeze(obj);
  for (const key of Object.keys(obj)) {
    const value = (obj as any)[key];
    if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  }
  return obj;
}

/**
 * EN: Central Brain Coordination Service.
 * VI: Dịch vụ Điều phối Não bộ Trung tâm.
 */
export class CoordinationService {
  private defaultBrain?: BrainIdentity;
  private readonly brains = new Map<string, BrainIdentity>();
  private readonly surfaces = new Map<string, SurfaceIdentity>();
  private readonly activeSurfaces = new Map<string, Map<string, ActiveSurface>>();
  private readonly sequences = new Map<string, number>();
  private readonly contexts = new Map<string, ContinuityContext>();
  private readonly checkpoints = new Map<string, CoordinationCheckpoint[]>();
  private readonly history = new Map<string, CoordinationRecord[]>();
  private readonly surfaceOwnership = new Map<string, { userId: string; sessionId: string; brainId: string }>();

  private getPartitionKey(userId: string, sessionId: string): string {
    return `${userId}::${sessionId}`;
  }

  private getNextSequence(userId: string, sessionId: string): number {
    const key = this.getPartitionKey(userId, sessionId);
    const current = this.sequences.get(key) ?? 0;
    const next = current + 1;
    this.sequences.set(key, next);
    return next;
  }

  private getCurrentSequence(userId: string, sessionId: string): number {
    const key = this.getPartitionKey(userId, sessionId);
    return this.sequences.get(key) ?? 0;
  }

  private recordAction(
    brainId: string,
    userId: string,
    sessionId: string,
    action: string,
    status: string,
    metadata?: Readonly<Record<string, unknown>>,
  ): CoordinationRecord {
    const key = this.getPartitionKey(userId, sessionId);
    const seq = this.getCurrentSequence(userId, sessionId);
    const active = this.getActiveSurfaces(userId, sessionId);

    const record = createCoordinationRecord(
      brainId,
      userId,
      sessionId,
      seq,
      action,
      status,
      active,
      metadata,
    );

    let records = this.history.get(key);
    if (!records) {
      records = [];
      this.history.set(key, records);
    }
    records.push(record);
    return record;
  }

  // =========================================================================
  // 1. BRAIN IDENTITY REGISTRATION
  // =========================================================================

  /**
   * EN: Registers or retrieves the deterministic Brain identity for a user.
   * VI: Đăng ký hoặc lấy định danh Não bộ tất định cho một người dùng.
   */
  public registerBrain(ownerUserId: string, name = 'BOWCON Central Brain', seed?: string): BrainIdentity {
    validateCoordinationScope(ownerUserId, 'system_session');

    if (hasCoordinationPrototypePollution({ ownerUserId, name, seed })) {
      throw new Error('PROTOTYPE_POLLUTION: Brain registration contains disallowed keys');
    }

    if (containsCoordinationSecret(ownerUserId) || containsCoordinationSecret(name)) {
      throw new Error('SECRET_DETECTED: Brain registration parameters contain secrets');
    }

    const { brainId, fingerprint } = computeBrainIdentity(ownerUserId, seed);

    const brain: BrainIdentity = deepFreeze({
      brainId,
      ownerUserId,
      name,
      createdAt: Date.now(),
      fingerprint,
      version: '4.0.0',
    });

    this.brains.set(brainId, brain);
    if (!this.defaultBrain) {
      this.defaultBrain = brain;
    }
    return brain;
  }

  /**
   * EN: Retrieves a registered Brain identity by ID, or the default registered Brain.
   * VI: Lấy định danh Não bộ đã đăng ký theo ID, hoặc Não bộ mặc định đã đăng ký.
   */
  public getBrainIdentity(brainId?: string): BrainIdentity | undefined {
    if (brainId) {
      return this.brains.get(brainId);
    }
    return this.defaultBrain;
  }

  // =========================================================================
  // 2. SURFACE REGISTRATION & MANAGEMENT
  // =========================================================================

  /**
   * EN: Registers an abstract presentation or embodiment surface.
   * VI: Đăng ký một bề mặt trình bày hoặc hiện thân trừu tượng.
   */
  public registerSurface(
    surfaceType: SurfaceType,
    name: string,
    capabilities?: Partial<SurfaceCapabilities>,
  ): SurfaceIdentity {
    if (hasCoordinationPrototypePollution({ surfaceType, name, capabilities })) {
      throw new Error('PROTOTYPE_POLLUTION: Surface registration contains disallowed keys');
    }

    if (containsCoordinationSecret(name)) {
      throw new Error('SECRET_DETECTED: Surface name contains unscrubbed secrets');
    }

    const surface = createSurface(surfaceType, name, capabilities);
    this.surfaces.set(surface.surfaceId, surface);
    return surface;
  }

  /**
   * EN: Retrieves a registered surface by its surfaceId.
   * VI: Lấy bề mặt đã đăng ký theo surfaceId.
   */
  public getSurface(surfaceId: string): SurfaceIdentity | undefined {
    return this.surfaces.get(surfaceId);
  }

  /**
   * EN: Attaches a surface to an active user/session cognitive context.
   * VI: Gắn một bề mặt vào ngữ cảnh nhận thức phiên/người dùng tích cực.
   */
  public attachSurface(
    surfaceId: string,
    userId: string,
    sessionId: string,
    brainId?: string,
    initialStatus: SurfaceStatus = 'AVAILABLE',
  ): SurfaceAttachment {
    const effectiveBrainId = brainId || this.defaultBrain?.brainId || 'brain_default';
    validateCoordinationScope(userId, sessionId, effectiveBrainId);

    const surface = this.surfaces.get(surfaceId);
    if (!surface) {
      throw new Error(`SURFACE_NOT_FOUND: Surface "${surfaceId}" has not been registered`);
    }

    const key = this.getPartitionKey(userId, sessionId);
    let surfaceMap = this.activeSurfaces.get(key);
    if (!surfaceMap) {
      surfaceMap = new Map<string, ActiveSurface>();
      this.activeSurfaces.set(key, surfaceMap);
    }

    const sequence = this.getNextSequence(userId, sessionId);
    const activeSurface = createActiveSurface(surface, initialStatus, sessionId, sequence);
    surfaceMap.set(surfaceId, activeSurface);
    this.surfaceOwnership.set(surfaceId, { userId, sessionId, brainId: effectiveBrainId });

    this.recordAction(effectiveBrainId, userId, sessionId, 'SURFACE_ATTACHED', initialStatus, {
      surfaceId,
      surfaceType: surface.surfaceType,
    });

    const attachment: SurfaceAttachment = deepFreeze({
      attachmentId: `attach_${surfaceId}_${sequence}`,
      surfaceId,
      brainId: effectiveBrainId,
      userId,
      sessionId,
      attachedAt: Date.now(),
      initialStatus,
      fingerprint: `attachfp_${surfaceId}_${sequence}`,
    });

    return attachment;
  }

  /**
   * EN: Updates the status of an attached surface following the authoritative transition matrix.
   * VI: Cập nhật trạng thái của bề mặt được gắn theo ma trận chuyển đổi có thẩm quyền.
   */
  public updateSurfaceStatus(
    surfaceId: string,
    newStatus: SurfaceStatus,
    userId: string,
    sessionId: string,
  ): void {
    validateCoordinationScope(userId, sessionId);

    const key = this.getPartitionKey(userId, sessionId);
    const surfaceMap = this.activeSurfaces.get(key);
    const active = surfaceMap?.get(surfaceId);

    if (!active) {
      throw new Error(`SURFACE_NOT_ATTACHED: Surface "${surfaceId}" is not attached to this session`);
    }

    assertValidSurfaceTransition(active.status, newStatus);

    const sequence = this.getNextSequence(userId, sessionId);
    const updated = createActiveSurface(active.surface, newStatus, sessionId, sequence);
    surfaceMap!.set(surfaceId, updated);

    const brainId = this.defaultBrain?.brainId || 'brain_default';
    this.recordAction(brainId, userId, sessionId, 'SURFACE_STATUS_UPDATED', newStatus, {
      surfaceId,
      from: active.status,
      to: newStatus,
    });
  }

  /**
   * EN: Detaches a surface from active session coordination.
   * VI: Tách rời một bề mặt khỏi điều phối phiên tích cực.
   */
  public detachSurface(
    surfaceId: string,
    userId: string,
    sessionId: string,
    reason = 'USER_DETACHED',
  ): SurfaceDetachment {
    validateCoordinationScope(userId, sessionId);

    const key = this.getPartitionKey(userId, sessionId);
    const surfaceMap = this.activeSurfaces.get(key);
    const active = surfaceMap?.get(surfaceId);

    if (!active) {
      throw new Error(`SURFACE_NOT_ATTACHED: Surface "${surfaceId}" is not attached to this session`);
    }

    assertValidSurfaceTransition(active.status, 'DETACHED');

    const sequence = this.getNextSequence(userId, sessionId);
    surfaceMap!.delete(surfaceId);
    this.surfaceOwnership.delete(surfaceId);

    const brainId = this.defaultBrain?.brainId || 'brain_default';
    this.recordAction(brainId, userId, sessionId, 'SURFACE_DETACHED', 'DETACHED', {
      surfaceId,
      reason,
    });

    return deepFreeze({
      detachmentId: `detach_${surfaceId}_${sequence}`,
      surfaceId,
      brainId,
      userId,
      sessionId,
      detachedAt: Date.now(),
      reason,
      fingerprint: `detachfp_${surfaceId}_${sequence}`,
    });
  }

  /**
   * EN: Returns an immutable array of active surfaces attached to a user session.
   * VI: Trả về một mảng bất biến các bề mặt tích cực được gắn với một phiên người dùng.
   */
  public getActiveSurfaces(userId: string, sessionId: string): readonly ActiveSurface[] {
    const key = this.getPartitionKey(userId, sessionId);
    const surfaceMap = this.activeSurfaces.get(key);
    if (!surfaceMap || surfaceMap.size === 0) {
      return Object.freeze([]);
    }
    return Object.freeze(Array.from(surfaceMap.values()));
  }

  // =========================================================================
  // 3. CONTINUITY & HANDOFF MANAGEMENT
  // =========================================================================

  /**
   * EN: Retrieves or constructs the current ContinuityContext for a session.
   * VI: Lấy hoặc khởi tạo ContinuityContext hiện tại cho một phiên.
   */
  public getContinuityContext(userId: string, sessionId: string): ContinuityContext {
    validateCoordinationScope(userId, sessionId);
    const key = this.getPartitionKey(userId, sessionId);

    let context = this.contexts.get(key);
    if (!context) {
      const brainId = this.defaultBrain?.brainId || 'brain_default';
      const sequence = this.getCurrentSequence(userId, sessionId);
      const activeSurfaces = this.getActiveSurfaces(userId, sessionId);
      const activeIds = activeSurfaces.map(s => s.surface.surfaceId);

      const fingerprint = computeContinuityFingerprint(
        brainId,
        userId,
        sessionId,
        sequence,
        'LOW',
        activeIds,
      );

      context = deepFreeze({
        continuityId: `continuity_${sequence}`,
        brainId,
        userId,
        sessionId,
        correlationId: `corr_${sessionId}`,
        sequence,
        activeSurfaces,
        risk: 'LOW',
        memoryNamespace: `mem_${userId}`,
        fingerprint,
        timestamp: Date.now(),
      });

      this.contexts.set(key, context);
    }

    return context;
  }

  /**
   * EN: Executes a data-only handoff request from one surface to another.
   * VI: Thực thi một yêu cầu bàn giao thuần dữ liệu từ bề mặt này sang bề mặt khác.
   */
  public requestHandoff(request: HandoffRequest): HandoffResult {
    const key = this.getPartitionKey(request.userId, request.sessionId);
    const currentContext = this.getContinuityContext(request.userId, request.sessionId);
    const surfaceMap = this.activeSurfaces.get(key);
    const activeList = this.getActiveSurfaces(request.userId, request.sessionId);

    const sourceOwner = this.surfaceOwnership.get(request.sourceSurfaceId);
    if (sourceOwner) {
      if (sourceOwner.userId !== request.userId) {
        const failureReason = `CROSS_USER_HANDOFF_REJECTED: Surface "${request.sourceSurfaceId}" belongs to user "${sourceOwner.userId}", not "${request.userId}"`;
        this.recordAction(request.brainId, request.userId, request.sessionId, 'HANDOFF_REJECTED', 'REJECTED', {
          handoffId: request.handoffId,
          reason: failureReason,
        });
        return rejectHandoff(request, failureReason);
      }
      if (sourceOwner.sessionId !== request.sessionId) {
        const failureReason = `CROSS_SESSION_HANDOFF_REJECTED: Surface "${request.sourceSurfaceId}" belongs to session "${sourceOwner.sessionId}", not "${request.sessionId}"`;
        this.recordAction(request.brainId, request.userId, request.sessionId, 'HANDOFF_REJECTED', 'REJECTED', {
          handoffId: request.handoffId,
          reason: failureReason,
        });
        return rejectHandoff(request, failureReason);
      }
      if (sourceOwner.brainId !== request.brainId) {
        const failureReason = `CROSS_BRAIN_HANDOFF_REJECTED: Surface "${request.sourceSurfaceId}" belongs to brain "${sourceOwner.brainId}", not "${request.brainId}"`;
        this.recordAction(request.brainId, request.userId, request.sessionId, 'HANDOFF_REJECTED', 'REJECTED', {
          handoffId: request.handoffId,
          reason: failureReason,
        });
        return rejectHandoff(request, failureReason);
      }
    }

    // Validate the handoff request against authoritative rules
    const validation = validateHandoff(request, activeList, currentContext);
    if (!validation.valid) {
      const failureReason = validation.reason || 'HANDOFF_VALIDATION_FAILED';
      this.recordAction(request.brainId, request.userId, request.sessionId, 'HANDOFF_REJECTED', 'REJECTED', {
        handoffId: request.handoffId,
        reason: failureReason,
      });
      return rejectHandoff(request, failureReason);
    }

    // Advance sequence for accepted handoff
    this.sequences.set(key, request.sequence);

    // Update statuses: source becomes AVAILABLE, target becomes ACTIVE
    if (surfaceMap) {
      const source = surfaceMap.get(request.sourceSurfaceId);
      if (source && source.status === 'ACTIVE') {
        surfaceMap.set(request.sourceSurfaceId, createActiveSurface(source.surface, 'AVAILABLE', request.sessionId, request.sequence));
      }
      const target = surfaceMap.get(request.targetSurfaceId);
      if (target) {
        surfaceMap.set(request.targetSurfaceId, createActiveSurface(target.surface, 'ACTIVE', request.sessionId, request.sequence));
      }
    }

    const updatedActiveList = this.getActiveSurfaces(request.userId, request.sessionId);
    const result = acceptHandoff(request, currentContext, updatedActiveList);

    if (result.continuityContext) {
      this.contexts.set(key, result.continuityContext);
    }

    this.recordAction(request.brainId, request.userId, request.sessionId, 'HANDOFF_ACCEPTED', 'ACCEPTED', {
      handoffId: request.handoffId,
      from: request.sourceSurfaceId,
      to: request.targetSurfaceId,
      sequence: request.sequence,
    });

    return result;
  }

  /**
   * EN: Creates an immutable coordination checkpoint for auditing and recovery.
   * VI: Tạo một checkpoint điều phối bất biến cho kiểm toán và phục hồi.
   */
  public createCheckpoint(userId: string, sessionId: string, metadata?: Record<string, unknown>): CoordinationCheckpoint {
    validateCoordinationScope(userId, sessionId);

    const brainId = this.defaultBrain?.brainId || 'brain_default';
    const sequence = this.getCurrentSequence(userId, sessionId);
    const activeSurfaces = this.getActiveSurfaces(userId, sessionId);

    const checkpoint = createCoordinationCheckpoint(
      brainId,
      userId,
      sessionId,
      sequence,
      activeSurfaces,
      metadata,
    );

    const key = this.getPartitionKey(userId, sessionId);
    let list = this.checkpoints.get(key);
    if (!list) {
      list = [];
      this.checkpoints.set(key, list);
    }
    list.push(checkpoint);

    this.recordAction(brainId, userId, sessionId, 'CHECKPOINT_CREATED', 'CREATED', {
      checkpointId: checkpoint.checkpointId,
      sequence,
    });

    return checkpoint;
  }

  /**
   * EN: Detects if an incoming continuity context creates a split-brain condition.
   * VI: Phát hiện xem một ngữ cảnh liên tục gửi đến có tạo ra tình trạng split-brain hay không.
   */
  public detectConflict(incomingContext: ContinuityContext): { conflict: boolean; reason?: string } {
    const current = this.getContinuityContext(incomingContext.userId, incomingContext.sessionId);
    return detectSplitBrainConflict(current, incomingContext);
  }

  /**
   * EN: Detects if an incoming update is stale.
   * VI: Phát hiện xem một cập nhật gửi đến có bị cũ hay không.
   */
  public detectStaleUpdate(userId: string, sessionId: string, incomingSequence: number): boolean {
    const current = this.getCurrentSequence(userId, sessionId);
    return detectStaleUpdate(current, incomingSequence);
  }

  /**
   * EN: Returns the immutable coordination record history for a session.
   * VI: Trả về lịch sử bản ghi điều phối bất biến cho một phiên.
   */
  public getHistory(userId: string, sessionId: string): readonly CoordinationRecord[] {
    const key = this.getPartitionKey(userId, sessionId);
    const records = this.history.get(key);
    return records ? Object.freeze([...records]) : Object.freeze([]);
  }

  /**
   * EN: Resets session coordination state.
   * VI: Đặt lại trạng thái điều phối phiên.
   */
  public resetSession(userId: string, sessionId: string): void {
    const key = this.getPartitionKey(userId, sessionId);
    this.activeSurfaces.delete(key);
    this.sequences.delete(key);
    this.contexts.delete(key);
    this.checkpoints.delete(key);
    this.history.delete(key);
  }
}
