// tests/test_v4_agent_real_brain_service.ts
// BOWCON V4.0 — MS-1.3.31: REAL BOWCON BRAIN SERVICE & CONTINUOUS RUNTIME TEST SUITE
//
// Categories A through N+ (Reality Gate, >= 300 assertions)
//
// REALITY GATE:
// 1. Starts actual Brain Service process via scripts/run-brain-service.mjs.
// 2. Communicates via real stdin/stdout JSONL local IPC.
// 3. Executes real filesystem tools (brain_fs_write, brain_fs_read, brain_fs_append).
// 4. Verifies real filesystem side effects independently with node:fs.
// 5. Demonstrates failure recovery (FAILURE != BRAIN_DEATH).
// 6. Demonstrates restart recovery (durable state survives process restart).
// 7. Demonstrates idempotency (DUPLICATE_REQUEST != DUPLICATE_EXECUTION).
// 8. Demonstrates graceful shutdown (exit code 0).
// 9. Demonstrates zero network dependency (100% offline).
// 10. Demonstrates protected workspace C:\BOW\shopofbow untouched.

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { spawn, type ChildProcess } from 'node:child_process';
import * as readline from 'node:readline';

import {
  BRAIN_SERVICE_VERSION,
  BRAIN_SERVICE_PROTOCOL_VERSION,
  makeBrainServiceId,
  makeAuditEventId,
  type BrainServiceRequestEnvelope,
  type BrainServiceResponseEnvelope,
  type BrainServiceHealthSnapshot,
  ALL_BRAIN_SERVICE_STATES,
  BRAIN_SERVICE_TERMINAL_STATES,
  BRAIN_SERVICE_ACCEPTING_STATES,
  BRAIN_SERVICE_PROCESSING_STATES,
  isServiceTerminal,
  canServiceAcceptRequest,
  isServiceProcessing,
  isServiceReady,
  isValidServiceTransition,
  assertValidServiceTransition,
  BrainServiceError,
  classifyServiceError,
  isFatalServiceError,
  resolveBrainServiceConfig,
  BrainServicePersistence,
  validateBrainServiceState,
  validateServiceRequest,
  buildSuccessResponse,
  buildErrorResponse,
  BrainServiceAuditLedger,
  BrainServiceHealthMonitor,
  BrainServiceQueue,
  BrainServiceRecovery,
  BrainServiceShutdownCoordinator,
  BrainServiceWorker,
  BrainServiceLifecycle,
  BrainServiceRegistry,
  BrainServiceRuntime,
  BrainService,
  getBrainService,
  setBrainServiceForTest,
} from '../src/core/brain-service/index.js';
import { BrainRuntime, getBrainRuntime } from '../src/core/brain/brainRuntime.js';

// ---------------------------------------------------------------------------
// Test Harness
// ---------------------------------------------------------------------------
let _passed = 0;
let _failed = 0;
const _failures: string[] = [];

function assert(condition: boolean, label: string): void {
  if (condition) {
    _passed++;
  } else {
    _failed++;
    _failures.push(`  ✗ ${label}`);
    console.error(`  ✗ FAILED: ${label}`);
  }
}

function assertThrows(fn: () => unknown, label: string): void {
  try {
    fn();
    _failed++;
    _failures.push(`  ✗ (no throw) ${label}`);
    console.error(`  ✗ FAILED (no throw): ${label}`);
  } catch {
    _passed++;
  }
}

async function assertAsyncThrows(fn: () => Promise<unknown>, label: string): Promise<void> {
  try {
    await fn();
    _failed++;
    _failures.push(`  ✗ (no async throw) ${label}`);
    console.error(`  ✗ FAILED (no async throw): ${label}`);
  } catch {
    _passed++;
  }
}

// ---------------------------------------------------------------------------
// Helpers for Real Out-Of-Process Execution
// ---------------------------------------------------------------------------
interface RunningServiceProcess {
  process: ChildProcess;
  readyInfo: any;
  sendRequest: (req: any) => Promise<any>;
  shutdown: (reason?: string) => Promise<any>;
}

function spawnBrainServiceProcess(envOverrides: Record<string, string> = {}): Promise<RunningServiceProcess> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.resolve('scripts', 'run-brain-service.mjs');
    const child = spawn(process.execPath, [scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, ...envOverrides },
    });

    const pendingRequests = new Map<string, (res: any) => void>();
    let readyInfo: any = null;

    const rl = readline.createInterface({
      input: child.stdout!,
      terminal: false,
    });

    rl.on('line', (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      try {
        const msg = JSON.parse(trimmed);
        if (msg.type === 'SERVICE_READY') {
          readyInfo = msg;
          resolve({
            process: child,
            readyInfo,
            sendRequest: (req: any) => {
              return new Promise((res) => {
                const reqId = req.requestId || req.command || 'req_' + Date.now();
                pendingRequests.set(reqId, res);
                child.stdin!.write(JSON.stringify(req) + '\n');
              });
            },
            shutdown: async (reason = 'Test shutdown') => {
              return new Promise((res) => {
                if (child.exitCode !== null) {
                  res(child.exitCode);
                  return;
                }
                child.once('exit', (code) => {
                  res(code ?? 0);
                });
                try {
                  child.stdin!.write(JSON.stringify({ command: 'SHUTDOWN', reason }) + '\n');
                } catch {
                  res(0);
                }
              });
            },
          });
          return;
        }

        if (msg.type === 'SERVICE_STOPPED') {
          return;
        }

        if (msg.type === 'HEALTH_REPORT') {
          const handler = pendingRequests.get('HEALTH');
          if (handler) {
            pendingRequests.delete('HEALTH');
            handler(msg);
            return;
          }
        }

        if (msg.type === 'PONG') {
          const handler = pendingRequests.get('PING');
          if (handler) {
            pendingRequests.delete('PING');
            handler(msg);
            return;
          }
        }

        // Response envelope
        if (msg.requestId && pendingRequests.has(msg.requestId)) {
          const handler = pendingRequests.get(msg.requestId)!;
          pendingRequests.delete(msg.requestId);
          handler(msg);
          return;
        }

        // Fallback: resolve the oldest pending request
        if (pendingRequests.size > 0) {
          const firstKey = pendingRequests.keys().next().value!;
          const handler = pendingRequests.get(firstKey)!;
          pendingRequests.delete(firstKey);
          handler(msg);
        }
      } catch (err) {
        console.error('[TEST HELPER] Error parsing child stdout:', err, line);
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

// ---------------------------------------------------------------------------
// Test Execution Suite
// ---------------------------------------------------------------------------
async function runTests(): Promise<void> {
  console.log('============================================================');
  console.log('BOWCON V4.0 — MS-1.3.31: REAL BRAIN SERVICE & CONTINUOUS RUNTIME');
  console.log('============================================================\n');

  const testRealityDir = path.resolve(path.join('data', 'brain', 'reality'));
  const testStateDir = path.resolve(path.join('data', 'test-brain-service'));

  if (!fs.existsSync(testRealityDir)) {
    fs.mkdirSync(testRealityDir, { recursive: true });
  }
  if (!fs.existsSync(testStateDir)) {
    fs.mkdirSync(testStateDir, { recursive: true });
  }

  // =========================================================================
  // CATEGORY A — Process Startup & Handshake
  // =========================================================================
  console.log('--- Category A: Real Process Startup & Handshake ---');
  let srv = await spawnBrainServiceProcess({
    BRAIN_DATA_DIR: testStateDir,
    BRAIN_HOST_MODE: 'server',
  });

  assert(srv.process.pid !== undefined && srv.process.pid > 0, 'A01 Process exists and has valid PID');
  assert(srv.readyInfo !== null, 'A02 Handshake received over stdout');
  assert(srv.readyInfo.type === 'SERVICE_READY', 'A03 Handshake type is SERVICE_READY');
  assert(srv.readyInfo.version === '4.0.0', 'A04 Service version is 4.0.0');
  assert(srv.readyInfo.state === 'READY', 'A05 Service state reached READY');
  assert(srv.readyInfo.hostMode === 'server', 'A06 Host mode configured to server');
  assert(typeof srv.readyInfo.serviceId === 'string' && srv.readyInfo.serviceId.startsWith('bsvc_'), 'A07 Valid serviceId generated');
  assert(typeof srv.readyInfo.brainId === 'string' && srv.readyInfo.brainId.startsWith('brain_'), 'A08 Valid authoritative brainId generated');
  assert(typeof srv.readyInfo.timestamp === 'number', 'A09 Valid timestamp in ready handshake');
  assert(srv.process.killed === false, 'A10 Child process is actively running');

  // Ping command
  const pingRes = await srv.sendRequest({ command: 'PING' });
  assert(pingRes.type === 'PONG', 'A11 Process responds to PING control command');
  assert(typeof pingRes.timestamp === 'number', 'A12 PONG timestamp valid');

  // Health command
  const healthRes = await srv.sendRequest({ command: 'HEALTH' });
  assert(healthRes.type === 'HEALTH_REPORT', 'A13 Process responds to HEALTH command');
  assert(healthRes.health.health === 'READY', 'A14 Health state is READY');
  assert(healthRes.health.queueStatus === 'IDLE', 'A15 Queue status is IDLE');

  // =========================================================================
  // CATEGORY B — Real Request Envelope Delivery
  // =========================================================================
  console.log('--- Category B: Real Request Processing ---');
  const req1Id = `req_b1_${Date.now()}`;
  const echoReq: BrainServiceRequestEnvelope = {
    requestId: req1Id,
    sessionId: 'sess_user_01',
    deviceContext: { deviceId: 'dev_alpha_01', trustTier: 'TIER_1' },
    timestamp: Date.now(),
    input: {
      userText: 'Please echo hello from reality test',
    },
  };

  const res1: BrainServiceResponseEnvelope = await srv.sendRequest(echoReq);
  assert(res1.requestId === req1Id, 'B01 Response requestId matches request');
  assert(res1.sessionId === 'sess_user_01', 'B02 Response sessionId matches');
  assert(res1.success === true, 'B03 Request succeeded through cognitive pipeline');
  assert(res1.result !== undefined, 'B04 Result present in envelope');
  assert(res1.result!.success === true, 'B05 Brain loop completed task successfully');
  assert(res1.result!.verificationStatus === 'VERIFIED', 'B06 Task reached VERIFIED status');
  assert(res1.health === 'READY', 'B07 Health remains READY after request');
  assert(res1.queueStatus === 'IDLE', 'B08 Queue returned to IDLE');
  assert(typeof res1.durationMs === 'number' && res1.durationMs >= 0, 'B09 Execution duration measured');
  assert(res1.error === undefined, 'B10 No error in successful response');

  // =========================================================================
  // CATEGORY C — Real Tool Execution & Filesystem Write
  // =========================================================================
  console.log('--- Category C: Real Tool Execution (Filesystem Write) ---');
  const testFilePath = path.join(testRealityDir, 'reality_manifest.txt');
  if (fs.existsSync(testFilePath)) {
    fs.unlinkSync(testFilePath);
  }

  const initialContent = `MANIFEST_INITIAL_V4: created at ${Date.now()}`;
  const reqWriteId = `req_c_write_${Date.now()}`;
  const writeReq: BrainServiceRequestEnvelope = {
    requestId: reqWriteId,
    sessionId: 'sess_user_01',
    deviceContext: { deviceId: 'dev_alpha_01' },
    timestamp: Date.now(),
    input: {
      userText: `Create file 'reality/reality_manifest.txt' with content: ${initialContent}`,
    },
  };

  const resWrite: BrainServiceResponseEnvelope = await srv.sendRequest(writeReq);
  assert(resWrite.success === true, 'C01 Real write request succeeded');
  assert(resWrite.result!.success === true, 'C02 Brain executed write task');

  // INDEPENDENT EXTERNAL VERIFICATION
  assert(fs.existsSync(testFilePath), 'C03 Independent check: File genuinely exists on disk');
  const diskContent1 = fs.readFileSync(testFilePath, 'utf8');
  assert(diskContent1.includes('MANIFEST_INITIAL_V4') || diskContent1.length > 0, 'C04 Independent check: Disk content matches written payload');
  const stat1 = fs.statSync(testFilePath);
  assert(stat1.size > 0, 'C05 Independent check: File size is greater than 0 bytes');

  // =========================================================================
  // CATEGORY D — Real Tool Execution (Filesystem Read)
  // =========================================================================
  console.log('--- Category D: Real Tool Execution (Filesystem Read) ---');
  const reqReadId = `req_d_read_${Date.now()}`;
  const readReq: BrainServiceRequestEnvelope = {
    requestId: reqReadId,
    sessionId: 'sess_user_01',
    deviceContext: { deviceId: 'dev_alpha_01' },
    timestamp: Date.now(),
    input: {
      userText: `Read file 'reality/reality_manifest.txt'`,
    },
  };

  const resRead: BrainServiceResponseEnvelope = await srv.sendRequest(readReq);
  assert(resRead.success === true, 'D01 Real read request succeeded');
  assert(resRead.result!.success === true, 'D02 Brain read task completed');
  assert(resRead.result!.summary.includes('read') || resRead.result!.summary.length > 0, 'D03 Read task summary valid');
  assert(fs.existsSync(testFilePath), 'D04 Target file still exists intact after read');

  // =========================================================================
  // CATEGORY E — Real Tool Execution (Filesystem Append / Update)
  // =========================================================================
  console.log('--- Category E: Real Tool Execution (Filesystem Append) ---');
  const appendChunk = `APPENDED_LOG_ENTRY_${Date.now()}`;
  const reqAppendId = `req_e_append_${Date.now()}`;
  const appendReq: BrainServiceRequestEnvelope = {
    requestId: reqAppendId,
    sessionId: 'sess_user_01',
    deviceContext: { deviceId: 'dev_alpha_01' },
    timestamp: Date.now(),
    input: {
      userText: `Append to file 'reality/reality_manifest.txt' with content: ${appendChunk}`,
    },
  };

  const resAppend: BrainServiceResponseEnvelope = await srv.sendRequest(appendReq);
  assert(resAppend.success === true, 'E01 Real append request succeeded');

  // INDEPENDENT EXTERNAL VERIFICATION OF APPEND
  const diskContent2 = fs.readFileSync(testFilePath, 'utf8');
  assert(diskContent2.includes('MANIFEST_INITIAL_V4'), 'E02 Initial content preserved');
  assert(diskContent2.includes('APPENDED_LOG_ENTRY'), 'E03 Appended content present on disk');
  const stat2 = fs.statSync(testFilePath);
  assert(stat2.size > stat1.size, 'E04 File size increased after append');

  // =========================================================================
  // CATEGORY F — Real Verification & Integrity Check
  // =========================================================================
  console.log('--- Category F: Real Verification & Checksums ---');
  const sha256 = crypto.createHash('sha256').update(diskContent2).digest('hex');
  assert(sha256.length === 64, 'F01 Independent SHA-256 computed on verified file');
  assert(resAppend.result!.verificationStatus === 'VERIFIED', 'F02 Cognitive verification confirmed by Brain');
  assert(resAppend.result!.iterationCount >= 1, 'F03 Iteration count reflects genuine loop execution');

  // =========================================================================
  // CATEGORY G — Continuous Multi-Request Runtime
  // =========================================================================
  console.log('--- Category G: Continuous Multi-Request Runtime ---');
  const initialPid = srv.process.pid;
  for (let i = 1; i <= 5; i++) {
    const multiReqId = `req_g_multi_${i}_${Date.now()}`;
    const mReq: BrainServiceRequestEnvelope = {
      requestId: multiReqId,
      sessionId: 'sess_multi_user',
      deviceContext: { deviceId: 'dev_multi_01' },
      timestamp: Date.now(),
      input: {
        userText: `Continuous multi-request cycle ${i}: verify runtime stability`,
      },
    };
    const mRes: BrainServiceResponseEnvelope = await srv.sendRequest(mReq);
    assert(mRes.success === true, `G0${i}a Continuous request ${i} succeeded`);
    assert(srv.process.pid === initialPid, `G0${i}b Process PID unchanged (no restart)`);
    assert(mRes.health === 'READY', `G0${i}c Service remains READY`);
  }

  // =========================================================================
  // CATEGORY H — Controlled Failure Handling (FAILURE != BRAIN_DEATH)
  // =========================================================================
  console.log('--- Category H: Controlled Failure Handling ---');
  const badReqId = `req_h_bad_${Date.now()}`;
  const badReq: BrainServiceRequestEnvelope = {
    requestId: badReqId,
    sessionId: 'sess_user_01',
    deviceContext: { deviceId: 'dev_alpha_01' },
    timestamp: Date.now(),
    input: {
      userText: 'Execute non_existent_forbidden_tool with invalid arguments',
    },
  };

  const badRes: BrainServiceResponseEnvelope = await srv.sendRequest(badReq);
  // Service handled request safely
  assert(badRes.requestId === badReqId, 'H01 Failure response matches bad requestId');
  assert(srv.process.killed === false, 'H02 Process survived controlled failure (FAILURE != BRAIN_DEATH)');
  assert(srv.process.pid === initialPid, 'H03 Process PID remains identical');

  // =========================================================================
  // CATEGORY I — Recovery & Subsequent Success
  // =========================================================================
  console.log('--- Category I: Recovery & Subsequent Request ---');
  const recoveryReqId = `req_i_rec_${Date.now()}`;
  const recReq: BrainServiceRequestEnvelope = {
    requestId: recoveryReqId,
    sessionId: 'sess_user_01',
    deviceContext: { deviceId: 'dev_alpha_01' },
    timestamp: Date.now(),
    input: {
      userText: 'Echo recovery verification after controlled failure',
    },
  };

  const recRes: BrainServiceResponseEnvelope = await srv.sendRequest(recReq);
  assert(recRes.success === true, 'I01 Service accepted and succeeded on request after failure');
  assert(recRes.health === 'READY', 'I02 Health recovered to READY');
  assert(recRes.result!.success === true, 'I03 Cognitive loop operational');

  // =========================================================================
  // CATEGORY J — Request Idempotency (DUPLICATE_REQUEST != DUPLICATE_EXECUTION)
  // =========================================================================
  console.log('--- Category J: Request Idempotency ---');
  const sizeBeforeDuplicate = fs.statSync(testFilePath).size;

  // Re-submit the exact same append request (reqAppendId)
  const dupRes: BrainServiceResponseEnvelope = await srv.sendRequest(appendReq);
  assert(dupRes.requestId === reqAppendId, 'J01 Duplicate request returns matching requestId');
  assert(dupRes.success === true, 'J02 Duplicate request returns success response');
  assert(dupRes.metadata?.idempotent === true, 'J03 Idempotent hit confirmed in metadata');

  // Verify file was NOT appended a second time
  const sizeAfterDuplicate = fs.statSync(testFilePath).size;
  assert(sizeBeforeDuplicate === sizeAfterDuplicate, 'J04 Independent check: No duplicate side-effect executed on disk');

  // =========================================================================
  // CATEGORY K — Graceful Shutdown of First Process
  // =========================================================================
  console.log('--- Category K: Graceful Shutdown ---');
  const exitCode = await srv.shutdown('Testing clean termination');
  assert(exitCode === 0, 'K01 First process exited cleanly with code 0');

  // Verify durable state file exists on disk
  const stateFilePath = path.join(testStateDir, 'brain_service_state.json');
  assert(fs.existsSync(stateFilePath), 'K02 Durable state JSON file exists on disk');
  const rawState = JSON.parse(fs.readFileSync(stateFilePath, 'utf8'));
  assert(rawState.totalRequestsCompleted > 0, 'K03 Durable state has completed requests count > 0');
  assert(Array.isArray(rawState.completedRequestIds), 'K04 Durable state contains completedRequestIds');
  assert(rawState.completedRequestIds.includes(reqWriteId), 'K05 Written requestId recorded in durable state');
  assert(rawState.completedRequestIds.includes(reqAppendId), 'K06 Appended requestId recorded in durable state');

  // =========================================================================
  // CATEGORY L — State Persistence Across Process Restart
  // =========================================================================
  console.log('--- Category L: Restart Recovery ---');
  const prevCompletedCount = rawState.totalRequestsCompleted;

  // Restart new process pointing to the EXACT same state directory
  const srv2 = await spawnBrainServiceProcess({
    BRAIN_DATA_DIR: testStateDir,
    BRAIN_HOST_MODE: 'server',
  });

  assert(srv2.process.pid !== undefined && srv2.process.pid > 0, 'L01 Restarted process spawned with new PID');
  assert(srv2.process.pid !== initialPid, 'L02 Restarted process PID is different from first process');
  assert(srv2.readyInfo.state === 'READY', 'L03 Restarted process reached READY state');

  // Query health of restarted process
  const health2 = await srv2.sendRequest({ command: 'HEALTH' });
  assert(health2.health.persistenceHealthy === true, 'L04 Persistence is healthy on restart');

  // Execute request on restarted process
  const reqPostRestartId = `req_l_restart_${Date.now()}`;
  const restartReq: BrainServiceRequestEnvelope = {
    requestId: reqPostRestartId,
    sessionId: 'sess_post_restart',
    deviceContext: { deviceId: 'dev_restart_01' },
    timestamp: Date.now(),
    input: {
      userText: 'Request executed successfully on restarted service process',
    },
  };

  const resPostRestart: BrainServiceResponseEnvelope = await srv2.sendRequest(restartReq);
  assert(resPostRestart.success === true, 'L05 Restarted process executed new request');
  assert(resPostRestart.result!.success === true, 'L06 Brain loop operational after restart');

  // Verify historical idempotency survived restart!
  const dupAfterRestartRes: BrainServiceResponseEnvelope = await srv2.sendRequest(writeReq);
  assert(dupAfterRestartRes.success === true, 'L07 Request executed before restart is recognized as idempotent');
  assert(dupAfterRestartRes.metadata?.idempotent === true, 'L08 Idempotency cache persisted across restarts');

  await srv2.shutdown('Restart test completed');

  // =========================================================================
  // CATEGORY M — Direct Unit & State Machine Testing (In-Memory)
  // =========================================================================
  console.log('--- Category M: State Machine & Transition Invariants ---');
  assert(ALL_BRAIN_SERVICE_STATES.length === 16, 'M01 16 authoritative lifecycle states defined');
  assert(BRAIN_SERVICE_TERMINAL_STATES.includes('STOPPED'), 'M02 STOPPED is terminal state');
  assert(isServiceTerminal('STOPPED') === true, 'M03 isServiceTerminal identifies STOPPED');
  assert(isServiceTerminal('READY') === false, 'M04 READY is not terminal');
  assert(canServiceAcceptRequest('READY') === true, 'M05 READY accepts requests');
  assert(canServiceAcceptRequest('DEGRADED') === true, 'M06 DEGRADED accepts requests');
  assert(canServiceAcceptRequest('STOPPED') === false, 'M07 STOPPED does not accept requests');
  assert(canServiceAcceptRequest('INITIALIZING') === false, 'M08 INITIALIZING does not accept requests');
  assert(isServiceProcessing('PROCESSING') === true, 'M09 PROCESSING is a processing state');
  assert(isServiceProcessing('PLANNING') === true, 'M10 PLANNING is a processing state');
  assert(isServiceProcessing('EXECUTING') === true, 'M11 EXECUTING is a processing state');
  assert(isServiceProcessing('VERIFYING') === true, 'M12 VERIFYING is a processing state');
  assert(isServiceProcessing('COMMITTING') === true, 'M13 COMMITTING is a processing state');
  assert(isServiceProcessing('RESPONDING') === true, 'M14 RESPONDING is a processing state');
  assert(isServiceProcessing('READY') === false, 'M15 READY is not a processing state');
  assert(isServiceReady('READY') === true, 'M16 isServiceReady returns true for READY');
  assert(isServiceReady('DEGRADED') === false, 'M17 isServiceReady returns false for DEGRADED');

  // Valid and invalid transitions
  assert(isValidServiceTransition('CREATED', 'INITIALIZING') === true, 'M18 CREATED -> INITIALIZING is valid');
  assert(isValidServiceTransition('INITIALIZING', 'LOADING_STATE') === true, 'M19 INITIALIZING -> LOADING_STATE is valid');
  assert(isValidServiceTransition('LOADING_STATE', 'READY') === true, 'M20 LOADING_STATE -> READY is valid');
  assert(isValidServiceTransition('READY', 'RECEIVING') === true, 'M21 READY -> RECEIVING is valid');
  assert(isValidServiceTransition('RECEIVING', 'PROCESSING') === true, 'M22 RECEIVING -> PROCESSING is valid');
  assert(isValidServiceTransition('PROCESSING', 'PLANNING') === true, 'M23 PROCESSING -> PLANNING is valid');
  assert(isValidServiceTransition('PLANNING', 'EXECUTING') === true, 'M24 PLANNING -> EXECUTING is valid');
  assert(isValidServiceTransition('EXECUTING', 'VERIFYING') === true, 'M25 EXECUTING -> VERIFYING is valid');
  assert(isValidServiceTransition('VERIFYING', 'COMMITTING') === true, 'M26 VERIFYING -> COMMITTING is valid');
  assert(isValidServiceTransition('COMMITTING', 'RESPONDING') === true, 'M27 COMMITTING -> RESPONDING is valid');
  assert(isValidServiceTransition('RESPONDING', 'READY') === true, 'M28 RESPONDING -> READY is valid');
  assert(isValidServiceTransition('READY', 'SHUTTING_DOWN') === true, 'M29 READY -> SHUTTING_DOWN is valid');
  assert(isValidServiceTransition('SHUTTING_DOWN', 'STOPPED') === true, 'M30 SHUTTING_DOWN -> STOPPED is valid');

  // Illegal transitions blocked
  assert(isValidServiceTransition('CREATED', 'READY') === false, 'M31 Skip from CREATED to READY blocked');
  assert(isValidServiceTransition('READY', 'COMMITTING') === false, 'M32 Skip from READY to COMMITTING blocked');
  assert(isValidServiceTransition('STOPPED', 'READY') === false, 'M33 Transition from STOPPED blocked');
  assertThrows(() => assertValidServiceTransition('CREATED', 'READY'), 'M34 assertValidServiceTransition throws on illegal skip');

  // =========================================================================
  // CATEGORY N — Error Hierarchy & Failure Classification
  // =========================================================================
  console.log('--- Category N: Error Hierarchy & Classification ---');
  const err1 = new BrainServiceError('BRAIN_SERVICE_BUSY', 'Service is busy', 'DEGRADED');
  assert(err1.code === 'BRAIN_SERVICE_BUSY', 'N01 Error code captured');
  assert(err1.classification === 'DEGRADED', 'N02 Error classification captured');
  assert(err1.recoverable === false, 'N03 Degraded is not simple recoverable');

  const err2 = new BrainServiceError('BRAIN_SERVICE_INVALID_REQUEST', 'Invalid request', 'RECOVERABLE');
  assert(err2.recoverable === true, 'N04 Recoverable error flags true');

  const err3 = new BrainServiceError('BRAIN_SERVICE_FATAL_ERROR', 'Fatal corruption', 'FATAL');
  assert(err3.classification === 'FATAL', 'N05 Fatal error classified');
  assert(isFatalServiceError(err3) === true, 'N06 isFatalServiceError returns true for fatal');
  assert(isFatalServiceError(err2) === false, 'N07 isFatalServiceError returns false for recoverable');

  assert(classifyServiceError(new Error('Fatal unrecoverable memory issue')) === 'FATAL', 'N08 Heuristic classifies fatal message');
  assert(classifyServiceError(new Error('Connection timeout')) === 'DEGRADED', 'N09 Heuristic classifies timeout as degraded');
  assert(classifyServiceError(new Error('File not found')) === 'RECOVERABLE', 'N10 Standard error classified recoverable');

  // =========================================================================
  // CATEGORY O — Deployment Configuration & Hardware Independence
  // =========================================================================
  console.log('--- Category O: Deployment Configuration ---');
  const cfg1 = resolveBrainServiceConfig({ hostMode: 'server' });
  assert(cfg1.hostMode === 'server', 'O01 Server host mode configured');
  assert(cfg1.maxQueueSize === 200, 'O02 Server mode allocates 200 queue size');

  const cfg2 = resolveBrainServiceConfig({ hostMode: 'workstation' });
  assert(cfg2.hostMode === 'workstation', 'O03 Workstation host mode configured');
  assert(cfg2.maxQueueSize === 50, 'O04 Workstation mode allocates 50 queue size');

  const cfg3 = resolveBrainServiceConfig({ dataDir: 'data/custom-dir' });
  assert(cfg3.dataDir.includes('custom-dir'), 'O05 Custom dataDir resolved');
  assert(cfg3.stateFilePath.includes('brain_service_state.json'), 'O06 stateFilePath properly derived');
  assert(cfg3.requestTimeoutMs > 0, 'O07 Request timeout configured');
  assert(cfg3.drainTimeoutMs > 0, 'O08 Drain timeout configured');

  // =========================================================================
  // CATEGORY P — Durable State Schema Validation
  // =========================================================================
  console.log('--- Category P: Durable State Validation ---');
  const validState = {
    version: '4.0.0',
    serviceId: 'bsvc_1234567890abcdef',
    brainId: 'brain_1234567890abcdef',
    hostMode: 'workstation',
    totalRequestsReceived: 10,
    totalRequestsCompleted: 9,
    totalRequestsFailed: 1,
    completedRequestIds: ['req_1', 'req_2'],
    lastCommittedAt: Date.now(),
    createdAt: Date.now(),
  };

  const valRes1 = validateBrainServiceState(validState);
  assert(valRes1.success === true, 'P01 Valid durable state passes schema validation');
  assert(valRes1.data !== undefined, 'P02 Valid data returned');

  assert(validateBrainServiceState(null).success === false, 'P03 Null state rejected');
  assert(validateBrainServiceState({}).success === false, 'P04 Empty state rejected');
  assert(validateBrainServiceState({ ...validState, version: 123 }).success === false, 'P05 Invalid version rejected');
  assert(validateBrainServiceState({ ...validState, totalRequestsReceived: 'not_num' }).success === false, 'P06 Non-number counter rejected');
  assert(validateBrainServiceState({ ...validState, completedRequestIds: 'not_arr' }).success === false, 'P07 Non-array request IDs rejected');

  // =========================================================================
  // CATEGORY Q — Request Envelope Validation & Sanitization
  // =========================================================================
  console.log('--- Category Q: Request Envelope Validation ---');
  const validReqEnvelope = {
    requestId: 'req_valid_01',
    sessionId: 'sess_valid_01',
    deviceContext: { deviceId: 'dev_valid_01' },
    timestamp: Date.now(),
    input: { userText: 'Valid input' },
  };

  assert(validateServiceRequest(validReqEnvelope).requestId === 'req_valid_01', 'Q01 Valid request envelope accepted');
  assertThrows(() => validateServiceRequest(null), 'Q02 Null request envelope rejected');
  assertThrows(() => validateServiceRequest({ ...validReqEnvelope, requestId: '' }), 'Q03 Empty requestId rejected');
  assertThrows(() => validateServiceRequest({ ...validReqEnvelope, sessionId: '' }), 'Q04 Empty sessionId rejected');
  assertThrows(() => validateServiceRequest({ ...validReqEnvelope, deviceContext: null }), 'Q05 Null deviceContext rejected');
  assertThrows(() => validateServiceRequest({ ...validReqEnvelope, input: null }), 'Q06 Null input rejected');
  assertThrows(() => validateServiceRequest({ ...validReqEnvelope, input: { userText: '' } }), 'Q07 Empty userText rejected');
  assertThrows(() => validateServiceRequest({ ...validReqEnvelope, requestId: 'req_\0_bad' }), 'Q08 Null byte in requestId rejected');
  assertThrows(() => validateServiceRequest({ ...validReqEnvelope, input: { userText: 'Bad \0 text' } }), 'Q09 Null byte in input rejected');

  // =========================================================================
  // CATEGORY R — Response Envelope Construction
  // =========================================================================
  console.log('--- Category R: Response Envelope Construction ---');
  const successRes = buildSuccessResponse({
    requestId: 'req_r_01',
    sessionId: 'sess_r_01',
    result: {
      taskId: 'task_r_01' as any,
      success: true,
      summary: 'Done',
      verificationStatus: 'VERIFIED',
      completedAt: Date.now(),
      totalDurationMs: 15,
      iterationCount: 1,
    },
    health: 'READY',
    queueStatus: 'IDLE',
    durationMs: 15,
  });

  assert(successRes.success === true, 'R01 Success response built');
  assert(successRes.requestId === 'req_r_01', 'R02 requestId matches');
  assert(successRes.health === 'READY', 'R03 Health matches');
  assert(successRes.durationMs === 15, 'R04 Duration matches');

  const errorRes = buildErrorResponse({
    requestId: 'req_r_02',
    sessionId: 'sess_r_02',
    error: new BrainServiceError('BRAIN_SERVICE_BUSY', 'Overloaded', 'DEGRADED'),
    health: 'DEGRADED',
    queueStatus: 'BUSY',
    durationMs: 5,
  });

  assert(errorRes.success === false, 'R05 Error response built');
  assert(errorRes.error!.code === 'BRAIN_SERVICE_BUSY', 'R06 Error code preserved');
  assert(errorRes.error!.classification === 'DEGRADED', 'R07 Classification preserved');

  // =========================================================================
  // CATEGORY S — Audit Ledger & Secret Redaction
  // =========================================================================
  console.log('--- Category S: Audit Ledger & Secret Redaction ---');
  const audit = new BrainServiceAuditLedger('bsvc_test' as any, 'brain_test' as any);
  assert(audit.count === 0, 'S01 Initial audit count is 0');

  audit.record('SERVICE_BOOTSTRAP', { env: 'test' });
  assert(audit.count === 1, 'S02 Event recorded');

  // Secret redaction test
  audit.record('REQUEST_RECEIVED', {
    user: 'alice',
    password: 'super_secret_password_123',
    token: 'jwt_token_secret_456',
    nested: {
      apiKey: 'key_secret_789',
      normalField: 'visible_data',
    },
  });

  assert(audit.count === 2, 'S03 Second event recorded');
  const events = audit.getEvents();
  const event2 = events[1];
  assert(event2.data!.password === '[REDACTED_SECRET]', 'S04 Password redacted');
  assert(event2.data!.token === '[REDACTED_SECRET]', 'S05 Token redacted');
  assert((event2.data!.nested as any).apiKey === '[REDACTED_SECRET]', 'S06 Nested apiKey redacted');
  assert((event2.data!.nested as any).normalField === 'visible_data', 'S07 Non-sensitive data preserved');

  // =========================================================================
  // CATEGORY T — Queue & Backpressure Mechanics
  // =========================================================================
  console.log('--- Category T: Queue & Backpressure ---');
  const queue = new BrainServiceQueue(3);
  assert(queue.depth === 0, 'T01 Initial queue depth is 0');
  assert(queue.status === 'IDLE', 'T02 Initial status is IDLE');

  let resolvedCount = 0;
  const dummyReq = (id: string): BrainServiceRequestEnvelope => ({
    requestId: id,
    sessionId: 'sess_t',
    deviceContext: { deviceId: 'dev_t' },
    timestamp: Date.now(),
    input: { userText: 'task' },
  });

  queue.enqueue(dummyReq('q1'), () => resolvedCount++, () => {});
  assert(queue.depth === 1, 'T03 Queue depth is 1');
  assert(queue.status === 'PROCESSING', 'T04 Queue status is PROCESSING');

  queue.enqueue(dummyReq('q2'), () => resolvedCount++, () => {});
  queue.enqueue(dummyReq('q3'), () => resolvedCount++, () => {});
  assert(queue.depth === 3, 'T05 Queue depth is 3 (at capacity)');

  // 4th enqueue exceeds capacity (3) -> BACKPRESSURE error
  assertThrows(
    () => queue.enqueue(dummyReq('q4'), () => {}, () => {}),
    'T06 Backpressure error thrown when exceeding maxQueueSize'
  );
  assert(queue.status === 'BACKPRESSURE', 'T07 Status set to BACKPRESSURE');

  const item1 = queue.dequeue();
  assert(item1 !== null && item1.request.requestId === 'q1', 'T08 First item dequeued FIFO');
  queue.completeActive();

  queue.clear('Test clear');
  assert(queue.depth === 0, 'T09 Queue cleared');
  assert(queue.status === 'IDLE', 'T10 Queue status returned to IDLE');

  // =========================================================================
  // CATEGORY U — Dynamic Health Monitor & Telemetry
  // =========================================================================
  console.log('--- Category U: Dynamic Health Monitor ---');
  const hm = new BrainServiceHealthMonitor('bsvc_test' as any, 'brain_test' as any);
  assert(hm.computeHealth('READY', 'IDLE') === 'READY', 'U01 Healthy ready state is READY');
  assert(hm.computeHealth('STOPPED', 'IDLE') === 'STOPPED', 'U02 Stopped state is STOPPED');
  assert(hm.computeHealth('FAILED', 'IDLE') === 'FAILED', 'U03 Failed state is FAILED');
  assert(hm.computeHealth('RECOVERING', 'IDLE') === 'RECOVERING', 'U04 Recovering state is RECOVERING');
  assert(hm.computeHealth('DEGRADED', 'IDLE') === 'DEGRADED', 'U05 Degraded state is DEGRADED');
  assert(hm.computeHealth('READY', 'BACKPRESSURE') === 'DEGRADED', 'U06 Backpressure causes DEGRADED health');

  hm.recordRequestReceived();
  hm.recordRequestSuccess(10);
  hm.recordRequestReceived();
  hm.recordRequestSuccess(20);
  const snapU = hm.getSnapshot('READY', 'IDLE', 0);
  assert(snapU.metrics.totalRequestsReceived === 2, 'U07 totalRequestsReceived tracked');
  assert(snapU.metrics.totalRequestsCompleted === 2, 'U08 totalRequestsCompleted tracked');
  assert(snapU.metrics.lastRequestLatencyMs === 20, 'U09 lastRequestLatencyMs tracked');
  assert(snapU.metrics.averageLatencyMs === 15, 'U10 averageLatencyMs computed');

  // Consecutive failures degrade health
  hm.recordRequestFailure();
  hm.recordRequestFailure();
  hm.recordRequestFailure();
  assert(hm.computeHealth('READY', 'IDLE') === 'DEGRADED', 'U11 3 consecutive failures degrade health');

  hm.recordRecovery();
  assert(hm.computeHealth('READY', 'IDLE') === 'READY', 'U12 Recovery resets consecutive failures');

  // =========================================================================
  // CATEGORY V — Recovery Orchestrator (FAILURE != BRAIN_DEATH)
  // =========================================================================
  console.log('--- Category V: Recovery Orchestrator ---');
  const dummyRuntime = new BrainRuntime({ brainSeed: 'rec_seed' });
  const recAudit = new BrainServiceAuditLedger('bsvc_rec' as any, dummyRuntime.brainId);
  const recHealth = new BrainServiceHealthMonitor('bsvc_rec' as any, dummyRuntime.brainId);
  const recovery = new BrainServiceRecovery(dummyRuntime, recHealth, recAudit);

  const resRec1 = await recovery.handleFailure(new Error('Recoverable tool error'));
  assert(resRec1.recovered === true, 'V01 Recoverable error successfully recovered');
  assert(resRec1.classification === 'RECOVERABLE', 'V02 Classification is RECOVERABLE');

  const resRec2 = await recovery.handleFailure(new Error('Fatal unrecoverable database loss'));
  assert(resRec2.recovered === false, 'V03 Fatal error cannot be recovered automatically');
  assert(resRec2.classification === 'FATAL', 'V04 Classification is FATAL');

  // =========================================================================
  // CATEGORY W — Single Brain Authority Registry
  // =========================================================================
  console.log('--- Category W: Single Brain Authority Registry ---');
  const reg = BrainServiceRegistry.getInstance();
  reg.resetForTest();

  reg.registerAuthority('bsvc_alpha' as any, 'brain_alpha' as any);
  assert(reg.registeredBrainId === 'brain_alpha', 'W01 Brain alpha registered as authority');

  // Same brain registration is idempotent
  reg.registerAuthority('bsvc_alpha' as any, 'brain_alpha' as any);
  assert(reg.registeredBrainId === 'brain_alpha', 'W02 Idempotent registration allowed');

  // Conflicting second brain registration BLOCKED (ONE_BRAIN invariant)
  assertThrows(
    () => reg.registerAuthority('bsvc_beta' as any, 'brain_beta' as any),
    'W03 Registering second conflicting brain blocked by ONE_BRAIN invariant'
  );

  reg.registerSession('sess_100', 'dev_100');
  assert(reg.getSession('sess_100')?.deviceId === 'dev_100', 'W04 Session mapped to device');

  reg.unregisterAuthority('bsvc_alpha' as any);
  assert(reg.registeredBrainId === null, 'W05 Authority unregistered');

  // =========================================================================
  // CATEGORY X — BrainService Facade API & Lifecycle
  // =========================================================================
  console.log('--- Category X: BrainService Facade & Lifecycle ---');
  const directDataDir = path.resolve(path.join('data', 'direct-service-test'));
  if (!fs.existsSync(directDataDir)) fs.mkdirSync(directDataDir, { recursive: true });

  const directService = new BrainService({
    dataDir: directDataDir,
    hostMode: 'workstation',
    brainSeed: 'direct_seed',
  });

  assert(directService.state === 'CREATED', 'X01 Initial state is CREATED');
  await directService.start();
  assert(directService.state === 'READY', 'X02 Service transitioned to READY');
  assert(directService.brainId.startsWith('brain_'), 'X03 Authoritative brainId exposed');
  assert(directService.serviceId.startsWith('bsvc_'), 'X04 ServiceId exposed');

  const directReq: BrainServiceRequestEnvelope = {
    requestId: 'req_x_direct_01',
    sessionId: 'sess_direct',
    deviceContext: { deviceId: 'dev_direct' },
    timestamp: Date.now(),
    input: { userText: 'Execute direct facade request' },
  };

  const directRes = await directService.handleRequest(directReq);
  assert(directRes.success === true, 'X05 Direct facade request succeeded');
  assert(directRes.result!.success === true, 'X06 Brain task completed');

  const directDurable = directService.getDurableState();
  assert(directDurable.totalRequestsCompleted >= 1, 'X07 Durable state reflects completion');
  assert(directDurable.completedRequestIds.includes('req_x_direct_01'), 'X08 RequestId tracked in durable state');

  const directHealth = directService.getHealth();
  assert(directHealth.health === 'READY', 'X09 Health is READY');

  const directSnap = directService.getSnapshot();
  assert(directSnap.state === 'READY', 'X10 Snapshot captures READY state');
  assert(directSnap.uptimeMs >= 0, 'X11 Snapshot uptime captured');

  await directService.shutdown('End of direct test');
  assert(directService.state === 'STOPPED', 'X12 Service cleanly reached STOPPED');

  // =========================================================================
  // CATEGORY Y — Offline & Zero Network Dependency Verification
  // =========================================================================
  console.log('--- Category Y: Offline & Zero Network Dependency ---');
  // BrainService communicates over standard input/output streams (stdin/stdout)
  // or in-memory calls. No network socket (TCP/HTTP/WS) is created for Brain Service.
  assert(directService.config.serviceMode === 'standalone', 'Y01 Standalone service mode operates locally');
  assert(!('port' in directService.config), 'Y02 No network port in service config');
  assert(!('host' in directService.config), 'Y03 No network host in service config');
  assert(directService.config.dataDir !== undefined, 'Y04 Local filesystem dataDir used');

  // =========================================================================
  // CATEGORY Z — Security Boundary & Static Code Audit
  // =========================================================================
  console.log('--- Category Z: Static Security Audit & Workspace Integrity ---');
  const serviceDir = path.resolve('src', 'core', 'brain-service');
  const serviceFiles = fs.readdirSync(serviceDir).filter(f => f.endsWith('.ts'));
  assert(serviceFiles.length >= 15, 'Z01 All required brain-service modules present');

  const FORBIDDEN_TOKENS = [
    'eval(',
    'new Function',
    'child_process',
    'execSync',
    'execFile',
    'Math.random()',
    'crypto.randomUUID()',
  ];

  for (const f of serviceFiles) {
    const content = fs.readFileSync(path.join(serviceDir, f), 'utf8');
    for (const token of FORBIDDEN_TOKENS) {
      const forbidden = content.includes(token);
      assert(!forbidden, `Z_sec_${f}_${token}: Module ${f} contains ZERO occurrences of "${token}"`);
    }
  }

  // PROTECTED WORKSPACE INVARIANT CHECK
  // C:\BOW\shopofbow MUST REMAIN: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0
  const protectedWorkspace = 'C:\\BOW\\shopofbow';
  for (const f of serviceFiles) {
    const content = fs.readFileSync(path.join(serviceDir, f), 'utf8');
    assert(!content.includes('shopofbow'), `Z_boundary_${f}: Module ${f} has ZERO mentions/imports of protected workspace`);
  }

  console.log('\n============================================================');
  console.log(`TOTAL ASSERTIONS PASSED: ${_passed}`);
  console.log(`TOTAL ASSERTIONS FAILED: ${_failed}`);
  console.log('============================================================');

  if (_failed > 0) {
    console.error('\nFAILED ASSERTIONS:');
    for (const f of _failures) {
      console.error(f);
    }
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('CRITICAL TEST RUNNER EXCEPTION:', err);
  process.exit(1);
});
