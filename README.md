# Discord Stats

A beautiful, full-stack application for visualizing Discord server statistics and analytics. Track member activity, message trends, popular emojis, and more with stunning, motivating visualizations.

## Features

- **Real-time Server Statistics** - View member counts, online status, channels, and server boosts
- **Message Analytics** - Track message patterns by hour, channel, and user
- **Top Contributors** - See who's most active in your community
- **Emoji Analytics** - Discover your server's most-used emojis
- **Beautiful Visualizations** - Interactive charts powered by Recharts
- **Smooth Animations** - Delightful UI animations with Framer Motion
- **Discord-themed UI** - Familiar color scheme and design language

## Tech Stack

### Frontend
- **React** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Recharts** - Data visualization
- **Framer Motion** - Animations
- **Axios** - HTTP client
- **Lucide React** - Icons

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **TypeScript** - Type safety
- **Discord.js** - Discord API wrapper
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment variables

## Prerequisites

Before you begin, ensure you have:
- Node.js (v18 or higher)
- npm or yarn
- A Discord account
- A Discord Application/Bot

## Discord Bot Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to the "Bot" section and click "Add Bot"
4. Enable these **Privileged Gateway Intents**:
   - Server Members Intent
   - Message Content Intent
5. Copy your Bot Token (you'll need this later)
6. Go to the "OAuth2" section and copy your Client ID and Client Secret
7. Go to OAuth2 > URL Generator:
   - Select scopes: `bot`
   - Select bot permissions: `View Channels` (General Permissions), `Read Message History` (Text Permissions)
   - Copy the generated URL and use it to invite the bot to your server

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd DiscordStats
```

### 2. Install dependencies

```bash
npm install
npm run install:all
```

This installs root dependencies (including `concurrently` for running both servers) and all dependencies for both the client and server.

### 3. Configure server environment

```bash
cp server/.env.example server/.env
```

Edit `server/.env` and add your Discord credentials:

```env
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_CLIENT_SECRET=your_client_secret_here
DISCORD_REDIRECT_URI=http://localhost:5173/auth/callback
PORT=3001
```

### 4. Configure client environment (optional)

```bash
cp client/.env.example client/.env
```

The default configuration should work for local development.

## Running the Application

### Development Mode

From the project root, run both frontend and backend concurrently:

```bash
npm run dev
```

This starts:
- Backend server on `http://localhost:3002`
- Frontend dev server on `http://localhost:5173`

Alternatively, run them separately in two terminal windows:

```bash
# Terminal 1 - Backend
npm run dev --prefix server

# Terminal 2 - Frontend
npm run dev --prefix client
```

### Production Build

**Backend:**
```bash
cd server
npm run build
npm start
```

**Frontend:**
```bash
cd client
npm run build
npm run preview
```

## Usage

1. Open your browser and navigate to `http://localhost:5173`
2. Click "View Dashboard"
3. Enter your Discord Server ID (Guild ID)
   - To find your server ID:
     - Enable Developer Mode in Discord (User Settings > Advanced > Developer Mode)
     - Right-click your server name and select "Copy Server ID"
4. Click "Fetch Stats" to load your server's analytics
5. Explore the visualizations:
   - Server overview stats
   - Message activity by hour
   - Top active users
   - Message distribution by channel
   - Most used emojis

## Project Structure

```
DiscordStats/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # React components
│   │   │   └── Dashboard.tsx
│   │   ├── services/      # API services
│   │   │   └── api.ts
│   │   ├── types/         # TypeScript type definitions
│   │   │   └── discord.ts
│   │   ├── App.tsx        # Main app component
│   │   ├── App.css        # Styles
│   │   └── main.tsx       # Entry point
│   └── package.json
│
├── server/                # Backend Express application
│   ├── src/
│   │   ├── controllers/   # Request handlers
│   │   │   └── discordController.ts
│   │   ├── routes/        # API routes
│   │   │   └── discord.ts
│   │   └── index.ts       # Entry point
│   └── package.json
│
└── README.md
```

## API Endpoints

### Guild Stats
```
GET /api/discord/stats/guild/:guildId
```
Returns server statistics including member count, channels, roles, etc.

### Message Stats
```
GET /api/discord/stats/messages/:guildId?limit=100
```
Returns message analytics including activity by hour, top users, and emoji usage.

### User Activity
```
GET /api/discord/stats/user/:userId?guildId=xxx
```
Returns user activity data for a specific user in a guild.

### Auth URL
```
GET /api/discord/auth/url
```
Returns Discord OAuth2 authorization URL.

### Token Exchange
```
POST /api/discord/auth/token
Body: { "code": "oauth_code" }
```
Exchanges OAuth2 code for access token.

## Troubleshooting

### Bot not fetching data
- Ensure your bot token is correct in `.env`
- Verify the bot is in your server
- Check that the bot has proper permissions
- Enable required intents in Discord Developer Portal

### Stats not loading
- Verify your server ID is correct
- Check that the backend is running on port 3001
- Open browser console for error messages
- Ensure CORS is properly configured

### Build errors
- Delete `node_modules` and reinstall dependencies
- Clear cache: `npm cache clean --force`
- Ensure you're using Node.js v18 or higher

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the ISC License - see the LICENSE file for details.

## Acknowledgments

- Built with [Discord.js](https://discord.js.org/)
- Charts by [Recharts](https://recharts.org/)
- Animations by [Framer Motion](https://www.framer.com/motion/)
- Icons by [Lucide](https://lucide.dev/)

## Support

For issues and questions, please open an issue on GitHub.

---

**Note:** This application is not affiliated with Discord Inc. Discord is a registered trademark of Discord Inc.
