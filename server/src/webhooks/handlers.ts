import { TextChannel } from 'discord.js';
import { ActiveSession, sessionRegistry, SignalType } from '../services/rallyround';
import { getClient } from '../services/discord';
import { clearSessionSignals } from '../commands';
import { leaveSessionVoiceChannel } from '../services/voice';
import { Emoji } from '../commands/responses';

// Event handler type
type EventHandler = (session: ActiveSession, data: any) => Promise<void>;

// Map of event types to handlers
const eventHandlers: Record<string, EventHandler> = {
  signal_raised: handleSignalRaised,
  speaker_changed: handleSpeakerChanged,
  mode_changed: handleModeChanged,
  recording_changed: handleRecordingChanged,
  agenda_advanced: handleAgendaAdvanced,
  session_ended: handleSessionEnded,
};

/**
 * Route webhook event to appropriate handler
 */
export async function handleWebhookEvent(
  event: string,
  session: ActiveSession,
  data: any
): Promise<void> {
  const handler = eventHandlers[event];

  if (handler) {
    await handler(session, data);
  } else {
    console.log(`Unknown webhook event: ${event}`);
  }
}

/**
 * Get text channel for session
 */
async function getTextChannel(session: ActiveSession): Promise<TextChannel | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const guild = await client.guilds.fetch(session.guildId);
    const channel = await guild.channels.fetch(session.channelId);
    return channel as TextChannel;
  } catch (error) {
    console.error('Failed to get text channel:', error);
    return null;
  }
}

/**
 * Handle signal_raised event
 */
async function handleSignalRaised(session: ActiveSession, data: any): Promise<void> {
  const { discordId, signal, priority, queuePosition } = data;

  const channel = await getTextChannel(session);
  if (!channel) return;

  const client = getClient();
  if (!client) return;

  try {
    const guild = await client.guilds.fetch(session.guildId);
    const member = await guild.members.fetch(discordId);

    const signalEmojis: Record<SignalType, string> = {
      hand: Emoji.hand,
      point_of_order: Emoji.pointOfOrder,
      clarification: Emoji.clarification,
      information: Emoji.information,
      question: Emoji.question,
      agree: Emoji.agree,
      disagree: Emoji.disagree,
      away: Emoji.away,
      back: Emoji.back,
    };

    const emoji = signalEmojis[signal as SignalType] || Emoji.hand;
    const positionText = queuePosition ? ` (Queue position: ${queuePosition})` : '';

    await channel.send(`${emoji} **${member.displayName}** raised ${signal.replace('_', ' ')}${positionText}`);

    // Play sound effect if enabled
    if (session.soundEffectsEnabled) {
      // TODO: Play sound via audio service
      // audioService.playSignalSound(session.guildId, signal);
    }
  } catch (error) {
    console.error('Failed to handle signal_raised:', error);
  }
}

/**
 * Handle speaker_changed event
 */
async function handleSpeakerChanged(session: ActiveSession, data: any): Promise<void> {
  const { currentSpeaker, previousSpeaker, remainingQueue } = data;

  const channel = await getTextChannel(session);
  if (!channel) return;

  let message = '';

  if (previousSpeaker) {
    const duration = Math.round(previousSpeaker.duration / 60);
    message += `Previous speaker finished (${duration}m). `;
  }

  if (currentSpeaker) {
    message += `${Emoji.speaker} **${currentSpeaker.displayName}** now has the floor.`;
    if (remainingQueue > 0) {
      message += ` (${remainingQueue} remaining in queue)`;
    }
  } else {
    message += `${Emoji.info} The floor is open.`;
  }

  await channel.send(message);

  // Play transition sound if enabled
  if (session.soundEffectsEnabled) {
    // TODO: Play sound via audio service
    // audioService.playSound(session.guildId, 'swoosh');
  }
}

/**
 * Handle mode_changed event
 */
async function handleModeChanged(session: ActiveSession, data: any): Promise<void> {
  const { mode, previousMode } = data;

  const channel = await getTextChannel(session);
  if (!channel) return;

  await channel.send(
    `${Emoji.mode} Session mode changed from **${previousMode}** to **${mode}**`
  );
}

/**
 * Handle recording_changed event
 */
async function handleRecordingChanged(session: ActiveSession, data: any): Promise<void> {
  const { isRecording } = data;

  const channel = await getTextChannel(session);
  if (!channel) return;

  if (isRecording) {
    await channel.send(`${Emoji.recording} **Recording started**`);
  } else {
    await channel.send(`${Emoji.stop} **Recording stopped**`);
  }

  // Play recording sound if enabled
  if (session.soundEffectsEnabled) {
    // TODO: Play sound via audio service
    // const sound = isRecording ? 'record-start' : 'record-stop';
    // audioService.playSound(session.guildId, sound);
  }
}

/**
 * Handle agenda_advanced event
 */
async function handleAgendaAdvanced(session: ActiveSession, data: any): Promise<void> {
  const { completedItem, currentItem, completedCount, totalCount } = data;

  const channel = await getTextChannel(session);
  if (!channel) return;

  let message = '';

  if (completedItem) {
    message += `${Emoji.completed} Completed: **${completedItem.title}**\n`;
  }

  if (currentItem) {
    message += `${Emoji.active} Now discussing: **${currentItem.title}**`;
    if (currentItem.duration) {
      message += ` (${currentItem.duration}m)`;
    }
  } else {
    message += `${Emoji.completed} All agenda items completed! (${completedCount}/${totalCount})`;
  }

  await channel.send(message);

  // Play completion sound if enabled
  if (session.soundEffectsEnabled && completedItem) {
    // TODO: Play sound via audio service
    // audioService.playSound(session.guildId, 'ding');
  }
}

/**
 * Handle session_ended event
 */
async function handleSessionEnded(session: ActiveSession, data: any): Promise<void> {
  const { duration, participantCount, totalSignals, agendaItemsCompleted } = data;

  const channel = await getTextChannel(session);
  if (channel) {
    const durationMinutes = Math.round(duration / 60);

    await channel.send(
      `${Emoji.stop} **Session ended**\n` +
        `Duration: ${durationMinutes} minutes\n` +
        `Participants: ${participantCount}\n` +
        `Total Signals: ${totalSignals}\n` +
        `Agenda Items Completed: ${agendaItemsCompleted || 0}`
    );
  }

  // Clean up
  clearSessionSignals(session.guildId);
  leaveSessionVoiceChannel(session.guildId);
  sessionRegistry.remove(session.guildId);

  console.log(`Session ${session.sessionId} ended and cleaned up`);
}
