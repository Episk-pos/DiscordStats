import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { sessionRegistry } from '../services/rallyround';

// Maximum age for webhook timestamps (5 minutes)
const MAX_TIMESTAMP_AGE_MS = 5 * 60 * 1000;

export interface WebhookPayload {
  event: string;
  sessionId: string;
  timestamp: string;
  data: any;
}

/**
 * Verify HMAC-SHA256 signature of webhook request
 */
export function verifySignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

/**
 * Validate webhook timestamp is within acceptable range
 */
export function isTimestampValid(timestamp: string): boolean {
  const webhookTime = new Date(timestamp).getTime();
  const now = Date.now();

  // Check if timestamp is valid
  if (isNaN(webhookTime)) {
    return false;
  }

  // Check if timestamp is within acceptable range
  return Math.abs(now - webhookTime) <= MAX_TIMESTAMP_AGE_MS;
}

/**
 * Express middleware to verify webhook requests
 */
export function webhookAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const signature = req.headers['x-rallyround-signature'] as string;
  const timestamp = req.headers['x-rallyround-timestamp'] as string;

  if (!signature || !timestamp) {
    res.status(401).json({
      error: 'missing_headers',
      message: 'Missing required webhook headers',
    });
    return;
  }

  // Validate timestamp
  if (!isTimestampValid(timestamp)) {
    res.status(401).json({
      error: 'stale_timestamp',
      message: 'Webhook timestamp is too old or invalid',
    });
    return;
  }

  const payload = req.body as WebhookPayload;

  if (!payload.sessionId) {
    res.status(400).json({
      error: 'missing_session_id',
      message: 'Session ID is required',
    });
    return;
  }

  // Get the session to find the webhook secret
  const session = sessionRegistry.getBySessionId(payload.sessionId);

  if (!session) {
    res.status(404).json({
      error: 'session_not_found',
      message: 'Session not found',
    });
    return;
  }

  // Verify signature
  const rawBody = JSON.stringify(req.body);
  if (!verifySignature(rawBody, signature, session.webhookSecret)) {
    res.status(401).json({
      error: 'invalid_signature',
      message: 'Invalid webhook signature',
    });
    return;
  }

  // Attach session to request for use in handlers
  (req as any).session = session;

  next();
}
