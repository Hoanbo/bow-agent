// scripts/run-brain-service.mjs
// BOWCON V4.0 — MS-1.3.31: REAL BOWCON BRAIN SERVICE & CONTINUOUS RUNTIME
//
// Standalone Real Executable Process Entry Point for BOWCON Brain Service.
//
// Local IPC via stdin/stdout JSONL:
// - Reads line-delimited JSON from process.stdin
// - Emits line-delimited JSON to process.stdout
// - Gracefully shuts down on SIGINT/SIGTERM or {"command": "SHUTDOWN"}
// - Zero external network exposure, 100% offline-ready

import readline from 'node:readline';

// Dual loader: loads from compiled dist if available, else from src via tsx
let BrainServiceModule;
try {
  BrainServiceModule = await import('../dist/core/brain-service/index.js');
} catch {
  BrainServiceModule = await import('../src/core/brain-service/index.ts');
}

const { BrainService } = BrainServiceModule;

// Parse configuration from environment variables
const brainService = new BrainService({
  hostMode: process.env.BRAIN_HOST_MODE || 'workstation',
  dataDir: process.env.BRAIN_DATA_DIR,
  serviceMode: process.env.BRAIN_SERVICE_MODE || 'standalone',
});

// Start service and load durable state
await brainService.start();

// Signal readiness on stdout
const readySignal = {
  type: 'SERVICE_READY',
  version: '4.0.0',
  serviceId: brainService.serviceId,
  brainId: brainService.brainId,
  state: brainService.state,
  hostMode: brainService.config.hostMode,
  timestamp: Date.now(),
};
process.stdout.write(JSON.stringify(readySignal) + '\n');

// Read JSONL requests from stdin
const rl = readline.createInterface({
  input: process.stdin,
});

let isShuttingDown = false;

async function handleShutdown(reason = 'Controlled shutdown') {
  if (isShuttingDown) return;
  isShuttingDown = true;
  try {
    rl.close();
    await brainService.shutdown(reason);
  } catch {
    // Fail-safe shutdown
  } finally {
    const stoppedSignal = {
      type: 'SERVICE_STOPPED',
      serviceId: brainService.serviceId,
      state: brainService.state,
      timestamp: Date.now(),
    };
    process.stdout.write(JSON.stringify(stoppedSignal) + '\n');
    process.exit(0);
  }
}

process.on('SIGINT', () => handleShutdown('SIGINT received'));
process.on('SIGTERM', () => handleShutdown('SIGTERM received'));

rl.on('line', async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  try {
    const payload = JSON.parse(trimmed);

    // Control commands
    if (payload.command === 'SHUTDOWN') {
      await handleShutdown(payload.reason || 'SHUTDOWN command received');
      return;
    }

    if (payload.command === 'HEALTH') {
      const health = brainService.getHealth();
      process.stdout.write(JSON.stringify({ type: 'HEALTH_REPORT', health }) + '\n');
      return;
    }

    if (payload.command === 'PING') {
      process.stdout.write(JSON.stringify({ type: 'PONG', timestamp: Date.now() }) + '\n');
      return;
    }

    // Standard Brain request envelope
    const response = await brainService.handleRequest(payload);
    process.stdout.write(JSON.stringify(response) + '\n');
  } catch (err) {
    const errorResponse = {
      success: false,
      error: {
        code: 'BRAIN_SERVICE_REQUEST_ERROR',
        message: err instanceof Error ? err.message : String(err),
        timestamp: Date.now(),
      },
      health: brainService.getHealth().health,
      timestamp: Date.now(),
    };
    process.stdout.write(JSON.stringify(errorResponse) + '\n');
  }
});
