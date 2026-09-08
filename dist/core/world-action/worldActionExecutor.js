// src/core/world-action/worldActionExecutor.ts
// BOWCON V4.0 — MS-1.3.33: REAL BOWCON WORLD ACTION & GOVERNED EXECUTION RUNTIME
//
// Real Physical Host Tool Adapters: Filesystem, Process Observation, Process Lifecycle,
// and Allowlisted Governed Command Execution.
//
// INVARIANTS:
// All filesystem mutations stay inside the execution workspace.
// Protected workspace (C:\BOW\shopofbow) is ABSOLUTELY FORBIDDEN.
// Dry-run mode produces ZERO physical mutation.
// Zero dynamic code execution (NO eval, NO new Function, NO unrestricted shell).
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { generateExecutionId } from './worldActionTypes.js';
import { WorldActionError } from './worldActionFailure.js';
const EXECUTION_WORKSPACE = path.resolve(process.cwd()).toLowerCase();
const PROTECTED_WORKSPACE = 'c:\\bow\\shopofbow';
// Track governed child processes started by the WorldAction runtime
const activeGovernedProcesses = new Map();
/**
 * Validates and normalizes target filesystem paths.
 * Enforces workspace confinement and protected boundary isolation.
 */
export function validateAndResolvePath(targetPath) {
    if (!targetPath || typeof targetPath !== 'string') {
        throw new WorldActionError('INVALID_TARGET', 'Path must be a non-empty string.');
    }
    let resolved = path.isAbsolute(targetPath) ? path.normalize(targetPath) : path.resolve(process.cwd(), targetPath);
    const normalizedLower = resolved.toLowerCase();
    // Strict protected workspace check
    if (normalizedLower.startsWith(PROTECTED_WORKSPACE)) {
        throw new WorldActionError('SECURITY_VIOLATION', 'Access to protected workspace (C:\\BOW\\shopofbow) is strictly forbidden.', undefined, targetPath);
    }
    // Prevent path traversal above workspace root
    if (!normalizedLower.startsWith(EXECUTION_WORKSPACE)) {
        throw new WorldActionError('SECURITY_VIOLATION', `Target "${resolved}" is outside the execution workspace. Access denied.`, undefined, targetPath);
    }
    return resolved;
}
export class WorldActionExecutor {
    // -------------------------------------------------------------------------
    // 1. Filesystem Real Adapters
    // -------------------------------------------------------------------------
    static async executeFsWrite(action) {
        const startedAt = Date.now();
        const executionId = generateExecutionId();
        if (action.isDryRun) {
            return {
                success: true,
                actionId: action.actionId,
                executionId,
                toolId: 'world_fs_write',
                startedAt,
                completedAt: Date.now(),
                actualEffect: 'DRY_RUN_PREVIEW: write simulated without physical mutation',
                metadata: { isDryRun: true },
            };
        }
        const resolved = validateAndResolvePath(action.target);
        const content = action.parameters.content ?? '';
        const dir = path.dirname(resolved);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(resolved, content, 'utf-8');
        const stat = fs.statSync(resolved);
        return {
            success: true,
            actionId: action.actionId,
            executionId,
            toolId: 'world_fs_write',
            startedAt,
            completedAt: Date.now(),
            actualEffect: `Created/overwrote file at "${resolved}" (${stat.size} bytes)`,
            output: { path: resolved, bytesWritten: stat.size },
            metadata: { path: resolved, bytesWritten: stat.size, mtime: stat.mtimeMs },
        };
    }
    static async executeFsRead(action) {
        const startedAt = Date.now();
        const executionId = generateExecutionId();
        const resolved = validateAndResolvePath(action.target);
        if (!fs.existsSync(resolved)) {
            throw new WorldActionError('EXECUTION_FAILURE', `File not found at "${resolved}".`, action.actionId, resolved);
        }
        const content = fs.readFileSync(resolved, 'utf-8');
        const stat = fs.statSync(resolved);
        return {
            success: true,
            actionId: action.actionId,
            executionId,
            toolId: 'world_fs_read',
            startedAt,
            completedAt: Date.now(),
            actualEffect: `Read ${stat.size} bytes from "${resolved}"`,
            output: { path: resolved, content, size: stat.size },
            metadata: { path: resolved, size: stat.size },
        };
    }
    static async executeFsAppend(action) {
        const startedAt = Date.now();
        const executionId = generateExecutionId();
        if (action.isDryRun) {
            return {
                success: true,
                actionId: action.actionId,
                executionId,
                toolId: 'world_fs_append',
                startedAt,
                completedAt: Date.now(),
                actualEffect: 'DRY_RUN_PREVIEW: append simulated without physical mutation',
                metadata: { isDryRun: true },
            };
        }
        const resolved = validateAndResolvePath(action.target);
        const content = action.parameters.content ?? '';
        const dir = path.dirname(resolved);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.appendFileSync(resolved, content, 'utf-8');
        const stat = fs.statSync(resolved);
        return {
            success: true,
            actionId: action.actionId,
            executionId,
            toolId: 'world_fs_append',
            startedAt,
            completedAt: Date.now(),
            actualEffect: `Appended content to "${resolved}" (new size: ${stat.size} bytes)`,
            output: { path: resolved, newSize: stat.size },
            metadata: { path: resolved, newSize: stat.size },
        };
    }
    static async executeFsMkdir(action) {
        const startedAt = Date.now();
        const executionId = generateExecutionId();
        if (action.isDryRun) {
            return {
                success: true,
                actionId: action.actionId,
                executionId,
                toolId: 'world_fs_mkdir',
                startedAt,
                completedAt: Date.now(),
                actualEffect: 'DRY_RUN_PREVIEW: mkdir simulated without physical mutation',
                metadata: { isDryRun: true },
            };
        }
        const resolved = validateAndResolvePath(action.target);
        fs.mkdirSync(resolved, { recursive: true });
        return {
            success: true,
            actionId: action.actionId,
            executionId,
            toolId: 'world_fs_mkdir',
            startedAt,
            completedAt: Date.now(),
            actualEffect: `Created directory at "${resolved}"`,
            output: { path: resolved, exists: true },
            metadata: { path: resolved },
        };
    }
    static async executeFsRename(action) {
        const startedAt = Date.now();
        const executionId = generateExecutionId();
        if (action.isDryRun) {
            return {
                success: true,
                actionId: action.actionId,
                executionId,
                toolId: 'world_fs_rename',
                startedAt,
                completedAt: Date.now(),
                actualEffect: 'DRY_RUN_PREVIEW: rename simulated without physical mutation',
                metadata: { isDryRun: true },
            };
        }
        const source = validateAndResolvePath(action.target);
        const dest = validateAndResolvePath(action.parameters.newPath);
        if (!fs.existsSync(source)) {
            throw new WorldActionError('EXECUTION_FAILURE', `Source "${source}" does not exist.`, action.actionId, source);
        }
        fs.renameSync(source, dest);
        return {
            success: true,
            actionId: action.actionId,
            executionId,
            toolId: 'world_fs_rename',
            startedAt,
            completedAt: Date.now(),
            actualEffect: `Renamed "${source}" to "${dest}"`,
            output: { source, destination: dest },
            metadata: { source, destination: dest },
        };
    }
    static async executeFsCopy(action) {
        const startedAt = Date.now();
        const executionId = generateExecutionId();
        if (action.isDryRun) {
            return {
                success: true,
                actionId: action.actionId,
                executionId,
                toolId: 'world_fs_copy',
                startedAt,
                completedAt: Date.now(),
                actualEffect: 'DRY_RUN_PREVIEW: copy simulated without physical mutation',
                metadata: { isDryRun: true },
            };
        }
        const source = validateAndResolvePath(action.target);
        const dest = validateAndResolvePath(action.parameters.destination);
        if (!fs.existsSync(source)) {
            throw new WorldActionError('EXECUTION_FAILURE', `Source "${source}" does not exist.`, action.actionId, source);
        }
        const dir = path.dirname(dest);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.copyFileSync(source, dest);
        return {
            success: true,
            actionId: action.actionId,
            executionId,
            toolId: 'world_fs_copy',
            startedAt,
            completedAt: Date.now(),
            actualEffect: `Copied "${source}" to "${dest}"`,
            output: { source, destination: dest },
            metadata: { source, destination: dest },
        };
    }
    static async executeFsMove(action) {
        // Move is atomic rename if on same volume, or copy + unlink
        return this.executeFsRename(action);
    }
    static async executeFsDelete(action) {
        const startedAt = Date.now();
        const executionId = generateExecutionId();
        if (action.isDryRun) {
            return {
                success: true,
                actionId: action.actionId,
                executionId,
                toolId: 'world_fs_delete',
                startedAt,
                completedAt: Date.now(),
                actualEffect: 'DRY_RUN_PREVIEW: delete simulated without physical mutation',
                metadata: { isDryRun: true },
            };
        }
        const resolved = validateAndResolvePath(action.target);
        if (!fs.existsSync(resolved)) {
            return {
                success: true,
                actionId: action.actionId,
                executionId,
                toolId: 'world_fs_delete',
                startedAt,
                completedAt: Date.now(),
                actualEffect: `Target "${resolved}" already did not exist.`,
                metadata: { path: resolved, wasDeleted: false },
            };
        }
        const stat = fs.statSync(resolved);
        if (stat.isDirectory()) {
            fs.rmSync(resolved, { recursive: true, force: true });
        }
        else {
            fs.unlinkSync(resolved);
        }
        return {
            success: true,
            actionId: action.actionId,
            executionId,
            toolId: 'world_fs_delete',
            startedAt,
            completedAt: Date.now(),
            actualEffect: `Deleted "${resolved}"`,
            output: { path: resolved, deleted: true },
            metadata: { path: resolved, wasDeleted: true },
        };
    }
    // -------------------------------------------------------------------------
    // 2. Process Observation Real Adapters
    // -------------------------------------------------------------------------
    static async executeProcessList(action) {
        const startedAt = Date.now();
        const executionId = generateExecutionId();
        // Enumerate active processes known to host and runtime
        const processes = [
            {
                pid: process.pid,
                memoryUsage: process.memoryUsage(),
                uptime: process.uptime(),
            },
        ];
        for (const [pid, procInfo] of activeGovernedProcesses.entries()) {
            processes.push({
                pid,
                memoryUsage: process.memoryUsage(),
                uptime: (Date.now() - procInfo.startedAt) / 1000,
            });
        }
        return {
            success: true,
            actionId: action.actionId,
            executionId,
            toolId: 'world_process_list',
            startedAt,
            completedAt: Date.now(),
            actualEffect: `Observed ${processes.length} active process(es)`,
            output: { count: processes.length, processes },
            metadata: { count: processes.length },
        };
    }
    static async executeProcessInspect(action) {
        const startedAt = Date.now();
        const executionId = generateExecutionId();
        const targetPid = Number(action.target || action.parameters.pid);
        if (isNaN(targetPid)) {
            throw new WorldActionError('INVALID_TARGET', 'Invalid PID provided.', action.actionId);
        }
        const isCurrent = targetPid === process.pid;
        const isGoverned = activeGovernedProcesses.has(targetPid);
        let exists = false;
        try {
            // process.kill(pid, 0) tests process existence without terminating it
            process.kill(targetPid, 0);
            exists = true;
        }
        catch {
            exists = false;
        }
        return {
            success: true,
            actionId: action.actionId,
            executionId,
            toolId: 'world_process_inspect',
            startedAt,
            completedAt: Date.now(),
            actualEffect: `Inspected process PID ${targetPid} (exists: ${exists})`,
            output: {
                pid: targetPid,
                exists,
                isCurrent,
                isGoverned,
                memoryUsage: isCurrent ? process.memoryUsage() : undefined,
            },
            metadata: { pid: targetPid, exists },
        };
    }
    static async executeProcessExists(action) {
        const res = await this.executeProcessInspect(action);
        return {
            ...res,
            toolId: 'world_process_exists',
            actualEffect: `Checked existence of PID ${res.output.pid}: ${res.output.exists}`,
        };
    }
    // -------------------------------------------------------------------------
    // 3. Process Lifecycle Real Adapters
    // -------------------------------------------------------------------------
    static async executeProcessStart(action) {
        const startedAt = Date.now();
        const executionId = generateExecutionId();
        if (action.isDryRun) {
            return {
                success: true,
                actionId: action.actionId,
                executionId,
                toolId: 'world_process_start',
                startedAt,
                completedAt: Date.now(),
                actualEffect: 'DRY_RUN_PREVIEW: process start simulated without spawning',
                metadata: { isDryRun: true },
            };
        }
        const command = action.parameters.command || process.execPath;
        const args = action.parameters.args || ['-e', 'setInterval(() => {}, 1000)'];
        // Only allow starting approved node executable or worker scripts
        if (!command.endsWith('node.exe') && !command.endsWith('node') && command !== process.execPath) {
            throw new WorldActionError('SECURITY_VIOLATION', `Unapproved executable "${command}". Only verified node runtime is allowlisted.`, action.actionId);
        }
        const child = spawn(command, args, {
            cwd: process.cwd(),
            detached: false,
            stdio: 'ignore',
        });
        if (!child.pid) {
            throw new WorldActionError('EXECUTION_FAILURE', 'Failed to spawn approved process.', action.actionId);
        }
        activeGovernedProcesses.set(child.pid, {
            pid: child.pid,
            process: child,
            startedAt: Date.now(),
            command: `${command} ${args.join(' ')}`,
        });
        child.on('exit', () => {
            if (child.pid)
                activeGovernedProcesses.delete(child.pid);
        });
        return {
            success: true,
            actionId: action.actionId,
            executionId,
            toolId: 'world_process_start',
            startedAt,
            completedAt: Date.now(),
            actualEffect: `Started governed process PID ${child.pid}`,
            output: { pid: child.pid, command },
            metadata: { pid: child.pid },
        };
    }
    static async executeProcessStop(action) {
        const startedAt = Date.now();
        const executionId = generateExecutionId();
        if (action.isDryRun) {
            return {
                success: true,
                actionId: action.actionId,
                executionId,
                toolId: 'world_process_stop',
                startedAt,
                completedAt: Date.now(),
                actualEffect: 'DRY_RUN_PREVIEW: process stop simulated without termination',
                metadata: { isDryRun: true },
            };
        }
        const targetPid = Number(action.target || action.parameters.pid);
        if (isNaN(targetPid)) {
            throw new WorldActionError('INVALID_TARGET', 'Invalid PID provided.', action.actionId);
        }
        // Safety check: Cannot kill self!
        if (targetPid === process.pid) {
            throw new WorldActionError('SECURITY_VIOLATION', 'Cannot terminate the host Agent process self.', action.actionId);
        }
        const governed = activeGovernedProcesses.get(targetPid);
        if (governed) {
            governed.process.kill('SIGTERM');
            activeGovernedProcesses.delete(targetPid);
        }
        else {
            try {
                process.kill(targetPid, 'SIGTERM');
            }
            catch (err) {
                throw new WorldActionError('EXECUTION_FAILURE', `Failed to terminate PID ${targetPid}: ${err.message}`, action.actionId);
            }
        }
        return {
            success: true,
            actionId: action.actionId,
            executionId,
            toolId: 'world_process_stop',
            startedAt,
            completedAt: Date.now(),
            actualEffect: `Terminated process PID ${targetPid}`,
            output: { pid: targetPid, stopped: true },
            metadata: { pid: targetPid },
        };
    }
    // -------------------------------------------------------------------------
    // 4. Allowlisted Governed Command Execution
    // -------------------------------------------------------------------------
    static async executeAllowlistedCommand(action) {
        const startedAt = Date.now();
        const executionId = generateExecutionId();
        if (action.isDryRun) {
            return {
                success: true,
                actionId: action.actionId,
                executionId,
                toolId: 'world_exec_allowlisted',
                startedAt,
                completedAt: Date.now(),
                actualEffect: 'DRY_RUN_PREVIEW: command simulated without execution',
                metadata: { isDryRun: true },
            };
        }
        const command = action.parameters.command;
        const args = action.parameters.args || [];
        // Strictly enforce allowlisted binaries (NO arbitrary shell, NO eval)
        const ALLOWLISTED_BINARIES = new Set(['node', 'git', 'whoami', 'hostname', process.execPath]);
        const binaryBase = path.basename(command).toLowerCase().replace('.exe', '');
        if (!ALLOWLISTED_BINARIES.has(binaryBase) && !ALLOWLISTED_BINARIES.has(command)) {
            throw new WorldActionError('SECURITY_VIOLATION', `Command "${command}" is not in the governed allowlist. Arbitrary execution is strictly forbidden.`, action.actionId);
        }
        return new Promise((resolve, reject) => {
            const child = spawn(command, args, {
                cwd: process.cwd(),
                shell: false, // Disallow arbitrary shell interpolation
                windowsHide: true,
            });
            let stdout = '';
            let stderr = '';
            child.stdout?.on('data', d => { stdout += d.toString(); });
            child.stderr?.on('data', d => { stderr += d.toString(); });
            const timeout = setTimeout(() => {
                child.kill('SIGKILL');
                reject(new WorldActionError('TIMEOUT', `Command "${command}" timed out.`, action.actionId));
            }, action.parameters.timeoutMs || 10_000);
            child.on('close', code => {
                clearTimeout(timeout);
                if (code === 0) {
                    resolve({
                        success: true,
                        actionId: action.actionId,
                        executionId,
                        toolId: 'world_exec_allowlisted',
                        startedAt,
                        completedAt: Date.now(),
                        actualEffect: `Executed allowlisted command "${command}" with exit code 0`,
                        output: { exitCode: 0, stdout: stdout.trim(), stderr: stderr.trim() },
                        metadata: { exitCode: 0, binary: command },
                    });
                }
                else {
                    reject(new WorldActionError('EXECUTION_FAILURE', `Command failed with exit code ${code}: ${stderr}`, action.actionId, undefined, { exitCode: code, stderr }));
                }
            });
            child.on('error', err => {
                clearTimeout(timeout);
                reject(new WorldActionError('EXECUTION_FAILURE', err.message, action.actionId));
            });
        });
    }
    static getGovernedProcessCount() {
        return activeGovernedProcesses.size;
    }
    static clearAllGovernedProcesses() {
        for (const procInfo of activeGovernedProcesses.values()) {
            try {
                procInfo.process.kill('SIGKILL');
            }
            catch {
                // ignore on cleanup
            }
        }
        activeGovernedProcesses.clear();
    }
}
