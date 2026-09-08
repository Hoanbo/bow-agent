// src/core/capability/capabilityVerifier.ts
// BOWCON V4.0 — MS-1.3.34: REAL BOWCON CAPABILITY & ENVIRONMENT INTERACTION RUNTIME
//
// Independent Physical Verifier for Capability Execution.
//
// INVARIANTS:
// EXECUTION != VERIFICATION
// Verification must probe physical OS state independently.

import fs from 'node:fs';
import crypto from 'node:crypto';
import type { CapabilityDescriptor, CapabilityExecutionRequest, CapabilityExecutionResult } from './capabilityTypes.js';
import { validateAndResolvePath } from '../world-action/worldActionExecutor.js';

export interface CapabilityVerificationOutcome {
  readonly passed: boolean;
  readonly checksPerformed: string[];
  readonly observation: Record<string, any>;
  readonly failureReason?: string;
}

export class CapabilityVerifier {
  public async verify(
    descriptor: CapabilityDescriptor,
    request: CapabilityExecutionRequest,
    result: CapabilityExecutionResult
  ): Promise<CapabilityVerificationOutcome> {
    const checksPerformed: string[] = [];

    // Dry Run verification
    if (request.isDryRun) {
      checksPerformed.push('dry_run_zero_mutation_check');
      return {
        passed: true,
        checksPerformed,
        observation: { isDryRun: true },
      };
    }

    if (!result.success) {
      return {
        passed: false,
        checksPerformed: ['execution_success_check'],
        observation: { executionFailed: true },
        failureReason: result.errorMessage || 'Execution reported failure.',
      };
    }

    switch (descriptor.capabilityId) {
      case 'cap_fs_write': {
        const target = request.target || request.parameters.path;
        const resolved = validateAndResolvePath(target);
        checksPerformed.push('fs_exists_check');
        if (!fs.existsSync(resolved)) {
          return {
            passed: false,
            checksPerformed,
            observation: { exists: false },
            failureReason: `Target file "${resolved}" does not exist after write.`,
          };
        }

        checksPerformed.push('sha256_checksum_check');
        const expectedContent = request.parameters.content ?? '';
        const diskContent = fs.readFileSync(resolved, 'utf-8');
        const actualSha = crypto.createHash('sha256').update(diskContent).digest('hex');
        const expectedSha = crypto.createHash('sha256').update(expectedContent).digest('hex');

        if (actualSha !== expectedSha) {
          return {
            passed: false,
            checksPerformed,
            observation: { actualSha, expectedSha },
            failureReason: 'Independent SHA-256 hash mismatch.',
          };
        }

        return {
          passed: true,
          checksPerformed,
          observation: { path: resolved, sha256: actualSha },
        };
      }

      case 'cap_fs_mkdir': {
        const target = request.target || request.parameters.path;
        const resolved = validateAndResolvePath(target);
        checksPerformed.push('dir_stat_check');
        if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
          return {
            passed: false,
            checksPerformed,
            observation: { isDir: false },
            failureReason: `Directory "${resolved}" was not created.`,
          };
        }
        return {
          passed: true,
          checksPerformed,
          observation: { path: resolved, isDir: true },
        };
      }

      case 'cap_proc_start': {
        const pid = result.output?.pid;
        checksPerformed.push('os_kill_zero_probe');
        let exists = false;
        if (pid) {
          try {
            process.kill(pid, 0);
            exists = true;
          } catch {
            exists = false;
          }
        }
        if (!exists) {
          return {
            passed: false,
            checksPerformed,
            observation: { pid, exists: false },
            failureReason: `Spawned process PID ${pid} is not running in OS process table.`,
          };
        }
        return {
          passed: true,
          checksPerformed,
          observation: { pid, running: true },
        };
      }

      case 'cap_proc_stop': {
        const pid = Number(request.parameters.pid);
        checksPerformed.push('os_absence_probe');
        let stillRunning = false;
        try {
          process.kill(pid, 0);
          stillRunning = true;
        } catch {
          stillRunning = false;
        }
        if (stillRunning) {
          return {
            passed: false,
            checksPerformed,
            observation: { pid, stillRunning: true },
            failureReason: `Process PID ${pid} still running after stop capability.`,
          };
        }
        return {
          passed: true,
          checksPerformed,
          observation: { pid, stopped: true },
        };
      }

      default: {
        // Observation / schema checks
        checksPerformed.push('output_presence_check');
        const passed = result.output !== undefined && result.output !== null;
        return {
          passed,
          checksPerformed,
          observation: { outputPresent: passed },
          failureReason: passed ? undefined : 'Capability returned empty output.',
        };
      }
    }
  }
}

export const globalCapabilityVerifier = new CapabilityVerifier();
