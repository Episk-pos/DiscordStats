import { Message, TextChannel, VoiceChannel } from 'discord.js';
import crypto from 'crypto';
import { RallyRoundClient, sessionRegistry, SessionMode } from '../services/rallyround';
import { joinSessionVoiceChannel, leaveSessionVoiceChannel, syncVoiceChannelMembers } from '../services/voice';
import { clearSessionSignals } from './signals';
import { ParsedCommand, joinArgs } from './parser';
import { isFacilitator } from './permissions';
import {
  successMessage,
  errorMessage,
  formatSessionStatus,
  Emoji,
} from './responses';

const RALLYROUND_API_URL = process.env.RALLYROUND_API_URL || 'http://localhost:8765/api';
const RALLYROUND_URL = process.env.RALLYROUND_URL || 'http://localhost:8765';
const WEBHOOK_BASE_URL = process.env.WEBHOOK_BASE_URL || 'http://localhost:3002';

/**
 * !rr start [title] - Start a new session
 */
export async function handleStart(message: Message, parsed: ParsedCommand): Promise<void> {
  const { guildId, channelId, member } = message;

  if (!guildId || !member) {
    await message.reply(errorMessage('This command can only be used in a server.'));
    return;
  }

  // Check if there's already an active session
  if (sessionRegistry.has(guildId)) {
    await message.reply(errorMessage('A session is already active in this server.'));
    return;
  }

  // User must be in a voice channel
  const voiceChannel = member.voice.channel as VoiceChannel | null;
  if (!voiceChannel) {
    await message.reply(errorMessage('You must be in a voice channel to start a session.'));
    return;
  }

  const title = joinArgs(parsed.args) || 'RallyRound Session';
  const webhookSecret = crypto.randomBytes(32).toString('hex');

  try {
    // Create RallyRound client with user's token (simplified - in production use OAuth)
    const client = new RallyRoundClient(RALLYROUND_API_URL, 'bot-token');

    // Create session via RallyRound API
    const session = await client.createSession({
      title,
      guildId,
      channelId,
      voiceChannelId: voiceChannel.id,
      facilitatorId: member.id,
      webhookUrl: `${WEBHOOK_BASE_URL}/webhooks/rallyround`,
      webhookSecret,
      config: {
        soundEffectsEnabled: true,
        selfQueueEnabled: true,
        facilitatorApprovalRequired: false,
      },
    });

    // Register in local registry
    sessionRegistry.register(
      guildId,
      session.id,
      channelId,
      voiceChannel.id,
      member.id,
      webhookSecret,
      session.config,
      client
    );

    // Join voice channel for sound effects
    await joinSessionVoiceChannel(guildId, voiceChannel.id, channelId);

    // Sync existing voice channel members as participants
    await syncVoiceChannelMembers(guildId, voiceChannel.id);

    // Send success message with dashboard link
    const dashboardUrl = `${RALLYROUND_URL}/session/${session.id}`;
    await message.reply(
      `${successMessage(`Session "${title}" started!`)}\n` +
        `${Emoji.speaker} Voice Channel: ${voiceChannel.name}\n` +
        `${Emoji.info} Dashboard: ${dashboardUrl}`
    );
  } catch (error: any) {
    console.error('Failed to start session:', error);
    await message.reply(errorMessage(`Failed to start session: ${error.message}`));
  }
}

/**
 * !rr end - End the current session
 */
export async function handleEnd(message: Message): Promise<void> {
  const { guildId, member } = message;

  if (!guildId || !member) {
    await message.reply(errorMessage('This command can only be used in a server.'));
    return;
  }

  const permission = isFacilitator(guildId, member.id);
  if (!permission.allowed) {
    await message.reply(errorMessage(permission.reason!));
    return;
  }

  const session = sessionRegistry.get(guildId)!;

  try {
    const stats = await session.client.endSession(session.sessionId);

    // Clean up
    clearSessionSignals(guildId);
    leaveSessionVoiceChannel(guildId);
    sessionRegistry.remove(guildId);

    await message.reply(
      `${successMessage('Session ended!')}\n` +
        `Duration: ${Math.round(stats.duration / 60)} minutes\n` +
        `Participants: ${stats.participantCount}\n` +
        `Total Signals: ${stats.totalSignals}`
    );
  } catch (error: any) {
    console.error('Failed to end session:', error);
    await message.reply(errorMessage(`Failed to end session: ${error.message}`));
  }
}

/**
 * !rr pause - Pause the session
 */
export async function handlePause(message: Message): Promise<void> {
  const { guildId, member } = message;

  if (!guildId || !member) {
    await message.reply(errorMessage('This command can only be used in a server.'));
    return;
  }

  const permission = isFacilitator(guildId, member.id);
  if (!permission.allowed) {
    await message.reply(errorMessage(permission.reason!));
    return;
  }

  const session = sessionRegistry.get(guildId)!;

  try {
    await session.client.updateSession(session.sessionId, { status: 'paused' });
    await message.reply(`${Emoji.pause} Session paused.`);
  } catch (error: any) {
    console.error('Failed to pause session:', error);
    await message.reply(errorMessage(`Failed to pause session: ${error.message}`));
  }
}

/**
 * !rr resume - Resume the session
 */
export async function handleResume(message: Message): Promise<void> {
  const { guildId, member } = message;

  if (!guildId || !member) {
    await message.reply(errorMessage('This command can only be used in a server.'));
    return;
  }

  const permission = isFacilitator(guildId, member.id);
  if (!permission.allowed) {
    await message.reply(errorMessage(permission.reason!));
    return;
  }

  const session = sessionRegistry.get(guildId)!;

  try {
    await session.client.updateSession(session.sessionId, { status: 'active' });
    await message.reply(`${Emoji.play} Session resumed.`);
  } catch (error: any) {
    console.error('Failed to resume session:', error);
    await message.reply(errorMessage(`Failed to resume session: ${error.message}`));
  }
}

/**
 * !rr status - Show session status
 */
export async function handleStatus(message: Message): Promise<void> {
  const { guildId } = message;

  if (!guildId) {
    await message.reply(errorMessage('This command can only be used in a server.'));
    return;
  }

  const activeSession = sessionRegistry.get(guildId);
  if (!activeSession) {
    await message.reply(errorMessage('No active session in this server.'));
    return;
  }

  try {
    const session = await activeSession.client.getSession(activeSession.sessionId, [
      'participants',
      'queue',
      'agenda',
    ]);
    const embed = formatSessionStatus(session);
    await message.reply({ embeds: [embed] });
  } catch (error: any) {
    console.error('Failed to get session status:', error);
    await message.reply(errorMessage(`Failed to get session status: ${error.message}`));
  }
}

/**
 * !rr link - Post dashboard URL
 */
export async function handleLink(message: Message): Promise<void> {
  const { guildId } = message;

  if (!guildId) {
    await message.reply(errorMessage('This command can only be used in a server.'));
    return;
  }

  const session = sessionRegistry.get(guildId);
  if (!session) {
    await message.reply(errorMessage('No active session in this server.'));
    return;
  }

  const dashboardUrl = `${RALLYROUND_URL}/session/${session.sessionId}`;
  await message.reply(`${Emoji.info} **Dashboard:** ${dashboardUrl}`);
}

/**
 * !rr mode structured|unstructured - Change session mode
 */
export async function handleMode(message: Message, parsed: ParsedCommand): Promise<void> {
  const { guildId, member } = message;

  if (!guildId || !member) {
    await message.reply(errorMessage('This command can only be used in a server.'));
    return;
  }

  const permission = isFacilitator(guildId, member.id);
  if (!permission.allowed) {
    await message.reply(errorMessage(permission.reason!));
    return;
  }

  const mode = parsed.subcommand as SessionMode;
  if (!mode || !['structured', 'unstructured'].includes(mode)) {
    await message.reply(errorMessage('Usage: `!rr mode structured` or `!rr mode unstructured`'));
    return;
  }

  const session = sessionRegistry.get(guildId)!;

  try {
    await session.client.updateSession(session.sessionId, { mode });
    await message.reply(`${Emoji.mode} Session mode changed to **${mode}**.`);
  } catch (error: any) {
    console.error('Failed to change mode:', error);
    await message.reply(errorMessage(`Failed to change mode: ${error.message}`));
  }
}

/**
 * !rr record start|stop - Toggle recording
 */
export async function handleRecord(message: Message, parsed: ParsedCommand): Promise<void> {
  const { guildId, member } = message;

  if (!guildId || !member) {
    await message.reply(errorMessage('This command can only be used in a server.'));
    return;
  }

  const permission = isFacilitator(guildId, member.id);
  if (!permission.allowed) {
    await message.reply(errorMessage(permission.reason!));
    return;
  }

  const action = parsed.subcommand;
  if (!action || !['start', 'stop'].includes(action)) {
    await message.reply(errorMessage('Usage: `!rr record start` or `!rr record stop`'));
    return;
  }

  const session = sessionRegistry.get(guildId)!;
  const isRecording = action === 'start';

  try {
    await session.client.updateSession(session.sessionId, { isRecording });
    if (isRecording) {
      await message.reply(`${Emoji.recording} Recording started.`);
    } else {
      await message.reply(`${Emoji.stop} Recording stopped.`);
    }
  } catch (error: any) {
    console.error('Failed to toggle recording:', error);
    await message.reply(errorMessage(`Failed to toggle recording: ${error.message}`));
  }
}
