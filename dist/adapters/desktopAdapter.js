// src/adapters/desktopAdapter.ts
// BOW AGENT V3.3 — DESKTOP CHANNEL ADAPTER (bow-remote-agent Gateway)
import { verifyChannelAccess } from '../core/security.js';
import { toolRegistry } from '../tools/registry.js';
export class DesktopChannelAdapter {
    /**
     * Process and dispatch desktop automation commands with strict security verification
     */
    async executeCommand(req) {
        const isAuth = verifyChannelAccess({ channel: 'DESKTOP', authToken: req.authToken }, 'DESKTOP_EXEC');
        if (!isAuth) {
            return {
                success: false,
                action: req.action,
                error: 'FORBIDDEN: Desktop authentication token is invalid or unauthorized.',
                timestamp: new Date().toISOString(),
            };
        }
        try {
            const toolName = req.action.startsWith('desktop_') ? req.action : `desktop_${req.action}`;
            if (!toolRegistry.hasTool(toolName)) {
                return {
                    success: false,
                    action: req.action,
                    error: `UNKNOWN_ACTION: Tool "${toolName}" is not supported.`,
                    timestamp: new Date().toISOString(),
                };
            }
            const result = await toolRegistry.executeTool(toolName, req.parameters || {}, { channel: 'DESKTOP', authToken: req.authToken });
            return {
                success: result.success,
                action: req.action,
                result: result.payload || result,
                error: result.error,
                timestamp: new Date().toISOString(),
            };
        }
        catch (err) {
            return {
                success: false,
                action: req.action,
                error: err?.message || 'Execution failure',
                timestamp: new Date().toISOString(),
            };
        }
    }
}
export const desktopChannelAdapter = new DesktopChannelAdapter();
