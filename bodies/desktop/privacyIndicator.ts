// bodies/desktop/privacyIndicator.ts
// BOWCON V4.0 — VISUAL PRIVACY SYSTEM TRAY INDICATOR MANAGER
//
// EN:
// Manages a visible indicator in the Windows System Tray (Taskbar Notification Area)
// independent of any hidden console window. Turns RED during recording, GRAY when idle.
//
// VI:
// Quản lý biểu tượng trạng thái hiển thị trên Khay hệ thống Windows (System Tray)
// hoạt động độc lập với cửa sổ console ẩn. Đổi màu ĐỎ khi đang thu âm, XÁM khi rảnh.

import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

export class VisualPrivacyIndicator {
  private child?: ChildProcess;
  private isRecording = false;
  private scriptPath: string;
  private _isReady = false;
  private isStopping = false;
  private lastError?: string;

  constructor(scriptPath?: string) {
    this.scriptPath = scriptPath || path.resolve(process.cwd(), 'scripts', 'privacy_tray_indicator.ps1');
  }

  public setScriptPath(scriptPath: string): void {
    this.scriptPath = scriptPath;
  }

  public getScriptPath(): string {
    return this.scriptPath;
  }

  public getChildProcess(): ChildProcess | undefined {
    return this.child;
  }

  public isReady(): boolean {
    return this._isReady && !!this.child && !this.child.killed && this.child.exitCode === null;
  }

  public getLastError(): string | undefined {
    return this.lastError;
  }

  public async start(overrideScriptPath?: string): Promise<{ started: boolean; error?: string }> {
    if (this.isReady()) {
      return { started: true };
    }

    this.isStopping = false;

    if (process.platform !== 'win32') {
      const err = `UNSUPPORTED_PLATFORM: VisualPrivacyIndicator requires Windows OS (current: ${process.platform})`;
      console.error(`[PRIVACY-INDICATOR] ❌ CRITICAL: ${err}`);
      this._isReady = false;
      this.lastError = err;
      return { started: false, error: err };
    }

    const targetScript = overrideScriptPath || this.scriptPath;
    if (!fs.existsSync(targetScript)) {
      const err = `INDICATOR_SCRIPT_NOT_FOUND: Privacy tray indicator script not found at "${targetScript}"`;
      console.error(`[PRIVACY-INDICATOR] ❌ CRITICAL: ${err}`);
      this._isReady = false;
      this.lastError = err;
      return { started: false, error: err };
    }

    return new Promise<{ started: boolean; error?: string }>((resolve) => {
      let settled = false;
      try {
        const child = spawn('powershell', [
          '-NoProfile',
          '-ExecutionPolicy',
          'Bypass',
          '-File',
          targetScript,
        ], {
          stdio: ['pipe', 'ignore', 'pipe'],
          windowsHide: true,
        });
        this.child = child;

        let stderrOutput = '';
        if (child.stderr) {
          child.stderr.on('data', (d) => {
            stderrOutput += d.toString();
          });
        }

        child.on('error', (err) => {
          const errMsg = `PROCESS_SPAWN_ERROR: ${err.message}`;
          console.error(`[PRIVACY-INDICATOR] ❌ CRITICAL: Failed to spawn privacy indicator process:`, err);
          this._isReady = false;
          this.lastError = errMsg;
          this.child = undefined;
          if (!settled) {
            settled = true;
            resolve({ started: false, error: errMsg });
          }
        });

        child.on('exit', (code, signal) => {
          const wasStopping = this.isStopping;
          this._isReady = false;
          this.child = undefined;
          const exitMsg = `Indicator process exited with code ${code}, signal ${signal}. ${stderrOutput ? 'stderr: ' + stderrOutput.trim() : ''}`;
          if (!wasStopping) {
            console.error(`[PRIVACY-INDICATOR] ❌ CRITICAL: Privacy tray indicator process exited unexpectedly! (${exitMsg})`);
            this.lastError = exitMsg;
          }
          if (!settled) {
            settled = true;
            resolve({ started: false, error: `PROCESS_EARLY_EXIT: ${exitMsg}` });
          }
        });

        // Health check: xác nhận tiến trình PowerShell thực sự đang chạy (PID hợp lệ, chưa exit ngay lập tức)
        const healthCheckTimeoutMs = 350;
        setTimeout(() => {
          if (settled) return;
          if (child.pid && !child.killed && child.exitCode === null) {
            this._isReady = true;
            this.lastError = undefined;
            settled = true;
            resolve({ started: true });
          } else {
            settled = true;
            this._isReady = false;
            const errMsg = `HEALTH_CHECK_FAILED: Indicator process has no valid PID or exited prematurely.`;
            console.error(`[PRIVACY-INDICATOR] ❌ CRITICAL: ${errMsg}`);
            this.lastError = errMsg;
            resolve({ started: false, error: errMsg });
          }
        }, healthCheckTimeoutMs);
      } catch (err: any) {
        this._isReady = false;
        this.child = undefined;
        const errMsg = `SPAWN_EXCEPTION: ${err?.message || String(err)}`;
        console.error(`[PRIVACY-INDICATOR] ❌ CRITICAL: Exception during indicator start:`, err);
        this.lastError = errMsg;
        if (!settled) {
          settled = true;
          resolve({ started: false, error: errMsg });
        }
      }
    });
  }

  public setRecording(recording: boolean): void {
    this.isRecording = recording;
    if (this.child && this.child.stdin && !this.child.stdin.destroyed) {
      try {
        this.child.stdin.write(recording ? 'RECORDING\n' : 'IDLE\n');
      } catch (err: any) {
        console.error(`[PRIVACY-INDICATOR] ❌ CRITICAL: Failed to write recording state to indicator stdin: ${err?.message}`);
        this._isReady = false;
      }
    }
  }

  public getIsRecording(): boolean {
    return this.isRecording;
  }

  public stop(): void {
    this.isStopping = true;
    this._isReady = false;
    if (this.child && this.child.stdin && !this.child.stdin.destroyed) {
      try {
        this.child.stdin.write('EXIT\n');
        this.child.stdin.end();
      } catch {}
    }
    if (this.child) {
      try {
        this.child.kill();
      } catch {}
      this.child = undefined;
    }
  }
}

export const globalPrivacyIndicator = new VisualPrivacyIndicator();

