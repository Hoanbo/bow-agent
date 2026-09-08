import type { AdmissionRequest, AdmissionDecision, ZeroTrustAdmissionSnapshot } from './admissionTypes.js';
import { AdmissionChallengeTracker } from './admissionChallenge.js';
import { AdmissionTrustProvider } from './admissionTrust.js';
import { AdmissionRevocationRegistry } from './admissionRevocation.js';
import { AdmissionReplayTracker } from './admissionReplay.js';
import { AdmissionSessionCoordinator } from './admissionSession.js';
import { AdmissionAuditLedger } from './admissionAudit.js';
import { AdmissionRegistry } from './admissionRegistry.js';
import type { DeviceKeyStore } from '../deviceIdentity/persistentDeviceKey.js';
export interface ZeroTrustAdmissionRuntimeOptions {
    readonly trustProvider?: AdmissionTrustProvider;
    readonly keyStore?: DeviceKeyStore;
    readonly challengeTracker?: AdmissionChallengeTracker;
    readonly replayTracker?: AdmissionReplayTracker;
    readonly sessionCoordinator?: AdmissionSessionCoordinator;
    readonly revocationRegistry?: AdmissionRevocationRegistry;
    readonly auditLedger?: AdmissionAuditLedger;
    readonly registry?: AdmissionRegistry;
}
export declare class ZeroTrustAdmissionRuntime {
    private readonly trustProvider;
    private readonly keyStore;
    private readonly challengeTracker;
    private readonly replayTracker;
    private readonly sessionCoordinator;
    private readonly revocationRegistry;
    private readonly auditLedger;
    private readonly registry;
    private totalEvaluated;
    private totalAdmitted;
    private totalRejected;
    private roamingTransitionsCount;
    constructor(options?: ZeroTrustAdmissionRuntimeOptions);
    getTrustProvider(): AdmissionTrustProvider;
    getKeyStore(): DeviceKeyStore;
    getChallengeTracker(): AdmissionChallengeTracker;
    getReplayTracker(): AdmissionReplayTracker;
    getSessionCoordinator(): AdmissionSessionCoordinator;
    getRevocationRegistry(): AdmissionRevocationRegistry;
    getAuditLedger(): AdmissionAuditLedger;
    getRegistry(): AdmissionRegistry;
    admit(request: any, now?: number): Promise<AdmissionDecision>;
    /**
     * Evaluates an incoming connection request through the complete fail-closed Zero-Trust admission pipeline.
     */
    evaluateAdmission(request: AdmissionRequest, now?: number): AdmissionDecision;
    getSnapshot(): ZeroTrustAdmissionSnapshot;
}
