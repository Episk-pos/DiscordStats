import { Request, Response } from 'express';
import axios from 'axios';
import crypto from 'crypto';
import { signToken, verifyToken, getTokenExpiration } from '../utils/jwt';

const DISCORD_API_URL = 'https://discord.com/api/v10';
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID!;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET!;
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'http://localhost:3002/auth/discord/callback';

// Store state tokens for CSRF protection (in production, use Redis or similar)
const stateTokens = new Map<string, { redirectUri?: string; createdAt: number }>();

// Clean up expired state tokens periodically
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of stateTokens.entries()) {
    if (now - data.createdAt > 10 * 60 * 1000) { // 10 minutes
      stateTokens.delete(token);
    }
  }
}, 60 * 1000);

/**
 * GET /auth/discord
 * Initiates Discord OAuth flow
 */
export const initiateOAuth = (req: Request, res: Response) => {
  const { redirect_uri, state: clientState } = req.query;

  // Generate CSRF state token
  const stateToken = crypto.randomBytes(32).toString('hex');
  stateTokens.set(stateToken, {
    redirectUri: redirect_uri as string | undefined,
    createdAt: Date.now(),
  });

  // Combine our state with client's state if provided
  const state = clientState ? `${stateToken}:${clientState}` : stateToken;

  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: DISCORD_REDIRECT_URI,
    response_type: 'code',
    scope: 'identify guilds email',
    state,
  });

  const authUrl = `https://discord.com/api/oauth2/authorize?${params.toString()}`;
  res.redirect(authUrl);
};

/**
 * GET /auth/discord/callback
 * Handles Discord OAuth callback, exchanges code for tokens
 */
export const handleCallback = async (req: Request, res: Response) => {
  const { code, state, error, error_description } = req.query;

  if (error) {
    console.error('OAuth error:', error, error_description);
    return res.status(400).json({
      error: 'oauth_error',
      message: error_description || 'OAuth authorization failed',
    });
  }

  if (!code || !state) {
    return res.status(400).json({
      error: 'missing_params',
      message: 'Missing authorization code or state',
    });
  }

  // Validate state token for CSRF protection
  const [stateToken, clientState] = (state as string).split(':');
  const stateData = stateTokens.get(stateToken);

  if (!stateData) {
    return res.status(400).json({
      error: 'invalid_state',
      message: 'Invalid or expired state token',
    });
  }

  stateTokens.delete(stateToken);

  try {
    // Exchange code for access token
    const tokenResponse = await axios.post(
      `${DISCORD_API_URL}/oauth2/token`,
      new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: DISCORD_REDIRECT_URI,
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    const { access_token } = tokenResponse.data;

    // Fetch user info from Discord
    const userResponse = await axios.get(`${DISCORD_API_URL}/users/@me`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const discordUser = userResponse.data;

    // Generate JWT
    const jwt = signToken({
      sub: discordUser.id,
      username: discordUser.username,
      discriminator: discordUser.discriminator || '0',
      avatar: discordUser.avatar,
      email: discordUser.email,
    });

    // If there's a redirect URI, redirect with token
    if (stateData.redirectUri) {
      const redirectUrl = new URL(stateData.redirectUri);
      redirectUrl.searchParams.set('token', jwt);
      if (clientState) {
        redirectUrl.searchParams.set('state', clientState);
      }
      return res.redirect(redirectUrl.toString());
    }

    // Otherwise return JSON response
    res.json({
      token: jwt,
      user: {
        id: discordUser.id,
        username: discordUser.username,
        discriminator: discordUser.discriminator || '0',
        avatar: discordUser.avatar,
        email: discordUser.email,
      },
      expires_at: getTokenExpiration(jwt)?.toISOString(),
    });
  } catch (error: any) {
    console.error('OAuth callback error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'token_exchange_failed',
      message: 'Failed to exchange authorization code for token',
    });
  }
};

/**
 * GET /auth/validate
 * Validates bearer token and returns user info (used by RallyRound)
 */
export const validateToken = (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'missing_token',
      message: 'Authorization header with Bearer token required',
    });
  }

  const token = authHeader.slice(7);
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({
      error: 'invalid_token',
      message: 'Token is invalid or expired',
    });
  }

  res.json({
    valid: true,
    user: {
      id: decoded.sub,
      username: decoded.username,
      discriminator: decoded.discriminator,
      avatar: decoded.avatar,
      email: decoded.email,
    },
    expires_at: new Date(decoded.exp * 1000).toISOString(),
  });
};

/**
 * GET /auth/user
 * Returns full authenticated user profile with guilds
 */
export const getUserProfile = async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'missing_token',
      message: 'Authorization header with Bearer token required',
    });
  }

  const token = authHeader.slice(7);
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({
      error: 'invalid_token',
      message: 'Token is invalid or expired',
    });
  }

  // For full profile with guilds, we need to fetch from Discord
  // This requires the user to have authorized with 'guilds' scope
  // Since we store JWT (not Discord token), we return cached user info
  // and note that guilds would require re-authorization
  res.json({
    id: decoded.sub,
    username: decoded.username,
    discriminator: decoded.discriminator,
    avatar: decoded.avatar,
    email: decoded.email,
    // Note: To get guilds, the client should initiate a new OAuth flow
    // or we need to store the Discord access token (with security implications)
    guilds: [],
    _note: 'Guild list requires Discord access token. Re-authenticate if needed.',
  });
};
