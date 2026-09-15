// ============================================================================
// BOWCON V4.0 — MILESTONE MS-1.5.19
// Component 1160: StrategicPolicyEvolutionDeliberationEngine
// Master Deliberation Lifecycle Orchestrator & OCC/CAS Concurrency Engine
// ============================================================================

import {
  PolicyEvolutionProposal,
  PolicyEvolutionLifecycleStatus,
  DeliberationSessionState,
  MAX_ACTIVE_DELIBERATION_SESSIONS,
  MAX_DELIBERATION_SESSION_DURATION_MS,
  InvalidProposalLifecycleTransitionError,
  StrategicPolicyEvolutionOCCConflictError,
  computePolicyEvolutionProposalHash,
  StrategicPolicySecurityCheckpointError,
} from './GovernedStrategicPolicyEvolutionTypes.js';

export class StrategicPolicyEvolutionDeliberationEngine {
  private activeSessionsByTenant: Map<string, Map<string, DeliberationSessionState>> = new Map();

  // EN: Canonical transition graph defining permissible next states for each lifecycle stage.
  // VI: Đồ thị chuyển đổi chuẩn tắc định nghĩa các trạng thái tiếp theo được phép cho mỗi giai đoạn vòng đời.
  private validTransitions: Record<PolicyEvolutionLifecycleStatus, PolicyEvolutionLifecycleStatus[]> = {
    CREATED: ['VALIDATING', 'FAILED', 'HALTED_BY_USER_STOP', 'HALTED_BY_EMERGENCY_STOP'],
    VALIDATING: ['ADMITTED', 'FAILED', 'HALTED_BY_USER_STOP', 'HALTED_BY_EMERGENCY_STOP'],
    ADMITTED: ['ANALYZING_IMPACT', 'SUPERSEDED', 'FAILED', 'HALTED_BY_USER_STOP', 'HALTED_BY_EMERGENCY_STOP'],
    ANALYZING_IMPACT: ['IMPACT_ANALYZED', 'FAILED', 'HALTED_BY_USER_STOP', 'HALTED_BY_EMERGENCY_STOP'],
    IMPACT_ANALYZED: ['SIMULATING', 'FAILED', 'HALTED_BY_USER_STOP', 'HALTED_BY_EMERGENCY_STOP'],
    SIMULATING: ['SIMULATION_COMPLETED', 'FAILED', 'HALTED_BY_USER_STOP', 'HALTED_BY_EMERGENCY_STOP'],
    SIMULATION_COMPLETED: ['INVARIANT_REVIEW', 'FAILED', 'HALTED_BY_USER_STOP', 'HALTED_BY_EMERGENCY_STOP'],
    INVARIANT_REVIEW: ['DOSSIER_COMPILING', 'FAILED', 'HALTED_BY_USER_STOP', 'HALTED_BY_EMERGENCY_STOP'],
    DOSSIER_COMPILING: ['AWAITING_HUMAN_DELIBERATION', 'FAILED', 'HALTED_BY_USER_STOP', 'HALTED_BY_EMERGENCY_STOP'],
    AWAITING_HUMAN_DELIBERATION: ['DELIBERATING', 'EXPIRED', 'SUPERSEDED', 'HALTED_BY_USER_STOP', 'HALTED_BY_EMERGENCY_STOP'],
    DELIBERATING: [
      'APPROVED_FOR_PDP_HANDOFF',
      'REJECTED_BY_HUMAN',
      'AWAITING_HUMAN_DELIBERATION',
      'EXPIRED',
      'SUPERSEDED',
      'HALTED_BY_USER_STOP',
      'HALTED_BY_EMERGENCY_STOP',
    ],
    APPROVED_FOR_PDP_HANDOFF: [], // Terminal
    REJECTED_BY_HUMAN: [], // Terminal
    EXPIRED: [], // Terminal
    SUPERSEDED: [], // Terminal
    FAILED: [], // Terminal
    HALTED_BY_USER_STOP: [], // Terminal
    HALTED_BY_EMERGENCY_STOP: [], // Terminal
  };

  constructor() {}

  // EN: Opens a bounded deliberation session for a tenant.
  // VI: Khởi tạo một phiên nghị sự có giới hạn cho một tenant.
  public openSession(tenantId: string, sessionId: string): DeliberationSessionState {
    const tenantSessions = this.getOrCreateTenantSessions(tenantId);
    if (tenantSessions.size >= MAX_ACTIVE_DELIBERATION_SESSIONS) {
      throw new StrategicPolicySecurityCheckpointError(
        `Session limit reached: Maximum ${MAX_ACTIVE_DELIBERATION_SESSIONS} active deliberation sessions per tenant`
      );
    }

    const now = Date.now();
    const session: DeliberationSessionState = {
      sessionId,
      tenantId,
      activeProposalIds: [],
      status: 'ACTIVE',
      openedAt: now,
      lastActivityAt: now,
      auditRecordCount: 0,
    };

    tenantSessions.set(sessionId, session);
    return session;
  }

  // EN: Transitions a proposal to a new lifecycle state with monotonic OCC/CAS version validation.
  // VI: Chuyển proposal sang trạng thái vòng đời mới với kiểm tra phiên bản OCC/CAS đơn điệu.
  public transitionState(
    proposal: PolicyEvolutionProposal,
    targetState: PolicyEvolutionLifecycleStatus,
    expectedVersion?: number,
    emergencyStopSignaled?: boolean,
    userStopSignaled?: boolean
  ): PolicyEvolutionProposal {
    // EN: Priority 1: EMERGENCY_STOP overrides all transitions immediately.
    // VI: Ưu tiên 1: EMERGENCY_STOP lập tức ghi đè mọi chuyển đổi trạng thái.
    if (emergencyStopSignaled) {
      proposal.status = 'HALTED_BY_EMERGENCY_STOP';
      proposal.version += 1;
      proposal.updatedAt = Date.now();
      proposal.provenanceHash = computePolicyEvolutionProposalHash(proposal);
      return proposal;
    }

    // EN: Priority 2: USER_STOP halts active processing cleanly.
    // VI: Ưu tiên 2: USER_STOP tạm dừng quy trình xử lý một cách an toàn.
    if (userStopSignaled) {
      proposal.status = 'HALTED_BY_USER_STOP';
      proposal.version += 1;
      proposal.updatedAt = Date.now();
      proposal.provenanceHash = computePolicyEvolutionProposalHash(proposal);
      return proposal;
    }

    // EN: Terminal states are completely immutable.
    // VI: Các trạng thái kết thúc hoàn toàn bất biến.
    const allowed = this.validTransitions[proposal.status];
    if (!allowed || allowed.length === 0) {
      throw new InvalidProposalLifecycleTransitionError(
        `Lifecycle violation: Cannot transition from terminal state '${proposal.status}' to '${targetState}'`
      );
    }

    if (!allowed.includes(targetState)) {
      throw new InvalidProposalLifecycleTransitionError(
        `Illegal transition from '${proposal.status}' to '${targetState}'. Permitted: [${allowed.join(', ')}]`
      );
    }

    // EN: OCC / CAS concurrency check.
    // VI: Kiểm tra tương tranh OCC / CAS để ngăn chặn ghi đè trạng thái cũ.
    if (expectedVersion !== undefined && proposal.version !== expectedVersion) {
      throw new StrategicPolicyEvolutionOCCConflictError(
        `OCC conflict: Expected version ${expectedVersion}, but current proposal version is ${proposal.version}`
      );
    }

    proposal.status = targetState;
    proposal.version += 1;
    proposal.updatedAt = Date.now();
    proposal.provenanceHash = computePolicyEvolutionProposalHash(proposal);

    return proposal;
  }

  public getSession(tenantId: string, sessionId: string): DeliberationSessionState | undefined {
    const tenantSessions = this.activeSessionsByTenant.get(tenantId);
    return tenantSessions ? tenantSessions.get(sessionId) : undefined;
  }

  public closeSession(tenantId: string, sessionId: string): void {
    const session = this.getSession(tenantId, sessionId);
    if (session) {
      session.status = 'CLOSED';
      session.closedAt = Date.now();
    }
  }

  public clearTenant(tenantId: string): void {
    this.activeSessionsByTenant.delete(tenantId);
  }

  private getOrCreateTenantSessions(tenantId: string): Map<string, DeliberationSessionState> {
    let map = this.activeSessionsByTenant.get(tenantId);
    if (!map) {
      map = new Map();
      this.activeSessionsByTenant.set(tenantId, map);
    }
    return map;
  }
}
