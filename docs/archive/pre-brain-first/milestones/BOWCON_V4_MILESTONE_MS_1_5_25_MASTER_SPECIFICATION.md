# BOWCON V4 - MILESTONE MS-1.5.25 MASTER SPECIFICATION

**Milestone ID:** `MS-1.5.25`
**Title:** Governed Cross-Federation Policy Distribution, Node Attestation & Distributed Enforcement Synchronization Engine
**Subsystem:** `src/core/governedPolicyDistribution/`
**Allocation:** Components 1218-1227, exactly ten, all `SPECIFIED / ALLOCATED`
**Regression allocation:** Suite #119, `tests/test_v4_ms15_governed_policy_distribution_sync.ts`, exactly 180 deterministic vectors
**Implementation authorization:** `NOT AUTHORIZED`

## 1. Purpose, scope, and constitutional boundary

MS-1.5.25 coordinates the post-ratification distribution of an existing canonical policy to registered fleet nodes, verifies bounded cryptographic receipts, reports convergence, records node-local quarantine state, and records an epoch decision. It is subordinate to the existing authority chain:

```text
Sole Human Authority
  -> MS-1.5.19 deliberation
  -> MS-1.5.20 ratification and canonical policy store
  -> MS-1.5.21 lifecycle and staged-deployment authority
  -> MS-1.5.25 distribution coordination
  -> node-local existing PDP/PEP enforcement
```

The subsystem does not author, mutate, ratify, activate, promote, suspend, reinstate, retire, or roll back a policy. It does not execute a tool, process, shell command, browser, worker, or operating-system action. It does not own a PDP/PEP and cannot itself revoke a node's execution permission. `DISTRIBUTION != RATIFICATION`; `DISTRIBUTION != AUTHORIZATION`; `ATTESTATION != AUTHORIZATION`; `CONVERGENCE_SCORE != AUTHORIZATION`; `MANIFEST_HASH != AUTHORIZATION`; `QUARANTINE != POLICY_RATIFICATION`; and `EPOCH_COMMIT != LIFECYCLE_AUTHORITY`.

MS-1.5.25 accepts only a policy already verified as: (a) a `CanonicalStrategicPolicy` and `AuthoritativeRatificationRecord` from MS-1.5.20 with identical tenant, domain, version, canonical hash, and ratification ID; and (b) a `PolicyLifecycleRecord` from MS-1.5.21 in `STAGED`, `ACTIVE`, or `DEGRADED` state with the same bindings. The lifecycle record is evidence of upstream lifecycle authority; it is not mutable through this subsystem.

## 2. Repository-grounded predecessor boundary

| Existing owner | Existing responsibility | MS-1.5.25 responsibility | Boundary |
|---|---|---|---|
| MS-1.5.14 `multiAgentFederation` | Agent and federation identity, capability registration, delegation | Creates a policy-distribution node registration bound to an existing federation identity | Does not alter agent identity, capability, or delegation. |
| MS-1.5.19 | Deliberation and advisory policy evolution | None beyond consuming the eventually ratified result | No proposal or advisory processing. |
| MS-1.5.20 | Canonical compilation, human-token verification, ratification, version persistence, staged deployment | Packages an immutable copy of a ratified canonical policy | Does not validate human authority or create ratification. |
| MS-1.5.21 | Authoritative eight-state lifecycle, operational interlocks, lifecycle transition | Uses a supplied lifecycle record and reports a distribution result | Does not mutate lifecycle state or canary stage. |
| MS-1.5.22 | Runtime observation and compliance scoring | May consume its observation only as external evidence for a quarantine request | Does not score runtime compliance. |
| MS-1.5.23 | Remediation diagnosis and advisory handoff | Distributes only a subsequently ratified policy | Does not diagnose or synthesize remediation. |
| MS-1.5.24 | Pre-ratification simulation and shadow evaluation | None beyond consuming an already ratified policy | Does not simulate, replay, or create a simulation verdict. |

The architectural gap is real: the current source packages above contain no fleet policy-manifest contract, node-attestation verifier, fleet convergence calculation, or distribution coordination module. Existing MS-1.5.20 storage is local policy storage, and MS-1.5.21's `RUNTIME_SYNC_BROADCAST` audit event is not a node delivery/receipt protocol.

## 3. Numbering contract and component allocation

The repository Component Matrix records Component 1217 as `GovernedPolicySimulationModuleIndex` for MS-1.5.24. Therefore the next unallocated monotonic range is 1218-1227. Component 1218 is the required foundational contract layer; it is not an omitted capability. No component is skipped, duplicated, reserved, or allocated beyond this range.

| ID | Canonical name | File | Singular responsibility | Public capability | Suite #119 group |
|---|---|---|---|---|---|
| 1218 | `GovernedPolicyDistributionTypes` | `GovernedPolicyDistributionTypes.ts` | Contracts, validation, canonicalization, hash and error definitions | types and pure helpers | 01, 02, 04, 06 |
| 1219 | `FleetNodeRegistry` | `FleetNodeRegistry.ts` | Tenant-bound node registration and cohort read model | register, heartbeat, cohort read | 03 |
| 1220 | `PolicyDistributionManifestPackager` | `PolicyDistributionManifestPackager.ts` | Immutable manifest construction from verified upstream records | package manifest | 04 |
| 1221 | `BoundedNodeDeliveryCoordinator` | `BoundedNodeDeliveryCoordinator.ts` | Bounded calls to an injected transport adapter | prepare/commit/abort delivery | 05 |
| 1222 | `NodePolicyAttestationVerifier` | `NodePolicyAttestationVerifier.ts` | Deterministic receipt and proof verification | verify receipt | 06 |
| 1223 | `FleetConvergenceEvaluator` | `FleetConvergenceEvaluator.ts` | Cohort convergence calculation and readiness report | evaluate convergence | 07 |
| 1224 | `SynchronizedEpochCutoverController` | `SynchronizedEpochCutoverController.ts` | Epoch decision state machine and durable decision record | prepare, commit, abort | 08 |
| 1225 | `FailClosedNodeQuarantineController` | `FailClosedNodeQuarantineController.ts` | Node quarantine record lifecycle and publication | quarantine, release, query | 09 |
| 1226 | `PolicyDistributionAuditLedger` | `PolicyDistributionAuditLedger.ts` | Tenant/domain distribution audit chain | append and verify audit events | 10 |
| 1227 | `GovernedPolicyDistributionModuleIndex` | `GovernedPolicyDistributionModuleIndex.ts` | Validated orchestration of components 1219-1226 | execute pipeline | 10 |

`index.ts` is only the barrel export and has no component number. Each listed class is in the listed file. All ten components remain `SPECIFIED / ALLOCATED`; this specification does not change the Component Matrix.

## 4. Canonical primitives and validation

`PolicyDomain`, `CanonicalStrategicPolicy`, `AuthoritativeRatificationRecord`, `PolicyDeploymentRecord`, `CanaryRing`, and `PolicyLifecycleRecord` retain their canonical MS-1.5.20/MS-1.5.21 definitions. `CanaryRing` is exactly `0 | 1 | 2 | 3 | 4`: Shadow (0% live traffic), Internal (5%), Extended (25%), Broad (50%), and Full Active (100%). This milestone does not redefine traffic allocation.

The following IDs are opaque strings after validation: `FleetNodeId`, `DistributionManifestId`, `DistributionSessionId`, `NodeAttestationId`, `NodeQuarantineId`, `PolicyEpochId`, and `DistributionAuditRecordId`. Every supplied ID must be a string matching `^[A-Za-z0-9_-]{1,64}$`, must not be `CON`, `PRN`, `AUX`, `NUL`, `COM1` through `COM9`, or `LPT1` through `LPT9` case-insensitively, and must contain none of `..`, `/`, `\\`, or NUL. `tenantId`, `federationId`, and `nodeId` use this rule. `policyDomain` is exactly one of the MS-1.5.19 values `LEASE | CONVERGENCE | FEDERATION | SECURITY | RESOURCE | AUDIT` and is used only as a validated path segment. A hash is exactly 64 lower-case hexadecimal characters. A nonce is a UUIDv4 string. A policy version is a positive safe integer. Distribution epoch is a positive safe integer serialized in decimal, monotonic per `(tenantId, policyDomain)`, and never reused after a durable terminal decision.

The identity key of a node is `(tenantId, federationId, nodeId)`. A node is unique on that key. A `(tenantId, policyDomain, nodeId)` registration may have one current record; a new federation binding for the same node requires explicit deregistration first. A node is assigned to exactly one canary ring for each `(tenantId, policyDomain)`. Any mismatch in tenant, federation, domain, node registration, policy version/hash, or manifest binding is rejected before mutation with `DistributionTenantIsolationError` or `DistributionValidationError`, as applicable.

`NodeSyncStatus` is exactly `INITIALIZING | SYNC_PENDING | PREPARED | IN_SYNC | SYNC_FAILED | QUARANTINED`. Registration creates `INITIALIZING`; a valid prepare delivery creates `SYNC_PENDING`; a valid `PREPARED` receipt creates `PREPARED`; a valid `COMMITTED` receipt creates `IN_SYNC`; a bounded delivery or convergence timeout creates `SYNC_FAILED`; quarantine creates `QUARANTINED`. Only release changes `QUARANTINED` to `INITIALIZING`.

A heartbeat is an authenticated registry update for its own node with timestamp `nowMs`. `lastHeartbeatAt` is never permitted to decrease. A node is stale if `nowMs - lastHeartbeatAt > 15000`; equality is fresh. A stale node is not eligible for a new epoch and cannot supply a fresh receipt. Stale status is derived, not persisted as an additional state.

## 5. Deterministic serialization and cryptographic contract

Two canonicalizations are intentionally distinct. `ms120CanonicalPolicyHash` is the unmodified MS-1.5.20 source contract: SHA-256 of its `canonicalizeJson({policyId,tenantId,policyDomain,policyVersion,parentVersion,rules})`. It is the sole source of `canonicalPolicyHash`. Distribution canonicalization below is never substituted for that upstream hash.

`canonicalJson(value)` accepts null, booleans, finite IEEE-754 binary64 numbers, Unicode scalar strings, arrays, and plain objects only. It emits UTF-8 without a BOM and no whitespace. Object keys and string values are NFC-normalized before serialization; if two normalized object keys are equal, reject with `DistributionCanonicalizationError`. Keys sort by their normalized UTF-16 code-unit sequence; arrays retain order; null is `null`; booleans are `true` or `false`.

Strings are delimited by `"`. Escape `"` as `\\"`, `\\` as `\\\\`, backspace/tab/line-feed/form-feed/carriage-return as `\\b`, `\\t`, `\\n`, `\\f`, `\\r`; escape every other U+0000-U+001F, U+2028, and U+2029 as a lower-case four-digit `\\u00xx` or `\\u2028`/`\\u2029`. Emit every other scalar as its NFC UTF-8 character. An unpaired UTF-16 surrogate is invalid and is rejected; there is no replacement-character conversion.

For a number, reject NaN, Infinity, and -Infinity; serialize `-0` as `0`; otherwise serialize the ECMAScript Number `ToString` result defined by ECMAScript 2023, with lowercase `e`, an explicit `+` only when that result includes it, and no locale formatting. Required examples are `0 -> 0`, `-0 -> 0`, `1 -> 1`, `-1 -> -1`, `1.5 -> 1.5`, `1e-7 -> 1e-7`, and `1e21 -> 1e+21`. Dates, buffers, maps, sets, functions, symbols, bigint, `undefined`, and non-plain objects are rejected. This API accepts object values, not raw JSON text, so duplicate textual JSON keys are not an input representation.

`hash(value) = SHA-256(UTF-8(canonicalJson(value)))`. Therefore scrubbing or validation always precedes canonicalization, and canonicalization always precedes SHA-256/HMAC. No locale, insertion order, wall-clock formatting, or serializer option participates.

`sha256(x)` is SHA-256 over UTF-8 bytes and returns lower-case hexadecimal. `hmacSha256(key, x)` is HMAC-SHA-256 over the same bytes and returns lower-case hexadecimal. Equality checks use constant-time comparison only after both values pass hash validation.

`manifestFingerprint = sha256(canonicalJson(manifestPayload))`, where `manifestPayload` is every manifest field except `manifestFingerprint`. `eventHash = sha256(previousHash + canonicalJson(eventPayload))`; `previousHash` is the 64-character lower-case text directly concatenated with canonical JSON. The genesis previous hash is 64 zero characters. A hash proves only integrity, never authority.

## 6. Data contracts

```typescript
interface FleetNodeRecord {
  nodeId: FleetNodeId; tenantId: string; federationId: string; policyDomain: PolicyDomain;
  assignedCanaryRing: CanaryRing; currentEpoch: number; currentPolicyVersion: number;
  currentPolicyHash: string; syncStatus: NodeSyncStatus; quarantined: boolean;
  lastHeartbeatAt: number; lastAttestationAt?: number; registeredAt: number;
}
interface FleetConvergenceReport {
  tenantId: string; federationId: string; policyDomain: PolicyDomain; manifestId: DistributionManifestId;
  epoch: number; targetCanaryRing: CanaryRing; totalNodes: number; synchronizedNodes: number;
  pendingNodes: number; failedNodes: number; quarantinedNodes: number; convergenceRatio: number;
  status: 'NO_NODES_REGISTERED' | 'NOT_READY' | 'CONVERGING' | 'CONVERGED' | 'DIVERGED' | 'BLOCKED';
  isCommitEligible: boolean; evaluatedAt: number;
}
interface PolicyDistributionManifest {
  manifestId: DistributionManifestId; tenantId: string; federationId: string;
  policyDomain: PolicyDomain; policyId: string; policyVersion: number;
  parentPolicyVersion: number; canonicalPolicyHash: string; ratificationId: string; lifecycleRecordId: string;
  lifecycleState: 'STAGED' | 'ACTIVE' | 'DEGRADED'; lifecycleVersion: number;
  targetEpoch: number; targetCanaryRing: CanaryRing; compiledRules: Record<string, CanonicalPolicyRule>;
  distributionNonce: string; issuedAt: number; expiresAt: number; manifestFingerprint: string;
}
interface NodePolicyAttestationReceipt {
  attestationId: NodeAttestationId; nodeId: FleetNodeId; tenantId: string; federationId: string;
  policyDomain: PolicyDomain; manifestId: DistributionManifestId; manifestFingerprint: string;
  canonicalPolicyHash: string; policyVersion: number; epoch: number; pepBindingHash: string;
  distributionNonce: string; receiptNonce: string; status: 'PREPARED' | 'COMMITTED';
  keyId: string; timestamp: number; proof: string;
}
interface NodeQuarantineRecord {
  quarantineId: NodeQuarantineId; nodeId: FleetNodeId; tenantId: string; federationId: string;
  policyDomain: PolicyDomain; reason: QuarantineReason; evidenceHash: string;
  epoch: number; quarantinedAt: number; releasedAt?: number; releaseReceiptId?: NodeAttestationId;
}
type QuarantineReason = 'HASH_MISMATCH' | 'SIGNATURE_INVALID' | 'DELIVERY_TIMEOUT' |
  'COMMIT_DELIVERY_EXHAUSTED' | 'STALE_EPOCH' | 'CROSS_TENANT' | 'STALE_HEARTBEAT' |
  'MANIFEST_TAMPERED' | 'SPLIT_BRAIN';
interface NodeRef { tenantId: string; federationId: string; policyDomain: PolicyDomain; nodeId: FleetNodeId; }
interface DeliveryBatchResult { manifestId: DistributionManifestId; epoch: number; messageType: 'PREPARE' | 'COMMIT' | 'ABORT'; acceptedNodeIds: readonly FleetNodeId[]; failedNodeIds: readonly FleetNodeId[]; completedAt: number; }
interface VerifiedReceipt { receipt: NodePolicyAttestationReceipt; verifiedAt: number; }
interface EpochDecision { decisionId: string; tenantId: string; policyDomain: PolicyDomain; manifestId: DistributionManifestId; epoch: number; state: 'PREPARED' | 'COMMIT_DURABLE' | 'COMMIT_DELIVERY' | 'ATTESTATION_PENDING' | 'CONVERGED' | 'DIVERGED' | 'RECOVERY_EXHAUSTED' | 'ABORTED'; reason?: string; preparedAt: number; commitAt?: number; terminalAt?: number; }
interface DistributionAuditEventInput { eventType: DistributionAuditEventType; tenantId: string; policyDomain: PolicyDomain; actorSource: 'SYSTEM' | 'TRANSPORT_ADAPTER' | `NODE:${FleetNodeId}`; data: DistributionAuditData; }
interface DistributionAuditRecord { eventId: DistributionAuditRecordId; eventType: DistributionAuditEventType; timestamp: number; tenantId: string; policyDomain: PolicyDomain; actorSource: string; previousHash: string; eventHash: string; data: DistributionAuditData; }
type DistributionAuditScalar = null | boolean | number | string;
type DistributionAuditData = DistributionAuditScalar | readonly DistributionAuditData[] | { readonly [key: string]: DistributionAuditData };
interface LedgerVerificationResult { valid: boolean; verifiedEventCount: number; headHash: string; }
interface DistributionPipelineInput { manifest: PolicyDistributionManifest; }
interface DistributionPipelineResult { manifestId: DistributionManifestId; epochDecision: EpochDecision; convergence: FleetConvergenceReport; delivery: DeliveryBatchResult; }
interface QuarantineInput extends NodeRef { reason: QuarantineReason; evidenceHash: string; epoch: number; }
type DistributionAuditEventType = 'NODE_REGISTERED' | 'NODE_HEARTBEAT' | 'MANIFEST_PACKAGED' | 'PREPARE_DELIVERED' | 'DELIVERY_FAILED' | 'RECEIPT_ACCEPTED' | 'RECEIPT_REJECTED' | 'NONCE_REPLAY_REJECTED' | 'CONVERGENCE_EVALUATED' | 'EPOCH_PREPARED' | 'EPOCH_COMMIT_DURABLE' | 'EPOCH_COMMIT_DELIVERY' | 'EPOCH_CONVERGED' | 'EPOCH_DIVERGED' | 'EPOCH_RECOVERY_EXHAUSTED' | 'EPOCH_ABORTED' | 'SPLIT_BRAIN_DETECTED' | 'NODE_QUARANTINED' | 'NODE_QUARANTINE_RELEASED' | 'QUARANTINE_PUBLICATION_FAILED' | 'TENANT_ACCESS_REJECTED' | 'EMERGENCY_STOP_BLOCKED' | 'LOCK_TIMEOUT' | 'PERSISTENCE_CORRUPTION' | 'LEDGER_VERIFIED';
type DistributionTransportMessage =
  | { messageType: 'PREPARE'; nodeId: FleetNodeId; manifest: PolicyDistributionManifest }
  | { messageType: 'COMMIT'; nodeId: FleetNodeId; manifestId: DistributionManifestId; targetEpoch: number; decisionId: string; commitAt: number }
  | { messageType: 'ABORT'; nodeId: FleetNodeId; manifestId: DistributionManifestId; targetEpoch: number; decisionId: string; reason: string };
interface DeliveryAck { nodeId: FleetNodeId; tenantId: string; federationId: string; manifestId: DistributionManifestId; epoch: number; messageType: 'PREPARE' | 'COMMIT' | 'ABORT'; accepted: boolean; }
interface PolicyDistributionTransportAdapter { deliver(message: DistributionTransportMessage, deadlineMs: number): Promise<DeliveryAck>; }
interface Clock { nowMs(): number; } // controller-authoritative, non-decreasing UTC Unix epoch milliseconds
interface UuidV4Generator { next(): string; }
interface NodeAttestationKeyResolver { resolve(tenantId: string, federationId: string, nodeId: FleetNodeId, keyId: string): Uint8Array | undefined; }
interface DistributionControlKeyResolver { resolve(tenantId: string, federationId: string, nodeId: FleetNodeId, keyId: string): Uint8Array | undefined; }
interface QuarantinePublicationRequest { requestId: string; tenantId: string; federationId: string; nodeId: FleetNodeId; policyDomain: PolicyDomain; policyVersion: number; canonicalPolicyHash: string; reason: QuarantineReason; evidenceFingerprint: string; quarantineEpoch: number; issuedAt: number; nonce: string; keyId: string; proof: string; }
interface QuarantinePublicationAck { requestId: string; status: 'ACK_SUCCESS' | 'ACK_REJECTED' | 'ACK_INVALID'; nodeId: FleetNodeId; tenantId: string; federationId: string; policyDomain: PolicyDomain; quarantineEpoch: number; timestamp: number; keyId: string; proof: string; }
interface PolicyQuarantinePublicationAdapter { publish(request: QuarantinePublicationRequest, deadlineMs: number): Promise<QuarantinePublicationAck>; }
```

All fields are mandatory unless marked with `?`; `EpochDecision.commitAt` is absent only before `COMMIT_DURABLE`. A manifest's `federationId` denotes the target federation, not a global scope. Its `issuedAt` is supplied by the authoritative clock. `expiresAt - issuedAt` must be in `[1, 60000]` milliseconds. A manifest is immutable; changing any payload field invalidates its fingerprint.

`compiledRules` is not a compiler output and not an independently authoritative artifact: it is an exact deep-frozen copy of MS-1.5.20 `CanonicalStrategicPolicy.rules`, retained under its historical field name. The packager accepts the full upstream policy and verifies `policy.metadata.canonicalHash == ratification.canonicalPolicyHash == ms120CanonicalPolicyHash(policy)`, then sets `manifest.canonicalPolicyHash` to that value. A node reconstructs exactly `{policyId: manifest.policyId, tenantId: manifest.tenantId, policyDomain: manifest.policyDomain, policyVersion: manifest.policyVersion, parentVersion: manifest.parentPolicyVersion, rules: manifest.compiledRules}` and applies the MS-1.5.20 canonicalizer/hash; it must equal `manifest.canonicalPolicyHash`. There is no `compiledRulesHash`, and an implementation must never treat `hash(compiledRules)` as `canonicalPolicyHash`.

`manifest.lifecycleVersion` is the exact MS-1.5.21 `PolicyLifecycleRecord.lifecycleVersion`, a positive safe integer. It is copied unchanged and is not a distribution epoch. MS-1.5.21 treats the absent pre-record version as zero and persists the first lifecycle record at one; each lifecycle transition increments it, including rollback, and it never decrements. The packager reads the current record through the existing `PolicyLifecycleStateManager.getLifecycleState(tenantId, policyDomain, policyId)` and rejects an absent, stale, higher, or different record. It requires equal tenant, domain, policy ID, policy version, canonical hash, ratification ID, and eligible lifecycle state. Distribution epoch remains a separate controller counter and comparison across the two fields is forbidden.

The packager receives an injected cryptographically secure UUIDv4 generator. It generates `manifestId` and `distributionNonce` independently, validates both, and rejects a collision in the tenant nonce/manifest stores before persistence. Tests inject a deterministic generator; production uses a cryptographically secure generator. `decisionId` is `sha256(canonicalJson({tenantId,policyDomain,manifestId,epoch}))`, so it is deterministic and unique for a valid manifest/epoch tuple.

`pepBindingHash = hash({nodeId,tenantId,federationId,policyDomain,manifestId,canonicalPolicyHash,policyVersion,epoch})`; it is a deterministic node claim binding the receipt to the node-local PEP slot, not proof that a tool was authorized or executed. The receipt proof payload is exactly `canonicalJson({attestationId,nodeId,tenantId,federationId,policyDomain,manifestId,manifestFingerprint,canonicalPolicyHash,policyVersion,epoch,pepBindingHash,distributionNonce,receiptNonce,status,keyId,timestamp})`. `proof` is `hmacSha256(resolvedNodeKey, payload)`. `NodeAttestationKeyResolver.resolve(tenantId, federationId, nodeId, keyId)` returns one verification key or `undefined`; undefined, a resolver throw, or an invalid key is `DistributionAttestationVerificationError`. The key is never persisted or audited. A receipt timestamp must be within `[issuedAt - 5000, min(expiresAt, nowMs + 5000)]`; a receipt at an earlier epoch is stale, and an epoch above the manifest epoch is invalid. A receipt may be accepted once per `(tenantId, federationId, nodeId, manifestId, status)` only if its `receiptNonce` is unconsumed. Both nonces are globally unique within the tenant for 24 hours from `issuedAt`; nonce reuse, including a duplicate valid receipt, fails closed with `DistributionNonceReplayError` and creates no state transition.

`PREPARED` proves only that the registered node cryptographically claimed it loaded the exact manifest into a non-live staging slot. `COMMITTED` proves only that it cryptographically claimed it received the recorded commit and switched its local PEP binding. Neither statement proves human authority, ratification, policy validity, continued enforcement, tool authorization, or arbitrary policy mutation.

## 7. Transport boundary

Component 1221 owns coordination, not networking. It accepts an injected `PolicyDistributionTransportAdapter` with exactly `deliver(message: DistributionTransportMessage, deadlineMs: number): Promise<DeliveryAck>`. `DistributionTransportMessage` is one of `PREPARE(nodeId, manifest)`, `COMMIT(nodeId, manifestId, targetEpoch, decisionId, commitAt)`, or `ABORT(nodeId, manifestId, targetEpoch, decisionId, reason)`. Exactly one transport message targets exactly one node (`one transport message = one target node`); the adapter is never required to infer the target node from external state. `DeliveryAck` contains only `(nodeId, tenantId, federationId, manifestId, epoch, messageType, accepted)` and its `nodeId` must match the message's `nodeId`. The adapter is selected and configured outside this subsystem; an adapter has no authority to modify policy, lifecycle, or quarantine.

Every call receives `deadlineMs = min(5000, manifest.expiresAt - nowMs)`. A non-positive deadline, rejection, throw, or unresolved promise at the deadline is a delivery failure. Component 1221 makes one attempt per invocation; only Component 1224 schedules the bounded post-commit retries defined below, each as a new 1221 invocation with the same idempotency key. A caller may begin a new distribution session only with a new manifest and new distribution nonce. Component 1221 cannot import or invoke `child_process`, `exec`, `execSync`, `spawn`, `spawnSync`, `fork`, `worker_threads`, `eval`, `Function`, `new Function`, Puppeteer, Playwright, CDP, raw sockets, shell execution, OS actuation, or browser automation.

## 8. Convergence, canary readiness, and epoch decision

The target cohort is the de-duplicated registered nodes matching all of `(tenantId, federationId, policyDomain, targetCanaryRing)`. A node with a stale heartbeat or current quarantine is included in `N_total` and cannot be synchronized. Unknown and duplicate receipt senders are rejected and are never counted. Thus `N_total` is the count of registered assigned nodes, not a count of received messages.

For pre-commit evaluation, `N_synced` is the number of target-cohort nodes with `status = PREPARED`, matching manifest hash/version/epoch, an unexpired valid `PREPARED` receipt, and no quarantine. For post-commit evaluation, it is the number with `status = IN_SYNC` and an unexpired valid `COMMITTED` receipt with those same bindings. `C_sync = 0` when `N_total = 0`; otherwise `C_sync = N_synced / N_total`. Therefore `0 <= C_sync <= 1`. Receipt freshness is `nowMs - timestamp <= 30000`; a future receipt greater than 5000 milliseconds is invalid. Thresholds are exact: ring 0 `0.80`, ring 1 `0.90`, rings 2 and 3 `0.95`, ring 4 `0.99`. Threshold satisfaction is necessary but never sufficient for lifecycle promotion or human authorization.

The pre-commit report status is: `NO_NODES_REGISTERED` when `N_total=0`; `BLOCKED` when any node is quarantined or an upstream lifecycle record is not eligible; `CONVERGED` when every node is prepared and `C_sync >= threshold`; `DIVERGED` when the 5000ms convergence deadline has elapsed without convergence; `CONVERGING` when at least one node is prepared before that deadline; otherwise `NOT_READY`. The post-commit report uses `CONVERGED` only when every node is `IN_SYNC`; any mismatch is `DIVERGED`, and retry exhaustion is reflected by the epoch's `RECOVERY_EXHAUSTED` state. `isCommitEligible` is true only for a pre-commit `CONVERGED` report, with no quarantine, a strict-false emergency stop value, and the upstream lifecycle record still matching the manifest. This requires all target nodes to be prepared even where the reporting threshold is less than 1.0; threshold reporting never weakens the no-partial-commit rule.

`PREPARE -> ACKNOWLEDGE -> COMMIT` is a controller decision protocol, not global network atomicity. The epoch state machine is `PREPARED -> COMMIT_DURABLE -> COMMIT_DELIVERY -> ATTESTATION_PENDING -> CONVERGED | DIVERGED | RECOVERY_EXHAUSTED`; before durable commit, `PREPARED -> ABORTED` is the only terminal path. Node state `QUARANTINED` is independent of the epoch state. MS-1.5.21 remains owner of lifecycle state and active-policy authority.

`E` must equal the greatest durable distribution epoch for `(tenantId, policyDomain)` plus one; when none exists, `E=1`. A lower E is stale and a larger E is future, both `DistributionEpochConflictError`. The prepare deadline is exactly 5000ms from durable `PREPARED`. Emergency stop, manifest expiry, upstream-record mismatch, any invalid receipt, or any missing required PREPARED receipt at that deadline causes `ABORTED`; abort only discards staged policy. Repeated prepare/abort for the same tuple returns the stored result and sends no new message.

Commit eligibility requires all PREPARED receipts. `commit(manifest, nowMs)` receives the manifest corresponding to the prepared transaction. The controller re-validates the supplied manifest under lock against the stored durable PREPARED decision record before committing: `manifestId`, `tenantId`, `federationId`, `policyDomain`, `canonicalPolicyHash`, `policyVersion`, `lifecycleVersion`, and `targetEpoch` must match the durable prepared state exactly; any discrepancy rejects with `DistributionEpochConflictError`. The caller-supplied `nowMs` parameter serves as an invocation and caller-coordination reference and MUST NOT override or substitute for the controller-authoritative `Clock.nowMs()` value when recording `commitAt`. `commitAt` has one authoritative source: the controller's injected `Clock`, which returns non-decreasing UTC Unix epoch-millisecond safe integers. During the same lock transaction, the controller reads `Clock.nowMs()` once, sets `commitAt` to that value, derives `decisionId`, and persists `COMMIT_DURABLE`. It is irrevocable: it commits only the distribution controller's choice of target manifest/epoch and does not ratify, activate, or mutate policy. `commitAt` is mandatory and immutable in every state from `COMMIT_DURABLE` onward. It has UTC epoch-millisecond precision, no timezone string, and must satisfy `preparedAt <= commitAt <= manifest.expiresAt`. Missing, non-safe-integer, earlier-than-prepared, later-than-expiry, or altered `commitAt` is `DistributionEpochConflictError`. Node timestamps are accepted only in `[commitAt - 5000, nowMs + 5000]`; node clock skew is therefore bounded to 5000ms in either direction. Failed delivery never changes `commitAt` and never creates a competing epoch.

After durable commit, each node receives the idempotency key `(decisionId,nodeId,'COMMIT')`. The coordinator makes the initial delivery and then retries a failed, rejected, or missing acknowledgement every 1000ms until 30000ms after `commitAt`, for at most 30 total attempts per node. A duplicate COMMIT with the same key must return the node's current committed binding and must not activate a second time. Success requires a valid `COMMITTED` receipt containing the exact manifest ID, fingerprint, policy version/hash, epoch, and PEP-binding claim. The post-commit convergence numerator counts only these `IN_SYNC` nodes; the pre-commit numerator counts only `PREPARED` nodes. The controller writes `COMMIT_DELIVERY`, then `ATTESTATION_PENDING`, and evaluates after each result.

At retry expiry, nodes without a valid COMMITTED receipt are quarantined with `COMMIT_DELIVERY_EXHAUSTED`; the epoch becomes `RECOVERY_EXHAUSTED` if any such node exists, otherwise `CONVERGED`. A valid observed old/different hash, epoch, version, or PEP-binding claim is `DIVERGED`, immediately quarantines that node, and records split-brain evidence. Reconciliation is receipt-based: it requests no new policy, reads the node's signed receipt fields, compares them to the durable manifest/decision, and either marks `IN_SYNC` or quarantines. Recovery reloads the durable decision under lock and resumes only unfinished COMMIT deliveries using the same decision ID, commitAt, and retry budget calculated from the persisted commitAt; it never runs PREPARE again and never creates a new epoch. No protocol claim is made that remote clocks or networks provide globally atomic activation.

## 9. Quarantine, stops, tenancy, persistence, and ledger

Quarantine reasons are exactly `HASH_MISMATCH | SIGNATURE_INVALID | DELIVERY_TIMEOUT | COMMIT_DELIVERY_EXHAUSTED | STALE_EPOCH | CROSS_TENANT | STALE_HEARTBEAT | MANIFEST_TAMPERED | SPLIT_BRAIN`. A valid trigger creates an immutable record, updates registry state to `QUARANTINED`, appends `NODE_QUARANTINED`, and calls the injected `PolicyQuarantinePublicationAdapter`; it does not assume an existing PEP API. The adapter is a narrow node-isolation contract, not a PDP, PEP, lifecycle, ratification, authorization, or mutation API.

`quarantine` accepts a request only from component 1221, 1222, 1223, or 1224, identified by an internal non-exported caller token installed by component 1227; all other callers receive `DistributionQuarantineError`. The reason/evidence pair is valid only when: `HASH_MISMATCH`, `SIGNATURE_INVALID`, `STALE_EPOCH`, `MANIFEST_TAMPERED`, or `SPLIT_BRAIN` has a verifier-produced rejected receipt/result; `DELIVERY_TIMEOUT` has a recorded 1221 deadline result; `COMMIT_DELIVERY_EXHAUSTED` has the persisted 1224 retry ledger; `STALE_HEARTBEAT` has the registry's derived stale calculation; and `CROSS_TENANT` has a tenant/federation/domain comparison failure. `evidenceFingerprint` is `hash(verified evidence)` using the contract in section 5. A reason not matching its evidence source is rejected before registry mutation or adapter publication. This gate is operational safety validation, not policy authority.

The controller creates a request with the record bindings, current upstream policy version/hash, `issuedAt=Clock.nowMs()`, and a new UUIDv4 nonce. `requestId = sha256(canonicalJson({tenantId,federationId,nodeId,policyDomain,canonicalPolicyHash,quarantineEpoch,nonce}))`. Its proof payload is every request field except `proof`; `proof=hmacSha256(DistributionControlKeyResolver.resolve(tenantId,federationId,nodeId,keyId), canonicalJson(payload))`. Missing/throwing resolver or invalid proof fails closed. The adapter validates tenant, federation, node, domain, hash, epoch, `issuedAt` age no greater than 30000ms, and proof before publication. It returns only `ACK_SUCCESS`, `ACK_REJECTED`, or `ACK_INVALID`; a throw or no result by the 5000ms deadline is `ACK_TIMEOUT`. An acknowledgement must bind the same request ID, node ID, tenant ID, federation ID, policy domain, and quarantine epoch, and carry an HMAC verified by `NodeAttestationKeyResolver.resolve(tenantId, federationId, nodeId, keyId)`; any mismatch is `ACK_INVALID`. The canonical payload for verifying `QuarantinePublicationAck.proof` is byte-for-byte deterministic: `proof = hmacSha256(resolvedKey, canonicalJson({requestId: ack.requestId, status: ack.status, nodeId: ack.nodeId, tenantId: ack.tenantId, federationId: ack.federationId, policyDomain: ack.policyDomain, quarantineEpoch: ack.quarantineEpoch, timestamp: ack.timestamp, keyId: ack.keyId}))`, where `proof` itself is excluded from the payload, no request fields outside these are merged into the hash input, and missing/null or unresolvable key fails closed with `ACK_INVALID`.

The same request ID is idempotent: `ACK_SUCCESS` returns the stored result without reapplying isolation; a rejected, invalid, or timeout result is retried every 1000ms for five total attempts, then recorded as its terminal failure. A stale request, lower epoch, wrong tenant/domain, malformed nonce, or wrong proof is rejected and never changes the node record. On adapter failure the distribution registry remains quarantined, no release is allowed, and all later distribution/attestation eligibility checks deny that node. The adapter's inability to acknowledge does not claim a remote PEP has been changed; it preserves fail-closed controller treatment until a valid acknowledgement and later receipt-based release. A node is released only after an unexpired valid `COMMITTED` receipt for the current committed upstream policy/epoch, a valid adapter `ACK_SUCCESS` reconciliation, and explicit `releaseQuarantine`. None of these actions ratifies, activates, authorizes, or mutates policy.

The emergency stop provider is mandatory and is called before manifest creation, every adapter call, receipt ingestion, epoch mutation, quarantine mutation, and persistence mutation. Only strict boolean `false` permits the operation. `true`, absent provider, undefined, null, a thrown value, or any non-boolean fails closed with `DistributionEmergencyStopActiveError`. The only exception is best-effort in-memory creation of an emergency-stop audit event; it must not perform persistence, transport, or any other mutation while stopped. This is consistent with the fail-closed provider behavior in MS-1.5.20 and MS-1.5.21.

All paths are confined to `data/partitions_policy_distribution/<tenantId>/<policyDomain>/`. Registry: `nodes.json`; manifests: `manifests/<manifestId>.json`; nonce registry: `nonces.json`; epoch decisions: `epochs.json`; quarantine records: `quarantine.json`; ledger: `audit.jsonl`. Validation occurs before path construction. Each mutating operation obtains `<target>.lock` with exclusive create and waits at most 5000ms; contention is `DistributionLockTimeoutError`. Under lock it reloads and validates current data. It writes JSON to a same-directory `<target>.tmp`, fsyncs it, validates its canonical hash where applicable, atomically renames it over the target, then releases the lock. A stale lock, invalid JSON, unexpected record, or broken hash chain is `DistributionPersistenceCorruptionError` and blocks the operation; there is no silent last-write-wins behavior. Locks and temporary files are never trusted across tenant/domain paths.

`append(eventInput,nowMs)` accepts exactly `DistributionAuditEventInput`; `timestamp=nowMs` and `eventId` is a fresh UUIDv4 from the injected generator. `data` accepts only the recursive `DistributionAuditData` union: a finite number, NFC-valid string, boolean, null, array, or plain object. Maximum depth is 16, each array/object contains at most 100 members, each string is at most 8192 UTF-8 bytes, and the fully scrubbed canonical data is at most 65536 UTF-8 bytes. Unsupported types, non-finite numbers, a key normalization collision, or an over-limit value is `DistributionValidationError`. Unknown data fields are allowed only if they satisfy these limits; they never alter event type semantics.

Before canonicalization, scrub recursively: primitive null/boolean/finite number is retained; arrays are scrubbed in order; object keys are NFC-normalized and inspected case-insensitively. A value is replaced by the exact string `[REDACTED]` if its normalized key matches `authorization`, `password`, `passwd`, `secret`, `token`, `api_key`, `apikey`, `private_key`, `credential`, `cookie`, or `session`, including hyphen/underscore/camel-case variants after removing non-alphanumeric characters; or if its string value contains case-insensitive `bearer ` followed by a non-whitespace character, `-----BEGIN` followed by `PRIVATE KEY-----`, or `BOW_GOVERNANCE_HMAC_SECRET`. Keys remain visible, while their values are redacted. Raw HMAC keys, HMAC proofs, bearer/access tokens, passwords, private keys, API credentials, authorization-header values, and session secrets are prohibited from the persisted event data, error detail, and hash input. The exact order is `validate -> recursively scrub -> canonicalJson -> hash -> persist`.

Every ledger event has `eventId`, `eventType`, `timestamp`, `tenantId`, `policyDomain`, `actorSource`, `previousHash`, `eventHash`, and scrubbed `data`. `actorSource` is `SYSTEM`, `TRANSPORT_ADAPTER`, or `NODE:<nodeId>` after identifier validation. The exact event types are `NODE_REGISTERED`, `NODE_HEARTBEAT`, `MANIFEST_PACKAGED`, `PREPARE_DELIVERED`, `DELIVERY_FAILED`, `RECEIPT_ACCEPTED`, `RECEIPT_REJECTED`, `NONCE_REPLAY_REJECTED`, `CONVERGENCE_EVALUATED`, `EPOCH_PREPARED`, `EPOCH_COMMIT_DURABLE`, `EPOCH_COMMIT_DELIVERY`, `EPOCH_CONVERGED`, `EPOCH_DIVERGED`, `EPOCH_RECOVERY_EXHAUSTED`, `EPOCH_ABORTED`, `SPLIT_BRAIN_DETECTED`, `NODE_QUARANTINED`, `NODE_QUARANTINE_RELEASED`, `QUARANTINE_PUBLICATION_FAILED`, `TENANT_ACCESS_REJECTED`, `EMERGENCY_STOP_BLOCKED`, `LOCK_TIMEOUT`, `PERSISTENCE_CORRUPTION`, `LEDGER_VERIFIED`. The first event uses the genesis previous hash. Verification reads from genesis, recomputes each hash, requires each `previousHash` to equal the prior event hash, and rejects the first failure.

## 10. Public API cross-reference and errors

Normative Concurrency and Asynchronous Boundary Rule: All MS-1.5.25 public APIs that invoke an injected transport adapter, quarantine publication adapter, filesystem persistence, lock acquisition, or other asynchronous boundary are asynchronous and return `Promise<T>`. No synchronous blocking abstraction is permitted. Pure in-memory deterministic queries that read already-loaded state and perform no asynchronous I/O (`getFleetCohort`, `evaluate`, `get`) remain synchronous.

Every mutating public method accepts `nowMs` from an injected monotonic testable clock and performs tenant validation before mutation. Each mutation is idempotent only as stated.

| Component | Method(input) -> output | Authority / mutation / persistence | Errors | Idempotency / audit |
|---|---|---|---|---|
| 1219 | `registerNode(record, nowMs) -> Promise<FleetNodeRecord>`; `recordHeartbeat(tenantId,federationId,nodeId,nowMs) -> Promise<FleetNodeRecord>`; `getFleetCohort(tenantId,federationId,domain,ring,nowMs) -> readonly FleetNodeRecord[]` | Registration only; first two mutate `nodes.json` under lock | validation, tenant isolation, stop, lock, corruption | exact duplicate register returns stored equal record; `NODE_REGISTERED` / `NODE_HEARTBEAT` |
| 1220 | `packageManifest(CanonicalStrategicPolicy,AuthoritativeRatificationRecord,PolicyLifecycleRecord,targetFederation:string,ring:CanaryRing,targetEpoch:number,nowMs) -> Promise<PolicyDistributionManifest>` | Reads authoritative upstream policy/lifecycle state; persists immutable manifest under lock | manifest validation, tenant isolation, stop, lock, corruption | each call creates one unique manifest ID/nonce/fingerprint; `MANIFEST_PACKAGED` |
| 1221 | `deliverPrepare(manifest,readonly FleetNodeRecord[],nowMs) -> Promise<DeliveryBatchResult>`; `deliverCommit(decision,readonly FleetNodeRecord[],nowMs) -> Promise<DeliveryBatchResult>`; `deliverAbort(decision,readonly FleetNodeRecord[],nowMs) -> Promise<DeliveryBatchResult>` | Coordination only; loads the referenced manifest to calculate deadline and calls async transport adapter | stop, transport, timeout, tenant isolation | one attempt per invocation/message key; `PREPARE_DELIVERED` or `DELIVERY_FAILED` |
| 1222 | `verifyReceipt(receipt,manifest,nowMs) -> Promise<VerifiedReceipt>` | Consumes nonce and updates node receipt state under lock | attestation verification, nonce replay, tenant isolation, stop, lock | no replay idempotency; `RECEIPT_ACCEPTED` / `RECEIPT_REJECTED` |
| 1223 | `evaluate(manifest,nowMs) -> FleetConvergenceReport` | Read-only calculation over in-memory cohort read model | validation, tenant isolation, stop | deterministic same stored state/clock; `CONVERGENCE_EVALUATED` |
| 1224 | `prepare(manifest,nowMs) -> Promise<EpochDecision>`; `commit(manifest,nowMs) -> Promise<EpochDecision>`; `abort(manifest,reason,nowMs) -> Promise<EpochDecision>`; `recover(tenantId,domain,nowMs) -> Promise<readonly EpochDecision[]>` | Epoch record mutation, lock acquisition, and bounded retry scheduling; no lifecycle mutation | epoch conflict, stop, convergence, transport, lock, corruption | `COMMIT_DURABLE` is immutable; recovery reuses decision ID/commitAt; `EPOCH_*` |
| 1225 | `quarantine(QuarantineInput,nowMs) -> Promise<NodeQuarantineRecord>`; `release(NodeRef,NodePolicyAttestationReceipt,nowMs) -> Promise<NodeQuarantineRecord>`; `get(NodeRef) -> NodeQuarantineRecord \| undefined` | Registry/quarantine mutation under lock and injected publication adapter call; `get` is synchronous read model query | quarantine publication, attestation, tenant isolation, stop, lock | same request ID is idempotent; `NODE_QUARANTINED` / `NODE_QUARANTINE_RELEASED` |
| 1226 | `append(DistributionAuditEventInput,nowMs) -> Promise<DistributionAuditRecord>`; `verify(tenantId,domain) -> Promise<LedgerVerificationResult>` | Audit append / read with lock acquisition and file verification | validation, ledger integrity, lock, corruption, stop for append | event ID once; event types listed above |
| 1227 | `executeDistributionPipeline(input,nowMs) -> Promise<DistributionPipelineResult>` | Orchestrates 1219-1226 across asynchronous boundaries | any component error unchanged | idempotency is the component rules above; emits no undocumented event |

All named errors extend `GovernedPolicyDistributionBaseError`: `DistributionValidationError`, `DistributionTenantIsolationError`, `DistributionManifestValidationError`, `DistributionCanonicalizationError`, `DistributionTransportError`, `DistributionTimeoutError`, `DistributionAttestationVerificationError`, `DistributionNonceReplayError`, `DistributionConvergenceError`, `DistributionEpochConflictError`, `DistributionQuarantineError`, `DistributionQuarantinePublicationError`, `DistributionEmergencyStopActiveError`, `DistributionLockTimeoutError`, `DistributionPersistenceCorruptionError`, and `DistributionLedgerIntegrityError`. No other error name is part of this specification.

## 11. Suite #119 specification

Suite #119 has exactly 180 deterministic vectors, 18 each: 01 authority/non-authoritative invariants; 02 identity validation and tenant isolation; 03 registry, uniqueness, ring and heartbeat; 04 MS-1.5.20 canonical-policy reconstruction versus `compiledRules`, lifecycleVersion binding, fingerprint and expiry; 05 injected transport boundary, single attempt, target node binding and deadline; 06 receipt HMAC, key resolution, nonce, freshness and PEP-binding claim limits; 07 convergence equation, zero denominator, stale/quarantined and thresholds; 08 prepare/ack/commit, re-validated manifest, immutable commitAt, post-durable retries, recovery, and split-brain; 09 quarantine trigger-evidence mapping, COMMIT_DELIVERY_EXHAUSTED, deterministic HMAC adapter acknowledgement proof payload, retry, and receipt-bound release; 10 persistence lock/reload/atomic replacement, canonical JSON edge cases, secret scrubbing, ledger genesis/chain and full pipeline. Each group includes its stated failure paths, emergency-stop fail-closed behavior where it mutates, and the corresponding component APIs. `18 * 10 = 180`.

## 12. Completion firewall

There are no placeholder contracts in this specification. It allocates no component outside 1218-1227, defines no successor architecture, and provides no implementation authorization. The only permitted next action is an independent pre-implementation audit followed, if appropriate, by explicit human authorization.

```text
MS-1.5.25 MASTER SPECIFICATION = REMEDIATED & CLARIFIED
IMPLEMENTATION = NOT AUTHORIZED
TEST IMPLEMENTATION = NOT AUTHORIZED
COMPONENT MATRIX MODIFICATION = NOT AUTHORIZED
```
