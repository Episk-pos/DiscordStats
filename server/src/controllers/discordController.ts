import { Request, Response } from 'express';
import { Client, GatewayIntentBits, Guild, TextChannel } from 'discord.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
});

// Initialize Discord bot
if (process.env.DISCORD_BOT_TOKEN) {
  client.login(process.env.DISCORD_BOT_TOKEN).catch(console.error);
}

export const getGuildStats = async (req: Request, res: Response) => {
  try {
    const { guildId } = req.params;
    const guild = await client.guilds.fetch(guildId);

    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    const members = await guild.members.fetch();
    const channels = await guild.channels.fetch();

    const stats = {
      name: guild.name,
      memberCount: guild.memberCount,
      onlineMembers: members.filter(m => m.presence?.status === 'online').size,
      textChannels: channels.filter(c => c?.type === 0).size,
      voiceChannels: channels.filter(c => c?.type === 2).size,
      roles: guild.roles.cache.size,
      createdAt: guild.createdAt,
      boostLevel: guild.premiumTier,
      boostCount: guild.premiumSubscriptionCount,
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching guild stats:', error);
    res.status(500).json({ error: 'Failed to fetch guild stats' });
  }
};

export const getUserActivity = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { guildId } = req.query;

    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }

    const guild = await client.guilds.fetch(guildId as string);
    const member = await guild.members.fetch(userId);

    if (!member) {
      return res.status(404).json({ error: 'User not found in guild' });
    }

    const activity = {
      username: member.user.username,
      displayName: member.displayName,
      joinedAt: member.joinedAt,
      roles: member.roles.cache.map(r => ({ id: r.id, name: r.name, color: r.hexColor })),
      presence: member.presence?.status || 'offline',
      activities: member.presence?.activities || [],
    };

    res.json(activity);
  } catch (error) {
    console.error('Error fetching user activity:', error);
    res.status(500).json({ error: 'Failed to fetch user activity' });
  }
};

export const getMessageStats = async (req: Request, res: Response) => {
  try {
    const { guildId } = req.params;
    const { limit = '100', channelId } = req.query;

    const guild = await client.guilds.fetch(guildId);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    let channels = guild.channels.cache.filter(c => c.isTextBased());
    if (channelId) {
      channels = channels.filter(c => c.id === channelId);
    }

    const messageStats: any = {
      totalMessages: 0,
      messagesByUser: {},
      messagesByChannel: {},
      messagesByHour: new Array(24).fill(0),
      topEmojis: {},
    };

    for (const [, channel] of channels) {
      if (channel instanceof TextChannel) {
        try {
          const messages = await channel.messages.fetch({ limit: Number(limit) });

          messageStats.messagesByChannel[channel.name] = messages.size;
          messageStats.totalMessages += messages.size;

          messages.forEach(msg => {
            // Count by user
            const username = msg.author.username;
            messageStats.messagesByUser[username] = (messageStats.messagesByUser[username] || 0) + 1;

            // Count by hour
            const hour = msg.createdAt.getHours();
            messageStats.messagesByHour[hour]++;

            // Count emojis
            const emojiRegex = /<a?:\w+:\d+>|[\u{1F300}-\u{1F9FF}]/gu;
            const emojis = msg.content.match(emojiRegex);
            if (emojis) {
              emojis.forEach(emoji => {
                messageStats.topEmojis[emoji] = (messageStats.topEmojis[emoji] || 0) + 1;
              });
            }
          });
        } catch (error) {
          console.error(`Error fetching messages from ${channel.name}:`, error);
        }
      }
    }

    // Sort top users
    messageStats.topUsers = Object.entries(messageStats.messagesByUser)
      .sort(([, a]: any, [, b]: any) => b - a)
      .slice(0, 10)
      .map(([username, count]) => ({ username, count }));

    // Sort top emojis
    messageStats.topEmojis = Object.entries(messageStats.topEmojis)
      .sort(([, a]: any, [, b]: any) => b - a)
      .slice(0, 10)
      .map(([emoji, count]) => ({ emoji, count }));

    res.json(messageStats);
  } catch (error) {
    console.error('Error fetching message stats:', error);
    res.status(500).json({ error: 'Failed to fetch message stats' });
  }
};
