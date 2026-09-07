// src/core/connection/connectionFailure.ts
// BOWCON V4.0 — REAL BIDIRECTIONAL SECURE CONNECTION & SESSION RUNTIME (MS-1.3.22)
//
// Typed immutable failure descriptors with automatic secret scrubbing.
import { createConnectionScope, deepFreeze, scrubConnectionSecrets } from './connectionScope.js';
import { computeConnectionFingerprint } from './connectionFingerprint.js';
/**
 * Creates an immutable, scrubbed ConnectionFailureDescriptor
 */
export function createConnectionFailureDescriptor(identity, code, rawMessage, rawDetails = {}, timestamp = new Date().toISOString()) {
    const scope = createConnectionScope(identity);
    const scrubbedMsg = scrubConnectionSecrets(rawMessage);
    const scrubbedDetails = scrubConnectionSecrets(rawDetails);
    const fp = computeConnectionFingerprint({
        scope,
        code,
        message: scrubbedMsg,
        details: scrubbedDetails,
    });
    return deepFreeze({
        failureId: `cfail_${fp}`,
        scope,
        scopeIdentity: deepFreeze({ ...identity }),
        code,
        message: scrubbedMsg,
        details: deepFreeze({ ...scrubbedDetails }),
        timestamp,
        fingerprint: fp,
    });
}
