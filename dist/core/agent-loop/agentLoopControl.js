// src/core/agent-loop/agentLoopControl.ts
// BOWCON V4.0 — MS-1.3.36: REAL BOWCON CONTINUOUS AGENT OPERATING LOOP & CONTROLLED AUTONOMY RUNTIME
//
// User Authority Control Plane.
//
// Invariants:
// USER_STOP > EVERYTHING
// USER_AUTHORITY > GOVERNANCE > SUPERVISOR > BRAIN_AUTONOMY > CAPABILITY > WORLD_ACTION
import crypto from 'node:crypto';
import { globalAgentLoopCancellation } from './agentLoopCancellation.js';
export class AgentLoopControlPlane {
    _isStopped = false;
    _isPaused = false;
    _stopReason;
    _pauseReason;
    commandHistory = [];
    requestControl(params) {
        const commandId = `cmd_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const cmd = {
            commandId,
            type: params.type,
            operatorId: params.operatorId,
            timestamp: Date.now(),
            payload: params.payload,
        };
        this.commandHistory.push(cmd);
        switch (params.type) {
            case 'USER_STOP':
                this._isStopped = true;
                this._stopReason = params.payload?.reason || 'USER_STOP requested by operator.';
                // Instantly abort any in-flight cancellable tasks
                globalAgentLoopCancellation.cancelAll(this._stopReason || 'USER_STOP requested by operator.');
                break;
            case 'USER_PAUSE':
                this._isPaused = true;
                this._pauseReason = params.payload?.reason || 'USER_PAUSE requested by operator.';
                break;
            case 'USER_RESUME':
                this._isPaused = false;
                this._pauseReason = undefined;
                break;
            case 'USER_RESET':
                if (!params.payload?.operatorToken) {
                    throw new Error('RESET_DENIED: Valid operatorToken required to reset runtime.');
                }
                this._isStopped = false;
                this._isPaused = false;
                this._stopReason = undefined;
                this._pauseReason = undefined;
                globalAgentLoopCancellation.reset();
                break;
            default:
                break;
        }
        return cmd;
    }
    isStopped() {
        return this._isStopped;
    }
    isPaused() {
        return this._isPaused;
    }
    getStopReason() {
        return this._stopReason;
    }
    getPauseReason() {
        return this._pauseReason;
    }
    isAutonomousExecutionAllowed() {
        return !this._isStopped && !this._isPaused;
    }
    getHistory() {
        return this.commandHistory;
    }
    stop(reason = 'USER_STOP requested', operatorId = 'master_operator') {
        return this.requestControl({
            type: 'USER_STOP',
            operatorId,
            payload: { reason },
        });
    }
    resetStop(operatorId = 'master_operator', operatorToken = 'master_operator') {
        return this.requestControl({
            type: 'USER_RESET',
            operatorId,
            payload: { operatorToken },
        });
    }
}
export const globalAgentLoopControl = new AgentLoopControlPlane();
