// src/core/coordination/coordinationTypes.ts
// BOWCON V4.0 — MILESTONE 1.3.17: BRAIN COORDINATION & CONTINUITY CONTRACTS
//
// EN:
// Authoritative type definitions for Brain Coordination & Continuity.
// Establishes immutable contracts for Brain identity, presentation/embodiment surfaces,
// active surface coordination, handoff requests, and continuity contexts.
//
// VI:
// Các định nghĩa kiểu dữ liệu có thẩm quyền cho Điều phối & Tính Liên tục của Não bộ.
// Thiết lập các hợp đồng bất biến cho định danh Não bộ, các bề mặt trình bày/hiện thân,
// điều phối bề mặt tích cực, yêu cầu bàn giao (handoff) và ngữ cảnh liên tục.

import type { PlanRiskLevel } from '../planning/planningTypes.js';
import type { SurfaceType, SurfaceStatus } from './coordinationStates.js';

export type { SurfaceType, SurfaceStatus };

/**
 * EN: Authoritative, immutable Brain identity independent of physical location or surfaces.
 * VI: Định danh Não bộ có thẩm quyền, bất biến, độc lập với vị trí vật lý hoặc các bề mặt.
 */
export interface BrainIdentity {
  readonly brainId: string;
  readonly ownerUserId: string;
  readonly name?: string;
  readonly createdAt: number;
  readonly fingerprint: string;
  readonly version: string;
}

/**
 * EN: Declarative capability descriptor for a presentation or embodiment surface.
 * VI: Bộ mô tả năng lực có tính khai báo cho một bề mặt trình bày hoặc hiện thân.
 */
export interface SurfaceCapabilities {
  readonly canTextInput: boolean;
  readonly canVoiceInput: boolean;
  readonly canTextOutput: boolean;
  readonly canVoiceOutput: boolean;
  readonly canDisplayScreen: boolean;
  readonly canCaptureCamera: boolean;
  readonly canPhysicalMotion: boolean;
  readonly canNotify: boolean;
  readonly customCapabilities?: readonly string[];
}

/**
 * EN: Immutable identity and metadata of a registered presentation or embodiment surface.
 * VI: Định danh và metadata bất biến của một bề mặt trình bày hoặc hiện thân đã đăng ký.
 */
export interface SurfaceIdentity {
  readonly surfaceId: string;
  readonly surfaceType: SurfaceType;
  readonly name: string;
  readonly capabilities: SurfaceCapabilities;
  readonly registeredAt: number;
  readonly fingerprint: string;
}

/**
 * EN: Point-in-time state of an attached surface within a specific Brain session.
 * VI: Trạng thái tại một thời điểm của một bề mặt được gắn trong một phiên Não bộ cụ thể.
 */
export interface ActiveSurface {
  readonly surface: SurfaceIdentity;
  readonly status: SurfaceStatus;
  readonly lastHeartbeat: number;
  readonly sessionId: string;
  readonly sequence: number;
}

/**
 * EN: Authoritative attachment record binding a surface to a Brain and user session.
 * VI: Bản ghi gắn kết có thẩm quyền liên kết một bề mặt với một Não bộ và phiên người dùng.
 */
export interface SurfaceAttachment {
  readonly attachmentId: string;
  readonly surfaceId: string;
  readonly brainId: string;
  readonly userId: string;
  readonly sessionId: string;
  readonly attachedAt: number;
  readonly initialStatus: SurfaceStatus;
  readonly fingerprint: string;
}

/**
 * EN: Authoritative detachment record removing a surface from active Brain coordination.
 * VI: Bản ghi tách rời có thẩm quyền gỡ bỏ một bề mặt khỏi điều phối tích cực của Não bộ.
 */
export interface SurfaceDetachment {
  readonly detachmentId: string;
  readonly surfaceId: string;
  readonly brainId: string;
  readonly userId: string;
  readonly sessionId: string;
  readonly detachedAt: number;
  readonly reason: string;
  readonly fingerprint: string;
}

/**
 * EN: Authoritative continuity context preserving Brain state across multi-surface interactions.
 * VI: Ngữ cảnh liên tục có thẩm quyền bảo toàn trạng thái Não bộ qua các tương tác đa bề mặt.
 */
export interface ContinuityContext {
  readonly continuityId: string;
  readonly brainId: string;
  readonly userId: string;
  readonly sessionId: string;
  readonly correlationId: string;
  readonly sequence: number;
  readonly activeSurfaces: readonly ActiveSurface[];
  readonly preferredSurfaceId?: string;
  readonly lifecycleState?: string;
  readonly risk: PlanRiskLevel;
  readonly governanceMetadata?: Readonly<Record<string, unknown>>;
  readonly approvalMetadata?: Readonly<Record<string, unknown>>;
  readonly memoryNamespace: string;
  readonly fingerprint: string;
  readonly timestamp: number;
}

/**
 * EN: Data-only request to hand off active engagement from one surface to another.
 * VI: Yêu cầu thuần dữ liệu để bàn giao (handoff) sự tương tác tích cực từ bề mặt này sang bề mặt khác.
 */
export interface HandoffRequest {
  readonly handoffId: string;
  readonly brainId: string;
  readonly userId: string;
  readonly sessionId: string;
  readonly sourceSurfaceId: string;
  readonly targetSurfaceId: string;
  readonly sequence: number;
  readonly risk: PlanRiskLevel;
  readonly governanceMetadata?: Readonly<Record<string, unknown>>;
  readonly approvalMetadata?: Readonly<Record<string, unknown>>;
  readonly lifecycleState?: string;
  readonly correlationId?: string;
  readonly reason?: string;
}

/**
 * EN: Immutable result of evaluating and executing a surface handoff.
 * VI: Kết quả bất biến của việc đánh giá và thực hiện bàn giao bề mặt.
 */
export interface HandoffResult {
  readonly handoffId: string;
  readonly accepted: boolean;
  readonly reason?: string;
  readonly sourceSurfaceId: string;
  readonly targetSurfaceId: string;
  readonly continuityContext?: ContinuityContext;
  readonly fingerprint: string;
  readonly timestamp: number;
}

/**
 * EN: Immutable point-in-time coordination checkpoint.
 * VI: Checkpoint điều phối bất biến tại một thời điểm.
 */
export interface CoordinationCheckpoint {
  readonly checkpointId: string;
  readonly brainId: string;
  readonly userId: string;
  readonly sessionId: string;
  readonly sequence: number;
  readonly activeSurfaceIds: readonly string[];
  readonly fingerprint: string;
  readonly timestamp: number;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * EN: Deterministic failure classifications for coordination breakdowns.
 * VI: Phân loại lỗi tất định cho các sự cố điều phối.
 */
export type CoordinationFailureCategory =
  | 'COORDINATION_SCOPE_FAILURE'
  | 'COORDINATION_CONFLICT'
  | 'STALE_COORDINATION_STATE'
  | 'SURFACE_UNAVAILABLE'
  | 'CROSS_USER_HANDOFF_REJECTED'
  | 'CROSS_SESSION_HANDOFF_REJECTED'
  | 'CROSS_BRAIN_HANDOFF_REJECTED'
  | 'RISK_DOWNGRADE_REJECTED'
  | 'SURFACE_INVALID_TRANSITION'
  | 'INTERNAL_COORDINATION_FAILURE';

/**
 * EN: Immutable failure descriptor for coordination exceptions.
 * VI: Bộ mô tả sự cố bất biến cho các ngoại lệ điều phối.
 */
export interface CoordinationFailure {
  readonly category: CoordinationFailureCategory;
  readonly message: string;
  readonly fingerprint: string;
  readonly timestamp: number;
  readonly details?: Readonly<Record<string, unknown>>;
}

/**
 * EN: Authoritative immutable audit record capturing coordination actions.
 * VI: Bản ghi kiểm toán bất biến có thẩm quyền lưu lại các hành động điều phối.
 */
export interface CoordinationRecord {
  readonly recordId: string;
  readonly brainId: string;
  readonly userId: string;
  readonly sessionId: string;
  readonly sequence: number;
  readonly action: string;
  readonly status: string;
  readonly activeSurfaces: readonly ActiveSurface[];
  readonly fingerprint: string;
  readonly timestamp: number;
  readonly metadata?: Readonly<Record<string, unknown>>;
}
