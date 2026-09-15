// ============================================================================
// BOWCON V4.0 — MILESTONE MS-1.5.18
// Component 1150: InstitutionalMemoryEngine
// Primary Institutional Strategic Memory Lifecycle & Version Orchestrator
// ============================================================================

import {
  StrategicMemoryLifecycleStatus,
  TERMINAL_STRATEGIC_MEMORY_STATES,
  MAX_ACTIVE_INSTITUTIONAL_SESSIONS,
  MAX_SESSION_DURATION_MS,
  GovernedStrategicMemoryConcurrencyError,
  GovernedStrategicMemoryLifecycleError,
  GovernedStrategicMemorySecurityError,
  computeSha256,
} from './GovernedStrategicMemoryTypes';

export interface InstitutionalSessionState {
  sessionId: string;
  tenantId: string;
  missionId: string;
  status: StrategicMemoryLifecycleStatus;
  version: number;
  totalRecordsIngested: number;
  creationTimestamp: number;
  lastUpdatedTimestamp: number;
  stateHash: string;
  remediedByHuman?: boolean;
}

export class InstitutionalMemoryEngine {
  private readonly sessions = new Map<string, InstitutionalSessionState>();
  private readonly activeTenantSessions = new Map<string, Set<string>>();

  // EN: Creates and initializes a new institutional strategic memory session.
  // VI: Khởi tạo phiên làm việc bộ nhớ chiến lược cấp định chế mới.
  public createSession(tenantId: string, sessionId: string, missionId: string): InstitutionalSessionState {
    this.assertValidTenant(tenantId);
    if (!sessionId || sessionId.trim().length === 0) {
      throw new GovernedStrategicMemorySecurityError('Session identifier must not be empty');
    }
    if (this.sessions.has(sessionId)) {
      throw new GovernedStrategicMemoryLifecycleError(`Session '${sessionId}' already exists`);
    }

    let tenantSessions = this.activeTenantSessions.get(tenantId);
    if (!tenantSessions) {
      tenantSessions = new Set<string>();
      this.activeTenantSessions.set(tenantId, tenantSessions);
    }

    if (tenantSessions.size >= MAX_ACTIVE_INSTITUTIONAL_SESSIONS) {
      throw new GovernedStrategicMemorySecurityError(
        `Active session ceiling reached: max ${MAX_ACTIVE_INSTITUTIONAL_SESSIONS} concurrent sessions per tenant`
      );
    }

    const now = Date.now();
    const initialState: InstitutionalSessionState = {
      sessionId,
      tenantId,
      missionId,
      status: 'CREATED',
      version: 1,
      totalRecordsIngested: 0,
      creationTimestamp: now,
      lastUpdatedTimestamp: now,
      stateHash: computeSha256(`${sessionId}:${tenantId}:CREATED:1:${now}`),
    };

    this.sessions.set(sessionId, initialState);
    tenantSessions.add(sessionId);
    return initialState;
  }

  // EN: Retrieves the session state, validating tenant boundary and session duration.
  // VI: Truy xuất trạng thái phiên, xác thực ranh giới tenant và thời lượng phiên.
  public getSession(tenantId: string, sessionId: string): InstitutionalSessionState {
    this.assertValidTenant(tenantId);
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new GovernedStrategicMemoryLifecycleError(`Session '${sessionId}' not found`);
    }
    if (session.tenantId !== tenantId) {
      throw new GovernedStrategicMemorySecurityError(
        `Cross-tenant session access denied: tenant '${tenantId}' cannot access session of '${session.tenantId}'`
      );
    }

    // Session duration ceiling check
    const now = Date.now();
    if (now - session.creationTimestamp > MAX_SESSION_DURATION_MS && !TERMINAL_STRATEGIC_MEMORY_STATES.has(session.status)) {
      session.status = 'SUSPENDED';
      session.version += 1;
      session.lastUpdatedTimestamp = now;
      session.stateHash = computeSha256(`${session.sessionId}:${session.tenantId}:SUSPENDED:${session.version}:${now}`);
    }

    return session;
  }

  // EN: Transition session lifecycle with strict legal transition and OCC/CAS verification.
  // VI: Chuyển đổi vòng đời phiên với quy tắc hợp lệ và kiểm tra phiên bản OCC/CAS nghiêm ngặt.
  public transitionState(
    tenantId: string,
    sessionId: string,
    targetStatus: StrategicMemoryLifecycleStatus,
    expectedVersion: number
  ): InstitutionalSessionState {
    const session = this.getSession(tenantId, sessionId);

    // Terminal state invariant
    if (TERMINAL_STRATEGIC_MEMORY_STATES.has(session.status)) {
      throw new GovernedStrategicMemoryLifecycleError(
        `Cannot transition terminal state: session '${sessionId}' is already in terminal state '${session.status}'`
      );
    }

    // OCC/CAS check
    if (session.version !== expectedVersion) {
      throw new GovernedStrategicMemoryConcurrencyError(
        `OCC version conflict for session '${sessionId}': expected ${expectedVersion}, current ${session.version}`
      );
    }

    // Validate legal transition
    this.validateLegalTransition(session.status, targetStatus);

    const now = Date.now();
    session.status = targetStatus;
    session.version += 1;
    session.lastUpdatedTimestamp = now;
    session.stateHash = computeSha256(`${session.sessionId}:${session.tenantId}:${targetStatus}:${session.version}:${now}`);

    if (TERMINAL_STRATEGIC_MEMORY_STATES.has(targetStatus)) {
      const tenantSessions = this.activeTenantSessions.get(tenantId);
      if (tenantSessions) {
        tenantSessions.delete(sessionId);
      }
    }

    return session;
  }

  // EN: Force immediate halt by stop interlocks (USER_STOP / EMERGENCY_STOP).
  // VI: Bắt buộc dừng ngay lập tức bởi các khoá dừng (USER_STOP / EMERGENCY_STOP).
  public haltSession(
    tenantId: string,
    sessionId: string,
    stopType: 'USER_STOP' | 'EMERGENCY_STOP'
  ): InstitutionalSessionState {
    const session = this.getSession(tenantId, sessionId);
    const targetStatus: StrategicMemoryLifecycleStatus =
      stopType === 'EMERGENCY_STOP' ? 'HALTED_BY_EMERGENCY_STOP' : 'HALTED_BY_USER_STOP';

    const now = Date.now();
    session.status = targetStatus;
    session.version += 1;
    session.lastUpdatedTimestamp = now;
    session.stateHash = computeSha256(`${session.sessionId}:${session.tenantId}:${targetStatus}:${session.version}:${now}`);

    const tenantSessions = this.activeTenantSessions.get(tenantId);
    if (tenantSessions) {
      tenantSessions.delete(sessionId);
    }

    return session;
  }

  // EN: Increments total ingested records counter with OCC CAS validation.
  // VI: Tăng bộ đếm tổng số bản ghi đã tiếp nhận với xác thực OCC CAS.
  public incrementRecordsIngested(
    tenantId: string,
    sessionId: string,
    count: number,
    expectedVersion: number
  ): InstitutionalSessionState {
    const session = this.getSession(tenantId, sessionId);

    if (TERMINAL_STRATEGIC_MEMORY_STATES.has(session.status)) {
      throw new GovernedStrategicMemoryLifecycleError(`Cannot ingest records into terminal session '${sessionId}'`);
    }

    if (session.version !== expectedVersion) {
      throw new GovernedStrategicMemoryConcurrencyError(
        `OCC version conflict for session '${sessionId}': expected ${expectedVersion}, current ${session.version}`
      );
    }

    const now = Date.now();
    session.totalRecordsIngested += count;
    session.version += 1;
    session.lastUpdatedTimestamp = now;
    session.stateHash = computeSha256(`${session.sessionId}:${session.tenantId}:${session.status}:${session.version}:${now}`);

    return session;
  }

  // EN: Resets all active sessions (used during test teardown).
  // VI: Đặt lại toàn bộ phiên đang hoạt động (dùng khi dọn dẹp kiểm thử).
  public clear(): void {
    this.sessions.clear();
    this.activeTenantSessions.clear();
  }

  // --------------------------------------------------------------------------
  // Private Validation Logic
  // --------------------------------------------------------------------------

  private assertValidTenant(tenantId: string): void {
    if (!tenantId || tenantId.trim().length === 0) {
      throw new GovernedStrategicMemorySecurityError('Tenant identifier must not be empty');
    }
  }

  // EN: Enforces legal lifecycle transitions according to the canonical 14-state model + terminals.
  // VI: Cưỡng chế các bước chuyển vòng đời hợp lệ theo mô hình 14 trạng thái chuẩn mực + các trạng thái kết thúc.
  private validateLegalTransition(
    current: StrategicMemoryLifecycleStatus,
    target: StrategicMemoryLifecycleStatus
  ): void {
    // Interlock stops and failures can be transitioned to from any non-terminal state
    if (
      target === 'HALTED_BY_USER_STOP' ||
      target === 'HALTED_BY_EMERGENCY_STOP' ||
      target === 'FAILED'
    ) {
      return;
    }

    const allowedTransitions: Record<StrategicMemoryLifecycleStatus, StrategicMemoryLifecycleStatus[]> = {
      CREATED: ['VALIDATING'],
      VALIDATING: ['ADMITTED', 'FAILED', 'INVALIDATED'],
      ADMITTED: ['INDEXING', 'SUSPENDED'],
      INDEXING: ['INDEXED', 'FAILED'],
      INDEXED: ['SYNTHESIZING', 'RETRIEVING', 'DRIFT_ANALYSIS', 'STABLE'],
      SYNTHESIZING: ['META_LEARNING', 'REVIEW_REQUIRED', 'FAILED'],
      RETRIEVING: ['INDEXED', 'META_LEARNING', 'REVIEW_REQUIRED'],
      META_LEARNING: ['DRIFT_ANALYSIS', 'REVIEW_REQUIRED', 'STABLE'],
      DRIFT_ANALYSIS: ['STABLE', 'REVIEW_REQUIRED', 'INVALIDATED'],
      REVIEW_REQUIRED: ['ADMITTED', 'STABLE', 'SUSPENDED', 'INVALIDATED'],
      STABLE: ['SYNTHESIZING', 'RETRIEVING', 'DRIFT_ANALYSIS', 'SUSPENDED', 'COMPLETED'],
      SUSPENDED: ['ADMITTED', 'VALIDATING', 'COMPLETED', 'INVALIDATED'],
      COMPLETED: [],
      INVALIDATED: [],
      FAILED: [],
      HALTED_BY_USER_STOP: [],
      HALTED_BY_EMERGENCY_STOP: [],
    };

    const legalTargets = allowedTransitions[current] || [];
    if (!legalTargets.includes(target)) {
      throw new GovernedStrategicMemoryLifecycleError(
        `Illegal lifecycle transition from '${current}' to '${target}'`
      );
    }
  }
}
