import type { LifecycleState, LifecycleStage } from './lifecycleTypes.js';
/**
 * EN: Operational lifecycle states representing progressive agent processing stages.
 * VI: Các trạng thái vòng đời hoạt động thể hiện các giai đoạn xử lý lũy tiến của agent.
 */
export declare const OPERATIONAL_STATES: ReadonlySet<LifecycleState>;
/**
 * EN: Terminal lifecycle states that strictly forbid further progression without controlled restart.
 * VI: Các trạng thái vòng đời kết thúc nghiêm cấm tiến trình tiếp theo nếu không khởi động lại có kiểm soát.
 */
export declare const TERMINAL_STATES: ReadonlySet<LifecycleState>;
/**
 * EN: Controlled exit and exception states representing non-standard or branched execution paths.
 * VI: Các trạng thái thoát có kiểm soát và ngoại lệ đại diện cho các nhánh thực thi phi chuẩn.
 */
export declare const CONTROLLED_EXIT_STATES: ReadonlySet<LifecycleState>;
/**
 * EN: Determines whether a state is terminal.
 * VI: Kiểm tra xem một trạng thái có phải là trạng thái kết thúc hay không.
 */
export declare function isTerminalState(state: LifecycleState): boolean;
/**
 * EN: Determines whether a state is an active operational state.
 * VI: Kiểm tra xem một trạng thái có phải là trạng thái hoạt động tích cực hay không.
 */
export declare function isOperationalState(state: LifecycleState): boolean;
/**
 * EN: Determines whether a state is a controlled exit state.
 * VI: Kiểm tra xem một trạng thái có phải là trạng thái thoát có kiểm soát hay không.
 */
export declare function isControlledExitState(state: LifecycleState): boolean;
/**
 * EN: Maps an authoritative lifecycle state to its corresponding high-level stage.
 * VI: Ánh xạ một trạng thái vòng đời có thẩm quyền sang giai đoạn cấp cao tương ứng.
 */
export declare function mapStateToStage(state: LifecycleState): LifecycleStage;
