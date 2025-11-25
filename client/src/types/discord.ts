export type GuildStats = {
  name: string;
  memberCount: number;
  onlineMembers: number;
  textChannels: number;
  voiceChannels: number;
  roles: number;
  createdAt: string;
  boostLevel: number;
  boostCount: number;
}

export type MessageStats = {
  totalMessages: number;
  messagesByUser: Record<string, number>;
  messagesByChannel: Record<string, number>;
  messagesByHour: number[];
  topUsers: Array<{ username: string; count: number }>;
  topEmojis: Array<{ emoji: string; count: number }>;
}

export type UserActivity = {
  username: string;
  displayName: string;
  joinedAt: string;
  roles: Array<{ id: string; name: string; color: string }>;
  presence: string;
  activities: any[];
}
