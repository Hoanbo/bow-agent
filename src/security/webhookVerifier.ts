// src/security/webhookVerifier.ts
// BOWCON V4.0 — HARDENED WEBHOOK VERIFIER & ANTI-REPLAY ENGINE
// Compliant with NIST AI RMF & OWASP API Security

import crypto from 'node:crypto';

export interface WebhookVerificationResult {
  valid: boolean;
  reason?: string;
}

export class WebhookVerifier {
  private secret: string;
  private maxAgeSeconds: number;
  private seenNonces = new Map<string, number>();

  constructor(secret: string, maxAgeSeconds: number = 300) {
    this.secret = secret;
    this.maxAgeSeconds = maxAgeSeconds;
  }

  /**
   * Verify HMAC-SHA256 signature with constant-time equality and nonce replay protection
   */
  public verify(params: {
    rawBody: string;
    signatureHeader?: string;
    timestampHeader?: string;
    nonceHeader?: string;
  }): WebhookVerificationResult {
    if (!this.secret) {
      return { valid: false, reason: 'WEBHOOK_SECRET_NOT_CONFIGURED' };
    }

    const { rawBody, signatureHeader, timestampHeader, nonceHeader } = params;

    if (!signatureHeader) {
      return { valid: false, reason: 'MISSING_SIGNATURE_HEADER' };
    }

    if (!timestampHeader) {
      return { valid: false, reason: 'MISSING_TIMESTAMP_HEADER' };
    }

    const timestamp = parseInt(timestampHeader, 10);
    if (isNaN(timestamp)) {
      return { valid: false, reason: 'INVALID_TIMESTAMP_FORMAT' };
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    const age = nowSeconds - timestamp;

    // Reject timestamps older than maxAgeSeconds or more than 60s in the future
    if (age > this.maxAgeSeconds) {
      return { valid: false, reason: 'EXPIRED_TIMESTAMP: Webhook exceeded maximum age' };
    }
    if (age < -60) {
      return { valid: false, reason: 'FUTURE_TIMESTAMP: Clock skew exceeds safe threshold' };
    }

    // Extract signature hex (supports "v1=<hex>" or raw hex)
    const expectedHex = signatureHeader.startsWith('v1=')
      ? signatureHeader.slice(3).trim()
      : signatureHeader.trim();

    // Compute expected HMAC
    const payloadToSign = `${timestamp}.${rawBody}`;
    const hmac = crypto.createHmac('sha256', this.secret);
    hmac.update(payloadToSign);
    const computedHex = hmac.digest('hex');

    // Constant-time comparison to prevent timing attacks
    try {
      const computedBuf = Buffer.from(computedHex, 'utf8');
      const expectedBuf = Buffer.from(expectedHex, 'utf8');

      if (computedBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(computedBuf, expectedBuf)) {
        return { valid: false, reason: 'INVALID_SIGNATURE: HMAC verification failed' };
      }
    } catch {
      return { valid: false, reason: 'SIGNATURE_BUFFER_ERROR' };
    }

    // Replay attack defense via Nonce check (Only consumed AFTER signature passes)
    if (nonceHeader) {
      this.purgeExpiredNonces(nowSeconds);
      if (this.seenNonces.has(nonceHeader)) {
        return { valid: false, reason: 'REPLAY_ATTACK_DETECTED: Nonce already used' };
      }
      this.seenNonces.set(nonceHeader, timestamp);
    }

    return { valid: true };
  }

  /**
   * Helper to generate valid headers for webhook dispatch / test simulation
   */
  public generateHeaders(rawBody: string, nonce?: string): {
    'x-bow-signature': string;
    'x-bow-timestamp': string;
    'x-bow-nonce': string;
  } {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const effectiveNonce = nonce || crypto.randomBytes(12).toString('hex');
    const payloadToSign = `${timestamp}.${rawBody}`;
    const hmac = crypto.createHmac('sha256', this.secret);
    hmac.update(payloadToSign);
    const signature = `v1=${hmac.digest('hex')}`;

    return {
      'x-bow-signature': signature,
      'x-bow-timestamp': timestamp,
      'x-bow-nonce': effectiveNonce,
    };
  }

  private purgeExpiredNonces(nowSeconds: number): void {
    const cutoff = nowSeconds - this.maxAgeSeconds;
    for (const [nonce, ts] of this.seenNonces.entries()) {
      if (ts < cutoff) {
        this.seenNonces.delete(nonce);
      }
    }
  }
}

export const globalWebhookVerifier = new WebhookVerifier(
  process.env.BOW_SHOP_WEBHOOK_SECRET || 'bow_webhook_secret_default'
);

