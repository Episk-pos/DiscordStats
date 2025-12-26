import { Router } from 'express';
import {
  initiateOAuth,
  handleCallback,
  validateToken,
  getUserProfile,
} from '../controllers/authController';

const router = Router();

// GET /auth/discord - Initiate OAuth flow
router.get('/discord', initiateOAuth);

// GET /auth/discord/callback - Handle OAuth callback
router.get('/discord/callback', handleCallback);

// GET /auth/validate - Validate token (for RallyRound)
router.get('/validate', validateToken);

// GET /auth/user - Get full user profile
router.get('/user', getUserProfile);

export default router;
