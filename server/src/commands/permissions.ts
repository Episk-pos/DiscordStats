import { GuildMember, VoiceChannel } from 'discord.js';
import { sessionRegistry } from '../services/rallyround';

export interface PermissionResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Check if user is the facilitator of the active session
 */
export function isFacilitator(guildId: string, userId: string): PermissionResult {
  const session = sessionRegistry.get(guildId);

  if (!session) {
    return { allowed: false, reason: 'No active session in this server.' };
  }

  if (session.facilitatorId !== userId) {
    return { allowed: false, reason: 'Only the facilitator can use this command.' };
  }

  return { allowed: true };
}

/**
 * Check if user is in the session's voice channel
 */
export function isInSessionVC(guildId: string, member: GuildMember): PermissionResult {
  const session = sessionRegistry.get(guildId);

  if (!session) {
    return { allowed: false, reason: 'No active session in this server.' };
  }

  const voiceChannel = member.voice.channel;

  if (!voiceChannel) {
    return { allowed: false, reason: 'You must be in a voice channel to use this command.' };
  }

  if (voiceChannel.id !== session.voiceChannelId) {
    return {
      allowed: false,
      reason: 'You must be in the session voice channel to use this command.',
    };
  }

  return { allowed: true };
}

/**
 * Check if there's an active session in the guild
 */
export function hasActiveSession(guildId: string): PermissionResult {
  const session = sessionRegistry.get(guildId);

  if (!session) {
    return { allowed: false, reason: 'No active session in this server.' };
  }

  return { allowed: true };
}

/**
 * Check if the command is being run in the session channel
 */
export function isInSessionChannel(guildId: string, channelId: string): PermissionResult {
  const session = sessionRegistry.get(guildId);

  if (!session) {
    return { allowed: false, reason: 'No active session in this server.' };
  }

  if (session.channelId !== channelId) {
    return { allowed: false, reason: 'This command must be used in the session channel.' };
  }

  return { allowed: true };
}

/**
 * Get the voice channel members (excluding bots)
 */
export function getVoiceChannelMembers(voiceChannel: VoiceChannel): GuildMember[] {
  return voiceChannel.members.filter((member) => !member.user.bot).map((member) => member);
}
