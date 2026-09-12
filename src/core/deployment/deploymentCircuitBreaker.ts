// src/core/deployment/deploymentCircuitBreaker.ts
// BOWCON V4.0 — MS-1.3.52: GOVERNED PRODUCTION DEPLOYMENT & CANARY VERIFICATION PIPELINE
//
// Automatic safety circuit breaker halting rollout progression upon deterministic degradation.
// Bộ ngắt mạch an toàn tự động dừng tiến trình triển khai khi phát hiện suy giảm xác định.
//
// STRICT INVARIANTS / CÁC BẤT BIẾN NGHIÊM NGẶT:
// - USER_STOP > EVERYTHING_AUTONOMOUS (Immediate circuit break).
// - REVOCATION > AGENT_INTENT (Immediate circuit break).
// - CIRCUIT_BREAKER STOPS EXECUTION; DOES NOT GRANT UNRELATED MUTATION AUTHORITY.
// - AUDIT_LEDGER RECORDS ALL BREAKER STATE TRANSITIONS.
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.

import crypto from 'node:crypto';
import {
  type DeploymentId,
  type DeploymentCircuitBreakerState,
  type CircuitBreakerEvent,
  createCircuitBreakerEventId,
  DeploymentError,
} from './deploymentTypes.js';

export interface TripBreakerOptions {
  readonly deploymentId: DeploymentId;
  readonly reason: string;
  readonly triggeredBy: 'SLO_VIOLATION' | 'USER_STOP' | 'REVOCATION' | 'MANUAL_INTERLOCK';
  readonly details?: Record<string, unknown>;
}

export class DeploymentCircuitBreaker {
  private states = new Map<string, DeploymentCircuitBreakerState>();
  private events = new Map<string, CircuitBreakerEvent[]>();

  /**
   * Retrieves current circuit breaker state for a deployment (defaults to CLOSED).
   * Lấy trạng thái bộ ngắt mạch hiện tại cho một đợt triển khai (mặc định là CLOSED).
   */
  public getState(deploymentId: DeploymentId): DeploymentCircuitBreakerState {
    return this.states.get(deploymentId) ?? 'CLOSED';
  }

  /**
   * Checks whether the circuit breaker is currently open (blocking actions).
   * Kiểm tra xem bộ ngắt mạch hiện có đang mở (chặn các hành động) hay không.
   */
  public isOpen(deploymentId: DeploymentId): boolean {
    return this.getState(deploymentId) === 'OPEN';
  }

  /**
   * Trips the circuit breaker from CLOSED/HALF_OPEN to OPEN.
   * Kích hoạt ngắt mạch chuyển từ CLOSED/HALF_OPEN sang OPEN.
   */
  public trip(options: TripBreakerOptions): CircuitBreakerEvent {
    const priorState = this.getState(options.deploymentId);
    const eventId = createCircuitBreakerEventId(`cb_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`);

    const event: CircuitBreakerEvent = {
      eventId,
      deploymentId: options.deploymentId,
      priorState,
      newState: 'OPEN',
      reason: options.reason,
      triggeredBy: options.triggeredBy,
      timestamp: Date.now(),
      details: options.details,
    };

    this.states.set(options.deploymentId, 'OPEN');

    const history = this.events.get(options.deploymentId) ?? [];
    history.push(event);
    this.events.set(options.deploymentId, history);

    return event;
  }

  /**
   * Resets the circuit breaker back to CLOSED upon verified supervisory intervention.
   * Đặt lại bộ ngắt mạch về CLOSED sau khi có sự can thiệp giám sát đã được xác minh.
   */
  public reset(deploymentId: DeploymentId, supervisorId: string, rationale: string): CircuitBreakerEvent {
    const priorState = this.getState(deploymentId);
    if (priorState === 'CLOSED') {
      throw new DeploymentError('INVALID_STATE_TRANSITION', `Circuit breaker for "${deploymentId}" is already CLOSED.`);
    }

    const eventId = createCircuitBreakerEventId(`cb_reset_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`);
    const event: CircuitBreakerEvent = {
      eventId,
      deploymentId,
      priorState,
      newState: 'CLOSED',
      reason: `Reset by supervisor ${supervisorId}: ${rationale}`,
      triggeredBy: 'MANUAL_INTERLOCK',
      timestamp: Date.now(),
      details: { supervisorId, rationale },
    };

    this.states.set(deploymentId, 'CLOSED');

    const history = this.events.get(deploymentId) ?? [];
    history.push(event);
    this.events.set(deploymentId, history);

    return event;
  }

  /**
   * Transitions circuit breaker to HALF_OPEN for controlled probe verification.
   * Chuyển đổi bộ ngắt mạch sang HALF_OPEN để thăm dò xác minh có kiểm soát.
   */
  public setHalfOpen(deploymentId: DeploymentId, reason: string): CircuitBreakerEvent {
    const priorState = this.getState(deploymentId);
    const eventId = createCircuitBreakerEventId(`cb_half_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`);

    const event: CircuitBreakerEvent = {
      eventId,
      deploymentId,
      priorState,
      newState: 'HALF_OPEN',
      reason,
      triggeredBy: 'MANUAL_INTERLOCK',
      timestamp: Date.now(),
    };

    this.states.set(deploymentId, 'HALF_OPEN');

    const history = this.events.get(deploymentId) ?? [];
    history.push(event);
    this.events.set(deploymentId, history);

    return event;
  }

  /**
   * Retrieves all circuit breaker events recorded for a deployment.
   * Lấy tất cả các sự kiện bộ ngắt mạch được ghi nhận cho một đợt triển khai.
   */
  public getEvents(deploymentId: DeploymentId): readonly CircuitBreakerEvent[] {
    return this.events.get(deploymentId) ?? [];
  }
}
