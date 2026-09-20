// src/core/bodyProtocol/bodyRegistry.ts
// BOWCON V4.0 — CENTRAL BODY REGISTRY & CAPABILITY ROUTER
//
// EN:
// Authoritative in-memory registry for peripheral Bodies connected to Central Brain.
// Dispatches commands to bodies based on advertised capabilities, monitors heartbeats,
// and automatically evicts stale bodies upon timeout.
//
// VI:
// Registry bộ nhớ có thẩm quyền cho các Thể xác (Bodies) ngoại vi kết nối với Não bộ.
// Điều phối gửi lệnh tới body dựa trên capability quảng bá, theo dõi heartbeat,
// và tự động gỡ đăng ký các body hết hạn phản hồi.

import type {
  CapabilityAdvertisement,
  CapabilityDescriptor,
  BodyCommand,
  BodyCommandResult,
  BodyRecord,
  BodyConnectionSender,
} from './types.js';
import { BODY_CONFIG } from './bodyProtocolConfig.js';
import { BodyProtocolErrorCode } from './errorCodes.js';
import { getAudioCapabilityRiskLevel } from '../policyClassification.js';

/** Entry lưu trữ một lệnh đang chờ phản hồi từ Body. */
interface PendingCommandEntry {
  bodyId: string;
  resolve: (res: BodyCommandResult) => void;
  reject: (err: Error) => void;
  timeoutHandle: NodeJS.Timeout;
}

export interface BodyRegistryOptions {
  /** Heartbeat timeout in milliseconds (default: 15000ms) */
  heartbeatTimeoutMs?: number;
  /** Background sweep interval in milliseconds (default: 5000ms) */
  sweepIntervalMs?: number;
}

export class BodyRegistry {
  private readonly bodies = new Map<string, BodyRecord>();
  /**
   * Lưu trữ tập trung tất cả lệnh đang chờ phản hồi từ Body.
   * Key = commandId, Value = { bodyId, resolve, reject, timeoutHandle }
   * Được quản lý tại đây để failPendingCommandsForBody() hoạt động từ mọi nguyên
   * nhân disconnect (ws.close, heartbeat timeout, manual unregister).
   */
  private readonly pendingCommands = new Map<string, PendingCommandEntry>();
  private readonly heartbeatTimeoutMs: number;
  private readonly sweepIntervalMs: number;
  private sweepTimer?: NodeJS.Timeout;
  private onBodyUnregisteredListeners: Array<(bodyId: string, reason: string) => void> = [];

  constructor(options: BodyRegistryOptions = {}) {
    this.heartbeatTimeoutMs = options.heartbeatTimeoutMs ?? BODY_CONFIG.heartbeatTimeoutMs;
    this.sweepIntervalMs = options.sweepIntervalMs ?? BODY_CONFIG.sweepIntervalMs;
    this.startSweep();
  }

  /**
   * Đăng ký hoặc cập nhật một Body ngoại vi cùng danh sách Capability quảng bá.
   */
  public registerBody(
    ad: CapabilityAdvertisement,
    connection?: BodyConnectionSender
  ): BodyRecord {
    const now = Date.now();
    const capMap = new Map<string, CapabilityDescriptor>();
    for (const cap of ad.capabilities) {
      // Security Hardening: Áp dụng riskLevel cho capability "audio.*"
      // Khi REQUIRE_PUSH_TO_TALK đang bật -> 'medium' (không đòi hỏi approval token thừa)
      // Khi REQUIRE_PUSH_TO_TALK tắt -> 'high' (bắt buộc qua PDP approval)
      const isAudio = cap.name.startsWith('audio.') || cap.name === 'audio.capture' || cap.name === 'audio.play';
      const descriptor: CapabilityDescriptor = {
        ...cap,
        riskLevel: isAudio ? getAudioCapabilityRiskLevel(cap.name) : cap.riskLevel,
      };
      capMap.set(descriptor.name, descriptor);
    }

    const existing = this.bodies.get(ad.bodyId);
    const record: BodyRecord = {
      bodyId: ad.bodyId,
      bodyType: ad.bodyType,
      name: ad.name,
      capabilities: capMap,
      metadata: ad.metadata || {},
      registeredAt: existing?.registeredAt || now,
      lastHeartbeatAt: now,
      connection: connection || existing?.connection,
    };

    this.bodies.set(ad.bodyId, record);
    return record;
  }

  /**
   * Gỡ đăng ký một Body khỏi hệ thống.
   */
  public unregisterBody(bodyId: string, reason: string = BodyProtocolErrorCode.MANUAL_UNREGISTER): boolean {
    const existing = this.bodies.get(bodyId);
    if (!existing) return false;

    // Fail all pending commands for this body BEFORE closing connection.
    // This is the single central point that handles ALL disconnect scenarios:
    // ws.on('close'), heartbeat timeout sweep, and manual unregister.
    this.failPendingCommandsForBody(bodyId, `${BodyProtocolErrorCode.BODY_DISCONNECTED}: ${reason}`);

    if (existing.connection?.close) {
      try {
        existing.connection.close(reason);
      } catch {
        // Safe close swallow
      }
    }

    this.bodies.delete(bodyId);
    for (const listener of this.onBodyUnregisteredListeners) {
      listener(bodyId, reason);
    }
    return true;
  }

  /**
   * EN: Register a pending command waiting for a response from a Body.
   * VI: Đăng ký một lệnh đang chờ phản hồi từ Body vào registry trung tâm.
   *
   * @param commandId - Unique command identifier.
   * @param bodyId    - Target body that will execute this command.
   * @param resolve   - Resolve callback for the pending Promise.
   * @param reject    - Reject callback for the pending Promise.
   * @param timeoutHandle - Active setTimeout handle (will be cleared on early fail).
   */
  public registerPendingCommand(
    commandId: string,
    bodyId: string,
    resolve: (res: BodyCommandResult) => void,
    reject: (err: Error) => void,
    timeoutHandle: NodeJS.Timeout
  ): void {
    this.pendingCommands.set(commandId, { bodyId, resolve, reject, timeoutHandle });
  }

  /**
   * EN: Resolve a pending command when the Body returns its result.
   * VI: Giải quyết một lệnh đang chờ khi Body trả kết quả về.
   *
   * @returns true nếu command tồn tại và đã được resolved, false nếu không tìm thấy.
   */
  public resolvePendingCommand(commandId: string, result: BodyCommandResult): boolean {
    const entry = this.pendingCommands.get(commandId);
    if (!entry) return false;
    this.pendingCommands.delete(commandId);
    clearTimeout(entry.timeoutHandle);
    entry.resolve(result);
    return true;
  }

  /**
   * EN: Explicitly abort/cancel a single pending command by commandId.
   * Clears active timer and rejects the pending promise immediately.
   *
   * VI: Hủy một lệnh đang chờ theo commandId cụ thể.
   * Xóa timer đang chạy và reject promise ngay lập tức.
   */
  public abortCommand(commandId: string, reason: string = BodyProtocolErrorCode.COMMAND_ABORTED): boolean {
    const entry = this.pendingCommands.get(commandId);
    if (!entry) return false;
    this.pendingCommands.delete(commandId);
    clearTimeout(entry.timeoutHandle);
    entry.reject(new Error(reason));
    return true;
  }

  /**
   * EN: Immediately reject all pending commands belonging to a given body.
   * Called automatically by unregisterBody() — covers ws.close, heartbeat timeout,
   * and manual unregister in one place. Safe to call multiple times (idempotent).
   *
   * VI: Từ chối ngay lập tức tất cả lệnh đang chờ thuộc về một body cụ thể.
   * Được gọi tự động bởi unregisterBody() — bao phủ ws.close, heartbeat timeout,
   * và unregister thủ công tại một điểm duy nhất. An toàn khi gọi nhiều lần.
   *
   * @param bodyId - Body bị ngắt kết nối.
   * @param reason - Mã lỗi rõ ràng ghi vào reject message.
   */
  public failPendingCommandsForBody(bodyId: string, reason: string): void {
    const toFail: string[] = [];
    for (const [commandId, entry] of this.pendingCommands.entries()) {
      if (entry.bodyId === bodyId) {
        toFail.push(commandId);
      }
    }

    for (const commandId of toFail) {
      const entry = this.pendingCommands.get(commandId);
      if (!entry) continue; // Already resolved (race condition guard)
      this.pendingCommands.delete(commandId);
      clearTimeout(entry.timeoutHandle); // Prevent double-call when old timer fires
      entry.reject(new Error(reason));
    }
  }

  /**
   * Cập nhật thời điểm nhận heartbeat gần nhất từ Body.
   */
  public recordHeartbeat(bodyId: string): boolean {
    const body = this.bodies.get(bodyId);
    if (!body) return false;

    body.lastHeartbeatAt = Date.now();
    return true;
  }

  /**
   * Tra cứu thông tin một Body theo bodyId (loại trừ nếu đã quá hạn heartbeat).
   */
  public getBody(bodyId: string): BodyRecord | undefined {
    const body = this.bodies.get(bodyId);
    if (!body) return undefined;

    if (this.isExpired(body)) {
      this.unregisterBody(bodyId, BodyProtocolErrorCode.HEARTBEAT_TIMEOUT);
      return undefined;
    }
    return body;
  }

  /**
   * Tìm tất cả các Body còn sống có khả năng thực thi capabilityName.
   */
  public findBodiesWithCapability(capabilityName: string): BodyRecord[] {
    const matched: BodyRecord[] = [];
    const expiredIds: string[] = [];

    for (const [id, body] of this.bodies.entries()) {
      if (this.isExpired(body)) {
        expiredIds.push(id);
        continue;
      }
      if (body.capabilities.has(capabilityName)) {
        matched.push(body);
      }
    }

    for (const id of expiredIds) {
      this.unregisterBody(id, BodyProtocolErrorCode.HEARTBEAT_TIMEOUT);
    }

    return matched;
  }

  /**
   * Lấy danh sách toàn bộ các Body còn hoạt động.
   */
  public getAllActiveBodies(): BodyRecord[] {
    const active: BodyRecord[] = [];
    const expiredIds: string[] = [];

    for (const [id, body] of this.bodies.entries()) {
      if (this.isExpired(body)) {
        expiredIds.push(id);
      } else {
        active.push(body);
      }
    }

    for (const id of expiredIds) {
      this.unregisterBody(id, BodyProtocolErrorCode.HEARTBEAT_TIMEOUT);
    }

    return active;
  }

  /**
   * Điều phối thực thi lệnh BodyCommand tới Body sở hữu capability.
   */
  public async executeBodyCommand(command: BodyCommand): Promise<BodyCommandResult> {
    const start = Date.now();

    // 1. Kiểm tra target bodyId nếu có chỉ định rõ
    let targetBody: BodyRecord | undefined;
    if (command.bodyId) {
      targetBody = this.getBody(command.bodyId);
    }

    // 2. Nếu không chỉ định bodyId hoặc không tìm thấy, tìm body có capability phù hợp
    if (!targetBody) {
      const candidates = this.findBodiesWithCapability(command.capability);
      if (candidates.length > 0) {
        targetBody = candidates[0];
      }
    }

    if (!targetBody) {
      return {
        commandId: command.commandId,
        success: false,
        error: `${BodyProtocolErrorCode.NO_BODY_AVAILABLE}: No active body found providing capability "${command.capability}".`,
        executionTimeMs: Date.now() - start,
      };
    }

    if (!targetBody.connection) {
      return {
        commandId: command.commandId,
        success: false,
        error: `${BodyProtocolErrorCode.BODY_DISCONNECTED}: Body "${targetBody.bodyId}" has no active connection sender.`,
        executionTimeMs: Date.now() - start,
      };
    }

    try {
      const res = await targetBody.connection.sendCommand(command);
      return {
        ...res,
        executionTimeMs: Date.now() - start,
      };
    } catch (err: any) {
      return {
        commandId: command.commandId,
        success: false,
        error: `${BodyProtocolErrorCode.COMMAND_DISPATCH_FAILED}: ${err?.message || String(err)}`,
        executionTimeMs: Date.now() - start,
      };
    }
  }

  /**
   * Đăng ký lắng nghe sự kiện gỡ đăng ký body (hữu ích cho logging & telemetry).
   */
  public onBodyUnregistered(listener: (bodyId: string, reason: string) => void): void {
    this.onBodyUnregisteredListeners.push(listener);
  }

  /**
   * Bắt đầu vòng quét dọn dẹp các body quá hạn heartbeat.
   */
  private startSweep(): void {
    if (this.sweepTimer) return;
    this.sweepTimer = setInterval(() => {
      const expired: string[] = [];
      for (const [id, body] of this.bodies.entries()) {
        if (this.isExpired(body)) {
          expired.push(id);
        }
      }
      for (const id of expired) {
        this.unregisterBody(id, BodyProtocolErrorCode.HEARTBEAT_TIMEOUT);
      }
    }, this.sweepIntervalMs);

    // Không giữ process node nếu đây là tác vụ duy nhất còn lại
    if (this.sweepTimer.unref) {
      this.sweepTimer.unref();
    }
  }

  /**
   * Dừng timer dọn dẹp (dùng khi shutdown hoặc teardown kiểm thử).
   */
  public stop(): void {
    if (this.sweepTimer) {
      clearInterval(this.sweepTimer);
      this.sweepTimer = undefined;
    }
    // Fail all remaining pending commands before clearing bodies
    for (const [commandId, entry] of this.pendingCommands.entries()) {
      clearTimeout(entry.timeoutHandle);
      entry.reject(new Error(`${BodyProtocolErrorCode.REGISTRY_STOPPED}: BodyRegistry was shut down.`));
    }
    this.pendingCommands.clear();
    this.bodies.clear();
    this.onBodyUnregisteredListeners = [];
  }

  private isExpired(body: BodyRecord): boolean {
    return Date.now() - body.lastHeartbeatAt > this.heartbeatTimeoutMs;
  }
}

/**
 * Singleton instance của BodyRegistry cho Core.
 */
export const globalBodyRegistry = new BodyRegistry();
