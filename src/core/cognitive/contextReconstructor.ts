// src/core/cognitive/contextReconstructor.ts
// BOWCON V4.0 — MS-1.3.32: MULTI-TURN CONTEXT RECONSTRUCTION ENGINE
//
// Invariants:
// MEMORY != SESSION
// SESSION != TASK
// DEVICE != USER
// REFERENTIAL_RESOLUTION == PRESERVE_DURABLE_INTENT

import type { CognitiveTurn } from './cognitiveTypes.js';

export interface SessionContextState {
  readonly sessionId: string;
  lastTargetFile?: string;
  lastAction?: string;
  lastToolName?: string;
  readonly turns: CognitiveTurn[];
  readonly namedEntities: Record<string, string>;
  updatedAt: string;
}

export class ContextReconstructor {
  private readonly sessions = new Map<string, SessionContextState>();

  /**
   * Retrieves or initializes session context state.
   */
  public getOrCreateSession(sessionId: string): SessionContextState {
    let session = this.sessions.get(sessionId);
    if (!session) {
      session = {
        sessionId,
        turns: [],
        namedEntities: {},
        updatedAt: new Date().toISOString(),
      };
      this.sessions.set(sessionId, session);
    }
    return session;
  }

  /**
   * Records a user or assistant turn, updating referenced entities.
   */
  public recordTurn(
    sessionId: string,
    turn: CognitiveTurn,
    hints?: { targetFile?: string; toolName?: string; action?: string }
  ): void {
    const session = this.getOrCreateSession(sessionId);
    session.turns.push(turn);
    if (session.turns.length > 20) {
      session.turns.shift(); // Keep window bounded
    }

    if (hints?.targetFile) {
      session.lastTargetFile = hints.targetFile;
      session.namedEntities['lastTargetFile'] = hints.targetFile;
    } else if (turn.targetEntity) {
      session.lastTargetFile = turn.targetEntity;
      session.namedEntities['lastTargetFile'] = turn.targetEntity;
    }

    if (hints?.toolName) {
      session.lastToolName = hints.toolName;
    }
    if (hints?.action) {
      session.lastAction = hints.action;
    }

    // Try detecting file mentions from content (support quotes and Windows drive paths)
    const quotedMatch = turn.content.match(/["']([^"'\r\n]+\.(?:txt|md|json|log|ts|js))["']/i);
    const unquotedMatch = turn.content.match(/\b([a-zA-Z]:[\\/][^\s"']+\.(?:txt|md|json|log|ts|js)|[a-zA-Z0-9_\-./\\]+\.(?:txt|md|json|log|ts|js))\b/i);
    const detectedFile = quotedMatch?.[1] || unquotedMatch?.[1];
    if (detectedFile) {
      session.lastTargetFile = detectedFile;
      session.namedEntities['lastTargetFile'] = detectedFile;
    }

    session.updatedAt = new Date().toISOString();
  }

  /**
   * Resolves referential pronouns ('it', 'that file', 'the previous file', 'to it')
   * against the durable session context.
   */
  public resolveContext(
    sessionId: string,
    input: string
  ): {
    resolvedInput: string;
    referencedEntity?: string;
    isReferential: boolean;
  } {
    const session = this.getOrCreateSession(sessionId);
    const lower = input.toLowerCase();

    // Check for referential phrases
    const referentialPatterns = [
      /\b(?:to\s+it|into\s+it|in\s+it|on\s+it)\b/i,
      /\b(?:that\s+file|the\s+file|the\s+same\s+file|the\s+previous\s+file|the\s+created\s+file)\b/i,
      /\b(?:it|them|that)\b/i,
    ];

    const hasReference = referentialPatterns.some(p => p.test(lower));
    const targetFile = session.lastTargetFile;

    if (hasReference && targetFile && !lower.includes(targetFile.toLowerCase())) {
      let resolved = input;
      if (/\b(?:to\s+it|into\s+it|in\s+it)\b/i.test(resolved)) {
        resolved = resolved.replace(/\b(?:to\s+it|into\s+it|in\s+it)\b/i, `to "${targetFile}"`);
      } else if (/\b(?:that\s+file|the\s+file|the\s+same\s+file|the\s+previous\s+file)\b/i.test(resolved)) {
        resolved = resolved.replace(/\b(?:that\s+file|the\s+file|the\s+same\s+file|the\s+previous\s+file)\b/i, `"${targetFile}"`);
      } else if (/\bappend\s+([\s\S]+?)\s+it\b/i.test(resolved)) {
        resolved = resolved.replace(/\bit\b/i, `"${targetFile}"`);
      } else {
        resolved = `${input} (referencing target: "${targetFile}")`;
      }

      return {
        resolvedInput: resolved,
        referencedEntity: targetFile,
        isReferential: true,
      };
    }

    return {
      resolvedInput: input,
      referencedEntity: targetFile,
      isReferential: false,
    };
  }

  /**
   * Exports context state for durability.
   */
  public exportState(sessionId: string): Record<string, unknown> {
    const session = this.getOrCreateSession(sessionId);
    return {
      sessionId: session.sessionId,
      lastTargetFile: session.lastTargetFile,
      lastAction: session.lastAction,
      lastToolName: session.lastToolName,
      turns: session.turns,
      namedEntities: { ...session.namedEntities },
      updatedAt: session.updatedAt,
    };
  }

  /**
   * Restores context state from durable store.
   */
  public importState(sessionId: string, data: Record<string, unknown>): void {
    const session: SessionContextState = {
      sessionId,
      lastTargetFile: typeof data.lastTargetFile === 'string' ? data.lastTargetFile : undefined,
      lastAction: typeof data.lastAction === 'string' ? data.lastAction : undefined,
      lastToolName: typeof data.lastToolName === 'string' ? data.lastToolName : undefined,
      turns: Array.isArray(data.turns) ? (data.turns as CognitiveTurn[]) : [],
      namedEntities: (data.namedEntities as Record<string, string>) || {},
      updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : new Date().toISOString(),
    };
    this.sessions.set(sessionId, session);
  }

  /**
   * Resets session memory.
   */
  public clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }
}
