// src/desktop/codeSandboxService.ts
// BOW AGENT V3.6 — UNIVERSAL CODE INTERPRETER & EXECUTION SANDBOX
//
// Allows Agent to dynamically synthesize JavaScript/TypeScript code and execute it
// in an isolated, secure, timeout-guarded environment to answer ANY ad-hoc calculation,
// data transformation, or custom query without requiring hardcoded tools.
import vm from 'node:vm';
export class CodeSandboxService {
    /**
     * Execute dynamic JavaScript code safely with isolated context and strict timeout guard
     */
    async executeCode(options) {
        const startTime = Date.now();
        const timeout = options.timeoutMs || 5000; // 5s timeout guard against infinite loops
        const logs = [];
        // Custom console logger that captures stdout
        const sandboxConsole = {
            log: (...args) => {
                logs.push(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
            },
            warn: (...args) => {
                logs.push('[WARN] ' + args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
            },
            error: (...args) => {
                logs.push('[ERROR] ' + args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
            },
            info: (...args) => {
                logs.push(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
            },
        };
        // Safe global environment for mathematical, string, array, and data computations
        const sandboxEnv = {
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
        try {
            const context = vm.createContext(sandboxEnv);
            // Wrap code in an IIFE if it contains await or return statements
            let executableCode = options.code.trim();
            const hasAwait = /\bawait\s+/.test(executableCode);
            const hasReturn = /\breturn\s+/.test(executableCode);
            if (hasAwait) {
                executableCode = `(async () => {\n${executableCode}\n})()`;
            }
            else if (hasReturn) {
                executableCode = `(() => {\n${executableCode}\n})()`;
            }
            const script = new vm.Script(executableCode);
            const evalResult = script.runInContext(context, {
                timeout,
                displayErrors: true,
            });
            // Handle thenable across VM realms safely
            const finalResult = evalResult && typeof evalResult.then === 'function'
                ? await evalResult
                : evalResult;
            return {
                success: true,
                stdout: logs.join('\n'),
                result: finalResult !== undefined ? finalResult : (logs.length > 0 ? logs[logs.length - 1] : 'Thực thi thành công'),
                executionTimeMs: Date.now() - startTime,
            };
        }
        catch (err) {
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
