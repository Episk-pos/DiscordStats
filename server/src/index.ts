import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import discordRoutes from './routes/discord';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/discord', discordRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Discord Stats API is running' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
