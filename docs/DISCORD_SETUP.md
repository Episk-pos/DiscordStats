# Discord Bot Setup Guide

This guide walks you through creating a Discord Application and Bot, obtaining the necessary credentials, and inviting the bot to your server.

## Prerequisites

- A Discord account
- A Discord server where you have admin permissions (or create a new one for testing)

## Step 1: Create a Discord Application

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Log in with your Discord account if prompted
3. Click the **"New Application"** button (top right)
4. Enter a name for your application (e.g., "Discord Stats Bot")
5. Accept the Developer Terms of Service
6. Click **"Create"**

You'll be taken to your application's General Information page.

## Step 2: Get Your Client ID and Client Secret

From your application's page:

1. You're already on the **"General Information"** tab
2. Find **"Application ID"** - this is your `DISCORD_CLIENT_ID`
3. Click **"Reset Secret"** under Client Secret, then confirm
4. Copy the revealed secret - this is your `DISCORD_CLIENT_SECRET`

> **Important:** The Client Secret is only shown once. Save it securely now.

## Step 3: Create a Bot

1. Click **"Bot"** in the left sidebar
2. Click **"Add Bot"** and confirm with **"Yes, do it!"**
3. Under the bot's username, click **"Reset Token"** and confirm
4. Copy the token - this is your `DISCORD_BOT_TOKEN`

> **Security Warning:** Never share your bot token. Anyone with this token can control your bot. If it's ever exposed, immediately reset it.

## Step 4: Configure Bot Permissions

Still on the Bot page:

### Privileged Gateway Intents

Scroll down to **"Privileged Gateway Intents"** and enable:

- **Server Members Intent** - Required to fetch member information
- **Message Content Intent** - Required to analyze message content and emojis

Click **"Save Changes"** if prompted.

### Bot Permissions

The bot needs these permissions to function:
- Read Messages/View Channels
- Read Message History

These will be configured when generating the invite URL.

## Step 5: Generate Bot Invite URL

1. Click **"OAuth2"** in the left sidebar
2. Click **"URL Generator"** in the submenu
3. Under **"Scopes"**, check:
   - `bot`
4. Under **"Bot Permissions"**, check:
   - `View Channels` (under General Permissions)
   - `Read Message History` (under Text Permissions)
5. Copy the **"Generated URL"** at the bottom

## Step 6: Invite the Bot to Your Server

1. Paste the generated URL into your browser
2. Select the server you want to add the bot to from the dropdown
3. Click **"Continue"**
4. Review the permissions and click **"Authorize"**
5. Complete any CAPTCHA if prompted

The bot should now appear in your server's member list (it will be offline until you start the application).

## Step 7: Get Your Server ID

To use the Dashboard, you'll need your Discord Server ID:

1. Open Discord (desktop or web app)
2. Go to **User Settings** (gear icon near your username)
3. Navigate to **App Settings** → **Advanced**
4. Enable **Developer Mode**
5. Close settings
6. Right-click on your server name in the server list
7. Click **"Copy Server ID"**

## Step 8: Configure the Application

Add your credentials to `server/.env`:

```env
# Discord Bot Configuration
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_CLIENT_SECRET=your_client_secret_here
DISCORD_REDIRECT_URI=http://localhost:5173/auth/callback

# Server Configuration
PORT=3002
NODE_ENV=development
```

Replace the placeholder values with your actual credentials.

## Verification Checklist

Before running the application, verify:

- [ ] Application created in Developer Portal
- [ ] Client ID copied to `.env`
- [ ] Client Secret copied to `.env`
- [ ] Bot created and token copied to `.env`
- [ ] Server Members Intent enabled
- [ ] Message Content Intent enabled
- [ ] Bot invited to your server
- [ ] Server ID copied for use in Dashboard

## Troubleshooting

### "Missing Access" or "Missing Permissions" errors
- Ensure the bot has been invited to the server
- Check that the bot has the required permissions
- Verify the Server ID is correct

### Bot not responding / No data loading
- Confirm the bot token is correct in `.env`
- Check that both Privileged Gateway Intents are enabled
- Restart the server after changing `.env`

### "Invalid Token" error
- Reset your bot token in the Developer Portal
- Update `server/.env` with the new token
- Tokens can become invalid if regenerated or if the bot is deleted

### Rate limiting
- Discord has rate limits on API requests
- If you see 429 errors, wait a few minutes before retrying
- Avoid rapid repeated requests

## Security Best Practices

1. **Never commit `.env` files** - They're already in `.gitignore`
2. **Rotate tokens periodically** - Reset your bot token occasionally
3. **Use minimal permissions** - Only request what the bot needs
4. **Monitor bot activity** - Check the Developer Portal for usage stats
