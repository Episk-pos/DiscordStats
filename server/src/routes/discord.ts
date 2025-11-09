import { Router } from 'express';
import { getGuildStats, getUserActivity, getMessageStats } from '../controllers/discordController';

const router = Router();

// OAuth endpoints
router.get('/auth/url', (req, res) => {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = process.env.DISCORD_REDIRECT_URI || 'http://localhost:5173/auth/callback';
  const scope = 'identify guilds guilds.members.read';

  const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}`;

  res.json({ url: authUrl });
});

router.post('/auth/token', async (req, res) => {
  try {
    const { code } = req.body;
    const clientId = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    const redirectUri = process.env.DISCORD_REDIRECT_URI || 'http://localhost:5173/auth/callback';

    const params = new URLSearchParams({
      client_id: clientId!,
      client_secret: clientSecret!,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    });

    const response = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      body: params,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Token exchange error:', error);
    res.status(500).json({ error: 'Failed to exchange token' });
  }
});

// Stats endpoints
router.get('/stats/guild/:guildId', getGuildStats);
router.get('/stats/user/:userId', getUserActivity);
router.get('/stats/messages/:guildId', getMessageStats);

export default router;
