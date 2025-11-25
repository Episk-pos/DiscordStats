import axios from 'axios';
import type { GuildStats, MessageStats, UserActivity } from '../types/discord';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const discordApi = {
  getAuthUrl: async () => {
    const response = await api.get('/discord/auth/url');
    return response.data.url;
  },

  exchangeToken: async (code: string) => {
    const response = await api.post('/discord/auth/token', { code });
    return response.data;
  },

  getGuildStats: async (guildId: string): Promise<GuildStats> => {
    const response = await api.get(`/discord/stats/guild/${guildId}`);
    return response.data;
  },

  getUserActivity: async (userId: string, guildId: string): Promise<UserActivity> => {
    const response = await api.get(`/discord/stats/user/${userId}?guildId=${guildId}`);
    return response.data;
  },

  getMessageStats: async (guildId: string, limit: number = 100): Promise<MessageStats> => {
    const response = await api.get(`/discord/stats/messages/${guildId}?limit=${limit}`);
    return response.data;
  },
};
