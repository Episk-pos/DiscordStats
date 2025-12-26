import { Router, Request, Response } from 'express';
import { webhookAuthMiddleware, WebhookPayload } from './security';
import { handleWebhookEvent } from './handlers';
import { ActiveSession } from '../services/rallyround';

const router = Router();

/**
 * POST /webhooks/rallyround
 * Receive webhooks from RallyRound
 */
router.post('/rallyround', webhookAuthMiddleware, async (req: Request, res: Response) => {
  const payload = req.body as WebhookPayload;
  const session = (req as any).session as ActiveSession;

  console.log(`Received webhook: ${payload.event} for session ${payload.sessionId}`);

  try {
    await handleWebhookEvent(payload.event, session, payload.data);

    res.json({
      success: true,
      message: 'Webhook processed',
    });
  } catch (error) {
    console.error('Webhook processing error:', error);

    res.status(500).json({
      success: false,
      error: 'processing_error',
      message: 'Failed to process webhook',
    });
  }
});

export default router;
