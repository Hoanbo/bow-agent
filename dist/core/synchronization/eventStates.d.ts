/**
 * EN: Event lifecycle states within the Brain synchronization pipeline.
 * VI: Các trạng thái vòng đời sự kiện trong đường ống đồng bộ hóa Não bộ.
 */
export type EventLifecycleState = 'CREATED' | 'VALIDATED' | 'PUBLISHED' | 'OBSERVED' | 'ACKNOWLEDGED' | 'REJECTED' | 'STALE' | 'CONFLICTED' | 'SUPERSEDED';
/**
 * EN: Terminal event states that cannot progress further.
 * VI: Các trạng thái sự kiện cuối không thể tiếp tục chuyển trạng thái.
 */
export declare const TERMINAL_EVENT_STATES: ReadonlySet<EventLifecycleState>;
/**
 * EN: Operational active states in valid synchronization lifecycle.
 * VI: Các trạng thái hoạt động trong vòng đời đồng bộ hóa hợp lệ.
 */
export declare const ACTIVE_EVENT_STATES: ReadonlySet<EventLifecycleState>;
/**
 * EN: States where at least one surface has observed or acknowledged the event.
 * VI: Các trạng thái mà ít nhất một bề mặt đã quan sát hoặc xác nhận sự kiện.
 */
export declare const OBSERVATION_EVENT_STATES: ReadonlySet<EventLifecycleState>;
/**
 * EN: Checks whether an event state is terminal.
 * VI: Kiểm tra xem trạng thái sự kiện có phải trạng thái cuối hay không.
 */
export declare function isEventTerminal(state: EventLifecycleState): boolean;
/**
 * EN: Checks whether an event is in an active non-terminal state.
 * VI: Kiểm tra xem sự kiện có đang ở trạng thái hoạt động phi-trạng-thái-cuối không.
 */
export declare function isEventActive(state: EventLifecycleState): boolean;
/**
 * EN: Checks whether an event has reached ACKNOWLEDGED status.
 * VI: Kiểm tra xem sự kiện đã đạt trạng thái ACKNOWLEDGED hay chưa.
 */
export declare function isEventAcknowledged(state: EventLifecycleState): boolean;
