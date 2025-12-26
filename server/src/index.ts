import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import express from 'express';
import cors from 'cors';
import discordRoutes from './routes/discord';
import authRoutes from './routes/auth';
import webhookRoutes from './webhooks';
import { initializeBot } from './services/discord';

const app = express();
const PORT = process.env.PORT || 3002;

// CORS configuration - allow RallyRound origin and localhost for development
const corsOptions = {
  origin: [
    process.env.RALLYROUND_URL || 'http://localhost:8765',
    'http://localhost:5173',
    'http://localhost:3000',
  ],
  credentials: true,
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/api/discord', discordRoutes);
app.use('/webhooks', webhookRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Discord Stats API is running' });
});

// Initialize Discord bot
initializeBot();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
