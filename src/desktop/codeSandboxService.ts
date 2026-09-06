// src/desktop/codeSandboxService.ts
// BOW AGENT V3.6 — UNIVERSAL CODE INTERPRETER & EXECUTION SANDBOX
//
// Allows Agent to dynamically synthesize JavaScript/TypeScript code and execute it
// in an isolated, secure, timeout-guarded environment to answer ANY ad-hoc calculation,
// data transformation, or custom query without requiring hardcoded tools.

import { CONFIG } from '../config.js';

export interface CodeSandboxOptions {
  code: string;
  language?: 'javascript' | 'typescript' | 'js' | 'ts';
  timeoutMs?: number;
  initialContext?: Record<string, any>;
}

export interface CodeSandboxExecutionResult {
  success: boolean;
  stdout: string;
  result: any;
  executionTimeMs: number;
  error?: string;
}

export class CodeSandboxService {
  /**
   * Execute dynamic JavaScript code safely with isolated context and strict timeout guard
   */
  public async executeCode(options: CodeSandboxOptions): Promise<CodeSandboxExecutionResult> {
    const startTime = Date.now();
    if (!CONFIG.dynamicCodeEnabled) {
      return {
        success: false,
        stdout: '',
        result: null,
        error: 'DYNAMIC_CODE_DISABLED: Dynamic code execution is disabled by policy in this environment',
        executionTimeMs: Date.now() - startTime,
      };
    }
    const timeout = options.timeoutMs || 5000; // 5s timeout guard against infinite loops
    const logs: string[] = [];

    // Custom console logger that captures stdout
    const sandboxConsole = {
      log: (...args: any[]) => {
        logs.push(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
      },
      warn: (...args: any[]) => {
        logs.push('[WARN] ' + args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
      },
      error: (...args: any[]) => {
        logs.push('[ERROR] ' + args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
      },
      info: (...args: any[]) => {
        logs.push(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
      },
    };

    // Safe global environment for mathematical, string, array, and data computations
    const sandboxEnv: Record<string, any> = {
      console: sandboxConsole,
      Math,
      Date,
      JSON,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
      Array,
      Object,
      String,
      Number,
      Boolean,
      RegExp,
      Map,
      Set,
      ...(options.initialContext || {}),
    };

    // Static security scan to reject forbidden host primitives
    const FORBIDDEN_TOKENS = [
      /\bprocess\b/,
      /\brequire\b/,
      /\bimport\b/,
      /\bfs\b/,
      /\bchild_process\b/,
      /\bexec\b/,
      /\bspawn\b/,
      /\beval\b/,
      /\bFunction\b/,
      /\bAsyncFunction\b/,
      /\b__proto__\b/,
      /\bprototype\b/,
      /\bglobal\b/,
      /\bglobalThis\b/,
      /\bfetch\b/,
      /\bnet\b/,
      /\bdgram\b/,
    ];
    if (FORBIDDEN_TOKENS.some(token => token.test(options.code))) {
      return {
        success: false,
        stdout: '',
        result: null,
        error: 'SECURITY_VIOLATION: Code contains forbidden system or network primitives',
        executionTimeMs: Date.now() - startTime,
      };
    }

    try {
      let evalResult: any;
      if (typeof process !== 'undefined' && process.versions?.node) {
        const vm = await import('node:vm');
        const context = vm.createContext(sandboxEnv);

        // Wrap code in an IIFE if it contains await or return statements
        let executableCode = options.code.trim();
        const hasAwait = /\bawait\s+/.test(executableCode);
        const hasReturn = /\breturn\s+/.test(executableCode);

        if (hasAwait) {
          executableCode = `(async () => {\n${executableCode}\n})()`;
        } else if (hasReturn) {
          executableCode = `(() => {\n${executableCode}\n})()`;
        }

        const script = new vm.Script(executableCode);
        evalResult = script.runInContext(context, {
          timeout,
          displayErrors: true,
        });
      } else {
        return {
          success: false,
          stdout: '',
          result: null,
          error: 'SANDBOX_UNAVAILABLE: Host Function execution is strictly forbidden by Level 4 policy',
          executionTimeMs: Date.now() - startTime,
        };
      }

      // Handle thenable across VM realms safely
      const finalResult = evalResult && typeof (evalResult as any).then === 'function'
        ? await evalResult
        : evalResult;

      return {
        success: true,

        stdout: logs.join('\n'),
        result: finalResult !== undefined ? finalResult : (logs.length > 0 ? logs[logs.length - 1] : 'Thực thi thành công'),
        executionTimeMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return {
        success: false,
        stdout: logs.join('\n'),
        result: null,
        error: err?.message || 'Lỗi thực thi trong Sandbox',
        executionTimeMs: Date.now() - startTime,
      };
    }
  }
}

export const codeSandboxService = new CodeSandboxService();
