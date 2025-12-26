import { ChatInputCommandInteraction, VoiceChannel, GuildMember } from 'discord.js';
import crypto from 'crypto';
import { RallyRoundClient, sessionRegistry, SessionMode } from '../../services/rallyround';
import {
  joinSessionVoiceChannel,
  leaveSessionVoiceChannel,
  syncVoiceChannelMembers,
} from '../../services/voice';
import { clearSessionSignals } from './signals';
import {
  successMessage,
  errorMessage,
  formatSessionStatus,
  Emoji,
} from '../responses';

const RALLYROUND_API_URL = process.env.RALLYROUND_API_URL || 'http://localhost:8765/api';
const RALLYROUND_URL = process.env.RALLYROUND_URL || 'http://localhost:8765';
const WEBHOOK_BASE_URL = process.env.WEBHOOK_BASE_URL || 'http://localhost:3002';

/**
 * Check if user is facilitator
 */
function checkFacilitator(
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

  if (session.facilitatorId !== interaction.user.id) {
    return { allowed: false, reason: 'Only the facilitator can use this command.' };
  }

  return { allowed: true };
}

/**
 * /rr start title:"Session Title"
 */
export async function handleStart(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId;
  const member = interaction.member as GuildMember;

  if (!guildId || !member) {
    await interaction.reply({ content: errorMessage('This command can only be used in a server.'), ephemeral: true });
    return;
  }

  if (sessionRegistry.has(guildId)) {
    await interaction.reply({ content: errorMessage('A session is already active in this server.'), ephemeral: true });
    return;
  }

  const voiceChannel = member.voice.channel as VoiceChannel | null;
  if (!voiceChannel) {
    await interaction.reply({ content: errorMessage('You must be in a voice channel to start a session.'), ephemeral: true });
    return;
  }

  const title = interaction.options.getString('title', true);
  const webhookSecret = crypto.randomBytes(32).toString('hex');

  await interaction.deferReply();

  try {
    const client = new RallyRoundClient(RALLYROUND_API_URL, 'bot-token');

    const session = await client.createSession({
      title,
      guildId,
      channelId: interaction.channelId,
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

    sessionRegistry.register(
      guildId,
      session.id,
      interaction.channelId,
      voiceChannel.id,
      member.id,
      webhookSecret,
      session.config,
      client
    );

    await joinSessionVoiceChannel(guildId, voiceChannel.id, interaction.channelId);
    await syncVoiceChannelMembers(guildId, voiceChannel.id);

    const dashboardUrl = `${RALLYROUND_URL}/session/${session.id}`;
    await interaction.editReply(
      `${successMessage(`Session "${title}" started!`)}\n` +
        `${Emoji.speaker} Voice Channel: ${voiceChannel.name}\n` +
        `${Emoji.info} Dashboard: ${dashboardUrl}`
    );
  } catch (error: any) {
    console.error('Failed to start session:', error);
    await interaction.editReply(errorMessage(`Failed to start session: ${error.message}`));
  }
}

/**
 * /rr end
 */
export async function handleEnd(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId;

  const permission = checkFacilitator(interaction);
  if (!permission.allowed) {
    await interaction.reply({ content: errorMessage(permission.reason!), ephemeral: true });
    return;
  }

  const session = sessionRegistry.get(guildId!)!;

  await interaction.deferReply();

  try {
    const stats = await session.client.endSession(session.sessionId);

    clearSessionSignals(guildId!);
    leaveSessionVoiceChannel(guildId!);
    sessionRegistry.remove(guildId!);

    await interaction.editReply(
      `${successMessage('Session ended!')}\n` +
        `Duration: ${Math.round(stats.duration / 60)} minutes\n` +
        `Participants: ${stats.participantCount}\n` +
        `Total Signals: ${stats.totalSignals}`
    );
  } catch (error: any) {
    console.error('Failed to end session:', error);
    await interaction.editReply(errorMessage(`Failed to end session: ${error.message}`));
  }
}

/**
 * /rr pause
 */
export async function handlePause(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId;

  const permission = checkFacilitator(interaction);
  if (!permission.allowed) {
    await interaction.reply({ content: errorMessage(permission.reason!), ephemeral: true });
    return;
  }

  const session = sessionRegistry.get(guildId!)!;

  try {
    await session.client.updateSession(session.sessionId, { status: 'paused' });
    await interaction.reply(`${Emoji.pause} Session paused.`);
  } catch (error: any) {
    console.error('Failed to pause session:', error);
    await interaction.reply({ content: errorMessage(`Failed to pause session: ${error.message}`), ephemeral: true });
  }
}

/**
 * /rr resume
 */
export async function handleResume(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId;

  const permission = checkFacilitator(interaction);
  if (!permission.allowed) {
    await interaction.reply({ content: errorMessage(permission.reason!), ephemeral: true });
    return;
  }

  const session = sessionRegistry.get(guildId!)!;

  try {
    await session.client.updateSession(session.sessionId, { status: 'active' });
    await interaction.reply(`${Emoji.play} Session resumed.`);
  } catch (error: any) {
    console.error('Failed to resume session:', error);
    await interaction.reply({ content: errorMessage(`Failed to resume session: ${error.message}`), ephemeral: true });
  }
}

/**
 * /rr status
 */
export async function handleStatus(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId;

  if (!guildId) {
    await interaction.reply({ content: errorMessage('This command can only be used in a server.'), ephemeral: true });
    return;
  }

  const activeSession = sessionRegistry.get(guildId);
  if (!activeSession) {
    await interaction.reply({ content: errorMessage('No active session in this server.'), ephemeral: true });
    return;
  }

  await interaction.deferReply();

  try {
    const session = await activeSession.client.getSession(activeSession.sessionId, [
      'participants',
      'queue',
      'agenda',
    ]);
    const embed = formatSessionStatus(session);
    await interaction.editReply({ embeds: [embed] });
  } catch (error: any) {
    console.error('Failed to get session status:', error);
    await interaction.editReply(errorMessage(`Failed to get session status: ${error.message}`));
  }
}

/**
 * /rr link
 */
export async function handleLink(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId;

  if (!guildId) {
    await interaction.reply({ content: errorMessage('This command can only be used in a server.'), ephemeral: true });
    return;
  }

  const session = sessionRegistry.get(guildId);
  if (!session) {
    await interaction.reply({ content: errorMessage('No active session in this server.'), ephemeral: true });
    return;
  }

  const dashboardUrl = `${RALLYROUND_URL}/session/${session.sessionId}`;
  await interaction.reply(`${Emoji.info} **Dashboard:** ${dashboardUrl}`);
}

/**
 * /rr mode mode:structured|unstructured
 */
export async function handleMode(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId;

  const permission = checkFacilitator(interaction);
  if (!permission.allowed) {
    await interaction.reply({ content: errorMessage(permission.reason!), ephemeral: true });
    return;
  }

  const mode = interaction.options.getString('mode', true) as SessionMode;
  const session = sessionRegistry.get(guildId!)!;

  try {
    await session.client.updateSession(session.sessionId, { mode });
    await interaction.reply(`${Emoji.mode} Session mode changed to **${mode}**.`);
  } catch (error: any) {
    console.error('Failed to change mode:', error);
    await interaction.reply({ content: errorMessage(`Failed to change mode: ${error.message}`), ephemeral: true });
  }
}

/**
 * /rr record action:start|stop
 */
export async function handleRecord(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId;

  const permission = checkFacilitator(interaction);
  if (!permission.allowed) {
    await interaction.reply({ content: errorMessage(permission.reason!), ephemeral: true });
    return;
  }

  const action = interaction.options.getString('action', true);
  const session = sessionRegistry.get(guildId!)!;
  const isRecording = action === 'start';

  try {
    await session.client.updateSession(session.sessionId, { isRecording });
    if (isRecording) {
      await interaction.reply(`${Emoji.recording} Recording started.`);
    } else {
      await interaction.reply(`${Emoji.stop} Recording stopped.`);
    }
  } catch (error: any) {
    console.error('Failed to toggle recording:', error);
    await interaction.reply({ content: errorMessage(`Failed to toggle recording: ${error.message}`), ephemeral: true });
  }
}
