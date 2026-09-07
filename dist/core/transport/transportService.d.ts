import type { BrainTransportMessage, CreateTransportMessageParams, TransportFailureCode, TransportGatewayContract } from './transportTypes.js';
import type { TransportConnectionState } from './transportStates.js';
import type { ScopedTransportIdentity } from './transportIdentity.js';
import type { TransportConnectionRecord } from './transportConnection.js';
import type { TransportSessionSnapshot } from './transportSession.js';
import type { TransportDeliveryRecord } from './transportDelivery.js';
import type { TransportAckRecord, TransportNackRecord, AckClassification } from './transportAck.js';
import type { HeartbeatSignal, HeartbeatAck } from './transportHeartbeat.js';
import type { ResumeResult } from './transportReconnect.js';
import type { TransportBackpressureMetrics } from './transportBackpressure.js';
import type { TransportCheckpoint } from './transportCheckpoint.js';
import type { TransportAuditRecord } from './transportResult.js';
export interface TransportServiceOptions {
    readonly maxQueueDepth?: number;
    readonly defaultBrainId?: string;
}
export declare class TransportService implements TransportGatewayContract {
    private readonly maxQueueDepth;
    private readonly connections;
    private readonly sessions;
    private readonly messagesById;
    private readonly messagesByConnectionSeq;
    private readonly deliveries;
    private readonly queues;
    private readonly audits;
    private readonly heartbeats;
    private heartbeatSequenceCounter;
    constructor(options?: TransportServiceOptions);
    /**
     * EN: Registers a new scoped connection with DISCONNECTED or specified initial state.
     * VI: Đăng ký một kết nối có phạm vi mới với trạng thái DISCONNECTED hoặc trạng thái ban đầu được chỉ định.
     */
    registerConnection(params: ScopedTransportIdentity, initialState?: TransportConnectionState, timestamp?: number): Readonly<TransportConnectionRecord>;
    /**
     * EN: Retrieves an immutable connection record by connectionId.
     * VI: Lấy bản ghi kết nối bất biến theo connectionId.
     */
    getConnection(connectionId: string): Readonly<TransportConnectionRecord> | undefined;
    /**
     * EN: Transitions a connection's state following the strict transition matrix.
     * VI: Chuyển đổi trạng thái của một kết nối tuân theo ma trận chuyển đổi nghiêm ngặt.
     */
    setConnectionState(connectionId: string, newState: TransportConnectionState, reason?: string, timestamp?: number): Readonly<TransportConnectionRecord>;
    /**
     * EN: Retrieves an immutable session snapshot by connectionId.
     * VI: Lấy snapshot phiên bất biến theo connectionId.
     */
    getSession(connectionId: string): Readonly<TransportSessionSnapshot> | undefined;
    /**
     * EN: Retrieves all registered session snapshots.
     * VI: Lấy danh sách tất cả các snapshot phiên đã đăng ký.
     */
    getActiveSessions(): ReadonlyArray<Readonly<TransportSessionSnapshot>>;
    /**
     * EN: Dispatches a message from Brain to a target connection/surface.
     * Enforces sequence, backpressure, risk monotonicity, and delivery state tracking.
     *
     * VI: Điều phối gửi thông điệp từ Não bộ đến một kết nối/bề mặt mục tiêu.
     * Thực thi số thứ tự, áp lực ngược, tính đơn điệu rủi ro và theo dõi trạng thái phân phối.
     */
    dispatch(params: CreateTransportMessageParams): {
        readonly message: Readonly<BrainTransportMessage>;
        readonly delivery: Readonly<TransportDeliveryRecord>;
    };
    /**
     * EN: Gateway dispatchMessage implementation (implements TransportGatewayContract).
     * VI: Triển khai gateway dispatchMessage (thực thi TransportGatewayContract).
     */
    dispatchMessage(message: BrainTransportMessage): Promise<boolean>;
    /**
     * EN: Receives an incoming message from a surface.
     * Performs replay analysis, sequence analysis, scope isolation, and delivery tracking.
     *
     * VI: Nhận một thông điệp đến từ một bề mặt.
     * Thực hiện phân tích phát lại, phân tích chuỗi, cô lập phạm vi và theo dõi phân phối.
     */
    receive(incoming: Readonly<BrainTransportMessage>, timestamp?: number): {
        readonly success: boolean;
        readonly ack?: Readonly<TransportAckRecord>;
        readonly nack?: Readonly<TransportNackRecord>;
        readonly delivery: Readonly<TransportDeliveryRecord>;
    };
    /**
     * EN: Gateway receiveMessage implementation (implements TransportGatewayContract).
     * VI: Triển khai gateway receiveMessage (thực thi TransportGatewayContract).
     */
    receiveMessage(message: BrainTransportMessage): Promise<boolean>;
    /**
     * EN: Explicitly acknowledges a message.
     * VI: Tường minh xác nhận một thông điệp.
     */
    acknowledge(messageId: string, classification: AckClassification, details?: string, timestamp?: number): Readonly<TransportAckRecord>;
    /**
     * EN: Explicitly negative-acknowledges a message with failure descriptor.
     * VI: Tường minh từ chối xác nhận (NACK) một thông điệp với bộ mô tả lỗi.
     */
    negativeAcknowledge(messageId: string, failureCode: TransportFailureCode, reason: string, timestamp?: number): Readonly<TransportNackRecord>;
    /**
     * EN: Sends a heartbeat signal on a connection.
     * Heartbeat is a connectivity signal only; does NOT execute tools or invoke LLM.
     *
     * VI: Gửi tín hiệu nhịp tim trên một kết nối.
     * Nhịp tim chỉ là tín hiệu kết nối; KHÔNG thực thi tool hay gọi LLM.
     */
    sendHeartbeat(connectionId: string, timestamp?: number): Readonly<HeartbeatSignal>;
    /**
     * EN: Acknowledges a heartbeat signal from a remote surface.
     * VI: Xác nhận một tín hiệu nhịp tim từ một bề mặt từ xa.
     */
    acknowledgeHeartbeat(connectionId: string, sequence: number, surfaceId: string, timestamp?: number): Readonly<HeartbeatAck>;
    /**
     * EN: Requests session resume on reconnect.
     * Validates scope and sequence preservation. Never creates a second Brain.
     *
     * VI: Yêu cầu khôi phục phiên khi kết nối lại.
     * Xác thực phạm vi và bảo toàn chuỗi số thứ tự. Không bao giờ tạo Não bộ thứ hai.
     */
    requestResume(params: {
        readonly connectionId: string;
        readonly scope: ScopedTransportIdentity;
        readonly lastAckSequence: number;
        readonly checkpointReference?: string;
        readonly resumeAttempt?: number;
        readonly timestamp?: number;
    }): Readonly<ResumeResult>;
    /**
     * EN: Computes current flow-control and backpressure metrics for a connection.
     * VI: Tính toán chỉ số kiểm soát lưu lượng và áp lực ngược hiện tại cho một kết nối.
     */
    getBackpressureMetrics(connectionId: string): Readonly<TransportBackpressureMetrics>;
    /**
     * EN: Creates an immutable checkpoint of the transport state for a connection.
     * VI: Khởi tạo một checkpoint trạng thái truyền tải bất biến cho một kết nối.
     */
    createCheckpoint(connectionId: string, timestamp?: number): Readonly<TransportCheckpoint>;
    /**
     * EN: Returns immutable audit records, optionally filtered by connectionId.
     * VI: Trả về danh sách bản ghi kiểm tra bất biến, có thể lọc theo connectionId.
     */
    getAuditRecords(connectionId?: string): ReadonlyArray<Readonly<TransportAuditRecord>>;
    /**
     * EN: Retrieves delivery record for a message.
     * VI: Lấy bản ghi phân phối cho một thông điệp.
     */
    getDelivery(messageId: string): Readonly<TransportDeliveryRecord> | undefined;
    /**
     * EN: Retrieves message envelope by messageId.
     * VI: Lấy phong bì thông điệp theo messageId.
     */
    getMessage(messageId: string): Readonly<BrainTransportMessage> | undefined;
    private recordAudit;
}
