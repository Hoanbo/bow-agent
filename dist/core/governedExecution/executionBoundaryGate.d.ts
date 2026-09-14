import { type ExecutionRequest, type ExecutionContext, type GovernedExecutionAdapter, type ExecutionOperationKind } from './executionTypes.js';
/**
 * EN: Standard built-in safe adapter for read-only inspection operations.
 * VI: Bộ chuyển đổi an toàn tích hợp chuẩn cho các thao tác kiểm tra chỉ đọc.
 */
export declare class SafeInspectionAdapter implements GovernedExecutionAdapter {
    readonly adapterId = "safe_inspection_adapter";
    readonly supportedKinds: readonly ExecutionOperationKind[];
    execute(context: ExecutionContext): Promise<Readonly<Record<string, unknown>>>;
}
/**
 * EN: Standard built-in deterministic echo adapter for verified actuation testing.
 * VI: Bộ chuyển đổi echo xác định tích hợp chuẩn cho việc kiểm thử hành động actuation đã xác minh.
 */
export declare class DeterministicActuationAdapter implements GovernedExecutionAdapter {
    readonly adapterId = "deterministic_actuation_adapter";
    readonly supportedKinds: readonly ExecutionOperationKind[];
    execute(context: ExecutionContext): Promise<Readonly<Record<string, unknown>>>;
}
export declare class ExecutionBoundaryGate {
    private readonly adapters;
    private readonly userStopProvider;
    constructor(options?: {
        readonly userStopProvider?: () => boolean;
        readonly customAdapters?: readonly GovernedExecutionAdapter[];
    });
    /**
     * EN: Registers a governed execution adapter for its supported kinds.
     * VI: Đăng ký một bộ chuyển đổi thực thi có quản trị cho các loại thao tác được hỗ trợ.
     */
    registerAdapter(adapter: GovernedExecutionAdapter): void;
    /**
     * EN: Executes an authorized request through the boundary, strictly asserting all security invariants.
     * VI: Thực thi một yêu cầu đã được ủy quyền qua ranh giới, khẳng định nghiêm ngặt tất cả bất biến an ninh.
     */
    executeThroughBoundary(request: ExecutionRequest, executionId: string): Promise<Readonly<Record<string, unknown>>>;
}
