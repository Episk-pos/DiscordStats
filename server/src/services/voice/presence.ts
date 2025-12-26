import { VoiceState, GuildMember, VoiceChannel, TextChannel } from 'discord.js';
import { sessionRegistry } from '../rallyround';
import { clearUserSignal } from '../../commands';
import { getClient } from '../discord';

/**
 * Handle voice state updates for session participant tracking
 */
export async function handleVoiceStateUpdate(
  oldState: VoiceState,
  newState: VoiceState
): Promise<void> {
  const member = newState.member || oldState.member;
  if (!member || member.user.bot) return;

  const guildId = newState.guild.id;
  const session = sessionRegistry.get(guildId);

  if (!session) return;

  const oldChannelId = oldState.channelId;
  const newChannelId = newState.channelId;
  const sessionVCId = session.voiceChannelId;

  // No channel change
  if (oldChannelId === newChannelId) return;

  // User joined the session's voice channel
  if (newChannelId === sessionVCId && oldChannelId !== sessionVCId) {
    await handleUserJoin(session, member);
  }
  // User left the session's voice channel
  else if (oldChannelId === sessionVCId && newChannelId !== sessionVCId) {
    await handleUserLeave(session, member);
  }
}

/**
 * Handle a user joining the session's voice channel
 */
async function handleUserJoin(
  session: ReturnType<typeof sessionRegistry.get>,
  member: GuildMember
): Promise<void> {
  if (!session) return;

  try {
    await session.client.addParticipant(session.sessionId, {
      discordId: member.id,
      username: member.user.username,
      displayName: member.displayName,
      avatar: member.user.avatar || undefined,
      source: 'discord',
    });

    console.log(`Added participant ${member.displayName} to session ${session.sessionId}`);
  } catch (error) {
    console.error('Failed to add participant:', error);
  }
}

/**
 * Handle a user leaving the session's voice channel
 */
async function handleUserLeave(
  session: ReturnType<typeof sessionRegistry.get>,
  member: GuildMember
): Promise<void> {
  if (!session) return;

  try {
    await session.client.removeParticipant(session.sessionId, member.id);

    // Clear any active signals for this user
    clearUserSignal(session.guildId, member.id);

    console.log(`Removed participant ${member.displayName} from session ${session.sessionId}`);
  } catch (error) {
    console.error('Failed to remove participant:', error);
  }
}

/**
 * Sync all current voice channel members as participants
 */
export async function syncVoiceChannelMembers(
  guildId: string,
  voiceChannelId: string
): Promise<void> {
  const client = getClient();
  if (!client) return;

  const session = sessionRegistry.get(guildId);
  if (!session) return;

  try {
    const guild = await client.guilds.fetch(guildId);
    const voiceChannel = (await guild.channels.fetch(voiceChannelId)) as VoiceChannel;

    if (!voiceChannel) {
      console.error(`Voice channel ${voiceChannelId} not found`);
      return;
    }

    // Add all current members (excluding bots)
    for (const [, member] of voiceChannel.members) {
      if (member.user.bot) continue;

      try {
        await session.client.addParticipant(session.sessionId, {
          discordId: member.id,
          username: member.user.username,
          displayName: member.displayName,
          avatar: member.user.avatar || undefined,
          source: 'discord',
        });
      } catch (error) {
        // Participant may already exist
        console.log(`Participant ${member.displayName} may already be in session`);
      }
    }

    console.log(`Synced ${voiceChannel.members.size} members to session`);
  } catch (error) {
    console.error('Failed to sync voice channel members:', error);
  }
}

/**
 * Check if a user is in the session's voice channel
 */
export function isUserInSessionVC(guildId: string, userId: string): boolean {
  const client = getClient();
  if (!client) return false;

  const session = sessionRegistry.get(guildId);
  if (!session) return false;

  const guild = client.guilds.cache.get(guildId);
  if (!guild) return false;

  const member = guild.members.cache.get(userId);
  if (!member) return false;

  return member.voice.channelId === session.voiceChannelId;
}

/**
 * Get the text channel for a session
 */
export async function getSessionTextChannel(guildId: string): Promise<TextChannel | null> {
  const client = getClient();
  if (!client) return null;

  const session = sessionRegistry.get(guildId);
  if (!session) return null;

  try {
    const guild = await client.guilds.fetch(guildId);
    const channel = await guild.channels.fetch(session.channelId);
    return channel as TextChannel;
  } catch (error) {
    console.error('Failed to get session text channel:', error);
    return null;
  }
}
