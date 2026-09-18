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

export interface BodyRegistryOptions {
  /** Heartbeat timeout in milliseconds (default: 15000ms) */
  heartbeatTimeoutMs?: number;
  /** Background sweep interval in milliseconds (default: 5000ms) */
  sweepIntervalMs?: number;
}

export class BodyRegistry {
  private readonly bodies = new Map<string, BodyRecord>();
  private readonly heartbeatTimeoutMs: number;
  private readonly sweepIntervalMs: number;
  private sweepTimer?: NodeJS.Timeout;
  private onBodyUnregisteredListeners: Array<(bodyId: string, reason: string) => void> = [];

  constructor(options: BodyRegistryOptions = {}) {
    this.heartbeatTimeoutMs = options.heartbeatTimeoutMs ?? 15000;
    this.sweepIntervalMs = options.sweepIntervalMs ?? 5000;
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
      capMap.set(cap.name, cap);
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
  public unregisterBody(bodyId: string, reason = 'MANUAL_UNREGISTER'): boolean {
    const existing = this.bodies.get(bodyId);
    if (!existing) return false;

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
      this.unregisterBody(bodyId, 'HEARTBEAT_TIMEOUT');
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
      this.unregisterBody(id, 'HEARTBEAT_TIMEOUT');
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
      this.unregisterBody(id, 'HEARTBEAT_TIMEOUT');
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
        error: `NO_BODY_AVAILABLE: No active body found providing capability "${command.capability}".`,
        executionTimeMs: Date.now() - start,
      };
    }

    if (!targetBody.connection) {
      return {
        commandId: command.commandId,
        success: false,
        error: `BODY_DISCONNECTED: Body "${targetBody.bodyId}" has no active connection sender.`,
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
        error: `COMMAND_DISPATCH_FAILED: ${err?.message || String(err)}`,
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
        this.unregisterBody(id, 'HEARTBEAT_TIMEOUT');
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
