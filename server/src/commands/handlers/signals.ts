import { ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { sessionRegistry, SignalType } from '../../services/rallyround';
import { successMessage, errorMessage, getSignalEmoji } from '../responses';

// Map of point subcommands to signal types
const pointSignals: Record<string, SignalType> = {
  order: 'point_of_order',
  clarify: 'clarification',
  info: 'information',
};

// Track active signals per user per session for toggling
const userSignals = new Map<string, SignalType>();

function getUserKey(guildId: string, odId: string): string {
  return `${guildId}:${odId}`;
}

/**
 * Check if user is in session voice channel
 */
function checkInSessionVC(
  interaction: ChatInputCommandInteraction
): { allowed: boolean; reason?: string } {
  const guildId = interaction.guildId;
  if (!guildId) {
    return { allowed: false, reason: 'This command can only be used in a server.' };
  }

  const session = sessionRegistry.get(guildId);
  if (!session) {
    return { allowed: false, reason: 'No active session in this server.' };
  }

  const member = interaction.member as GuildMember;
  const voiceChannel = member.voice.channel;

  if (!voiceChannel) {
    return { allowed: false, reason: 'You must be in a voice channel to use this command.' };
  }

  if (voiceChannel.id !== session.voiceChannelId) {
    return { allowed: false, reason: 'You must be in the session voice channel to use this command.' };
  }

  return { allowed: true };
}

/**
 * /rr hand - Toggle raise/lower hand
 */
export async function handleHand(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId!;
  const userId = interaction.user.id;

  const permission = checkInSessionVC(interaction);
  if (!permission.allowed) {
    await interaction.reply({ content: errorMessage(permission.reason!), ephemeral: true });
    return;
  }

  const session = sessionRegistry.get(guildId)!;
  const userKey = getUserKey(guildId, userId);
  const currentSignal = userSignals.get(userKey);

  try {
    if (currentSignal === 'hand') {
      await session.client.clearSignal(session.sessionId, userId);
      userSignals.delete(userKey);
      await interaction.reply({ content: `${getSignalEmoji('hand')} Hand lowered.`, ephemeral: true });
    } else {
      if (currentSignal) {
        await session.client.clearSignal(session.sessionId, userId);
      }
      await session.client.raiseSignal(session.sessionId, {
        discordId: userId,
        signal: 'hand',
      });
      userSignals.set(userKey, 'hand');
      await interaction.reply(`${getSignalEmoji('hand')} **${interaction.user.displayName}** raised their hand.`);
    }
  } catch (error: any) {
    console.error('Failed to toggle hand:', error);
    await interaction.reply({ content: errorMessage(`Failed to toggle hand: ${error.message}`), ephemeral: true });
  }
}

/**
 * /rr point type:order|clarify|info - Raise parliamentary signal
 */
export async function handlePoint(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId!;
  const userId = interaction.user.id;

  const permission = checkInSessionVC(interaction);
  if (!permission.allowed) {
    await interaction.reply({ content: errorMessage(permission.reason!), ephemeral: true });
    return;
  }

  const pointType = interaction.options.getString('type', true);
  const signal = pointSignals[pointType];

  if (!signal) {
    await interaction.reply({ content: errorMessage('Invalid point type.'), ephemeral: true });
    return;
  }

  const session = sessionRegistry.get(guildId)!;
  const userKey = getUserKey(guildId, userId);
  const currentSignal = userSignals.get(userKey);

  try {
    if (currentSignal === signal) {
      await session.client.clearSignal(session.sessionId, userId);
      userSignals.delete(userKey);
      await interaction.reply({ content: `${getSignalEmoji(signal)} Signal cleared.`, ephemeral: true });
    } else {
      if (currentSignal) {
        await session.client.clearSignal(session.sessionId, userId);
      }
      await session.client.raiseSignal(session.sessionId, {
        discordId: userId,
        signal,
      });
      userSignals.set(userKey, signal);
      await interaction.reply(`${getSignalEmoji(signal)} **${interaction.user.displayName}** raised ${signal.replace('_', ' ')}.`);
    }
  } catch (error: any) {
    console.error('Failed to raise signal:', error);
    await interaction.reply({ content: errorMessage(`Failed to raise signal: ${error.message}`), ephemeral: true });
  }
}

/**
 * /rr question - Question signal
 */
export async function handleQuestion(interaction: ChatInputCommandInteraction): Promise<void> {
  await handleSignal(interaction, 'question');
}

/**
 * /rr agree - Agreement signal
 */
export async function handleAgree(interaction: ChatInputCommandInteraction): Promise<void> {
  await handleSignal(interaction, 'agree');
}

/**
 * /rr disagree - Disagreement signal
 */
export async function handleDisagree(interaction: ChatInputCommandInteraction): Promise<void> {
  await handleSignal(interaction, 'disagree');
}

/**
 * /rr away - Mark as away
 */
export async function handleAway(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId!;
  const userId = interaction.user.id;

  const permission = checkInSessionVC(interaction);
  if (!permission.allowed) {
    await interaction.reply({ content: errorMessage(permission.reason!), ephemeral: true });
    return;
  }

  const session = sessionRegistry.get(guildId)!;

  try {
    await session.client.updateParticipantStatus(session.sessionId, userId, 'away');
    await interaction.reply({ content: ':zzz: Marked as away.', ephemeral: true });
  } catch (error: any) {
    console.error('Failed to update status:', error);
    await interaction.reply({ content: errorMessage(`Failed to update status: ${error.message}`), ephemeral: true });
  }
}

/**
 * /rr back - Mark as back
 */
export async function handleBack(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId!;
  const userId = interaction.user.id;

  const permission = checkInSessionVC(interaction);
  if (!permission.allowed) {
    await interaction.reply({ content: errorMessage(permission.reason!), ephemeral: true });
    return;
  }

  const session = sessionRegistry.get(guildId)!;

  try {
    await session.client.updateParticipantStatus(session.sessionId, userId, 'ready');
    await interaction.reply({ content: ':wave: Welcome back!', ephemeral: true });
  } catch (error: any) {
    console.error('Failed to update status:', error);
    await interaction.reply({ content: errorMessage(`Failed to update status: ${error.message}`), ephemeral: true });
  }
}

/**
 * Generic signal handler
 */
async function handleSignal(interaction: ChatInputCommandInteraction, signal: SignalType): Promise<void> {
  const guildId = interaction.guildId!;
  const userId = interaction.user.id;

  const permission = checkInSessionVC(interaction);
  if (!permission.allowed) {
    await interaction.reply({ content: errorMessage(permission.reason!), ephemeral: true });
    return;
  }

  const session = sessionRegistry.get(guildId)!;
  const userKey = getUserKey(guildId, userId);
  const currentSignal = userSignals.get(userKey);

  try {
    if (currentSignal === signal) {
      await session.client.clearSignal(session.sessionId, userId);
      userSignals.delete(userKey);
      await interaction.reply({ content: `${getSignalEmoji(signal)} Signal cleared.`, ephemeral: true });
    } else {
      if (currentSignal) {
        await session.client.clearSignal(session.sessionId, userId);
      }
      await session.client.raiseSignal(session.sessionId, {
        discordId: userId,
        signal,
      });
      userSignals.set(userKey, signal);
      await interaction.reply(`${getSignalEmoji(signal)} **${interaction.user.displayName}** signaled ${signal}.`);
    }
  } catch (error: any) {
    console.error('Failed to handle signal:', error);
    await interaction.reply({ content: errorMessage(`Failed to handle signal: ${error.message}`), ephemeral: true });
  }
}

/**
 * Clear user's signal state
 */
export function clearUserSignal(guildId: string, odId: string): void {
  const userKey = getUserKey(guildId, odId);
  userSignals.delete(userKey);
}

/**
 * Clear all signals for a session
 */
export function clearSessionSignals(guildId: string): void {
  for (const key of userSignals.keys()) {
    if (key.startsWith(`${guildId}:`)) {
      userSignals.delete(key);
    }
  }
}
