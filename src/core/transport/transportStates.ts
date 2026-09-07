// src/core/transport/transportStates.ts
// BOWCON V4.0 — MILESTONE 1.3.19: TRANSPORT & DELIVERY STATE TAXONOMY
//
// EN:
// Authoritative transport connection states, message delivery states,
// backpressure states, and state classification predicates.
//
// VI:
// Các trạng thái kết nối truyền tải có thẩm quyền, trạng thái phân phối thông điệp,
// trạng thái áp lực ngược (backpressure), và các hàm phân loại trạng thái.

/**
 * EN: Authoritative connection lifecycle states.
 * VI: Các trạng thái vòng đời kết nối có thẩm quyền.
 */
export type TransportConnectionState =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'DEGRADED'
  | 'RECONNECTING'
  | 'RESUMING'
  | 'CLOSING'
  | 'CLOSED'
  | 'FAILED'
  | 'BLOCKED';

export const ALL_CONNECTION_STATES: ReadonlySet<TransportConnectionState> = Object.freeze(
  new Set<TransportConnectionState>([
    'DISCONNECTED',
    'CONNECTING',
    'CONNECTED',
    'DEGRADED',
    'RECONNECTING',
    'RESUMING',
    'CLOSING',
    'CLOSED',
    'FAILED',
    'BLOCKED',
  ]),
);

/**
 * EN: Authoritative delivery lifecycle states for messages.
 * VI: Các trạng thái vòng đời phân phối có thẩm quyền cho thông điệp.
 */
export type TransportDeliveryState =
  | 'CREATED'
  | 'VALIDATED'
  | 'QUEUED'
  | 'DISPATCHABLE'
  | 'SENT'
  | 'DELIVERED'
  | 'ACKNOWLEDGED'
  | 'REJECTED'
  | 'TIMED_OUT'
  | 'STALE'
  | 'DUPLICATE'
  | 'CONFLICTED'
  | 'FAILED'
  | 'SUPERSEDED';

export const ALL_DELIVERY_STATES: ReadonlySet<TransportDeliveryState> = Object.freeze(
  new Set<TransportDeliveryState>([
    'CREATED',
    'VALIDATED',
    'QUEUED',
    'DISPATCHABLE',
    'SENT',
    'DELIVERED',
    'ACKNOWLEDGED',
    'REJECTED',
    'TIMED_OUT',
    'STALE',
    'DUPLICATE',
    'CONFLICTED',
    'FAILED',
    'SUPERSEDED',
  ]),
);

/**
 * EN: Authoritative backpressure / flow-control states.
 * VI: Các trạng thái kiểm soát lưu lượng / áp lực ngược có thẩm quyền.
 */
export type TransportBackpressureState =
  | 'NORMAL'
  | 'ELEVATED'
  | 'HIGH'
  | 'SATURATED'
  | 'BLOCKED';

export const ALL_BACKPRESSURE_STATES: ReadonlySet<TransportBackpressureState> = Object.freeze(
  new Set<TransportBackpressureState>([
    'NORMAL',
    'ELEVATED',
    'HIGH',
    'SATURATED',
    'BLOCKED',
  ]),
);

/**
 * EN: Checks if a connection state represents an active / live connection.
 * VI: Kiểm tra xem trạng thái kết nối có biểu thị một kết nối đang hoạt động hay không.
 */
export function isConnectionActive(state: TransportConnectionState): boolean {
  return state === 'CONNECTED' || state === 'DEGRADED';
}

/**
 * EN: Checks if a connection state is terminal (cannot transition further).
 * VI: Kiểm tra xem trạng thái kết nối có phải là trạng thái kết thúc hay không.
 */
export function isConnectionTerminal(state: TransportConnectionState): boolean {
  return state === 'CLOSED' || state === 'FAILED' || state === 'BLOCKED';
}

/**
 * EN: Checks if a delivery state is terminal.
 * VI: Kiểm tra xem trạng thái phân phối có phải là trạng thái kết thúc hay không.
 */
export function isDeliveryTerminal(state: TransportDeliveryState): boolean {
  return (
    state === 'ACKNOWLEDGED' ||
    state === 'REJECTED' ||
    state === 'TIMED_OUT' ||
    state === 'STALE' ||
    state === 'DUPLICATE' ||
    state === 'CONFLICTED' ||
    state === 'FAILED' ||
    state === 'SUPERSEDED'
  );
}

/**
 * EN: Checks if a delivery state represents successful transport acknowledgement.
 * VI: Kiểm tra xem trạng thái phân phối có biểu thị xác nhận truyền tải thành công hay không.
 *
 * IMPORTANT NOTE:
 * Transport ACK does NOT mean task execution success or verification success!
 */
export function isDeliverySuccessful(state: TransportDeliveryState): boolean {
  return state === 'ACKNOWLEDGED';
}
