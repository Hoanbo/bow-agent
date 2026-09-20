// tests/bodyProtocol/test_body_registry_fail_pending.ts
// BOWCON V4.0 — TEST: failPendingCommandsForBody() — Hanging Pending Command Fix
//
// Chạy: tsx tests/bodyProtocol/test_body_registry_fail_pending.ts
//
// Xác minh:
//  TC1: Disconnect đột ngột → pending command bị reject NGAY (< 100ms), không chờ 10s.
//  TC2: Heartbeat timeout (sweep) → pending command bị reject trong < sweepInterval + heartbeatTimeout + 100ms.
//  TC3: failPendingCommandsForBody() idempotent — gọi nhiều lần không throw.
//  TC4: resolvePendingCommand() với commandId không tồn tại → trả false, không throw.
//  TC5: registry.stop() reject toàn bộ pending commands với REGISTRY_STOPPED.

import { BodyRegistry } from '../../src/core/bodyProtocol/bodyRegistry.js';
import type {
  BodyCommand,
  BodyCommandResult,
  BodyConnectionSender,
  CapabilityAdvertisement,
} from '../../src/core/bodyProtocol/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`  ✗ ASSERTION FAILED: ${message}`);
    throw new Error(`ASSERTION_FAILED: ${message}`);
  }
}

async function runTest(name: string, fn: () => Promise<void> | void): Promise<void> {
  try {
    await fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`✗ ${name}`);
    console.error(`  Error: ${err?.message || String(err)}`);
    failed++;
  }
}

function makeAd(bodyId: string): CapabilityAdvertisement {
  return {
    bodyId,
    bodyType: 'desktop',
    name: `Mock Body ${bodyId}`,
    capabilities: [{ name: 'test.echo', description: 'Echo test', riskLevel: 'low' }],
  };
}

function makeCommand(bodyId: string, timeoutMs = 10000): BodyCommand {
  return {
    commandId: `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    bodyId,
    capability: 'test.echo',
    params: {},
    timeoutMs,
  };
}

/**
 * Tạo BodyConnectionSender giả — KHÔNG bao giờ trả lời tự nhiên.
 * Đăng ký vào registry để failPendingCommandsForBody() có thể reach.
 */
function makeSilentSender(
  registry: BodyRegistry,
  bodyId: string
): BodyConnectionSender {
  return {
    sendCommand: (command: BodyCommand): Promise<BodyCommandResult> => {
      return new Promise<BodyCommandResult>((resolve, reject) => {
        const timeoutMs = command.timeoutMs || 10000;
        const timeoutHandle = setTimeout(() => {
          registry.resolvePendingCommand(command.commandId, {
            commandId: command.commandId,
            success: false,
            error: `COMMAND_TIMEOUT: timed out after ${timeoutMs}ms`,
          });
        }, timeoutMs);
        // Đăng ký vào registry — đây là điểm mấu chốt của fix
        registry.registerPendingCommand(command.commandId, bodyId, resolve, reject, timeoutHandle);
        // Không gửi đi đâu — body im lặng
      });
    },
    isAlive: () => true,
    close: () => {},
  };
}

// ---------------------------------------------------------------------------
// TC1: Disconnect đột ngột → reject ngay lập tức < 100ms
// ---------------------------------------------------------------------------
await runTest('TC1: Pending command rejected immediately on disconnect (< 100ms)', async () => {
  const registry = new BodyRegistry({ heartbeatTimeoutMs: 15000, sweepIntervalMs: 5000 });
  try {
    const bodyId = 'body_tc1';
    const sender = makeSilentSender(registry, bodyId);
    registry.registerBody(makeAd(bodyId), sender);

    const command = makeCommand(bodyId, 10000);
    const commandPromise = sender.sendCommand(command);

    // Chờ 5ms đảm bảo registerPendingCommand() đã chạy
    await new Promise((r) => setTimeout(r, 5));

    const t0 = Date.now();
    registry.unregisterBody(bodyId, 'CONNECTION_CLOSED'); // Giả lập ws.on('close')

    let caughtError: Error | undefined;
    try { await commandPromise; } catch (e: any) { caughtError = e; }

    const latencyMs = Date.now() - t0;
    console.log(`  → reject latency: ${latencyMs}ms`);

    assert(caughtError !== undefined, 'Command promise phải bị reject');
    assert(caughtError!.message.includes('BODY_DISCONNECTED'), `Error phải chứa BODY_DISCONNECTED, got: ${caughtError!.message}`);
    assert(caughtError!.message.includes('CONNECTION_CLOSED'), `Error phải chứa CONNECTION_CLOSED, got: ${caughtError!.message}`);
    assert(latencyMs < 100, `Reject latency ${latencyMs}ms phải < 100ms`);
  } finally {
    registry.stop();
  }
});

// ---------------------------------------------------------------------------
// TC2: Heartbeat timeout sweep → reject, không chờ 10s
// ---------------------------------------------------------------------------
await runTest('TC2: Pending command rejected by heartbeat sweep (NOT waiting 10s)', async () => {
  const SWEEP_MS = 200;
  const HB_TIMEOUT_MS = 150;
  const MAX_ALLOWED_MS = SWEEP_MS + HB_TIMEOUT_MS + 150; // ~500ms

  const registry = new BodyRegistry({
    heartbeatTimeoutMs: HB_TIMEOUT_MS,
    sweepIntervalMs: SWEEP_MS,
  });

  try {
    const bodyId = 'body_tc2';
    const sender = makeSilentSender(registry, bodyId);
    registry.registerBody(makeAd(bodyId), sender);

    const command = makeCommand(bodyId, 10000); // Timeout 10s — KHÔNG được trigger
    const commandPromise = sender.sendCommand(command);

    await new Promise((r) => setTimeout(r, 5));

    const t0 = Date.now();
    // Không gửi heartbeat → body expire → sweep gọi unregisterBody → failPendingCommandsForBody

    let caughtError: Error | undefined;
    try { await commandPromise; } catch (e: any) { caughtError = e; }

    const latencyMs = Date.now() - t0;
    console.log(`  → reject latency: ${latencyMs}ms (max allowed: ${MAX_ALLOWED_MS}ms, NOT 10000ms)`);

    assert(caughtError !== undefined, 'Command promise phải bị reject');
    assert(caughtError!.message.includes('BODY_DISCONNECTED'), `Error phải chứa BODY_DISCONNECTED`);
    assert(caughtError!.message.includes('HEARTBEAT_TIMEOUT'), `Error phải chứa HEARTBEAT_TIMEOUT, got: ${caughtError!.message}`);
    assert(latencyMs < MAX_ALLOWED_MS, `Reject latency ${latencyMs}ms phải < ${MAX_ALLOWED_MS}ms (không phải 10000ms)`);
  } finally {
    registry.stop();
  }
});

// ---------------------------------------------------------------------------
// TC3: Idempotent
// ---------------------------------------------------------------------------
await runTest('TC3: failPendingCommandsForBody is idempotent (no throw on double-call)', () => {
  const registry = new BodyRegistry({ heartbeatTimeoutMs: 15000, sweepIntervalMs: 5000 });
  try {
    const bodyId = 'body_tc3';

    // Gọi khi không có pending command → no-op
    registry.failPendingCommandsForBody(bodyId, 'FIRST_CALL_NO_COMMANDS');

    // Đăng ký 1 pending command
    let wasRejected = false;
    const handle = setTimeout(() => {}, 10000);
    registry.registerPendingCommand(
      'cmd_tc3_fake',
      bodyId,
      () => {},
      () => { wasRejected = true; },
      handle
    );

    // Lần 1 → reject
    registry.failPendingCommandsForBody(bodyId, 'FIRST_REAL_CALL');
    assert(wasRejected, 'Command phải bị reject sau lần gọi đầu tiên');

    // Lần 2 → no-op (command đã xóa khỏi map rồi)
    registry.failPendingCommandsForBody(bodyId, 'SECOND_CALL_SHOULD_BE_NOOP');
    console.log('  → double-call: no throw ✓');
  } finally {
    registry.stop();
  }
});

// ---------------------------------------------------------------------------
// TC4: resolvePendingCommand với commandId không tồn tại → false
// ---------------------------------------------------------------------------
await runTest('TC4: resolvePendingCommand returns false for unknown commandId', () => {
  const registry = new BodyRegistry({ heartbeatTimeoutMs: 15000, sweepIntervalMs: 5000 });
  try {
    const result = registry.resolvePendingCommand('nonexistent_cmd', {
      commandId: 'nonexistent_cmd',
      success: true,
    });
    assert(result === false, `resolvePendingCommand phải trả false, got: ${result}`);
    console.log('  → returned false without throwing ✓');
  } finally {
    registry.stop();
  }
});

// ---------------------------------------------------------------------------
// TC5: registry.stop() reject tất cả pending commands với REGISTRY_STOPPED
// ---------------------------------------------------------------------------
await runTest('TC5: registry.stop() rejects all remaining pending commands', async () => {
  const registry = new BodyRegistry({ heartbeatTimeoutMs: 15000, sweepIntervalMs: 5000 });

  let caughtError: Error | undefined;
  const stopPromise = new Promise<BodyCommandResult>((resolve, reject) => {
    const handle = setTimeout(() => {}, 10000);
    registry.registerPendingCommand('cmd_tc5_stop', 'body_tc5', resolve, reject, handle);
  });

  // Stop ngay
  registry.stop();

  try { await stopPromise; } catch (e: any) { caughtError = e; }

  assert(caughtError !== undefined, 'Command phải bị reject khi registry stop');
  assert(caughtError!.message.includes('REGISTRY_STOPPED'), `Error phải chứa REGISTRY_STOPPED, got: ${caughtError!.message}`);
  console.log('  → REGISTRY_STOPPED received ✓');
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log('\n' + '='.repeat(60));
console.log(`RESULT: ${passed} passed, ${failed} failed`);
console.log('='.repeat(60));

if (failed > 0) {
  process.exit(1);
}
